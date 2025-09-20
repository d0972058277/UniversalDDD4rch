# Quickstart Guide: Architecture.Core TypeScript

**Version**: 1.0.0
**Language**: TypeScript 5.9+ with Node.js 22 LTS
**Dependencies**: Pure Node.js standard library (core), optional Express.js, TypeORM, Jest, class-validator

This guide demonstrates how to build a simple e-commerce order domain using Architecture.Core abstractions and functional types in TypeScript.

## Table of Contents
1. [Installation and Setup](#installation-and-setup)
2. [Domain Model Implementation](#domain-model-implementation)
3. [Functional Error Handling](#functional-error-handling)
4. [Repository Implementation](#repository-implementation)
5. [Express.js Integration](#expressjs-integration)
6. [Testing Examples](#testing-examples)

## Installation and Setup

### 1. Project Initialization
```bash
# Create new TypeScript project
mkdir my-ddd-app
cd my-ddd-app

# Initialize package.json
npm init -y

# Install TypeScript and development dependencies
npm install -D typescript @types/node ts-node nodemon eslint prettier
npm install -D jest @types/jest ts-jest

# Install Architecture.Core (when published)
npm install @universal-ddd/architecture-core

# Install optional integration packages
npm install express @types/express
npm install typeorm sqlite3
npm install class-validator class-transformer
```

### 2. TypeScript Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 3. Project Structure
```
src/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   ├── events/
│   └── services/
├── application/
│   ├── commands/
│   ├── queries/
│   └── handlers/
├── infrastructure/
│   ├── repositories/
│   └── persistence/
└── presentation/
    ├── controllers/
    └── middleware/

tests/
├── unit/
├── integration/
└── contract/
```

## Domain Model Implementation

### 1. Value Objects

```typescript
// src/domain/value-objects/money.ts
import { ValueObject } from '@universal-ddd/architecture-core';

export class Money extends ValueObject {
  constructor(
    public readonly amount: number,
    public readonly currency: string
  ) {
    super();
    this.validateAmount(amount);
    this.validateCurrency(currency);
  }

  protected getEqualityComponents(): any[] {
    return [this.amount, this.currency.toUpperCase()];
  }

  public add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency);
  }

  public subtract(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this.amount - other.amount, this.currency);
  }

  public multiply(factor: number): Money {
    return new Money(this.amount * factor, this.currency);
  }

  private validateAmount(amount: number): void {
    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }
  }

  private validateCurrency(currency: string): void {
    if (!currency || currency.length !== 3) {
      throw new Error('Currency must be a 3-letter code');
    }
  }

  private ensureSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error('Cannot operate on different currencies');
    }
  }

  public toString(): string {
    return `${this.amount} ${this.currency}`;
  }
}

// src/domain/value-objects/order-status.ts
import { ValueObject } from '@universal-ddd/architecture-core';

export enum OrderStatusType {
  Pending = 'Pending',
  Confirmed = 'Confirmed',
  Shipped = 'Shipped',
  Delivered = 'Delivered',
  Cancelled = 'Cancelled'
}

export class OrderStatus extends ValueObject {
  constructor(public readonly value: OrderStatusType) {
    super();
  }

  protected getEqualityComponents(): any[] {
    return [this.value];
  }

  public static pending(): OrderStatus {
    return new OrderStatus(OrderStatusType.Pending);
  }

  public static confirmed(): OrderStatus {
    return new OrderStatus(OrderStatusType.Confirmed);
  }

  public static shipped(): OrderStatus {
    return new OrderStatus(OrderStatusType.Shipped);
  }

  public static delivered(): OrderStatus {
    return new OrderStatus(OrderStatusType.Delivered);
  }

  public static cancelled(): OrderStatus {
    return new OrderStatus(OrderStatusType.Cancelled);
  }

  public canTransitionTo(newStatus: OrderStatus): boolean {
    const transitions: Record<OrderStatusType, OrderStatusType[]> = {
      [OrderStatusType.Pending]: [OrderStatusType.Confirmed, OrderStatusType.Cancelled],
      [OrderStatusType.Confirmed]: [OrderStatusType.Shipped, OrderStatusType.Cancelled],
      [OrderStatusType.Shipped]: [OrderStatusType.Delivered],
      [OrderStatusType.Delivered]: [],
      [OrderStatusType.Cancelled]: []
    };

    return transitions[this.value].includes(newStatus.value);
  }
}
```

### 2. Domain Events

```typescript
// src/domain/events/order-events.ts
import { DomainEventBase } from '@universal-ddd/architecture-core';
import { Money } from '../value-objects/money';

export class OrderCreatedEvent extends DomainEventBase {
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly totalAmount: Money,
    correlationId?: string,
    causationId?: string
  ) {
    super(correlationId, causationId);
  }
}

export class OrderStatusChangedEvent extends DomainEventBase {
  constructor(
    public readonly orderId: string,
    public readonly previousStatus: string,
    public readonly newStatus: string,
    correlationId?: string,
    causationId?: string
  ) {
    super(correlationId, causationId);
  }
}

export class OrderCancelledEvent extends DomainEventBase {
  constructor(
    public readonly orderId: string,
    public readonly reason: string,
    correlationId?: string,
    causationId?: string
  ) {
    super(correlationId, causationId);
  }
}
```

### 3. Entities and Aggregate Root

```typescript
// src/domain/entities/order-item.ts
import { Entity } from '@universal-ddd/architecture-core';
import { Money } from '../value-objects/money';

export class OrderItem extends Entity<string> {
  constructor(
    id: string,
    public readonly productId: string,
    public readonly productName: string,
    public readonly unitPrice: Money,
    public readonly quantity: number
  ) {
    super(id);
    this.checkInvariant(quantity > 0, 'Quantity must be greater than zero');
    this.checkInvariant(!!productName.trim(), 'Product name cannot be empty');
  }

  public getTotalPrice(): Money {
    return this.unitPrice.multiply(this.quantity);
  }

  public updateQuantity(newQuantity: number): OrderItem {
    this.checkInvariant(newQuantity > 0, 'Quantity must be greater than zero');
    return new OrderItem(
      this.id,
      this.productId,
      this.productName,
      this.unitPrice,
      newQuantity
    );
  }
}

// src/domain/entities/order.ts
import { AggregateRoot, Result, Error, ErrorCategory } from '@universal-ddd/architecture-core';
import { Money } from '../value-objects/money';
import { OrderStatus, OrderStatusType } from '../value-objects/order-status';
import { OrderItem } from './order-item';
import {
  OrderCreatedEvent,
  OrderStatusChangedEvent,
  OrderCancelledEvent
} from '../events/order-events';

export class Order extends AggregateRoot<string> {
  private _status: OrderStatus;
  private _items: Map<string, OrderItem>;

  constructor(
    id: string,
    public readonly customerId: string,
    items: OrderItem[],
    status?: OrderStatus
  ) {
    super(id);
    this._status = status || OrderStatus.pending();
    this._items = new Map(items.map(item => [item.id, item]));

    this.checkInvariant(!!customerId.trim(), 'Customer ID cannot be empty');
    this.checkInvariant(items.length > 0, 'Order must have at least one item');

    // Raise domain event for new orders
    if (!status) {
      this.addDomainEvent(new OrderCreatedEvent(
        this.id,
        this.customerId,
        this.getTotalAmount()
      ));
    }
  }

  public get status(): OrderStatus {
    return this._status;
  }

  public get items(): ReadonlyArray<OrderItem> {
    return Array.from(this._items.values());
  }

  public getTotalAmount(): Money {
    const items = Array.from(this._items.values());
    if (items.length === 0) {
      throw new Error('Cannot calculate total for empty order');
    }

    const firstItem = items[0];
    let total = firstItem.getTotalPrice();

    for (let i = 1; i < items.length; i++) {
      total = total.add(items[i].getTotalPrice());
    }

    return total;
  }

  public addItem(item: OrderItem): Result<void> {
    if (this._status.value !== OrderStatusType.Pending) {
      return Result.fail(Error.domain(
        'Order.CannotModifyNonPendingOrder',
        `Cannot add items to order in ${this._status.value} status`
      ));
    }

    if (this._items.has(item.id)) {
      return Result.fail(Error.domain(
        'Order.DuplicateItem',
        `Item with ID ${item.id} already exists in order`
      ));
    }

    this._items.set(item.id, item);
    this.incrementVersion();

    return Result.ok();
  }

  public removeItem(itemId: string): Result<void> {
    if (this._status.value !== OrderStatusType.Pending) {
      return Result.fail(Error.domain(
        'Order.CannotModifyNonPendingOrder',
        `Cannot remove items from order in ${this._status.value} status`
      ));
    }

    if (!this._items.has(itemId)) {
      return Result.fail(Error.domain(
        'Order.ItemNotFound',
        `Item with ID ${itemId} not found in order`
      ));
    }

    this._items.delete(itemId);
    this.incrementVersion();

    return Result.ok();
  }

  public changeStatus(newStatus: OrderStatus): Result<void> {
    if (!this._status.canTransitionTo(newStatus)) {
      return Result.fail(Error.domain(
        'Order.InvalidStatusTransition',
        `Cannot transition from ${this._status.value} to ${newStatus.value}`
      ));
    }

    const previousStatus = this._status.value;
    this._status = newStatus;
    this.incrementVersion();

    this.addDomainEvent(new OrderStatusChangedEvent(
      this.id,
      previousStatus,
      newStatus.value
    ));

    return Result.ok();
  }

  public cancel(reason: string): Result<void> {
    if (this._status.value === OrderStatusType.Delivered) {
      return Result.fail(Error.domain(
        'Order.CannotCancelDeliveredOrder',
        'Cannot cancel an order that has been delivered'
      ));
    }

    if (this._status.value === OrderStatusType.Cancelled) {
      return Result.fail(Error.domain(
        'Order.AlreadyCancelled',
        'Order is already cancelled'
      ));
    }

    this._status = OrderStatus.cancelled();
    this.incrementVersion();

    this.addDomainEvent(new OrderCancelledEvent(
      this.id,
      reason
    ));

    return Result.ok();
  }

  public confirm(): Result<void> {
    return this.changeStatus(OrderStatus.confirmed());
  }

  public ship(): Result<void> {
    return this.changeStatus(OrderStatus.shipped());
  }

  public deliver(): Result<void> {
    return this.changeStatus(OrderStatus.delivered());
  }
}
```

## Functional Error Handling

### 1. Service with Result Types

```typescript
// src/domain/services/order-service.ts
import { Result, Error, Maybe } from '@universal-ddd/architecture-core';
import { Order } from '../entities/order';
import { OrderItem } from '../entities/order-item';
import { Money } from '../value-objects/money';

export class OrderService {
  public createOrder(
    orderId: string,
    customerId: string,
    items: Array<{ productId: string; productName: string; unitPrice: Money; quantity: number }>
  ): Result<Order> {
    try {
      // Validate input
      if (!orderId?.trim()) {
        return Result.fail(Error.validation(
          'OrderService.InvalidOrderId',
          'Order ID cannot be empty'
        ));
      }

      if (!customerId?.trim()) {
        return Result.fail(Error.validation(
          'OrderService.InvalidCustomerId',
          'Customer ID cannot be empty'
        ));
      }

      if (!items || items.length === 0) {
        return Result.fail(Error.validation(
          'OrderService.NoItems',
          'Order must have at least one item'
        ));
      }

      // Create order items
      const orderItems: OrderItem[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const orderItem = new OrderItem(
          `${orderId}-item-${i + 1}`,
          item.productId,
          item.productName,
          item.unitPrice,
          item.quantity
        );
        orderItems.push(orderItem);
      }

      // Create order
      const order = new Order(orderId, customerId, orderItems);
      return Result.ok(order);

    } catch (error) {
      return Result.fail(Error.domain(
        'OrderService.CreationFailed',
        `Failed to create order: ${error.message}`
      ));
    }
  }

  public calculateDiscount(order: Order, discountPercentage: number): Result<Money> {
    if (discountPercentage < 0 || discountPercentage > 100) {
      return Result.fail(Error.validation(
        'OrderService.InvalidDiscountPercentage',
        'Discount percentage must be between 0 and 100'
      ));
    }

    try {
      const totalAmount = order.getTotalAmount();
      const discountAmount = totalAmount.multiply(discountPercentage / 100);
      return Result.ok(discountAmount);
    } catch (error) {
      return Result.fail(Error.domain(
        'OrderService.DiscountCalculationFailed',
        `Failed to calculate discount: ${error.message}`
      ));
    }
  }

  public validateOrderForShipping(order: Order): Result<void> {
    // Chain multiple validations using Result.bind
    return Result.ok()
      .ensure(
        () => order.status.value === 'Confirmed',
        Error.domain('OrderService.NotConfirmed', 'Order must be confirmed before shipping')
      )
      .ensure(
        () => order.items.length > 0,
        Error.domain('OrderService.NoItems', 'Order must have items to ship')
      )
      .ensure(
        () => order.getTotalAmount().amount > 0,
        Error.domain('OrderService.ZeroAmount', 'Order amount must be greater than zero')
      );
  }
}
```

### 2. Error Handling Patterns

```typescript
// src/application/handlers/order-command-handler.ts
import { Result, Error, Maybe } from '@universal-ddd/architecture-core';
import { OrderService } from '../../domain/services/order-service';
import { IOrderRepository } from '../interfaces/order-repository';

export interface CreateOrderCommand {
  orderId: string;
  customerId: string;
  items: Array<{
    productId: string;
    productName: string;
    unitPrice: { amount: number; currency: string };
    quantity: number;
  }>;
}

export class OrderCommandHandler {
  constructor(
    private orderService: OrderService,
    private orderRepository: IOrderRepository
  ) {}

  public async handleCreateOrder(
    command: CreateOrderCommand,
    signal?: AbortSignal
  ): Promise<Result<string>> {
    // Check if order already exists
    const existingOrderResult = await this.orderRepository.getByIdAsync(command.orderId, signal);

    return existingOrderResult.match(
      // Order found - this is an error
      (existingOrder) => Result.fail(Error.domain(
        'OrderCommandHandler.OrderAlreadyExists',
        `Order with ID ${command.orderId} already exists`
      )),
      // Order not found - proceed with creation
      async () => {
        // Convert command to domain objects
        const items = command.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          unitPrice: new Money(item.unitPrice.amount, item.unitPrice.currency),
          quantity: item.quantity
        }));

        // Create order using domain service
        const createOrderResult = this.orderService.createOrder(
          command.orderId,
          command.customerId,
          items
        );

        // Chain operations using bind
        return createOrderResult.bind(async (order) => {
          // Persist the order
          const saveResult = await this.orderRepository.addAsync(order, signal);
          return saveResult.map(() => order.id);
        });
      }
    );
  }

  public async handleCancelOrder(
    orderId: string,
    reason: string,
    signal?: AbortSignal
  ): Promise<Result<void>> {
    // Get order with functional error handling
    const orderResult = await this.orderRepository.getByIdAsync(orderId, signal);

    return orderResult.match(
      // Order found
      async (order) => {
        // Cancel the order
        const cancelResult = order.cancel(reason);

        return cancelResult.bind(async () => {
          // Save the updated order
          return await this.orderRepository.updateAsync(order, signal);
        });
      },
      // Order not found
      () => Result.fail(Error.domain(
        'OrderCommandHandler.OrderNotFound',
        `Order with ID ${orderId} not found`
      ))
    );
  }
}
```

## Repository Implementation

### 1. Repository Interface

```typescript
// src/application/interfaces/order-repository.ts
import { IRepository } from '@universal-ddd/architecture-core';
import { Order } from '../../domain/entities/order';

export interface IOrderRepository extends IRepository<Order, string> {
  findByCustomerIdAsync(customerId: string, signal?: AbortSignal): Promise<Order[]>;
  findByStatusAsync(status: string, signal?: AbortSignal): Promise<Order[]>;
}
```

### 2. In-Memory Repository Implementation

```typescript
// src/infrastructure/repositories/in-memory-order-repository.ts
import { Maybe, Result, Error } from '@universal-ddd/architecture-core';
import { Order } from '../../domain/entities/order';
import { IOrderRepository } from '../../application/interfaces/order-repository';

export class InMemoryOrderRepository implements IOrderRepository {
  private orders: Map<string, Order> = new Map();

  public async getByIdAsync(id: string, signal?: AbortSignal): Promise<Maybe<Order>> {
    this.checkCancellation(signal);

    const order = this.orders.get(id);
    return order ? Maybe.some(order) : Maybe.none<Order>();
  }

  public async addAsync(aggregate: Order, signal?: AbortSignal): Promise<Result<void>> {
    this.checkCancellation(signal);

    if (this.orders.has(aggregate.id)) {
      return Result.fail(Error.domain(
        'Repository.DuplicateOrder',
        `Order with ID ${aggregate.id} already exists`
      ));
    }

    try {
      // Clone the order to simulate persistence
      this.orders.set(aggregate.id, this.cloneOrder(aggregate));

      // Clear domain events after successful persistence
      aggregate.clearDomainEvents();

      return Result.ok();
    } catch (error) {
      return Result.fail(Error.infrastructure(
        'Repository.AddFailed',
        `Failed to add order: ${error.message}`
      ));
    }
  }

  public async updateAsync(aggregate: Order, signal?: AbortSignal): Promise<Result<void>> {
    this.checkCancellation(signal);

    if (!this.orders.has(aggregate.id)) {
      return Result.fail(Error.domain(
        'Repository.OrderNotFound',
        `Order with ID ${aggregate.id} not found`
      ));
    }

    try {
      const existingOrder = this.orders.get(aggregate.id)!;

      // Optimistic concurrency check
      if (existingOrder.version !== aggregate.version - 1) {
        return Result.fail(Error.concurrency(
          'Repository.ConcurrencyConflict',
          `Order version conflict. Expected ${existingOrder.version + 1}, got ${aggregate.version}`
        ));
      }

      // Update the order
      this.orders.set(aggregate.id, this.cloneOrder(aggregate));

      // Clear domain events after successful persistence
      aggregate.clearDomainEvents();

      return Result.ok();
    } catch (error) {
      return Result.fail(Error.infrastructure(
        'Repository.UpdateFailed',
        `Failed to update order: ${error.message}`
      ));
    }
  }

  public async deleteAsync(id: string, signal?: AbortSignal): Promise<Result<void>> {
    this.checkCancellation(signal);

    if (!this.orders.has(id)) {
      return Result.fail(Error.domain(
        'Repository.OrderNotFound',
        `Order with ID ${id} not found`
      ));
    }

    try {
      this.orders.delete(id);
      return Result.ok();
    } catch (error) {
      return Result.fail(Error.infrastructure(
        'Repository.DeleteFailed',
        `Failed to delete order: ${error.message}`
      ));
    }
  }

  public async existsAsync(id: string, signal?: AbortSignal): Promise<boolean> {
    this.checkCancellation(signal);
    return this.orders.has(id);
  }

  public async findByCustomerIdAsync(customerId: string, signal?: AbortSignal): Promise<Order[]> {
    this.checkCancellation(signal);

    const orders = Array.from(this.orders.values())
      .filter(order => order.customerId === customerId);

    return orders.map(order => this.cloneOrder(order));
  }

  public async findByStatusAsync(status: string, signal?: AbortSignal): Promise<Order[]> {
    this.checkCancellation(signal);

    const orders = Array.from(this.orders.values())
      .filter(order => order.status.value === status);

    return orders.map(order => this.cloneOrder(order));
  }

  private cloneOrder(order: Order): Order {
    // In a real implementation, this would use proper serialization/deserialization
    // For this example, we'll create a new instance
    return new Order(
      order.id,
      order.customerId,
      order.items,
      order.status
    );
  }

  private checkCancellation(signal?: AbortSignal): void {
    if (signal?.aborted) {
      throw Error.infrastructure(
        'Repository.OperationCancelled',
        'Repository operation was cancelled'
      );
    }
  }
}
```

## Express.js Integration

### 1. Result Middleware

```typescript
// src/presentation/middleware/result-middleware.ts
import { Request, Response, NextFunction } from 'express';
import { Result, Error } from '@universal-ddd/architecture-core';

export interface ResultResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    category: string;
    metadata?: Record<string, any>;
  };
}

export function resultMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Extend response object with result helper method
    res.sendResult = function<T>(result: Result<T>): Response {
      return result.match(
        // Success case
        (value: T) => {
          const response: ResultResponse<T> = {
            success: true,
            data: value
          };
          return this.status(200).json(response);
        },
        // Failure case
        (error: Error) => {
          const response: ResultResponse<T> = {
            success: false,
            error: {
              code: error.code,
              message: error.message,
              category: error.category,
              metadata: error.metadata ? Object.fromEntries(error.metadata) : undefined
            }
          };

          // Map error categories to HTTP status codes
          const statusCode = this.getStatusCodeForError(error);
          return this.status(statusCode).json(response);
        }
      );
    };

    res.getStatusCodeForError = function(error: Error): number {
      switch (error.category) {
        case 'Domain':
          return 400; // Bad Request
        case 'Validation':
          return 422; // Unprocessable Entity
        case 'Infrastructure':
          return 500; // Internal Server Error
        case 'Concurrency':
          return 409; // Conflict
        case 'Security':
          return 403; // Forbidden
        default:
          return 500;
      }
    };

    next();
  };
}

// Extend Express Response interface
declare global {
  namespace Express {
    interface Response {
      sendResult<T>(result: Result<T>): Response;
      getStatusCodeForError(error: Error): number;
    }
  }
}
```

### 2. Order Controller

```typescript
// src/presentation/controllers/order-controller.ts
import { Request, Response } from 'express';
import { OrderCommandHandler, CreateOrderCommand } from '../../application/handlers/order-command-handler';
import { IOrderRepository } from '../../application/interfaces/order-repository';

export class OrderController {
  constructor(
    private orderCommandHandler: OrderCommandHandler,
    private orderRepository: IOrderRepository
  ) {}

  public async createOrder(req: Request, res: Response): Promise<void> {
    const command: CreateOrderCommand = req.body;

    // Use AbortController for request cancellation
    const controller = new AbortController();
    req.on('close', () => controller.abort());

    const result = await this.orderCommandHandler.handleCreateOrder(command, controller.signal);
    res.sendResult(result);
  }

  public async getOrder(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const controller = new AbortController();
    req.on('close', () => controller.abort());

    const orderResult = await this.orderRepository.getByIdAsync(id, controller.signal);

    const result = orderResult.match(
      (order) => Result.ok({
        id: order.id,
        customerId: order.customerId,
        status: order.status.value,
        totalAmount: {
          amount: order.getTotalAmount().amount,
          currency: order.getTotalAmount().currency
        },
        items: order.items.map(item => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          unitPrice: {
            amount: item.unitPrice.amount,
            currency: item.unitPrice.currency
          },
          quantity: item.quantity,
          totalPrice: {
            amount: item.getTotalPrice().amount,
            currency: item.getTotalPrice().currency
          }
        }))
      }),
      () => Result.fail(Error.domain(
        'OrderController.OrderNotFound',
        `Order with ID ${id} not found`
      ))
    );

    res.sendResult(result);
  }

  public async cancelOrder(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { reason } = req.body;

    const controller = new AbortController();
    req.on('close', () => controller.abort());

    const result = await this.orderCommandHandler.handleCancelOrder(id, reason, controller.signal);
    res.sendResult(result);
  }

  public async getOrdersByCustomer(req: Request, res: Response): Promise<void> {
    const { customerId } = req.params;

    const controller = new AbortController();
    req.on('close', () => controller.abort());

    try {
      const orders = await this.orderRepository.findByCustomerIdAsync(customerId, controller.signal);

      const orderDtos = orders.map(order => ({
        id: order.id,
        customerId: order.customerId,
        status: order.status.value,
        totalAmount: {
          amount: order.getTotalAmount().amount,
          currency: order.getTotalAmount().currency
        }
      }));

      res.sendResult(Result.ok(orderDtos));
    } catch (error) {
      const result = Result.fail(Error.infrastructure(
        'OrderController.GetOrdersFailed',
        `Failed to get orders for customer: ${error.message}`
      ));
      res.sendResult(result);
    }
  }
}
```

### 3. Application Setup

```typescript
// src/app.ts
import express from 'express';
import { OrderController } from './presentation/controllers/order-controller';
import { OrderCommandHandler } from './application/handlers/order-command-handler';
import { OrderService } from './domain/services/order-service';
import { InMemoryOrderRepository } from './infrastructure/repositories/in-memory-order-repository';
import { resultMiddleware } from './presentation/middleware/result-middleware';

export function createApp(): express.Application {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(resultMiddleware());

  // Dependency injection (in a real app, use a DI container)
  const orderRepository = new InMemoryOrderRepository();
  const orderService = new OrderService();
  const orderCommandHandler = new OrderCommandHandler(orderService, orderRepository);
  const orderController = new OrderController(orderCommandHandler, orderRepository);

  // Routes
  app.post('/api/orders', (req, res) => orderController.createOrder(req, res));
  app.get('/api/orders/:id', (req, res) => orderController.getOrder(req, res));
  app.post('/api/orders/:id/cancel', (req, res) => orderController.cancelOrder(req, res));
  app.get('/api/customers/:customerId/orders', (req, res) =>
    orderController.getOrdersByCustomer(req, res)
  );

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  return app;
}

// src/server.ts
import { createApp } from './app';

const app = createApp();
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

## Testing Examples

### 1. Unit Tests

```typescript
// tests/unit/domain/entities/order.test.ts
import { Money } from '../../../../src/domain/value-objects/money';
import { OrderStatus } from '../../../../src/domain/value-objects/order-status';
import { OrderItem } from '../../../../src/domain/entities/order-item';
import { Order } from '../../../../src/domain/entities/order';

describe('Order', () => {
  describe('Should_CreateOrder_When_ValidDataProvided', () => {
    it('creates order with correct properties', () => {
      // Given
      const orderId = 'order-123';
      const customerId = 'customer-456';
      const item = new OrderItem(
        'item-1',
        'product-1',
        'Test Product',
        new Money(10.99, 'USD'),
        2
      );

      // When
      const order = new Order(orderId, customerId, [item]);

      // Then
      expect(order.id).toBe(orderId);
      expect(order.customerId).toBe(customerId);
      expect(order.items).toHaveLength(1);
      expect(order.status.value).toBe('Pending');
      expect(order.version).toBe(0);
      expect(order.domainEvents).toHaveLength(1);
    });
  });

  describe('Should_CalculateTotalAmount_When_MultipleItems', () => {
    it('calculates correct total for multiple items', () => {
      // Given
      const item1 = new OrderItem('item-1', 'product-1', 'Product 1', new Money(10.00, 'USD'), 2);
      const item2 = new OrderItem('item-2', 'product-2', 'Product 2', new Money(15.00, 'USD'), 1);
      const order = new Order('order-123', 'customer-456', [item1, item2]);

      // When
      const total = order.getTotalAmount();

      // Then
      expect(total.amount).toBe(35.00); // (10.00 * 2) + (15.00 * 1)
      expect(total.currency).toBe('USD');
    });
  });

  describe('Should_FailToAddItem_When_OrderNotPending', () => {
    it('returns failure result for non-pending orders', () => {
      // Given
      const item1 = new OrderItem('item-1', 'product-1', 'Product 1', new Money(10.00, 'USD'), 1);
      const order = new Order('order-123', 'customer-456', [item1], OrderStatus.confirmed());
      const newItem = new OrderItem('item-2', 'product-2', 'Product 2', new Money(15.00, 'USD'), 1);

      // When
      const result = order.addItem(newItem);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error?.code).toBe('Order.CannotModifyNonPendingOrder');
    });
  });

  describe('Should_TransitionStatus_When_ValidTransition', () => {
    it('transitions from pending to confirmed', () => {
      // Given
      const item = new OrderItem('item-1', 'product-1', 'Product 1', new Money(10.00, 'USD'), 1);
      const order = new Order('order-123', 'customer-456', [item]);
      const initialVersion = order.version;

      // When
      const result = order.confirm();

      // Then
      expect(result.isSuccess).toBe(true);
      expect(order.status.value).toBe('Confirmed');
      expect(order.version).toBe(initialVersion + 1);
      expect(order.domainEvents).toHaveLength(2); // OrderCreated + OrderStatusChanged
    });
  });
});
```

### 2. Integration Tests

```typescript
// tests/integration/order-workflow.test.ts
import { OrderService } from '../../src/domain/services/order-service';
import { OrderCommandHandler } from '../../src/application/handlers/order-command-handler';
import { InMemoryOrderRepository } from '../../src/infrastructure/repositories/in-memory-order-repository';
import { Money } from '../../src/domain/value-objects/money';

describe('Order Workflow Integration', () => {
  let orderService: OrderService;
  let orderRepository: InMemoryOrderRepository;
  let orderCommandHandler: OrderCommandHandler;

  beforeEach(() => {
    orderService = new OrderService();
    orderRepository = new InMemoryOrderRepository();
    orderCommandHandler = new OrderCommandHandler(orderService, orderRepository);
  });

  describe('Should_CompleteOrderLifecycle_When_ValidOperations', () => {
    it('creates, confirms, ships, and delivers order successfully', async () => {
      // Given
      const command = {
        orderId: 'order-integration-test',
        customerId: 'customer-test',
        items: [
          {
            productId: 'product-1',
            productName: 'Test Product',
            unitPrice: { amount: 29.99, currency: 'USD' },
            quantity: 2
          }
        ]
      };

      // When - Create order
      const createResult = await orderCommandHandler.handleCreateOrder(command);

      // Then
      expect(createResult.isSuccess).toBe(true);
      const orderId = createResult.getValueOrThrow();

      // When - Get created order
      const orderMaybe = await orderRepository.getByIdAsync(orderId);

      // Then
      expect(orderMaybe.hasValue).toBe(true);
      const order = orderMaybe.orElseThrow();
      expect(order.status.value).toBe('Pending');

      // When - Confirm order
      const confirmResult = order.confirm();
      expect(confirmResult.isSuccess).toBe(true);

      const updateResult1 = await orderRepository.updateAsync(order);
      expect(updateResult1.isSuccess).toBe(true);

      // When - Ship order
      const shipResult = order.ship();
      expect(shipResult.isSuccess).toBe(true);

      const updateResult2 = await orderRepository.updateAsync(order);
      expect(updateResult2.isSuccess).toBe(true);

      // When - Deliver order
      const deliverResult = order.deliver();
      expect(deliverResult.isSuccess).toBe(true);

      const updateResult3 = await orderRepository.updateAsync(order);
      expect(updateResult3.isSuccess).toBe(true);

      // Then - Verify final state
      const finalOrderMaybe = await orderRepository.getByIdAsync(orderId);
      const finalOrder = finalOrderMaybe.orElseThrow();
      expect(finalOrder.status.value).toBe('Delivered');
    });
  });

  describe('Should_HandleCancellation_When_RequestCancelled', () => {
    it('respects abort signal during repository operations', async () => {
      // Given
      const controller = new AbortController();
      const orderId = 'order-cancellation-test';

      // When - Cancel the operation immediately
      controller.abort();

      // Then - Repository should respect cancellation
      await expect(async () => {
        await orderRepository.getByIdAsync(orderId, controller.signal);
      }).rejects.toThrow();
    });
  });
});
```

### 3. Contract Tests

```typescript
// tests/contract/functional-types.test.ts
import { Result, Maybe, Error, ErrorCategory } from '@universal-ddd/architecture-core';

describe('Functional Types Contract Tests', () => {
  describe('Result Monadic Laws', () => {
    describe('Should_SatisfyLeftIdentity_When_UsingBind', () => {
      it('satisfies left identity law', () => {
        // Given
        const value = 42;
        const f = (x: number) => Result.ok(x * 2);

        // When
        const result1 = Result.ok(value).bind(f);
        const result2 = f(value);

        // Then
        expect(result1.isSuccess).toBe(result2.isSuccess);
        if (result1.isSuccess && result2.isSuccess) {
          expect(result1.value).toEqual(result2.value);
        }
      });
    });

    describe('Should_SatisfyRightIdentity_When_UsingBind', () => {
      it('satisfies right identity law', () => {
        // Given
        const result = Result.ok(42);

        // When
        const boundResult = result.bind(x => Result.ok(x));

        // Then
        expect(boundResult.isSuccess).toBe(result.isSuccess);
        if (boundResult.isSuccess && result.isSuccess) {
          expect(boundResult.value).toEqual(result.value);
        }
      });
    });

    describe('Should_SatisfyAssociativity_When_ChainingBind', () => {
      it('satisfies associativity law', () => {
        // Given
        const m = Result.ok(5);
        const f = (x: number) => Result.ok(x + 1);
        const g = (x: number) => Result.ok(x * 2);

        // When
        const result1 = m.bind(f).bind(g);
        const result2 = m.bind(x => f(x).bind(g));

        // Then
        expect(result1.isSuccess).toBe(result2.isSuccess);
        if (result1.isSuccess && result2.isSuccess) {
          expect(result1.value).toEqual(result2.value);
        }
      });
    });
  });

  describe('Maybe Monadic Laws', () => {
    describe('Should_SatisfyLeftIdentity_When_UsingBind', () => {
      it('satisfies left identity law for Some', () => {
        // Given
        const value = 42;
        const f = (x: number) => Maybe.some(x * 2);

        // When
        const result1 = Maybe.some(value).bind(f);
        const result2 = f(value);

        // Then
        expect(result1.hasValue).toBe(result2.hasValue);
        if (result1.hasValue && result2.hasValue) {
          expect(result1.value).toEqual(result2.value);
        }
      });
    });

    describe('Should_HandleNone_When_ChainingOperations', () => {
      it('propagates None through operation chain', () => {
        // Given
        const maybe = Maybe.none<number>();

        // When
        const result = maybe
          .map(x => x * 2)
          .bind(x => Maybe.some(x + 1))
          .map(x => x.toString());

        // Then
        expect(result.hasValue).toBe(false);
      });
    });
  });
});
```

This quickstart guide demonstrates a complete implementation of Architecture.Core patterns in TypeScript with Node.js, showing how to build a robust domain-driven application using functional programming principles for error handling and type safety.