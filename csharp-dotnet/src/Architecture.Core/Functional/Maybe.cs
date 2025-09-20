using System;
using System.Collections.Generic;

namespace Architecture.Core.Functional;

/// <summary>
/// Represents an optional value that may or may not be present.
/// Provides monadic operations for safe handling of potentially missing values.
/// </summary>
/// <typeparam name="T">The type of value that may be present.</typeparam>
public readonly struct Maybe<T> : IEquatable<Maybe<T>>
{
    private readonly bool _hasValue;
    private readonly T? _value;

    /// <summary>
    /// Gets a value indicating whether this Maybe contains a value.
    /// </summary>
    public bool HasValue => _hasValue;

    /// <summary>
    /// Gets the contained value.
    /// Throws InvalidOperationException if HasValue is false.
    /// </summary>
    public T Value
    {
        get
        {
            if (!_hasValue)
                throw new InvalidOperationException("Cannot access Value when Maybe has no value");
            return _value!;
        }
    }

    private Maybe(bool hasValue, T? value)
    {
        _hasValue = hasValue;
        _value = value;
    }

    /// <summary>
    /// Creates a Maybe&lt;T&gt; with the specified value.
    /// </summary>
    /// <param name="value">The value to wrap.</param>
    /// <returns>A Maybe&lt;T&gt; containing the value.</returns>
    [System.Diagnostics.CodeAnalysis.SuppressMessage("Design", "CA1000:Do not declare static members on generic types", Justification = "Static factory methods are appropriate for this functional type")]
    public static Maybe<T> Some(T value)
    {
        ArgumentNullException.ThrowIfNull(value, "Cannot create Some with null value");
        return new(true, value);
    }

    /// <summary>
    /// Creates an empty Maybe&lt;T&gt; with no value.
    /// </summary>
    /// <returns>A Maybe&lt;T&gt; with no value.</returns>
    [System.Diagnostics.CodeAnalysis.SuppressMessage("Design", "CA1000:Do not declare static members on generic types", Justification = "Static factory methods are appropriate for this functional type")]
    public static Maybe<T> None() => new(false, default);

    /// <summary>
    /// Transforms the value of this Maybe using the specified function.
    /// If this Maybe has no value, returns an empty Maybe&lt;TResult&gt;.
    /// </summary>
    /// <typeparam name="TResult">The type of the transformed value.</typeparam>
    /// <param name="func">The transformation function.</param>
    /// <returns>A Maybe&lt;TResult&gt; with the transformed value or no value.</returns>
    public Maybe<TResult> Map<TResult>(Func<T, TResult> func)
    {
        ArgumentNullException.ThrowIfNull(func);

        return _hasValue ? Maybe<TResult>.Some(func(_value!)) : Maybe<TResult>.None();
    }

    /// <summary>
    /// Monadic bind operation that chains operations that may not return values.
    /// If this Maybe has a value, executes the function; otherwise returns an empty Maybe.
    /// </summary>
    /// <typeparam name="TResult">The type of value in the Maybe returned by the function.</typeparam>
    /// <param name="func">The function to execute if this Maybe has a value.</param>
    /// <returns>The result of the function or an empty Maybe.</returns>
    public Maybe<TResult> Bind<TResult>(Func<T, Maybe<TResult>> func)
    {
        ArgumentNullException.ThrowIfNull(func);

        return _hasValue ? func(_value!) : Maybe<TResult>.None();
    }

    /// <summary>
    /// Returns the contained value or the specified default value if this Maybe is empty.
    /// </summary>
    /// <param name="defaultValue">The default value to return if this Maybe is empty.</param>
    /// <returns>The contained value or the default value.</returns>
    public T OrElse(T defaultValue) => _hasValue ? _value! : defaultValue;

    /// <summary>
    /// Returns the contained value or the result of the specified factory function if this Maybe is empty.
    /// </summary>
    /// <param name="defaultFactory">The factory function to execute if this Maybe is empty.</param>
    /// <returns>The contained value or the result of the factory function.</returns>
    public T OrElse(Func<T> defaultFactory)
    {
        ArgumentNullException.ThrowIfNull(defaultFactory);

        return _hasValue ? _value! : defaultFactory();
    }

    /// <summary>
    /// Pattern matching method that executes one of two functions based on whether this Maybe has a value.
    /// </summary>
    /// <typeparam name="TOut">The type of value to return.</typeparam>
    /// <param name="onSome">Function to execute with the value if this Maybe has a value.</param>
    /// <param name="onNone">Function to execute if this Maybe has no value.</param>
    /// <returns>The result of the executed function.</returns>
    public TOut Match<TOut>(Func<T, TOut> onSome, Func<TOut> onNone)
    {
        ArgumentNullException.ThrowIfNull(onSome);
        ArgumentNullException.ThrowIfNull(onNone);

        return _hasValue ? onSome(_value!) : onNone();
    }

    /// <summary>
    /// Implicitly converts a value to a Maybe&lt;T&gt; containing that value.
    /// </summary>
    /// <param name="value">The value to convert.</param>
    public static implicit operator Maybe<T>(T value) => value != null ? Some(value) : None();

    /// <summary>
    /// Converts a value to a Maybe&lt;T&gt; containing that value.
    /// </summary>
    /// <param name="value">The value to convert.</param>
    /// <returns>A Maybe&lt;T&gt; containing the value or None if null.</returns>
    [System.Diagnostics.CodeAnalysis.SuppressMessage("Design", "CA1000:Do not declare static members on generic types", Justification = "Static conversion methods are appropriate for this functional type")]
    public static Maybe<T> FromValue(T value) => value != null ? Some(value) : None();

    /// <summary>
    /// Converts a value to a Maybe&lt;T&gt; containing that value (alternative name for implicit operator).
    /// </summary>
    /// <param name="value">The value to convert.</param>
    /// <returns>A Maybe&lt;T&gt; containing the value or None if null.</returns>
    [System.Diagnostics.CodeAnalysis.SuppressMessage("Design", "CA1000:Do not declare static members on generic types", Justification = "Required alternative for implicit operator by CA2225")]
    public static Maybe<T> FromT(T value) => value != null ? Some(value) : None();

    /// <summary>
    /// Converts this Maybe&lt;T&gt; to a Result&lt;T&gt; using the specified error when this Maybe is empty.
    /// </summary>
    /// <param name="errorWhenNone">The error to use when this Maybe is empty.</param>
    /// <returns>A Result&lt;T&gt; with this Maybe's value or the specified error.</returns>
    public Result<T> ToResult(Error errorWhenNone) =>
        _hasValue ? Result<T>.Ok(_value!) : Result<T>.Fail(errorWhenNone);

    /// <summary>
    /// Determines whether two Maybe&lt;T&gt; instances are equal.
    /// </summary>
    public bool Equals(Maybe<T> other)
    {
        if (_hasValue != other._hasValue) return false;
        if (!_hasValue) return true; // Both are None
        return EqualityComparer<T>.Default.Equals(_value, other._value);
    }

    /// <summary>
    /// Determines whether this Maybe&lt;T&gt; is equal to another object.
    /// </summary>
    public override bool Equals(object? obj) => obj is Maybe<T> other && Equals(other);

    /// <summary>
    /// Gets the hash code for this Maybe&lt;T&gt;.
    /// </summary>
    public override int GetHashCode()
    {
        if (!_hasValue) return 0;
        return _value?.GetHashCode() ?? 0;
    }

    /// <summary>
    /// Returns a string representation of this Maybe&lt;T&gt;.
    /// </summary>
    public override string ToString() => _hasValue ? $"Some({_value})" : "None";

    /// <summary>
    /// Determines whether two Maybe&lt;T&gt; instances are equal.
    /// </summary>
    public static bool operator ==(Maybe<T> left, Maybe<T> right) => left.Equals(right);

    /// <summary>
    /// Determines whether two Maybe&lt;T&gt; instances are not equal.
    /// </summary>
    public static bool operator !=(Maybe<T> left, Maybe<T> right) => !left.Equals(right);
}