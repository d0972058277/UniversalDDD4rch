using System;
using System.Collections.Generic;

namespace Architecture.Core.Functional;

/// <summary>
/// Represents a categorized error with contextual metadata for functional error handling.
/// Immutable struct that avoids exceptions for business logic failures.
/// </summary>
[System.Diagnostics.CodeAnalysis.SuppressMessage("Naming", "CA1716:Identifiers should not match keywords", Justification = "Error is the domain term for this concept in functional programming")]
public readonly struct Error : IEquatable<Error>
{
    /// <summary>
    /// Gets the unique error code that identifies the specific type of error.
    /// </summary>
    public string Code { get; }

    /// <summary>
    /// Gets the human-readable error message describing what went wrong.
    /// </summary>
    public string Message { get; }

    /// <summary>
    /// Gets the category that classifies the error by its domain and handling strategy.
    /// </summary>
    public ErrorCategory Category { get; }

    /// <summary>
    /// Gets additional contextual information about the error.
    /// </summary>
    public IReadOnlyDictionary<string, object> Metadata { get; }

    private Error(string code, string message, ErrorCategory category, IDictionary<string, object>? metadata)
    {
        Code = code ?? throw new ArgumentNullException(nameof(code));
        Message = message ?? throw new ArgumentNullException(nameof(message));
        Category = category;
        Metadata = metadata?.ToDictionary(kvp => kvp.Key, kvp => kvp.Value) as IReadOnlyDictionary<string, object>
                   ?? new Dictionary<string, object>();
    }

    /// <summary>
    /// Creates a domain error representing a business rule violation.
    /// </summary>
    /// <param name="code">The unique error code.</param>
    /// <param name="message">The error message.</param>
    /// <param name="metadata">Optional additional context.</param>
    /// <returns>A new domain error instance.</returns>
    public static Error Domain(string code, string message, IDictionary<string, object>? metadata = null) =>
        new(code, message, ErrorCategory.Domain, metadata);

    /// <summary>
    /// Creates a validation error representing invalid input or data format.
    /// </summary>
    /// <param name="code">The unique error code.</param>
    /// <param name="message">The error message.</param>
    /// <param name="metadata">Optional additional context.</param>
    /// <returns>A new validation error instance.</returns>
    public static Error Validation(string code, string message, IDictionary<string, object>? metadata = null) =>
        new(code, message, ErrorCategory.Validation, metadata);

    /// <summary>
    /// Creates an infrastructure error representing external system failure.
    /// </summary>
    /// <param name="code">The unique error code.</param>
    /// <param name="message">The error message.</param>
    /// <param name="metadata">Optional additional context.</param>
    /// <returns>A new infrastructure error instance.</returns>
    public static Error Infrastructure(string code, string message, IDictionary<string, object>? metadata = null) =>
        new(code, message, ErrorCategory.Infrastructure, metadata);

    /// <summary>
    /// Creates a concurrency error representing optimistic locking or state conflicts.
    /// </summary>
    /// <param name="code">The unique error code.</param>
    /// <param name="message">The error message.</param>
    /// <param name="metadata">Optional additional context.</param>
    /// <returns>A new concurrency error instance.</returns>
    public static Error Concurrency(string code, string message, IDictionary<string, object>? metadata = null) =>
        new(code, message, ErrorCategory.Concurrency, metadata);

    /// <summary>
    /// Creates a security error representing authentication, authorization, or policy violations.
    /// </summary>
    /// <param name="code">The unique error code.</param>
    /// <param name="message">The error message.</param>
    /// <param name="metadata">Optional additional context.</param>
    /// <returns>A new security error instance.</returns>
    public static Error Security(string code, string message, IDictionary<string, object>? metadata = null) =>
        new(code, message, ErrorCategory.Security, metadata);

    /// <summary>
    /// Determines whether two error instances are equal.
    /// </summary>
    public bool Equals(Error other) =>
        Code == other.Code &&
        Message == other.Message &&
        Category == other.Category &&
        MetadataEquals(Metadata, other.Metadata);

    /// <summary>
    /// Determines whether this error is equal to another object.
    /// </summary>
    public override bool Equals(object? obj) => obj is Error other && Equals(other);

    /// <summary>
    /// Gets the hash code for this error.
    /// </summary>
    public override int GetHashCode() => HashCode.Combine(Code, Message, Category);

    /// <summary>
    /// Returns a string representation of this error.
    /// </summary>
    public override string ToString() => $"[{Category}] {Code}: {Message}";

    /// <summary>
    /// Determines whether two errors are equal.
    /// </summary>
    public static bool operator ==(Error left, Error right) => left.Equals(right);

    /// <summary>
    /// Determines whether two errors are not equal.
    /// </summary>
    public static bool operator !=(Error left, Error right) => !left.Equals(right);

    private static bool MetadataEquals(IReadOnlyDictionary<string, object> left, IReadOnlyDictionary<string, object> right)
    {
        if (left.Count != right.Count) return false;

        foreach (var kvp in left)
        {
            if (!right.TryGetValue(kvp.Key, out var rightValue) ||
                !Equals(kvp.Value, rightValue))
            {
                return false;
            }
        }

        return true;
    }
}