# Migration Guide: C# to TypeScript

This guide helps developers migrate from the C# .NET implementation of Architecture.Core to the TypeScript Node.js implementation. Both implementations maintain API compatibility while following language-specific conventions.

## 🏗️ Structural Differences

### Project Structure

**C# (.NET)**
```
src/
├── Architecture.Core/
│   ├── Domain/
│   ├── Functional/
│   └── Infrastructure/
└── Architecture.Core.Tests/
```

**TypeScript (Node.js)**
```
src/
├── domain/
├── functional/
└── infrastructure/
tests/
├── contract/
├── integration/
└── unit/
```

### Package Management

**C# (.NET)**
```xml
<PackageReference Include="Architecture.Core" Version="1.0.0" />
```

**TypeScript (Node.js)**
```bash
npm install @universal-ddd/architecture-core
```

## 📦 Import and Namespace Changes

### C# Namespaces
```csharp
using Architecture.Core;
using Architecture.Core.Functional;
using Architecture.Core.Domain;
```

### TypeScript Modules
```typescript
import {
  Result,
  Maybe,
  Error,
  ValueObject,
  Entity,
  AggregateRoot
} from '@universal-ddd/architecture-core';

// Or selective imports
import { Result, Maybe } from '@universal-ddd/architecture-core/functional';
import { ValueObject, Entity } from '@universal-ddd/architecture-core/domain';
```

## 🔧 Functional Types Migration

### Result Type

**C# Implementation**
```csharp
public readonly struct Result<T>
{
    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public T Value { get; }
    public Error Error { get; }

    public static Result<T> Ok(T value) => new(value, default, true);
    public static Result<T> Fail(Error error) => new(default, error, false);

    public Result<TResult> Map<TResult>(Func<T, TResult> func)
    {
        return IsSuccess ? Result<TResult>.Ok(func(Value)) : Result<TResult>.Fail(Error);
    }

    public Result<TResult> Bind<TResult>(Func<T, Result<TResult>> func)
    {
        return IsSuccess ? func(Value) : Result<TResult>.Fail(Error);
    }

    public TOut Match<TOut>(Func<T, TOut> onSuccess, Func<Error, TOut> onFailure)
    {
        return IsSuccess ? onSuccess(Value) : onFailure(Error);
    }
}
```

**TypeScript Implementation**
```typescript
export class ResultOf<T> implements IResultOf<T> {
  public readonly isSuccess: boolean;
  public readonly isFailure: boolean;
  public readonly value: T;
  public readonly error: Error;

  public static ok<T>(value: T): ResultOf<T> {
    return new ResultOf<T>(true, value, null as any);
  }

  public static fail<T>(error: Error): ResultOf<T> {
    return new ResultOf<T>(false, null as any, error);
  }

  public map<TResult>(func: (value: T) => TResult): ResultOf<TResult> {
    return this.isSuccess
      ? ResultOf.ok(func(this.value))
      : ResultOf.fail<TResult>(this.error);
  }

  public bind<TResult>(func: (value: T) => ResultOf<TResult>): ResultOf<TResult> {
    return this.isSuccess ? func(this.value) : ResultOf.fail<TResult>(this.error);
  }

  public match<TOut>(
    onSuccess: (value: T) => TOut,
    onFailure: (error: Error) => TOut
  ): TOut {
    return this.isSuccess ? onSuccess(this.value) : onFailure(this.error);
  }
}
```

**Migration Patterns**
```csharp
// C# Pattern
var result = ProcessData()
    .Map(x => x.ToString())
    .Bind(ValidateString);

return result.Match(
    success => Ok(success),
    error => BadRequest(error.Message)
);
```

```typescript
// TypeScript Pattern
const result = processData()
  .map(x => x.toString())
  .bind(validateString);

return result.match(
  success => res.ok(success),
  error => res.badRequest(error.message)
);
```

### Maybe Type

**C# Implementation**
```csharp
public readonly struct Maybe<T>
{
    public bool HasValue { get; }
    public T Value { get; }

    public static Maybe<T> Some(T value) => new(value, true);
    public static Maybe<T> None() => new(default, false);

    public Maybe<TResult> Map<TResult>(Func<T, TResult> func)
    {
        return HasValue ? Maybe<TResult>.Some(func(Value)) : Maybe<TResult>.None();
    }

    public T OrElse(T defaultValue) => HasValue ? Value : defaultValue;
}
```

