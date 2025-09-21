import { IDomainEvent } from './interfaces/i-domain-event';

/**
 * Abstract base class for domain events.
 * Provides common implementation for domain event metadata and properties.
 * Domain events represent something that happened in the domain that is of interest to the business.
 */
export abstract class DomainEventBase implements IDomainEvent {
  public readonly id: string;
  public readonly occurredAt: Date;
  public readonly correlationId: string | undefined;
  public readonly causationId: string | undefined;
  public readonly metadata: Readonly<Record<string, unknown>>;

  /**
   * Creates a new domain event with default values.
   */
  protected constructor();
  /**
   * Creates a new domain event with specified correlation and causation IDs.
   * @param correlationId Correlation ID for tracking related events across service boundaries
   * @param causationId Causation ID linking this event to the event that caused it
   * @param metadata Additional metadata about the event
   */
  protected constructor(
    correlationId?: string,
    causationId?: string,
    metadata?: Record<string, unknown>
  );
  protected constructor(
    correlationId?: string,
    causationId?: string,
    metadata?: Record<string, unknown>
  ) {
    this.id = crypto.randomUUID();
    this.occurredAt = new Date();
    this.correlationId = correlationId;
    this.causationId = causationId;
    this.metadata = Object.freeze({ ...(metadata || {}) });

    // Note: We don't freeze the entire object here because derived classes
    // need to set their own properties. They should freeze themselves after
    // setting all properties.
  }

  /**
   * String representation of the domain event.
   * @returns String representation including event type and ID
   */
  public toString(): string {
    return `${this.constructor.name}(${this.id}) at ${this.occurredAt.toISOString()}`;
  }

  /**
   * Creates a copy of this event with additional metadata.
   * @param additionalMetadata Additional metadata to merge
   * @returns New event instance with merged metadata
   */
  public withMetadata(additionalMetadata: Record<string, unknown>): this {
    const Constructor = this.constructor as new (...args: any[]) => this;
    const newMetadata = { ...this.metadata, ...additionalMetadata };

    // This is a simplified approach - in practice, you might need to implement
    // a more sophisticated cloning mechanism based on your specific event types
    return Object.assign(Object.create(Constructor.prototype), {
      ...this,
      metadata: Object.freeze(newMetadata)
    });
  }

  /**
   * Checks if this event is related to another event through correlation.
   * @param other The other event to check correlation with
   * @returns True if events share the same correlation ID
   */
  public isCorrelatedWith(other: IDomainEvent): boolean {
    return !!(this.correlationId &&
             other.correlationId &&
             this.correlationId === other.correlationId);
  }

  /**
   * Checks if this event was caused by another event.
   * @param other The potential causing event
   * @returns True if this event was caused by the other event
   */
  public wasCausedBy(other: IDomainEvent): boolean {
    return !!(this.causationId && this.causationId === other.id);
  }

  /**
   * Gets the event type name (class name).
   * @returns The name of the event type
   */
  public getEventType(): string {
    return this.constructor.name;
  }

  /**
   * Serializes the event to a plain object for persistence or transmission.
   * @returns Plain object representation of the event
   */
  public toPlainObject(): Record<string, unknown> {
    return {
      id: this.id,
      eventType: this.getEventType(),
      occurredAt: this.occurredAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
      metadata: this.metadata,
      // Include all own properties from derived classes
      ...this.getEventData()
    };
  }

  /**
   * Gets the specific event data from derived classes.
   * Override this method in derived classes to include specific event properties.
   * @returns Event-specific data
   */
  protected getEventData(): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    const descriptor = Object.getOwnPropertyDescriptors(this);

    for (const [key, desc] of Object.entries(descriptor)) {
      if (key !== 'id' &&
          key !== 'occurredAt' &&
          key !== 'correlationId' &&
          key !== 'causationId' &&
          key !== 'metadata' &&
          desc.value !== undefined) {
        data[key] = desc.value;
      }
    }

    return data;
  }
}