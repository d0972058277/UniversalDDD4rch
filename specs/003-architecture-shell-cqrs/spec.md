# Feature Specification: Architecture.Shell - CQRS Module

**Feature Branch**: `003-architecture-shell-cqrs`
**Created**: 2025-09-30
**Status**: Draft
**Input**: User description: "Architecture.Shell - CQRS Module Requirements Specification"

## Execution Flow (main)
```
1. Parse user description from Input
   -> Extracted: CQRS module with mediator, pipeline behaviors, command/query separation
2. Extract key concepts from description
   -> Identified: Mediator pattern, pipeline behaviors, commands (void/returning), queries (returning), handlers, UnitOfWork, cross-cutting concerns
3. For each unclear aspect:
   -> All aspects clearly specified in requirements document
4. Fill User Scenarios & Testing section
   -> Developer-facing scenarios for command/query execution with pipeline
5. Generate Functional Requirements
   -> 8 core requirements covering request lifecycle, handler resolution, pipeline execution
6. Identify Key Entities (if data involved)
   -> Key abstractions: BaseRequest, Command, Query, Handlers, Mediator, Behaviors
7. Run Review Checklist
   -> Implementation-agnostic, focused on behavior and contracts
8. Return: SUCCESS (spec ready for planning)
```

---

## Quick Guidelines
- Focus on WHAT the CQRS module provides and WHY it's needed
- Avoid HOW to implement (no specific framework bindings beyond optional hints)
- Written for architects and developers adopting DDD patterns

---

## Clarifications

### Session 2025-09-30
- Q: What is the maximum acceptable end-to-end latency for a typical command/query execution through the mediator (including all pipeline behaviors)? → A: No imposed framework latency constraint; implementations determine acceptable overhead per use case
- Q: What structured format should telemetry outputs use for consumption by observability tools? → A: Language-native logging frameworks (ILogger/SLF4J/slog/Winston) with implementation-defined formats
- Q: When a transaction provider (database connection pool, ORM) is unavailable or fails during BeginTransactionAsync(), what should the mediator do? → A: Fail fast: throw exception immediately, preventing handler execution
- Q: Should the core CQRS module (Mediator, BaseRequest, handlers, pipeline) be implemented as zero-dependency standard library code, or allow DI framework dependencies in the core package? → A: Minimal dependencies: Allow standard DI abstractions (Microsoft.Extensions.DependencyInjection.Abstractions, JSR-330) in core
- Q: Should command handlers return wrapped Result<T> types from Architecture.Core for error handling, or use language-native exception mechanisms? → A: Mixed approach: Business errors return Result<T>, infrastructure errors throw exceptions

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a developer building application-layer services, I need a unified mediator that routes commands and queries to their handlers while applying cross-cutting concerns (transaction management, validation, authorization, caching, telemetry) through a composable pipeline, so that I can maintain clean separation between business logic and infrastructure concerns while ensuring consistent behavior across all requests.

### Acceptance Scenarios

1. **Given** a command with no return value is sent, **When** the mediator processes it, **Then** the correct handler executes within a transaction boundary and returns a Unit/void result
2. **Given** a command with return value is sent, **When** the mediator processes it, **Then** the handler executes within a transaction and returns the specified result type
3. **Given** a query is sent, **When** the mediator processes it, **Then** the handler executes WITHOUT opening a transaction and returns the specified result type
4. **Given** pipeline behaviors are registered (validation, authorization, telemetry), **When** any request is sent, **Then** behaviors execute in configured order before and after the handler
5. **Given** a command handler is executing within an active transaction, **When** it sends a nested command, **Then** the nested command reuses the existing transaction without reopening
6. **Given** validation fails in a pipeline behavior, **When** the mediator processes the request, **Then** the handler never executes and the error propagates immediately
7. **Given** a cancellation token is triggered, **When** a request is in progress, **Then** execution terminates early with proper cleanup
8. **Given** a query with caching behavior enabled, **When** the same query is sent twice, **Then** the second invocation returns cached results without executing the handler

### Edge Cases
- What happens when no handler is registered for a request type?
  -> The mediator must fail fast with a clear error indicating missing handler registration
