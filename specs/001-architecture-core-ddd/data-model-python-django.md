# Data Model: Python Django Architecture.Core

**Date**: 2025-09-22
**Context**: Architecture.Core implementation for Python Django
**Source**: Feature specification and research findings

## Entity Definitions

### 1. Core Abstractions

#### EntityId Protocol
```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class EntityId(Protocol):
    """Protocol for entity identifiers"""
    def __str__(self) -> str: ...
    def __eq__(self, other: object) -> bool: ...
    def __hash__(self) -> int: ...
```

**Validation Rules**:
- Must be hashable and implement equality comparison
- String representation must be non-empty
- Equality must be consistent with hash

**State Transitions**: Immutable - no state changes after creation

#### AggregateRoot[TId]
```python
from typing import TypeVar, Generic, List
from abc import ABC

TId = TypeVar('TId', bound=EntityId)

class AggregateRoot(Generic[TId], ABC):
    """Base class for domain aggregate roots"""

    def __init__(self, id: TId, version: int = 0) -> None:
        self._id = id
        self._version = version
        self._domain_events: List[DomainEvent] = []

    @property
    def id(self) -> TId:
        return self._id

    @property
    def version(self) -> int:
        return self._version

    @property
    def domain_events(self) -> List[DomainEvent]:
        return self._domain_events.copy()

    def add_event(self, event: DomainEvent) -> None:
        """Add domain event to collection"""
        self._domain_events.append(event)

    def clear_events(self) -> None:
        """Clear all domain events"""
        self._domain_events.clear()

    def increment_version(self) -> None:
        """Increment version for optimistic concurrency"""
        self._version += 1
```

**Validation Rules**:
- ID must be non-null and immutable
- Version must be non-negative
- Domain events must be append-only until cleared
- Version increments must be sequential

**State Transitions**:
- Created → Active (with events) → Cleared (events removed)
- Version: 0 → 1 → 2 → ... (monotonic increase)

#### Entity[TId]
```python
class Entity(Generic[TId], ABC):
    """Base class for domain entities"""

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

**Validation Rules**:
- ID must be non-null and immutable
- Identity-based equality (only ID matters)
- Hash code consistent with equality

**State Transitions**: Immutable identity, mutable properties

#### ValueObject
```python
from abc import ABC, abstractmethod
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
```

**Validation Rules**:
- Must implement get_equality_components()
- Components must be hashable
- Structural equality based on all components
- Immutable after creation

**State Transitions**: Immutable - no state changes allowed

#### DomainEvent Interface and Base
```python
from typing import Protocol, Optional
from dataclasses import dataclass
from datetime import datetime
import uuid

class DomainEvent(Protocol):
    """Interface for domain events"""
    id: str
    occurred_at: datetime
    correlation_id: Optional[str]
    causation_id: Optional[str]

@dataclass(frozen=True)
class DomainEventBase:
    """Base implementation for domain events"""
    id: str
    occurred_at: datetime
    correlation_id: Optional[str] = None
    causation_id: Optional[str] = None

    def __post_init__(self) -> None:
        if not self.id:
            object.__setattr__(self, 'id', str(uuid.uuid4()))
        if self.occurred_at is None:
            object.__setattr__(self, 'occurred_at', datetime.utcnow())
```

**Validation Rules**:
- ID must be unique and non-empty
- OccurredAt must be valid datetime
- CorrelationId and CausationId are optional but must be valid if provided
- Events are immutable after creation

**State Transitions**: Immutable - created once and never modified

### 2. Functional Types

#### Result[T]
```python
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
    """Structured error information"""
    code: str
    message: str
    category: ErrorCategory
    metadata: dict[str, object] = None

    def __post_init__(self) -> None:
        if self.metadata is None:
            object.__setattr__(self, 'metadata', {})

class Result(Generic[T]):
    """Functional result type for error handling"""

    def __init__(self, value: T | None = None, error: Error | None = None) -> None:
        if (value is None and error is None) or (value is not None and error is not None):
            raise ValueError("Result must have either value or error, not both or neither")
        self._value = value
        self._error = error
        self._is_success = error is None

    @classmethod
    def success(cls, value: T) -> 'Result[T]':
        return cls(value=value)

    @classmethod
    def failure(cls, error: Error) -> 'Result[T]':
        return cls(error=error)

    @property
    def is_success(self) -> bool:
        return self._is_success

    @property
    def is_failure(self) -> bool:
        return not self._is_success

    @property
    def value(self) -> T:
        if not self.is_success:
            raise ValueError("Cannot access value of failed result")
        return self._value

    @property
    def error(self) -> Error:
        if self.is_success:
            raise ValueError("Cannot access error of successful result")
        return self._error

    def map(self, func: Callable[[T], U]) -> 'Result[U]':
        """Map function over success value"""
        if self.is_success:
            try:
                return Result.success(func(self._value))
            except Exception as e:
                return Result.failure(Error(
                    "Mapping.Failed",
                    str(e),
                    ErrorCategory.INFRASTRUCTURE
                ))
        return Result.failure(self._error)

    def bind(self, func: Callable[[T], 'Result[U]']) -> 'Result[U]':
        """Monadic bind operation"""
        if self.is_success:
            return func(self._value)
        return Result.failure(self._error)

    def match(self, on_success: Callable[[T], U], on_failure: Callable[[Error], U]) -> U:
        """Pattern matching for result"""
        if self.is_success:
            return on_success(self._value)
        return on_failure(self._error)
