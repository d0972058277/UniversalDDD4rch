"""
Architecture.Core - DDD Abstractions and Functional Types for Python

A comprehensive library providing core Domain-Driven Design abstractions and functional
programming types for Python applications. Features pure Python standard library
implementation with optional Django integration.

Core Components:
- Domain abstractions: AggregateRoot, Entity, ValueObject, DomainEvent
- Functional types: Result, Maybe, Error with monadic operations
- Repository patterns with async support
- Type-safe entity identifiers

Usage:
    Basic functional programming:
    >>> from architecture_core.functional import Result, Maybe, Error
    >>> result = Result.success(42).map(lambda x: x * 2)
    >>> print(result.value)  # 84

    Domain modeling:
    >>> from architecture_core.domain import AggregateRoot, ValueObject
    >>> class Money(ValueObject):
    ...     def __init__(self, amount: float, currency: str):
    ...         self.amount = amount
    ...         self.currency = currency
    ...
    ...     def get_equality_components(self):
    ...         yield self.amount
    ...         yield self.currency

Performance:
- Sub-millisecond aggregate operations
- Memory-efficient value object equality
- Zero external runtime dependencies

Author: Architecture Team
License: MIT
"""

from architecture_core.domain import (
    AggregateRoot,
    Entity,
    ValueObject,
    DomainEvent,
    DomainEventBase,
)

from architecture_core.functional import (
    Result,
    Maybe,
    Error,
    ErrorCategory,
)

__version__ = "1.0.0"
__author__ = "Architecture Team"
__license__ = "MIT"

__all__ = [
    # Domain abstractions
    "AggregateRoot",
    "Entity",
    "ValueObject",
    "DomainEvent",
    "DomainEventBase",
    # Functional types
    "Result",
    "Maybe",
    "Error",
    "ErrorCategory",
    # Package metadata
    "__version__",
    "__author__",
    "__license__",
]