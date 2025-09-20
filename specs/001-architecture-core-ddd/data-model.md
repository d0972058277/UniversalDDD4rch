# Data Model: Architecture.Core Types

## Core Abstractions

### AggregateRoot<TId>
```csharp
public abstract class AggregateRoot<TId> : Entity<TId>, IAggregateRoot<TId>
    where TId : class
{
    private readonly List<IDomainEvent> _events = new();

    public long Version { get; protected set; }
    public IReadOnlyCollection<IDomainEvent> Events => _events.AsReadOnly();

    protected void AddEvent(IDomainEvent domainEvent);
    public void ClearEvents();
}
```

**Fields**:
- `Id` (inherited): Immutable identifier
- `Version`: Optimistic concurrency control version
- `Events`: Append-only domain event collection

**Validation Rules**:
- Id must not be null or empty
- Version must be non-negative
- Events collection is append-only (no removal)

**State Transitions**:
- New → Persisted (Version: 0 → 1)
- Modified → Updated (Version increments)
- Event addition triggers state change

### Entity<TId>
```csharp
public abstract class Entity<TId> : IEntity<TId>
    where TId : class
{
    public TId Id { get; protected init; }

    protected Entity(TId id);

    public override bool Equals(object? obj);
    public override int GetHashCode();
}
```

**Fields**:
- `Id`: Immutable identity value

**Validation Rules**:
- Id must not be null
- Id must be immutable after construction
- Equality based solely on Id

### ValueObject
```csharp
public abstract class ValueObject
{
    protected abstract IEnumerable<object?> GetEqualityComponents();

    public override bool Equals(object? obj);
    public override int GetHashCode();
    public static bool operator ==(ValueObject? left, ValueObject? right);
    public static bool operator !=(ValueObject? left, ValueObject? right);
}
```

**Validation Rules**:
- All properties must be immutable
- Equality based on all component values
- Null component handling in equality comparison

### DomainEvent Types

#### IDomainEvent Interface
```csharp
public interface IDomainEvent
{
    Guid Id { get; }
    DateTimeOffset OccurredAt { get; }
    string? CorrelationId { get; }
    string? CausationId { get; }
    IReadOnlyDictionary<string, object> Metadata { get; }
}
```

#### DomainEventBase
```csharp
public abstract class DomainEventBase : IDomainEvent
{
    public Guid Id { get; } = Guid.NewGuid();
    public DateTimeOffset OccurredAt { get; } = DateTimeOffset.UtcNow;
    public string? CorrelationId { get; init; }
    public string? CausationId { get; init; }
    public IReadOnlyDictionary<string, object> Metadata { get; init; }
}
```

### Repository<TAggregate, TId>
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

## Functional Types

### Result and Result<T>
```csharp
public readonly struct Result
{
    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public Error Error { get; }

    public static Result Ok();
    public static Result Fail(Error error);
    public Result<T> Map<T>(Func<T> func);
    public Result Bind(Func<Result> func);
    public T Match<T>(Func<T> onSuccess, Func<Error, T> onFailure);
}

public readonly struct Result<T>
{
    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public T Value { get; }
    public Error Error { get; }

    public static Result<T> Ok(T value);
    public static Result<T> Fail(Error error);
    public Result<TResult> Map<TResult>(Func<T, TResult> func);
    public Result<TResult> Bind<TResult>(Func<T, Result<TResult>> func);
    public TOut Match<TOut>(Func<T, TOut> onSuccess, Func<Error, TOut> onFailure);
}
```

### Error
```csharp
public readonly struct Error
{
    public string Code { get; }
    public string Message { get; }
    public ErrorCategory Category { get; }
    public IReadOnlyDictionary<string, object> Metadata { get; }

    public static Error Domain(string code, string message, IDictionary<string, object>? metadata = null);
    public static Error Validation(string code, string message, IDictionary<string, object>? metadata = null);
    public static Error Infrastructure(string code, string message, IDictionary<string, object>? metadata = null);
    public static Error Concurrency(string code, string message, IDictionary<string, object>? metadata = null);
    public static Error Security(string code, string message, IDictionary<string, object>? metadata = null);
}

public enum ErrorCategory
{
    Domain,
    Validation,
    Infrastructure,
    Concurrency,
    Security
}
```

### Maybe<T>
```csharp
public readonly struct Maybe<T>
{
    public bool HasValue { get; }
    public T Value { get; }

    public static Maybe<T> Some(T value);
    public static Maybe<T> None();
    public Maybe<TResult> Map<TResult>(Func<T, TResult> func);
    public Maybe<TResult> Bind<TResult>(Func<T, Maybe<TResult>> func);
    public T OrElse(T defaultValue);
    public T OrElse(Func<T> defaultFactory);
    public TOut Match<TOut>(Func<T, TOut> onSome, Func<TOut> onNone);
}
```

## Relationships

- **AggregateRoot** extends **Entity** and manages **DomainEvent** collection
- **Entity** uses identity-based equality with generic **TId** constraint
- **ValueObject** uses structural equality via component comparison
- **Repository** operates on **AggregateRoot** instances with async operations
- **Result/Maybe** provide functional error handling and optional value semantics
- **Error** categorizes failures with contextual metadata

## Validation Rules Summary

1. **Identity Constraints**: All Id types must be non-null reference types
2. **Immutability**: ValueObject and Event properties are immutable
3. **Event Ordering**: Domain events maintain chronological order
4. **Concurrency**: Version control prevents lost updates
5. **Error Handling**: All operations use Result/Maybe instead of exceptions
6. **Async Operations**: All I/O operations support cancellation tokens