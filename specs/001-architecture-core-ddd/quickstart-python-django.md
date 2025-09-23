# Quickstart Guide: Python Django Architecture.Core

**Date**: 2025-09-22
**Context**: Architecture.Core implementation for Python Django
**Target Audience**: Python developers implementing DDD applications

## Installation

### Core Library (Zero Dependencies)
```bash
pip install architecture-core
```

### Django Integration (Optional)
```bash
pip install architecture-core[django]
# or
pip install django-architecture-core
```

### Development Dependencies
```bash
pip install architecture-core[dev]  # Includes pytest, factory_boy, hypothesis
```

## Quick Start Example

### 1. Define Entity IDs
```python
from dataclasses import dataclass
from architecture_core.domain import EntityId

@dataclass(frozen=True)
class OrderId:
    """Strongly typed order identifier"""
    value: str

    def __post_init__(self) -> None:
        if not self.value or not self.value.strip():
            raise ValueError("OrderId value cannot be empty")

    def __str__(self) -> str:
        return self.value

    def __eq__(self, other: object) -> bool:
        return isinstance(other, OrderId) and self.value == other.value

    def __hash__(self) -> int:
        return hash(self.value)

@dataclass(frozen=True)
class CustomerId:
    """Strongly typed customer identifier"""
    value: str

    def __str__(self) -> str:
        return self.value

    def __eq__(self, other: object) -> bool:
        return isinstance(other, CustomerId) and self.value == other.value

    def __hash__(self) -> int:
        return hash(self.value)
```

### 2. Create Value Objects
```python
from dataclasses import dataclass
from typing import Iterator, Any
from architecture_core.domain import ValueObject

@dataclass(frozen=True)
class Money(ValueObject):
    """Money value object with currency"""
    amount: float
    currency: str

    def __post_init__(self) -> None:
        if self.amount < 0:
            raise ValueError("Amount cannot be negative")
        if not self.currency or len(self.currency) != 3:
            raise ValueError("Currency must be 3-character code")

    def get_equality_components(self) -> Iterator[Any]:
        yield self.amount
        yield self.currency.upper()

    def add(self, other: 'Money') -> 'Money':
        if self.currency != other.currency:
            raise ValueError("Cannot add different currencies")
        return Money(self.amount + other.amount, self.currency)

@dataclass(frozen=True)
class Address(ValueObject):
    """Address value object"""
    street: str
    city: str
    postal_code: str
    country: str

    def get_equality_components(self) -> Iterator[Any]:
        yield self.street.strip().lower()
        yield self.city.strip().lower()
        yield self.postal_code.strip()
        yield self.country.strip().upper()
```

### 3. Define Domain Events
```python
from dataclasses import dataclass
from datetime import datetime
from architecture_core.domain import DomainEventBase

@dataclass(frozen=True)
class OrderCreated(DomainEventBase):
    """Event raised when order is created"""
    order_id: str
    customer_id: str
    total_amount: float
    currency: str

@dataclass(frozen=True)
class OrderShipped(DomainEventBase):
    """Event raised when order is shipped"""
    order_id: str
    tracking_number: str
    shipping_address: dict

@dataclass(frozen=True)
class OrderCancelled(DomainEventBase):
    """Event raised when order is cancelled"""
    order_id: str
    reason: str
```

