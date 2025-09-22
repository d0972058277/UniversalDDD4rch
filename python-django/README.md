# Architecture.Core - Python Django Implementation

DDD core abstractions and functional types for Python applications with optional Django integration.

## Features

- Pure Python standard library core (zero runtime dependencies)
- Optional Django 4+ integration package
- Functional error handling with Result/Maybe types
- Complete DDD abstractions (AggregateRoot, Entity, ValueObject)
- Domain event sourcing support
- Async repository patterns
- Type-safe with Python 3.12+ generics

## Installation

```bash
pip install architecture-core

# Optional Django integration
pip install architecture-core[django]
```

## Quick Start

```python
from architecture_core.domain import AggregateRoot, ValueObject
from architecture_core.functional import Result, Maybe

# Define value objects
@dataclass(frozen=True)
class Money(ValueObject):
    amount: Decimal
    currency: str

    def get_equality_components(self):
        yield self.amount
        yield self.currency

# Define aggregates
class Order(AggregateRoot[OrderId]):
    def __init__(self, id: OrderId, customer_name: str):
        super().__init__(id)
        self._customer_name = customer_name
        self._total = Money(Decimal('0'), 'USD')

    def add_item(self, price: Money) -> Result[None]:
        # Business logic with functional error handling
        if price.currency != self._total.currency:
            return Result.failure(Error.domain(
                "Order.CurrencyMismatch",
                "Cannot mix currencies"
            ))

        self._total = Money(
            self._total.amount + price.amount,
            self._total.currency
        )
        return Result.success(None)
```

## Documentation

See the full documentation at [Architecture.Core Python Docs](https://architecture-core-python.readthedocs.io/).

## License

MIT License - see LICENSE file for details.