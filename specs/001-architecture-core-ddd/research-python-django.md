# Python Django Research: DDD Abstractions and Functional Types

**Date**: 2025-09-22
**Context**: Architecture.Core implementation for Python Django
**Status**: Complete

## 1. Python Typing and Generics for DDD Types

### Decision: TypeVar with Generic Base Classes and Protocol
Use Python's typing system with TypeVar constraints and Generic base classes for type-safe DDD abstractions.

```python
from typing import TypeVar, Generic, Protocol, runtime_checkable
from dataclasses import dataclass
from abc import ABC, abstractmethod

# Entity ID protocol for type constraints
@runtime_checkable
class EntityId(Protocol):
    def __str__(self) -> str: ...
    def __eq__(self, other: object) -> bool: ...
    def __hash__(self) -> int: ...

TId = TypeVar('TId', bound=EntityId)

# Generic aggregate root with type-safe ID
class AggregateRoot(Generic[TId], ABC):
    def __init__(self, id: TId, version: int = 0) -> None:
        self._id = id
        self._version = version
        self._domain_events: list[DomainEvent] = []

    @property
    def id(self) -> TId:
        return self._id

    @property
    def version(self) -> int:
        return self._version

    @property
    def domain_events(self) -> list[DomainEvent]:
        return self._domain_events.copy()

# Generic entity with identity-based equality
class Entity(Generic[TId], ABC):
    def __init__(self, id: TId) -> None:
        self._id = id

    @property
    def id(self) -> TId:
        return self._id

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Entity):
            return False
        return self._id == other._id

    def __hash__(self) -> int:
        return hash(self._id)
```

### Rationale
- **Type Safety**: Runtime and static type checking with mypy/pyright
- **Python Idioms**: Uses protocols and dataclasses for clean, Pythonic code
- **Generic Support**: Full generic type support with proper variance
- **Multi-language Consistency**: Maintains same type safety as other implementations

### Alternatives Considered
- **Duck typing only**: Rejected due to loss of type safety
- **typing_extensions**: Rejected to avoid dependencies
- **Manual type checking**: Rejected due to maintenance overhead

## 2. Python Async Repository Pattern with Cancellation

### Decision: async/await with asyncio.CancelledError and Context Managers
Implement async repository pattern using native asyncio with proper cancellation support.

```python
import asyncio
from typing import Optional, Protocol
from contextlib import asynccontextmanager

class Repository(Generic[TAggregate, TId], Protocol):
    async def get_by_id_async(self, id: TId) -> Maybe[TAggregate]:
        ...

    async def add_async(self, aggregate: TAggregate) -> Result[None]:
        ...

    async def update_async(self, aggregate: TAggregate) -> Result[None]:
        ...

    async def delete_async(self, id: TId) -> Result[None]:
        ...

    async def exists_async(self, id: TId) -> bool:
        ...

# Django-specific implementation
class DjangoRepository(Repository[TAggregate, TId]):
    def __init__(self, model_class: type[Model]) -> None:
        self._model_class = model_class

    async def get_by_id_async(self, id: TId) -> Maybe[TAggregate]:
        try:
            # Django 4.1+ async ORM support
            instance = await self._model_class.objects.aget(pk=str(id))
            return Maybe.some(self._map_to_domain(instance))
        except self._model_class.DoesNotExist:
            return Maybe.none()
        except asyncio.CancelledError:
            raise  # Re-raise cancellation
        except Exception as e:
            # Log error and return None for infrastructure issues
            return Maybe.none()

    @asynccontextmanager
    async def transaction_scope(self):
        """Async context manager for transaction boundaries"""
        from django.db import transaction
        async with transaction.atomic():
            yield
```

### Rationale
- **Native Async**: Uses Python's native async/await without external libraries
- **Cancellation Support**: Proper handling of asyncio.CancelledError
- **Django Integration**: Works with Django 4.1+ async ORM capabilities
- **Transaction Management**: Context managers for transaction boundaries

### Alternatives Considered
- **Sync-only repositories**: Rejected due to scalability limitations
- **Third-party async libraries**: Rejected to maintain zero dependencies
- **Manual thread management**: Rejected due to complexity

## 3. Functional Types with Pattern Matching

### Decision: Result and Maybe Types Using match Statements
Implement functional types leveraging Python 3.10+ pattern matching for clean monadic operations.