**TypeScript Implementation**
```typescript
export class Maybe<T> implements IMaybe<T> {
  public readonly hasValue: boolean;
  public readonly value: T;

  public static some<T>(value: T): Maybe<T> {
    return new Maybe<T>(true, value);
  }

  public static none<T>(): Maybe<T> {
    return new Maybe<T>(false, null as any);
  }

  public map<TResult>(func: (value: T) => TResult): Maybe<TResult> {
    return this.hasValue
      ? Maybe.some(func(this.value))
      : Maybe.none<TResult>();
  }

  public orElse(defaultValue: T): T {
    return this.hasValue ? this.value : defaultValue;
  }
}
```

### Error Type

**C# Implementation**
```csharp
public readonly struct Error
{
    public string Code { get; }
    public string Message { get; }
    public ErrorCategory Category { get; }
    public IReadOnlyDictionary<string, object> Metadata { get; }

    public static Error Domain(string code, string message,
        IDictionary<string, object>? metadata = null)
    {
        return new Error(code, message, ErrorCategory.Domain, metadata);
    }
}
```

**TypeScript Implementation**
```typescript
export class Error implements IError {
  public readonly code: string;
  public readonly message: string;
  public readonly category: ErrorCategory;
  public readonly metadata: Readonly<Record<string, unknown>>;

  public static domain(
    code: string,
    message: string,
    metadata?: Record<string, unknown> | null
  ): Error {
    return new Error(code, message, ErrorCategory.Domain, metadata);
  }
}
```

## 🏛️ Domain Types Migration

### Value Objects

**C# Implementation**
```csharp
public abstract class ValueObject
{
    protected abstract IEnumerable<object?> GetEqualityComponents();

    public override bool Equals(object? obj)
    {
        if (obj == null || obj.GetType() != GetType())
            return false;

        var other = (ValueObject)obj;
        return GetEqualityComponents().SequenceEqual(other.GetEqualityComponents());
    }

    public override int GetHashCode()
    {
        return GetEqualityComponents()
            .Where(x => x != null)
            .Aggregate(1, (current, obj) => current * 23 + obj.GetHashCode());
    }
}

// Usage
public class Money : ValueObject
{
    public decimal Amount { get; }
    public string Currency { get; }

    public Money(decimal amount, string currency)
    {
        Amount = amount;
        Currency = currency;
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Amount;
        yield return Currency;
    }
}
```

**TypeScript Implementation**
```typescript
export abstract class ValueObject {
  protected abstract getEqualityComponents(): IterableIterator<unknown>;

  public equals(other: unknown): boolean {
    if (other === null || other === undefined) return false;
    if (this.constructor !== (other as any).constructor) return false;

    const thisComponents = Array.from(this.getEqualityComponents());
    const otherComponents = Array.from((other as ValueObject).getEqualityComponents());

    if (thisComponents.length !== otherComponents.length) return false;

    for (let i = 0; i < thisComponents.length; i++) {
      if (thisComponents[i] !== otherComponents[i]) return false;
    }

    return true;
  }

  public getHashCode(): number {
    const components = Array.from(this.getEqualityComponents());
    let hash = 1;

    for (const component of components) {
      if (component !== null && component !== undefined) {
        hash = hash * 23 + this.getComponentHashCode(component);
      }
    }

    return hash;
  }
}

// Usage
class Money extends ValueObject {
  constructor(
    public readonly amount: number,
    public readonly currency: string
  ) {
    super();
  }

  protected *getEqualityComponents(): IterableIterator<unknown> {
    yield this.amount;
    yield this.currency;
  }
}
```

### Entities

**C# Implementation**
```csharp
public abstract class Entity<TId> : IEntity<TId>
    where TId : class
{
    public TId Id { get; protected init; }

    protected Entity(TId id)
    {
        Id = id ?? throw new ArgumentNullException(nameof(id));
    }

    public override bool Equals(object? obj)
    {
        if (obj is not Entity<TId> other) return false;
        if (ReferenceEquals(this, other)) return true;
        if (GetType() != other.GetType()) return false;

        return Id.Equals(other.Id);
    }

    public override int GetHashCode() => Id.GetHashCode();
}
```

