# Data Model: Architecture.Shell - CQRS Module

**Feature**: Architecture.Shell - CQRS Module
**Date**: 2025-09-30
**Scope**: Core type definitions for mediator pattern, request types, handlers, and pipeline behaviors

---

## Model Overview

The CQRS module provides application-layer abstractions for command/query separation and mediator-based request routing. All types are interfaces/abstract base classes for maximum extensibility.

**Key Concepts**:
- **Requests**: Application-layer operations (commands that modify state, queries that read state)
- **Handlers**: Single-responsibility components that process one request type
- **Mediator**: Central dispatcher that routes requests to handlers via registered pipeline
- **Behaviors**: Cross-cutting concerns (transactions, validation, logging) that wrap handler execution

---

## Type Hierarchy

```
BaseRequest (marker interface)
├── BaseRequest<TResult> (requests with return values)
│   ├── Command<TResult> (state-changing with return)
│   └── Query<TResult> (read-only with return)
└── Command (state-changing, void return)

IRequestHandler<TRequest, TResponse> (base handler)
├── ICommandHandler<TCommand> : IRequestHandler<TCommand, Unit>
├── ICommandHandler<TCommand, TResult> : IRequestHandler<TCommand, TResult>
└── IQueryHandler<TQuery, TResult> : IRequestHandler<TQuery, TResult>

IPipelineBehavior<TRequest, TResponse> (interceptor)
├── ValidationBehavior<TRequest, TResponse>
├── AuthorizationBehavior<TRequest, TResponse>
├── UnitOfWorkBehavior<TRequest, TResponse>
├── CachingBehavior<TRequest, TResponse>
├── TelemetryBehavior<TRequest, TResponse>
└── ResilienceBehavior<TRequest, TResponse>
```

---

## Core Types

### 1. BaseRequest (Marker Interface)

**Purpose**: Common ancestor for all application-layer requests enabling uniform pipeline processing

**Properties**: None (pure marker interface)

**Constraints**:
- All commands, queries, notifications, jobs must implement this interface
- Enables type-safe mediator registration and resolution

**Language Mappings**:
```csharp
// C#
public interface IBaseRequest { }
```

```java
// Java
public interface BaseRequest { }
```

```go
// Go
type BaseRequest interface {
    IsRequest() // marker method
}
```

```typescript
// TypeScript
export interface BaseRequest { }
```

```python
# Python
from abc import ABC
class BaseRequest(ABC):
    pass
```

---

### 2. BaseRequest<TResult>

**Purpose**: Requests that return a value (used by queries and some commands)

**Properties**:
- Inherits from BaseRequest
- Generic type parameter TResult specifies return type

**Constraints**:
- TResult must be serializable for remote mediator scenarios (future)
- TResult can be Result<T> for business error handling

**Language Mappings**:
```csharp
// C#
public interface IBaseRequest<out TResult> : IBaseRequest { }
```

```java
// Java
public interface BaseRequest<TResult> extends BaseRequest { }
```

```go
// Go
type BaseRequestOf[TResult any] interface {
    BaseRequest
    GetResultType() reflect.Type
}
```

```typescript
// TypeScript
export interface BaseRequest<TResult> extends BaseRequest { }
```

```python
# Python
from typing import TypeVar, Generic
TResult = TypeVar('TResult')
class BaseRequestOf(BaseRequest, Generic[TResult]):
    pass
```

---

### 3. Command (Void Command)

**Purpose**: State-changing operation with no return value (returns Unit/void equivalent)

**Properties**: None (marker interface)

**Constraints**:
- MUST modify state (otherwise use Query)
- MUST execute within transaction boundary (enforced by UnitOfWork behavior)
- MAY return Result<Unit> for business validation errors

**Example**:
```pseudo
class PublishBlogPostCommand : Command {
    blogPostId: Guid
    publishDate: DateTime
}

class PublishBlogPostHandler : ICommandHandler<PublishBlogPostCommand> {
    async Handle(cmd, ct): Result<Unit> {
        // Validation logic returns Result.Failure on business error
        // Infrastructure errors (DB down) throw exception
    }
}
```

---

### 4. Command<TResult>

**Purpose**: State-changing operation with return value (e.g., created entity ID, updated version number)

**Properties**: None (marker interface extending BaseRequest<TResult>)

