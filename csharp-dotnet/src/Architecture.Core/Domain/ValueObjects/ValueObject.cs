using System;
using System.Collections.Generic;
using System.Linq;

namespace Architecture.Core.Domain.ValueObjects;

/// <summary>
/// Base class for value objects that provides structural equality based on component values.
/// Value objects are immutable and are distinguished by their attributes rather than identity.
/// </summary>
public abstract class ValueObject : IEquatable<ValueObject>
{
    /// <summary>
    /// Gets the components that participate in equality comparison.
    /// Derived classes must implement this method to return all properties that define equality.
    /// </summary>
    /// <returns>An enumerable of objects that participate in equality comparison.</returns>
    protected abstract IEnumerable<object?> GetEqualityComponents();

    /// <summary>
    /// Determines whether this value object is equal to another value object.
    /// Equality is based on the structural comparison of all equality components.
    /// </summary>
    /// <param name="other">The other value object to compare with.</param>
    /// <returns>True if all equality components are equal; otherwise, false.</returns>
    public bool Equals(ValueObject? other)
    {
        if (other is null) return false;
        if (ReferenceEquals(this, other)) return true;
        if (GetType() != other.GetType()) return false;

        return GetEqualityComponents().SequenceEqual(other.GetEqualityComponents());
    }

    /// <summary>
    /// Determines whether this value object is equal to another object.
    /// Returns true only if the other object is a value object of the same type with equal components.
    /// </summary>
    /// <param name="obj">The object to compare with.</param>
    /// <returns>True if the objects are equal; otherwise, false.</returns>
    public override bool Equals(object? obj) => Equals(obj as ValueObject);

    /// <summary>
    /// Gets the hash code for this value object based on its equality components.
    /// Uses a combination of all component hash codes to ensure consistent hashing.
    /// </summary>
    /// <returns>A hash code computed from all equality components.</returns>
    public override int GetHashCode()
    {
        return GetEqualityComponents()
            .Aggregate(0, (hash, component) => HashCode.Combine(hash, component?.GetHashCode() ?? 0));
    }

    /// <summary>
    /// Returns a string representation of this value object including its type and key components.
    /// </summary>
    /// <returns>A string describing this value object.</returns>
    public override string ToString()
    {
        var typeName = GetType().Name;
        var components = GetEqualityComponents()
            .Take(3) // Limit to first 3 components for readability
            .Select(c => c?.ToString() ?? "null");
        var componentString = string.Join(", ", components);
        var ellipsis = GetEqualityComponents().Skip(3).Any() ? ", ..." : string.Empty;

        return $"{typeName} {{ {componentString}{ellipsis} }}";
    }

    /// <summary>
    /// Determines whether two value objects are equal based on their components.
    /// </summary>
    /// <param name="left">The first value object to compare.</param>
    /// <param name="right">The second value object to compare.</param>
    /// <returns>True if the value objects have equal components; otherwise, false.</returns>
    public static bool operator ==(ValueObject? left, ValueObject? right)
    {
        if (left is null && right is null) return true;
        if (left is null || right is null) return false;
        return left.Equals(right);
    }

    /// <summary>
    /// Determines whether two value objects are not equal based on their components.
    /// </summary>
    /// <param name="left">The first value object to compare.</param>
    /// <param name="right">The second value object to compare.</param>
    /// <returns>True if the value objects have different components; otherwise, false.</returns>
    public static bool operator !=(ValueObject? left, ValueObject? right) => !(left == right);
}