**TypeScript Implementation**
```typescript
export abstract class Entity<TId extends object> implements IEntity<TId> {
  public readonly id: TId;

  protected constructor(id: TId) {
    if (!id) {
      throw new Error('Entity ID cannot be null or undefined');
    }
    this.id = id;
  }

  public equals(other: unknown): boolean {
    if (!(other instanceof Entity)) return false;
    if (this === other) return true;
    if (this.constructor !== other.constructor) return false;

    return this.id === (other as Entity<TId>).id;
  }

  public getHashCode(): number {
    return typeof this.id === 'object' && 'getHashCode' in this.id
      ? (this.id as any).getHashCode()
      : this.defaultHashCode(this.id);
  }
}
```

### Aggregate Roots

**C# Implementation**
```csharp
public abstract class AggregateRoot<TId> : Entity<TId>, IAggregateRoot<TId>
    where TId : class
{
    private readonly List<IDomainEvent> _events = new();

    public long Version { get; protected set; }
    public IReadOnlyCollection<IDomainEvent> Events => _events.AsReadOnly();

    protected AggregateRoot(TId id) : base(id) { }

    protected void AddEvent(IDomainEvent domainEvent)
    {
        _events.Add(domainEvent);
    }

    public void ClearEvents()
    {
        _events.Clear();
    }
}
```

**TypeScript Implementation**
```typescript
export abstract class AggregateRoot<TId extends object>
  extends Entity<TId>
  implements IAggregateRoot<TId> {

  private _events: IDomainEvent[] = [];
  private _version: number = 0;

  public get version(): number {
    return this._version;
  }

  public get events(): ReadonlyArray<IDomainEvent> {
    return Object.freeze([...this._events]);
  }

  protected constructor(id: TId) {
    super(id);
  }

  protected addEvent(domainEvent: IDomainEvent): void {
    this._events.push(domainEvent);
  }

  public clearEvents(): void {
    this._events = [];
  }
}
```

## 🗃️ Repository Pattern Migration

### Interface Definition

**C# Implementation**
```csharp
public interface IRepository<TAggregate, TId>
    where TAggregate : class, IAggregateRoot<TId>
    where TId : class
{
    Task<Maybe<TAggregate>> GetByIdAsync(TId id, CancellationToken cancellationToken = default);
    Task<Result> AddAsync(TAggregate aggregate, CancellationToken cancellationToken = default);
    Task<Result> UpdateAsync(TAggregate aggregate, CancellationToken cancellationToken = default);
    Task<Result> DeleteAsync(TId id, CancellationToken cancellationToken = default);
    Task<Result<bool>> ExistsAsync(TId id, CancellationToken cancellationToken = default);
}
```

**TypeScript Implementation**
```typescript
export interface IRepository<TAggregate extends IAggregateRoot<TId>, TId extends object> {
  getByIdAsync(id: TId, cancellationToken?: AbortSignal): Promise<ResultOf<Maybe<TAggregate>>>;
  addAsync(aggregate: TAggregate, cancellationToken?: AbortSignal): Promise<Result>;
  updateAsync(aggregate: TAggregate, cancellationToken?: AbortSignal): Promise<Result>;
  deleteAsync(id: TId, cancellationToken?: AbortSignal): Promise<Result>;
  existsAsync(id: TId, cancellationToken?: AbortSignal): Promise<ResultOf<boolean>>;
}
```

### Implementation Example

**C# Implementation**
```csharp
public class InMemoryOrderRepository : IRepository<Order, OrderId>
{
    private readonly Dictionary<string, Order> _orders = new();

    public async Task<Maybe<Order>> GetByIdAsync(OrderId id, CancellationToken cancellationToken = default)
    {
        await Task.Delay(1, cancellationToken); // Simulate async
        return _orders.TryGetValue(id.Value, out var order) ? Maybe<Order>.Some(order) : Maybe<Order>.None();
    }

    public async Task<Result> AddAsync(Order aggregate, CancellationToken cancellationToken = default)
    {
        try
        {
            await Task.Delay(1, cancellationToken);
            _orders[aggregate.Id.Value] = aggregate;
            return Result.Ok();
        }
        catch (Exception ex)
        {
            return Error.Infrastructure("REPOSITORY_ERROR", ex.Message);
        }
    }
}
```

