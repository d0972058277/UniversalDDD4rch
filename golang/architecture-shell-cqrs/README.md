# Architecture.Shell.CQRS - Go Implementation

## Status: Ready for Implementation

This module is currently **empty and ready for proper implementation** following the specification.

## Specification

**Source**: `/specs/003-architecture-shell-cqrs/spec.md`

This module implements the CQRS (Command Query Responsibility Segregation) pattern for the Universal DDD Architecture, providing:

- **Mediator Pattern**: Central dispatcher for commands and queries
- **Pipeline Behaviors**: Cross-cutting concerns (validation, authorization, transactions, telemetry)
- **Command/Query Separation**: Clear distinction between state-changing and read-only operations
- **UnitOfWork Pattern**: Transaction management for commands

## Implementation Requirements

### Core Abstractions (Go Naming Conventions)

Following Go idioms, interface names should **NOT** have an "I" prefix:

```go
// Request types
type BaseRequest interface { ... }
type Command interface { ... }
type CommandWithResult[T any] interface { ... }
type Query[T any] interface { ... }

// Handlers
type CommandHandler[TCommand Command] interface { ... }
type QueryHandler[TQuery Query[T], T any] interface { ... }

// Mediator
type Mediator interface { ... }

// Pipeline
type PipelineBehavior interface { ... }

// UnitOfWork
type UnitOfWork interface { ... }
```

### Key Features to Implement

1. **Request Lifecycle** (FR-003)
   - Route requests to exactly one handler
   - Execute pipeline behaviors in order
   - Support cancellation via `context.Context`

2. **Command/Query Distinction** (FR-002)
   - Commands: State-changing operations (with/without return values)
   - Queries: Read-only operations (always return values)
   - Type-safe distinction using Go generics

3. **Transaction Management** (FR-005)
   - UnitOfWork behavior opens transactions ONLY for commands
   - Detect and reuse active transactions for nested commands
   - Queries bypass transaction management

4. **Pipeline Behaviors** (FR-004)
   - Validation: Pre-handler validation
   - Authorization: Security enforcement
   - UnitOfWork: Transaction boundaries
   - Telemetry: Logging and metrics
   - Caching: Query result caching

5. **Error Handling** (BR-007)
   - Business errors: Return `functional.Result[T]`
   - Infrastructure errors: Return Go `error`
   - UnitOfWork commits on `Result.Success()` or `Result.Failure()`
   - UnitOfWork rolls back on infrastructure errors

## Cross-Language Consistency

### Go Naming (Idiomatic)
```go
type Mediator interface { ... }          // No "I" prefix
type UnitOfWork interface { ... }        // No "I" prefix
type PipelineBehavior interface { ... }  // No "I" prefix
```

### Other Languages (for reference)
- **C#/TypeScript**: `IMediator`, `IUnitOfWork`, `IPipelineBehavior`
- **Java/Python**: `Mediator`, `UnitOfWork`, `PipelineBehavior`

### Async Patterns
- **Go**: `context.Context` for cancellation, standard Go error handling
- **C#**: `CancellationToken`, `Task<T>`
- **Java**: `CompletableFuture<T>`
- **Python**: `async`/`await`
- **TypeScript**: `Promise<T>`, `AbortController`

## Test Structure

```
tests/
├── contract/      # Cross-language contract tests (TBD)
├── unit/          # Unit tests for individual components
├── integration/   # Integration tests (mediator + behaviors)
└── performance/   # Performance benchmarks
```

## Implementation Checklist

- [ ] **Phase 1: Core Abstractions**
  - [ ] Request types (BaseRequest, Command, Query)
  - [ ] Handler interfaces
  - [ ] Mediator interface
  - [ ] Pipeline behavior interface

- [ ] **Phase 2: Mediator Implementation**
  - [ ] Handler registration
  - [ ] Request routing
  - [ ] Pipeline execution
  - [ ] Cancellation support

- [ ] **Phase 3: Behaviors**
  - [ ] UnitOfWork behavior
  - [ ] Validation behavior
  - [ ] Telemetry behavior
  - [ ] Caching behavior (queries only)

- [ ] **Phase 4: Testing**
  - [ ] Unit tests (TDD approach)
  - [ ] Integration tests
  - [ ] Performance benchmarks
  - [ ] Contract tests (cross-language validation)

## Dependencies

```go
require github.com/universalddd/architecture-core v0.0.0
```

**Note**: Must maintain zero external runtime dependencies in core implementation. Integration packages (e.g., specific DI frameworks, caching libraries) should be separate.

## Next Steps

1. Review specification: `/specs/003-architecture-shell-cqrs/spec.md`
2. Study existing implementations:
   - C#: `/csharp-dotnet/src/Architecture.Shell.Cqrs/`
   - TypeScript: `/typescript-nodejs/architecture-shell-cqrs/`
   - Python: `/python-django/architecture-shell-cqrs/`
3. Implement following TDD approach (tests first)
4. Ensure Go idiomatic code and naming conventions
5. Validate cross-language consistency

## References

- **Specification**: `/specs/003-architecture-shell-cqrs/spec.md`
- **Data Model**: `/specs/003-architecture-shell-cqrs/data-model.md`
- **Constitution**: `/specs/003-architecture-shell-cqrs/constitution.md`

---
**Branch**: 003-architecture-shell-cqrs
**Status**: Ready for implementation
**Last Updated**: 2025-10-04
