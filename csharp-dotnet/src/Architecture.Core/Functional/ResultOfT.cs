using System;

namespace Architecture.Core.Functional;

/// <summary>
/// Represents the result of an operation that can either succeed with a value or fail with an error.
/// Provides monadic operations for functional error handling and composition.
/// </summary>
/// <typeparam name="T">The type of value contained in successful results.</typeparam>
public readonly struct Result<T> : IEquatable<Result<T>>
{
    private readonly bool _isSuccess;
    private readonly T? _value;
    private readonly Error _error;

    /// <summary>
    /// Gets a value indicating whether the operation succeeded.
    /// </summary>
    public bool IsSuccess => _isSuccess;

    /// <summary>
    /// Gets a value indicating whether the operation failed.
    /// </summary>
    public bool IsFailure => !_isSuccess;

    /// <summary>
    /// Gets the success value.
    /// Throws InvalidOperationException if accessed when IsSuccess is false.
    /// </summary>
    public T Value
    {
        get
        {
            if (!_isSuccess)
                throw new InvalidOperationException("Cannot access Value when Result is in failure state");
            return _value!;
        }
    }

    /// <summary>
    /// Gets the error information if the operation failed.
    /// Throws InvalidOperationException if accessed when IsSuccess is true.
    /// </summary>
    public Error Error
    {
        get
        {
            if (_isSuccess)
                throw new InvalidOperationException("Cannot access Error when Result is in success state");
            return _error;
        }
    }

    private Result(bool isSuccess, T? value, Error error)
    {
        _isSuccess = isSuccess;
        _value = value;
        _error = error;
    }

    /// <summary>
    /// Creates a successful result with the specified value.
    /// </summary>
    /// <param name="value">The success value.</param>
    /// <returns>A successful Result&lt;T&gt; instance.</returns>
    [System.Diagnostics.CodeAnalysis.SuppressMessage("Design", "CA1000:Do not declare static members on generic types", Justification = "Static factory methods are appropriate for this functional type")]
    public static Result<T> Ok(T value) => new(true, value, default);

    /// <summary>
    /// Creates a failed result with the specified error.
    /// </summary>
    /// <param name="error">The error that caused the failure.</param>
    /// <returns>A failed Result&lt;T&gt; instance.</returns>
    [System.Diagnostics.CodeAnalysis.SuppressMessage("Design", "CA1000:Do not declare static members on generic types", Justification = "Static factory methods are appropriate for this functional type")]
    public static Result<T> Fail(Error error) => new(false, default, error);

    /// <summary>
    /// Transforms the value of a successful result using the specified function.
    /// If the result is failed, returns a failed Result&lt;TResult&gt; with the same error.
    /// </summary>
    /// <typeparam name="TResult">The type of the transformed value.</typeparam>
    /// <param name="func">The transformation function.</param>
    /// <returns>A Result&lt;TResult&gt; with the transformed value or the original error.</returns>
    public Result<TResult> Map<TResult>(Func<T, TResult> func)
    {
        ArgumentNullException.ThrowIfNull(func);

        return _isSuccess
            ? Result<TResult>.Ok(func(_value!))
            : Result<TResult>.Fail(_error);
    }

    /// <summary>
    /// Monadic bind operation that chains operations that can fail.
    /// If this result is successful, executes the function with the value; otherwise returns the error.
    /// </summary>
    /// <typeparam name="TResult">The type of value in the result returned by the function.</typeparam>
    /// <param name="func">The function to execute if this result is successful.</param>
    /// <returns>The result of the function or the original error.</returns>
    public Result<TResult> Bind<TResult>(Func<T, Result<TResult>> func)
    {
        ArgumentNullException.ThrowIfNull(func);

        return _isSuccess ? func(_value!) : Result<TResult>.Fail(_error);
    }

    /// <summary>
    /// Pattern matching method that executes one of two functions based on success/failure.
    /// </summary>
    /// <typeparam name="TOut">The type of value to return.</typeparam>
    /// <param name="onSuccess">Function to execute with the value if successful.</param>
    /// <param name="onFailure">Function to execute with the error if failed.</param>
    /// <returns>The result of the executed function.</returns>
    public TOut Match<TOut>(Func<T, TOut> onSuccess, Func<Error, TOut> onFailure)
    {
        ArgumentNullException.ThrowIfNull(onSuccess);
        ArgumentNullException.ThrowIfNull(onFailure);

        return _isSuccess ? onSuccess(_value!) : onFailure(_error);
    }

    /// <summary>
    /// Implicitly converts a value to a successful Result&lt;T&gt;.
    /// </summary>
    /// <param name="value">The value to convert.</param>
    public static implicit operator Result<T>(T value) => Ok(value);

    /// <summary>
    /// Converts a value to a successful Result&lt;T&gt;.
    /// </summary>
    /// <param name="value">The value to convert.</param>
    /// <returns>A successful Result&lt;T&gt;.</returns>
    [System.Diagnostics.CodeAnalysis.SuppressMessage("Design", "CA1000:Do not declare static members on generic types", Justification = "Static conversion methods are appropriate for this functional type")]
    public static Result<T> FromValue(T value) => Ok(value);

    /// <summary>
    /// Converts a value to a successful Result&lt;T&gt; (alternative name for implicit operator).
    /// </summary>
    /// <param name="value">The value to convert.</param>
    /// <returns>A successful Result&lt;T&gt;.</returns>
    [System.Diagnostics.CodeAnalysis.SuppressMessage("Design", "CA1000:Do not declare static members on generic types", Justification = "Required alternative for implicit operator by CA2225")]
    public static Result<T> FromT(T value) => Ok(value);

    /// <summary>
    /// Implicitly converts an Error to a failed Result&lt;T&gt;.
    /// </summary>
    /// <param name="error">The error to convert.</param>
    public static implicit operator Result<T>(Error error) => Fail(error);

    /// <summary>
    /// Converts an Error to a failed Result&lt;T&gt;.
    /// </summary>
    /// <param name="error">The error to convert.</param>
    /// <returns>A failed Result&lt;T&gt;.</returns>
    [System.Diagnostics.CodeAnalysis.SuppressMessage("Design", "CA1000:Do not declare static members on generic types", Justification = "Static conversion methods are appropriate for this functional type")]
    public static Result<T> FromError(Error error) => Fail(error);

    /// <summary>
    /// Creates a Result&lt;T&gt; from a Maybe&lt;T&gt; using the specified error when the Maybe is None.
    /// </summary>
    /// <param name="maybe">The Maybe&lt;T&gt; to convert.</param>
    /// <param name="errorWhenNone">The error to use when the Maybe is None.</param>
    /// <returns>A Result&lt;T&gt; with the Maybe's value or the specified error.</returns>
    [System.Diagnostics.CodeAnalysis.SuppressMessage("Design", "CA1000:Do not declare static members on generic types", Justification = "Static conversion methods are appropriate for this functional type")]
    public static Result<T> From(Maybe<T> maybe, Error errorWhenNone) =>
        maybe.HasValue ? Ok(maybe.Value) : Fail(errorWhenNone);

    /// <summary>
    /// Determines whether two Result&lt;T&gt; instances are equal.
    /// </summary>
    public bool Equals(Result<T> other)
    {
        if (_isSuccess != other._isSuccess) return false;
        if (_isSuccess)
            return EqualityComparer<T>.Default.Equals(_value, other._value);
        return _error.Equals(other._error);
    }

    /// <summary>
    /// Determines whether this Result&lt;T&gt; is equal to another object.
    /// </summary>
    public override bool Equals(object? obj) => obj is Result<T> other && Equals(other);

    /// <summary>
    /// Gets the hash code for this Result&lt;T&gt;.
    /// </summary>
    public override int GetHashCode()
    {
        if (_isSuccess)
            return HashCode.Combine(true, _value);
        return HashCode.Combine(false, _error);
    }

    /// <summary>
    /// Returns a string representation of this Result&lt;T&gt;.
    /// </summary>
    public override string ToString()
    {
        return _isSuccess ? $"Success: {_value}" : $"Failure: {_error}";
    }

    /// <summary>
    /// Determines whether two Result&lt;T&gt; instances are equal.
    /// </summary>
    public static bool operator ==(Result<T> left, Result<T> right) => left.Equals(right);

    /// <summary>
    /// Determines whether two Result&lt;T&gt; instances are not equal.
    /// </summary>
    public static bool operator !=(Result<T> left, Result<T> right) => !left.Equals(right);
}