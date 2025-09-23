# Migration Guide: Python Universal DDD Architecture v1.x to v2.0

## Overview

This guide helps you migrate your Python Universal DDD Architecture implementation from v1.x to v2.0. The new version provides enhanced multi-language consistency, improved API alignment, better Django integration, and optimized async/await patterns.

## Breaking Changes Summary

### 1. Repository Interface Changes

**v1.x:**
```python
class Repository(ABC, Generic[TAggregate, TId]):
    @abstractmethod
    async def save_async(self, aggregate: TAggregate) -> Result[None]:
        pass
```

**v2.0:**
```python
class Repository(ABC, Generic[TAggregate, TId]):
    @abstractmethod
    async def add_async(self, aggregate: TAggregate) -> Result[None]:
        pass

    @abstractmethod
    async def update_async(self, aggregate: TAggregate) -> Result[None]:
        pass
```

**Migration Action:**
- Replace `save_async()` calls with appropriate `add_async()` or `update_async()` calls
- For new aggregates: Use `add_async()`
- For existing aggregates: Use `update_async()`

### 2. AggregateRoot API Standardization

**v1.x:**
```python
class AggregateRoot(Entity[TId], ABC):
    def update_version(self) -> None:  # Old method name
        self._version += 1
```

**v2.0:**
```python
class AggregateRoot(Entity[TId], ABC):
    def increment_version(self) -> None:  # Standardized across languages
        self._version += 1
```

**Migration Action:**
- Replace `update_version()` calls with `increment_version()`
- Update any custom implementations to use the new method name

### 3. Result Monad Consistency

**v1.x:**
```python
# Mixed naming patterns
result = Result.success(value)  # Sometimes used
result = Result.ok(value)       # Sometimes used
```

**v2.0:**
```python
# Standardized naming
result = Result.success(value)  # Always use this (Python convention)
result = Result.failure(error)  # Always use this
```

**Migration Action:**
- Standardize on `Result.success()` and `Result.failure()`
- Update any usage of alternative naming patterns

### 4. Package Structure Changes

**v1.x:**
```
architecture_core (monolithic package)
├── All functionality combined
└── Django dependencies included
```

**v2.0:**
```
architecture_core (pure core package)
├── Core DDD abstractions only
├── No external dependencies
└── Integration packages separate:
    ├── django_architecture_core
    ├── fastapi_architecture_core
    └── sqlalchemy_architecture_core
```

**Migration Action:**
- Update package imports to use separated core and integration packages
- Install only required integration packages
- Update Django settings if using Django integration

## Step-by-Step Migration

### Step 1: Update Package Dependencies

**requirements.txt Before:**
```txt
architecture-core==1.x.x
```

**requirements.txt After:**
```txt
# Core package
architecture-core==2.0.0

# Add only needed integrations
django-architecture-core==2.0.0  # If using Django
sqlalchemy-architecture-core==2.0.0  # If using SQLAlchemy
```

**pyproject.toml Before:**
```toml
[tool.poetry.dependencies]
architecture-core = "^1.0.0"
```

**pyproject.toml After:**
```toml
[tool.poetry.dependencies]
architecture-core = "^2.0.0"
django-architecture-core = "^2.0.0"  # Optional
sqlalchemy-architecture-core = "^2.0.0"  # Optional
```

### Step 2: Update Repository Implementations

**Before:**
```python
from django.core.exceptions import ObjectDoesNotExist

class CustomerService:
    def __init__(self, repository: CustomerRepository):
        self._repository = repository

    async def create_customer_async(self, customer: Customer) -> Result[CustomerId]:
        save_result = await self._repository.save_async(customer)
        if not save_result.is_success:
            return Result.failure(save_result.error)
        return Result.success(customer.id)

    async def update_customer_async(self, customer: Customer) -> Result[None]:
        return await self._repository.save_async(customer)  # Same method for both
```

**After:**
```python
from django.core.exceptions import ObjectDoesNotExist

class CustomerService:
    def __init__(self, repository: CustomerRepository):
        self._repository = repository

    async def create_customer_async(self, customer: Customer) -> Result[CustomerId]:
        add_result = await self._repository.add_async(customer)
        if not add_result.is_success:
            return Result.failure(add_result.error)
        return Result.success(customer.id)

    async def update_customer_async(self, customer: Customer) -> Result[None]:
        return await self._repository.update_async(customer)
```

