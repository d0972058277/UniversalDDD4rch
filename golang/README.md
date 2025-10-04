# Universal DDD Architecture - Go Implementation

A Go implementation of universal DDD (Domain-Driven Design) abstractions and CQRS patterns for building robust, maintainable applications.

## Project Structure (Modular Architecture)

```
golang/
├── architecture-core/              # Core DDD abstractions
│   ├── domain/                     # Entity, AggregateRoot, ValueObject, DomainEvent
│   ├── functional/                 # Result, Maybe, Error monads
│   ├── examples/                   # Quickstart examples
│   ├── tests/                      # Contract, unit, integration tests
│   └── go.mod
│
├── architecture-shell-cqrs/        # CQRS implementation (in development)
│   ├── tests/                      # Test structure
│   └── go.mod
│
├── architecture-gorm/              # GORM database integration
│   ├── repository.go               # GORM-based repository
│   └── go.mod
│
└── go.work                         # Go workspace configuration
```

## Modules

### 📦 architecture-core
**Status**: ✅ Complete with 100% contract test coverage

Core DDD abstractions and functional types:
- **Domain**: Entity, AggregateRoot, ValueObject, DomainEvent, Repository
- **Functional**: Result/Result[T], Maybe[T], Error (categorized)
- **Zero external dependencies** (pure Go standard library)

**Import path**: `github.com/universalddd/architecture-core`

### 📦 architecture-shell-cqrs
**Status**: 🔄 Ready for implementation

CQRS pattern implementation with mediator and pipeline behaviors.

**Import path**: `github.com/universalddd/architecture-shell-cqrs`

### 📦 architecture-gorm
**Status**: ✅ Complete

GORM-based repository implementation for database persistence.

**Import path**: `github.com/universalddd/architecture-gorm`

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/universalddd/architecture-go.git
cd golang

# Initialize workspace
go work sync
```

### Basic Usage

```go
package main

import (
    "context"
    "fmt"
    "github.com/universalddd/architecture-core/domain"
    "github.com/universalddd/architecture-core/functional"
)

func main() {
    // Create an order aggregate
    order := domain.NewTestAggregate("order-001")

    // Add domain event
    event := domain.NewTestEvent("OrderCreated")
    order.AddDomainEvent(event)

    // Work with Result monad
    result := functional.Ok("Success")
    result.Match(
        func(val string) { fmt.Println("Success:", val) },
        func(err *functional.Error) { fmt.Println("Error:", err.Message()) },
    )
}
```

## Key Features

### 1. Type-Safe Generics (Go 1.21+)

```go
type AggregateRoot[TID EntityID] interface {
    ID() TID
    Version() int64
    DomainEvents() []DomainEvent
    IncrementVersion()
}
```

### 2. Functional Error Handling

```go
func ProcessOrder(order *Order) functional.Result[string] {
    if order.Total() <= 0 {
        return functional.Fail[string](
            functional.ValidationError("INVALID_AMOUNT", "Amount must be positive"),
        )
    }
    return functional.Ok("ORDER-123")
}
```

### 3. Monadic Composition

```go
result := validateInput(data).
    Bind(processPayment).
    Bind(createOrder).
    Map(generateConfirmation)
```

### 4. Value Objects with Structural Equality

```go
type Money struct {
    domain.BaseValueObject
    amount   float64
    currency string
}

func (m Money) GetEqualityComponents() []interface{} {
    return []interface{}{m.amount, m.currency}
}
```

### 5. Domain Events with Correlation Tracking

```go
event := domain.NewBaseDomainEventWithCorrelation(
    "OrderCreated",
    &correlationID,
    &causationID,
    metadata,
)
```

## Testing

### Run All Tests (All Modules)

```bash
# Run test script (recommended)
make test-all

# Or manually with workspace
go test ./...
```

### Run Module-Specific Tests

```bash
# Architecture Core tests
cd architecture-core
go test ./tests/contract/... -v

# CQRS tests (when implemented)
cd architecture-shell-cqrs
go test ./tests/unit/... -v
```

### Run with Coverage

```bash
# Generate coverage for all modules
make coverage