```

**Validation Rules**:
- Must have either value or error, never both or neither
- Error must have valid code, message, and category
- Monadic operations must maintain type safety
- Map/bind operations must handle exceptions properly

**State Transitions**: Immutable - Success or Failure state never changes

#### Maybe[T]
```python
class Maybe(Generic[T]):
    """Optional value type with monadic operations"""

    def __init__(self, value: T | None = None) -> None:
        self._value = value
        self._has_value = value is not None

    @classmethod
    def some(cls, value: T) -> 'Maybe[T]':
        if value is None:
            raise ValueError("Cannot create Some with None value")
        return cls(value)

    @classmethod
    def none(cls) -> 'Maybe[T]':
        return cls()

    @property
    def has_value(self) -> bool:
        return self._has_value

    @property
    def value(self) -> T:
        if not self.has_value:
            raise ValueError("Cannot access value of None")
        return self._value

    def map(self, func: Callable[[T], U]) -> 'Maybe[U]':
        """Map function over Some value"""
        if self.has_value:
            try:
                result = func(self._value)
                return Maybe.some(result) if result is not None else Maybe.none()
            except Exception:
                return Maybe.none()
        return Maybe.none()

    def bind(self, func: Callable[[T], 'Maybe[U]']) -> 'Maybe[U]':
        """Monadic bind operation"""
        if self.has_value:
            return func(self._value)
        return Maybe.none()

    def or_else(self, default: T) -> T:
        """Get value or default"""
        return self._value if self.has_value else default

    def or_else_get(self, func: Callable[[], T]) -> T:
        """Get value or call function for default"""
        return self._value if self.has_value else func()
```

**Validation Rules**:
- Cannot create Some with None value
- Some must have non-null value
- None represents absence of value
- Monadic operations preserve None state

**State Transitions**: Immutable - Some or None state never changes

### 3. Repository Interfaces

#### Repository[TAggregate, TId]
```python
from typing import Protocol
import asyncio

class Repository(Generic[TAggregate, TId], Protocol):
    """Generic repository interface for aggregates"""

    async def get_by_id_async(self, id: TId) -> Maybe[TAggregate]:
        """Get aggregate by ID"""
        ...

    async def add_async(self, aggregate: TAggregate) -> Result[None]:
        """Add new aggregate"""
        ...

    async def update_async(self, aggregate: TAggregate) -> Result[None]:
        """Update existing aggregate"""
        ...

    async def delete_async(self, id: TId) -> Result[None]:
        """Delete aggregate by ID"""
        ...

    async def exists_async(self, id: TId) -> bool:
        """Check if aggregate exists"""
        ...
```

**Validation Rules**:
- All operations must be async with cancellation support
- Add operations must validate aggregate before persistence
- Update operations must handle optimistic concurrency conflicts
- Delete operations must handle non-existent entities gracefully
- Get operations return Maybe to represent optional results

**State Transitions**: Repository state is stateless, only manages aggregate persistence

### 4. Django Integration Types

#### DjangoModelMixin
```python
from django.db import models

class AggregateRootModelMixin(models.Model):
    """Django model mixin for aggregate roots"""
    version = models.BigIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

    def increment_version(self) -> None:
        """Increment version for optimistic concurrency"""
        self.version += 1
```

**Validation Rules**:
- Version must be non-negative and auto-incrementing
- Created/Updated timestamps must be auto-managed
- Must be used as mixin, not standalone model

**State Transitions**: Django model lifecycle with version tracking

## Relationships

### Core Type Relationships
- `AggregateRoot[TId]` contains `List[DomainEvent]`
- `Entity[TId]` uses `EntityId` for identity
- `ValueObject` contains components via `get_equality_components()`
- `Repository[TAggregate, TId]` manages `AggregateRoot[TId]` instances

### Functional Type Relationships
- `Result[T]` contains either `T` value or `Error`
- `Maybe[T]` contains optional `T` value
- `Error` categorizes failures with `ErrorCategory`

### Django Integration Relationships
- `AggregateRootModelMixin` extends Django `Model`
- Django repositories implement core `Repository[TAggregate, TId]` interface
- Model-to-domain mapping preserves aggregate boundaries

## Implementation Notes

### Performance Considerations
- Use `__slots__` for memory efficiency in base classes
- Cache hash codes for entities and value objects
- Lazy evaluation for expensive operations
- Async-first design for I/O operations

### Type Safety
- Full generic type support with proper variance
- Protocol-based constraints for entity IDs
- Runtime type checking where necessary
- mypy/pyright compatibility

### Django Compatibility
- Support Django 4.1+ async ORM operations
- Optional Django integration package
- Model mixins for DDD patterns
- Transaction boundary management

### Testing Requirements
- Property-based testing for monadic laws
- Comprehensive edge case coverage
- Mock-friendly repository interfaces
- Performance benchmarking suite

This data model provides the foundation for implementing the Python Django Architecture.Core library while maintaining consistency with other language implementations and adhering to constitutional DDD principles.