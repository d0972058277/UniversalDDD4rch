# Architecture.Django - Django Integration

Django integration for Architecture.Core - DDD patterns for Django applications.

[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Django](https://img.shields.io/badge/django-4.2+-green.svg)](https://docs.djangoproject.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Overview

Architecture.Django provides Django ORM integration for Architecture.Core, enabling seamless use of DDD patterns with Django models and repositories.

### Key Features

- **Django ORM Repository** - Repository pattern implementation using Django models
- **Model Base Classes** - Django model mixins for entities and aggregates
- **Event Serialization** - Domain event persistence in Django
- **Transaction Support** - Unit of work pattern with Django transactions
- **Async Support** - Django 4.2+ async views and ORM

## Installation

```bash
pip install architecture-django
```

This will automatically install `architecture-core` as a dependency.

## Quick Start

### 1. Define Django Models

```python
from django.db import models
from django_architecture_core.models import AggregateModel, EntityModel

class OrderModel(AggregateModel):
    customer_name = models.CharField(max_length=200)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3)

    class Meta:
        db_table = 'orders'
```

### 2. Create Domain Aggregates

```python
from dataclasses import dataclass
from decimal import Decimal
from architecture_core.domain import AggregateRoot, EntityId, ValueObject
from architecture_core.functional import Result

@dataclass(frozen=True)
class OrderId(EntityId[int]):
    value: int

class Order(AggregateRoot[OrderId]):
    def __init__(self, id: OrderId, customer_name: str):
        super().__init__(id)
        self._customer_name = customer_name
        self._total_amount = Decimal('0')
```

### 3. Implement Repository

```python
from django_architecture_core.repositories import DjangoRepository

class OrderRepository(DjangoRepository[Order, OrderId, OrderModel]):
    def to_domain(self, model: OrderModel) -> Order:
        """Convert Django model to domain aggregate."""
        order = Order(
            OrderId(model.id),
            model.customer_name
        )
        order._total_amount = model.total_amount
        return order

    def to_model(self, aggregate: Order, model: OrderModel = None) -> OrderModel:
        """Convert domain aggregate to Django model."""
        if model is None:
            model = OrderModel()
        model.id = aggregate.id.value
        model.customer_name = aggregate._customer_name
        model.total_amount = aggregate._total_amount
        return model
```

### 4. Use in Views

```python
from django.http import JsonResponse
from architecture_core.functional import Result

async def create_order(request):
    repository = OrderRepository()

    order = Order(
        OrderId(0),  # Will be assigned by DB
        customer_name=request.POST.get('customer_name')
    )

    result = await repository.add(order)

    return result.match(
        success=lambda o: JsonResponse({'order_id': o.id.value}),
        failure=lambda e: JsonResponse({'error': e.message}, status=400)
    )
```

## Components

- **`AggregateModel`** - Django model base class for aggregates
- **`EntityModel`** - Django model base class for entities
- **`DjangoRepository`** - Generic repository implementation
- **`DomainEventSerializer`** - JSON serialization for domain events

## Documentation

- [API Reference](https://architecture-django-python.readthedocs.io/)
- [Migration Guide](../MIGRATION.md)
- [Examples](../examples/django_order/)

## License

MIT License - see LICENSE file for details.