### Step 3: Update AggregateRoot Usage

**Before:**
```python
class Order(AggregateRoot[OrderId]):
    def confirm_order(self) -> Result[None]:
        self._status = OrderStatus.CONFIRMED
        self.add_event(OrderConfirmed(self.id, datetime.utcnow()))
        self.update_version()  # Old method
        return Result.success(None)
```

**After:**
```python
class Order(AggregateRoot[OrderId]):
    def confirm_order(self) -> Result[None]:
        self._status = OrderStatus.CONFIRMED
        self.add_event(OrderConfirmed(self.id, datetime.utcnow()))
        self.increment_version()  # New standardized method
        return Result.success(None)
```

### Step 4: Update Django Integration

**Before:**
```python
# Direct Django ORM usage in domain
from django.db import models

class CustomerRepository:
    def __init__(self):
        pass

    async def save_async(self, customer: Customer) -> Result[None]:
        # Implementation mixed with Django ORM concerns
        try:
            # Direct Django model operations
            pass
        except Exception as e:
            return Result.failure(InfrastructureError(str(e)))
```

**After:**
```python
# Use dedicated Django integration package
from django_architecture_core.repositories import DjangoRepository
from django_architecture_core.mappers import DjangoMapper

class CustomerRepository(DjangoRepository[Customer, CustomerId]):
    def __init__(self, mapper: DjangoMapper[Customer, CustomerModel]):
        super().__init__(CustomerModel, mapper)

    # Additional custom methods if needed
    async def get_by_email_async(self, email: EmailAddress) -> Maybe[Customer]:
        # Implementation using Django integration helpers
        try:
            model = await CustomerModel.objects.aget(email=email.value)
            customer = self._mapper.to_domain(model)
            return Maybe.some(customer)
        except CustomerModel.DoesNotExist:
            return Maybe.none()
```

### Step 5: Update Django Settings

**Before:**
```python
# settings.py
INSTALLED_APPS = [
    # ... other apps
    'architecture_core',  # Old monolithic package
]
```

**After:**
```python
# settings.py
INSTALLED_APPS = [
    # ... other apps
    'django_architecture_core',  # New Django integration package
]

# New configuration options
ARCHITECTURE_CORE = {
    'DOMAIN_EVENTS': {
        'ENABLED': True,
        'ASYNC_PROCESSING': True,
    },
    'REPOSITORIES': {
        'TRANSACTION_ISOLATION': 'READ_COMMITTED',
        'BATCH_SIZE': 100,
    },
    'PERFORMANCE': {
        'ENABLE_METRICS': True,
        'CACHE_AGGREGATES': True,
    }
}
```

### Step 6: Update Async Patterns

**Before:**
```python
# v1.x mixed sync/async patterns
class CustomerService:
    def create_customer(self, email: str, name: str) -> Result[CustomerId]:
        # Synchronous implementation
        pass

    async def create_customer_async(self, email: str, name: str) -> Result[CustomerId]:
        # Separate async method
        pass
```

**After:**
```python
# v2.0 async-first design
class CustomerService:
    async def create_customer_async(self, email: str, name: str) -> Result[CustomerId]:
        # Validate input
        email_result = EmailAddress.create(email)
        if not email_result.is_success:
            return Result.failure(email_result.error)

        name_result = CustomerName.create(name)
        if not name_result.is_success:
            return Result.failure(name_result.error)

        # Check if customer already exists
        existing = await self._repository.get_by_email_async(email_result.value)
        if existing.has_value:
            return Result.failure(DomainError("Customer already exists"))

        # Create and save customer
        customer_result = Customer.create(email_result.value, name_result.value)
        if not customer_result.is_success:
            return Result.failure(customer_result.error)

        add_result = await self._repository.add_async(customer_result.value)
        if not add_result.is_success:
            return Result.failure(add_result.error)

        return Result.success(customer_result.value.id)

    # Sync wrapper for backward compatibility
    def create_customer(self, email: str, name: str) -> Result[CustomerId]:
        import asyncio
        return asyncio.run(self.create_customer_async(email, name))
```

