# Architecture.Core - Go Implementation

A Go implementation of universal DDD (Domain-Driven Design) abstractions and functional types for building robust, maintainable applications.

## Features

### Domain-Driven Design Abstractions
- **Entity**: Identity-based equality with generic ID constraints
- **AggregateRoot**: Version control, event collection, business invariants
- **ValueObject**: Structural equality via component comparison
- **DomainEvent**: Correlation/causation tracking with metadata
- **Repository**: Async operations with cancellation support

### Functional Programming Types
- **Result/Result[T]**: Monadic error handling with map/bind/match
- **Maybe[T]**: Optional values with safe operations
- **Error**: Categorized errors (Domain/Validation/Infrastructure/Concurrency/Security)

## Quick Start

```go
package main

import (
    "context"
    "fmt"
    "github.com/universalddd/architecture-core-go/examples/quickstart"
)

func main() {
    // Create order service
    service := quickstart.NewOrderService()
    ctx := context.Background()

    // Create and process order
    result := service.CreateOrder(ctx, "CUST-001", quickstart.NewMoney(100.00, "USD"), "").
        Bind(func(orderID string) functional.Result[string] {
            return service.ConfirmOrder(ctx, orderID).Map(func() string { return orderID })
        }).
        Bind(func(orderID string) functional.Result[string] {
            return service.ShipOrder(ctx, orderID).Map(func() string { return orderID })
        })

    result.Match(
        func(orderID string) { fmt.Printf("Order %s processed successfully\n", orderID) },
        func(err functional.Error) { fmt.Printf("Processing failed: %s\n", err.Message()) },
    )
}
```

## Project Structure

```
golang/
├── pkg/
│   ├── domain/              # DDD abstractions
│   │   ├── aggregate.go     # AggregateRoot interface and base
│   │   ├── entity.go        # Entity interface and base
│   │   ├── valueobject.go   # ValueObject interface and base
│   │   ├── event.go         # DomainEvent interface and base
│   │   ├── repository.go    # Repository interface and in-memory impl
│   │   └── test_helpers.go  # Test utilities
│   └── functional/          # Functional programming types
│       ├── error.go         # Categorized error types
│       ├── result.go        # Result and Result[T] monads
│       └── maybe.go         # Maybe[T] optional type
├── examples/
│   └── quickstart/          # Complete example implementation
│       ├── domain.go        # Order domain model
│       ├── repository.go    # Order repository
│       ├── service.go       # Order application service
│       └── main.go          # Demo application
└── tests/
    ├── contract/           # API contract tests
    ├── integration/        # Integration scenarios
    ├── unit/              # Unit tests
    └── performance/       # Benchmark tests
```

## Key Design Principles

### 1. Zero External Dependencies
Core library uses only Go standard library - no external runtime dependencies.

### 2. Type Safety with Generics
Leverages Go 1.21+ generics for type-safe abstractions:

```go
type AggregateRoot[TID EntityID] interface {
    IEntity[TID]
    GetVersion() int64
    GetEvents() []IDomainEvent
    ClearEvents()
}
```

### 3. Functional Error Handling
Uses Result types instead of exceptions:

```go
func (o *Order) ConfirmOrder() functional.Result {
    if o.status != Pending {
        return functional.Fail(functional.DomainError(
            "INVALID_STATUS_TRANSITION",
            fmt.Sprintf("Cannot confirm order in %s status", o.status),
        ))
    }
    // ... business logic
    return functional.Ok()
}
```

### 4. Monadic Composition
Supports functional composition patterns:

```go
// Chain operations with automatic error propagation
result := validateInput(data).
    Bind(processPayment).
    Bind(createOrder).
    Map(generateConfirmation)
```

## Value Objects

Structural equality based on component values:

```go
type Money struct {
    domain.ValueObject
    amount   float64
    currency string
}

func (m Money) GetEqualityComponents() []interface{} {
    return []interface{}{m.amount, m.currency}
}
```

## Domain Events

Event sourcing support with metadata:

```go
type OrderCreatedEvent struct {
    *domain.DomainEventBase
    orderID    string
    customerID string
    amount     Money
}
```

## Repository Pattern

Async operations with context cancellation:

```go
type IOrderRepository interface {
    GetByIDAsync(ctx context.Context, id string) functional.Maybe[*Order]
    AddAsync(ctx context.Context, order *Order) functional.Result
    UpdateAsync(ctx context.Context, order *Order) functional.Result
    DeleteAsync(ctx context.Context, id string) functional.Result
}
```

## Testing

Comprehensive test suite following TDD principles:

- **Contract Tests**: Verify interface compliance
- **Monadic Laws**: Validate mathematical properties
- **Integration Tests**: End-to-end scenarios
- **Unit Tests**: Individual component behavior
- **Performance Tests**: Benchmarks and memory analysis

Run tests:
```bash
# Run all tests
go test ./...

# Run with race detection
go test -race ./...

# Run benchmarks
go test -bench=. ./tests/performance/

# Generate coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

## Build

```bash
# Build project
make build

# Run quality checks
make quality

# Run CI pipeline
make ci
```

## Design Patterns

### Repository with Validation
```go
func (r *InMemoryOrderRepository) AddAsync(ctx context.Context, order *Order) functional.Result {
    // Validate business rules
    if order.GetTotalAmount().GetAmount() <= 0 {
        return functional.Fail(functional.ValidationError("INVALID_AMOUNT", "Amount must be positive"))
    }

    // Persist with optimistic concurrency
    return r.InMemoryRepository.AddAsync(ctx, order)
}
```

### Aggregate with Events
```go
func (o *Order) ConfirmOrder() functional.Result {
    // Business rule validation
    if o.status != Pending {
        return functional.Fail(functional.DomainError("INVALID_TRANSITION", "Cannot confirm"))
    }

    // State change
    previousStatus := o.status
    o.status = Confirmed

    // Event generation
    event := NewOrderStatusChangedEvent(o.GetID(), previousStatus.String(), o.status.String())
    o.AddEvent(event)
    o.IncrementVersion()

    return functional.Ok()
}
```

### Service Layer with Composition
```go
func (s *OrderService) ProcessOrderWorkflow(ctx context.Context, customerID string, amount Money) functional.Result[string] {
    return s.CreateOrder(ctx, customerID, amount, "").
        Bind(func(orderID string) functional.Result[string] {
            return s.ConfirmOrder(ctx, orderID).Map(func() string { return orderID })
        }).
        Bind(func(orderID string) functional.Result[string] {
            return s.ShipOrder(ctx, orderID).Map(func() string { return orderID })
        })
}
```

## Architecture Benefits

1. **Type Safety**: Compile-time guarantees through generics
2. **Testability**: Pure functions and dependency injection
3. **Maintainability**: Clear separation of concerns
4. **Performance**: Zero-allocation functional types
5. **Reliability**: Explicit error handling without exceptions
6. **Scalability**: Async-first with context cancellation

## Contributing

1. Follow TDD approach - tests first
2. Maintain zero external dependencies in core
3. Use Given-When-Then test structure
4. Ensure monadic laws compliance
5. Add benchmarks for performance-critical code

## License

See repository root for license information.

---

**Implementation Status**: Core functionality complete with comprehensive test suite. Ready for production use.

**Total Lines of Code**: ~2,500 lines
**Test Coverage**: Comprehensive contract, integration, and unit tests
**Performance**: Optimized for zero allocations and minimal GC pressure