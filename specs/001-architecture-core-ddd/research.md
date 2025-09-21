# Go Research: DDD Abstractions and Functional Types

**Date**: 2025-09-21
**Context**: Architecture.Core implementation for Go
**Status**: Complete

## 1. Go Generics Best Practices for DDD Types

### Decision: Type Constraints with Interface Definitions
Use Go generics with domain-specific type constraints, leveraging the `comparable` built-in constraint and custom constraints for entity IDs and aggregate types.

```go
// Type constraints for entity identifiers
type EntityID interface {
    comparable
    fmt.Stringer
}

// Generic aggregate root with type-safe ID
type AggregateRoot[TID EntityID] interface {
    ID() TID
    Version() int64
    DomainEvents() []DomainEvent
}

// Generic entity with identity-based equality
type Entity[TID EntityID] interface {
    ID() TID
    Equals(other Entity[TID]) bool
}
```

### Rationale
- **Type Safety**: Compile-time verification of ID types across the domain
- **Performance**: Zero-cost abstractions with generic specialization
- **Go Idioms**: Follows Go's preference for small interfaces and explicit types
- **Multi-language Consistency**: Maintains same type safety as C# and TypeScript implementations

### Alternatives Considered
- **interface{} with type assertions**: Rejected due to runtime type checking and lack of type safety
- **Code generation**: Rejected due to build complexity and poor IDE support
- **Reflection-based approaches**: Rejected due to performance overhead and runtime errors

## 2. Go Interface Design Patterns for Repository Abstraction

### Decision: Small, Focused Interfaces with Dependency Inversion
Place repository interfaces in the domain package, implement in infrastructure, following Go's implicit interface satisfaction.

```go
// Domain package defines the interface
type OrderRepository interface {
    GetByID(ctx context.Context, id OrderID) (*Maybe[Order], error)
    Save(ctx context.Context, order *Order) error
    Delete(ctx context.Context, id OrderID) error
    Exists(ctx context.Context, id OrderID) (bool, error)
}

// Infrastructure package implements
type sqlOrderRepository struct {
    db *sql.DB
}

func (r *sqlOrderRepository) GetByID(ctx context.Context, id OrderID) (*Maybe[Order], error) {
    // Implementation
}
```

### Rationale
- **Dependency Inversion**: Domain defines contracts, infrastructure implements
- **Testability**: Easy to create test doubles and mocks
- **Go Conventions**: Leverages implicit interface satisfaction
- **Context Integration**: Proper cancellation and timeout support

### Alternatives Considered
- **Generic repository pattern**: Rejected due to loss of domain-specific operations
- **Single large interface**: Rejected due to Interface Segregation Principle violations
- **Concrete types in domain**: Rejected due to tight coupling to infrastructure

## 3. Memory Allocation Optimization for Functional Types

### Decision: Value Types with Zero-Allocation Patterns
Implement Result[T] and Maybe[T] as structs with value semantics, using sync.Pool for high-frequency allocations.

```go
// Zero-allocation Result type
type Result[T any] struct {
    value T
    err   *Error
    isOk  bool
}

// Stack-friendly constructor
func Ok[T any](value T) Result[T] {
    return Result[T]{value: value, isOk: true}
}

// Maybe type with zero allocations for Some/None
type Maybe[T any] struct {
    value    T
    hasValue bool
}

var errorPool = sync.Pool{
    New: func() interface{} {
        return &Error{}
    },
}
```

### Rationale
- **Performance**: Stack allocation for small types, minimal GC pressure
- **Memory Efficiency**: No boxing/unboxing overhead
- **Zero-Cost Abstractions**: Compiles to efficient machine code
- **Go Patterns**: Value semantics align with Go conventions

### Alternatives Considered
- **Pointer-based approach**: Rejected due to heap allocations and GC pressure
- **Interface-based design**: Rejected due to boxing overhead and indirection
- **Channel-based Maybe**: Rejected due to complexity and allocation overhead

## 4. Go Error Handling vs Exception-Based Languages

### Decision: Explicit Error-as-Values with Domain Context
Embrace Go's explicit error handling while providing structured error types with business context.

```go
// Structured error with business context
type Error struct {
    Code     string
    Message  string
    Category ErrorCategory
    Metadata map[string]interface{}
    Inner    error
}

// Domain-specific error patterns
func (r *OrderRepository) GetByID(ctx context.Context, id OrderID) (*Maybe[Order], error) {
    // Database operation
    if err := db.QueryRow(query, id).Scan(&order); err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return Maybe[Order]{}, nil // None case, not an error
        }
        return nil, &Error{
            Code:     "Infrastructure.Database.QueryFailed",
            Message:  "Failed to retrieve order",
            Category: Infrastructure,
            Inner:    err,
        }
    }
    return Some(order), nil
}
```

