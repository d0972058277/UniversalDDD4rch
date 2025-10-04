# Architecture.Shell — CQRS Module Requirements Specification

---

## 1. Scope

- Define **BaseRequest** as the common ancestor for all application-layer requests so that the Pipeline can accept all commands, queries, and future kinds (e.g., notifications/jobs).
- Define abstract interfaces, handlers, and the mediator for **Command / Command<TResult>** and **Query<TResult>**.
- Specify how **Pipeline behaviors** (transaction/validation/authorization/caching/telemetry/resilience) are attached and their semantics, demonstrating the typical strategy where **Unit of Work opens transactions only for commands**.

---

## 2. Terminology

- **BaseRequest**: The common ancestor of all application-layer requests (commands, queries, notifications, jobs…).
- **Command / Command<TResult>**: Operations that change state; may return nothing or a value.
- **Query<TResult>**: Read-only operation that must have a return type (or semantic equivalent).
- **Handler**: A single-responsibility component that processes a command/query.
- **Mediator**: The single entry point that routes to the correct handler and executes the pipeline.
- **Pipeline Behavior / Interceptor**: Cross-cutting concerns (transaction, validation, caching, authorization, telemetry, retry…).

---

## 3. Interface Specifications

### 3.1 Base Layer

~~~pseudo
// Common ancestor for all application-layer requests (lets the pipeline “handle all”)
interface BaseRequest {}

// Requests with a return value (used by Query / some Command)
interface BaseRequest<TResult> : BaseRequest {}
~~~

### 3.2 Command

~~~pseudo
// Command without a return value
interface Command : BaseRequest {}

// Command with a return value
interface Command<TResult> : BaseRequest<TResult> {}
~~~

#### Command Handler

~~~pseudo
interface CommandHandler<TCommand>
  where TCommand : Command
{
  TaskOrPromise<Unit> Handle(TCommand command, CancellationToken ct)
}

interface CommandHandlerOf<TCommand, TResult>
  where TCommand : Command<TResult>
{
  TaskOrPromise<TResult> Handle(TCommand command, CancellationToken ct)
}
~~~

### 3.3 Query

~~~pseudo
interface Query<TResult> : BaseRequest<TResult> {}
~~~

#### Query Handler

~~~pseudo
interface QueryHandler<TQuery, TResult>
  where TQuery : Query<TResult>
{
  TaskOrPromise<TResult> Handle(TQuery query, CancellationToken ct)
}
~~~

### 3.4 Mediator

~~~pseudo
interface Mediator {
  // Command (no return)
  TaskOrPromise<Unit> Send(Command command, CancellationToken ct)

  // Command (with return)
  TaskOrPromise<TResult> Send<TResult>(Command<TResult> command, CancellationToken ct)

  // Query
  TaskOrPromise<TResult> Send<TResult>(Query<TResult> query, CancellationToken ct)
}
~~~

> It is recommended to keep dedicated command/query entry points to maintain semantic clarity and type safety.

---

## 4. Pipeline Behaviors / Interceptors

### 4.1 Behavior Interface

~~~pseudo
interface PipelineBehavior<TRequest, TResponse> {
  TaskOrPromise<TResponse> Handle(TRequest request, Next<TResponse> next, CancellationToken ct)
}
~~~

> Relax the constraint to `TRequest : BaseRequest` so behaviors can apply to all requests.

### 4.2 Unit of Work / Transaction Management (open only for commands)

~~~pseudo
// Abstract transaction boundary
interface UnitOfWork {
  GuidOrString? TransactionId { get }
  bool HasActiveTransaction { get }
  TaskOrPromise BeginTransactionAsync(CancellationToken ct)
  TaskOrPromise CommitAsync(CancellationToken ct)
  // Optional extensions: Rollback, Dispose, OnCompleted, etc.
}

// Type guards (use interfaces/annotations/RTTI/naming conventions by language)
function IsCommand(x: any): boolean
function IsQuery(x: any): boolean

class UnitOfWorkBehavior<TRequest, TResponse> : PipelineBehavior<TRequest, TResponse> {

  constructor(UnitOfWork uow, Logger logger, Clock clock)

  async Handle(request, next, ct) {
    // Non-command (e.g., query/notification) → pass through
    if (!IsCommand(request)) {
      return await next()
    }

    // Nested transaction → treat as inner command; avoid reopening
    if (uow.HasActiveTransaction) {
      return await next()
    }

    let start = clock.UtcNow()
    await uow.BeginTransactionAsync(ct)
    try {
      let res = await next()
      await uow.CommitAsync(ct)
      logger.Info("Tx committed", { txId: uow.TransactionId, elapsedMs: clock.UtcNow() - start })
      return res
    } catch (ex) {
      // Concrete impl may decide explicit Rollback; ensure rich error logging
      logger.Error("Tx failed", { txId: uow.TransactionId, error: ex })
      throw
    }
  }
}
~~~

### 4.3 Other Common Behaviors (recommended semantics)

