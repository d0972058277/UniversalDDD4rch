import { IEntity } from './i-entity';
import { IDomainEvent } from './i-domain-event';

/**
 * Interface for aggregate roots.
 * An aggregate root is the entry point to an aggregate and the only object that external objects
 * should hold references to. It maintains consistency boundaries and collects domain events.
 *
 * @template TId The type of the aggregate's identifier
 */
export interface IAggregateRoot<TId extends object> extends IEntity<TId> {
  /** Version number for optimistic concurrency control */
  readonly version: number;

  /** Collection of domain events that occurred within this aggregate */
  readonly events: readonly IDomainEvent[];

  /**
   * Clears all collected domain events.
   * This is typically called after events have been published by the infrastructure layer.
   */
  clearEvents(): void;
}