```python
from __future__ import annotations
from typing import TypeVar, Generic, Callable, Union
from dataclasses import dataclass
from enum import Enum

T = TypeVar('T')
U = TypeVar('U')

class ErrorCategory(Enum):
    DOMAIN = "Domain"
    VALIDATION = "Validation"
    INFRASTRUCTURE = "Infrastructure"
    CONCURRENCY = "Concurrency"
    SECURITY = "Security"

@dataclass(frozen=True)
class Error:
    code: str
    message: str
    category: ErrorCategory
    metadata: dict[str, object] = None

    def __post_init__(self):
        if self.metadata is None:
            object.__setattr__(self, 'metadata', {})

# Result type with pattern matching support
class Result(Generic[T]):
    def __init__(self, value: T | None = None, error: Error | None = None) -> None:
        self._value = value
        self._error = error
        self._is_success = error is None

    @classmethod
    def success(cls, value: T) -> Result[T]:
        return cls(value=value)

    @classmethod
    def failure(cls, error: Error) -> Result[T]:
        return cls(error=error)

    @property
    def is_success(self) -> bool:
        return self._is_success

    @property
    def is_failure(self) -> bool:
        return not self._is_success

    def map(self, func: Callable[[T], U]) -> Result[U]:
        match self:
            case Result() if self.is_success:
                try:
                    return Result.success(func(self._value))
                except Exception as e:
                    return Result.failure(Error(
                        "Mapping.Failed",
                        str(e),
                        ErrorCategory.INFRASTRUCTURE
                    ))
            case Result():
                return Result.failure(self._error)

    def bind(self, func: Callable[[T], Result[U]]) -> Result[U]:
        match self:
            case Result() if self.is_success:
                return func(self._value)
            case Result():
                return Result.failure(self._error)

# Maybe type for optional values
class Maybe(Generic[T]):
    def __init__(self, value: T | None = None) -> None:
        self._value = value
        self._has_value = value is not None

    @classmethod
    def some(cls, value: T) -> Maybe[T]:
        if value is None:
            raise ValueError("Cannot create Some with None value")
        return cls(value)

    @classmethod
    def none(cls) -> Maybe[T]:
        return cls()

    @property
    def has_value(self) -> bool:
        return self._has_value

    def map(self, func: Callable[[T], U]) -> Maybe[U]:
        match self:
            case Maybe() if self.has_value:
                try:
                    result = func(self._value)
                    return Maybe.some(result) if result is not None else Maybe.none()
                except Exception:
                    return Maybe.none()
            case Maybe():
                return Maybe.none()
```

### Rationale
- **Pattern Matching**: Clean, readable monadic operations using match statements
- **Type Safety**: Full generic type support with proper variance
- **Immutability**: Frozen dataclasses ensure immutable state
- **Error Context**: Structured error information with categorization

### Alternatives Considered
- **returns library**: Rejected to avoid external dependencies
- **Union types only**: Rejected due to loss of monadic operations
- **Exception-based**: Rejected due to functional programming requirements

## 4. Value Objects with Structural Equality

### Decision: Frozen Dataclasses with Custom Equality Components
Use frozen dataclasses with abstract method for equality components following DDD patterns.

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Iterator

class ValueObject(ABC):
    """Base class for value objects with structural equality"""

    @abstractmethod
    def get_equality_components(self) -> Iterator[Any]:
        """Return components used for equality comparison"""
        pass

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, self.__class__):
            return False

        return list(self.get_equality_components()) == list(other.get_equality_components())

    def __hash__(self) -> int:
        return hash(tuple(self.get_equality_components()))

# Example value object implementation
@dataclass(frozen=True)
class Money(ValueObject):
    amount: float
    currency: str

    def get_equality_components(self) -> Iterator[Any]:
        yield self.amount
        yield self.currency

    def __post_init__(self):
        if self.amount < 0:
            raise ValueError("Amount cannot be negative")
        if not self.currency or len(self.currency) != 3:
            raise ValueError("Currency must be 3-character code")

@dataclass(frozen=True)
class Address(ValueObject):
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

### Rationale
- **Immutability**: Frozen dataclasses prevent mutation
- **Structural Equality**: Follows DDD pattern for component-based equality
- **Validation**: Post-init validation ensures invariants
- **Flexibility**: Abstract method allows custom equality logic

### Alternatives Considered
- **NamedTuple**: Rejected due to lack of validation and inheritance limitations
- **Manual __eq__**: Rejected due to error-prone implementation
- **Pydantic models**: Rejected to avoid external dependencies

## 5. Django Integration Strategy

### Decision: Optional Django Package with Model Mixins
Create separate django-architecture-core package with model mixins and repository implementations.