**Constraints**:
- MUST modify state (otherwise use Query)
- MUST execute within transaction boundary
- TResult typically Result<TValue> for mixed error handling
- Return values should be minimal (IDs, counts, versions) not full entities

**Example**:
```pseudo
class CreateOrderCommand : Command<Result<OrderId>> {
    customerId: Guid
    items: OrderItem[]
}

class CreateOrderHandler : ICommandHandler<CreateOrderCommand, Result<OrderId>> {
    async Handle(cmd, ct): Result<OrderId> {
        // Business validation
        if (!items.Any()) return Result.Failure(ValidationError)

        // Create aggregate (throws on infrastructure failure)
        order = Order.Create(cmd.customerId, cmd.items)
        await repo.AddAsync(order, ct)

        return Result.Success(order.Id)
    }
}
```

---

### 5. Query<TResult>

**Purpose**: Read-only operation that returns data without modifying state

**Properties**: None (marker interface extending BaseRequest<TResult>)

**Constraints**:
- MUST NOT modify state (enforced semantically; architecture tests verify no repository writes)
- MUST NOT open transactions (enforced by UnitOfWork behavior)
- TResult typically DTO/projection, not domain entities
- MAY return Result<TResult> if business-level query failures possible (e.g., authorization within handler)

**Example**:
```pseudo
class GetOrderDetailsQuery : Query<OrderDetailsDto> {
    orderId: Guid
    includeLineItems: bool
}

class GetOrderDetailsHandler : IQueryHandler<GetOrderDetailsQuery, OrderDetailsDto> {
    async Handle(query, ct): OrderDetailsDto {
        // Read-optimized query (no transaction)
        // Infrastructure errors (DB timeout) throw exception
        return await readModel.GetOrderDetailsAsync(query.orderId, ct)
    }
}
```

---

### 6. IRequestHandler<TRequest, TResponse>

**Purpose**: Base handler interface for processing requests

**Methods**:
```pseudo
interface IRequestHandler<TRequest, TResponse>
  where TRequest : BaseRequest
{
    Task<TResponse> Handle(TRequest request, CancellationToken ct)
}
```

**Constraints**:
- Each request type maps to exactly one handler (enforced at DI registration)
- Handlers MUST respect CancellationToken and terminate early when requested
- Handlers MUST use Result<T> for business errors, throw exceptions for infrastructure errors

**Language-Specific Patterns**:
- C#: `Task<TResponse> HandleAsync(TRequest, CancellationToken)`
- Java: `CompletableFuture<TResponse> handle(TRequest, Context)`
- Go: `Handle(ctx context.Context, req TRequest) (TResponse, error)`
- TypeScript: `handle(request: TRequest, signal: AbortSignal): Promise<TResponse>`
- Python: `async def handle(request: TRequest, token: CancellationToken) -> TResponse`

---

### 7. ICommandHandler<TCommand> (Void Command Handler)

**Purpose**: Processes commands without return values

**Signature**:
```pseudo
interface ICommandHandler<TCommand> : IRequestHandler<TCommand, Unit>
  where TCommand : Command
```

