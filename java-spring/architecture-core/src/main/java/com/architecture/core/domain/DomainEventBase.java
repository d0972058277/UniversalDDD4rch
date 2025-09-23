package com.architecture.core.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * Base implementation for domain events providing standard metadata.
 * Provides consistent implementation of event identification, timing, and correlation tracking.
 * Concrete events should extend this class and add their specific data.
 */
public abstract class DomainEventBase implements DomainEvent {

    private final UUID eventId;
    private final Instant occurredAt;
    private final String correlationId;
    private final String causationId;
    private final int eventVersion;

    /**
     * Creates a new domain event with auto-generated ID and current timestamp.
     * Uses default event version 1 and no correlation/causation tracking.
     */
    protected DomainEventBase() {
        this(null, null, 1);
    }

    /**
     * Creates a new domain event with correlation and causation tracking.
     * Uses auto-generated ID, current timestamp, and default event version 1.
     *
     * @param correlationId The correlation ID for tracking related events (can be null)
     * @param causationId The causation ID for tracking the cause of this event (can be null)
     */
    protected DomainEventBase(String correlationId, String causationId) {
        this(correlationId, causationId, 1);
    }

    /**
     * Creates a new domain event with full metadata control.
     * Uses auto-generated ID and current timestamp.
     *
     * @param correlationId The correlation ID for tracking related events (can be null)
     * @param causationId The causation ID for tracking the cause of this event (can be null)
     * @param eventVersion The version of this event type for schema evolution
     */
    protected DomainEventBase(String correlationId, String causationId, int eventVersion) {
        this.eventId = UUID.randomUUID();
        this.occurredAt = Instant.now();
        this.correlationId = correlationId;
        this.causationId = causationId;
        this.eventVersion = eventVersion;
    }

    /**
     * Gets the unique identifier for this event.
     *
     * @return The unique event identifier
     */
    @Override
    public final UUID getEventId() {
        return eventId;
    }

    /**
     * Gets the timestamp when this event occurred.
     *
     * @return The instant when the event occurred
     */
    @Override
    public final Instant getOccurredAt() {
        return occurredAt;
    }

    /**
     * Gets the correlation ID for tracking related events.
     *
     * @return The correlation ID if present, empty otherwise
     */
    @Override
    public final Optional<String> getCorrelationId() {
        return Optional.ofNullable(correlationId);
    }

    /**
     * Gets the causation ID that identifies what caused this event.
     *
     * @return The causation ID if present, empty otherwise
     */
    @Override
    public final Optional<String> getCausationId() {
        return Optional.ofNullable(causationId);
    }

    /**
     * Gets the version of this event type.
     *
     * @return The event version
     */
    @Override
    public final int getEventVersion() {
        return eventVersion;
    }

    /**
     * Events are equal if they have the same event ID.
     * Event identity is based solely on the unique event ID.
     *
     * @param obj The object to compare with
     * @return true if the objects are equal, false otherwise
     */
    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        DomainEventBase that = (DomainEventBase) obj;
        return Objects.equals(eventId, that.eventId);
    }

    /**
     * Hash code is based on the event ID.
     *
     * @return The hash code
     */
    @Override
    public int hashCode() {
        return Objects.hash(eventId);
    }

    /**
     * Provides a string representation including key metadata.
     *
     * @return A string representation of the event
     */
    @Override
    public String toString() {
        return String.format("%s{eventId=%s, occurredAt=%s, correlationId=%s, causationId=%s, version=%d}",
            getClass().getSimpleName(),
            eventId,
            occurredAt,
            correlationId,
            causationId,
            eventVersion);
    }
}