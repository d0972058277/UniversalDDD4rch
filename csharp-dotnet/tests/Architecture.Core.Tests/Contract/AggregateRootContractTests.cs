using Architecture.Core.Domain.Aggregates;
using Architecture.Core.Domain.Entities;
using Architecture.Core.Domain.Events;
using Architecture.Core.Domain.ValueObjects;
using Architecture.Core.Functional;
using System;
using System.Collections.Generic;
using System.Linq;
using Xunit;

namespace Architecture.Core.Tests.Contract
{
    /// <summary>
    /// Contract tests for AggregateRoot event management API consistency.
    /// These tests validate cross-language behavioral consistency for AggregateRoot implementations.
    ///
    /// Test naming: Should_ExpectedBehavior_When_StateUnderTest
    /// Test structure: Given-When-Then blocks with explicit comments
    /// </summary>
    public class AggregateRootContractTests
    {
        // Test entity ID implementation
        public sealed class TestEntityId : ValueObject
        {
            public string Value { get; }

            public TestEntityId(string value)
            {
                Value = value ?? throw new ArgumentNullException(nameof(value));
            }

            protected override IEnumerable<object> GetEqualityComponents()
            {
                yield return Value;
            }

            public override string ToString() => Value;
        }

        // Test domain event implementation
        public sealed class TestDomainEvent : DomainEventBase
        {
            public string TestData { get; }

            public TestDomainEvent(string testData, string? correlationId = null, string? causationId = null)
                : base(correlationId, causationId)
            {
                TestData = testData ?? throw new ArgumentNullException(nameof(testData));
            }
        }

        // Test aggregate root implementation
        public sealed class TestAggregateRoot : AggregateRoot<TestEntityId>
        {
            public string TestField { get; private set; }

            public TestAggregateRoot(TestEntityId id) : base(id)
            {
                TestField = "initial";
                AddEvent(new TestDomainEvent($"Created with ID: {id.Value}"));
            }

            public void ChangeTestField(string newValue)
            {
                if (string.IsNullOrEmpty(newValue))
                    throw new ArgumentException("Value cannot be null or empty", nameof(newValue));

                var oldValue = TestField;
                TestField = newValue;
                AddEvent(new TestDomainEvent($"Changed from {oldValue} to {newValue}"));
                IncrementVersion();
            }

            public void AddTestEvent(string eventData, string? correlationId = null, string? causationId = null)
            {
                AddEvent(new TestDomainEvent(eventData, correlationId, causationId));
            }
        }

        public class DomainEventCollectionTests
        {
            [Fact]
            public void Should_InitializeWithCreateEvent_When_AggregateCreated()
            {
                // Given: A new aggregate ID
                var id = new TestEntityId("new-aggregate");

                // When: Creating the aggregate
                var aggregate = new TestAggregateRoot(id);

                // Then: Should have creation event
                Assert.Single(aggregate.Events);

                var @event = aggregate.Events.First();
                Assert.IsType<TestDomainEvent>(@event);

                var testEvent = (TestDomainEvent)@event;
                Assert.Contains($"Created with ID: {id.Value}", testEvent.TestData);
            }

            [Fact]
            public void Should_CollectDomainEvents_When_EventsAdded()
            {
                // Given: An aggregate root with initial event
                var id = new TestEntityId("test-aggregate");
                var aggregate = new TestAggregateRoot(id);
                var initialEventCount = aggregate.Events.Count;

                // When: Adding multiple domain events
                aggregate.AddTestEvent("First test event");
                aggregate.AddTestEvent("Second test event");

                // Then: Events should be collected in order
                Assert.Equal(initialEventCount + 2, aggregate.Events.Count);

                var events = aggregate.Events.Skip(1).Cast<TestDomainEvent>().ToList();
                Assert.Equal("First test event", events[0].TestData);
                Assert.Equal("Second test event", events[1].TestData);
            }

            [Fact]
            public void Should_ClearAllEvents_When_ClearEventsCalled()
            {
                // Given: An aggregate with multiple events
                var id = new TestEntityId("test-aggregate");
                var aggregate = new TestAggregateRoot(id);
                aggregate.AddTestEvent("Event to be cleared");
                aggregate.AddTestEvent("Another event to be cleared");
                Assert.True(aggregate.Events.Count > 0);

                // When: Clearing domain events
                aggregate.ClearEvents();

                // Then: Event collection should be empty
                Assert.Empty(aggregate.Events);
            }

            [Fact]
            public void Should_ReturnReadOnlyEventCollection_When_AccessingEvents()
            {
                // Given: An aggregate with events
                var id = new TestEntityId("test-aggregate");
                var aggregate = new TestAggregateRoot(id);
                aggregate.AddTestEvent("Test event");

                // When: Accessing event collection
                var events = aggregate.Events;

                // Then: Collection should be read-only
                Assert.IsAssignableFrom<IReadOnlyList<IDomainEvent>>(events);

                // Verify it's truly read-only by checking the concrete type
                var concreteType = events.GetType();
                Assert.True(concreteType.IsAssignableFrom(typeof(IReadOnlyList<IDomainEvent>)) ||
                           concreteType.Name.Contains("ReadOnly", StringComparison.OrdinalIgnoreCase));
            }

