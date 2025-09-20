using System;

namespace Architecture.Core.Functional;

/// <summary>
/// Represents the result of an operation that can either succeed or fail without returning a value.
/// Provides monadic operations for functional error handling and composition.
/// </summary>
public readonly struct Result : IEquatable<Result>
{
    private readonly bool _isSuccess;
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
    /// Gets the error information if the operation failed.
    /// Throws InvalidOperationException if accessed when IsSuccess is true.
    /// </summary>
    public Error Error
    {
        get
        {
            if (_isSuccess)
                throw new InvalidOperationException("Cannot access Error when Result is successful");
            return _error;
        }
    }

    private Result(bool isSuccess, Error error)
    {
        _isSuccess = isSuccess;
        _error = error;
    }

    /// <summary>
    /// Creates a successful result.
    /// </summary>
    /// <returns>A successful Result instance.</returns>
    public static Result Ok() => new(true, default);

    /// <summary>
    /// Creates a failed result with the specified error.
    /// </summary>
    /// <param name="error">The error that caused the failure.</param>
    /// <returns>A failed Result instance.</returns>
    public static Result Fail(Error error) => new(false, error);

    /// <summary>
    /// Transforms a successful result by applying a function that returns a value.
    /// If the result is failed, returns a failed Result&lt;T&gt; with the same error.
    /// </summary>
    /// <typeparam name="T">The type of value to return.</typeparam>
    /// <param name="func">The function to apply if successful.</param>
    /// <returns>A Result&lt;T&gt; containing the transformed value or the original error.</returns>
    public Result<T> Map<T>(Func<T> func)
    {
        ArgumentNullException.ThrowIfNull(func);

        return _isSuccess
            ? Result<T>.Ok(func())
            : Result<T>.Fail(_error);
    }

    /// <summary>
    /// Monadic bind operation that chains operations that can fail.
    /// If this result is successful, executes the function; otherwise returns the error.
    /// </summary>
    /// <param name="func">The function to execute if this result is successful.</param>
    /// <returns>The result of the function or the original error.</returns>
    public Result Bind(Func<Result> func)
    {
        ArgumentNullException.ThrowIfNull(func);

        return _isSuccess ? func() : this;
    }

    /// <summary>
    /// Pattern matching method that executes one of two functions based on success/failure.
    /// </summary>
    /// <typeparam name="T">The type of value to return.</typeparam>
    /// <param name="onSuccess">Function to execute if successful.</param>
    /// <param name="onFailure">Function to execute if failed.</param>
    /// <returns>The result of the executed function.</returns>
    public T Match<T>(Func<T> onSuccess, Func<Error, T> onFailure)
    {
        ArgumentNullException.ThrowIfNull(onSuccess);
        ArgumentNullException.ThrowIfNull(onFailure);

        return _isSuccess ? onSuccess() : onFailure(_error);
    }

    /// <summary>
    /// Implicitly converts an Error to a failed Result.
    /// </summary>
    /// <param name="error">The error to convert.</param>
    public static implicit operator Result(Error error) => Fail(error);

    /// <summary>
    /// Converts an Error to a failed Result.
    /// </summary>
    /// <param name="error">The error to convert.</param>
    /// <returns>A failed Result.</returns>
    public static Result FromError(Error error) => Fail(error);

    /// <summary>
    /// Determines whether two Result instances are equal.
    /// </summary>
    public bool Equals(Result other)
    {
        if (_isSuccess != other._isSuccess) return false;
        return _isSuccess || _error.Equals(other._error);
    }

    /// <summary>
    /// Determines whether this Result is equal to another object.
    /// </summary>
    public override bool Equals(object? obj) => obj is Result other && Equals(other);

    /// <summary>
    /// Gets the hash code for this Result.
    /// </summary>
    public override int GetHashCode() => _isSuccess ? 1 : _error.GetHashCode();

    /// <summary>
    /// Returns a string representation of this Result.
    /// </summary>
    public override string ToString() => _isSuccess ? "Success" : $"Failure: {_error}";

    /// <summary>
    /// Determines whether two Results are equal.
    /// </summary>
    public static bool operator ==(Result left, Result right) => left.Equals(right);

    /// <summary>
    /// Determines whether two Results are not equal.
    /// </summary>
    public static bool operator !=(Result left, Result right) => !left.Equals(right);
}