### Rationale
- **Predictability**: Explicit error handling forces consideration of failure cases
- **Business Context**: Structured errors preserve domain knowledge
- **Performance**: No stack unwinding overhead
- **Go Idioms**: Works naturally with Go's error handling patterns

### Alternatives Considered
- **Panic/recover for business logic**: Rejected as anti-pattern in Go
- **Result-only pattern (no error)**: Rejected due to loss of standard library integration
- **Error interface implementation only**: Rejected due to limited structure and context

## 5. Go Testing Patterns and Benchmarking

### Decision: Table-Driven Tests with Given-When-Then Structure
Use Go's built-in testing with table-driven patterns, explicit Given-When-Then comments, and comprehensive benchmarking.

```go
func TestResult_Should_ChainOperations_When_AllSucceed(t *testing.T) {
    tests := []struct {
        name     string
        input    int
        expected string
    }{
        {"positive number", 5, "10"},
        {"zero", 0, "0"},
        {"negative number", -3, "-6"},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Given
            result := Ok(tt.input)

            // When
            mapped := result.
                Map(func(x int) int { return x * 2 }).
                Map(func(x int) string { return strconv.Itoa(x) })

            // Then
            if !mapped.IsOk() {
                t.Errorf("Expected success, got error: %v", mapped.Error())
            }
            if mapped.Value() != tt.expected {
                t.Errorf("Expected %s, got %s", tt.expected, mapped.Value())
            }
        })
    }
}

func BenchmarkResult_Map_Chain(b *testing.B) {
    result := Ok(42)
    b.ResetTimer()

    for i := 0; i < b.N; i++ {
        _ = result.
            Map(func(x int) int { return x * 2 }).
            Map(func(x int) int { return x + 1 }).
            Map(func(x int) string { return strconv.Itoa(x) })
    }
}
```

### Rationale
- **Comprehensive Coverage**: Table-driven tests cover edge cases systematically
- **Performance Validation**: Benchmarks ensure zero-allocation goals are met
- **TDD Support**: Clear test structure supports test-first development
- **Monadic Law Testing**: Property-based testing ensures mathematical correctness

### Alternatives Considered
- **External testing frameworks**: Rejected to maintain zero external dependencies
- **BDD frameworks**: Rejected due to dependency overhead and complexity
- **Property-based testing only**: Rejected due to learning curve and complexity

## 6. Go Version Compatibility Strategy

### Decision: Go 1.21 Minimum with Go 1.25 Optimizations
Target Go 1.21 as minimum version with conditional compilation for Go 1.25+ features using toolchain management.

```go
//go:build go1.25
// +build go1.25

package functional

// Use Go 1.25+ optimizations when available
func (r Result[T]) optimize() {
    // Advanced optimization features
}
```

```go
//go:build !go1.25
// +build !go1.25

package functional

// Fallback implementation for Go 1.21-1.24
func (r Result[T]) optimize() {
    // Compatible implementation
}
```

### Rationale
- **Stability**: Go 1.21 provides stable generics and proven performance
- **Forward Compatibility**: Toolchain management enables new feature adoption
- **Team Consistency**: Single go.mod version prevents toolchain conflicts
- **Progressive Enhancement**: New features adopted without breaking compatibility

### Alternatives Considered
- **Go 1.18 minimum**: Rejected due to early generics implementation issues
- **Latest-only strategy**: Rejected due to enterprise adoption lag
- **Version-specific modules**: Rejected due to maintenance complexity

## Summary of Key Decisions

| Area | Decision | Impact |
|------|----------|---------|
| **Generics** | Type constraints with comparable interface | Type-safe, performant DDD abstractions |
| **Interfaces** | Small interfaces in domain package | Clean architecture, easy testing |
| **Memory** | Value types with zero-allocation patterns | High performance, low GC pressure |
| **Errors** | Explicit error-as-values with context | Predictable, business-aware error handling |
| **Testing** | Table-driven tests with benchmarking | Comprehensive coverage, performance validation |
| **Versions** | Go 1.21+ with conditional compilation | Stability with progressive enhancement |

## Implementation Readiness

All technical unknowns have been resolved. The research provides sufficient detail to:

1. **Design data models** using Go generics and interfaces
2. **Implement functional types** with zero-allocation patterns
3. **Create repository contracts** following dependency inversion
4. **Write comprehensive tests** using table-driven patterns
5. **Optimize performance** through benchmarking and profiling
6. **Maintain compatibility** across Go versions

**Status**: ✅ Ready for Phase 1 (Design & Contracts)