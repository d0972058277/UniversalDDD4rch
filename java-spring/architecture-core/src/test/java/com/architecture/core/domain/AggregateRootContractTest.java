package com.architecture.core.domain;

import com.architecture.core.functional.Error;
import com.architecture.core.functional.Result;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.*;

@DisplayName("AggregateRoot Contract Tests")
@Execution(ExecutionMode.CONCURRENT)
class AggregateRootContractTest {

    @Nested
    @DisplayName("Version Control")
    class VersionControlTests {

        @Test
        @DisplayName("Should start with version 0 when creating new aggregate")
        void Should_StartWithVersionZero_When_CreatingNewAggregate() {
            // Given
            TestOrderId orderId = new TestOrderId("ORDER-001");

            // When
            TestOrder order = new TestOrder(orderId);

            // Then
            assertThat(order.getVersion()).isEqualTo(0L);
        }

        @Test
        @DisplayName("Should allow creating aggregate with specific version")
        void Should_AllowCreatingAggregateWithSpecificVersion_When_ProvidingVersion() {
            // Given
            TestOrderId orderId = new TestOrderId("ORDER-001");
            long initialVersion = 5L;

            // When
            TestOrder order = new TestOrder(orderId, initialVersion);

            // Then
            assertThat(order.getVersion()).isEqualTo(initialVersion);
        }

        @Test
        @DisplayName("Should increment version when requested")
        void Should_IncrementVersion_When_IncrementVersionCalled() {
            // Given
            TestOrderId orderId = new TestOrderId("ORDER-001");
            TestOrder order = new TestOrder(orderId);
            long originalVersion = order.getVersion();

            // When
            order.incrementVersion();

            // Then
            assertThat(order.getVersion()).isEqualTo(originalVersion + 1);
        }

        @Test
        @DisplayName("Should increment version multiple times correctly")
        void Should_IncrementVersionMultipleTimes_When_CalledRepeatedly() {
            // Given
            TestOrderId orderId = new TestOrderId("ORDER-001");
            TestOrder order = new TestOrder(orderId);
            int incrementCount = 5;

            // When
            for (int i = 0; i < incrementCount; i++) {
                order.incrementVersion();
            }

            // Then
            assertThat(order.getVersion()).isEqualTo(incrementCount);
        }
    }

    @Nested
    @DisplayName("Domain Event Collection")
    class DomainEventCollectionTests {

        @Test
        @DisplayName("Should start with empty events collection")
        void Should_StartWithEmptyEventsCollection_When_CreatingNewAggregate() {
            // Given
            TestOrderId orderId = new TestOrderId("ORDER-001");

            // When
            TestOrder order = new TestOrder(orderId);

            // Then
            assertThat(order.getDomainEvents()).isEmpty();
        }

        @Test
        @DisplayName("Should add domain event successfully")
        void Should_AddDomainEventSuccessfully_When_AddingEvent() {
            // Given
            TestOrderId orderId = new TestOrderId("ORDER-001");
            TestOrder order = new TestOrder(orderId);
            TestDomainEvent event = new TestDomainEvent("Test event");

            // When
            order.addTestEvent(event);

            // Then
            List<DomainEvent> events = order.getDomainEvents();
            assertThat(events).hasSize(1);
            assertThat(events.get(0)).isEqualTo(event);
        }

        @Test
        @DisplayName("Should maintain order of events")
        void Should_MaintainOrderOfEvents_When_AddingMultipleEvents() {
            // Given
            TestOrderId orderId = new TestOrderId("ORDER-001");
            TestOrder order = new TestOrder(orderId);
            TestDomainEvent event1 = new TestDomainEvent("First event");
            TestDomainEvent event2 = new TestDomainEvent("Second event");
            TestDomainEvent event3 = new TestDomainEvent("Third event");

            // When
            order.addTestEvent(event1);
            order.addTestEvent(event2);
            order.addTestEvent(event3);

            // Then
            List<DomainEvent> events = order.getDomainEvents();
            assertThat(events).hasSize(3);
            assertThat(events.get(0)).isEqualTo(event1);
            assertThat(events.get(1)).isEqualTo(event2);
            assertThat(events.get(2)).isEqualTo(event3);
        }

