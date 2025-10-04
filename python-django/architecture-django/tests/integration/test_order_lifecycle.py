"""
Integration tests for Order aggregate lifecycle.

These tests verify complete Order aggregate operations including
event generation, state transitions, and business rule enforcement.
"""

import pytest
from datetime import datetime
from dataclasses import dataclass
from typing import Iterator, Any

from architecture_core.domain.aggregates import AggregateRoot
from architecture_core.domain.entities import Entity
from architecture_core.domain.value_objects import ValueObject
from architecture_core.domain.events import DomainEventBase
from architecture_core.functional.result import Result
from architecture_core.functional.error import Error


# Test domain objects for Order lifecycle
@dataclass(frozen=True)
class OrderId:
    """Test Order identifier"""
    value: str

    def __str__(self) -> str:
        return self.value

    def __eq__(self, other: object) -> bool:
        return isinstance(other, OrderId) and self.value == other.value

    def __hash__(self) -> int:
        return hash(self.value)


@dataclass(frozen=True)
class CustomerId:
    """Test Customer identifier"""
    value: str

    def __str__(self) -> str:
        return self.value

    def __eq__(self, other: object) -> bool:
        return isinstance(other, CustomerId) and self.value == other.value

    def __hash__(self) -> int:
        return hash(self.value)


@dataclass(frozen=True)
class Money(ValueObject):
    """Test Money value object"""
    amount: float
    currency: str

    def __post_init__(self):
        if self.amount < 0:
            raise ValueError("Amount cannot be negative")

    def get_equality_components(self) -> Iterator[Any]:
        yield self.amount
        yield self.currency

    def add(self, other: 'Money') -> 'Money':
        if self.currency != other.currency:
            raise ValueError("Cannot add money with different currencies")
        return Money(self.amount + other.amount, self.currency)


class OrderCreated:
    """Event raised when order is created"""
    def __init__(self, order_id: str, customer_id: str, total: Money):
        self.id = self._generate_event_id()
        self.occurred_at = datetime.utcnow()
        self.order_id = order_id
        self.customer_id = customer_id
        self.total = total
        self.correlation_id = None
        self.causation_id = None

    def _generate_event_id(self) -> str:
        import uuid
        return str(uuid.uuid4())


class OrderConfirmed:
    """Event raised when order is confirmed"""
    def __init__(self, order_id: str, confirmation_time: datetime):
        self.id = self._generate_event_id()
        self.occurred_at = datetime.utcnow()
        self.order_id = order_id
        self.confirmation_time = confirmation_time
        self.correlation_id = None
        self.causation_id = None

    def _generate_event_id(self) -> str:
        import uuid
        return str(uuid.uuid4())


class OrderCancelled:
    """Event raised when order is cancelled"""
    def __init__(self, order_id: str, reason: str):
        self.id = self._generate_event_id()
        self.occurred_at = datetime.utcnow()
        self.order_id = order_id
        self.reason = reason
        self.correlation_id = None
        self.causation_id = None

    def _generate_event_id(self) -> str:
        import uuid
        return str(uuid.uuid4())


class OrderStatus:
    """Order status enumeration"""
    DRAFT = "DRAFT"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"


class Order(AggregateRoot[OrderId]):
    """Test Order aggregate for lifecycle testing"""

    def __init__(self, id: OrderId, customer_id: CustomerId, total: Money):
        super().__init__(id)
        self._customer_id = customer_id
        self._total = total
        self._status = OrderStatus.DRAFT

        # Add creation event
        self.add_event(OrderCreated(
            str(id),
            str(customer_id),
            total
        ))

    @property
    def customer_id(self) -> CustomerId:
        return self._customer_id

    @property
    def total(self) -> Money:
        return self._total

    @property
    def status(self) -> str:
        return self._status

    def confirm(self) -> Result[None]:
        """
        Confirm the order if it's in draft status

        Returns:
            Result indicating success or failure
        """
        # Given: Order must be in draft status
        if self._status != OrderStatus.DRAFT:
            return Result.failure(Error.domain(
                "Order.InvalidStateTransition",
                f"Cannot confirm order in {self._status} status"
            ))

        # When: Confirming the order
        self._status = OrderStatus.CONFIRMED
        self.increment_version()

        # Add confirmation event
        self.add_event(OrderConfirmed(
            str(self.id),
            datetime.utcnow()
        ))

        # Then: Return success
        return Result.success(None)

    def cancel(self, reason: str) -> Result[None]:
        """
        Cancel the order with a reason

        Args:
            reason: Reason for cancellation

        Returns:
            Result indicating success or failure
        """
        # Given: Order cannot be cancelled if already cancelled
        if self._status == OrderStatus.CANCELLED:
            return Result.failure(Error.domain(
                "Order.AlreadyCancelled",
                "Order is already cancelled"
            ))

        # When: Cancelling the order
        self._status = OrderStatus.CANCELLED
        self.increment_version()

        # Add cancellation event
        self.add_event(OrderCancelled(
            str(self.id),
            reason
        ))

        # Then: Return success
        return Result.success(None)

    def change_total(self, new_total: Money) -> Result[None]:
        """
        Change order total if order is still draft

        Args:
            new_total: New total amount

        Returns:
            Result indicating success or failure
        """
        # Given: Order must be in draft status
        if self._status != OrderStatus.DRAFT:
            return Result.failure(Error.domain(
                "Order.CannotModifyConfirmedOrder",
                "Cannot modify order that is not in draft status"
            ))

        # Given: Total must be positive
        if new_total.amount <= 0:
            return Result.failure(Error.validation(
                "Order.InvalidTotal",
                "Order total must be positive",
                {"amount": new_total.amount, "currency": new_total.currency}
            ))

        # When: Changing the total
        self._total = new_total
        self.increment_version()

        # Then: Return success
        return Result.success(None)

    def _generate_event_id(self) -> str:
        """Generate unique event ID"""
        import uuid
        return str(uuid.uuid4())