### 4. Implement Aggregate Root
```python
from enum import Enum
from typing import List
from architecture_core.domain import AggregateRoot
import uuid

class OrderStatus(Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class Order(AggregateRoot[OrderId]):
    """Order aggregate root"""

    def __init__(self, id: OrderId, customer_id: CustomerId,
                 shipping_address: Address) -> None:
        super().__init__(id)
        self._customer_id = customer_id
        self._shipping_address = shipping_address
        self._status = OrderStatus.PENDING
        self._items: List[OrderItem] = []
        self._total = Money(0.0, "USD")

        # Raise domain event
        self.add_event(OrderCreated(
            id=str(uuid.uuid4()),
            occurred_at=datetime.utcnow(),
            order_id=str(id),
            customer_id=str(customer_id),
            total_amount=0.0,
            currency="USD"
        ))

    @property
    def customer_id(self) -> CustomerId:
        return self._customer_id

    @property
    def status(self) -> OrderStatus:
        return self._status

    @property
    def total(self) -> Money:
        return self._total

    @property
    def items(self) -> List['OrderItem']:
        return self._items.copy()

    def add_item(self, product_id: str, quantity: int, unit_price: Money) -> None:
        """Add item to order"""
        if self._status != OrderStatus.PENDING:
            raise ValueError("Cannot add items to non-pending order")

        if quantity <= 0:
            raise ValueError("Quantity must be positive")

        item = OrderItem(product_id, quantity, unit_price)
        self._items.append(item)
        self._total = self._total.add(Money(
            unit_price.amount * quantity,
            unit_price.currency
        ))
        self.increment_version()

    def confirm(self) -> None:
        """Confirm the order"""
        if self._status != OrderStatus.PENDING:
            raise ValueError("Can only confirm pending orders")

        if not self._items:
            raise ValueError("Cannot confirm order without items")

        self._status = OrderStatus.CONFIRMED
        self.increment_version()

    def ship(self, tracking_number: str) -> None:
        """Ship the order"""
        if self._status != OrderStatus.CONFIRMED:
            raise ValueError("Can only ship confirmed orders")

        self._status = OrderStatus.SHIPPED
        self.increment_version()

        self.add_event(OrderShipped(
            id=str(uuid.uuid4()),
            occurred_at=datetime.utcnow(),
            order_id=str(self.id),
            tracking_number=tracking_number,
            shipping_address=self._shipping_address.__dict__
        ))

    def cancel(self, reason: str) -> None:
        """Cancel the order"""
        if self._status in [OrderStatus.SHIPPED, OrderStatus.DELIVERED]:
            raise ValueError("Cannot cancel shipped or delivered orders")

        self._status = OrderStatus.CANCELLED
        self.increment_version()

        self.add_event(OrderCancelled(
            id=str(uuid.uuid4()),
            occurred_at=datetime.utcnow(),
            order_id=str(self.id),
            reason=reason
        ))

@dataclass(frozen=True)
class OrderItem(ValueObject):
    """Order item value object"""
    product_id: str
    quantity: int
    unit_price: Money

    def get_equality_components(self) -> Iterator[Any]:
        yield self.product_id
        yield self.quantity
        yield self.unit_price

    @property
    def total_price(self) -> Money:
        return Money(
            self.unit_price.amount * self.quantity,
            self.unit_price.currency
        )
```

### 5. Define Repository Interface
```python
from typing import List
from architecture_core.domain import Repository
from architecture_core.functional import Maybe, Result

class OrderRepository(Repository[Order, OrderId]):
    """Order repository interface"""

    async def find_by_customer_async(self, customer_id: CustomerId) -> List[Order]:
        """Find orders by customer"""
        ...

    async def find_by_status_async(self, status: OrderStatus) -> List[Order]:
        """Find orders by status"""
        ...
```

### 6. Use Functional Types

