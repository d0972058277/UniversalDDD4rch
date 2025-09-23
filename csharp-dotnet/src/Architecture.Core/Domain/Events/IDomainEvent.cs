using System;
using System.Collections.Generic;

namespace Architecture.Core.Domain.Events;

/// <summary>
/// Defines the contract for domain events that represent something meaningful that happened in the domain.
/// Domain events enable loose coupling between aggregates and support event-driven architectures.
/// </summary>
public interface IDomainEvent
{
    /// <summary>
    /// Gets the unique identifier for this domain event.
    /// </summary>
    Guid Id { get; }

    /// <summary>
    /// Gets the timestamp when this domain event occurred.
    /// </summary>
    DateTimeOffset OccurredAt { get; }

    /// <summary>
    /// Gets the correlation identifier that tracks related events across service boundaries.
    /// Used to trace a request or business operation through multiple components.
    /// </summary>
    string? CorrelationId { get; }

    /// <summary>
    /// Gets the causation identifier that links this event to the event or command that caused it.
    /// Used to build causal chains and understand event relationships.
    /// </summary>
    string? CausationId { get; }

    /// <summary>
    /// Gets additional contextual metadata associated with this domain event.
    /// Can include user information, system context, or any other relevant data.
    /// </summary>
    IReadOnlyDictionary<string, object> Metadata { get; }
}