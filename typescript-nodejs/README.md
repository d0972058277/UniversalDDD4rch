# Architecture.Core - TypeScript

[![npm version](https://badge.fury.io/js/@universal-ddd%2Farchitecture-core.svg)](https://badge.fury.io/js/@universal-ddd%2Farchitecture-core)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-brightgreen)](https://www.npmjs.com/package/@universal-ddd/architecture-core)

Universal DDD Architecture Core library providing essential domain-driven design abstractions and functional programming types for TypeScript/Node.js applications.

## 🚀 Features

- **🏗️ DDD Abstractions** - AggregateRoot, Entity, ValueObject, DomainEvent, Repository
- **🔧 Functional Types** - Result, Maybe, Error monads for safe error handling
- **⚡ Zero Dependencies** - Pure Node.js standard library implementation
- **🎯 Type Safety** - Full TypeScript support with strict type checking
- **📈 Performance** - Memory-efficient implementations optimized for production
- **🧪 Test-Driven** - Comprehensive test suite with 100% coverage
- **📚 Documentation** - Complete API documentation and examples

## 📦 Installation

### npm
```bash
npm install @universal-ddd/architecture-core
```

### yarn
```bash
yarn add @universal-ddd/architecture-core
```

### pnpm
```bash
pnpm add @universal-ddd/architecture-core
```

## 🏁 Quick Start

```typescript
import {
  Result,
  Maybe,
  AggregateRoot,
  ValueObject,
  Entity,
  DomainEventBase
} from '@universal-ddd/architecture-core';

// 1. Functional Error Handling
const divide = (a: number, b: number): Result<number> => {
  if (b === 0) {
    return Result.fail(Error.domain('DIVISION_BY_ZERO', 'Cannot divide by zero'));
  }
  return Result.ok(a / b);
};

const result = divide(10, 2)
  .map(x => x * 2)
  .bind(x => x > 20 ? Result.ok(x) : Result.fail(Error.validation('TOO_SMALL', 'Result too small')));

result.match(
  value => console.log(`Success: ${value}`),
  error => console.log(`Error: ${error.message}`)
);

// 2. Value Objects with Structural Equality
class Money extends ValueObject {
  constructor(
    public readonly amount: number,
    public readonly currency: string
  ) {
    super();
    if (amount < 0) throw new Error('Amount cannot be negative');
    if (!currency) throw new Error('Currency is required');
  }

  protected getEqualityComponents() {
    return [this.amount, this.currency];
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot add different currencies');
    }
    return new Money(this.amount + other.amount, this.currency);
  }
}

const money1 = new Money(100, 'USD');
const money2 = new Money(100, 'USD');
console.log(money1.equals(money2)); // true

// 3. Domain Events
class OrderCreatedEvent extends DomainEventBase {
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly amount: Money
  ) {
    super();
  }
}

// 4. Aggregate Root with Business Logic
class OrderId extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!value) throw new Error('Order ID cannot be empty');
  }

  protected getEqualityComponents() {
    return [this.value];
  }
}

class Order extends AggregateRoot<OrderId> {
  private _status: 'pending' | 'confirmed' | 'shipped' = 'pending';
  private _total: Money;

  constructor(id: OrderId, customerId: string, total: Money) {
    super(id);
    this._total = total;

    this.addEvent(new OrderCreatedEvent(id.value, customerId, total));
  }

  get status() { return this._status; }
  get total() { return this._total; }

  confirm(): Result<void> {
    if (this._status !== 'pending') {
      return Result.fail(Error.domain('INVALID_STATE', 'Order can only be confirmed when pending'));
    }

    this._status = 'confirmed';
    return Result.ok();
  }
}

// 5. Maybe for Optional Values
const findCustomer = (id: string): Maybe<string> => {
  const customers = { '1': 'Alice', '2': 'Bob' };
  return id in customers ? Maybe.some(customers[id]) : Maybe.none();
};

const customerName = findCustomer('1')
  .map(name => `Hello, ${name}!`)
  .orElse('Customer not found');

console.log(customerName); // "Hello, Alice!"
```

## 🏗️ Architecture Patterns

### Domain-Driven Design

```typescript
// Domain Layer - Pure business logic
class CustomerId extends ValueObject {
  constructor(public readonly value: string) {
    super();
  }

  protected getEqualityComponents() {
    return [this.value];
  }
}

class Customer extends AggregateRoot<CustomerId> {
  private _email: string;
  private _isActive: boolean = true;

  constructor(id: CustomerId, email: string) {
    super(id);
    this._email = email;
  }

  deactivate(): Result<void> {
    if (!this._isActive) {
      return Result.fail(Error.domain('ALREADY_INACTIVE', 'Customer is already inactive'));
    }

    this._isActive = false;
    this.addEvent(new CustomerDeactivatedEvent(this.id.value));
    return Result.ok();
  }
}

// Application Layer - Use cases
interface ICustomerRepository {
  findById(id: CustomerId): Promise<Maybe<Customer>>;
  save(customer: Customer): Promise<Result<void>>;
}

class DeactivateCustomerUseCase {
  constructor(private customerRepo: ICustomerRepository) {}

  async execute(customerId: CustomerId): Promise<Result<void>> {
    const maybeCustomer = await this.customerRepo.findById(customerId);

    return maybeCustomer.match(
      async customer => {
        const result = customer.deactivate();
        if (result.isFailure) return result;

        return await this.customerRepo.save(customer);
      },
      () => Result.fail(Error.domain('CUSTOMER_NOT_FOUND', 'Customer not found'))
    );
  }
}
```

### CQRS Pattern

```typescript
// Commands
interface CreateOrderCommand {
  customerId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
}

// Command Handlers
class CreateOrderHandler {
  constructor(
    private orderRepo: IOrderRepository,
    private eventBus: IEventBus
  ) {}

  async handle(command: CreateOrderCommand): Promise<Result<OrderId>> {
    try {
      const orderId = new OrderId(crypto.randomUUID());
      const customerId = new CustomerId(command.customerId);

      // Calculate total
      const total = command.items.reduce((sum, item) =>
        sum + (item.price * item.quantity), 0
      );

      const order = new Order(orderId, customerId.value, new Money(total, 'USD'));

      const saveResult = await this.orderRepo.save(order);
      if (saveResult.isFailure) return saveResult.error;

      // Publish events
      for (const event of order.events) {
        await this.eventBus.publish(event);
      }

      return Result.ok(orderId);
    } catch (error) {
      return Result.fail(Error.infrastructure('ORDER_CREATION_FAILED', error.message));
    }
  }
}
```

### Repository Pattern

```typescript
import { IRepository } from '@universal-ddd/architecture-core';

class InMemoryOrderRepository implements IRepository<Order, OrderId> {
  private orders = new Map<string, Order>();

  async getByIdAsync(id: OrderId): Promise<Result<Maybe<Order>>> {
    try {
      const order = this.orders.get(id.value);
      return Result.ok(order ? Maybe.some(order) : Maybe.none());
    } catch (error) {
      return Result.fail(Error.infrastructure('REPOSITORY_ERROR', error.message));
    }
  }

  async addAsync(order: Order): Promise<Result<void>> {
    try {
      this.orders.set(order.id.value, order);
      return Result.ok();
    } catch (error) {
      return Result.fail(Error.infrastructure('REPOSITORY_ERROR', error.message));
    }
  }

  async updateAsync(order: Order): Promise<Result<void>> {
    try {
      if (!this.orders.has(order.id.value)) {
        return Result.fail(Error.domain('ORDER_NOT_FOUND', 'Order not found'));
      }

      this.orders.set(order.id.value, order);
      return Result.ok();
    } catch (error) {
      return Result.fail(Error.infrastructure('REPOSITORY_ERROR', error.message));
    }
  }

  async deleteAsync(id: OrderId): Promise<Result<void>> {
    try {
      this.orders.delete(id.value);
      return Result.ok();
    } catch (error) {
      return Result.fail(Error.infrastructure('REPOSITORY_ERROR', error.message));
    }
  }

  async existsAsync(id: OrderId): Promise<Result<boolean>> {
    try {
      return Result.ok(this.orders.has(id.value));
    } catch (error) {
      return Result.fail(Error.infrastructure('REPOSITORY_ERROR', error.message));
    }
  }
}
```

## 🧪 Testing

```typescript
import { Order, OrderId, Money } from './domain/order';

describe('Order Domain Tests', () => {
  it('should create order successfully', () => {
    // Given
    const orderId = new OrderId('order-123');
    const customerId = 'customer-456';
    const total = new Money(100, 'USD');

    // When
    const order = new Order(orderId, customerId, total);

    // Then
    expect(order.id.equals(orderId)).toBe(true);
    expect(order.status).toBe('pending');
    expect(order.total.equals(total)).toBe(true);
    expect(order.events).toHaveLength(1);
  });

  it('should not confirm non-pending order', () => {
    // Given
    const order = new Order(
      new OrderId('order-123'),
      'customer-456',
      new Money(100, 'USD')
    );
    order.confirm(); // Make it confirmed

    // When
    const result = order.confirm();

    // Then
    expect(result.isFailure).toBe(true);
    expect(result.error.code).toBe('INVALID_STATE');
  });
});
```

## 📝 API Reference

### Functional Types

- **`Result<T>`** - Represents success or failure without exceptions
- **`Maybe<T>`** - Represents optional values without null/undefined
- **`Error`** - Categorized error with metadata support

### Domain Types

- **`ValueObject`** - Immutable objects with structural equality
- **`Entity<TId>`** - Objects with identity-based equality
- **`AggregateRoot<TId>`** - Domain aggregate with event collection
- **`DomainEventBase`** - Base class for domain events
- **`IRepository<T, TId>`** - Generic repository interface

## 🔄 Integration

### Express.js Integration

```typescript
import express from 'express';
import { Result, Error } from '@universal-ddd/architecture-core';

const app = express();

// Result middleware
app.use((req, res, next) => {
  res.sendResult = function(result: Result<any>) {
    if (result.isSuccess) {
      this.json({ success: true, data: result.value });
    } else {
      const statusCode = getStatusCodeFromError(result.error);
      this.status(statusCode).json({
        success: false,
        error: {
          code: result.error.code,
          message: result.error.message,
          category: result.error.category
        }
      });
    }
  };
  next();
});

function getStatusCodeFromError(error: Error): number {
  switch (error.category) {
    case 'Domain': return 400;
    case 'Validation': return 422;
    case 'Infrastructure': return 500;
    case 'Security': return 403;
    default: return 500;
  }
}
```

### Database Integration (TypeORM)

```typescript
import { Repository, EntityRepository } from 'typeorm';
import { IRepository, Result, Maybe, Error } from '@universal-ddd/architecture-core';

@EntityRepository(OrderEntity)
class TypeOrmOrderRepository implements IRepository<Order, OrderId> {
  constructor(private repo: Repository<OrderEntity>) {}

  async getByIdAsync(id: OrderId): Promise<Result<Maybe<Order>>> {
    try {
      const entity = await this.repo.findOne(id.value);
      const order = entity ? this.toDomain(entity) : Maybe.none<Order>();
      return Result.ok(order);
    } catch (error) {
      return Result.fail(Error.infrastructure('DB_ERROR', error.message));
    }
  }

  private toDomain(entity: OrderEntity): Order {
    // Map entity to domain object
    return new Order(
      new OrderId(entity.id),
      entity.customerId,
      new Money(entity.amount, entity.currency)
    );
  }
}
```

## 🚀 Performance

The library is optimized for production use:

- **Memory Efficient**: Minimal object allocation in hot paths
- **Zero Dependencies**: No external runtime dependencies
- **Tree Shakeable**: Only import what you need
- **Optimized Equality**: Cached hash codes for ValueObjects
- **Async-First**: Built for modern async/await patterns

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Run tests: `npm test`
4. Commit changes: `git commit -m 'Add amazing feature'`
5. Push to branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/universal-ddd/architecture-core)
- [npm Package](https://www.npmjs.com/package/@universal-ddd/architecture-core)
- [API Documentation](./docs/index.html)
- [TypeScript Implementation Guide](./docs/migration-guide.md)
- [Examples](./examples/)

## 🏷️ Related Projects

- [Architecture.Core (.NET)](../csharp-dotnet/) - C# implementation
- [Architecture.Core (Java)](../java/) - Java implementation
- [Architecture.Core (Python)](../python/) - Python implementation
- [Architecture.Core (Go)](../go/) - Go implementation