# View coverage report
go tool cover -html=coverage.out
```

### Run Benchmarks

```bash
# Run performance benchmarks
cd architecture-core
go test -bench=. ./tests/performance/
```

## Build Commands

```bash
# Build all modules
make build

# Run quality checks (lint, vet, fmt)
make quality

# Run CI pipeline
make ci

# Clean build artifacts
make clean
```

## Architecture Principles

### 1. Zero External Dependencies (Core)
The core module uses only Go standard library - no external runtime dependencies.

### 2. Multi-Language Consistency
Aligned with C#, TypeScript, Python, and Java implementations:
- C#: `Architecture.Core`, `Architecture.Shell.Cqrs`
- TypeScript: `architecture-core`, `architecture-shell-cqrs`
- Python: `architecture-core`, `architecture-shell-cqrs`
- Java: `architecture-core`, `architecture-shell-cqrs`
- **Go**: `architecture-core`, `architecture-shell-cqrs` ✅

### 3. Idiomatic Go
- No "I" prefix for interfaces (Go convention)
- Use `context.Context` for cancellation (not CancellationToken)
- Standard Go error handling combined with Result monads
- Package names follow Go best practices

### 4. Test-Driven Development
- Contract tests for cross-language validation
- Unit tests for individual components
- Integration tests for end-to-end scenarios
- Performance benchmarks for critical paths

## Import Paths

### Architecture Core
```go
import (
    "github.com/universalddd/architecture-core/domain"
    "github.com/universalddd/architecture-core/functional"
)
```

### Architecture Shell CQRS (when available)
```go
import "github.com/universalddd/architecture-shell-cqrs"
```

### Architecture GORM
```go
import "github.com/universalddd/architecture-gorm"
```

## Cross-Language Consistency

| Concept | C# | Go | TypeScript | Java | Python |
|---------|----|----|------------|------|--------|
| Mediator | `IMediator` | `Mediator` | `IMediator` | `Mediator` | `Mediator` |
| Result | `Result<T>` | `Result[T]` | `Result<T>` | `Result<T>` | `Result[T]` |
| Cancellation | `CancellationToken` | `context.Context` | `AbortController` | `CompletableFuture` | `asyncio` |
| Async | `Task<T>` | Go routines | `Promise<T>` | `CompletableFuture<T>` | `async/await` |

## Documentation

- **Specification**: `/specs/003-architecture-shell-cqrs/spec.md`
- **Migration Guide**: `MIGRATION.md`
- **Restructure Summary**: `RESTRUCTURE_SUMMARY.md`
- **Cleanup Summary**: `CLEANUP_SUMMARY.md`

## Examples

See `architecture-core/examples/` for complete working examples:
- Order domain model
- Repository implementation
- Application service layer
- Domain events and correlation

## Contributing

1. **Follow TDD**: Write tests first
2. **Zero dependencies in core**: Keep core pure Go
3. **Test naming**: `Should_ExpectedBehavior_When_StateUnderTest`
4. **Monadic laws**: Ensure functional types comply with mathematical laws
5. **Benchmarks**: Add performance tests for critical paths
6. **Go conventions**: Follow idiomatic Go patterns

## Workspace Management

This project uses Go 1.21+ workspace feature for multi-module development:

```bash
# Sync workspace
go work sync

# Add new module to workspace
go work use ./new-module

# View workspace configuration
cat go.work
```

## Performance

- **Zero allocations** in functional types
- **Minimal GC pressure** through value types
- **Concurrent-safe** aggregate operations
- **Context cancellation** support throughout

## Status

| Module | Status | Tests | Coverage |
|--------|--------|-------|----------|
| architecture-core | ✅ Complete | ✅ Passing | 100% contract |
| architecture-shell-cqrs | 🔄 In Development | ⏳ Pending | - |
| architecture-gorm | ✅ Complete | ✅ Passing | - |

---

**Version**: v2.0 (Universal DDD Architecture)
**Go Version**: 1.21+
**Last Updated**: 2025-10-04
**Branch**: 003-architecture-shell-cqrs
