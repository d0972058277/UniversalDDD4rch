package com.architecture.core.infrastructure;

/**
 * A cancellation token implementation that never signals cancellation.
 * Used as a default token when cancellation is not needed.
 */
final class NonCancellationToken implements CancellationToken {

    /**
     * Singleton instance of the non-cancelling token.
     */
    static final CancellationToken INSTANCE = new NonCancellationToken();

    /**
     * Private constructor to enforce singleton pattern.
     */
    private NonCancellationToken() {
    }

    /**
     * Always returns false as this token never signals cancellation.
     *
     * @return false
     */
    @Override
    public boolean isCancellationRequested() {
        return false;
    }

    /**
     * Never throws as this token never signals cancellation.
     */
    @Override
    public void throwIfCancellationRequested() {
        // No-op - never throws
    }

    @Override
    public String toString() {
        return "NonCancellationToken";
    }
}