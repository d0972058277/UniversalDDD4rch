package com.architecture.core.domain;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Marker interface for all domain events.
 * Domain events represent something that happened in the domain that domain experts care about.
 * They capture the intent and timing of domain changes for event sourcing and integration scenarios.
 */
public interface DomainEvent {

    /**
     * Gets the unique identifier for this event.
     * Each event instance must have a unique ID.
     *
     * @return The unique event identifier
     */
    UUID getEventId();

    /**
     * Gets the timestamp when this event occurred.
     * Used for event ordering and audit trails.
     *
     * @return The instant when the event occurred
     */
    Instant getOccurredAt();

    /**
     * Gets the correlation ID for tracking related events across aggregates or services.
     * Used to trace a business operation across multiple components.
     *
     * @return The correlation ID if present, empty otherwise
     */
    Optional<String> getCorrelationId();

    /**
     * Gets the causation ID that identifies the command or event that caused this event.
     * Used to track the causal chain of events.
     *
     * @return The causation ID if present, empty otherwise
     */
    Optional<String> getCausationId();

    /**
     * Gets the version of this event type.
     * Used for event schema evolution and versioning.
     *
     * @return The event version
     */
    int getEventVersion();
}