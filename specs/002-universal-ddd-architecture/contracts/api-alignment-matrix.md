# API Alignment Matrix - Universal DDD Architecture v2.0

## Overview
This matrix defines the exact API mappings between languages to ensure semantic consistency while respecting language-specific naming conventions.

## Core Type Mappings

### AggregateRoot<TId> API Alignment

| Semantic Operation | C# (.NET 8) | Go (1.21+) | Java (21 LTS) | Python (3.12+) | TypeScript (5.9+) |
|-------------------|--------------|------------|---------------|----------------|-------------------|
| **Event Collection Access** | `Events` (property) | `DomainEvents()` (method) | `getDomainEvents()` (method) | `domain_events` (property) | `events` (property) |
| **Add Domain Event** | `AddEvent(event)` (protected) | `AddDomainEvent(event)` (public) | `addDomainEvent(event)` (protected) | `add_event(event)` (public) | `addEvent(event)` (protected) |
| **Clear Events** | `ClearEvents()` (public) | `ClearDomainEvents()` (public) | `clearDomainEvents()` (public) | `clear_events()` (public) | `clearEvents()` (public) |
| **Version Access** | `Version` (property) | `Version()` (method) | `getVersion()` (method) | `version` (property) | `version` (property) |
| **Increment Version** | `IncrementVersion()` (method) | `IncrementVersion()` (method) | `incrementVersion()` (method) | `increment_version()` (method) | `incrementVersion()` (method) |

### Repository<TAggregate, TId> API Alignment

| Semantic Operation | C# (.NET 8) | Go (1.21+) | Java (21 LTS) | Python (3.12+) | TypeScript (5.9+) |
|-------------------|--------------|------------|---------------|----------------|-------------------|
| **Get By ID** | `GetByIdAsync(id, ct)` | `GetByID(ctx, id)` | `getByIdAsync(id)` | `get_by_id_async(id)` | `getByIdAsync(id)` |
| **Return Type** | `Task<Maybe<T>>` | `(Maybe[T], error)` | `CompletableFuture<Maybe<T>>` | `Maybe[T]` | `Promise<Maybe<T>>` |
| **Add Aggregate** | `AddAsync(aggregate, ct)` | `Add(ctx, aggregate)` | `addAsync(aggregate)` | `add_async(aggregate)` | `addAsync(aggregate)` |
| **Add Return Type** | `Task<Result>` | `error` | `CompletableFuture<Result<Void>>` | `Result[None]` | `Promise<Result<void>>` |
| **Update Aggregate** | `UpdateAsync(aggregate, ct)` | `Update(ctx, aggregate)` | `updateAsync(aggregate)` | `update_async(aggregate)` | `updateAsync(aggregate)` |
| **Update Return Type** | `Task<Result>` | `error` | `CompletableFuture<Result<Void>>` | `Result[None]` | `Promise<Result<void>>` |
| **Delete Aggregate** | `DeleteAsync(id, ct)` | `Delete(ctx, id)` | `deleteAsync(id)` | `delete_async(id)` | `deleteAsync(id)` |
| **Delete Return Type** | `Task<Result>` | `error` | `CompletableFuture<Result<Void>>` | `Result[None]` | `Promise<Result<void>>` |
| **Check Existence** | `ExistsAsync(id, ct)` | `Exists(ctx, id)` | `existsAsync(id)` | `exists_async(id)` | `existsAsync(id)` |
| **Exists Return Type** | `Task<Result<bool>>` | `(bool, error)` | `CompletableFuture<Result<Boolean>>` | `Result[bool]` | `Promise<ResultOf<boolean>>` |

### Result<T> Monad API Alignment

