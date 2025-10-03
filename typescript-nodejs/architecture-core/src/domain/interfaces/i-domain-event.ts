/**
 * Interface for domain events.
 * Domain events represent something that happened in the domain that is of interest to the business.
 * They are used to communicate between different parts of the system.
 */
export interface IDomainEvent {
  /** Unique identifier for the event */
  readonly id: string;

  /** When the event occurred */
  readonly occurredAt: Date;

  /** Correlation ID for tracking related events across service boundaries */
  readonly correlationId: string | undefined;

  /** Causation ID linking this event to the event that caused it */
  readonly causationId: string | undefined;

  /** Additional metadata about the event */
  readonly metadata: Readonly<Record<string, unknown>>;
}