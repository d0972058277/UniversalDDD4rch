package com.architecture.core.domain;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * Base class for domain aggregates with event sourcing and version control.
 * Provides core aggregate functionality including identity, version control,
 * and domain event collection with thread safety.
 *
 * @param <TId> The type of the aggregate identifier
 */
public abstract class AggregateRoot<TId extends EntityId<TId>> extends Entity<TId> {

    private long version;
    private final List<DomainEvent> domainEvents;
    private final Object eventLock = new Object();

    /**
     * Creates a new aggregate with the specified ID and version 0.
     *
     * @param id The aggregate identifier (must not be null)
     * @throws NullPointerException if id is null
     */
    protected AggregateRoot(TId id) {
        super(id);
        this.version = 0;
        this.domainEvents = new ArrayList<>();
    }

    /**
     * Creates a new aggregate with the specified ID and version.
     *
     * @param id The aggregate identifier (must not be null)
     * @param version The initial version
     * @throws NullPointerException if id is null
     */
    protected AggregateRoot(TId id, long version) {
        super(id);
        this.version = version;
        this.domainEvents = new ArrayList<>();
    }

    /**
     * Gets the current version of this aggregate.
     * Used for optimistic concurrency control.
     *
     * @return The current version
     */
    public final long getVersion() {
        return version;
    }

    /**
     * Gets an immutable copy of the domain events associated with this aggregate.
     * The returned list is a snapshot and modifications will not affect the original.
     *
     * @return An immutable list of domain events
     */
    public final List<DomainEvent> getDomainEvents() {
        synchronized (eventLock) {
            return Collections.unmodifiableList(new ArrayList<>(domainEvents));
        }
    }

    /**
     * Adds a domain event to this aggregate.
     * Events are added in the order they occur and are thread-safe.
     *
     * @param event The domain event to add (must not be null)
     * @throws NullPointerException if event is null
     */
    protected final void addDomainEvent(DomainEvent event) {
        Objects.requireNonNull(event, "Domain event cannot be null");
        synchronized (eventLock) {
            domainEvents.add(event);
        }
    }

    /**
     * Clears all domain events from this aggregate.
     * Typically called after events have been published.
     * This operation is thread-safe.
     */
    public final void clearDomainEvents() {
        synchronized (eventLock) {
            domainEvents.clear();
        }
    }

    /**
     * Increments the version of this aggregate.
     * Typically called when the aggregate is persisted.
     */
    public final void incrementVersion() {
        this.version++;
    }
}