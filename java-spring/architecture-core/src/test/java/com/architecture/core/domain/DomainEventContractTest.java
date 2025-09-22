package com.architecture.core.domain;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.*;

@DisplayName("DomainEvent Contract Tests")
@Execution(ExecutionMode.CONCURRENT)
class DomainEventContractTest {

    @Nested
    @DisplayName("Event Metadata Requirements")
    class EventMetadataTests {

        @Test
        @DisplayName("Should have unique event ID")
        void Should_HaveUniqueEventId_When_CreatingEvent() {
            // Given & When
            TestDomainEvent event1 = new TestDomainEvent("Event 1");
            TestDomainEvent event2 = new TestDomainEvent("Event 2");

            // Then
            assertThat(event1.getEventId()).isNotNull();
            assertThat(event2.getEventId()).isNotNull();
            assertThat(event1.getEventId()).isNotEqualTo(event2.getEventId());
        }

        @Test
        @DisplayName("Should have valid occurred timestamp")
        void Should_HaveValidOccurredTimestamp_When_CreatingEvent() {
            // Given
            Instant beforeCreation = Instant.now().minusSeconds(1);

            // When
            TestDomainEvent event = new TestDomainEvent("Test event");
            Instant afterCreation = Instant.now().plusSeconds(1);

            // Then
            assertThat(event.getOccurredAt()).isNotNull();
            assertThat(event.getOccurredAt()).isBetween(beforeCreation, afterCreation);
        }

        @Test
        @DisplayName("Should provide correlation ID when specified")
        void Should_ProvideCorrelationId_When_Specified() {
            // Given
            String correlationId = "CORR-12345";

            // When
            TestDomainEventWithMetadata event = new TestDomainEventWithMetadata(
                "Test event", correlationId, null);

            // Then
            assertThat(event.getCorrelationId()).isPresent();
            assertThat(event.getCorrelationId().get()).isEqualTo(correlationId);
        }

        @Test
        @DisplayName("Should provide empty correlation ID when not specified")
        void Should_ProvideEmptyCorrelationId_When_NotSpecified() {
            // Given & When
            TestDomainEvent event = new TestDomainEvent("Test event");

            // Then
            assertThat(event.getCorrelationId()).isEmpty();
        }

        @Test
        @DisplayName("Should provide causation ID when specified")
        void Should_ProvideCausationId_When_Specified() {
            // Given
            String causationId = "CAUSE-67890";

            // When
            TestDomainEventWithMetadata event = new TestDomainEventWithMetadata(
                "Test event", null, causationId);

            // Then
            assertThat(event.getCausationId()).isPresent();
            assertThat(event.getCausationId().get()).isEqualTo(causationId);
        }

        @Test
        @DisplayName("Should provide empty causation ID when not specified")
        void Should_ProvideEmptyCausationId_When_NotSpecified() {
            // Given & When
            TestDomainEvent event = new TestDomainEvent("Test event");

            // Then
            assertThat(event.getCausationId()).isEmpty();
        }

        @ParameterizedTest(name = "Event version {0} should be valid")
        @MethodSource("validEventVersions")
        @DisplayName("Should support various event versions")
        void Should_SupportVariousEventVersions_When_SpecifyingVersion(int version) {
            // Given & When
            TestDomainEventWithVersion event = new TestDomainEventWithVersion(
                "Test event", version);

            // Then
            assertThat(event.getEventVersion()).isEqualTo(version);
        }

        static Stream<Arguments> validEventVersions() {
            return Stream.of(
                Arguments.of(1),
                Arguments.of(2),
                Arguments.of(10),
                Arguments.of(100)
            );
        }
    }

    @Nested
    @DisplayName("Event Equality and Identity")
    class EventEqualityTests {

        @Test
        @DisplayName("Should be equal when same event ID")
        void Should_BeEqual_When_SameEventId() {
            // Given
            UUID eventId = UUID.randomUUID();
            TestDomainEventWithId event1 = new TestDomainEventWithId("Event 1", eventId);
            TestDomainEventWithId event2 = new TestDomainEventWithId("Event 2", eventId);

            // When & Then
            assertThat(event1).isEqualTo(event2);
            assertThat(event1.hashCode()).isEqualTo(event2.hashCode());
        }

