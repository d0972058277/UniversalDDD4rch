package com.architecture.core.domain;

import java.util.Objects;

/**
 * Base class for domain entities with identity-based equality.
 * Entities are distinguished by their identity rather than their attributes.
 *
 * Requirements: FR-003 - Identity-based equality
 *
 * @param <TId> The type of the entity identifier
 */
public abstract class Entity<TId extends EntityId<TId>> {
    private final TId id;

    /**
     * Creates a new entity with the specified identifier.
     *
     * @param id The entity identifier (cannot be null)
     */
    protected Entity(TId id) {
        this.id = Objects.requireNonNull(id, "Entity ID cannot be null");
    }

    /**
     * Gets the entity identifier.
     *
     * @return The entity identifier
     */
    public final TId getId() {
        return id;
    }

    /**
     * Determines equality based solely on entity identity.
     * Two entities are equal if they have the same type and the same identifier.
     */
    @Override
    public final boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        Entity<?> entity = (Entity<?>) obj;
        return Objects.equals(id, entity.id);
    }

    /**
     * Returns hash code based solely on the entity identifier.
     * This ensures that entities with the same identity have the same hash code.
     */
    @Override
    public final int hashCode() {
        return Objects.hash(id);
    }

    /**
     * Returns a string representation of this entity including its type and identifier.
     */
    @Override
    public String toString() {
        return String.format("%s{id=%s}", getClass().getSimpleName(), id);
    }
}