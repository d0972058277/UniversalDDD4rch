# Architecture.Shell.Cqrs - CQRS Mediator for Python

CQRS mediator pattern implementation for Universal DDD Architecture.

[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Overview

Architecture.Shell.Cqrs provides a mediator pattern implementation for routing commands and queries with support for cross-cutting concerns through pipeline behaviors.

### Key Features

- **Command/Query Separation** - Clear separation of read and write operations
- **Mediator Pattern** - Decoupled request/handler routing
- **Pipeline Behaviors** - Composable cross-cutting concerns (logging, validation, transactions)
- **Async-First** - Native async/await support
- **Type-Safe** - Full generic type support
- **Zero Dependencies** - Only depends on `architecture-core`

## Installation

```bash
pip install architecture-shell-cqrs
```

## Quick Start

### 1. Define Commands and Queries

```python
from dataclasses import dataclass
from architecture_shell_cqrs import ICommand, IQuery

@dataclass
class CreateOrderCommand(ICommand[OrderId]):
    customer_name: str
    initial_amount: float

@dataclass
class GetOrderQuery(IQuery[Order]):
    order_id: OrderId
```

### 2. Implement Handlers

```python
from architecture_shell_cqrs import ICommandHandler, IQueryHandler
from architecture_core.functional import Result

class CreateOrderCommandHandler(ICommandHandler[CreateOrderCommand, OrderId]):
    def __init__(self, repository: OrderRepository):
        self._repository = repository

    async def handle(self, command: CreateOrderCommand) -> Result[OrderId]:
        order = Order.create(command.customer_name)
        result = await self._repository.add(order)
        return result.map(lambda o: o.id)

class GetOrderQueryHandler(IQueryHandler[GetOrderQuery, Order]):
    def __init__(self, repository: OrderRepository):
        self._repository = repository

    async def handle(self, query: GetOrderQuery) -> Result[Order]:
        return await self._repository.get_by_id(query.order_id)
```

### 3. Configure Mediator

```python
from architecture_shell_cqrs import Mediator

# Create mediator
mediator = Mediator()

# Register handlers
mediator.register_handler(
    CreateOrderCommand,
    CreateOrderCommandHandler(order_repository)
)
mediator.register_handler(
    GetOrderQuery,
    GetOrderQueryHandler(order_repository)
)
```

### 4. Send Requests

```python
# Send command
command = CreateOrderCommand(customer_name="John Doe", initial_amount=100.0)
result = await mediator.send(command)

result.match(
    success=lambda order_id: print(f"Order created: {order_id}"),
    failure=lambda error: print(f"Error: {error.message}")
)

# Send query
query = GetOrderQuery(order_id=order_id)
result = await mediator.send(query)
```

### 5. Add Pipeline Behaviors

```python
from architecture_shell_cqrs import IPipelineBehavior

class LoggingBehavior(IPipelineBehavior):
    async def handle(self, request, next_handler):
        print(f"Handling {type(request).__name__}")
        result = await next_handler()
        print(f"Completed {type(request).__name__}")
        return result

mediator.register_behavior(LoggingBehavior())
```

## Components

- **`Mediator`** - Request routing and pipeline execution
- **`ICommand[TResponse]`** - Marker for commands (write operations)
- **`IQuery[TResponse]`** - Marker for queries (read operations)
- **`ICommandHandler`** - Command handler interface
- **`IQueryHandler`** - Query handler interface
- **`IPipelineBehavior`** - Cross-cutting concern interface

## Pipeline Behaviors

Common behaviors you can implement:

- **Logging** - Request/response logging
- **Validation** - Input validation before handlers
- **Transaction Management** - Automatic transaction handling for commands
- **Caching** - Query result caching
- **Performance Monitoring** - Execution time tracking
- **Authorization** - Request authorization

## Documentation

- [API Reference](https://architecture-shell-cqrs-python.readthedocs.io/)
- [Examples](./examples/)

## License

MIT License - see LICENSE file for details.
