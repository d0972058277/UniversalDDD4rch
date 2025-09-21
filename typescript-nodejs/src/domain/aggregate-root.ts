import { Entity } from './entity';
import { IAggregateRoot } from './interfaces/i-aggregate-root';
import { IDomainEvent } from './interfaces/i-domain-event';

/**
 * Abstract base class for aggregate roots.
 * An aggregate root is the entry point to an aggregate and the only object that external objects
 * should hold references to. It maintains consistency boundaries and collects domain events.
 *
 * @template TId The type of the aggregate's identifier
 */
export abstract class AggregateRoot<TId extends object>
  extends Entity<TId>
  implements IAggregateRoot<TId> {

  private _version: number = 0;
  private readonly _events: IDomainEvent[] = [];

  /**
   * Creates a new aggregate root with the specified identifier.
   * @param id The unique identifier for the aggregate
   */
  protected constructor(id: TId) {
    super(id);
  }

  /** Version number for optimistic concurrency control */
  public get version(): number {
    return this._version;
  }

  /** Collection of domain events that occurred within this aggregate */
  public get events(): readonly IDomainEvent[] {
    return Object.freeze([...this._events]);
  }

  /**
   * Adds a domain event to the collection.
   * This method should be called whenever something significant happens
   * within the aggregate that other parts of the system should know about.
   * @param domainEvent The domain event to add
   */
  protected addEvent(domainEvent: IDomainEvent): void {
    if (domainEvent === null || domainEvent === undefined) {
      throw new globalThis.Error('Domain event cannot be null or undefined');
    }

    this._events.push(domainEvent);
  }

  /**
   * Clears all collected domain events.
   * This is typically called after events have been published by the infrastructure layer.
   */
  public clearEvents(): void {
    this._events.splice(0, this._events.length);
  }

  /**
   * Increments the version number.
   * This is typically called by the repository when the aggregate is persisted
   * to implement optimistic concurrency control.
   */
  protected incrementVersion(): void {
    this._version++;
  }

  /**
   * Sets the version number.
   * This is typically used when loading an aggregate from persistence.
   * @param version The version number to set
   */
  protected setVersion(version: number): void {
    if (version < 0) {
      throw new globalThis.Error('Version cannot be negative');
    }
    this._version = version;
  }

  /**
   * Marks the aggregate as having uncommitted changes.
   * This can be used to track whether the aggregate needs to be persisted.
   * @returns True if there are uncommitted events
   */
  public hasUncommittedEvents(): boolean {
    return this._events.length > 0;
  }

  /**
   * Gets the number of uncommitted events.
   * @returns Number of events that haven't been cleared
   */
  public getUncommittedEventCount(): number {
    return this._events.length;
  }

  /**
   * Gets events that occurred after a specific version.
   * This is useful for implementing event sourcing scenarios.
   * @param afterVersion Only return events after this version
   * @returns Events that occurred after the specified version
   */
  public getEventsAfterVersion(afterVersion: number): readonly IDomainEvent[] {
    // In a full event sourcing implementation, you would track event versions
    // For simplicity, this implementation returns all current events
    // In practice, you might want to store version information with each event
    return this.events;
  }

  /**
   * Replays events to rebuild aggregate state.
   * This is useful for event sourcing scenarios where you rebuild aggregate state from events.
   * @param events The events to replay
   */
  protected replayEvents(events: readonly IDomainEvent[]): void {
    for (const event of events) {
      this.applyEvent(event);
    }
  }

  /**
   * Applies a single event to update aggregate state.
   * Override this method in derived classes to handle specific event types.
   * @param event The event to apply
   */
  protected applyEvent(event: IDomainEvent): void {
    // Default implementation does nothing
    // Derived classes should override this to handle specific events
    // Example:
    // switch (event.constructor.name) {
    //   case 'OrderCreatedEvent':
    //     this.handleOrderCreated(event as OrderCreatedEvent);
    //     break;
    //   // ... other event handlers
    // }
  }

  /**
   * Validates the current state of the aggregate.
   * Override this method in derived classes to implement business invariants.
   * @throws Error if the aggregate is in an invalid state
   */
  protected validateInvariants(): void {
    // Default implementation does nothing
    // Derived classes should override this to implement business rules
  }

  /**
   * Executes a command that may modify the aggregate state.
   * This method ensures invariants are validated after the command execution.
   * @param command The command to execute
   */
  protected executeCommand(command: () => void): void {
    command();
    this.validateInvariants();
  }

  /**
   * String representation of the aggregate root.
   * @returns String representation including type, ID, version, and event count
   */
  public override toString(): string {
    return `${this.constructor.name}(${this.id}, v${this._version}, ${this._events.length} events)`;
  }
}