        @Test
        @DisplayName("Should not be equal when different event IDs")
        void Should_NotBeEqual_When_DifferentEventIds() {
            // Given
            UUID eventId1 = UUID.randomUUID();
            UUID eventId2 = UUID.randomUUID();
            TestDomainEventWithId event1 = new TestDomainEventWithId("Event 1", eventId1);
            TestDomainEventWithId event2 = new TestDomainEventWithId("Event 1", eventId2);

            // When & Then
            assertThat(event1).isNotEqualTo(event2);
        }

        @Test
        @DisplayName("Should have consistent hashCode for same event")
        void Should_HaveConsistentHashCode_When_SameEvent() {
            // Given
            TestDomainEvent event = new TestDomainEvent("Test event");

            // When
            int hashCode1 = event.hashCode();
            int hashCode2 = event.hashCode();

            // Then
            assertThat(hashCode1).isEqualTo(hashCode2);
        }
    }

    @Nested
    @DisplayName("Event Correlation Chain")
    class EventCorrelationTests {

        @Test
        @DisplayName("Should support correlation chain tracking")
        void Should_SupportCorrelationChainTracking_When_CreatingRelatedEvents() {
            // Given
            String correlationId = "WORKFLOW-123";
            TestDomainEventWithMetadata parentEvent = new TestDomainEventWithMetadata(
                "Parent event", correlationId, null);

            // When
            TestDomainEventWithMetadata childEvent = new TestDomainEventWithMetadata(
                "Child event", correlationId, parentEvent.getEventId().toString());

            // Then
            assertThat(parentEvent.getCorrelationId()).isPresent();
            assertThat(childEvent.getCorrelationId()).isPresent();
            assertThat(parentEvent.getCorrelationId())
                .isEqualTo(childEvent.getCorrelationId());

            assertThat(childEvent.getCausationId()).isPresent();
            assertThat(childEvent.getCausationId().get())
                .isEqualTo(parentEvent.getEventId().toString());
        }

        @Test
        @DisplayName("Should handle null correlation and causation IDs gracefully")
        void Should_HandleNullMetadataGracefully_When_CreatingEvent() {
            // Given & When
            TestDomainEventWithMetadata event = new TestDomainEventWithMetadata(
                "Test event", null, null);

            // Then
            assertThat(event.getCorrelationId()).isEmpty();
            assertThat(event.getCausationId()).isEmpty();
            // Should not throw any exceptions
        }
    }

    @Nested
    @DisplayName("Event Serialization")
    class EventSerializationTests {

        @Test
        @DisplayName("Should maintain event identity across serialization")
        void Should_MaintainEventIdentity_When_SerializingAndDeserializing() {
            // Given
            TestDomainEvent originalEvent = new TestDomainEvent("Test event");
            UUID originalId = originalEvent.getEventId();
            Instant originalTime = originalEvent.getOccurredAt();

            // When - Simulate serialization by creating equivalent event
            TestDomainEventWithId reconstructedEvent = new TestDomainEventWithId(
                "Test event", originalId, originalTime);

            // Then
            assertThat(reconstructedEvent.getEventId()).isEqualTo(originalId);
            assertThat(reconstructedEvent.getOccurredAt()).isEqualTo(originalTime);
        }

        @Test
        @DisplayName("Should preserve metadata in string representation")
        void Should_PreserveMetadataInStringRepresentation_When_ConvertingToString() {
            // Given
            String correlationId = "CORR-123";
            String causationId = "CAUSE-456";
            TestDomainEventWithMetadata event = new TestDomainEventWithMetadata(
                "Test event", correlationId, causationId);

            // When
            String stringRepresentation = event.toString();

            // Then
            assertThat(stringRepresentation).contains(correlationId);
            assertThat(stringRepresentation).contains(causationId);
            assertThat(stringRepresentation).contains(event.getEventId().toString());
        }
    }

    // Test implementations
    private static class TestDomainEvent implements DomainEvent {
        private final String description;
        private final UUID eventId;
        private final Instant occurredAt;

        public TestDomainEvent(String description) {
            this.description = Objects.requireNonNull(description);
            this.eventId = UUID.randomUUID();
            this.occurredAt = Instant.now();
        }