**TypeScript Implementation**
```typescript
export class InMemoryOrderRepository implements IRepository<Order, OrderId> {
  private readonly orders = new Map<string, Order>();

  public async getByIdAsync(
    id: OrderId,
    cancellationToken?: AbortSignal
  ): Promise<ResultOf<Maybe<Order>>> {
    try {
      await new Promise(resolve => setTimeout(resolve, 1)); // Simulate async

      if (cancellationToken?.aborted) {
        return ResultOf.fail(Error.infrastructure('OPERATION_CANCELLED', 'Operation was cancelled'));
      }

      const order = this.orders.get(id.value);
      return ResultOf.ok(order ? Maybe.some(order) : Maybe.none());
    } catch (error) {
      return ResultOf.fail(Error.infrastructure('REPOSITORY_ERROR', (error as Error).message));
    }
  }

  public async addAsync(
    aggregate: Order,
    cancellationToken?: AbortSignal
  ): Promise<Result> {
    try {
      await new Promise(resolve => setTimeout(resolve, 1));

      if (cancellationToken?.aborted) {
        return Result.fail(Error.infrastructure('OPERATION_CANCELLED', 'Operation was cancelled'));
      }

      this.orders.set(aggregate.id.value, aggregate);
      return Result.ok();
    } catch (error) {
      return Result.fail(Error.infrastructure('REPOSITORY_ERROR', (error as Error).message));
    }
  }
}
```

## 🔄 Async/Await Patterns

### C# Cancellation Tokens
```csharp
public async Task<Result<Order>> ProcessOrderAsync(
    OrderId orderId,
    CancellationToken cancellationToken = default)
{
    var order = await _orderRepository.GetByIdAsync(orderId, cancellationToken);

    if (!order.HasValue)
        return Error.Domain("ORDER_NOT_FOUND", "Order not found");

    // Process order...
    return Result<Order>.Ok(order.Value);
}
```

### TypeScript AbortSignal
```typescript
public async processOrderAsync(
  orderId: OrderId,
  cancellationToken?: AbortSignal
): Promise<ResultOf<Order>> {
  const orderResult = await this.orderRepository.getByIdAsync(orderId, cancellationToken);

  if (orderResult.isFailure) {
    return ResultOf.fail(orderResult.error);
  }

  const order = orderResult.value;
  if (!order.hasValue) {
    return ResultOf.fail(Error.domain('ORDER_NOT_FOUND', 'Order not found'));
  }

  // Process order...
  return ResultOf.ok(order.value);
}
```

## 🧪 Testing Patterns

### C# Testing
```csharp
[Test]
public void Should_CreateOrder_When_ValidDataProvided()
{
    // Given
    var orderId = new OrderId("order-123");
    var customerId = "customer-456";
    var total = new Money(100m, "USD");

    // When
    var order = new Order(orderId, customerId, total);

    // Then
    Assert.That(order.Id, Is.EqualTo(orderId));
    Assert.That(order.Status, Is.EqualTo(OrderStatus.Pending));
    Assert.That(order.Total, Is.EqualTo(total));
    Assert.That(order.Events.Count, Is.EqualTo(1));
}
```

### TypeScript Testing
```typescript
describe('Order Domain Tests', () => {
  it('Should_CreateOrder_When_ValidDataProvided', () => {
    // Given
    const orderId = new OrderId('order-123');
    const customerId = 'customer-456';
    const total = new Money(100, 'USD');

    // When
    const order = new Order(orderId, customerId, total);

    // Then
    expect(order.id.equals(orderId)).toBe(true);
    expect(order.status).toBe(OrderStatus.PENDING);
    expect(order.total.equals(total)).toBe(true);
    expect(order.events.length).toBe(1);
  });
});
```

## 🔧 Language-Specific Considerations

### Type Safety