#### Result Type for Error Handling
```python
from architecture_core.functional import Result, Error, ErrorCategory

def create_order(customer_id: str, shipping_data: dict) -> Result[Order]:
    """Create new order with validation"""
    try:
        # Validate inputs
        if not customer_id.strip():
            return Result.failure(Error.validation(
                "Order.CustomerRequired",
                "Customer ID is required"
            ))

        # Create value objects
        customer = CustomerId(customer_id)
        address = Address(
            street=shipping_data.get('street', ''),
            city=shipping_data.get('city', ''),
            postal_code=shipping_data.get('postal_code', ''),
            country=shipping_data.get('country', '')
        )

        # Create aggregate
        order_id = OrderId(str(uuid.uuid4()))
        order = Order(order_id, customer, address)

        return Result.success(order)

    except ValueError as e:
        return Result.failure(Error.validation(
            "Order.ValidationFailed",
            str(e)
        ))
    except Exception as e:
        return Result.failure(Error.infrastructure(
            "Order.CreationFailed",
            "Failed to create order",
            e
        ))

# Usage
result = create_order("customer-123", {
    'street': '123 Main St',
    'city': 'Anytown',
    'postal_code': '12345',
    'country': 'USA'
})

# Pattern matching
match result:
    case Result() if result.is_success:
        order = result.value
        print(f"Order created: {order.id}")
    case Result() if result.is_failure:
        error = result.error
        print(f"Failed to create order: {error.message}")

# Functional composition
result = (create_order("customer-123", shipping_data)
    .bind(lambda order: add_items_to_order(order, items))
    .bind(lambda order: confirm_order(order))
    .map(lambda order: order.id))
```

#### Maybe Type for Optional Values
```python
from architecture_core.functional import Maybe

async def find_order_by_id(order_id: OrderId) -> Maybe[Order]:
    """Find order by ID"""
    # Repository implementation would go here
    pass

# Usage
maybe_order = await find_order_by_id(OrderId("order-123"))

# Safe access
customer_name = (maybe_order
    .map(lambda order: order.customer_id)
    .map(lambda customer_id: str(customer_id))
    .or_else("Unknown Customer"))

# Pattern matching
match maybe_order:
    case Maybe() if maybe_order.has_value:
        order = maybe_order.value
        print(f"Found order: {order.id}")
    case Maybe():
        print("Order not found")
```

## Django Integration

### 1. Django Models
```python
from django.db import models
from django_architecture_core.models import AggregateRootModelMixin

class OrderModel(AggregateRootModelMixin):
    """Django model for Order aggregate"""
    order_id = models.CharField(max_length=50, unique=True)
    customer_id = models.CharField(max_length=50)
    status = models.CharField(max_length=20)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3)

    # Address fields
    street = models.CharField(max_length=200)
    city = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=2)

    class Meta:
        db_table = 'orders'

class OrderItemModel(models.Model):
    """Django model for Order items"""
    order = models.ForeignKey(OrderModel, on_delete=models.CASCADE, related_name='items')
    product_id = models.CharField(max_length=50)
    quantity = models.IntegerField()
    unit_price_amount = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price_currency = models.CharField(max_length=3)

    class Meta:
        db_table = 'order_items'
```

### 2. Django Repository Implementation
```python
from django_architecture_core.repositories import DjangoRepository
from typing import List
from decimal import Decimal

class DjangoOrderRepository(DjangoRepository[Order, OrderId]):
    """Django ORM implementation of OrderRepository"""

    def __init__(self) -> None:
        super().__init__(OrderModel)

    def _map_to_domain(self, model: OrderModel) -> Order:
        """Map Django model to domain aggregate"""
        # Create value objects
        order_id = OrderId(model.order_id)
        customer_id = CustomerId(model.customer_id)
        address = Address(
            street=model.street,
            city=model.city,
            postal_code=model.postal_code,
            country=model.country
        )

        # Create aggregate
        order = Order(order_id, customer_id, address)
        order._status = OrderStatus(model.status)
        order._total = Money(float(model.total_amount), model.currency)
        order._version = model.version

        # Map items
        for item_model in model.items.all():
            item = OrderItem(
                product_id=item_model.product_id,
                quantity=item_model.quantity,
                unit_price=Money(
                    float(item_model.unit_price_amount),
                    item_model.unit_price_currency
                )
            )
            order._items.append(item)

        order.clear_events()  # Don't replay events on load
        return order

    def _map_to_model(self, order: Order) -> OrderModel:
        """Map domain aggregate to Django model"""
        return OrderModel(
            order_id=str(order.id),
            customer_id=str(order.customer_id),
            status=order.status.value,
            total_amount=Decimal(str(order.total.amount)),
            currency=order.total.currency,
            street=order._shipping_address.street,
            city=order._shipping_address.city,
            postal_code=order._shipping_address.postal_code,
            country=order._shipping_address.country,
            version=order.version
        )

    async def find_by_customer_async(self, customer_id: CustomerId) -> List[Order]:
        """Find orders by customer"""
        model_instances = [
            instance async for instance in
            OrderModel.objects.filter(customer_id=str(customer_id))
        ]
        return [self._map_to_domain(model) for model in model_instances]

    async def find_by_status_async(self, status: OrderStatus) -> List[Order]:
        """Find orders by status"""
        model_instances = [
            instance async for instance in
            OrderModel.objects.filter(status=status.value)
        ]
        return [self._map_to_domain(model) for model in model_instances]
```