**Return Type**: Unit (C# Unit, Java Void, Go struct{}, TypeScript void, Python None)

**Special Cases**:
- May return `Result<Unit>` if business validation errors expected
- Infrastructure errors always throw exceptions

---

### 8. ICommandHandler<TCommand, TResult>

**Purpose**: Processes commands with return values

**Signature**:
```pseudo
interface ICommandHandler<TCommand, TResult> : IRequestHandler<TCommand, TResult>
  where TCommand : Command<TResult>
```

**Return Type**: TResult (commonly `Result<TValue>`)

---

### 9. IQueryHandler<TQuery, TResult>

**Purpose**: Processes read-only queries

**Signature**:
```pseudo
interface IQueryHandler<TQuery, TResult> : IRequestHandler<TQuery, TResult>
  where TQuery : Query<TResult>
```

**Return Type**: TResult (DTO/projection)

**Constraints**:
- MUST NOT call repository.AddAsync/UpdateAsync/DeleteAsync
- Infrastructure errors (DB timeout, network failure) throw exceptions
- Business errors (data not found) may return Result.Failure or throw domain-specific exception depending on query semantics

---

### 10. IMediator

**Purpose**: Single entry point for sending commands and queries; routes to handlers via pipeline

**Methods**:
```pseudo
interface IMediator {
    Task<TResponse> Send<TResponse>(IBaseRequest<TResponse> request, CancellationToken ct)
    Task Send(IBaseRequest request, CancellationToken ct)
}
```

**Behavior**:
1. Resolve handler for request type (fail if zero or multiple handlers registered)
2. Resolve applicable pipeline behaviors (filtered by type guards)
3. Build behavior chain in configured order
4. Execute pipeline → behaviors wrap handler execution
5. Return result or propagate exception

**Constraints**:
- Handler resolution MUST occur at DI container build time (not runtime reflection)
- Pipeline construction MUST happen per-request (behaviors may be stateful per request)

---

### 11. IPipelineBehavior<TRequest, TResponse>

**Purpose**: Interceptor for cross-cutting concerns that wraps handler execution

**Signature**:
```pseudo
interface IPipelineBehavior<TRequest, TResponse>
  where TRequest : BaseRequest
{
    Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken ct
    )
}

delegate Task<TResponse> RequestHandlerDelegate<TResponse>()
```

**Execution Pattern**:
```pseudo
class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse> {
    async Handle(request, next, ct) {
        // Pre-handler logic
        validationResult = await validator.ValidateAsync(request, ct)
        if (validationResult.IsFailure)
            throw ValidationException(validationResult.Errors)

        // Call next behavior or handler
        response = await next()

        // Post-handler logic (if needed)
        return response
    }
}
```

**Common Behaviors**:
- **ValidationBehavior**: Validates request payload; throws on validation failure (short-circuits pipeline)
- **AuthorizationBehavior**: Checks permissions; throws UnauthorizedAccessException if denied
- **UnitOfWorkBehavior**: Opens transaction for commands; detects active transaction for nested commands; commits on success, rolls back on exception
- **CachingBehavior**: Checks cache for queries; returns cached value on hit, executes handler on miss
- **TelemetryBehavior**: Logs request type, duration, status, exceptions
- **ResilienceBehavior**: Wraps handler with retry/timeout/circuit breaker logic

**Constraints**:
- Behaviors execute in configured order (default: Validation → Authorization → Transaction → Telemetry → Resilience)
- Behaviors MAY short-circuit pipeline by throwing exception or returning early
- Behaviors MUST call `next()` to continue pipeline unless explicitly short-circuiting

---

### 12. IUnitOfWork

**Purpose**: Transaction boundary abstraction for commands

**Properties**:
```pseudo
interface IUnitOfWork {
    Guid TransactionId { get; }
    bool HasActiveTransaction { get; }
}
```

**Methods**:
```pseudo
interface IUnitOfWork {
    Task BeginTransactionAsync(CancellationToken ct)
    Task CommitAsync(CancellationToken ct)
    Task RollbackAsync(CancellationToken ct)
}
```

**Behavior**:
- `BeginTransactionAsync()`: Opens new transaction if none active; throws if transaction provider unavailable (fail fast per BR-006)
- `HasActiveTransaction`: Returns true if transaction currently active (prevents nested transaction attempts)
- `CommitAsync()`: Persists changes; called by UnitOfWork behavior on successful handler completion (including Result.Failure business errors)
- `RollbackAsync()`: Discards changes; called by UnitOfWork behavior on exception

**Constraints**:
- UnitOfWork behavior MUST check `HasActiveTransaction` before calling `BeginTransactionAsync()`
- Transaction context propagates via AsyncLocal/ThreadLocal/Context storage
- Query handlers MUST NOT trigger transaction opening

---

### 13. IBehaviorMatcher

**Purpose**: Configuration interface for determining which behaviors apply to which request types

**Methods**:
```pseudo
interface IBehaviorMatcher {
    bool Matches<TRequest>(TRequest request) where TRequest : BaseRequest
}
```

**Example Implementations**:
```pseudo
class CommandOnlyMatcher : IBehaviorMatcher {
    bool Matches<TRequest>(request) => request is Command or Command<>
}

class QueryOnlyMatcher : IBehaviorMatcher {
    bool Matches<TRequest>(request) => request is Query<>
}

class AllRequestsMatcher : IBehaviorMatcher {
    bool Matches<TRequest>(request) => true
}
```

**Usage**:
```pseudo
services.AddPipelineBehavior<UnitOfWorkBehavior>(new CommandOnlyMatcher())
services.AddPipelineBehavior<CachingBehavior>(new QueryOnlyMatcher())
services.AddPipelineBehavior<TelemetryBehavior>(new AllRequestsMatcher())
```

---

## Telemetry Output Specification

### Minimum Required Fields

All TelemetryBehavior implementations MUST emit the following structured fields per NFR-002 and LP-006:

**Core Fields** (REQUIRED):
- `Timestamp`: ISO 8601 datetime of request start
- `LogLevel`: Information/Warning/Error based on outcome
- `RequestType`: Fully qualified name of request type (e.g., "CreateOrderCommand")
- `Duration`: Elapsed time in milliseconds from pipeline entry to exit
- `Status`: Success|BusinessFailure|InfrastructureError|Cancelled
- `Exception`: Full exception details (type, message, stack trace) if Status = InfrastructureError
- `TransactionId`: GUID/UUID for ALL command executions (REQUIRED per BR-002 and NFR-002); NOT logged for queries

**Conditional Fields**:
- `ErrorType`: Domain|Validation|Infrastructure|Concurrency|Security if Status = BusinessFailure (from Result.Error.Type)
- `ErrorMessage`: User-facing error message if Status = BusinessFailure (from Result.Error.Message)

**Optional Fields** (implementation-defined):
- `HandlerName`: Class name of handler that processed request
- `BehaviorChain`: Ordered list of behaviors executed
- `CancellationReason`: If Status = Cancelled
- `CacheHit`: Boolean for caching behavior (queries only)

**Future Extensions** (deferred to Feature 004-architecture-shell-correlation):
- `CorrelationId`: Distributed operation tracking identifier
- `CausationId`: Parent operation identifier for nested commands
- `TraceId`/`SpanId`: OpenTelemetry integration

### Language-Specific Output Formats

- **C#**: Microsoft.Extensions.Logging structured logging with `ILogger.LogInformation("{RequestType} completed in {Duration}ms", typeof(TRequest).FullName, elapsed.TotalMilliseconds)`
- **Java**: SLF4J with MDC context: `log.info("RequestType={} Duration={} Status={}", requestType, duration, status)`
- **Go**: `slog.Info("request completed", "requestType", requestType, "duration", duration, "status", status)`
- **TypeScript**: Winston/Pino JSON format: `logger.info({requestType, duration, status}, 'Request completed')`
- **Python**: `logging.info("Request completed", extra={"requestType": request_type, "duration": duration, "status": status})`

**Exception Rollback Logging** (REQUIRED per BR-002):

When command handler or behavior throws exception triggering transaction rollback, UnitOfWork behavior MUST log error details with TransactionId BEFORE calling RollbackAsync() to ensure correlation even if rollback itself fails.

**Logging Requirements**:
1. **Timing**: Log MUST occur in catch block BEFORE RollbackAsync() call
2. **Required Fields**: TransactionId, RequestType, Exception (type/message/stack), Duration
3. **Log Level**: ERROR
4. **Rationale**: If RollbackAsync() throws, original TransactionId correlation is preserved

**Language-Specific Examples**:

```csharp
// C# Example
catch (Exception ex) {
    // REQUIRED: Log before rollback
    _logger.LogError(ex,
        "{RequestType} failed - TransactionId={TransactionId} Duration={Duration}ms",
        typeof(TRequest).FullName,
        unitOfWork.TransactionId,
        elapsed.TotalMilliseconds);

    await unitOfWork.RollbackAsync(ct);
    throw;
}
```

```java
// Java Example
catch (Exception ex) {
    // REQUIRED: Log before rollback
    log.error("RequestType={} failed - TransactionId={} Duration={}ms",
        request.getClass().getName(),
        unitOfWork.getTransactionId(),
        duration.toMillis(),
        ex);

    unitOfWork.rollback();
    throw ex;
}
```

```go
// Go Example
defer func() {
    if r := recover(); r != nil {
        // REQUIRED: Log before rollback
        slog.Error("request failed",
            "requestType", reflect.TypeOf(req).Name(),
            "transactionId", uow.TransactionID(),
            "duration", elapsed.Milliseconds(),
            "error", r)

        uow.Rollback(ctx)
        panic(r)
    }
}()
```

```typescript
// TypeScript Example
catch (error) {
    // REQUIRED: Log before rollback
    logger.error({
        requestType: request.constructor.name,
        transactionId: unitOfWork.transactionId,
        duration: elapsed,
        error: error
    }, 'Request failed');

    await unitOfWork.rollback(signal);
    throw error;
}
```

```python
# Python Example
except Exception as ex:
    # REQUIRED: Log before rollback
    logging.error(
        "Request failed",
        extra={
            "requestType": type(request).__name__,
            "transactionId": unit_of_work.transaction_id,
            "duration": elapsed.total_seconds() * 1000,
            "error": str(ex)
        },
        exc_info=True
    )

    await unit_of_work.rollback(token)
    raise
```

### Detection of Result.Failure vs Exception

UnitOfWork behavior MUST detect business failures vs infrastructure failures:

**C#**:
```csharp
if (response is IResult result && result.IsFailure) {
    await unitOfWork.CommitAsync(ct); // Business failure = commit
} else {
    await unitOfWork.CommitAsync(ct); // Success = commit
}
// Exceptions propagate to outer try/catch → rollback
```

**Java**:
```java
if (response instanceof Result<?> result && result.isFailure()) {
    unitOfWork.commit(); // Business failure = commit
} else {
    unitOfWork.commit(); // Success = commit
}
// Exceptions caught by outer try/catch → rollback
```

**Go**:
```go
if resultVal, ok := response.(Result); ok && resultVal.IsFailure() {
    uow.Commit(ctx) // Business failure = commit
} else {
    uow.Commit(ctx) // Success = commit
}
// Panics recovered by defer → rollback
```

**TypeScript**:
```typescript
if (response instanceof Result && response.isFailure) {
    await unitOfWork.commit(signal); // Business failure = commit
} else {
    await unitOfWork.commit(signal); // Success = commit
}
// Exceptions caught by outer try/catch → rollback
```

**Python**:
```python
if isinstance(response, Result) and response.is_failure:
    await unit_of_work.commit(token)  # Business failure = commit
else:
    await unit_of_work.commit(token)  # Success = commit
# Exceptions caught by outer try/except → rollback
```

---

## Validation Rules

### Request Validation
- [x] All requests MUST implement BaseRequest (directly or via Command/Query)
- [x] Command and Query are mutually exclusive (request cannot be both)
- [x] Queries MUST specify TResult return type (void queries are semantically invalid)
- [x] Commands returning data MUST use Command<TResult>, not Query<TResult>

### Handler Validation
- [x] Each request type MUST map to exactly one handler (enforced at DI registration)
- [x] Handler return type MUST match request's TResult type parameter
- [x] Handlers MUST accept CancellationToken parameter
- [x] Handlers MUST use Result<T> for business errors, throw exceptions for infrastructure errors

### Behavior Validation
- [x] Behaviors MUST implement IPipelineBehavior<TRequest, TResponse>
- [x] Behaviors MUST call next() delegate unless explicitly short-circuiting
- [x] UnitOfWork behavior MUST only apply to commands (use CommandOnlyMatcher)
- [x] Caching behavior MUST only apply to queries (use QueryOnlyMatcher)

### Transaction Validation
- [x] Commands MUST execute within transaction boundary
- [x] Queries MUST NOT open transactions
- [x] Nested commands MUST reuse active transaction (no nested transaction opening)
- [x] Transaction commit occurs on successful handler completion (including Result.Failure)
- [x] Transaction rollback occurs on exception (infrastructure errors only)

---

## State Transitions

### Command Execution Lifecycle
```
1. Request received → Mediator.Send(command)
2. Pipeline construction → Resolve behaviors matching command type
3. Validation → ValidationBehavior executes; throws on failure
4. Authorization → AuthorizationBehavior executes; throws if denied
5. Transaction begin → UnitOfWork.BeginTransactionAsync() if no active transaction
6. Telemetry start → Record request start time, correlation ID
7. Handler execution → CommandHandler.Handle(command)
   → Returns Result<T> on business error (transaction commits)
   → Throws exception on infrastructure error (transaction rolls back)
8. Transaction commit → UnitOfWork.CommitAsync() if handler succeeded
9. Transaction rollback → UnitOfWork.RollbackAsync() if exception thrown
10. Telemetry end → Record duration, status, exceptions
11. Response returned → Result<T> or exception propagated to caller
```

### Query Execution Lifecycle
```
1. Request received → Mediator.Send(query)
2. Pipeline construction → Resolve behaviors matching query type
3. Validation → ValidationBehavior executes; throws on failure
4. Authorization → AuthorizationBehavior executes; throws if denied
5. Cache check → CachingBehavior checks cache; returns on hit
6. Telemetry start → Record query start time
7. Handler execution → QueryHandler.Handle(query)
8. Cache write → CachingBehavior writes result to cache on miss
9. Telemetry end → Record duration, cache hit/miss status
10. Response returned → TResult (DTO/projection)
```

### Nested Command Lifecycle
```
Outer command:
1-5. [Standard command flow] BeginTransactionAsync() opens transaction
6. Handler execution → Calls mediator.Send(innerCommand)

Inner command:
1-4. [Validation/Authorization] Same as outer command
5. Transaction check → UnitOfWork.HasActiveTransaction == true → skip BeginTransactionAsync()
6. Handler execution → Executes within outer transaction
7-8. [Skip commit/rollback] Transaction managed by outer command

Outer command (continued):
7-9. Transaction commit/rollback based on outer command result
```

---

## Integration with Architecture.Core

### Result<T> Monad
- Command handlers return `Result<Unit>` or `Result<TValue>`
- Query handlers return `TResult` directly or `Result<TResult>` if business failures possible
- UnitOfWork behavior treats `Result.Failure()` as successful completion (commits transaction)

### Error Types
- **DomainError**: Business rule violations (return via Result.Failure)
- **ValidationError**: Request payload validation failures (return via Result.Failure)
- **InfrastructureError**: DB/network failures (throw exception)
- **ConcurrencyError**: Optimistic concurrency violations (throw ConcurrencyException)

### Entity/Aggregate Integration
- Command handlers typically operate on AggregateRoot instances
- Handlers call repository.AddAsync/UpdateAsync/GetByIdAsync
- Domain events collected by aggregates are published by separate EventDispatcher behavior (future integration)

---

## Cross-Language Consistency Matrix

**SOURCE OF TRUTH**: This section is the canonical reference for language-specific naming conventions and type mappings. All other documents (spec.md, plan.md, contracts/) reference this matrix.

| Concept | C# | Java | Go | TypeScript | Python |
|---------|----|----- |----|------------|--------|
| BaseRequest | IBaseRequest | BaseRequest | BaseRequest interface | BaseRequest | BaseRequest(ABC) |
| Command | ICommand | Command | Command interface | Command | Command |
| Query<T> | IQuery<T> | Query<T> | QueryOf[T] | Query<T> | QueryOf[T] |
| Handler | IRequestHandler<TReq, TRes> | RequestHandler<TReq, TRes> | RequestHandler[TReq, TRes] | IRequestHandler<TReq, TRes> | RequestHandler[TReq, TRes] |
| Mediator | IMediator | Mediator | Mediator | IMediator | Mediator |
| Behavior | IPipelineBehavior<TReq, TRes> | PipelineBehavior<TReq, TRes> | PipelineBehavior[TReq, TRes] | IPipelineBehavior<TReq, TRes> | PipelineBehavior[TReq, TRes] |
| UnitOfWork | IUnitOfWork | UnitOfWork | UnitOfWork | IUnitOfWork | UnitOfWork |
| Cancellation | CancellationToken | Context (cancel) | context.Context | AbortSignal | CancellationToken |
| Async | Task<T> | CompletableFuture<T> | (T, error) | Promise<T> | Awaitable[T] |

### Terminology Conventions

**Interface Naming**:
- **C# and TypeScript**: Use `I` prefix for interfaces (e.g., `IBaseRequest`, `IMediator`) following language conventions
- **Java, Go, Python**: No prefix for interfaces/protocols (e.g., `BaseRequest`, `Mediator`) following language conventions
- **Rationale**: Each language follows its established ecosystem patterns to maintain idiomatic code

**Reference Resolution**:
- When spec.md uses generic terms like "BaseRequest", implementations use language-appropriate naming per this matrix
- Documentation and cross-references should specify language context or use neutral phrasing (e.g., "BaseRequest interface" or "IBaseRequest (C#) / BaseRequest (Java)")
- Contract tests validate behavioral equivalence across naming variations

---

## Next Steps

Proceed to contract generation:
1. Generate language-specific interface contracts in `/contracts/` directory
2. Create contract tests for each interface (fail initially, no implementation)
3. Generate quickstart.md with example command/query integration

**Validation**: ✅ All types align with DDD Application Layer patterns and CQRS separation principles