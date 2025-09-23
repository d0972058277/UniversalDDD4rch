using System.Collections.Generic;
using Architecture.Core.Domain.Entities;
using Architecture.Core.Domain.Events;

namespace Architecture.Core.Domain.Aggregates;

/// <summary>
/// Defines the contract for aggregate roots that manage consistency boundaries and domain events.
/// Aggregate roots are the only entities that can be directly accessed from outside the aggregate boundary.
/// </summary>
/// <typeparam name="TId">The type of the aggregate root's identifier, constrained to reference types.</typeparam>
public interface IAggregateRoot<TId> : IEntity<TId>
    where TId : class
{
    /// <summary>
    /// Gets the version number used for optimistic concurrency control.
    /// The version is incremented each time the aggregate is persisted.
    /// </summary>
    long Version { get; }

    /// <summary>
    /// Gets the collection of domain events that have been raised by this aggregate.
    /// Events represent important business occurrences that other parts of the system may need to react to.
    /// </summary>
    IReadOnlyCollection<IDomainEvent> Events { get; }

    /// <summary>
    /// Clears all uncommitted domain events from this aggregate.
    /// Typically called by the infrastructure after events have been published or persisted.
    /// </summary>
    void ClearEvents();
}