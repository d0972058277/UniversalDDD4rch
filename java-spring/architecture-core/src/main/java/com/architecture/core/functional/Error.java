package com.architecture.core.functional;

import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * Represents a structured error with categorization and metadata.
 * Provides comprehensive error information for functional error handling.
 *
 * Requirements: FR-010 - Error type with categorization
 */
public final class Error {
    private final String code;
    private final String message;
    private final ErrorCategory category;
    private final Map<String, Object> metadata;
    private final Throwable cause;

    /**
     * Creates a new Error with all properties.
     *
     * @param code     The error code (cannot be null)
     * @param message  The error message (cannot be null)
     * @param category The error category (cannot be null)
     * @param metadata Additional metadata (can be null, will be empty map)
     * @param cause    The underlying cause (can be null)
     */
    public Error(String code, String message, ErrorCategory category,
                 Map<String, Object> metadata, Throwable cause) {
        this.code = Objects.requireNonNull(code, "Error code cannot be null");
        this.message = Objects.requireNonNull(message, "Error message cannot be null");
        this.category = Objects.requireNonNull(category, "Error category cannot be null");
        this.metadata = Map.copyOf(metadata != null ? metadata : Map.of());
        this.cause = cause;
    }

    /**
     * Creates a domain error with the specified code and message.
     *
     * @param code    The error code
     * @param message The error message
     * @return A new domain error
     */
    public static Error domain(String code, String message) {
        return new Error(code, message, ErrorCategory.DOMAIN, Map.of(), null);
    }

    /**
     * Creates a validation error with the specified code, message, and metadata.
     *
     * @param code     The error code
     * @param message  The error message
     * @param metadata Additional validation metadata
     * @return A new validation error
     */
    public static Error validation(String code, String message, Map<String, Object> metadata) {
        return new Error(code, message, ErrorCategory.VALIDATION, metadata, null);
    }

    /**
     * Creates an infrastructure error with the specified code, message, and cause.
     *
     * @param code    The error code
     * @param message The error message
     * @param cause   The underlying exception cause
     * @return A new infrastructure error
     */
    public static Error infrastructure(String code, String message, Throwable cause) {
        return new Error(code, message, ErrorCategory.INFRASTRUCTURE, Map.of(), cause);
    }

    /**
     * Creates a concurrency error with the specified code and message.
     *
     * @param code    The error code
     * @param message The error message
     * @return A new concurrency error
     */
    public static Error concurrency(String code, String message) {
        return new Error(code, message, ErrorCategory.CONCURRENCY, Map.of(), null);
    }

    /**
     * Creates a security error with the specified code and message.
     *
     * @param code    The error code
     * @param message The error message
     * @return A new security error
     */
    public static Error security(String code, String message) {
        return new Error(code, message, ErrorCategory.SECURITY, Map.of(), null);
    }

    /**
     * Gets the error code.
     *
     * @return The error code
     */
    public String getCode() {
        return code;
    }

    /**
     * Gets the error message.
     *
     * @return The error message
     */
    public String getMessage() {
        return message;
    }

    /**
     * Gets the error category.
     *
     * @return The error category
     */
    public ErrorCategory getCategory() {
        return category;
    }

    /**
     * Gets the error metadata.
     *
     * @return An immutable map of metadata
     */
    public Map<String, Object> getMetadata() {
        return metadata;
    }

    /**
     * Gets the underlying cause if present.
     *
     * @return An Optional containing the cause, or empty if no cause
     */
    public Optional<Throwable> getCause() {
        return Optional.ofNullable(cause);
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        Error error = (Error) obj;
        return Objects.equals(code, error.code) &&
               Objects.equals(message, error.message) &&
               category == error.category &&
               Objects.equals(metadata, error.metadata) &&
               Objects.equals(cause, error.cause);
    }

    @Override
    public int hashCode() {
        return Objects.hash(code, message, category, metadata, cause);
    }

    @Override
    public String toString() {
        return String.format("Error{code='%s', message='%s', category=%s}",
            code, message, category);
    }
}