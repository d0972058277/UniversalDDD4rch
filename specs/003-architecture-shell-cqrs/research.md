# Phase 0: Research & Technical Decisions

**Feature**: Architecture.Shell - CQRS Module
**Date**: 2025-09-30
**Status**: Complete

## Research Overview

All technical clarifications resolved during `/clarify` session. This document consolidates architectural decisions and implementation patterns for the CQRS mediator module across five language implementations.

---

## Decision 1: Dependency Management Strategy

**Decision**: Allow minimal standard DI abstraction packages in core module

**Rationale**:
- C# `Microsoft.Extensions.DependencyInjection.Abstractions` provides IServiceProvider interface universally used across .NET ecosystem
- Java JSR-330 (`javax.inject`) provides standard `@Inject`, `Provider<T>` annotations compatible with Spring, Guice, Dagger
- Go uses manual wiring with zero dependencies (constructor injection pattern)
- TypeScript `reflect-metadata` required for decorator-based dependency injection (tsyringe, InversifyJS)
- Python `typing` module (stdlib) sufficient for type hints supporting dependency-injector patterns

**Alternatives Considered**:
1. **Zero dependencies (pure stdlib)**: Rejected because mediator pattern requires handler resolution/lifecycle management that benefits from standard DI abstractions; implementing custom DI would duplicate existing battle-tested solutions
2. **Full framework coupling**: Rejected to maintain portability; e.g., tying C# implementation to MediatR would prevent integration with other mediator libraries

**Impact**: Core module has 1-2 compile-time dependencies per language; integration packages (Architecture.Shell.Cqrs.EntityFramework, Architecture.Shell.Cqrs.MediatR) remain separate

---

## Decision 2: Error Handling Strategy

**Decision**: Mixed approach - Result<T> for business errors, exceptions for infrastructure errors

**Rationale**:
- Business rule violations (validation failures, domain constraint violations) are **expected outcomes** that should be handled through control flow → return `Result.Failure(error)`
- Infrastructure failures (DB connectivity, network timeouts, resource exhaustion) are **exceptional circumstances** that interrupt normal program flow → throw exceptions
- UnitOfWork behavior must distinguish: `Result.Failure()` → commit transaction (business rejection is valid state), exception → rollback transaction

**Alternatives Considered**:
1. **Pure Result<T> monadic style**: Rejected because it forces infrastructure concerns (connection pool exhaustion) into business logic control flow; handler would need to check `if result.Error is InfrastructureError` which violates separation of concerns
2. **Pure exception-based**: Rejected because business validation failures would throw exceptions, leading to control-flow-by-exception anti-pattern and performance issues under normal validation rejection scenarios

**Impact**: Handlers use `return Result.Failure(DomainError)` for business validation but `throw InfrastructureException` for DB/network failures; pipeline behaviors catch exceptions and handle telemetry/rollback

---

## Decision 3: Transaction Management Semantics

**Decision**: Commands open transactions; queries do not; nested commands reuse active transaction

**Rationale**:
- Commands modify state → require atomicity/isolation/consistency guarantees → transaction boundary
- Queries read data → no state modification → transaction overhead unnecessary (may use snapshot isolation via read-committed for consistency)
- Nested commands (e.g., SendOrderPlacedEmailCommand called from CreateOrderCommand) must not open nested transactions → prevents distributed transaction complexity and deadlocks

**Alternatives Considered**:
1. **Always transactional (commands + queries)**: Rejected due to unnecessary overhead for read-only queries and potential lock contention
2. **Manual transaction control in handlers**: Rejected because it leaks infrastructure concerns into business logic; cross-cutting UnitOfWork behavior centralizes transaction management

**Implementation Pattern**:
```pseudo
UnitOfWorkBehavior:
  if request is Query → pass through (no transaction)
  if HasActiveTransaction() → pass through (reuse existing)
  if request is Command → BeginTransaction() → execute → Commit/Rollback
```

