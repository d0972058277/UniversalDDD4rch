"""
Contract tests for DomainEvent protocol and base class.

These tests define the behavioral contract that all DomainEvent implementations must satisfy.
Tests are written following TDD approach and MUST FAIL before implementation.

Test naming: test_should_expected_behavior_when_state_under_test
Test structure: Given-When-Then blocks with explicit comments
"""

import pytest
from datetime import datetime, timezone
from typing import Optional
from architecture_core.domain import DomainEvent, DomainEventBase


class TestDomainEventContract:
    """Contract tests for DomainEvent protocol compliance"""

    def test_should_have_id_when_created(self):
        """
        Contract: DomainEvent must have unique identifier
        """
        # Given
        domain_event = self._create_test_domain_event()

        # When
        event_id = domain_event.id

        # Then
        assert event_id is not None
        assert isinstance(event_id, str)
        assert len(event_id) > 0

    def test_should_have_occurred_at_when_created(self):
        """
        Contract: DomainEvent must have occurrence timestamp
        """
        # Given
        domain_event = self._create_test_domain_event()

        # When
        occurred_at = domain_event.occurred_at

        # Then
        assert occurred_at is not None
        assert isinstance(occurred_at, datetime)

    def test_should_have_correlation_id_property_when_created(self):
        """
        Contract: DomainEvent must support correlation ID for event tracking
        """
        # Given
        domain_event = self._create_test_domain_event()

        # When
        correlation_id = domain_event.correlation_id

        # Then
        assert correlation_id is None or isinstance(correlation_id, str)

    def test_should_have_causation_id_property_when_created(self):
        """
        Contract: DomainEvent must support causation ID for event tracking
        """
        # Given
        domain_event = self._create_test_domain_event()

        # When
        causation_id = domain_event.causation_id

        # Then
        assert causation_id is None or isinstance(causation_id, str)

    def test_should_preserve_correlation_id_when_provided(self):
        """
        Contract: DomainEvent must preserve provided correlation ID
        """
        # Given
        correlation_id = "correlation-123"
        domain_event = self._create_test_domain_event_with_correlation(correlation_id)

        # When
        result_correlation_id = domain_event.correlation_id

        # Then
        assert result_correlation_id == correlation_id

    def test_should_preserve_causation_id_when_provided(self):
        """
        Contract: DomainEvent must preserve provided causation ID
        """
        # Given
        causation_id = "causation-456"
        domain_event = self._create_test_domain_event_with_causation(causation_id)

        # When
        result_causation_id = domain_event.causation_id

        # Then
        assert result_causation_id == causation_id

    def test_should_generate_unique_ids_when_multiple_events_created(self):
        """
        Contract: DomainEvent must generate unique IDs for different instances
        """
        # Given
        domain_event1 = self._create_test_domain_event()
        domain_event2 = self._create_test_domain_event()

        # When
        id1 = domain_event1.id
        id2 = domain_event2.id

        # Then
        assert id1 != id2

    def test_should_have_recent_occurred_at_when_created_without_timestamp(self):
        """
        Contract: DomainEvent must use current time when no timestamp provided
        """
        # Given
        before_creation = datetime.now(timezone.utc)

        # When
        domain_event = self._create_test_domain_event()
        after_creation = datetime.now(timezone.utc)

        # Then
        occurred_at = domain_event.occurred_at
        assert before_creation <= occurred_at <= after_creation

    def test_should_preserve_timestamp_when_provided(self):
        """
        Contract: DomainEvent must preserve provided timestamp
        """
        # Given
        custom_timestamp = datetime(2023, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        domain_event = self._create_test_domain_event_with_timestamp(custom_timestamp)

        # When
        occurred_at = domain_event.occurred_at

        # Then
        assert occurred_at == custom_timestamp

    def _create_test_domain_event(self) -> DomainEvent:
        """
        Helper method to create test DomainEvent instance.
        This will fail until DomainEvent is properly implemented.
        """
        # This import will fail until implementation exists
        from architecture_core.domain import DomainEventBase

        # This will fail until concrete implementation exists
        class TestDomainEvent(DomainEventBase):
            def __init__(self):
                super().__init__()

        return TestDomainEvent()

    def _create_test_domain_event_with_correlation(self, correlation_id: str) -> DomainEvent:
        """Helper to create DomainEvent with correlation ID"""
        from architecture_core.domain import DomainEventBase

        class TestDomainEventWithCorrelation(DomainEventBase):
            def __init__(self, correlation_id: str):
                super().__init__(correlation_id=correlation_id)

        return TestDomainEventWithCorrelation(correlation_id)

    def _create_test_domain_event_with_causation(self, causation_id: str) -> DomainEvent:
        """Helper to create DomainEvent with causation ID"""
        from architecture_core.domain import DomainEventBase

        class TestDomainEventWithCausation(DomainEventBase):
            def __init__(self, causation_id: str):
                super().__init__(causation_id=causation_id)

        return TestDomainEventWithCausation(causation_id)

    def _create_test_domain_event_with_timestamp(self, timestamp: datetime) -> DomainEvent:
        """Helper to create DomainEvent with specific timestamp"""
        from architecture_core.domain import DomainEventBase

        class TestDomainEventWithTimestamp(DomainEventBase):
            def __init__(self, timestamp: datetime):
                super().__init__(occurred_at=timestamp)

        return TestDomainEventWithTimestamp(timestamp)


class TestDomainEventBaseContract:
    """Contract tests for DomainEventBase implementation"""

    def test_should_generate_uuid_id_when_created(self):
        """
        Contract: DomainEventBase must generate UUID-based ID
        """
        # Given
        domain_event = self._create_domain_event_base()

        # When
        event_id = domain_event.id

        # Then
        assert event_id is not None
        assert isinstance(event_id, str)
        # UUID format validation (basic check)
        assert len(event_id) >= 32  # Minimum UUID length without hyphens

    def test_should_be_immutable_when_created(self):
        """
        Contract: DomainEventBase must be immutable after creation
        """
        # Given
        domain_event = self._create_domain_event_base()
        original_id = domain_event.id
        original_timestamp = domain_event.occurred_at

        # When/Then
        # Attempting to modify should fail or have no effect
        try:
            domain_event.id = "new-id"
            # If assignment succeeded, verify it had no effect
            assert domain_event.id == original_id
        except (AttributeError, TypeError):
            # Expected for frozen dataclass
            pass

        try:
            domain_event.occurred_at = datetime.now(timezone.utc)
            # If assignment succeeded, verify it had no effect
            assert domain_event.occurred_at == original_timestamp
        except (AttributeError, TypeError):
            # Expected for frozen dataclass
            pass

    def test_should_support_equality_when_same_properties(self):
        """
        Contract: DomainEventBase instances with same properties must be equal
        """
        # Given
        event_id = "test-id-123"
        timestamp = datetime(2023, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        correlation_id = "correlation-123"
        causation_id = "causation-456"

        event1 = self._create_domain_event_base_with_data(
            event_id, timestamp, correlation_id, causation_id
        )
        event2 = self._create_domain_event_base_with_data(
            event_id, timestamp, correlation_id, causation_id
        )

        # When
        result = event1 == event2

        # Then
        assert result is True

    def test_should_not_be_equal_when_different_properties(self):
        """
        Contract: DomainEventBase instances with different properties must not be equal
        """
        # Given
        timestamp = datetime(2023, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

        event1 = self._create_domain_event_base_with_data(
            "id-1", timestamp, "correlation-1", "causation-1"
        )
        event2 = self._create_domain_event_base_with_data(
            "id-2", timestamp, "correlation-1", "causation-1"
        )

        # When
        result = event1 == event2

        # Then
        assert result is False

    def test_should_be_hashable_when_used_in_collections(self):
        """
        Contract: DomainEventBase must be hashable for use in sets
        """
        # Given
        event1 = self._create_domain_event_base()
        event2 = self._create_domain_event_base()

        # When
        hash1 = hash(event1)
        hash2 = hash(event2)
        event_set = {event1, event2}

        # Then
        assert isinstance(hash1, int)
        assert isinstance(hash2, int)
        assert len(event_set) == 2

    def _create_domain_event_base(self) -> DomainEventBase:
        """
        Helper method to create DomainEventBase instance.
        This will fail until DomainEventBase is properly implemented.
        """
        # This import will fail until implementation exists
        from architecture_core.domain import DomainEventBase
        return DomainEventBase()

    def _create_domain_event_base_with_data(
        self,
        event_id: str,
        timestamp: datetime,
        correlation_id: Optional[str],
        causation_id: Optional[str]
    ) -> DomainEventBase:
        """Helper to create DomainEventBase with specific data"""
        from architecture_core.domain import DomainEventBase
        return DomainEventBase(
            id=event_id,
            occurred_at=timestamp,
            correlation_id=correlation_id,
            causation_id=causation_id
        )