### 3. Django Application Service
```python
from django.db import transaction
from architecture_core.functional import Result, Error

class OrderApplicationService:
    """Application service for order operations"""

    def __init__(self, repository: OrderRepository) -> None:
        self._repository = repository

    async def create_order_async(self, command: CreateOrderCommand) -> Result[OrderId]:
        """Create new order"""
        try:
            async with transaction.atomic():
                # Create order
                result = create_order(command.customer_id, command.shipping_address)
                if result.is_failure:
                    return Result.failure(result.error)

                order = result.value

                # Add items
                for item_data in command.items:
                    order.add_item(
                        item_data['product_id'],
                        item_data['quantity'],
                        Money(item_data['price'], item_data['currency'])
                    )

                # Save to repository
                save_result = await self._repository.add_async(order)
                if save_result.is_failure:
                    return Result.failure(save_result.error)

                return Result.success(order.id)

        except Exception as e:
            return Result.failure(Error.infrastructure(
                "Order.CreationFailed",
                "Failed to create order",
                e
            ))

@dataclass
class CreateOrderCommand:
    """Command to create new order"""
    customer_id: str
    shipping_address: dict
    items: List[dict]
```

## Testing Examples

### 1. Unit Tests with pytest
```python
import pytest
from hypothesis import given, strategies as st
from architecture_core.functional import Result, Maybe

class TestOrder:
    """Test suite for Order aggregate"""

    def test_should_create_order_when_valid_data(self) -> None:
        # Given
        order_id = OrderId("order-123")
        customer_id = CustomerId("customer-456")
        address = Address("123 Main St", "Anytown", "12345", "USA")

        # When
        order = Order(order_id, customer_id, address)

        # Then
        assert order.id == order_id
        assert order.customer_id == customer_id
        assert order.status == OrderStatus.PENDING
        assert len(order.domain_events) == 1
        assert isinstance(order.domain_events[0], OrderCreated)

    def test_should_add_item_when_order_pending(self) -> None:
        # Given
        order = self._create_test_order()
        unit_price = Money(10.0, "USD")

        # When
        order.add_item("product-123", 2, unit_price)

        # Then
        assert len(order.items) == 1
        assert order.total == Money(20.0, "USD")
        assert order.version == 1

    def test_should_raise_error_when_adding_item_to_confirmed_order(self) -> None:
        # Given
        order = self._create_test_order()
        order.add_item("product-123", 1, Money(10.0, "USD"))
        order.confirm()

        # When/Then
        with pytest.raises(ValueError, match="Cannot add items to non-pending order"):
            order.add_item("product-456", 1, Money(5.0, "USD"))

    def _create_test_order(self) -> Order:
        return Order(
            OrderId("order-123"),
            CustomerId("customer-456"),
            Address("123 Main St", "Anytown", "12345", "USA")
        )

class TestResultMonadicLaws:
    """Test Result type monadic laws"""

    @given(st.integers())
    def test_should_satisfy_left_identity_law(self, value: int) -> None:
        # Given
        f = lambda x: Result.success(str(x * 2))

        # When
        left_side = Result.success(value).bind(f)
        right_side = f(value)

        # Then
        assert left_side.is_success == right_side.is_success
        if left_side.is_success:
            assert left_side.value == right_side.value

class TestMoney:
    """Test Money value object"""

    def test_should_equal_when_same_amount_and_currency(self) -> None:
        # Given
        money1 = Money(10.0, "USD")
        money2 = Money(10.0, "USD")

        # When/Then
        assert money1 == money2
        assert hash(money1) == hash(money2)

    def test_should_not_equal_when_different_currency(self) -> None:
        # Given
        money1 = Money(10.0, "USD")
        money2 = Money(10.0, "EUR")

        # When/Then
        assert money1 != money2
```