**C# Nullable Reference Types**
```csharp
#nullable enable

public class Order : AggregateRoot<OrderId>
{
    public string? Description { get; private set; }

    public void SetDescription(string? description)
    {
        Description = description;
    }
}
```

**TypeScript Strict Null Checks**
```typescript
export class Order extends AggregateRoot<OrderId> {
  private description?: string;

  public setDescription(description: string | undefined): void {
    this.description = description;
  }

  public getDescription(): string | undefined {
    return this.description;
  }
}
```

### Serialization

**C# JSON Serialization**
```csharp
// Using System.Text.Json
var options = new JsonSerializerOptions
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    Converters = { new ResultJsonConverter(), new MaybeJsonConverter() }
};

var json = JsonSerializer.Serialize(result, options);
```

**TypeScript JSON Serialization**
```typescript
// Built-in JSON serialization
const serializedResult = {
  isSuccess: result.isSuccess,
  value: result.isSuccess ? result.value : undefined,
  error: result.isFailure ? {
    code: result.error.code,
    message: result.error.message,
    category: result.error.category
  } : undefined
};

const json = JSON.stringify(serializedResult);
```

## 🚀 Performance Considerations

### Memory Management

**C# Struct vs Class**
```csharp
// Structs for value types (stack allocation)
public readonly struct Result<T> { }
public readonly struct Maybe<T> { }
public readonly struct Error { }

// Classes for reference types (heap allocation)
public abstract class ValueObject { }
public abstract class Entity<TId> { }
```

**TypeScript Class Optimization**
```typescript
// All types are classes but optimized for performance
export class ResultOf<T> {
  // Use readonly properties to enable V8 optimizations
  public readonly isSuccess: boolean;
  public readonly value: T;

  // Freeze instances to prevent mutations
  constructor(isSuccess: boolean, value: T, error: Error) {
    this.isSuccess = isSuccess;
    this.value = value;
    Object.freeze(this);
  }
}
```

### Equality Comparisons

**C# Value Equality**
```csharp
public override bool Equals(object? obj)
{
    // Optimized equality with type checking
    return obj is Money other &&
           Amount == other.Amount &&
           Currency == other.Currency;
}
```

**TypeScript Equality**
```typescript
public equals(other: unknown): boolean {
  // Type-safe equality with instanceof
  if (!(other instanceof Money)) return false;

  return this.amount === other.amount &&
         this.currency === other.currency;
}
```

## 📋 Migration Checklist

### Before Migration
- [ ] Review C# implementation patterns
- [ ] Identify domain models and business logic
- [ ] Document existing test cases
- [ ] Plan async operation migration strategy

### During Migration
- [ ] Install TypeScript Node.js package
- [ ] Update import statements
- [ ] Convert namespace usage to module imports
- [ ] Migrate value objects using iterator pattern
- [ ] Update entity and aggregate implementations
- [ ] Convert CancellationToken to AbortSignal
- [ ] Adapt repository implementations
- [ ] Convert test frameworks (NUnit/xUnit → Jest)

### After Migration
- [ ] Run full test suite
- [ ] Validate functional behavior
- [ ] Performance testing
- [ ] Integration testing with existing systems
- [ ] Documentation updates

## 🆘 Common Issues and Solutions

### Issue: Generic Constraints
**C# Generic Constraints**
```csharp
where TId : class
where TAggregate : class, IAggregateRoot<TId>
```

**TypeScript Solution**
```typescript
// Use extends keyword with intersection types
interface IRepository<TAggregate extends IAggregateRoot<TId>, TId extends object>
```

### Issue: Null Reference Handling
**C# Nullable Context**
```csharp
public string? Description { get; set; }
if (description is not null) { ... }
```

**TypeScript Solution**
```typescript
public description?: string;
if (description !== undefined && description !== null) { ... }
```

### Issue: Async Enumeration
**C# Async Enumerable**
```csharp
public async IAsyncEnumerable<Order> GetOrdersAsync()
{
    await foreach (var order in source)
        yield return order;
}
```

**TypeScript Solution**
```typescript
public async* getOrdersAsync(): AsyncIterableIterator<Order> {
  for await (const order of source) {
    yield order;
  }
}
```

This migration guide ensures a smooth transition while maintaining the architectural integrity and functional patterns established in the C# implementation.