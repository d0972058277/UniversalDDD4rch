package com.architecture.core.infrastructure;

/**
 * Exception thrown when an operation is cancelled.
 * Indicates that an asynchronous operation was interrupted due to cancellation.
 */
public class OperationCancelledException extends RuntimeException {

    /**
     * Creates a new OperationCancelledException with a default message.
     */
    public OperationCancelledException() {
        super("Operation was cancelled");
    }

    /**
     * Creates a new OperationCancelledException with the specified message.
     *
     * @param message The detail message
     */
    public OperationCancelledException(String message) {
        super(message);
    }

    /**
     * Creates a new OperationCancelledException with the specified message and cause.
     *
     * @param message The detail message
     * @param cause The cause of the cancellation
     */
    public OperationCancelledException(String message, Throwable cause) {
        super(message, cause);
    }

    /**
     * Creates a new OperationCancelledException with the specified cause.
     *
     * @param cause The cause of the cancellation
     */
    public OperationCancelledException(Throwable cause) {
        super("Operation was cancelled", cause);
    }
}