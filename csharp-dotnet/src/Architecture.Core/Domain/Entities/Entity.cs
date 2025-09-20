using System;

namespace Architecture.Core.Domain.Entities;

/// <summary>
/// Base class for domain entities that provides identity-based equality and common entity behavior.
/// Entities are distinguished by their identity rather than their attributes.
/// </summary>
/// <typeparam name="TId">The type of the entity's identifier, constrained to reference types.</typeparam>
public abstract class Entity<TId> : IEntity<TId>, IEquatable<Entity<TId>>
    where TId : class
{
    /// <summary>
    /// Gets the unique identifier for this entity.
    /// The identity is immutable and set during entity construction.
    /// </summary>
    public TId Id { get; protected init; }

    /// <summary>
    /// Initializes a new instance of the Entity class with the specified identifier.
    /// </summary>
    /// <param name="id">The unique identifier for this entity.</param>
    /// <exception cref="ArgumentNullException">Thrown when id is null.</exception>
    protected Entity(TId id)
    {
        Id = id ?? throw new ArgumentNullException(nameof(id), "Entity ID cannot be null");
    }

    /// <summary>
    /// Determines whether this entity is equal to another entity.
    /// Equality is based solely on the entity's identifier.
    /// </summary>
    /// <param name="other">The other entity to compare with.</param>
    /// <returns>True if the entities have the same identifier; otherwise, false.</returns>
    public bool Equals(Entity<TId>? other)
    {
        if (other is null) return false;
        if (ReferenceEquals(this, other)) return true;
        if (other.GetType() != GetType()) return false;
        return Id.Equals(other.Id);
    }

    /// <summary>
    /// Determines whether this entity is equal to another object.
    /// Returns true only if the other object is an entity of the same type with the same identifier.
    /// </summary>
    /// <param name="obj">The object to compare with.</param>
    /// <returns>True if the objects are equal; otherwise, false.</returns>
    public override bool Equals(object? obj)
    {
        if (obj is null) return false;
        if (ReferenceEquals(this, obj)) return true;
        if (obj.GetType() != GetType()) return false;
        return Equals((Entity<TId>)obj);
    }

    /// <summary>
    /// Gets the hash code for this entity based on its identifier.
    /// </summary>
    /// <returns>The hash code of the entity's identifier.</returns>
    public override int GetHashCode() => Id.GetHashCode();

    /// <summary>
    /// Returns a string representation of this entity including its type and identifier.
    /// </summary>
    /// <returns>A string describing this entity.</returns>
    public override string ToString() => $"{GetType().Name} {{ Id: {Id} }}";

    /// <summary>
    /// Determines whether two entities are equal based on their identifiers.
    /// </summary>
    /// <param name="left">The first entity to compare.</param>
    /// <param name="right">The second entity to compare.</param>
    /// <returns>True if the entities have the same identifier; otherwise, false.</returns>
    public static bool operator ==(Entity<TId>? left, Entity<TId>? right)
    {
        if (left is null && right is null) return true;
        if (left is null || right is null) return false;
        return left.Equals(right);
    }

    /// <summary>
    /// Determines whether two entities are not equal based on their identifiers.
    /// </summary>
    /// <param name="left">The first entity to compare.</param>
    /// <param name="right">The second entity to compare.</param>
    /// <returns>True if the entities have different identifiers; otherwise, false.</returns>
    public static bool operator !=(Entity<TId>? left, Entity<TId>? right) => !(left == right);
}