## Testing Updates

### Update Unit Tests

**Before:**
```python
import pytest
import asyncio

class TestCustomerRepository:
    def test_save_async_should_persist_aggregate(self):
        # Given
        customer = create_valid_customer()

        # When
        result = asyncio.run(repository.save_async(customer))

        # Then
        assert result.is_success
```

**After:**
```python
import pytest

class TestCustomerRepository:
    @pytest.mark.asyncio
    async def test_add_async_should_persist_new_aggregate(self):
        # Given
        customer = create_valid_customer()

        # When
        result = await repository.add_async(customer)

        # Then
        assert result.is_success

    @pytest.mark.asyncio
    async def test_update_async_should_modify_existing_aggregate(self):
        # Given
        customer = existing_customer()

        # When
        result = await repository.update_async(customer)

        # Then
        assert result.is_success
```

### Add Cross-Language Contract Tests

```python
class TestAggregateRootContract:
    def test_should_increment_version_when_increment_version_called(self):
        # GIVEN
        customer = Customer.create(email, name).value
        initial_version = customer.version

        # WHEN
        customer.increment_version()

        # THEN
        assert customer.version == initial_version + 1
```

### Add Django Integration Tests

```python
import pytest
from django.test import TestCase
from django.db import transaction

@pytest.mark.django_db
class CustomerRepositoryIntegrationTests(TestCase):
    def setUp(self):
        self.repository = CustomerRepository()

    @pytest.mark.asyncio
    async def test_should_persist_and_retrieve_customer(self):
        # Given
        customer = Customer.create(email, name).value

        # When
        async with transaction.atomic():
            add_result = await self.repository.add_async(customer)
            retrieved = await self.repository.get_by_id_async(customer.id)

        # Then
        assert add_result.is_success
        assert retrieved.has_value
        assert retrieved.value.id == customer.id
```

### Performance Testing

```python
import pytest
import time
from memory_profiler import profile

class TestPerformance:
    @pytest.mark.asyncio
    async def test_customer_creation_performance(self):
        """Test that customer creation meets performance targets."""
        customers = []
        start_time = time.time()

        for i in range(1000):
            email = EmailAddress.create(f"test{i}@example.com").value
            name = CustomerName.create(f"User{i}").value
            customer = Customer.create(email, name).value
            customers.append(customer)

        end_time = time.time()
        avg_time = (end_time - start_time) / 1000

        assert avg_time < 0.001  # Less than 1ms per customer

    @profile
    def test_memory_usage(self):
        """Test memory usage for customer creation."""
        customers = []
        for i in range(10000):
            email = EmailAddress.create(f"test{i}@example.com").value
            name = CustomerName.create(f"User{i}").value
            customer = Customer.create(email, name).value
            customers.append(customer)
```

## Performance Considerations

### v2.0 Performance Improvements

- **Optimized async/await patterns** with reduced context switching
- **Better Django ORM integration** with select_related/prefetch_related optimizations
- **Improved memory management** with __slots__ usage in hot paths
- **Caching optimizations** for frequently accessed aggregates

### Memory Usage Optimization

```python
# v2.0 introduces memory-efficient patterns
from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from collections.abc import Sequence

class Customer(AggregateRoot[CustomerId]):
    __slots__ = ('_email', '_name', '_orders')  # Reduce memory overhead

    def __init__(self, id: CustomerId, email: EmailAddress, name: CustomerName):
        super().__init__(id)
        self._email = email
        self._name = name
        self._orders: list[OrderId] = []  # Use list instead of set for better memory
```

### Django Query Optimization

```python
from django_architecture_core.queries import OptimizedQuerySet

class CustomerRepository(DjangoRepository[Customer, CustomerId]):
    async def get_customers_with_orders_async(self) -> list[Customer]:
        """Optimized query with prefetching."""
        models = await CustomerModel.objects.select_related('profile') \
                                           .prefetch_related('orders') \
                                           .all()
        return [self._mapper.to_domain(model) for model in models]

    async def get_by_email_batch_async(self, emails: list[EmailAddress]) -> dict[EmailAddress, Customer]:
        """Batch query for multiple emails."""
        email_values = [email.value for email in emails]
        models = await CustomerModel.objects.filter(email__in=email_values).all()
        return {
            EmailAddress.create(model.email).value: self._mapper.to_domain(model)
            for model in models
        }
```

