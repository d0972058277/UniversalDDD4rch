"""
Unit tests for AggregateRoot event collection behavior.

Tests comprehensive event collection scenarios including thread safety,
event ordering, and proper encapsulation of domain events.

Test naming: test_should_expected_behavior_when_state_under_test
"""

import pytest
import threading
import time
import uuid
from datetime import datetime
from typing import Optional
from decimal import Decimal

# Import core types
from architecture_core.domain.aggregates import AggregateRoot
from architecture_core.domain.events import DomainEventBase
from architecture_core.domain.protocols import EntityId

# Import example domain for testing
from examples.order_domain.aggregates import Order, OrderStatus, OrderCreatedEvent, OrderLineAddedEvent, OrderConfirmedEvent
from examples.order_domain.identifiers import OrderId, CustomerId, ProductId
from examples.order_domain.value_objects import Money, Address, PersonName, Quantity


class MockEvent(DomainEventBase):
    """Mock domain event for testing."""

    def __init__(self, message: str, correlation_id: Optional[str] = None, causation_id: Optional[str] = None):
        super().__init__(correlation_id=correlation_id, causation_id=causation_id)
        object.__setattr__(self, 'message', message)


class MockAggregate(AggregateRoot[OrderId]):
    """Mock aggregate for testing event collection."""

    def __init__(self, id: OrderId):
        super().__init__(id)
        self._data = "initial"

    def perform_action(self, message: str) -> None:
        """Perform action that generates event."""
        self._data = message
        self.add_event(MockEvent(message))

    def perform_multiple_actions(self, messages: list[str]) -> None:
        """Perform multiple actions that generate events."""
        for message in messages:
            self.perform_action(message)

    @property
    def data(self) -> str:
        return self._data


