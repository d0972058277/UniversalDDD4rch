"""
Example implementations of aggregates for the Order domain.
Demonstrates proper AggregateRoot implementation with business logic and events.
"""

import uuid
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import List, Optional

from architecture_core.domain.aggregates import AggregateRoot
from architecture_core.domain.events import DomainEventBase
from architecture_core.functional.result import Result
from architecture_core.functional.error import Error

from .identifiers import OrderId, CustomerId, ProductId
from .value_objects import Money, Address, PersonName, Quantity


class OrderStatus(Enum):
    """Order status enumeration."""
    DRAFT = "draft"
    CONFIRMED = "confirmed"
    PAID = "paid"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class OrderCreatedEvent(DomainEventBase):
    """Event raised when an order is created."""

    def __init__(self, order_id: str, customer_id: str, customer_name: str,
                 correlation_id: Optional[str] = None, causation_id: Optional[str] = None):
        super().__init__(correlation_id=correlation_id, causation_id=causation_id)
        object.__setattr__(self, 'order_id', order_id)
        object.__setattr__(self, 'customer_id', customer_id)
        object.__setattr__(self, 'customer_name', customer_name)


class OrderLineAddedEvent(DomainEventBase):
    """Event raised when an order line is added."""

    def __init__(self, order_id: str, product_id: str, quantity: int,
                 unit_price: str, currency: str,
                 correlation_id: Optional[str] = None, causation_id: Optional[str] = None):
        super().__init__(correlation_id=correlation_id, causation_id=causation_id)
        object.__setattr__(self, 'order_id', order_id)
        object.__setattr__(self, 'product_id', product_id)
        object.__setattr__(self, 'quantity', quantity)
        object.__setattr__(self, 'unit_price', unit_price)
        object.__setattr__(self, 'currency', currency)


class OrderConfirmedEvent(DomainEventBase):
    """Event raised when an order is confirmed."""

    def __init__(self, order_id: str, total_amount: str, currency: str, line_count: int,
                 correlation_id: Optional[str] = None, causation_id: Optional[str] = None):
        super().__init__(correlation_id=correlation_id, causation_id=causation_id)
        object.__setattr__(self, 'order_id', order_id)
        object.__setattr__(self, 'total_amount', total_amount)
        object.__setattr__(self, 'currency', currency)
        object.__setattr__(self, 'line_count', line_count)


class OrderCancelledEvent(DomainEventBase):
    """Event raised when an order is cancelled."""

    def __init__(self, order_id: str, reason: str, cancelled_by: str,
                 correlation_id: Optional[str] = None, causation_id: Optional[str] = None):
        super().__init__(correlation_id=correlation_id, causation_id=causation_id)
        object.__setattr__(self, 'order_id', order_id)
        object.__setattr__(self, 'reason', reason)
        object.__setattr__(self, 'cancelled_by', cancelled_by)


class OrderShippedEvent(DomainEventBase):
    """Event raised when an order is shipped."""

    def __init__(self, order_id: str, tracking_number: str, shipping_address: str,
                 correlation_id: Optional[str] = None, causation_id: Optional[str] = None):
        super().__init__(correlation_id=correlation_id, causation_id=causation_id)
        object.__setattr__(self, 'order_id', order_id)
        object.__setattr__(self, 'tracking_number', tracking_number)
        object.__setattr__(self, 'shipping_address', shipping_address)


@dataclass(frozen=True)
class OrderLine:
    """Order line value object."""
    product_id: ProductId
    quantity: Quantity
    unit_price: Money
    line_total: Money

    def __post_init__(self) -> None:
        """Validate order line constraints."""
        if self.unit_price.currency != self.line_total.currency:
            raise ValueError("Unit price and line total must have same currency")

        expected_total = self.unit_price.multiply(Decimal(self.quantity.value))
        if self.line_total != expected_total:
            raise ValueError(f"Line total {self.line_total} doesn't match expected {expected_total}")


