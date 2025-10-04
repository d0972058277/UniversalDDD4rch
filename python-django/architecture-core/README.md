# Architecture.Core - Python

Pure Python implementation of Universal DDD Architecture core abstractions and functional types.

[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Overview

Architecture.Core provides battle-tested DDD building blocks and functional programming patterns for building robust, maintainable Python applications. Zero external runtime dependencies.

### Key Features

- **Pure Python Standard Library** - Zero runtime dependencies
- **Domain-Driven Design** - Complete abstractions (AggregateRoot, Entity, ValueObject, DomainEvent)
- **Functional Error Handling** - Result/Maybe monads for type-safe error handling
- **Type-Safe** - Full Python 3.11+ generic type support
- **Async-First** - Native async/await support throughout
- **Multi-Language Consistency** - Consistent API with C#, Java, Go, and TypeScript implementations

## Installation

```bash
pip install architecture-core
```

## Quick Start

```python
from dataclasses import dataclass
from decimal import Decimal
from architecture_core.domain import AggregateRoot, ValueObject, EntityId
from architecture_core.functional import Result, Error

# Define value objects
@dataclass(frozen=True)
class Money(ValueObject):
    amount: Decimal
    currency: str

    def get_equality_components(self):
        yield self.amount
        yield self.currency

# Define entity IDs
@dataclass(frozen=True)
class OrderId(EntityId[str]):
    value: str

# Define aggregates
class Order(AggregateRoot[OrderId]):
    def __init__(self, id: OrderId, customer_name: str):
        super().__init__(id)
        self._customer_name = customer_name
        self._total = Money(Decimal('0'), 'USD')

    def add_item(self, price: Money) -> Result[None]:
        if price.currency != self._total.currency:
            return Result.failure(Error.domain(
                "Order.CurrencyMismatch",
                "Cannot mix currencies in order"
            ))

        self._total = Money(
            self._total.amount + price.amount,
            self._total.currency
        )
        return Result.success(None)
```

## Core Components

### DDD Abstractions

- **`AggregateRoot[TId]`** - Base class for aggregates with version control and event collection
- **`Entity[TId]`** - Identity-based equality for entities
- **`ValueObject`** - Structural equality via `get_equality_components()`
- **`DomainEventBase`** - Domain events with correlation/causation tracking
- **`IRepository[TAggregate, TId]`** - Async repository interface

### Functional Types

- **`Result[T]`** - Monadic error handling with `map`, `bind`, `match`
- **`Maybe[T]`** - Optional values with `map`, `bind`, `or_else`
- **`Error`** - Categorized errors (Domain, Validation, Infrastructure, etc.)

## Documentation

- [API Reference](https://architecture-core-python.readthedocs.io/)
- [Migration Guide](../MIGRATION.md)
- [Examples](./examples/)

## License

MIT License - see LICENSE file for details.