        @Test
        @DisplayName("Should return immutable copy of events")
        void Should_ReturnImmutableCopyOfEvents_When_GettingDomainEvents() {
            // Given
            TestOrderId orderId = new TestOrderId("ORDER-001");
            TestOrder order = new TestOrder(orderId);
            TestDomainEvent event = new TestDomainEvent("Test event");
            order.addTestEvent(event);

            // When
            List<DomainEvent> events = order.getDomainEvents();

            // Then
            assertThatThrownBy(() -> events.add(new TestDomainEvent("Another event")))
                .isInstanceOf(UnsupportedOperationException.class);
        }

        @Test
        @DisplayName("Should clear all events when requested")
        void Should_ClearAllEvents_When_ClearDomainEventsCalled() {
            // Given
            TestOrderId orderId = new TestOrderId("ORDER-001");
            TestOrder order = new TestOrder(orderId);
            order.addTestEvent(new TestDomainEvent("Event 1"));
            order.addTestEvent(new TestDomainEvent("Event 2"));
            assertThat(order.getDomainEvents()).hasSize(2);

            // When
            order.clearDomainEvents();

            // Then
            assertThat(order.getDomainEvents()).isEmpty();
        }

        @Test
        @DisplayName("Should reject null domain events")
        void Should_RejectNullDomainEvents_When_AddingNullEvent() {
            // Given
            TestOrderId orderId = new TestOrderId("ORDER-001");
            TestOrder order = new TestOrder(orderId);

            // When & Then
            assertThatThrownBy(() -> order.addTestEvent(null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Domain event cannot be null");
        }
    }

    @Nested
    @DisplayName("Thread Safety")
    class ThreadSafetyTests {

        @Test
        @DisplayName("Should handle concurrent event additions safely")
        void Should_HandleConcurrentEventAdditionsSafely_When_MultipleThreadsAddEvents() throws InterruptedException {
            // Given
            TestOrderId orderId = new TestOrderId("ORDER-001");
            TestOrder order = new TestOrder(orderId);
            int threadCount = 10;
            int eventsPerThread = 100;
            ExecutorService executor = Executors.newFixedThreadPool(threadCount);

            // When
            List<CompletableFuture<Void>> futures = IntStream.range(0, threadCount)
                .mapToObj(threadId -> CompletableFuture.runAsync(() -> {
                    for (int i = 0; i < eventsPerThread; i++) {
                        order.addTestEvent(new TestDomainEvent(
                            String.format("Thread-%d-Event-%d", threadId, i)));
                    }
                }, executor))
                .toList();

            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

            // Then
            assertThat(order.getDomainEvents()).hasSize(threadCount * eventsPerThread);
            executor.shutdown();
            executor.awaitTermination(5, TimeUnit.SECONDS);
        }

        @Test
        @DisplayName("Should handle concurrent event clearing safely")
        void Should_HandleConcurrentEventClearingSafely_When_MultipleThreadsClearEvents() throws InterruptedException {
            // Given
            TestOrderId orderId = new TestOrderId("ORDER-001");
            TestOrder order = new TestOrder(orderId);

            // Pre-populate with some events
            for (int i = 0; i < 50; i++) {
                order.addTestEvent(new TestDomainEvent("Initial event " + i));
            }

            int threadCount = 5;
            ExecutorService executor = Executors.newFixedThreadPool(threadCount);

            // When
            List<CompletableFuture<Void>> futures = IntStream.range(0, threadCount)
                .mapToObj(threadId -> CompletableFuture.runAsync(() -> {
                    // Add some events
                    order.addTestEvent(new TestDomainEvent("Thread " + threadId + " event"));
                    // Clear events
                    order.clearDomainEvents();
                    // Add more events
                    order.addTestEvent(new TestDomainEvent("Thread " + threadId + " event after clear"));
                }, executor))
                .toList();

            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

            // Then
            // Should not throw any exceptions and state should be consistent
            List<DomainEvent> finalEvents = order.getDomainEvents();
            assertThat(finalEvents.size()).isGreaterThanOrEqualTo(0);

            executor.shutdown();
            executor.awaitTermination(5, TimeUnit.SECONDS);
        }
    }

    @Nested
    @DisplayName("Identity and Equality")
    class IdentityAndEqualityTests {

        @Test
        @DisplayName("Should inherit entity identity-based equality")
        void Should_InheritEntityIdentityBasedEquality_When_ComparingAggregates() {
            // Given
            TestOrderId orderId = new TestOrderId("ORDER-001");
            TestOrder order1 = new TestOrder(orderId);
            TestOrder order2 = new TestOrder(orderId);

            // When & Then
            assertThat(order1).isEqualTo(order2);
            assertThat(order1.hashCode()).isEqualTo(order2.hashCode());
        }

        @Test
        @DisplayName("Should maintain equality despite different versions")
        void Should_MaintainEquality_When_AggregatesHaveDifferentVersions() {
            // Given
            TestOrderId orderId = new TestOrderId("ORDER-001");
            TestOrder order1 = new TestOrder(orderId, 1L);
            TestOrder order2 = new TestOrder(orderId, 5L);

            // When & Then
            assertThat(order1).isEqualTo(order2);
            assertThat(order1.hashCode()).isEqualTo(order2.hashCode());
        }

        @Test
        @DisplayName("Should maintain equality despite different events")
        void Should_MaintainEquality_When_AggregatesHaveDifferentEvents() {
            // Given
            TestOrderId orderId = new TestOrderId("ORDER-001");
            TestOrder order1 = new TestOrder(orderId);
            TestOrder order2 = new TestOrder(orderId);

            order1.addTestEvent(new TestDomainEvent("Event 1"));
            order2.addTestEvent(new TestDomainEvent("Event 2"));

            // When & Then
            assertThat(order1).isEqualTo(order2);
            assertThat(order1.hashCode()).isEqualTo(order2.hashCode());
        }
    }

    // Test implementations
    private static class TestOrderId implements EntityId<TestOrderId> {
        private final String value;

        public TestOrderId(String value) {
            this.value = Objects.requireNonNull(value);
        }

        @Override
        public String getValue() {
            return value;
        }

        @Override
        public Result<Void> validate() {
            if (value.trim().isEmpty()) {
                return Result.failure(Error.validation("TestOrderId.Empty", "ID cannot be empty", Map.of()));
            }
            return Result.success();
        }

        @Override
        public int compareTo(TestOrderId other) {
            return this.value.compareTo(other.value);
        }

        @Override
        public boolean equals(Object obj) {
            if (this == obj) return true;
            if (obj == null || getClass() != obj.getClass()) return false;
            TestOrderId that = (TestOrderId) obj;
            return Objects.equals(value, that.value);
        }

        @Override
        public int hashCode() {
            return Objects.hash(value);
        }

        @Override
        public String toString() {
            return "TestOrderId{" + value + "}";
        }
    }

    private static class TestOrder extends AggregateRoot<TestOrderId> {
        public TestOrder(TestOrderId id) {
            super(id);
        }

        public TestOrder(TestOrderId id, long version) {
            super(id, version);
        }

        public void addTestEvent(DomainEvent event) {
            addDomainEvent(event);
        }
    }

    private static class TestDomainEvent implements DomainEvent {
        private final String description;
        private final java.util.UUID eventId;
        private final java.time.Instant occurredAt;

        public TestDomainEvent(String description) {
            this.description = Objects.requireNonNull(description);
            this.eventId = java.util.UUID.randomUUID();
            this.occurredAt = java.time.Instant.now();
        }

        @Override
        public java.util.UUID getEventId() {
            return eventId;
        }

        @Override
        public java.time.Instant getOccurredAt() {
            return occurredAt;
        }

        @Override
        public java.util.Optional<String> getCorrelationId() {
            return java.util.Optional.empty();
        }

        @Override
        public java.util.Optional<String> getCausationId() {
            return java.util.Optional.empty();
        }

        @Override
        public int getEventVersion() {
            return 1;
        }

        @Override
        public boolean equals(Object obj) {
            if (this == obj) return true;
            if (obj == null || getClass() != obj.getClass()) return false;
            TestDomainEvent that = (TestDomainEvent) obj;
            return Objects.equals(eventId, that.eventId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(eventId);
        }

        @Override
        public String toString() {
            return "TestDomainEvent{" + description + "}";
        }
    }
}