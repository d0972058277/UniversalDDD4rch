"""
Example tests for Order aggregate demonstrating domain behavior.
Shows proper TDD approach with Given-When-Then structure.
"""

import pytest
from decimal import Decimal

from examples.order_domain.identifiers import OrderId, CustomerId, ProductId
from examples.order_domain.value_objects import Money, Address, PersonName, Quantity
from examples.order_domain.aggregates import Order, OrderStatus, OrderCreatedEvent, OrderLineAddedEvent


class TestOrderAggregate:
    """Test cases for Order aggregate business logic."""

    def test_should_create_order_successfully_when_valid_data_provided(self):
        """Test successful order creation with valid data."""
        # Given
        order_id = OrderId.from_string("ORD-123456")
        customer_id = CustomerId.from_string("CUST-ABC123")
        customer_name = PersonName("John", "Doe", "William")
        billing_address = Address.create_us_address(
            "123 Main St", "Anytown", "CA", "12345"
        )

        # When
        order = Order(order_id, customer_id, customer_name, billing_address)

        # Then
        assert order.id == order_id
        assert order.customer_id == customer_id
        assert order.customer_name == customer_name
        assert order.billing_address == billing_address
        assert order.shipping_address == billing_address  # Default to billing
        assert order.status == OrderStatus.DRAFT
        assert order.total_amount == Money.zero('USD')
        assert order.line_count == 0
        assert len(order.domain_events) == 1
        assert isinstance(order.domain_events[0], OrderCreatedEvent)

    def test_should_add_order_line_successfully_when_draft_order(self):
        """Test adding order line to draft order."""
        # Given
        order = self._create_sample_order()
        product_id = ProductId.from_string("PROD-XYZ789")
        quantity = Quantity.pieces(2)
        unit_price = Money.usd("25.50")

        # When
        result = order.add_order_line(product_id, quantity, unit_price)

        # Then
        assert result.is_success
        assert order.line_count == 1
        assert order.total_amount == Money.usd("51.00")

        # Check order lines
        lines = order.order_lines
        assert len(lines) == 1
        assert lines[0].product_id == product_id
        assert lines[0].quantity == quantity
        assert lines[0].unit_price == unit_price
        assert lines[0].line_total == Money.usd("51.00")

        # Check events
        line_added_events = [e for e in order.domain_events if isinstance(e, OrderLineAddedEvent)]
        assert len(line_added_events) == 1
        assert line_added_events[0].product_id == str(product_id)
        assert line_added_events[0].quantity == 2

    def test_should_reject_order_line_when_order_confirmed(self):
        """Test rejecting order line addition to confirmed order."""
        # Given
        order = self._create_sample_order_with_line()
        order.confirm()  # Confirm the order
        product_id = ProductId.from_string("PROD-ABC123")
        quantity = Quantity.pieces(1)
        unit_price = Money.usd("10.00")

        # When
        result = order.add_order_line(product_id, quantity, unit_price)

        # Then
        assert result.is_failure
        assert result.error.code == "Order.CannotModifyConfirmedOrder"
        assert "confirmed" in result.error.message.lower()

    def test_should_reject_order_line_when_negative_quantity(self):
        """Test rejecting order line with invalid quantity."""
        # Given
        order = self._create_sample_order()
        product_id = ProductId.from_string("PROD-XYZ789")
        unit_price = Money.usd("25.50")

        # When - try to add line with zero quantity
        with pytest.raises(ValueError, match="Quantity cannot be zero"):
            quantity = Quantity.pieces(0)

    def test_should_reject_order_line_when_zero_price(self):
        """Test rejecting order line with zero price."""
        # Given
        order = self._create_sample_order()
        product_id = ProductId.from_string("PROD-XYZ789")
        quantity = Quantity.pieces(2)
        unit_price = Money.zero('USD')

        # When
        result = order.add_order_line(product_id, quantity, unit_price)

        # Then
        assert result.is_failure
        assert result.error.code == "Order.InvalidPrice"
        assert "positive" in result.error.message.lower()

    def test_should_reject_duplicate_product_line(self):
        """Test rejecting duplicate product in order."""
        # Given
        order = self._create_sample_order()
        product_id = ProductId.from_string("PROD-XYZ789")
        quantity = Quantity.pieces(2)
        unit_price = Money.usd("25.50")

        # Add first line
        order.add_order_line(product_id, quantity, unit_price)

        # When - try to add same product again
        result = order.add_order_line(product_id, quantity, unit_price)

        # Then
        assert result.is_failure
        assert result.error.code == "Order.DuplicateProduct"
        assert str(product_id) in result.error.message

    def test_should_confirm_order_successfully_when_draft_with_lines(self):
        """Test successful order confirmation."""
        # Given
        order = self._create_sample_order_with_line()
        assert order.status == OrderStatus.DRAFT

        # When
        result = order.confirm()

        # Then
        assert result.is_success
        assert order.status == OrderStatus.CONFIRMED

        # Check events
        confirmed_events = [e for e in order.domain_events
                          if e.__class__.__name__ == "OrderConfirmedEvent"]
        assert len(confirmed_events) == 1

    def test_should_reject_confirmation_when_empty_order(self):
        """Test rejecting confirmation of empty order."""
        # Given
        order = self._create_sample_order()  # No lines added

        # When
        result = order.confirm()

        # Then
        assert result.is_failure
        assert result.error.code == "Order.EmptyOrder"
        assert "without order lines" in result.error.message

    def test_should_reject_confirmation_when_already_confirmed(self):
        """Test rejecting confirmation of already confirmed order."""
        # Given
        order = self._create_sample_order_with_line()
        order.confirm()  # Already confirmed

        # When
        result = order.confirm()

        # Then
        assert result.is_failure
        assert result.error.code == "Order.InvalidStatusTransition"

    def test_should_cancel_order_successfully_when_valid_reason(self):
        """Test successful order cancellation."""
        # Given
        order = self._create_sample_order_with_line()
        reason = "Customer requested cancellation"
        cancelled_by = "Customer Service"

        # When
        result = order.cancel(reason, cancelled_by)

        # Then
        assert result.is_success
        assert order.status == OrderStatus.CANCELLED

        # Check events
        cancelled_events = [e for e in order.domain_events
                          if e.__class__.__name__ == "OrderCancelledEvent"]
        assert len(cancelled_events) == 1
        assert cancelled_events[0].reason == reason
        assert cancelled_events[0].cancelled_by == cancelled_by

    def test_should_reject_cancellation_when_empty_reason(self):
        """Test rejecting cancellation with empty reason."""
        # Given
        order = self._create_sample_order_with_line()

        # When
        result = order.cancel("", "Customer Service")

        # Then
        assert result.is_failure
        assert result.error.code == "Order.EmptyCancelReason"

    def test_should_reject_cancellation_when_shipped(self):
        """Test rejecting cancellation of shipped order."""
        # Given
        order = self._create_sample_order_with_line()
        order.confirm()
        order.mark_as_paid()
        order.ship("TRACK123")  # Ship the order

        # When
        result = order.cancel("Customer changed mind", "Customer")

        # Then
        assert result.is_failure
        assert result.error.code == "Order.CannotCancelShippedOrder"

    def test_should_update_shipping_address_when_not_shipped(self):
        """Test updating shipping address before shipping."""
        # Given
        order = self._create_sample_order()
        new_shipping_address = Address.create_us_address(
            "456 Oak Ave", "Another City", "NY", "67890"
        )

        # When
        result = order.update_shipping_address(new_shipping_address)

        # Then
        assert result.is_success
        assert order.shipping_address == new_shipping_address
        assert order.billing_address != new_shipping_address  # Still different

    def test_should_reject_shipping_address_update_when_shipped(self):
        """Test rejecting shipping address update after shipping."""
        # Given
        order = self._create_sample_order_with_line()
        order.confirm()
        order.mark_as_paid()
        order.ship("TRACK123")  # Ship the order

        new_address = Address.create_us_address(
            "456 Oak Ave", "Another City", "NY", "67890"
        )

        # When
        result = order.update_shipping_address(new_address)

        # Then
        assert result.is_failure
        assert result.error.code == "Order.CannotUpdateShippingAddress"

    def test_should_ship_order_successfully_when_paid(self):
        """Test successful order shipping."""
        # Given
        order = self._create_sample_order_with_line()
        order.confirm()
        order.mark_as_paid()
        tracking_number = "TRACK123456"

        # When
        result = order.ship(tracking_number)

        # Then
        assert result.is_success
        assert order.status == OrderStatus.SHIPPED

        # Check events
        shipped_events = [e for e in order.domain_events
                         if e.__class__.__name__ == "OrderShippedEvent"]
        assert len(shipped_events) == 1
        assert shipped_events[0].tracking_number == tracking_number

    def test_should_reject_shipping_when_not_paid(self):
        """Test rejecting shipping of unpaid order."""
        # Given
        order = self._create_sample_order_with_line()
        order.confirm()  # Confirmed but not paid

        # When
        result = order.ship("TRACK123")

        # Then
        assert result.is_failure
        assert result.error.code == "Order.InvalidStatusTransition"

    def test_should_calculate_total_correctly_with_multiple_lines(self):
        """Test total calculation with multiple order lines."""
        # Given
        order = self._create_sample_order()

        # Add first line: 2 x $25.50 = $51.00
        order.add_order_line(
            ProductId.from_string("PROD-001"),
            Quantity.pieces(2),
            Money.usd("25.50")
        )

        # Add second line: 1 x $15.25 = $15.25
        order.add_order_line(
            ProductId.from_string("PROD-002"),
            Quantity.pieces(1),
            Money.usd("15.25")
        )

        # Then
        assert order.total_amount == Money.usd("66.25")  # $51.00 + $15.25
        assert order.line_count == 2

    def test_should_remove_order_line_successfully_when_draft(self):
        """Test removing order line from draft order."""
        # Given
        order = self._create_sample_order()
        product_id = ProductId.from_string("PROD-XYZ789")
        order.add_order_line(product_id, Quantity.pieces(2), Money.usd("25.50"))
        assert order.line_count == 1

        # When
        result = order.remove_order_line(product_id)

        # Then
        assert result.is_success
        assert order.line_count == 0
        assert order.total_amount == Money.zero('USD')

    def test_should_reject_removing_nonexistent_line(self):
        """Test rejecting removal of nonexistent order line."""
        # Given
        order = self._create_sample_order()
        nonexistent_product = ProductId.from_string("PROD-NONE")

        # When
        result = order.remove_order_line(nonexistent_product)

        # Then
        assert result.is_failure
        assert result.error.code == "Order.ProductNotFound"

    def test_should_add_notes_successfully_when_valid_text(self):
        """Test adding notes to order."""
        # Given
        order = self._create_sample_order()
        notes = "Customer requested expedited shipping"

        # When
        result = order.add_notes(notes)

        # Then
        assert result.is_success
        assert order.notes == notes

    def test_should_reject_empty_notes(self):
        """Test rejecting empty notes."""
        # Given
        order = self._create_sample_order()

        # When
        result = order.add_notes("")

        # Then
        assert result.is_failure
        assert result.error.code == "Order.EmptyNotes"

    def test_should_deliver_order_successfully_when_shipped(self):
        """Test successful order delivery."""
        # Given
        order = self._create_sample_order_with_line()
        order.confirm()
        order.mark_as_paid()
        order.ship("TRACK123")

        # When
        result = order.deliver()

        # Then
        assert result.is_success
        assert order.status == OrderStatus.DELIVERED

    def test_should_check_modification_permissions_correctly(self):
        """Test order modification permission checks."""
        # Given
        order = self._create_sample_order()

        # When & Then - Draft order can be modified
        assert order.can_be_modified()
        assert order.can_be_cancelled()

        # When & Then - Confirmed order cannot be modified but can be cancelled
        order.add_order_line(ProductId.from_string("PROD-001"), Quantity.pieces(1), Money.usd("10"))
        order.confirm()
        assert not order.can_be_modified()
        assert order.can_be_cancelled()

        # When & Then - Shipped order cannot be modified or cancelled
        order.mark_as_paid()
        order.ship("TRACK123")
        assert not order.can_be_modified()
        assert not order.can_be_cancelled()

    # Helper methods
    def _create_sample_order(self) -> Order:
        """Create a sample order for testing."""
        order_id = OrderId.from_string("ORD-123456")
        customer_id = CustomerId.from_string("CUST-ABC123")
        customer_name = PersonName("John", "Doe")
        billing_address = Address.create_us_address(
            "123 Main St", "Anytown", "CA", "12345"
        )
        return Order(order_id, customer_id, customer_name, billing_address)

    def _create_sample_order_with_line(self) -> Order:
        """Create a sample order with one order line."""
        order = self._create_sample_order()
        product_id = ProductId.from_string("PROD-XYZ789")
        quantity = Quantity.pieces(2)
        unit_price = Money.usd("25.50")
        order.add_order_line(product_id, quantity, unit_price)
        return order