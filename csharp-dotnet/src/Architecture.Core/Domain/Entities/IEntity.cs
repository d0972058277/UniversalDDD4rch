namespace Architecture.Core.Domain.Entities;

/// <summary>
/// Defines the contract for domain entities with identity-based equality.
/// Entities are objects that have a distinct identity that runs through time and different representations.
/// </summary>
/// <typeparam name="TId">The type of the entity's identifier, constrained to reference types.</typeparam>
public interface IEntity<TId>
    where TId : class
{
    /// <summary>
    /// Gets the unique identifier for this entity.
    /// The identity distinguishes this entity from all others and remains constant throughout the entity's lifetime.
    /// </summary>
    TId Id { get; }
}