using System;
using System.Collections.Generic;
using Xunit;
using Architecture.Core.Domain.Events;

namespace Architecture.Core.Tests.Domain;

public class DomainEventBaseTests
{
    [Fact]
    public void Should_GenerateUniqueId_When_EventCreated()
    {
        // Given/When
        var event1 = new TestDomainEvent("data1");
        var event2 = new TestDomainEvent("data2");

        // Then
        Assert.NotEqual(Guid.Empty, event1.Id);
        Assert.NotEqual(Guid.Empty, event2.Id);
        Assert.NotEqual(event1.Id, event2.Id);
    }

    [Fact]
    public void Should_SetOccurredAtToCurrentTime_When_EventCreated()
    {
        // Given
        var beforeCreation = DateTimeOffset.UtcNow;

        // When
        var domainEvent = new TestDomainEvent("test-data");

        // Then
        var afterCreation = DateTimeOffset.UtcNow;
        Assert.True(domainEvent.OccurredAt >= beforeCreation);
        Assert.True(domainEvent.OccurredAt <= afterCreation);
    }

    [Fact]
    public void Should_SetCorrelationId_When_ProvidedInConstructor()
    {
        // Given
        var expectedCorrelationId = "correlation-123";

        // When
        var domainEvent = new TestDomainEventWithMetadata("test-data", expectedCorrelationId);

        // Then
        Assert.Equal(expectedCorrelationId, domainEvent.CorrelationId);
    }

    [Fact]
    public void Should_SetCausationId_When_ProvidedInConstructor()
    {
        // Given
        var expectedCausationId = "causation-456";

        // When
        var domainEvent = new TestDomainEventWithMetadata("test-data", null, expectedCausationId);

        // Then
        Assert.Equal(expectedCausationId, domainEvent.CausationId);
    }

    [Fact]
    public void Should_SetMetadata_When_ProvidedInConstructor()
    {
        // Given
        var expectedMetadata = new Dictionary<string, object>
        {
            { "userId", "user-123" },
            { "sessionId", "session-456" },
            { "timestamp", DateTimeOffset.UtcNow }
        };

        // When
        var domainEvent = new TestDomainEventWithMetadata("test-data", null, null, expectedMetadata);

        // Then
        Assert.Equal(expectedMetadata.Count, domainEvent.Metadata.Count);
        foreach (var kvp in expectedMetadata)
        {
            Assert.True(domainEvent.Metadata.ContainsKey(kvp.Key));
            Assert.Equal(kvp.Value, domainEvent.Metadata[kvp.Key]);
        }
    }

    [Fact]
    public void Should_UseEmptyMetadata_When_NullMetadataProvided()
    {
        // Given/When
        var domainEvent = new TestDomainEventWithMetadata("test-data", null, null, null);

        // Then
        Assert.NotNull(domainEvent.Metadata);
        Assert.Empty(domainEvent.Metadata);
    }

    [Fact]
    public void Should_UseEmptyMetadata_When_DefaultConstructorUsed()
    {
        // Given/When
        var domainEvent = new TestDomainEvent("test-data");

        // Then
        Assert.NotNull(domainEvent.Metadata);
        Assert.Empty(domainEvent.Metadata);
    }

    [Fact]
    public void Should_ProvideReadOnlyMetadata_When_MetadataAccessed()
    {
        // Given
        var metadata = new Dictionary<string, object> { { "key", "value" } };
        var domainEvent = new TestDomainEventWithMetadata("test-data", null, null, metadata);

        // When
        var readOnlyMetadata = domainEvent.Metadata;

        // Then
        Assert.IsAssignableFrom<IReadOnlyDictionary<string, object>>(readOnlyMetadata);
        // Verify modifications to original dictionary don't affect the event
        metadata["newKey"] = "newValue";
        Assert.False(readOnlyMetadata.ContainsKey("newKey"));
    }

    [Fact]
    public void Should_HandleNullCorrelationAndCausationIds_When_NotProvided()
    {
        // Given/When
        var domainEvent = new TestDomainEvent("test-data");

        // Then
        Assert.Null(domainEvent.CorrelationId);
        Assert.Null(domainEvent.CausationId);
    }

    [Fact]
    public void Should_SupportEventChaining_When_CausationIdUsed()
    {
        // Given
        var originalEvent = new TestDomainEvent("original");
        var causedEvent = new TestDomainEventWithMetadata("caused",
            originalEvent.CorrelationId,
            originalEvent.Id.ToString());

        // When/Then
        Assert.Equal(originalEvent.Id.ToString(), causedEvent.CausationId);
        // In a real scenario, CorrelationId would typically be preserved across related events
    }

    [Fact]
    public void Should_EnsureImmutability_When_EventPropertiesAccessed()
    {
        // Given
        var correlationId = "correlation-123";
        var causationId = "causation-456";
        var metadata = new Dictionary<string, object> { { "key", "value" } };

        // When
        var domainEvent = new TestDomainEventWithMetadata("test-data", correlationId, causationId, metadata);

        // Then
        // Properties should be immutable (init-only)
        Assert.Equal(correlationId, domainEvent.CorrelationId);
        Assert.Equal(causationId, domainEvent.CausationId);

        // Verify that the event maintains its own copy of metadata
        metadata.Clear();
        Assert.Single(domainEvent.Metadata); // Should still contain the original value
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