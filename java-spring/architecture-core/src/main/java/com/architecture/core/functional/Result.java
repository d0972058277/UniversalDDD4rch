package com.architecture.core.functional;

import java.util.Objects;
import java.util.function.Function;

/**
 * Represents the result of an operation that can either succeed with a value or fail with an error.
 * Implements monadic operations for functional composition and error handling.
 *
 * Requirements: FR-008, FR-011, FR-013 - Result with monadic operations
 *
 * @param <T> The type of the success value
 */
public final class Result<T> {
    private final T value;
    private final Error error;
    private final boolean isSuccess;

    private Result(T value, Error error, boolean isSuccess) {
        this.value = value;
        this.error = error;
        this.isSuccess = isSuccess;
    }

    /**
     * Creates a successful result with the given value.
     *
     * @param value The success value (cannot be null)
     * @param <T>   The type of the value
     * @return A successful Result
     */
    public static <T> Result<T> success(T value) {
        Objects.requireNonNull(value, "Success value cannot be null");
        return new Result<>(value, null, true);
    }

    /**
     * Creates a successful result with no value (for Void operations).
     *
     * @return A successful Result<Void>
     */
    public static Result<Void> success() {
        return new Result<>(null, null, true);
    }

    /**
     * Creates a failed result with the given error.
     *
     * @param error The error (cannot be null)
     * @param <T>   The type of the would-be success value
     * @return A failed Result
     */
    public static <T> Result<T> failure(Error error) {
        Objects.requireNonNull(error, "Error cannot be null");
        return new Result<>(null, error, false);
    }

    /**
     * Creates a failed result with the given code and message as a domain error.
     *
     * @param code    The error code
     * @param message The error message
     * @param <T>     The type of the would-be success value
     * @return A failed Result with a domain error
     */
    public static <T> Result<T> failure(String code, String message) {
        return failure(Error.domain(code, message));
    }

    /**
     * Checks if this result represents a success.
     *
     * @return true if this is a successful result
     */
    public boolean isSuccess() {
        return isSuccess;
    }

    /**
     * Checks if this result represents a failure.
     *
     * @return true if this is a failed result
     */
    public boolean isFailure() {
        return !isSuccess;
    }

    /**
     * Gets the success value.
     *
     * @return The success value
     * @throws IllegalStateException if this is a failed result
     */
    public T getValue() {
        if (!isSuccess) {
            throw new IllegalStateException("Cannot get value from failed result");
        }
        return value;
    }

    /**
     * Gets the error.
     *
     * @return The error
     * @throws IllegalStateException if this is a successful result
     */
    public Error getError() {
        if (isSuccess) {
            throw new IllegalStateException("Cannot get error from successful result");
        }
        return error;
    }

    /**
     * Maps the success value to a new type using the provided mapper function.
     * If this is a failure, returns a failure with the same error.
     *
     * @param mapper The mapping function
     * @param <U>    The type of the mapped value
     * @return A Result containing the mapped value or the original error
     */
    public <U> Result<U> map(Function<? super T, ? extends U> mapper) {
        Objects.requireNonNull(mapper, "Mapper function cannot be null");
        if (isSuccess()) {
            try {
                return Result.success(mapper.apply(getValue()));
            } catch (Exception e) {
                return Result.failure(Error.infrastructure("Mapping.Failed", e.getMessage(), e));
            }
        }
        return Result.failure(getError());
    }

    /**
     * Binds this result to another result-producing function.
     * If this is a failure, returns a failure with the same error.
     *
     * @param binder The binding function
     * @param <U>    The type of the bound result value
     * @return The result of the binding operation or the original error
     */
    public <U> Result<U> bind(Function<? super T, Result<U>> binder) {
        Objects.requireNonNull(binder, "Binder function cannot be null");
        if (isSuccess()) {
            try {
                return binder.apply(getValue());
            } catch (Exception e) {
                return Result.failure(Error.infrastructure("Binding.Failed", e.getMessage(), e));
            }
        }
        return Result.failure(getError());
    }

    /**
     * Matches this result against success and failure handlers.
     *
     * @param onSuccess The function to apply if this is a success
     * @param onFailure The function to apply if this is a failure
     * @param <U>       The return type of both handlers
     * @return The result of applying the appropriate handler
     */
    public <U> U match(Function<? super T, ? extends U> onSuccess, Function<Error, ? extends U> onFailure) {
        Objects.requireNonNull(onSuccess, "Success handler cannot be null");
        Objects.requireNonNull(onFailure, "Failure handler cannot be null");
        return isSuccess() ? onSuccess.apply(getValue()) : onFailure.apply(getError());
    }

    /**
     * Gets the success value or returns the default value if this is a failure.
     *
     * @param defaultValue The default value to return if this is a failure
     * @return The success value or the default value
     */
    public T getValueOrDefault(T defaultValue) {
        return isSuccess() ? getValue() : defaultValue;
    }

    /**
     * Gets the success value or throws a ResultException if this is a failure.
     *
     * @return The success value
     * @throws ResultException if this is a failure
     */
    public T getValueOrThrow() {
        if (isSuccess()) {
            return getValue();
        }
        throw new ResultException(getError());
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        Result<?> result = (Result<?>) obj;
        return isSuccess == result.isSuccess &&
               Objects.equals(value, result.value) &&
               Objects.equals(error, result.error);
    }

    @Override
    public int hashCode() {
        return Objects.hash(value, error, isSuccess);
    }

    @Override
    public String toString() {
        return isSuccess()
            ? String.format("Success{value=%s}", value)
            : String.format("Failure{error=%s}", error);
    }
}