class Order(AggregateRoot[OrderId]):
    """Order aggregate root with business logic."""

    def __init__(
        self,
        order_id: OrderId,
        customer_id: CustomerId,
        customer_name: PersonName,
        billing_address: Address
    ) -> None:
        """Initialize new order."""
        super().__init__(order_id)
        self._customer_id = customer_id
        self._customer_name = customer_name
        self._billing_address = billing_address
        self._shipping_address = billing_address  # Default to billing address
        self._status = OrderStatus.DRAFT
        self._order_lines: List[OrderLine] = []
        self._total_amount = Money.zero('USD')  # Default currency
        self._notes: Optional[str] = None

        # Raise domain event
        self.add_event(OrderCreatedEvent(
            order_id=str(order_id),
            customer_id=str(customer_id),
            customer_name=customer_name.get_full_name()
        ))

    @property
    def customer_id(self) -> CustomerId:
        """Get customer ID."""
        return self._customer_id

    @property
    def customer_name(self) -> PersonName:
        """Get customer name."""
        return self._customer_name

    @property
    def billing_address(self) -> Address:
        """Get billing address."""
        return self._billing_address

    @property
    def shipping_address(self) -> Address:
        """Get shipping address."""
        return self._shipping_address

    @property
    def status(self) -> OrderStatus:
        """Get order status."""
        return self._status

    @property
    def order_lines(self) -> List[OrderLine]:
        """Get read-only list of order lines."""
        return list(self._order_lines)

    @property
    def total_amount(self) -> Money:
        """Get total order amount."""
        return self._total_amount

    @property
    def notes(self) -> Optional[str]:
        """Get order notes."""
        return self._notes

    @property
    def line_count(self) -> int:
        """Get number of order lines."""
        return len(self._order_lines)

    def add_order_line(
        self,
        product_id: ProductId,
        quantity: Quantity,
        unit_price: Money
    ) -> Result[None]:
        """Add order line to the order."""
        # Business rule: Can only modify draft orders
        if self._status != OrderStatus.DRAFT:
            return Result.failure(Error.domain(
                "Order.CannotModifyConfirmedOrder",
                f"Cannot modify order in {self._status.value} status"
            ))

        # Business rule: Quantity must be positive
        if quantity.value <= 0:
            return Result.failure(Error.validation(
                "Order.InvalidQuantity",
                "Quantity must be positive",
                {"quantity": quantity.value}
            ))

        # Business rule: Unit price must be positive
        if not unit_price.is_positive():
            return Result.failure(Error.validation(
                "Order.InvalidPrice",
                "Unit price must be positive",
                {"unit_price": str(unit_price)}
            ))

        # Business rule: Cannot have duplicate product lines (for simplicity)
        if any(line.product_id == product_id for line in self._order_lines):
            return Result.failure(Error.domain(
                "Order.DuplicateProduct",
                f"Product {product_id} already exists in order"
            ))

        # Calculate line total
        line_total = unit_price.multiply(Decimal(quantity.value))

        # Create order line
        order_line = OrderLine(
            product_id=product_id,
            quantity=quantity,
            unit_price=unit_price,
            line_total=line_total
        )

        # Add to order
        self._order_lines.append(order_line)
        self._recalculate_total()

        # Raise domain event
        self.add_event(OrderLineAddedEvent(
            order_id=str(self.id),
            product_id=str(product_id),
            quantity=quantity.value,
            unit_price=str(unit_price.amount),
            currency=unit_price.currency
        ))

        return Result.success(None)

    def remove_order_line(self, product_id: ProductId) -> Result[None]:
        """Remove order line from the order."""
        # Business rule: Can only modify draft orders
        if self._status != OrderStatus.DRAFT:
            return Result.failure(Error.domain(
                "Order.CannotModifyConfirmedOrder",
                f"Cannot modify order in {self._status.value} status"
            ))

        # Find and remove line
        original_count = len(self._order_lines)
        self._order_lines = [line for line in self._order_lines if line.product_id != product_id]

        if len(self._order_lines) == original_count:
            return Result.failure(Error.domain(
                "Order.ProductNotFound",
                f"Product {product_id} not found in order"
            ))

        self._recalculate_total()
        return Result.success(None)

    def update_shipping_address(self, shipping_address: Address) -> Result[None]:
        """Update shipping address."""
        # Business rule: Can update shipping address before shipping
        if self._status in [OrderStatus.SHIPPED, OrderStatus.DELIVERED]:
            return Result.failure(Error.domain(
                "Order.CannotUpdateShippingAddress",
                f"Cannot update shipping address for {self._status.value} order"
            ))

        self._shipping_address = shipping_address
        return Result.success(None)

    def add_notes(self, notes: str) -> Result[None]:
        """Add notes to the order."""
        if not notes or not notes.strip():
            return Result.failure(Error.validation(
                "Order.EmptyNotes",
                "Notes cannot be empty"
            ))

        self._notes = notes.strip()
        return Result.success(None)

    def confirm(self) -> Result[None]:
        """Confirm the order."""
        # Business rule: Can only confirm draft orders
        if self._status != OrderStatus.DRAFT:
            return Result.failure(Error.domain(
                "Order.InvalidStatusTransition",
                f"Cannot confirm order in {self._status.value} status"
            ))

        # Business rule: Must have at least one order line
        if not self._order_lines:
            return Result.failure(Error.domain(
                "Order.EmptyOrder",
                "Cannot confirm order without order lines"
            ))

        # Business rule: Total must be positive
        if not self._total_amount.is_positive():
            return Result.failure(Error.domain(
                "Order.ZeroTotal",
                "Cannot confirm order with zero total"
            ))

        self._status = OrderStatus.CONFIRMED

        # Raise domain event
        self.add_event(OrderConfirmedEvent(
            order_id=str(self.id),
            total_amount=str(self._total_amount.amount),
            currency=self._total_amount.currency,
            line_count=len(self._order_lines)
        ))

        return Result.success(None)

    def cancel(self, reason: str, cancelled_by: str) -> Result[None]:
        """Cancel the order."""
        # Business rule: Cannot cancel shipped or delivered orders
        if self._status in [OrderStatus.SHIPPED, OrderStatus.DELIVERED]:
            return Result.failure(Error.domain(
                "Order.CannotCancelShippedOrder",
                f"Cannot cancel {self._status.value} order"
            ))

        # Business rule: Cannot cancel already cancelled order
        if self._status == OrderStatus.CANCELLED:
            return Result.failure(Error.domain(
                "Order.AlreadyCancelled",
                "Order is already cancelled"
            ))

        if not reason or not reason.strip():
            return Result.failure(Error.validation(
                "Order.EmptyCancelReason",
                "Cancel reason cannot be empty"
            ))

        if not cancelled_by or not cancelled_by.strip():
            return Result.failure(Error.validation(
                "Order.EmptyCancelledBy",
                "Cancelled by cannot be empty"
            ))

        self._status = OrderStatus.CANCELLED

        # Raise domain event
        self.add_event(OrderCancelledEvent(
            order_id=str(self.id),
            reason=reason.strip(),
            cancelled_by=cancelled_by.strip()
        ))

        return Result.success(None)

    def mark_as_paid(self) -> Result[None]:
        """Mark order as paid."""
        # Business rule: Can only pay confirmed orders
        if self._status != OrderStatus.CONFIRMED:
            return Result.failure(Error.domain(
                "Order.InvalidStatusTransition",
                f"Cannot mark {self._status.value} order as paid"
            ))

        self._status = OrderStatus.PAID
        return Result.success(None)

    def ship(self, tracking_number: str) -> Result[None]:
        """Ship the order."""
        # Business rule: Can only ship paid orders
        if self._status != OrderStatus.PAID:
            return Result.failure(Error.domain(
                "Order.InvalidStatusTransition",
                f"Cannot ship {self._status.value} order"
            ))

        if not tracking_number or not tracking_number.strip():
            return Result.failure(Error.validation(
                "Order.EmptyTrackingNumber",
                "Tracking number cannot be empty"
            ))

        self._status = OrderStatus.SHIPPED

        # Raise domain event
        self.add_event(OrderShippedEvent(
            order_id=str(self.id),
            tracking_number=tracking_number.strip(),
            shipping_address=self._shipping_address.get_single_line_address()
        ))

        return Result.success(None)

    def deliver(self) -> Result[None]:
        """Mark order as delivered."""
        # Business rule: Can only deliver shipped orders
        if self._status != OrderStatus.SHIPPED:
            return Result.failure(Error.domain(
                "Order.InvalidStatusTransition",
                f"Cannot deliver {self._status.value} order"
            ))

        self._status = OrderStatus.DELIVERED
        return Result.success(None)

    def can_be_modified(self) -> bool:
        """Check if order can be modified."""
        return self._status == OrderStatus.DRAFT

    def can_be_cancelled(self) -> bool:
        """Check if order can be cancelled."""
        return self._status not in [OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.CANCELLED]

    def _recalculate_total(self) -> None:
        """Recalculate order total from lines."""
        if not self._order_lines:
            if hasattr(self, '_total_amount'):
                currency = self._total_amount.currency
            else:
                currency = 'USD'  # Default currency
            self._total_amount = Money.zero(currency)
            return

        # Get currency from first line
        first_line = self._order_lines[0]
        currency = first_line.unit_price.currency

        # Calculate total
        total = Money.zero(currency)
        for line in self._order_lines:
            if line.unit_price.currency != currency:
                raise ValueError(f"All order lines must have same currency. Expected {currency}, got {line.unit_price.currency}")
            total = total.add(line.line_total)

        self._total_amount = total

    def __str__(self) -> str:
        """String representation of Order."""
        return f"Order {self.id} ({self._status.value}) - {self._total_amount}"

    def __repr__(self) -> str:
        """Developer representation of Order."""
        return f"Order(id={self.id}, status={self._status.value}, total={self._total_amount}, lines={len(self._order_lines)})"