- **Validation**: Apply to `BaseRequest`; control with rules/annotations for queries.
- **Authorization**: Default apply to all requests; commands can enforce stricter rules.
- **Caching**: Use `IsQuery(request)` to decide short-circuit or write-through cache.
- **Telemetry/Logging**: Emit CorrelationId, duration, outcome, and exceptions uniformly.
- **Resilience (Retry/Timeout/Bulkhead/Circuit)**: Provide strategy wrappers for IO-heavy requests.

> Behavior order should be configurable; a typical order: `Validation → Authorization → Transaction(UoW) → Telemetry/Logging → Resilience`.  
> For queries, do not open transactions and consider caching first.

---

## 5. Functional Requirements

1. **Commands support both “void” and “returning” forms**, modeled by separate interfaces.
2. **Queries must have a return type**, improving API clarity and type safety.
3. **Mediator is the single entry point**, resolving handlers and applying the pipeline.
4. **Type/semantic constraints on handlers** to prevent misbinding and runtime errors.
5. **Composable and ordered pipeline**, enabling flexible cross-cutting extensions.
6. **DI and lifecycle management** for handlers, behaviors, and Unit of Work via dependency injection/configuration.
7. **Cancellation and timeout** semantics on all public APIs.
8. **Cross-language portability** without binding to any specific framework; when generics are weak, use naming contracts/marker interfaces instead.

---

## 6. Non-Functional Requirements

- **Testability**: Interface-driven; easy to inject doubles (mock/fake/stub).
- **Observability**: Standardized telemetry (duration, success/failure, exceptions, transaction identity).
- **Performance**: Overhead of Mediator + Pipeline must be measurable and tunable.
- **Consistency**: Transactional consistency for commands via UoW behavior; queries are read-only and non-transactional by default.

---

## 7. Behavior Matching Strategy

~~~pseudo
// Configure when each behavior applies using type/marker/annotation/naming rules
interface BehaviorMatcher {
  bool MatchForUoW(BaseRequest request)           // Default: IsCommand == true
  bool MatchForCaching(BaseRequest request)       // Default: IsQuery == true
  bool MatchForValidation(BaseRequest request)    // Default: true
  bool MatchForAuthorization(BaseRequest request) // Default: true
  // ...extensible
}
~~~

> This enables precise behavior application across languages lacking strong generics/RTTI by using marker interfaces/annotations/naming conventions.

---

## 8. Testing Specifications

### 8.1 Unit

- **Handler matching**: Ensure each request type maps to exactly one handler.
- **Query return type**: Handler’s generic/semantic contract matches `Query<TResult>`.
- **Pipeline order**: Behavior execution order is configurable and honored.
- **Cancellation/timeout propagation**: When simulated, execution must end early with proper cleanup.
- **UoW branches**: Commands open transactions; queries do not; nested scenarios do not reopen transactions.

### 8.2 Integration

- **UoW lifecycle**: Commands include Begin→Commit; on exceptions, perform proper rollback and logging.
- **Nested transactions**: With an outer transaction, inner commands must not reopen and still behave correctly.
- **Query pass-through & caching**: Queries are non-transactional; caching may short-circuit or write-through.
- **Telemetry consistency**: Produce verifiable metrics (duration, status, transaction identity, errors).

---

## 9. Language-Agnostic Usage Examples

~~~pseudo
// Command with return value
class CreateOrderCommand(orderId, items) : Command<Result<OrderId>>

class CreateOrderHandler(repo, domainService) 
  : CommandHandlerOf<CreateOrderCommand, Result<OrderId>>
{
  async Handle(cmd, ct) {
    // Validate → Write → Emit events → Return result
  }
}

// Query
class GetOrderDetailQuery(orderId) : Query<OrderDetailDto>

class GetOrderDetailHandler(readModel)
  : QueryHandler<GetOrderDetailQuery, OrderDetailDto>
{
  async Handle(q, ct) {
    // Read-optimized access, (optional) caching
  }
}

// Caller
let result = await mediator.Send(new CreateOrderCommand(...), ct)
let dto    = await mediator.Send(new GetOrderDetailQuery(...), ct)
~~~

---

## 10. Per-Language Implementation Hints

- **.NET / C#**: Interfaces + generics + `Task` + `CancellationToken`; DI container integration; implement `IsCommand` via marker interfaces or pattern matching.
- **Java**: Interfaces + generics or sealed hierarchies; `CompletableFuture`; use annotations/metadata + `instanceof` for type guards.
- **Go**: interfaces + structs; pass `context.Context` for cancellation; distinguish Command/Query via naming/marker interfaces.
- **Python**: ABC/Protocol; `asyncio` with cancellation (`Task.cancel` / `asyncio.timeout`); determine request kinds via base classes/attributes.
- **TypeScript/Node.js**: interfaces + generics; `Promise` + `AbortController`; use discriminated unions or `in`-operator type guards.

---

## 11. Version & Compliance

- This specification is the CQRS sub-spec of Architecture.Shell and can be used standalone or with Events (Inbox/Outbox) and Correlation modules.
- Any implementation should document: DI registrations, default pipeline order, transaction boundary provider, telemetry outputs (metrics/traces/logs), and observability endpoints.
- Recommend accompanying **Architecture Tests**: naming conventions, dependency direction, layering boundaries, and prevention of cyclic dependencies.

---
