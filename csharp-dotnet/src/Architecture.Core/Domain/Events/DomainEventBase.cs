using System;
using System.Collections.Generic;

namespace Architecture.Core.Domain.Events;

/// <summary>
/// Base implementation for domain events that provides common properties and initialization.
/// Implements the IDomainEvent interface with sensible defaults and immutable properties.
/// </summary>
public abstract class DomainEventBase : IDomainEvent
{
    /// <summary>
    /// Gets the unique identifier for this domain event.
    /// Automatically generated when the event is created.
    /// </summary>
    public Guid Id { get; }

    /// <summary>
    /// Gets the timestamp when this domain event occurred.
    /// Automatically set to the current UTC time when the event is created.
    /// </summary>
    public DateTimeOffset OccurredAt { get; }

    /// <summary>
    /// Gets the correlation identifier that tracks related events across service boundaries.
    /// Can be set during event construction to maintain correlation chains.
    /// </summary>
    public string? CorrelationId { get; init; }

    /// <summary>
    /// Gets the causation identifier that links this event to the event or command that caused it.
    /// Can be set during event construction to maintain causal relationships.
    /// </summary>
    public string? CausationId { get; init; }

    /// <summary>
    /// Gets additional contextual metadata associated with this domain event.
    /// Provides a read-only view of the metadata dictionary.
    /// </summary>
    public IReadOnlyDictionary<string, object> Metadata { get; init; }

    /// <summary>
    /// Initializes a new instance of the DomainEventBase class with default values.
    /// Generates a new GUID for the Id and sets OccurredAt to the current UTC time.
    /// </summary>
    protected DomainEventBase()
    {
        Id = Guid.NewGuid();
        OccurredAt = DateTimeOffset.UtcNow;
        Metadata = new Dictionary<string, object>();
    }

    /// <summary>
    /// Initializes a new instance of the DomainEventBase class with the specified correlation and causation identifiers.
    /// </summary>
    /// <param name="correlationId">The correlation identifier for tracking related events.</param>
    /// <param name="causationId">The causation identifier linking to the causing event or command.</param>
    /// <param name="metadata">Additional contextual metadata for the event.</param>
    protected DomainEventBase(string? correlationId, string? causationId, IDictionary<string, object>? metadata = null)
    {
        Id = Guid.NewGuid();
        OccurredAt = DateTimeOffset.UtcNow;
        CorrelationId = correlationId;
        CausationId = causationId;
        Metadata = metadata?.ToDictionary(kvp => kvp.Key, kvp => kvp.Value) as IReadOnlyDictionary<string, object>
                   ?? new Dictionary<string, object>();
    }

    /// <summary>
    /// Returns a string representation of this domain event including its type and basic properties.
    /// </summary>
    /// <returns>A string describing this domain event.</returns>
    public override string ToString()
    {
        var typeName = GetType().Name;
        var correlationInfo = !string.IsNullOrEmpty(CorrelationId) ? $" [CorrelationId: {CorrelationId}]" : string.Empty;
        return $"{typeName} {{ Id: {Id}, OccurredAt: {OccurredAt:yyyy-MM-dd HH:mm:ss.fff} UTC{correlationInfo} }}";
    }
}