class TestOrderLifecycle:
    """Integration tests for Order aggregate lifecycle"""

    def test_should_create_order_with_initial_state_when_constructed(self):
        """
        Test order creation with initial state

        Given: Valid order parameters
        When: Creating a new order
        Then: Order should have correct initial state and creation event
        """
        # Given
        order_id = OrderId("ORD-001")
        customer_id = CustomerId("CUST-123")
        total = Money(100.50, "USD")

        # When
        order = Order(order_id, customer_id, total)

        # Then
        assert order.id == order_id
        assert order.customer_id == customer_id
        assert order.total == total
        assert order.status == OrderStatus.DRAFT
        assert order.version == 0
        assert len(order.domain_events) == 1

        # Verify creation event
        creation_event = order.domain_events[0]
        assert isinstance(creation_event, OrderCreated)
        assert creation_event.order_id == str(order_id)
        assert creation_event.customer_id == str(customer_id)
        assert creation_event.total == total

    def test_should_confirm_order_successfully_when_in_draft_status(self):
        """
        Test successful order confirmation

        Given: Order in draft status
        When: Confirming the order
        Then: Order status changes and confirmation event is added
        """
        # Given
        order = Order(OrderId("ORD-002"), CustomerId("CUST-456"), Money(75.25, "EUR"))
        initial_event_count = len(order.domain_events)

        # When
        result = order.confirm()

        # Then
        assert result.is_success
        assert order.status == OrderStatus.CONFIRMED
        assert order.version == 1
        assert len(order.domain_events) == initial_event_count + 1

        # Verify confirmation event
        confirmation_event = order.domain_events[-1]
        assert isinstance(confirmation_event, OrderConfirmed)
        assert confirmation_event.order_id == "ORD-002"

    def test_should_fail_confirmation_when_order_already_confirmed(self):
        """
        Test confirmation failure on already confirmed order

        Given: Already confirmed order
        When: Attempting to confirm again
        Then: Operation should fail with appropriate error
        """
        # Given
        order = Order(OrderId("ORD-003"), CustomerId("CUST-789"), Money(200.0, "USD"))
        order.confirm()  # First confirmation
        initial_event_count = len(order.domain_events)

        # When
        result = order.confirm()  # Second confirmation attempt

        # Then
        assert result.is_failure
        assert result.error.code == "Order.InvalidStateTransition"
        assert "Cannot confirm order in CONFIRMED status" in result.error.message
        assert len(order.domain_events) == initial_event_count  # No new events

    def test_should_cancel_order_successfully_when_valid(self):
        """
        Test successful order cancellation

        Given: Order in any valid status
        When: Cancelling the order
        Then: Order is cancelled and cancellation event is added
        """
        # Given
        order = Order(OrderId("ORD-004"), CustomerId("CUST-101"), Money(150.0, "GBP"))
        reason = "Customer requested cancellation"

        # When
        result = order.cancel(reason)

        # Then
        assert result.is_success
        assert order.status == OrderStatus.CANCELLED
        assert order.version == 1

        # Verify cancellation event
        cancellation_event = order.domain_events[-1]
        assert isinstance(cancellation_event, OrderCancelled)
        assert cancellation_event.order_id == "ORD-004"
        assert cancellation_event.reason == reason

    def test_should_fail_cancellation_when_already_cancelled(self):
        """
        Test cancellation failure on already cancelled order

        Given: Already cancelled order
        When: Attempting to cancel again
        Then: Operation should fail with appropriate error
        """
        # Given
        order = Order(OrderId("ORD-005"), CustomerId("CUST-202"), Money(300.0, "USD"))
        order.cancel("First cancellation")  # First cancellation
        initial_event_count = len(order.domain_events)

        # When
        result = order.cancel("Second cancellation")

        # Then
        assert result.is_failure
        assert result.error.code == "Order.AlreadyCancelled"
        assert "Order is already cancelled" in result.error.message
        assert len(order.domain_events) == initial_event_count  # No new events

    def test_should_modify_total_when_order_in_draft_status(self):
        """
        Test successful total modification

        Given: Order in draft status
        When: Changing the total
        Then: Total is updated successfully
        """
        # Given
        order = Order(OrderId("ORD-006"), CustomerId("CUST-303"), Money(100.0, "USD"))
        new_total = Money(150.0, "USD")

        # When
        result = order.change_total(new_total)

        # Then
        assert result.is_success
        assert order.total == new_total
        assert order.version == 1

    def test_should_fail_total_modification_when_order_confirmed(self):
        """
        Test total modification failure on confirmed order

        Given: Confirmed order
        When: Attempting to change total
        Then: Operation should fail with appropriate error
        """
        # Given
        order = Order(OrderId("ORD-007"), CustomerId("CUST-404"), Money(100.0, "USD"))
        order.confirm()  # Confirm the order
        new_total = Money(200.0, "USD")

        # When
        result = order.change_total(new_total)

        # Then
        assert result.is_failure
        assert result.error.code == "Order.CannotModifyConfirmedOrder"
        assert "Cannot modify order that is not in draft status" in result.error.message

    def test_should_fail_total_modification_when_invalid_amount(self):
        """
        Test total modification failure with invalid amount

        Given: Order in draft status
        When: Setting negative or zero total
        Then: Operation should fail with validation error
        """
        # Given
        order = Order(OrderId("ORD-008"), CustomerId("CUST-505"), Money(100.0, "USD"))
        invalid_total = Money(0.0, "USD")

        # When
        result = order.change_total(invalid_total)

        # Then
        assert result.is_failure
        assert result.error.code == "Order.InvalidTotal"
        assert "Order total must be positive" in result.error.message
        assert result.error.metadata["amount"] == 0.0

    def test_should_maintain_event_chronological_order_when_multiple_operations(self):
        """
        Test event ordering in complex lifecycle

        Given: Order with multiple operations
        When: Performing various operations
        Then: Events should maintain chronological order
        """
        # Given
        order = Order(OrderId("ORD-009"), CustomerId("CUST-606"), Money(100.0, "USD"))

        # When - Perform multiple operations
        order.change_total(Money(150.0, "USD"))
        order.confirm()
        order.cancel("Changed mind")

        # Then
        events = order.domain_events
        assert len(events) == 3  # Creation + Confirmation + Cancellation (change_total doesn't generate events)

        # Verify event types in order
        assert isinstance(events[0], OrderCreated)
        assert isinstance(events[1], OrderConfirmed)
        assert isinstance(events[2], OrderCancelled)

        # Verify timestamps are in order (within reasonable margin)
        for i in range(len(events) - 1):
            assert events[i].occurred_at <= events[i + 1].occurred_at

    def test_should_handle_complete_lifecycle_successfully(self):
        """
        Test complete order lifecycle from creation to completion

        Given: New order
        When: Going through complete lifecycle
        Then: All operations should succeed with proper state transitions
        """
        # Given - Create order
        order = Order(OrderId("ORD-010"), CustomerId("CUST-707"), Money(250.0, "EUR"))
        assert order.status == OrderStatus.DRAFT

        # When/Then - Modify order (should succeed)
        modify_result = order.change_total(Money(275.0, "EUR"))
        assert modify_result.is_success
        assert order.total.amount == 275.0

        # When/Then - Confirm order (should succeed)
        confirm_result = order.confirm()
        assert confirm_result.is_success
        assert order.status == OrderStatus.CONFIRMED

        # When/Then - Try to modify confirmed order (should fail)
        modify_confirmed_result = order.change_total(Money(300.0, "EUR"))
        assert modify_confirmed_result.is_failure

        # When/Then - Cancel confirmed order (should succeed)
        cancel_result = order.cancel("Business decision")
        assert cancel_result.is_success
        assert order.status == OrderStatus.CANCELLED

        # Verify final state
        assert order.version == 3  # Initial + Confirm + Cancel
        assert len(order.domain_events) >= 3