- What happens when multiple handlers are registered for the same request type?
  -> The mediator must fail at startup/registration time to prevent ambiguous routing
- What happens when a behavior throws an exception?
  -> The pipeline must abort, the transaction (if active) must roll back, and the exception must propagate with full context
- What happens when the transaction provider fails during BeginTransactionAsync()?
  -> The UnitOfWork behavior must fail fast by throwing an exception immediately, preventing handler execution and propagating the infrastructure error to the caller
- What happens when a query attempts to modify state?
  -> The system cannot enforce this at runtime (read-only nature is semantic), but architecture tests MUST detect repository writes in query handlers per CQRS constitutional requirement (Constitution Section II). See CONTRACT_TESTS.md AT-001 for detection strategy, failure criteria, and language-specific static analysis implementations. **Development Phase**: AT-001 failures are advisory during implementation to guide developers toward correct patterns. **Validation Phase**: AT-001 MUST pass before final validation (blocking gate per tasks.md Phase 3.11) and code merge. Single write method call in query handler code = test failure. AT-001 is a constitutional requirement enforcing CQRS separation integrity.
- What happens when behaviors are registered in the wrong order (e.g., telemetry after transaction)?
  -> The system must allow configuration of behavior order; documentation must specify recommended order (Validation -> Authorization -> Transaction -> Telemetry -> Resilience)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a common ancestor type (BaseRequest) that all application-layer requests (commands, queries, future notifications/jobs) inherit from, enabling the pipeline to uniformly process all request types
- **FR-002**: System MUST distinguish between Command (state-changing, no return value), Command<TResult> (state-changing, with return value), and Query<TResult> (read-only, with return value) through separate interfaces or type markers. See Key Abstractions section below for detailed type hierarchy definitions and Language-Specific Naming Conventions below for interface naming patterns
- **FR-003**: System MUST provide a Mediator that accepts commands and queries and routes them to exactly one registered handler while executing all configured pipeline behaviors in order
- **FR-004**: System MUST provide a composable pipeline where behaviors (PipelineBehavior<TRequest, TResponse>) can intercept requests before and after handler execution for cross-cutting concerns
- **FR-005**: System MUST provide a UnitOfWork abstraction that opens transactions only for commands (not queries) and prevents nested transactions by detecting active transaction state
- **FR-006**: System MUST support cancellation and timeout semantics on all async operations through language-appropriate mechanisms (CancellationToken, Context, AbortController, etc.)
- **FR-007**: System MUST allow configuration of behavior execution order and provide type/semantic guards (IsCommand, IsQuery) for behaviors to selectively apply to request types
- **FR-008**: System MUST enforce at registration/startup that each request type maps to exactly one handler to prevent ambiguous routing or runtime handler resolution failures

### Behavioral Requirements

- **BR-001**: UnitOfWork behavior MUST detect if a transaction is already active and pass through without reopening when processing nested commands
- **BR-002**: UnitOfWork behavior MUST commit transactions on successful command completion and ensure rollback on exceptions with detailed error logging. TransactionId MUST be logged for ALL command executions (not optional) with the following edge case handling: (1) **Nested commands**: MUST log the reused TransactionId from parent transaction context (do not generate new ID), (2) **Transaction provider failure** (BR-006): MUST log attempted command with null TransactionId and failure reason in error details, (3) **Exception rollback**: MUST log TransactionId, exception type, message, and duration BEFORE calling RollbackAsync() to ensure correlation even if rollback itself fails. Duration and error details MUST be captured in all scenarios
- **BR-003**: Query handlers MUST NOT open transactions; the UnitOfWork behavior must pass through immediately for queries
- **BR-004**: Pipeline behaviors MUST execute in configured order with earlier behaviors able to short-circuit later ones. The recommended order (Validation -> Authorization -> Transaction -> Telemetry -> Resilience) is ADVISORY and NOT enforced at runtime; implementations MUST allow custom ordering per FR-007 but SHOULD log warnings when behavior order deviates from recommended sequence (e.g., "WARN: Transaction behavior (order 10) executed before Validation (order 20) - may waste database resources on invalid requests"). Documentation MUST explain performance and security implications of ordering choices
- **BR-005**: All handlers and behaviors MUST respect cancellation tokens and terminate early when cancellation is requested, ensuring proper cleanup of resources
- **BR-006**: When the transaction provider fails during BeginTransactionAsync() (connection pool exhaustion, database unavailability), the UnitOfWork behavior MUST fail fast by throwing an infrastructure exception immediately, preventing handler execution and allowing the caller to handle or retry the request at the application level. Before throwing the exception, the UnitOfWork implementation MUST dispose/release all database connections and cancel any pending operations to prevent connection leaks and resource exhaustion. Connection cleanup operations MUST complete within 5 seconds; implementations SHOULD log warnings if cleanup exceeds this timeout
- **BR-007**: Command and query handlers MUST use a mixed error-handling strategy: business logic errors (validation failures, business rule violations, domain constraint violations) return Result<T> with Error details, while infrastructure errors (database connectivity, network failures, dependency unavailability) throw language-native exceptions to be caught by telemetry/resilience behaviors
- **BR-008**: UnitOfWork behavior MUST treat Result.Failure() as a successful completion (commit transaction) since business rule violations are expected outcomes, but MUST rollback on thrown exceptions since infrastructure failures require state rollback

