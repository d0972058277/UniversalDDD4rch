#!/usr/bin/env python3
"""
Quick demonstration of Architecture.Core Python implementation.

This example shows basic usage of DDD abstractions and functional types
without requiring Django or external dependencies.
"""

import sys
import os
from decimal import Decimal
from dataclasses import dataclass
from typing import Iterator, Any

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from architecture_core.domain import AggregateRoot, Entity, ValueObject, DomainEventBase
from architecture_core.functional import Result, Maybe, Error


# Example 1: Entity ID
@dataclass(frozen=True)
class OrderId:
    """Example entity ID implementation"""
    value: str

    def __post_init__(self):
        if not self.value or not self.value.strip():
            raise ValueError("OrderId value cannot be empty")

    def __str__(self) -> str:
        return self.value

    def __eq__(self, other: object) -> bool:
        return isinstance(other, OrderId) and self.value == other.value

    def __hash__(self) -> int:
        return hash(self.value)


# Example 2: Value Object
class Money(ValueObject):
    """Example value object implementation"""

    def __init__(self, amount: Decimal, currency: str):
        if amount < 0:
            raise ValueError("Amount cannot be negative")
        if not currency or len(currency) != 3:
            raise ValueError("Currency must be 3-character code")

        self.amount = amount
        self.currency = currency.upper()

    def get_equality_components(self) -> Iterator[Any]:
        yield self.amount
        yield self.currency

    def __str__(self) -> str:
        return f"{self.amount} {self.currency}"


# Example 3: Domain Event
class OrderCreated(DomainEventBase):
    """Example domain event implementation"""

    def __init__(self, order_id: str, customer_name: str, total: str, **kwargs):
        super().__init__(**kwargs)
        self.order_id = order_id
        self.customer_name = customer_name
        self.total = total


# Example 4: Aggregate Root
class Order(AggregateRoot[OrderId]):
    """Example aggregate root implementation"""

    def __init__(self, id: OrderId, customer_name: str):
        super().__init__(id)
        self._customer_name = customer_name
        self._total = Money(Decimal('0'), 'USD')

        # Add domain event
        self.add_event(OrderCreated(
            order_id=str(id),
            customer_name=customer_name,
            total=str(self._total)
        ))

    @property
    def customer_name(self) -> str:
        return self._customer_name

    @property
    def total(self) -> Money:
        return self._total

    def add_amount(self, amount: Money) -> Result[None]:
        """Business method with Result-based error handling"""
        if amount.currency != self._total.currency:
            return Result.failure(Error.domain(
                "Order.CurrencyMismatch",
                f"Cannot add {amount.currency} to order with {self._total.currency}"
            ))

        if amount.amount <= 0:
            return Result.failure(Error.validation(
                "Order.InvalidAmount",
                "Amount must be positive",
                {"amount": str(amount.amount)}
            ))

        self._total = Money(self._total.amount + amount.amount, self._total.currency)
        return Result.success(None)


def main():
    """Demonstrate the Architecture.Core implementation"""
    print("=== Architecture.Core Python Django Implementation Demo ===\n")

    # Example 1: Value Objects
    print("1. Value Objects Example:")
    money1 = Money(Decimal('100.50'), 'USD')
    money2 = Money(Decimal('100.50'), 'USD')
    money3 = Money(Decimal('100.50'), 'EUR')

    print(f"money1: {money1}")
    print(f"money1 == money2: {money1 == money2}")  # True - same values
    print(f"money1 == money3: {money1 == money3}")  # False - different currency
    print()

    # Example 2: Aggregates and Events
    print("2. Aggregate Root and Domain Events:")
    order_id = OrderId("ORD-123456")
    order = Order(order_id, "John Doe")

    print(f"Order created: {order.id}")
    print(f"Customer: {order.customer_name}")
    print(f"Initial total: {order.total}")
    print(f"Domain events: {len(order.domain_events)}")
    print()

    # Example 3: Functional Error Handling
    print("3. Result-based Error Handling:")

    # Success case
    add_result = order.add_amount(Money(Decimal('25.50'), 'USD'))
    add_result.match(
        on_success=lambda _: print("✓ Successfully added amount"),
        on_failure=lambda e: print(f"✗ Failed: {e.message}")
    )
    print(f"New total: {order.total}")

    # Failure case - currency mismatch
    error_result = order.add_amount(Money(Decimal('15.00'), 'EUR'))
    error_result.match(
        on_success=lambda _: print("✓ Successfully added amount"),
        on_failure=lambda e: print(f"✗ Failed: {e.message}")
    )
    print()

    # Example 4: Maybe Type Usage
    print("4. Maybe Type for Safe Navigation:")

    def find_order_by_id(order_id: str) -> Maybe[Order]:
        """Simulate database lookup that might not find the order"""
        if order_id == "ORD-123456":
            return Maybe.some(order)
        return Maybe.none()

    # Found case
    found_order = find_order_by_id("ORD-123456")
    customer = found_order.map(lambda o: o.customer_name).or_else("Unknown")
    print(f"Customer for ORD-123456: {customer}")

    # Not found case
    missing_order = find_order_by_id("ORD-999999")
    missing_customer = missing_order.map(lambda o: o.customer_name).or_else("Unknown")
    print(f"Customer for ORD-999999: {missing_customer}")
    print()

    # Example 5: Operation Chaining
    print("5. Functional Composition:")

    def process_order(order: Order) -> Result[str]:
        """Simulate order processing with chained operations"""
        return (Result.success(order)
                .bind(lambda o: o.add_amount(Money(Decimal('10.00'), 'USD')).map(lambda _: o))
                .bind(lambda o: o.add_amount(Money(Decimal('5.75'), 'USD')).map(lambda _: o))
                .map(lambda o: f"Order {o.id} processed with total {o.total}"))

    process_result = process_order(order)
    process_result.match(
        on_success=lambda msg: print(f"✓ {msg}"),
        on_failure=lambda e: print(f"✗ Processing failed: {e.message}")
    )

    print(f"\nFinal order total: {order.total}")
    print(f"Total domain events: {len(order.domain_events)}")

    print("\n=== Demo Complete ===")


if __name__ == "__main__":
    main()