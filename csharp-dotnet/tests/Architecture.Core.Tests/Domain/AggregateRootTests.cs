using System;
using System.Linq;
using Xunit;
using Architecture.Core.Domain.Aggregates;
using Architecture.Core.Domain.Events;

namespace Architecture.Core.Tests.Domain;

public class AggregateRootTests
{
    [Fact]
    public void Should_InitializeWithVersion_When_AggregateCreated()
    {
        // Given/When
        var aggregate = new TestAggregate("test-id");

        // Then
        Assert.Equal(0, aggregate.Version);
        Assert.Empty(aggregate.Events);
    }

    [Fact]
    public void Should_AddEvent_When_EventIsRaised()
    {
        // Given
        var aggregate = new TestAggregate("test-id");
        var testEvent = new TestDomainEvent("test-data");

        // When
        aggregate.RaiseTestEvent(testEvent);

        // Then
        Assert.Single(aggregate.Events);
        Assert.Contains(testEvent, aggregate.Events);
    }

    [Fact]
    public void Should_MaintainEventOrder_When_MultipleEventsAdded()
    {
        // Given
        var aggregate = new TestAggregate("test-id");
        var event1 = new TestDomainEvent("event1");
        var event2 = new TestDomainEvent("event2");
        var event3 = new TestDomainEvent("event3");

        // When
        aggregate.RaiseTestEvent(event1);
        aggregate.RaiseTestEvent(event2);
        aggregate.RaiseTestEvent(event3);

        // Then
        Assert.Equal(3, aggregate.Events.Count);
        Assert.Equal(event1, aggregate.Events.ElementAt(0));
        Assert.Equal(event2, aggregate.Events.ElementAt(1));
        Assert.Equal(event3, aggregate.Events.ElementAt(2));
    }

    [Fact]
    public void Should_ClearEvents_When_ClearEventsIsCalled()
    {
        // Given
        var aggregate = new TestAggregate("test-id");
        aggregate.RaiseTestEvent(new TestDomainEvent("test-data"));
        Assert.Single(aggregate.Events); // Verify event was added

        // When
        aggregate.ClearEvents();

        // Then
        Assert.Empty(aggregate.Events);
    }

    [Fact]
    public void Should_IncrementVersion_When_VersionIsUpdated()
    {
        // Given
        var aggregate = new TestAggregate("test-id");
        Assert.Equal(0, aggregate.Version);

        // When
        aggregate.UpdateVersion(1);

        // Then
        Assert.Equal(1, aggregate.Version);
    }

    [Fact]
    public void Should_ProvideReadOnlyEvents_When_EventsAccessed()
    {
        // Given
        var aggregate = new TestAggregate("test-id");
        var testEvent = new TestDomainEvent("test-data");
        aggregate.RaiseTestEvent(testEvent);

        // When
        var events = aggregate.Events;

        // Then
        Assert.IsAssignableFrom<System.Collections.Generic.IReadOnlyCollection<IDomainEvent>>(events);
        // Verify it's truly read-only by checking it's not the internal collection
        Assert.NotSame(aggregate.GetInternalEvents(), events);
    }

    [Fact]
    public void Should_InheritEntityBehavior_When_UsingAggregateRoot()
    {
        // Given
        var id = "test-id";
        var aggregate1 = new TestAggregate(id);
        var aggregate2 = new TestAggregate(id);
        var aggregate3 = new TestAggregate("different-id");

        // When
        var sameIdEqual = aggregate1.Equals(aggregate2);
        var differentIdNotEqual = aggregate1.Equals(aggregate3);

        // Then
        Assert.True(sameIdEqual); // Same ID = equal (Entity behavior)
        Assert.False(differentIdNotEqual); // Different ID = not equal
    }

    [Fact]
    public void Should_HandleConcurrentVersioning_When_OptimisticConcurrencyUsed()
    {
        // Given
        var aggregate = new TestAggregate("test-id");
        var initialVersion = aggregate.Version;

        // When
        aggregate.UpdateVersion(initialVersion + 1);
        var newVersion = aggregate.Version;

        // Then
        Assert.Equal(initialVersion + 1, newVersion);
        Assert.NotEqual(initialVersion, newVersion);
    }

    [Fact]
    public void Should_PreserveEventMetadata_When_EventsAreAdded()
    {
        // Given
        var aggregate = new TestAggregate("test-id");
        var correlationId = "correlation-123";
        var causationId = "causation-456";
        var metadata = new Dictionary<string, object> { { "key", "value" } };
        var eventWithMetadata = new TestDomainEventWithMetadata("test-data", correlationId, causationId, metadata);

        // When
        aggregate.RaiseTestEvent(eventWithMetadata);

        // Then
        var addedEvent = aggregate.Events.First();
        Assert.Equal(correlationId, addedEvent.CorrelationId);
        Assert.Equal(causationId, addedEvent.CausationId);
        Assert.Contains("key", addedEvent.Metadata.Keys);
        Assert.Equal("value", addedEvent.Metadata["key"]);
    }

    private class TestAggregate : AggregateRoot<string>
    {
        public TestAggregate(string id) : base(id)
        {
        }

        public void RaiseTestEvent(IDomainEvent domainEvent)
        {
            AddEvent(domainEvent);
        }

        public void UpdateVersion(long version)
        {
            Version = version;
        }

        // For testing read-only behavior
        public object GetInternalEvents() => typeof(AggregateRoot<string>)
            .GetField("_events", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)
            ?.GetValue(this) ?? throw new InvalidOperationException("Cannot access internal events");
    }

    private class TestDomainEvent : DomainEventBase
    {
        public string Data { get; }

        public TestDomainEvent(string data)
        {
            Data = data;
        }
    }

    private class TestDomainEventWithMetadata : DomainEventBase
    {
        public string Data { get; }

        public TestDomainEventWithMetadata(string data, string? correlationId = null, string? causationId = null, IDictionary<string, object>? metadata = null)
            : base(correlationId, causationId, metadata)
        {
            Data = data;
        }
    }
}