---

## Language-Specific Naming Conventions

To maintain idiomatic code across all language implementations while preserving architectural consistency, naming conventions follow each language's established ecosystem patterns.

**SOURCE OF TRUTH**: See `data-model.md` §"Cross-Language Consistency Matrix" (lines 661-687) for the canonical reference of:
- Interface naming patterns (I prefix for C#/TypeScript, no prefix for Java/Go/Python)
- Void return type terminology across all languages
- Async patterns and cancellation mechanisms
- Complete type mappings for all 13 core abstractions

**Specification References**: When this specification uses generic terms like "BaseRequest" or "CommandHandler", implementations MUST use language-appropriate naming per data-model.md Cross-Language Consistency Matrix. Contract tests validate behavioral equivalence across naming variations.

---

### Key Abstractions *(architecture-level entities)*

- **BaseRequest**: Common ancestor for all application-layer requests per FR-001; enables uniform pipeline processing
- **BaseRequest<TResult>**: Extends BaseRequest for requests that return a value (used by queries and some commands)
- **Command**: Marker for state-changing operations with no return value per FR-002 (inherits BaseRequest)
- **Command<TResult>**: Marker for state-changing operations with a return value per FR-002 (inherits BaseRequest<TResult>)
- **Query<TResult>**: Marker for read-only operations with a return value per FR-002 (inherits BaseRequest<TResult>)
- **Handler Interfaces**: See data-model.md §6-9 for detailed handler contracts (RequestHandler, CommandHandler, QueryHandler interfaces) including signatures, return types, and error handling strategies
- **Mediator interface**: Single entry point that resolves handlers and executes pipeline; provides Send() for commands and queries (language-specific naming per data-model.md Cross-Language Consistency Matrix: IMediator in C#/TypeScript, Mediator in Java/Go/Python)
- **PipelineBehavior<TRequest, TResponse> interface**: Interceptor for cross-cutting concerns; wraps handler execution with pre/post logic
- **UnitOfWork interface**: Transaction boundary abstraction per FR-005 with TransactionId, HasActiveTransaction, BeginTransactionAsync(), CommitAsync(), RollbackAsync(); see BR-001/BR-002 for lifecycle details and Cross-Cutting Concerns section for UnitOfWork behavior integration (language-specific naming: IUnitOfWork in C#/TypeScript, UnitOfWork in Java/Go/Python)
- **BehaviorMatcher interface**: Configuration interface for determining which behaviors apply to which request types using type guards or marker interfaces

### Cross-Cutting Concerns (Pipeline Behaviors)

- **Validation**: Applies to all requests by default; validates command/query payload before handler execution
- **Authorization**: Applies to all requests; enforces security policies before handler execution
- **Transaction (UnitOfWork)**: Applies only to commands per BR-003; implements UnitOfWork abstraction to manage Begin/Commit/Rollback lifecycle per BR-001/BR-002
- **Caching**: Applies to queries; short-circuits handler execution for cache hits or writes through on cache misses
- **Telemetry/Logging**: Applies to all requests; emits duration, success/failure, exceptions using language-native logging frameworks (ILogger for C#, SLF4J for Java, slog for Go, Winston for TypeScript, logging for Python). See data-model.md §"Telemetry Output Specification" (lines 453-543) for complete required fields, conditional fields, output formats, and Result.Failure detection logic per NFR-002
- **Resilience**: Applies to IO-heavy requests; provides retry, timeout, bulkhead, circuit breaker strategies

---

## Testing Requirements

### Unit Testing Requirements

- **UT-001**: Verify each request type maps to exactly one handler (fail if zero or multiple handlers registered)
- **UT-002**: Verify query handlers enforce return type contracts matching Query<TResult>
- **UT-003**: Verify pipeline behaviors execute in configured order
- **UT-004**: Verify cancellation token propagation terminates execution early
- **UT-005**: Verify UnitOfWork behavior opens transactions only for commands, not queries
- **UT-006**: Verify nested commands within an active transaction do not reopen the transaction

### Integration Testing Requirements

- **IT-001**: Verify command execution lifecycle: Begin -> Handler -> Commit with transaction ID logging
- **IT-002**: Verify command execution rollback: Begin -> Handler throws -> Rollback with error logging
- **IT-003**: Verify nested command execution reuses outer transaction without reopening
- **IT-004**: Verify query execution bypasses transaction management entirely
- **IT-005**: Verify query caching behavior: first call executes handler, second call returns cached result
- **IT-006**: Verify telemetry emits duration, status, transaction ID, and exceptions for all request types
- **IT-007**: Verify validation failure prevents handler execution and aborts transaction

---

## Language-Agnostic Portability Requirements

- **LP-001**: Core abstractions MAY depend on minimal standard DI abstraction packages only (C# Microsoft.Extensions.DependencyInjection.Abstractions, Java JSR-330 javax.inject, Go manual wiring with no dependencies, TypeScript reflect-metadata for decorators, Python typing module); all other dependencies (ORMs, validation libraries, telemetry SDKs) belong in separate integration packages
- **LP-002**: Async patterns MUST use language-native constructs (Task/CancellationToken in C#, CompletableFuture in Java, context.Context in Go, Promise/AbortController in TypeScript, asyncio in Python)
- **LP-003**: Type guards (IsCommand, IsQuery) MUST use language-appropriate mechanisms (marker interfaces, annotations, RTTI, discriminated unions, naming conventions)
- **LP-004**: Dependency injection and handler registration MUST integrate with each language's standard DI mechanisms (C# Microsoft.Extensions.DependencyInjection, Java Spring DI / JSR-330 containers, Go manual wiring, TypeScript InversifyJS/tsyringe, Python dependency-injector)
- **LP-005**: Implementations MUST document: DI registration patterns, default pipeline order, transaction provider integration, telemetry outputs, and observability endpoints
- **LP-006**: Telemetry/Logging behavior MUST use language-native logging frameworks (ILogger, SLF4J, slog, Winston, logging module) with implementation-defined formats; advanced structured observability (OpenTelemetry, CorrelationId propagation) is deferred to future Correlation Module integration

### Non-Functional Requirements

- **NFR-001**: System does NOT impose hard end-to-end latency constraints on mediator request processing; performance optimization is left to implementation-specific concerns and behavior configuration. Implementations MUST provide performance benchmarks measuring mediator overhead (pipeline execution excluding handler logic) with p50/p95/p99 latency metrics reported in test output. Benchmarks are informational (no pass/fail thresholds) to enable developers to assess framework impact on their specific use cases. **Acceptance Criteria**: See tasks.md T197-T201 for detailed benchmark test specifications including measurement methodology (no-op handlers isolate pipeline cost), 1000-iteration test scenario, statistical summary requirements, TransactionId validation, and reproducibility documentation
- **NFR-002**: Observability outputs use language-native logging with structured telemetry fields. See data-model.md §"Telemetry Output Specification" (lines 453-543) for complete specification of REQUIRED fields (timestamp, log level, request type, duration, status, exception details, TransactionId for all commands), conditional fields (ErrorType, ErrorMessage), optional fields, and language-specific output formats. Future integration with Correlation/Events modules (Feature 004-architecture-shell-correlation) will add CorrelationId, CausationId, and distributed tracing support with full TDD contract test coverage per Constitution Section III requirements
- **NFR-003**: Architecture compliance tests (AT-001: Query Handler Read-Only Enforcement) MUST pass before final validation and code merge as blocking quality gate per Constitution Section II (CQRS enforcement) and Section III (all tests pass before task completion). AT-001 failures during development are advisory to guide implementation; failures during final validation (tasks.md Phase 3.11) block implementation completion

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs) - specification is implementation-agnostic with language hints only
- [x] Focused on user value and business needs - enables clean CQRS separation with minimal boilerplate
- [x] Written for architects and developers - clear contracts and behavioral expectations
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain - all aspects fully specified
- [x] Requirements are testable and unambiguous - each FR/BR has clear success criteria
- [x] Success criteria are measurable - unit/integration test requirements provided
- [x] Scope is clearly bounded - CQRS module only, can integrate with Events/Correlation modules later
- [x] Dependencies and assumptions identified - requires UnitOfWork implementation, DI container, async runtime

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (none - requirements document was comprehensive)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Abstractions identified
- [x] Review checklist passed

---

## Appendix: Usage Examples (Illustrative)

### Command with Return Value
```pseudo
class CreateOrderCommand(orderId, items) : Command<Result<OrderId>>

class CreateOrderHandler(repo, domainService)
  : CommandHandlerOf<CreateOrderCommand, Result<OrderId>>
{
  async Handle(cmd, ct) {
    // Business rule validation (returns Result.Failure if violated)
    var validationResult = domainService.ValidateOrder(cmd.items)
    if (validationResult.IsFailure) return validationResult

    // Aggregate creation, event emission, repository persistence
    // Infrastructure errors (DB unavailable) throw exceptions
    var order = Order.Create(cmd.orderId, cmd.items)
    await repo.AddAsync(order, ct)  // throws on DB failure
    return Result.Success(orderId)
  }
}
```

### Query
```pseudo
class GetOrderDetailQuery(orderId) : Query<OrderDetailDto>

class GetOrderDetailHandler(readModel)
  : QueryHandler<GetOrderDetailQuery, OrderDetailDto>
{
  async Handle(q, ct) {
    // Read-optimized data access, no transaction, optional caching
    return await readModel.GetOrderDetailAsync(q.orderId, ct)
  }
}
```

### Caller
```pseudo
let result = await mediator.Send(new CreateOrderCommand(...), ct)  // Opens transaction
let dto    = await mediator.Send(new GetOrderDetailQuery(...), ct) // No transaction
```

---

## Related Specifications

This specification is the CQRS sub-module of Architecture.Shell and can be used standalone or integrated with:
- **Events Module** (Inbox/Outbox patterns for reliable event publishing)
- **Correlation Module** (CorrelationId/CausationId tracking across distributed operations) - **Future Spec**: Feature 004-architecture-shell-correlation will include TDD contract tests for correlation context propagation, causation chain tracking, and distributed tracing integration. **Integration Contract**: Future CQRS implementations will provide `ICorrelationContext` interface (C#/TypeScript) / `CorrelationContext` (Java/Go/Python) with `GetCorrelationId()`, `GetCausationId()`, `SetCorrelationId(id)` methods for behavior-level correlation injection. TelemetryBehavior will automatically populate CorrelationId/CausationId fields when context is available. See Feature 004 spec (when created) for detailed interface contracts and migration guide
- **Architecture.Core** (Domain layer abstractions: AggregateRoot, Entity, ValueObject, Result, Maybe)

---

## Compliance & Version

- **Version**: 1.0 Draft
- **Alignment**: Universal DDD Architecture v2.0 principles (multi-language consistency, functional programming, zero external dependencies in core)
- **Recommended Companion**: Architecture Tests for layering boundaries, dependency direction, naming conventions, and cyclic dependency prevention

---