| Semantic Operation | C# (.NET 8) | Go (1.21+) | Java (21 LTS) | Python (3.12+) | TypeScript (5.9+) |
|-------------------|--------------|------------|---------------|----------------|-------------------|
| **Success Creation** | `Result.Ok(value)` | `Ok[T](value)` | `Result.success(value)` | `Result.success(value)` | `Result.ok(value)` |
| **Failure Creation** | `Result.Fail(error)` | `Fail[T](error)` | `Result.failure(error)` | `Result.failure(error)` | `Result.fail(error)` |
| **Map Operation** | `result.Map(mapper)` | `Map(result, mapper)` | `result.map(mapper)` | `result.map(mapper)` | `result.map(mapper)` |
| **Bind Operation** | `result.Bind(binder)` | `Bind(result, binder)` | `result.bind(binder)` | `result.bind(binder)` | `result.bind(binder)` |
| **Match Operation** | `result.Match(onSuccess, onFailure)` | `Match(result, onSuccess, onFailure)` | `result.match(onSuccess, onFailure)` | `result.match(on_success, on_failure)` | `result.match(onSuccess, onFailure)` |
| **Success Check** | `result.IsSuccess` | `result.IsSuccess()` | `result.isSuccess()` | `result.is_success` | `result.isSuccess` |
| **Value Access** | `result.Value` | `result.Value()` | `result.getValue()` | `result.value` | `result.value` |
| **Error Access** | `result.Error` | `result.Error()` | `result.getError()` | `result.error` | `result.error` |

### Maybe<T> API Alignment

| Semantic Operation | C# (.NET 8) | Go (1.21+) | Java (21 LTS) | Python (3.12+) | TypeScript (5.9+) |
|-------------------|--------------|------------|---------------|----------------|-------------------|
| **Some Creation** | `Maybe.Some(value)` | `Some[T](value)` | `Maybe.some(value)` | `Maybe.some(value)` | `Maybe.some(value)` |
| **None Creation** | `Maybe.None<T>()` | `None[T]()` | `Maybe.none()` | `Maybe.none()` | `Maybe.none()` |
| **Has Value Check** | `maybe.HasValue` | `maybe.HasValue()` | `maybe.hasValue()` | `maybe.has_value` | `maybe.hasValue` |
| **Value Access** | `maybe.Value` | `maybe.Value()` | `maybe.getValue()` | `maybe.value` | `maybe.value` |
| **Map Operation** | `maybe.Map(mapper)` | `Map(maybe, mapper)` | `maybe.map(mapper)` | `maybe.map(mapper)` | `maybe.map(mapper)` |
| **Bind Operation** | `maybe.Bind(binder)` | `Bind(maybe, binder)` | `maybe.bind(binder)` | `maybe.bind(binder)` | `maybe.bind(binder)` |
| **Or Else** | `maybe.OrElse(defaultValue)` | `OrElse(maybe, defaultValue)` | `maybe.orElse(defaultValue)` | `maybe.or_else(default_value)` | `maybe.orElse(defaultValue)` |

## Error Handling Alignment

### Error Types Mapping

| Error Category | C# (.NET 8) | Go (1.21+) | Java (21 LTS) | Python (3.12+) | TypeScript (5.9+) |
|----------------|-------------|------------|---------------|----------------|-------------------|
| **Domain Error** | `DomainError : Error` | `DomainError` struct | `DomainError extends Error` | `DomainError(Error)` | `DomainError extends Error` |
| **Validation Error** | `ValidationError : Error` | `ValidationError` struct | `ValidationError extends Error` | `ValidationError(Error)` | `ValidationError extends Error` |
| **Infrastructure Error** | `InfrastructureError : Error` | `InfrastructureError` struct | `InfrastructureError extends Error` | `InfrastructureError(Error)` | `InfrastructureError extends Error` |
| **Concurrency Error** | `ConcurrencyError : Error` | `ConcurrencyError` struct | `ConcurrencyError extends Error` | `ConcurrencyError(Error)` | `ConcurrencyError extends Error` |
| **Security Error** | `SecurityError : Error` | `SecurityError` struct | `SecurityError extends Error` | `SecurityError(Error)` | `SecurityError extends Error` |

