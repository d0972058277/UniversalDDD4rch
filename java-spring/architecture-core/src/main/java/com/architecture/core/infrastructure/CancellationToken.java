package com.architecture.core.infrastructure;

/**
 * Token for cancelling asynchronous operations.
 * Provides a way to signal cancellation requests and check cancellation status.
 */
public interface CancellationToken {

    /**
     * Checks if cancellation has been requested.
     *
     * @return true if cancellation has been requested, false otherwise
     */
    boolean isCancellationRequested();

    /**
     * Throws OperationCancelledException if cancellation has been requested.
     *
     * @throws OperationCancelledException if cancellation has been requested
     */
    void throwIfCancellationRequested() throws OperationCancelledException;

    /**
     * Returns a cancellation token that will never be cancelled.
     *
     * @return A non-cancelling token
     */
    static CancellationToken none() {
        return NonCancellationToken.INSTANCE;
    }
}