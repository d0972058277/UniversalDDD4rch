package com.architecture.core.domain;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Base class for value objects with structural equality.
 * Value objects are distinguished by their attributes rather than their identity.
 *
 * Requirements: FR-004, FR-012 - Structural equality and immutability
 */
public abstract class ValueObject {
    /**
     * Returns the components that define equality for this value object.
     * MUST return all fields that participate in equality comparison.
     * Subclasses must implement this method to specify which fields determine equality.
     *
     * @return An iterable of equality components
     */
    protected abstract Iterable<Object> getEqualityComponents();

    /**
     * Determines equality based on structural comparison of equality components.
     * Two value objects are equal if they have the same type and the same equality components.
     */
    @Override
    public final boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        ValueObject other = (ValueObject) obj;
        return Objects.equals(getEqualityComponentsList(), other.getEqualityComponentsList());
    }

    /**
     * Returns hash code based on all equality components.
     * This ensures that value objects with the same components have the same hash code.
     */
    @Override
    public final int hashCode() {
        return Objects.hash(getEqualityComponentsList().toArray());
    }

    /**
     * Returns a string representation including the class name and equality components.
     */
    @Override
    public String toString() {
        return String.format("%s{%s}",
            getClass().getSimpleName(),
            getEqualityComponentsList().stream()
                .map(String::valueOf)
                .collect(Collectors.joining(", "))
        );
    }

    /**
     * Converts the equality components to a list for comparison and hashing.
     *
     * @return A list containing all equality components
     */
    private List<Object> getEqualityComponentsList() {
        List<Object> components = new ArrayList<>();
        getEqualityComponents().forEach(components::add);
        return components;
    }
}