## Troubleshooting

### Common Migration Issues

1. **Import Errors with Repository.save_async()**
   - **Cause:** Method no longer exists
   - **Solution:** Use `add_async()` for new aggregates, `update_async()` for existing

2. **AttributeError: 'AggregateRoot' object has no attribute 'update_version'**
   - **Cause:** Using old `update_version()` method
   - **Solution:** Replace with `increment_version()`

3. **Django App Not Found Error**
   - **Cause:** Still using old `architecture_core` in INSTALLED_APPS
   - **Solution:** Update to `django_architecture_core`

4. **Async/Await SyntaxError**
   - **Cause:** Using async methods in synchronous context
   - **Solution:** Ensure proper async context or use sync wrappers

5. **Import Errors with Integration Packages**
   - **Cause:** Missing integration package installation
   - **Solution:** Install `django-architecture-core` for Django features

### Performance Troubleshooting

```python
# Use Django Debug Toolbar for query analysis
INSTALLED_APPS = [
    # ...
    'debug_toolbar',
]

MIDDLEWARE = [
    # ...
    'debug_toolbar.middleware.DebugToolbarMiddleware',
]

# Monitor Django queries
import logging
logging.getLogger('django.db.backends').setLevel(logging.DEBUG)
```

### Verification Steps

After migration, verify your implementation:

1. **Run all unit tests** - `python -m pytest tests/unit/`
2. **Run contract tests** - `python -m pytest tests/contracts/`
3. **Run integration tests** - `python -m pytest tests/integration/ --django-db`
4. **Run performance tests** - `python -m pytest tests/performance/ --benchmark`
5. **Check Django migrations** - `python manage.py makemigrations --check`
6. **Validate type hints** - `mypy src/`

## Production Deployment

### Django Settings for Production

```python
# settings/production.py
ARCHITECTURE_CORE = {
    'DOMAIN_EVENTS': {
        'ENABLED': True,
        'ASYNC_PROCESSING': True,
        'CELERY_QUEUE': 'domain_events',
    },
    'REPOSITORIES': {
        'TRANSACTION_ISOLATION': 'REPEATABLE_READ',
        'CONNECTION_POOL_SIZE': 20,
        'QUERY_TIMEOUT': 30,
    },
    'PERFORMANCE': {
        'ENABLE_METRICS': True,
        'CACHE_AGGREGATES': True,
        'CACHE_TTL': 300,
    }
}

# Celery configuration for async domain events
CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'
CELERY_TASK_ROUTES = {
    'django_architecture_core.tasks.*': {'queue': 'domain_events'},
}
```

### Monitoring and Logging

```python
# Custom logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'architecture': {
            'format': '[{asctime}] {levelname} {name} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'architecture_file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': 'architecture.log',
            'formatter': 'architecture',
        },
    },
    'loggers': {
        'architecture_core': {
            'handlers': ['architecture_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'django_architecture_core': {
            'handlers': ['architecture_file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
```

## Support and Resources

- **Documentation:** [Python Architecture Documentation](../docs)
- **Examples:** [Django Examples](../examples)
- **Issues:** [GitHub Issues](https://github.com/architecture/core/issues)
- **Community:** [Discussion Forum](https://github.com/architecture/core/discussions)
- **Django Best Practices:** [Django Documentation](https://docs.djangoproject.com/)
- **Python Async Guide:** [Python Async Documentation](https://docs.python.org/3/library/asyncio.html)

## Conclusion

Universal DDD Architecture v2.0 provides significant improvements in async patterns, Django integration, and cross-language consistency while maintaining Python idioms and performance characteristics. The migration requires updating method names and package imports, but the core domain modeling concepts remain unchanged.

The new async-first design and improved Django integration make it easier to build high-performance applications with consistent patterns across multiple language implementations.