### Exception/Error Strategy

| Scenario | C# (.NET 8) | Go (1.21+) | Java (21 LTS) | Python (3.12+) | TypeScript (5.9+) |
|----------|-------------|------------|---------------|----------------|-------------------|
| **Business Logic Errors** | `Result<T>` types | `Result[T]` types | `Result<T>` types | `Result[T]` types | `Result<T>` types |
| **Infrastructure Errors** | `Result<T>` types | `Result[T]` types | `Result<T>` types | `Result[T]` types | `Result<T>` types |
| **Unrecoverable Errors** | Exceptions (rare) | `panic()` (rare) | Runtime exceptions | Python exceptions | Error objects |
| **Validation Errors** | `Result.Fail(ValidationError)` | `Fail[T](ValidationError)` | `Result.failure(ValidationError)` | `Result.failure(ValidationError)` | `Result.fail(ValidationError)` |

## Async/Concurrency Alignment

### Async Patterns

| Language | Async Pattern | Cancellation | Context Passing |
|----------|---------------|--------------|-----------------|
| **C#** | `async Task<T>` | `CancellationToken` | Method parameters |
| **Go** | Goroutines + channels | `context.Context` | First parameter convention |
| **Java** | `CompletableFuture<T>` | `CompletableFuture.cancel()` | Method chaining |
| **Python** | `async def` + `await` | `asyncio.CancelledError` | Context managers |
| **TypeScript** | `Promise<T>` + `async/await` | `AbortController/AbortSignal` | Promise chaining |

### Repository Async Signatures

#### C# Repository Interface
```csharp
public interface IRepository<TAggregate, TId>
    where TAggregate : AggregateRoot<TId>
    where TId : notnull
{
    Task<Maybe<TAggregate>> GetByIdAsync(TId id, CancellationToken cancellationToken = default);
    Task<Result> AddAsync(TAggregate aggregate, CancellationToken cancellationToken = default);
    Task<Result> UpdateAsync(TAggregate aggregate, CancellationToken cancellationToken = default);
    Task<Result> DeleteAsync(TId id, CancellationToken cancellationToken = default);
    Task<Result<bool>> ExistsAsync(TId id, CancellationToken cancellationToken = default);
}
```

#### Go Repository Interface
```go
type Repository[TAggregate AggregateRoot[TId], TId EntityId] interface {
    GetByID(ctx context.Context, id TId) (Maybe[TAggregate], error)
    Add(ctx context.Context, aggregate TAggregate) error
    Update(ctx context.Context, aggregate TAggregate) error
    Delete(ctx context.Context, id TId) error
    Exists(ctx context.Context, id TId) (bool, error)
}
```

#### Java Repository Interface
```java
public interface Repository<TAggregate extends AggregateRoot<TId>, TId> {
    CompletableFuture<Maybe<TAggregate>> getByIdAsync(TId id);
    CompletableFuture<Result<Void>> addAsync(TAggregate aggregate);
    CompletableFuture<Result<Void>> updateAsync(TAggregate aggregate);
    CompletableFuture<Result<Void>> deleteAsync(TId id);
    CompletableFuture<Result<Boolean>> existsAsync(TId id);
}
```

#### Python Repository Interface
```python
class Repository(ABC, Generic[TAggregate, TId]):
    @abstractmethod
    async def get_by_id_async(self, id: TId) -> Maybe[TAggregate]: ...

    @abstractmethod
    async def add_async(self, aggregate: TAggregate) -> Result[None]: ...

    @abstractmethod
    async def update_async(self, aggregate: TAggregate) -> Result[None]: ...

    @abstractmethod
    async def delete_async(self, id: TId) -> Result[None]: ...

    @abstractmethod
    async def exists_async(self, id: TId) -> Result[bool]: ...
```