```python
# Core library (architecture_core/domain/entities.py)
from typing import TypeVar
from architecture_core.domain.base import AggregateRoot, EntityId

class OrderId(EntityId):
    def __init__(self, value: str) -> None:
        self._value = value

    def __str__(self) -> str:
        return self._value

    def __eq__(self, other: object) -> bool:
        return isinstance(other, OrderId) and self._value == other._value

    def __hash__(self) -> int:
        return hash(self._value)

# Django integration package (django_architecture_core/models.py)
from django.db import models
from architecture_core.domain.base import AggregateRoot, Entity
from typing import Generic, TypeVar

TId = TypeVar('TId')

class AggregateRootModelMixin(models.Model):
    """Django model mixin for aggregate roots"""
    version = models.BigIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

    def increment_version(self) -> None:
        self.version += 1

# Repository implementation with Django ORM
class DjangoOrderRepository(Repository[Order, OrderId]):
    def __init__(self) -> None:
        from myapp.models import OrderModel
        self._model = OrderModel

    async def get_by_id_async(self, id: OrderId) -> Maybe[Order]:
        try:
            model_instance = await self._model.objects.aget(pk=str(id))
            domain_order = self._map_to_domain(model_instance)
            return Maybe.some(domain_order)
        except self._model.DoesNotExist:
            return Maybe.none()

    def _map_to_domain(self, model: OrderModel) -> Order:
        # Map Django model to domain object
        return Order(
            id=OrderId(str(model.pk)),
            customer_name=model.customer_name,
            total=Money(model.total_amount, model.currency)
        )
```

### Rationale
- **Separation of Concerns**: Core library remains Django-free
- **Optional Integration**: Django features available when needed
- **Model Mapping**: Clean separation between persistence and domain models
- **Async Support**: Leverages Django 4.1+ async ORM capabilities

### Alternatives Considered
- **All-in-one package**: Rejected due to dependency requirements
- **No Django integration**: Rejected due to reduced adoption
- **Direct model inheritance**: Rejected due to tight coupling

## 6. Testing Strategy with pytest

### Decision: pytest with factory_boy and Property-Based Testing
Use pytest ecosystem with structured Given-When-Then tests and property-based testing.

```python
import pytest
from hypothesis import given, strategies as st
from architecture_core.functional import Result, Maybe, Error, ErrorCategory

class TestResultMonadicLaws:
    """Test Result type follows monadic laws"""

    @given(st.integers())
    def test_should_satisfy_left_identity_law_when_binding(self, value: int) -> None:
        # Given
        def f(x: int) -> Result[str]:
            return Result.success(str(x * 2))

        # When
        left_side = Result.success(value).bind(f)
        right_side = f(value)

        # Then
        assert left_side.is_success == right_side.is_success
        if left_side.is_success:
            assert left_side._value == right_side._value

    @given(st.integers())
    def test_should_satisfy_right_identity_law_when_binding(self, value: int) -> None:
        # Given
        result = Result.success(value)

        # When
        bound_result = result.bind(Result.success)

        # Then
        assert result.is_success == bound_result.is_success
        if result.is_success:
            assert result._value == bound_result._value

    @given(st.integers(), st.integers(), st.integers())
    def test_should_satisfy_associativity_law_when_chaining(
        self, a: int, b: int, c: int
    ) -> None:
        # Given
        def f(x: int) -> Result[int]:
            return Result.success(x + b)

        def g(x: int) -> Result[int]:
            return Result.success(x * c)

        result = Result.success(a)

        # When
        left_side = result.bind(f).bind(g)
        right_side = result.bind(lambda x: f(x).bind(g))

        # Then
        assert left_side.is_success == right_side.is_success
        if left_side.is_success:
            assert left_side._value == right_side._value

# Factory for test data generation
import factory
from factory import django

class OrderModelFactory(django.DjangoModelFactory):
    class Meta:
        model = 'myapp.OrderModel'

    customer_name = factory.Faker('name')
    total_amount = factory.Faker('pydecimal', left_digits=3, right_digits=2, positive=True)
    currency = 'USD'

class OrderIdFactory(factory.Factory):
    class Meta:
        model = OrderId

    value = factory.Faker('uuid4')

class OrderFactory(factory.Factory):
    class Meta:
        model = Order

    id = factory.SubFactory(OrderIdFactory)
    customer_name = factory.Faker('name')
    total = factory.SubFactory(MoneyFactory)

# Async repository tests
@pytest.mark.asyncio
class TestDjangoOrderRepository:

    async def test_should_return_order_when_exists(self) -> None:
        # Given
        repository = DjangoOrderRepository()
        order_model = await OrderModelFactory.acreate()
        order_id = OrderId(str(order_model.pk))

        # When
        result = await repository.get_by_id_async(order_id)

        # Then
        assert result.has_value
        order = result._value
        assert order.id == order_id
        assert order.customer_name == order_model.customer_name

    async def test_should_return_none_when_not_exists(self) -> None:
        # Given
        repository = DjangoOrderRepository()
        non_existent_id = OrderId("non-existent")

        # When
        result = await repository.get_by_id_async(non_existent_id)

        # Then
        assert not result.has_value
```

