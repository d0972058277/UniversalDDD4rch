# Universal DDD Architecture - Python

Multi-package Python implementation of Universal DDD Architecture providing core abstractions, functional types, and framework integrations.

[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Django](https://img.shields.io/badge/django-4.2+-green.svg)](https://docs.djangoproject.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 📦 Packages

This workspace contains three main packages:

### [architecture-core](./architecture-core/)
Pure Python DDD core abstractions and functional types with **zero external dependencies**.

- Domain-Driven Design primitives (AggregateRoot, Entity, ValueObject)
- Functional types (Result, Maybe, Error)
- Domain events and repository interfaces
- Type-safe with Python 3.11+ generics

### [architecture-django](./architecture-django/)
Django ORM integration for Architecture.Core.

- Django model base classes
- Repository pattern implementation
- Domain event persistence
- Async/await support

### [architecture-shell-cqrs](./architecture-shell-cqrs/)
CQRS mediator pattern implementation.

- Command/Query separation
- Pipeline behaviors for cross-cutting concerns
- Async request handling
- Dependency injection ready

## 🚀 Quick Start

### Installation

```bash
# Install core package
pip install architecture-core

# Install Django integration
pip install architecture-django

# Install CQRS mediator
pip install architecture-shell-cqrs
```

### Development Setup

```bash
# Install all packages in development mode
pip install -e architecture-core[dev]
pip install -e architecture-django[dev]
pip install -e architecture-shell-cqrs[dev]
```

## 🧪 Testing

### Quick Test Commands

**Just run pytest!** The project is configured to work out-of-the-box:

```bash
# Simply run pytest (318 tests) ✨
pytest

# Run with verbose output
pytest -v

# Run with coverage
pytest --cov

# Or use convenience scripts for specific test suites
./test-all.sh               # Comprehensive test with summary
./run-tests.sh contract     # Contract tests only
./run-tests.sh unit         # Unit tests only
./run-tests.sh core         # Core package tests

# Run specific test categories with pytest markers
pytest -m contract          # Contract tests (113 tests)
pytest -m unit              # Unit tests
pytest -m integration       # Integration tests
pytest -m performance       # Performance tests

# Run specific package tests
pytest architecture-core/tests/
pytest architecture-django/tests/
pytest architecture-shell-cqrs/tests/
```

**Why does `pytest` work directly?**

The `pyproject.toml` is configured with:
- `pythonpath` setting to include all package sources
- Automatic test discovery in all package directories
- Exclusion of Django-dependent tests (run those with Django settings configured)

### Package-Specific Tests

```bash
# Architecture.Core (253 tests - no external dependencies)
cd architecture-core
export PYTHONPATH=src:..
pytest tests/contracts/ tests/unit/ tests/properties/ -v

# Architecture.Django (requires Django setup)
cd architecture-django
export PYTHONPATH=src:../architecture-core/src:..
pytest -v

# Architecture.Shell.Cqrs
cd architecture-shell-cqrs
export PYTHONPATH=src:../architecture-core/src:..
pytest -v
```

## 📊 Code Quality

```bash
# Format code
black .
isort .

# Type checking
mypy architecture-core/src
mypy architecture-django/src
mypy architecture-shell-cqrs/src

# Linting
flake8 architecture-core/src
flake8 architecture-django/src
flake8 architecture-shell-cqrs/src
```

## 📚 Example Usage

### Basic DDD with Functional Types

```python
from dataclasses import dataclass
from decimal import Decimal
from architecture_core.domain import AggregateRoot, ValueObject, EntityId
from architecture_core.functional import Result, Error

@dataclass(frozen=True)
class OrderId(EntityId[str]):
    value: str

@dataclass(frozen=True)
class Money(ValueObject):
    amount: Decimal
    currency: str

    def get_equality_components(self):
        yield self.amount
        yield self.currency

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

### CQRS with Mediator

```python
from dataclasses import dataclass
from architecture_shell_cqrs import Mediator, ICommandHandler, ICommand
from architecture_core.functional import Result

@dataclass
class CreateOrderCommand(ICommand[OrderId]):
    customer_name: str

class CreateOrderHandler(ICommandHandler[CreateOrderCommand, OrderId]):
    async def handle(self, command: CreateOrderCommand) -> Result[OrderId]:
        order = Order.create(command.customer_name)
        # Save to repository...
        return Result.success(order.id)

# Setup mediator
mediator = Mediator()
mediator.register_handler(CreateOrderCommand, CreateOrderHandler())

# Send command
result = await mediator.send(CreateOrderCommand("John Doe"))
```

## 🏗️ Project Structure

```
python-django/
├── architecture-core/           # Core DDD abstractions
│   ├── src/architecture_core/
│   ├── tests/
│   └── pyproject.toml
├── architecture-django/         # Django integration
│   ├── src/django_architecture_core/
│   ├── tests/
│   └── pyproject.toml
├── architecture-shell-cqrs/     # CQRS mediator
│   ├── src/architecture_shell_cqrs/
│   ├── tests/
│   └── pyproject.toml
├── benchmarks/                  # Performance benchmarks
├── examples/                    # Example applications
│   ├── quickstart.py
│   ├── order_domain/
│   └── django_order/
├── pyproject.toml              # Workspace configuration
└── README.md
```

## 🔗 Related Implementations

This Python implementation follows the same architecture as:

- **C# .NET**: `Architecture.Core`, `Architecture.Core.EntityFramework`, `Architecture.Shell.Cqrs`
- **TypeScript**: `architecture-core`, `architecture-typeorm`, `architecture-shell-cqrs`
- **Java Spring**: `architecture-core`, `architecture-core-spring`, `architecture-shell-cqrs`
- **Go**: `architecture-core`, `architecture-gorm`, `architecture-shell-cqrs`

## 📖 Documentation

- [Core Package Documentation](./architecture-core/README.md)
- [Django Integration Guide](./architecture-django/README.md)
- [CQRS Mediator Guide](./architecture-shell-cqrs/README.md)
- [Migration Guide](./MIGRATION.md)
- [Examples](./examples/)

## 🤝 Contributing

Contributions are welcome! Please ensure:

- All tests pass: `pytest`
- Code is formatted: `black . && isort .`
- Type checking passes: `mypy`
- Coverage remains high: `pytest --cov`

## 📄 License

MIT License - see LICENSE file for details.

---

**Universal DDD Architecture v2.0** - Multi-language consistency across C#, Java, Python, Go, and TypeScript
