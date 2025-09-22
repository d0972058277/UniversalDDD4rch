"""
Contract tests for AggregateRoot generic class.

These tests define the behavioral contract that all AggregateRoot implementations must satisfy.
Tests are written following TDD approach and MUST FAIL before implementation.

Test naming: test_should_expected_behavior_when_state_under_test
Test structure: Given-When-Then blocks with explicit comments
"""

import pytest
from typing import List
from dataclasses import dataclass
from datetime import datetime
from architecture_core.domain import AggregateRoot, DomainEvent


@dataclass(frozen=True)
class TestDomainEvent:
    """Test domain event for contract verification"""
    id: str
    occurred_at: datetime
    correlation_id: str | None = None
    causation_id: str | None = None


@dataclass(frozen=True)
class TestEntityId:
    """Test entity ID for contract verification"""
    value: str

    def __str__(self) -> str:
        return self.value

    def __eq__(self, other: object) -> bool:
        return isinstance(other, TestEntityId) and self.value == other.value

    def __hash__(self) -> int:
        return hash(self.value)


class TestAggregateRootContract:
    """Contract tests for AggregateRoot behavioral compliance"""

    def test_should_initialize_with_id_when_created(self):
        """
        Contract: AggregateRoot must initialize with required ID
        """
        # Given
        entity_id = TestEntityId("test-123")

        # When
        aggregate = self._create_test_aggregate(entity_id)

        # Then
        assert aggregate.id == entity_id

    def test_should_initialize_with_zero_version_when_created_without_version(self):
        """
        Contract: AggregateRoot must initialize with version 0 by default
        """
        # Given
        entity_id = TestEntityId("test-123")

        # When
        aggregate = self._create_test_aggregate(entity_id)

        # Then
        assert aggregate.version == 0

    def test_should_initialize_with_specified_version_when_created_with_version(self):
        """
        Contract: AggregateRoot must accept custom version during initialization
        """
        # Given
        entity_id = TestEntityId("test-123")
        initial_version = 5

        # When
        aggregate = self._create_test_aggregate(entity_id, initial_version)

        # Then
        assert aggregate.version == initial_version

    def test_should_have_empty_events_when_created(self):
        """
        Contract: AggregateRoot must start with empty domain events collection
        """
        # Given
        entity_id = TestEntityId("test-123")

        # When
        aggregate = self._create_test_aggregate(entity_id)

        # Then
        assert len(aggregate.domain_events) == 0

    def test_should_add_event_when_add_event_called(self):
        """
        Contract: AggregateRoot must add domain events to collection
        """
        # Given
        entity_id = TestEntityId("test-123")
        aggregate = self._create_test_aggregate(entity_id)
        test_event = TestDomainEvent("event-1", datetime.utcnow())

        # When
        aggregate.add_event(test_event)

        # Then
        assert len(aggregate.domain_events) == 1
        assert aggregate.domain_events[0] == test_event

    def test_should_maintain_event_order_when_multiple_events_added(self):
        """
        Contract: AggregateRoot must maintain chronological order of events
        """
        # Given
        entity_id = TestEntityId("test-123")
        aggregate = self._create_test_aggregate(entity_id)
        event1 = TestDomainEvent("event-1", datetime.utcnow())
        event2 = TestDomainEvent("event-2", datetime.utcnow())
        event3 = TestDomainEvent("event-3", datetime.utcnow())

        # When
        aggregate.add_event(event1)
        aggregate.add_event(event2)
        aggregate.add_event(event3)

        # Then
        events = aggregate.domain_events
        assert len(events) == 3
        assert events[0] == event1
        assert events[1] == event2
        assert events[2] == event3

    def test_should_return_readonly_events_when_domain_events_accessed(self):
        """
        Contract: AggregateRoot must return read-only view of domain events
        """
        # Given
        entity_id = TestEntityId("test-123")
        aggregate = self._create_test_aggregate(entity_id)
        test_event = TestDomainEvent("event-1", datetime.utcnow())
        aggregate.add_event(test_event)

        # When
        events = aggregate.domain_events

        # Then
        assert isinstance(events, list)
        # Attempting to modify should raise exception or not affect internal state
        original_length = len(events)
        try:
            events.append(TestDomainEvent("event-2", datetime.utcnow()))
        except:
            pass  # Expected if truly immutable
        # Internal state should remain unchanged
        assert len(aggregate.domain_events) == original_length

    def test_should_clear_events_when_clear_events_called(self):
        """
        Contract: AggregateRoot must clear all domain events
        """
        # Given
        entity_id = TestEntityId("test-123")
        aggregate = self._create_test_aggregate(entity_id)
        aggregate.add_event(TestDomainEvent("event-1", datetime.utcnow()))
        aggregate.add_event(TestDomainEvent("event-2", datetime.utcnow()))

        # When
        aggregate.clear_events()

        # Then
        assert len(aggregate.domain_events) == 0

    def test_should_increment_version_when_increment_version_called(self):
        """
        Contract: AggregateRoot must increment version for optimistic concurrency
        """
        # Given
        entity_id = TestEntityId("test-123")
        aggregate = self._create_test_aggregate(entity_id)
        initial_version = aggregate.version

        # When
        aggregate.increment_version()

        # Then
        assert aggregate.version == initial_version + 1

    def test_should_increment_version_multiple_times_when_called_repeatedly(self):
        """
        Contract: AggregateRoot must support multiple version increments
        """
        # Given
        entity_id = TestEntityId("test-123")
        aggregate = self._create_test_aggregate(entity_id)
        initial_version = aggregate.version

        # When
        aggregate.increment_version()
        aggregate.increment_version()
        aggregate.increment_version()

        # Then
        assert aggregate.version == initial_version + 3

    def test_should_maintain_id_immutability_when_accessed(self):
        """
        Contract: AggregateRoot ID must be immutable after creation
        """
        # Given
        entity_id = TestEntityId("test-123")
        aggregate = self._create_test_aggregate(entity_id)

        # When
        retrieved_id = aggregate.id

        # Then
        assert retrieved_id == entity_id
        assert retrieved_id is entity_id  # Should be same instance

    def test_should_reject_none_id_when_created(self):
        """
        Contract: AggregateRoot must reject None as ID
        """
        # Given
        none_id = None

        # When/Then
        with pytest.raises((ValueError, TypeError)):
            self._create_test_aggregate(none_id)

    def test_should_reject_none_event_when_adding(self):
        """
        Contract: AggregateRoot must reject None domain events
        """
        # Given
        entity_id = TestEntityId("test-123")
        aggregate = self._create_test_aggregate(entity_id)

        # When/Then
        with pytest.raises((ValueError, TypeError)):
            aggregate.add_event(None)

    def _create_test_aggregate(self, entity_id: TestEntityId, version: int = 0) -> AggregateRoot:
        """
        Helper method to create test AggregateRoot instance.
        This will fail until AggregateRoot is properly implemented.
        """
        # This import will fail until implementation exists
        from architecture_core.domain import AggregateRoot

        # This will fail until concrete implementation exists
        class TestAggregateRoot(AggregateRoot[TestEntityId]):
            def __init__(self, id: TestEntityId, version: int = 0):
                super().__init__(id, version)

        return TestAggregateRoot(entity_id, version)