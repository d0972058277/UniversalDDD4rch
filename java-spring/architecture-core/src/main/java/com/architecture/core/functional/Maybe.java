package com.architecture.core.functional;

import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.function.Supplier;

/**
 * Represents an optional value that may or may not be present.
 * Implements monadic operations for functional composition.
 *
 * @param <T> The type of the optional value
 */
public final class Maybe<T> {
    private static final Maybe<?> NONE = new Maybe<>(null, false);

    private final T value;
    private final boolean hasValue;

    private Maybe(T value, boolean hasValue) {
        this.value = value;
        this.hasValue = hasValue;
    }

    /**
     * Creates a Maybe with a non-null value.
     *
     * @param value The value to wrap (must not be null)
     * @param <T> The type of the value
     * @return A Maybe containing the value
     * @throws NullPointerException if value is null
     */
    public static <T> Maybe<T> some(T value) {
        Objects.requireNonNull(value, "Value cannot be null");
        return new Maybe<>(value, true);
    }

    /**
     * Creates an empty Maybe.
     *
     * @param <T> The type of the absent value
     * @return An empty Maybe
     */
    @SuppressWarnings("unchecked")
    public static <T> Maybe<T> none() {
        return (Maybe<T>) NONE;
    }

    /**
     * Creates a Maybe from a nullable value.
     *
     * @param value The nullable value
     * @param <T> The type of the value
     * @return Maybe.some(value) if value is not null, Maybe.none() otherwise
     */
    public static <T> Maybe<T> fromNullable(T value) {
        return value != null ? some(value) : none();
    }

    /**
     * Checks if this Maybe contains a value.
     *
     * @return true if a value is present, false otherwise
     */
    public boolean hasValue() {
        return hasValue;
    }

    /**
     * Checks if this Maybe is empty.
     *
     * @return true if no value is present, false otherwise
     */
    public boolean isEmpty() {
        return !hasValue;
    }

    /**
     * Gets the value if present.
     *
     * @return The value
     * @throws IllegalStateException if no value is present
     */
    public T getValue() {
        if (!hasValue) {
            throw new IllegalStateException("Maybe has no value");
        }
        return value;
    }

    /**
     * Maps the value if present using the provided mapper function.
     * Implements the functor map operation.
     *
     * @param mapper The mapping function
     * @param <U> The type of the mapped value
     * @return A Maybe containing the mapped value, or None if this Maybe is empty or mapping fails
     * @throws NullPointerException if mapper is null
     */
    public <U> Maybe<U> map(Function<? super T, ? extends U> mapper) {
        Objects.requireNonNull(mapper, "Mapper function cannot be null");
        if (hasValue()) {
            try {
                U result = mapper.apply(getValue());
                return result != null ? Maybe.some(result) : Maybe.none();
            } catch (Exception e) {
                return Maybe.none();
            }
        }
        return Maybe.none();
    }

    /**
     * Binds (flatMaps) the value if present using the provided binder function.
     * Implements the monadic bind operation.
     *
     * @param binder The binding function that returns a Maybe
     * @param <U> The type of the bound value
     * @return The result of the binder function, or None if this Maybe is empty or binding fails
     * @throws NullPointerException if binder is null
     */
    public <U> Maybe<U> bind(Function<? super T, Maybe<U>> binder) {
        Objects.requireNonNull(binder, "Binder function cannot be null");
        if (hasValue()) {
            try {
                return binder.apply(getValue());
            } catch (Exception e) {
                return Maybe.none();
            }
        }
        return Maybe.none();
    }

    /**
     * Returns the value if present, otherwise returns the default value.
     *
     * @param defaultValue The default value to return if this Maybe is empty
     * @return The value if present, otherwise the default value
     */
    public T orElse(T defaultValue) {
        return hasValue() ? getValue() : defaultValue;
    }

    /**
     * Returns the value if present, otherwise returns the result of the supplier.
     *
     * @param defaultSupplier The supplier to call if this Maybe is empty
     * @return The value if present, otherwise the result of the supplier
     * @throws NullPointerException if defaultSupplier is null
     */
    public T orElseGet(Supplier<? extends T> defaultSupplier) {
        Objects.requireNonNull(defaultSupplier, "Default supplier cannot be null");
        return hasValue() ? getValue() : defaultSupplier.get();
    }

    /**
     * Returns the value if present, otherwise throws the exception provided by the supplier.
     *
     * @param exceptionSupplier The supplier that provides the exception to throw
     * @param <X> The type of the exception
     * @return The value if present
     * @throws X if no value is present
     * @throws NullPointerException if exceptionSupplier is null
     */
    public <X extends Throwable> T orElseThrow(Supplier<? extends X> exceptionSupplier) throws X {
        Objects.requireNonNull(exceptionSupplier, "Exception supplier cannot be null");
        if (hasValue()) {
            return getValue();
        }
        throw exceptionSupplier.get();
    }

    /**
     * Converts this Maybe to an Optional.
     *
     * @return Optional.of(value) if present, Optional.empty() otherwise
     */
    public Optional<T> toOptional() {
        return hasValue() ? Optional.of(getValue()) : Optional.empty();
    }

    /**
     * Converts this Maybe to a Result.
     *
     * @param errorIfEmpty The error to use if this Maybe is empty
     * @return Result.success(value) if present, Result.failure(errorIfEmpty) otherwise
     */
    public Result<T> toResult(Error errorIfEmpty) {
        return hasValue() ? Result.success(getValue()) : Result.failure(errorIfEmpty);
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        Maybe<?> maybe = (Maybe<?>) obj;
        return hasValue == maybe.hasValue && Objects.equals(value, maybe.value);
    }

    @Override
    public int hashCode() {
        return hasValue ? Objects.hash(value) : 0;
    }

    @Override
    public String toString() {
        return hasValue ? String.format("Some{value=%s}", value) : "None";
    }
}