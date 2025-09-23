package com.architecture.core.functional;

import java.util.Objects;

/**
 * Exception that wraps a structured Error for integration with exception-based APIs.
 * This allows Result types to interoperate with traditional exception-based code.
 */
public class ResultException extends RuntimeException {
    private final Error error;

    /**
     * Creates a new ResultException wrapping the given error.
     *
     * @param error The error to wrap (cannot be null)
     */
    public ResultException(Error error) {
        super(error.getMessage(), error.getCause().orElse(null));
        this.error = Objects.requireNonNull(error, "Error cannot be null");
    }

    /**
     * Gets the wrapped error.
     *
     * @return The wrapped error
     */
    public Error getError() {
        return error;
    }

    @Override
    public String toString() {
        return String.format("ResultException{error=%s}", error);
    }
}