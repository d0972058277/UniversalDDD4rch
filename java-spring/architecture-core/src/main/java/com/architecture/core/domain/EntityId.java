package com.architecture.core.domain;

import com.architecture.core.functional.Result;
import java.io.Serializable;

/**
 * Base interface for all entity identifiers with type safety and comparability.
 * Provides strong typing for entity identities with validation and serialization support.
 *
 * Requirements: FR-001 through FR-017 - EntityId type safety and validation
 *
 * @param <T> The concrete entity ID type for recursive type bounds
 */
public interface EntityId<T extends EntityId<T>> extends Comparable<T>, Serializable {
    /**
     * Gets the string representation of the identifier value.
     * MUST NOT return null.
     *
     * @return The identifier value as a string
     */
    String getValue();

    /**
     * Validates the identifier format and constraints.
     * MUST return Result.success() for valid identifiers.
     *
     * @return Result indicating validation success or failure with details
     */
    Result<Void> validate();

    @Override
    int compareTo(T other);

    @Override
    boolean equals(Object obj);

    @Override
    int hashCode();
}