### 2. Integration Tests with Django
```python
import pytest
from django.test import TransactionTestCase
from architecture_core.functional import Maybe

@pytest.mark.django_db
class TestDjangoOrderRepository:
    """Integration tests for Django repository"""

    async def test_should_save_and_retrieve_order(self) -> None:
        # Given
        repository = DjangoOrderRepository()
        order = self._create_test_order()

        # When
        save_result = await repository.add_async(order)
        retrieved = await repository.get_by_id_async(order.id)

        # Then
        assert save_result.is_success
        assert retrieved.has_value
        assert retrieved.value.id == order.id
        assert retrieved.value.customer_id == order.customer_id

    async def test_should_handle_optimistic_concurrency(self) -> None:
        # Given
        repository = DjangoOrderRepository()
        order = self._create_test_order()
        await repository.add_async(order)

        # When - simulate concurrent modification
        order1 = (await repository.get_by_id_async(order.id)).value
        order2 = (await repository.get_by_id_async(order.id)).value

        order1.add_item("product-1", 1, Money(10.0, "USD"))
        order2.add_item("product-2", 1, Money(15.0, "USD"))

        # Then
        result1 = await repository.update_async(order1)
        result2 = await repository.update_async(order2)

        assert result1.is_success
        assert result2.is_failure
        assert "concurrency" in result2.error.code.lower()
```

### 3. Performance Tests
```python
import time
from architecture_core.testing import PerformanceRequirements

class TestPerformance:
    """Performance validation tests"""

    def test_should_meet_aggregate_operation_performance(self) -> None:
        # Given
        order = self._create_test_order()

        # When
        start_time = time.perf_counter()
        for _ in range(1000):
            order.add_item("product", 1, Money(1.0, "USD"))
        end_time = time.perf_counter()

        # Then
        avg_time_ms = (end_time - start_time) * 1000 / 1000
        assert avg_time_ms < PerformanceRequirements.MAX_AGGREGATE_OPERATION_TIME_MS

    def test_should_meet_result_chain_performance(self) -> None:
        # Given
        operations = 10000

        # When
        start_time = time.perf_counter()
        result = Result.success(1)
        for i in range(operations):
            result = result.map(lambda x: x + 1)
        end_time = time.perf_counter()

        # Then
        avg_time_ms = (end_time - start_time) * 1000 / operations
        assert avg_time_ms < PerformanceRequirements.MAX_AGGREGATE_OPERATION_TIME_MS
```

## Best Practices

### 1. Error Handling
- Use `Result[T]` for business operations that can fail
- Use `Maybe[T]` for optional values instead of `None`
- Create specific error codes for different failure scenarios
- Include contextual metadata in errors

### 2. Aggregate Design
- Keep aggregates small and focused
- Use domain events to communicate between aggregates
- Implement invariants in aggregate methods
- Version aggregates for optimistic concurrency

### 3. Value Objects
- Make value objects immutable
- Implement proper equality comparison
- Validate invariants in constructor
- Use value objects to make domain concepts explicit

### 4. Repository Pattern
- Define interfaces in domain layer
- Implement in infrastructure layer
- Use async operations for I/O
- Handle concurrency conflicts gracefully

### 5. Testing Strategy
- Write tests before implementation (TDD)
- Test domain logic in isolation
- Use property-based testing for edge cases
- Validate performance requirements

This quickstart guide provides a comprehensive foundation for building DDD applications with Python Django using the Architecture.Core library.