#### TypeScript Repository Interface
```typescript
export interface Repository<TAggregate extends AggregateRoot<TId>, TId> {
    getByIdAsync(id: TId): Promise<Maybe<TAggregate>>;
    addAsync(aggregate: TAggregate): Promise<Result<void>>;
    updateAsync(aggregate: TAggregate): Promise<Result<void>>;
    deleteAsync(id: TId): Promise<Result<void>>;
    existsAsync(id: TId): Promise<ResultOf<boolean>>;
}
```

## Package Architecture Alignment

### Core Package Structure

| Language | Package Name | Core Module | Integration Modules |
|----------|--------------|-------------|-------------------|
| **C#** | `Architecture.Core` | Core types | `Architecture.Core.EntityFramework`, `Architecture.Core.MediatR` |
| **Go** | `architecture-core` | Core package | Optional helpers for GORM, etc. |
| **Java** | `architecture-core` | Core JAR | `architecture-core-spring` |
| **Python** | `architecture_core` | Core package | `django_architecture_core` |
| **TypeScript** | `@architecture/core` | Core npm package | `@architecture/express`, `@architecture/typeorm` |

### Directory Structure Alignment

```
{language-implementation}/
├── src/                          # Source code
│   ├── domain/                   # Domain layer
│   │   ├── entities/             # Entity base classes
│   │   ├── value-objects/        # Value object base
│   │   ├── events/               # Domain events
│   │   └── repositories/         # Repository interfaces
│   ├── functional/               # Functional types
│   │   ├── result/               # Result monad
│   │   ├── maybe/                # Maybe monad
│   │   └── error/                # Error types
│   └── infrastructure/           # Language-specific helpers
├── tests/                        # Test suites
│   ├── unit/                     # Unit tests
│   ├── contract/                 # Contract validation tests
│   ├── integration/              # Integration tests
│   └── performance/              # Performance benchmarks
└── examples/                     # Usage examples
    └── quickstart/               # Getting started guide
```

## Migration Path Mapping

### v1.x to v2.0 Breaking Changes

| Breaking Change | C# Migration | Go Migration | Java Migration | Python Migration | TypeScript Migration |
|----------------|--------------|--------------|----------------|------------------|-------------------|
| **Repository.Save() → Add/Update** | Use `AddAsync()`/`UpdateAsync()` | Use `Add()`/`Update()` | Use `addAsync()`/`updateAsync()` | Use `add_async()`/`update_async()` | Use `addAsync()`/`updateAsync()` |
| **Result.Success → Result.Ok** | Use `Result.Ok()` | Use `Ok[T]()` | Use `Result.success()` | Use `Result.success()` | Use `Result.ok()` |
| **Event Access Pattern** | Use `Events` property | Use `DomainEvents()` method | Use `getDomainEvents()` | Use `domain_events` property | Use `events` property |

### Deprecated API Shims

Each language provides temporary compatibility:

```csharp
// C#
[Obsolete("Use AddAsync and UpdateAsync instead", false)]
public Task<Result> SaveAsync(TAggregate aggregate, CancellationToken ct)
    => /* determine if add or update */;
```

```go
// Go
// Deprecated: Use Add and Update instead
func (r *repository) Save(ctx context.Context, aggregate T) error {
    // determine if add or update
}
```

```java
// Java
@Deprecated(since = "2.0", forRemoval = true)
public CompletableFuture<Result<Void>> saveAsync(TAggregate aggregate) {
    // determine if add or update
}
```

```python
# Python
@deprecated("Use add_async and update_async instead")
async def save_async(self, aggregate: TAggregate) -> Result[None]:
    # determine if add or update
```

```typescript
// TypeScript
/** @deprecated Use addAsync and updateAsync instead */
saveAsync(aggregate: TAggregate): Promise<Result<void>> {
    // determine if add or update
}
```

This alignment matrix ensures that developers can transfer knowledge seamlessly between language implementations while respecting each language's specific conventions and idioms.