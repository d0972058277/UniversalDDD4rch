using System;
using System.Collections.Generic;
using Architecture.Core.Domain.Entities;
using Architecture.Core.Domain.Events;

namespace Architecture.Core.Domain.Aggregates;

/// <summary>
/// Base class for aggregate roots that provides event collection, version control, and consistency boundary management.
/// Aggregate roots are responsible for maintaining business invariants and coordinating changes within their boundary.
/// </summary>
/// <typeparam name="TId">The type of the aggregate root's identifier, constrained to reference types.</typeparam>
public abstract class AggregateRoot<TId> : Entity<TId>, IAggregateRoot<TId>
    where TId : class
{
    private readonly List<IDomainEvent> _events = new();

    /// <summary>
    /// Gets the version number used for optimistic concurrency control.
    /// The version should be incremented by the infrastructure when the aggregate is persisted.
    /// </summary>
    public long Version { get; protected set; }

    /// <summary>
    /// Gets a read-only collection of domain events that have been raised by this aggregate.
    /// Events are collected as business operations occur and can be published or persisted by the infrastructure.
    /// </summary>
    public IReadOnlyCollection<IDomainEvent> Events => _events.AsReadOnly();

    /// <summary>
    /// Initializes a new instance of the AggregateRoot class with the specified identifier.
    /// Sets the initial version to 0, indicating a new, unpersisted aggregate.
    /// </summary>
    /// <param name="id">The unique identifier for this aggregate root.</param>
    /// <exception cref="ArgumentNullException">Thrown when id is null.</exception>
    protected AggregateRoot(TId id) : base(id)
    {
        Version = 0;
    }

    /// <summary>
    /// Adds a domain event to the aggregate's uncommitted events collection.
    /// The event will be included in the Events collection until ClearEvents is called.
    /// </summary>
    /// <param name="domainEvent">The domain event to add.</param>
    /// <exception cref="ArgumentNullException">Thrown when domainEvent is null.</exception>
    protected void AddEvent(IDomainEvent domainEvent)
    {
        if (domainEvent == null)
            throw new ArgumentNullException(nameof(domainEvent), "Domain event cannot be null");

        _events.Add(domainEvent);
    }

    /// <summary>
    /// Clears all uncommitted domain events from this aggregate.
    /// This method is typically called by the infrastructure after events have been published or persisted.
    /// </summary>
    public void ClearEvents()
    {
        _events.Clear();
    }

    /// <summary>
    /// Returns a string representation of this aggregate root including its type, identifier, and version.
    /// </summary>
    /// <returns>A string describing this aggregate root.</returns>
    public override string ToString()
    {
        var eventCount = _events.Count;
        var eventsInfo = eventCount > 0 ? $", Events: {eventCount}" : string.Empty;
        return $"{GetType().Name} {{ Id: {Id}, Version: {Version}{eventsInfo} }}";
    }
}