class TestAggregateRootEventCollection:
    """Test event collection behavior in AggregateRoot."""

    def setup_method(self):
        """Set up test data."""
        self.aggregate_id = OrderId("AGG-123456")
        self.order_id = OrderId("ORDER-123456")
        self.customer_id = CustomerId("CUST-789")
        self.customer_name = PersonName("John", "Doe")
        self.address = Address(
            street="123 Main St",
            city="Anytown",
            state="ST",
            postal_code="12345",
            country="US"
        )
        self.product_id = ProductId("PROD-001")
        self.quantity = Quantity(2)
        self.unit_price = Money(Decimal("25.99"), "USD")

    def test_should_have_empty_events_when_aggregate_created_without_events(self):
        """Test that new aggregate without events has empty collection."""
        # Given
        aggregate = MockAggregate(self.aggregate_id)

        # When
        events = aggregate.domain_events

        # Then
        assert len(events) == 0
        assert events == []

    def test_should_have_creation_event_when_order_aggregate_created(self):
        """Test that Order aggregate has creation event when created."""
        # Given & When
        order = Order(
            order_id=self.order_id,
            customer_id=self.customer_id,
            customer_name=self.customer_name,
            billing_address=self.address
        )

        # Then
        events = order.domain_events
        assert len(events) == 1
        assert isinstance(events[0], OrderCreatedEvent)
        assert events[0].order_id == str(self.order_id)
        assert events[0].customer_id == str(self.customer_id)

    def test_should_add_event_when_event_added_to_aggregate(self):
        """Test that events are properly added to collection."""
        # Given
        aggregate = MockAggregate(self.aggregate_id)
        event = MockEvent("test message")

        # When
        aggregate.add_event(event)

        # Then
        events = aggregate.domain_events
        assert len(events) == 1
        assert events[0] == event
        assert events[0].message == "test message"

    def test_should_maintain_event_order_when_multiple_events_added(self):
        """Test that events are kept in the order they were added."""
        # Given
        aggregate = MockAggregate(self.aggregate_id)
        event1 = MockEvent("first event")
        event2 = MockEvent("second event")
        event3 = MockEvent("third event")

        # When
        aggregate.add_event(event1)
        aggregate.add_event(event2)
        aggregate.add_event(event3)

        # Then
        events = aggregate.domain_events
        assert len(events) == 3
        assert events[0].message == "first event"
        assert events[1].message == "second event"
        assert events[2].message == "third event"

    def test_should_accumulate_events_when_business_operations_performed(self):
        """Test that business operations accumulate events."""
        # Given
        order = Order(
            order_id=self.order_id,
            customer_id=self.customer_id,
            customer_name=self.customer_name,
            billing_address=self.address
        )

        # When
        order.add_order_line(self.product_id, self.quantity, self.unit_price)
        order.confirm()

        # Then
        events = order.domain_events
        assert len(events) == 3  # Creation + LineAdded + Confirmed
        assert isinstance(events[0], OrderCreatedEvent)
        assert isinstance(events[1], OrderLineAddedEvent)
        assert isinstance(events[2], OrderConfirmedEvent)

    def test_should_return_copy_when_events_accessed(self):
        """Test that accessing events returns a copy, not the original collection."""
        # Given
        aggregate = MockAggregate(self.aggregate_id)
        event = MockEvent("test event")
        aggregate.add_event(event)

        # When
        events1 = aggregate.domain_events
        events2 = aggregate.domain_events

        # Then
        assert events1 == events2  # Same content
        assert events1 is not events2  # Different instances
        assert events1 is not aggregate._domain_events  # Not the internal collection

    def test_should_not_allow_external_modification_of_events(self):
        """Test that external code cannot modify the event collection."""
        # Given
        aggregate = MockAggregate(self.aggregate_id)
        event1 = MockEvent("original event")
        aggregate.add_event(event1)

        # When
        events = aggregate.domain_events
        event2 = MockEvent("external event")
        events.append(event2)  # Try to modify the returned collection

        # Then
        # The internal collection should not be affected
        internal_events = aggregate.domain_events
        assert len(internal_events) == 1
        assert internal_events[0].message == "original event"

    def test_should_clear_all_events_when_clear_events_called(self):
        """Test that clear_events removes all events."""
        # Given
        aggregate = MockAggregate(self.aggregate_id)
        aggregate.add_event(MockEvent("event 1"))
        aggregate.add_event(MockEvent("event 2"))
        assert len(aggregate.domain_events) == 2

        # When
        aggregate.clear_events()

        # Then
        events = aggregate.domain_events
        assert len(events) == 0
        assert events == []

    def test_should_preserve_event_data_when_events_cleared_after_access(self):
        """Test that clearing events doesn't affect previously accessed copies."""
        # Given
        aggregate = MockAggregate(self.aggregate_id)
        event = MockEvent("persistent event")
        aggregate.add_event(event)

        # When
        events_copy = aggregate.domain_events  # Get copy before clearing
        aggregate.clear_events()

        # Then
        assert len(aggregate.domain_events) == 0  # Aggregate has no events
        assert len(events_copy) == 1  # But copy still has the event
        assert events_copy[0].message == "persistent event"

    def test_should_raise_error_when_none_event_added(self):
        """Test that adding None event raises ValueError."""
        # Given
        aggregate = MockAggregate(self.aggregate_id)

        # When & Then
        with pytest.raises(ValueError, match="Domain event cannot be None"):
            aggregate.add_event(None)

    def test_should_raise_error_when_invalid_event_added(self):
        """Test that adding invalid event raises TypeError."""
        # Given
        aggregate = MockAggregate(self.aggregate_id)
        invalid_event = "not an event object"

        # When & Then
        with pytest.raises(TypeError, match="Event must implement DomainEvent protocol"):
            aggregate.add_event(invalid_event)

    def test_should_handle_thread_safety_when_events_accessed_concurrently(self):
        """Test that event collection is thread-safe."""
        # Given
        aggregate = MockAggregate(self.aggregate_id)
        results = []
        errors = []

        def add_events_worker(worker_id: int):
            """Worker function that adds events."""
            try:
                for i in range(10):
                    event = MockEvent(f"worker-{worker_id}-event-{i}")
                    aggregate.add_event(event)
                    time.sleep(0.001)  # Small delay to increase chance of race conditions
            except Exception as e:
                errors.append(e)

        def read_events_worker():
            """Worker function that reads events."""
            try:
                for _ in range(20):
                    events = aggregate.domain_events
                    results.append(len(events))
                    time.sleep(0.001)
            except Exception as e:
                errors.append(e)

        # When
        threads = []
        # Start 3 writer threads
        for worker_id in range(3):
            thread = threading.Thread(target=add_events_worker, args=(worker_id,))
            threads.append(thread)
            thread.start()

        # Start 2 reader threads
        for _ in range(2):
            thread = threading.Thread(target=read_events_worker)
            threads.append(thread)
            thread.start()

        # Wait for all threads to complete
        for thread in threads:
            thread.join()

        # Then
        assert len(errors) == 0, f"Thread safety errors occurred: {errors}"
        final_events = aggregate.domain_events
        assert len(final_events) == 30  # 3 workers × 10 events each
        # Results should show increasing event counts
        assert len(results) > 0

    def test_should_handle_event_correlation_and_causation_ids(self):
        """Test that events properly handle correlation and causation IDs."""
        # Given
        aggregate = MockAggregate(self.aggregate_id)
        correlation_id = str(uuid.uuid4())
        causation_id = str(uuid.uuid4())

        # When
        event1 = MockEvent("first event", correlation_id=correlation_id)
        event2 = MockEvent("second event", correlation_id=correlation_id, causation_id=causation_id)
        aggregate.add_event(event1)
        aggregate.add_event(event2)

        # Then
        events = aggregate.domain_events
        assert events[0].correlation_id == correlation_id
        assert events[0].causation_id is None
        assert events[1].correlation_id == correlation_id
        assert events[1].causation_id == causation_id

    def test_should_preserve_event_timestamps_when_events_added(self):
        """Test that event timestamps are preserved."""
        # Given
        aggregate = MockAggregate(self.aggregate_id)
        start_time = datetime.utcnow()

        # When
        event1 = MockEvent("event 1")
        time.sleep(0.01)  # Small delay
        event2 = MockEvent("event 2")
        aggregate.add_event(event1)
        aggregate.add_event(event2)

        # Then
        events = aggregate.domain_events
        assert events[0].occurred_at >= start_time
        assert events[1].occurred_at >= events[0].occurred_at  # Second event should be later

    def test_should_maintain_version_independently_of_events(self):
        """Test that version management is independent of event collection."""
        # Given
        aggregate = MockAggregate(self.aggregate_id)
        initial_version = aggregate.version

        # When
        aggregate.add_event(MockEvent("event 1"))
        aggregate.add_event(MockEvent("event 2"))
        version_after_events = aggregate.version

        aggregate.increment_version()
        version_after_increment = aggregate.version

        # Then
        assert initial_version == 0
        assert version_after_events == 0  # Events don't change version
        assert version_after_increment == 1  # Only increment_version changes it

        # Events should still be there
        assert len(aggregate.domain_events) == 2

    def test_should_handle_large_number_of_events(self):
        """Test that aggregate can handle a large number of events efficiently."""
        # Given
        aggregate = MockAggregate(self.aggregate_id)
        event_count = 1000

        # When
        start_time = time.time()
        for i in range(event_count):
            event = MockEvent(f"event-{i}")
            aggregate.add_event(event)
        end_time = time.time()

        # Then
        events = aggregate.domain_events
        assert len(events) == event_count
        assert (end_time - start_time) < 1.0  # Should complete in under 1 second

        # Verify event order is maintained
        for i in range(min(10, event_count)):  # Check first 10 events
            assert events[i].message == f"event-{i}"

    def test_should_handle_duplicate_event_instances(self):
        """Test that same event instance can be added multiple times."""
        # Given
        aggregate = MockAggregate(self.aggregate_id)
        event = MockEvent("duplicate event")

        # When
        aggregate.add_event(event)
        aggregate.add_event(event)  # Add same instance again

        # Then
        events = aggregate.domain_events
        assert len(events) == 2
        assert events[0] is event
        assert events[1] is event  # Same instance

    def test_should_work_with_real_domain_events(self):
        """Test event collection with real domain events from Order aggregate."""
        # Given
        order = Order(
            order_id=self.order_id,
            customer_id=self.customer_id,
            customer_name=self.customer_name,
            billing_address=self.address
        )

        # When
        # Add multiple order lines
        product1 = ProductId("PROD-001")
        product2 = ProductId("PROD-002")
        order.add_order_line(product1, self.quantity, self.unit_price)
        order.add_order_line(product2, Quantity(1), Money(Decimal("15.50"), "USD"))

        # Confirm order
        order.confirm()

        # Then
        events = order.domain_events
        assert len(events) == 4  # Created + Line1 + Line2 + Confirmed

        # Verify event types and order
        assert isinstance(events[0], OrderCreatedEvent)
        assert isinstance(events[1], OrderLineAddedEvent)
        assert isinstance(events[2], OrderLineAddedEvent)
        assert isinstance(events[3], OrderConfirmedEvent)

        # Verify event data
        assert events[1].product_id == str(product1)
        assert events[2].product_id == str(product2)
        assert events[3].total_amount == str(order.total_amount.amount)

    def test_should_preserve_events_through_version_changes(self):
        """Test that events are preserved when aggregate version changes."""
        # Given
        aggregate = MockAggregate(self.aggregate_id)
        event1 = MockEvent("before version change")
        aggregate.add_event(event1)

        # When
        aggregate.increment_version()
        event2 = MockEvent("after version change")
        aggregate.add_event(event2)

        # Then
        events = aggregate.domain_events
        assert len(events) == 2
        assert events[0].message == "before version change"
        assert events[1].message == "after version change"
        assert aggregate.version == 1


if __name__ == "__main__":
    # Run tests when executed directly
    import sys

    # Create test instance and run all test methods
    test_instance = TestAggregateRootEventCollection()

    # Get all test methods
    test_methods = [method for method in dir(test_instance)
                   if method.startswith('test_should_')]

    print(f"Running {len(test_methods)} AggregateRoot event collection tests...")

    failed_tests = []

    for test_method_name in test_methods:
        try:
            test_instance.setup_method()  # Set up for each test
            test_method = getattr(test_instance, test_method_name)
            test_method()
            print(f"✅ {test_method_name}")
        except Exception as e:
            print(f"❌ {test_method_name}: {e}")
            failed_tests.append(test_method_name)

    if failed_tests:
        print(f"\n❌ {len(failed_tests)} tests failed:")
        for test_name in failed_tests:
            print(f"  - {test_name}")
        sys.exit(1)
    else:
        print(f"\n✅ All {len(test_methods)} AggregateRoot event collection tests passed!")
        sys.exit(0)