**Impact**: UnitOfWork behavior uses `AsyncLocal<Transaction>` (C#), `ThreadLocal<Transaction>` (Java), `context.Context` (Go), `AsyncLocalStorage<Transaction>` (TypeScript), `contextvars.ContextVar` (Python) to detect active transaction state

---

## Decision 4: Pipeline Behavior Execution Order

**Decision**: Configurable order with recommended default: Validation → Authorization → Transaction → Telemetry → Resilience

**Rationale**:
- **Validation first**: Fast-fail before expensive operations (authorization queries, transaction acquisition)
- **Authorization second**: Security check before acquiring resources
- **Transaction third**: Open DB connection only after cheap validation/authZ checks pass
- **Telemetry fourth**: Wrap actual business logic to measure handler duration (exclude validation/authZ overhead)
- **Resilience last**: Retry logic wraps entire pipeline including transaction management

**Alternatives Considered**:
1. **Fixed order**: Rejected to allow domain-specific customization (e.g., telemetry-first for observability-critical systems)
2. **Implicit ordering via registration order**: Rejected due to brittleness; explicit configuration interface (`BehaviorMatcher`) documents dependencies

**Implementation Pattern**:
```pseudo
Mediator.Send(request):
  behaviors = resolveBehaviors(request.GetType())
  orderedBehaviors = behaviors.OrderBy(b => b.Order)
  pipeline = orderedBehaviors.Reverse().Aggregate(
    handler.Handle,
    (next, behavior) => behavior.Handle(request, next)
  )
  return pipeline(request)
```

**Impact**: Each PipelineBehavior has `int Order` property; BehaviorMatcher interface allows filtering (e.g., `IsCommand()` guard for UnitOfWork behavior)

---

## Decision 5: Handler Registration and Resolution

**Decision**: Fail at startup if zero or multiple handlers registered per request type

**Rationale**:
- **Zero handlers**: Runtime error when mediator receives unhandled request type → fail-fast at container build/startup validates all expected handlers registered
- **Multiple handlers**: Ambiguous routing (which handler executes?) → structural issue that must be caught before deployment
- Startup validation prevents production incidents; unit tests verify registration for each request type

**Alternatives Considered**:
1. **Runtime resolution with fallback**: Rejected because missing handlers indicate incomplete implementation, not valid runtime state
2. **Composite pattern (execute all handlers)**: Rejected because single-responsibility principle dictates one handler per command/query; multiple handlers indicate design issue (should be chained commands or event subscribers)

**Implementation Pattern**:
```pseudo
ServiceCollection.AddCqrs():
  registeredHandlers = scanAssemblies(ICommandHandler<>, IQueryHandler<>)
  foreach requestType in registeredHandlers.GroupBy(h => h.RequestType):
    if requestType.Count != 1:
      throw ConfigurationException("Ambiguous handler registration")
  validateNoMissingHandlers(expectedRequests, registeredHandlers)
```

**Impact**: DI container configuration validates handler uniqueness; integration tests verify all commands/queries have exactly one handler

---

## Decision 6: Logging and Observability Format

**Decision**: Use language-native logging frameworks with implementation-defined structured formats

**Rationale**:
- Each language ecosystem has established logging standards: ILogger (C#), SLF4J (Java), slog (Go), Winston/Pino (TypeScript), logging (Python)
- OpenTelemetry integration and CorrelationId propagation deferred to future Correlation Module (out of scope for initial CQRS module)
- Allows implementations to emit structured logs compatible with existing observability stacks (ELK, Datadog, Application Insights)

**Alternatives Considered**:
1. **OpenTelemetry-only**: Rejected because it adds external runtime dependency (violates LP-001 minimal dependencies) and requires distributed tracing infrastructure not all projects have
2. **Console.WriteLine/System.out**: Rejected due to lack of structured logging, log levels, and integration with production log aggregation

**Minimum Required Fields**:
- Timestamp (ISO 8601)
- Log level (Debug, Info, Warning, Error)
- Request type name
- Duration (milliseconds)
- Status (Success, BusinessFailure, InfrastructureError)
- Exception details (if thrown)

**Optional Fields** (implementation-specific):
- TransactionId (if UnitOfWork active)
- CorrelationId (if Correlation Module integrated)
- User identity (if Authorization behavior active)

**Impact**: Telemetry behavior uses language-native ILogger/Logger abstractions; implementations configure log sinks per deployment environment

---

## Decision 7: Cancellation and Timeout Semantics

**Decision**: Propagate language-native cancellation tokens through all async operations

**Rationale**:
- Long-running commands/queries (bulk operations, slow queries) must support graceful cancellation
- Prevents resource leaks (open transactions, DB connections, HTTP clients)
- Enables client-driven timeouts and circuit breaker patterns

**Alternatives Considered**:
1. **No cancellation support**: Rejected because it forces handlers to complete even when client disconnects, wasting server resources
2. **Timeout-only (no cancellation)**: Rejected because it doesn't support user-initiated cancellation (e.g., "Cancel" button in UI)

**Implementation Pattern**:
```pseudo
// C#
Task<TResult> Handle(TRequest request, CancellationToken cancellationToken)

// Java
CompletableFuture<TResult> handle(TRequest request, Context context)

// Go
Handle(ctx context.Context, request TRequest) (TResult, error)

// TypeScript
handle(request: TRequest, signal: AbortSignal): Promise<TResult>

// Python
async def handle(request: TRequest, cancellation_token: CancellationToken) -> TResult
```

**Impact**: All handler interfaces accept cancellation parameter; unit tests verify early termination when cancellation requested

---

## Decision 8: Caching Behavior for Queries

**Decision**: Optional pipeline behavior using decorator pattern; cache key derived from query properties

**Rationale**:
- Queries with stable results (reference data, configuration, user profiles) benefit from caching
- Cache invalidation tied to command execution (e.g., UpdateUserCommand invalidates GetUserQuery cache)
- Short-circuit handler execution on cache hit (performance optimization)

**Alternatives Considered**:
1. **Built-in caching in all queries**: Rejected because not all queries should cache (real-time data, personalized results)
2. **Manual caching in handlers**: Rejected because it duplicates cache infrastructure across all query handlers

**Implementation Pattern**:
```pseudo
CachingBehavior<TRequest, TResponse>:
  cacheKey = generateCacheKey(request)
  if cache.TryGet(cacheKey, out cachedValue):
    return cachedValue
  response = await next(request)
  cache.Set(cacheKey, response, ttl: request.CacheTtl)
  return response
```

**Cache Key Strategy**:
- Serialize query properties to deterministic string (JSON with sorted keys)
- Include type name to prevent collisions (e.g., `GetUserQuery:{"userId":"123"}`)

**Impact**: Queries implement optional `ICacheable` interface specifying TTL; caching behavior checks interface before caching

---

## Research Validation Checklist

- [x] All NEEDS CLARIFICATION from Technical Context resolved
- [x] Each decision documents rationale and alternatives
- [x] Cross-language consistency patterns identified
- [x] Integration points with Architecture.Core defined
- [x] Test strategy aligned with TDD requirements
- [x] No constitutional violations introduced

---

## Next Steps

Proceed to **Phase 1: Design & Contracts** to generate:
1. `data-model.md` - Core type definitions for BaseRequest, Command, Query, handlers, behaviors
2. `contracts/` - Language-specific interface contracts
3. `quickstart.md` - Integration guide with example command/query implementation
4. Agent context file update

**Gate Status**: ✅ PASS - All decisions support DDD, CQRS, TDD, functional programming, and multi-language consistency requirements