            [Fact]
            public void Should_PreserveDomainEventMetadata_When_EventsAdded()
            {
                // Given: A domain event with metadata
                var id = new TestEntityId("test-aggregate");
                var aggregate = new TestAggregateRoot(id);
                var correlationId = "correlation-123";
                var causationId = "causation-456";

                // When: Adding event with metadata
                aggregate.AddTestEvent("Event with metadata", correlationId, causationId);

                // Then: Metadata should be preserved
                var retrievedEvent = aggregate.Events
                    .OfType<TestDomainEvent>()
                    .First(e => e.TestData == "Event with metadata");

                Assert.Equal(correlationId, retrievedEvent.CorrelationId);
                Assert.Equal(causationId, retrievedEvent.CausationId);
                Assert.True(retrievedEvent.OccurredAt > DateTimeOffset.MinValue);
            }

            [Fact]
            public void Should_MaintainEventOrder_When_MultipleEventsAdded()
            {
                // Given: An empty aggregate (clear initial events)
                var id = new TestEntityId("test-aggregate");
                var aggregate = new TestAggregateRoot(id);
                aggregate.ClearEvents();

                // When: Adding events in specific order
                aggregate.AddTestEvent("First");
                aggregate.AddTestEvent("Second");
                aggregate.AddTestEvent("Third");

                // Then: Events should maintain order
                Assert.Equal(3, aggregate.Events.Count);

                var events = aggregate.Events.Cast<TestDomainEvent>().ToList();
                Assert.Equal("First", events[0].TestData);
                Assert.Equal("Second", events[1].TestData);
                Assert.Equal("Third", events[2].TestData);
            }
        }

        public class VersionControlTests
        {
            [Fact]
            public void Should_InitializeWithZeroVersion_When_AggregateCreated()
            {
                // Given: A new aggregate ID
                var id = new TestEntityId("version-test");

                // When: Creating new aggregate
                var aggregate = new TestAggregateRoot(id);

                // Then: Version should start at 0
                Assert.Equal(0L, aggregate.Version);
            }

            [Fact]
            public void Should_IncrementVersion_When_IncrementVersionCalled()
            {
                // Given: An aggregate at version 0
                var id = new TestEntityId("test-aggregate");
                var aggregate = new TestAggregateRoot(id);
                Assert.Equal(0L, aggregate.Version);

                // When: Incrementing version
                aggregate.IncrementVersion();

                // Then: Version should be 1
                Assert.Equal(1L, aggregate.Version);
            }

            [Fact]
            public void Should_IncrementVersionAutomatically_When_BusinessOperationPerformed()
            {
                // Given: An aggregate at initial version
                var id = new TestEntityId("test-aggregate");
                var aggregate = new TestAggregateRoot(id);
                var initialVersion = aggregate.Version;

                // When: Performing business operation that should increment version
                aggregate.ChangeTestField("new value");

                // Then: Version should be incremented
                Assert.Equal(initialVersion + 1, aggregate.Version);
            }

            [Fact]
            public void Should_IncrementVersionMultipleTimes_When_MultipleOperationsPerformed()
            {
                // Given: An aggregate at initial version
                var id = new TestEntityId("test-aggregate");
                var aggregate = new TestAggregateRoot(id);
                var initialVersion = aggregate.Version;

                // When: Performing multiple business operations
                aggregate.ChangeTestField("value 1");
                aggregate.ChangeTestField("value 2");
                aggregate.ChangeTestField("value 3");

                // Then: Version should be incremented for each operation
                Assert.Equal(initialVersion + 3, aggregate.Version);
            }
        }

        public class IdentityAndEqualityTests
        {
            [Fact]
            public void Should_BeEqualById_When_SameIdProvided()
            {
                // Given: Two aggregates with same ID
                var sharedId = new TestEntityId("shared-id");
                var aggregate1 = new TestAggregateRoot(sharedId);
                var aggregate2 = new TestAggregateRoot(sharedId);

                // When: Comparing aggregates
                var areEqual = aggregate1.Equals(aggregate2);

                // Then: Should be equal based on ID
                Assert.True(areEqual);
            }

            [Fact]
            public void Should_NotBeEqual_When_DifferentIdProvided()
            {
                // Given: Two aggregates with different IDs
                var aggregate1 = new TestAggregateRoot(new TestEntityId("id-1"));
                var aggregate2 = new TestAggregateRoot(new TestEntityId("id-2"));

                // When: Comparing aggregates
                var areEqual = aggregate1.Equals(aggregate2);

                // Then: Should not be equal
                Assert.False(areEqual);
            }

            [Fact]
            public void Should_HaveConsistentHashCode_When_SameId()
            {
                // Given: Two aggregates with same ID
                var sharedId = new TestEntityId("hash-test-id");
                var aggregate1 = new TestAggregateRoot(sharedId);
                var aggregate2 = new TestAggregateRoot(sharedId);

                // When: Getting hash codes
                var hash1 = aggregate1.GetHashCode();
                var hash2 = aggregate2.GetHashCode();

                // Then: Hash codes should be equal
                Assert.Equal(hash1, hash2);
            }
        }
    }
}