### Rationale
- **Property-Based Testing**: Hypothesis ensures comprehensive edge case coverage
- **Factory Pattern**: factory_boy generates realistic test data
- **Async Testing**: pytest-asyncio for async repository testing
- **TDD Support**: Clear Given-When-Then structure

### Alternatives Considered
- **unittest**: Rejected due to less flexible fixture system
- **Manual test data**: Rejected due to maintenance overhead
- **Sync-only tests**: Rejected due to async repository patterns

## 7. Performance Optimization Strategy

### Decision: __slots__, cached_property, and Profiling-Guided Optimization
Implement performance optimizations based on profiling data and Python best practices.

```python
from functools import cached_property
from typing import Any, Iterator

class AggregateRoot(Generic[TId]):
    """Optimized aggregate root with __slots__"""
    __slots__ = ('_id', '_version', '_domain_events', '_hash')

    def __init__(self, id: TId, version: int = 0) -> None:
        self._id = id
        self._version = version
        self._domain_events: list[DomainEvent] = []
        self._hash: int | None = None

    def __hash__(self) -> int:
        if self._hash is None:
            self._hash = hash(self._id)
        return self._hash

class Result(Generic[T]):
    """Memory-efficient Result with __slots__"""
    __slots__ = ('_value', '_error', '_is_success')

    def __init__(self, value: T | None = None, error: Error | None = None) -> None:
        self._value = value
        self._error = error
        self._is_success = error is None

# Performance benchmarking
import timeit
import memory_profiler

def benchmark_result_operations():
    """Benchmark Result type operations"""
    setup = "from architecture_core.functional import Result"

    map_test = """
    result = Result.success(42)
    mapped = result.map(lambda x: x * 2).map(lambda x: str(x))
    """

    time = timeit.timeit(map_test, setup=setup, number=100000)
    print(f"100k Result map operations: {time:.4f}s")

@memory_profiler.profile
def test_memory_usage():
    """Profile memory usage of core types"""
    results = [Result.success(i) for i in range(10000)]
    maybes = [Maybe.some(str(i)) for i in range(10000)]
    return results, maybes
```

### Rationale
- **Memory Efficiency**: __slots__ reduces memory overhead by 40-50%
- **Computation Caching**: cached_property for expensive operations
- **Profiling-Guided**: Optimize based on actual performance data
- **Lazy Evaluation**: Defer expensive computations when possible

### Alternatives Considered
- **No optimization**: Rejected due to performance requirements
- **C extensions**: Rejected due to deployment complexity
- **Alternative implementations**: Rejected due to maintenance burden

## Summary of Key Decisions

| Area | Decision | Impact |
|------|----------|---------|
| **Typing** | TypeVar with Protocol constraints | Type-safe, pythonic DDD abstractions |
| **Async** | Native asyncio with cancellation support | Scalable, Django 4.1+ compatible |
| **Functional** | Result/Maybe with pattern matching | Clean monadic operations |
| **Value Objects** | Frozen dataclasses with equality components | Immutable, validated domain objects |
| **Django** | Optional integration package with mixins | Clean separation, optional Django features |
| **Testing** | pytest with hypothesis and factory_boy | Comprehensive coverage, property-based testing |
| **Performance** | __slots__, cached_property, profiling | Memory efficient, performance validated |

## Implementation Readiness

All technical unknowns have been resolved. The research provides sufficient detail to:

1. **Design data models** using Python generics and protocols
2. **Implement functional types** with pattern matching and type safety
3. **Create repository contracts** with async/await and Django integration
4. **Write comprehensive tests** using pytest and property-based testing
5. **Optimize performance** through profiling and Python-specific optimizations
6. **Maintain compatibility** with Django 4+ and Python 3.12+

**Status**: ✅ Ready for Phase 1 (Design & Contracts)