package com.architecture.core.functional;

/**
 * Categorizes errors by their domain and handling strategy.
 * Provides structured error categorization for different types of failures.
 *
 * Requirements: FR-010, FR-014 - Error categorization
 */
public enum ErrorCategory {
    /**
     * Domain business logic errors.
     * These represent violations of business rules or invalid domain operations.
     */
    DOMAIN("Domain"),

    /**
     * Input validation errors.
     * These represent invalid input data or constraint violations.
     */
    VALIDATION("Validation"),

    /**
     * Infrastructure and system errors.
     * These represent failures in external systems, databases, or technical infrastructure.
     */
    INFRASTRUCTURE("Infrastructure"),

    /**
     * Concurrency and threading errors.
     * These represent race conditions, deadlocks, or optimistic locking failures.
     */
    CONCURRENCY("Concurrency"),

    /**
     * Security and authorization errors.
     * These represent authentication failures, authorization violations, or security breaches.
     */
    SECURITY("Security");

    private final String displayName;

    ErrorCategory(String displayName) {
        this.displayName = displayName;
    }

    /**
     * Gets the human-readable display name for this error category.
     *
     * @return The display name
     */
    public String getDisplayName() {
        return displayName;
    }

    @Override
    public String toString() {
        return displayName;
    }
}