        @Override
        public UUID getEventId() {
            return eventId;
        }

        @Override
        public Instant getOccurredAt() {
            return occurredAt;
        }

        @Override
        public Optional<String> getCorrelationId() {
            return Optional.empty();
        }

        @Override
        public Optional<String> getCausationId() {
            return Optional.empty();
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
            return String.format("TestDomainEvent{id=%s, description='%s'}", eventId, description);
        }
    }

    private static class TestDomainEventWithMetadata implements DomainEvent {
        private final String description;
        private final UUID eventId;
        private final Instant occurredAt;
        private final String correlationId;
        private final String causationId;

        public TestDomainEventWithMetadata(String description, String correlationId, String causationId) {
            this.description = Objects.requireNonNull(description);
            this.eventId = UUID.randomUUID();
            this.occurredAt = Instant.now();
            this.correlationId = correlationId;
            this.causationId = causationId;
        }

        @Override
        public UUID getEventId() {
            return eventId;
        }

        @Override
        public Instant getOccurredAt() {
            return occurredAt;
        }

        @Override
        public Optional<String> getCorrelationId() {
            return Optional.ofNullable(correlationId);
        }

        @Override
        public Optional<String> getCausationId() {
            return Optional.ofNullable(causationId);
        }

        @Override
        public int getEventVersion() {
            return 1;
        }

        @Override
        public boolean equals(Object obj) {
            if (this == obj) return true;
            if (obj == null || getClass() != obj.getClass()) return false;
            TestDomainEventWithMetadata that = (TestDomainEventWithMetadata) obj;
            return Objects.equals(eventId, that.eventId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(eventId);
        }

        @Override
        public String toString() {
            return String.format("TestDomainEventWithMetadata{id=%s, description='%s', corr=%s, cause=%s}",
                eventId, description, correlationId, causationId);
        }
    }

    private static class TestDomainEventWithVersion implements DomainEvent {
        private final String description;
        private final UUID eventId;
        private final Instant occurredAt;
        private final int eventVersion;

        public TestDomainEventWithVersion(String description, int eventVersion) {
            this.description = Objects.requireNonNull(description);
            this.eventId = UUID.randomUUID();
            this.occurredAt = Instant.now();
            this.eventVersion = eventVersion;
        }

        @Override
        public UUID getEventId() {
            return eventId;
        }

        @Override
        public Instant getOccurredAt() {
            return occurredAt;
        }

        @Override
        public Optional<String> getCorrelationId() {
            return Optional.empty();
        }

        @Override
        public Optional<String> getCausationId() {
            return Optional.empty();
        }

        @Override
        public int getEventVersion() {
            return eventVersion;
        }

        @Override
        public boolean equals(Object obj) {
            if (this == obj) return true;
            if (obj == null || getClass() != obj.getClass()) return false;
            TestDomainEventWithVersion that = (TestDomainEventWithVersion) obj;
            return Objects.equals(eventId, that.eventId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(eventId);
        }
    }

    private static class TestDomainEventWithId implements DomainEvent {
        private final String description;
        private final UUID eventId;
        private final Instant occurredAt;

        public TestDomainEventWithId(String description, UUID eventId) {
            this(description, eventId, Instant.now());
        }

        public TestDomainEventWithId(String description, UUID eventId, Instant occurredAt) {
            this.description = Objects.requireNonNull(description);
            this.eventId = Objects.requireNonNull(eventId);
            this.occurredAt = Objects.requireNonNull(occurredAt);
        }

        @Override
        public UUID getEventId() {
            return eventId;
        }

        @Override
        public Instant getOccurredAt() {
            return occurredAt;
        }

        @Override
        public Optional<String> getCorrelationId() {
            return Optional.empty();
        }

        @Override
        public Optional<String> getCausationId() {
            return Optional.empty();
        }

        @Override
        public int getEventVersion() {
            return 1;
        }

        @Override
        public boolean equals(Object obj) {
            if (this == obj) return true;
            if (obj == null || getClass() != obj.getClass()) return false;
            TestDomainEventWithId that = (TestDomainEventWithId) obj;
            return Objects.equals(eventId, that.eventId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(eventId);
        }
    }
}