# Research Findings: Architecture.Core Go Implementation

**Date**: 2025-09-21
**Language**: Go 1.21+ with Go 1.25 target compatibility
**Scope**: Technical decisions for implementing DDD abstractions and functional types in Go

## 1. Go Generics Best Practices for DDD Types (Go 1.18+ features)

**Decision**: Use type constraints with interface definitions, leverage `comparable` built-in constraint, and implement domain-specific constraints for DDD patterns.

**Rationale**:
- Go 1.18+ generics provide type safety while maintaining performance
- Type constraints enable precise domain modeling without runtime overhead
- `comparable` constraint essential for entity identity and value object equality
- Interface-based constraints align with Go's idiomatic design patterns

**Alternatives Considered**:
- Interface{} with runtime type assertions (rejected: no compile-time safety)
- Code generation approach (rejected: build complexity)
- Separate implementations per type (rejected: code duplication)

**Implementation Strategy**:
```go
// Domain-specific constraints
type ID interface {
    comparable
    String() string
}

type Entity[TId ID] interface {
    GetID() TId
    Equals(other Entity[TId]) bool
}

type AggregateRoot[TId ID] interface {
    Entity[TId]
    GetVersion() int64
    GetDomainEvents() []DomainEvent
    ClearDomainEvents()
}

// Repository constraint example
type Repository[TAggregate AggregateRoot[TId], TId ID] interface {
    GetByIDAsync(ctx context.Context, id TId) (Maybe[TAggregate], error)
    AddAsync(ctx context.Context, aggregate TAggregate) error
    UpdateAsync(ctx context.Context, aggregate TAggregate) error
    DeleteAsync(ctx context.Context, id TId) error
}
```

**Performance Considerations**:
- Use type constraints to avoid interface boxing in hot paths
- Leverage compile-time type checking for domain invariants
- Minimize allocations through value-based generic types

## 2. Go Interface Design Patterns for Repository Abstraction and Dependency Inversion

**Decision**: Implement small, focused interfaces following Go idioms with dependency inversion through interface placement in domain packages.

**Rationale**:
- Go's implicit interface satisfaction enables clean dependency inversion
- Small interfaces (single responsibility) are more composable and testable
- Interface placement in consuming package (domain) inverts dependencies
- Enables easy mocking and testing without external frameworks

**Alternatives Considered**:
- Large monolithic repository interfaces (rejected: violates interface segregation)
- Concrete implementations in domain layer (rejected: tight coupling)
- External DI container usage (rejected: Go community preference for explicit dependencies)

**Implementation Strategy**:
```go
// Domain layer defines the interface it needs
package domain

type OrderRepository interface {
    GetByID(ctx context.Context, id OrderID) (Maybe[*Order], error)
    Save(ctx context.Context, order *Order) error
    Delete(ctx context.Context, id OrderID) error
}

// Infrastructure layer implements the interface
package infrastructure

type PostgreSQLOrderRepository struct {
    db *sql.DB
}

func (r *PostgreSQLOrderRepository) GetByID(ctx context.Context, id domain.OrderID) (domain.Maybe[*domain.Order], error) {
    // Implementation
}
```

**Dependency Injection Pattern**:
```go
// Service constructor with explicit dependencies
func NewOrderService(repo domain.OrderRepository, logger Logger) *OrderService {
    return &OrderService{
        repo:   repo,
        logger: logger,
    }
}
```

**Best Practices**:
- Keep interfaces small and focused (1-3 methods ideal)
- Place interfaces in consuming packages for dependency inversion
- Use context.Context for cancellation in all async operations
- Avoid premature abstraction - start concrete, extract interfaces when needed

## 3. Memory Allocation Optimization Strategies for Functional Types

**Decision**: Use value types (structs) for Result and Maybe types with zero-allocation patterns, leverage sync.Pool for frequent allocations, and implement stack-friendly designs.

**Rationale**:
- Value types avoid heap allocations for success/some cases
- Stack allocation reduces GC pressure significantly
- sync.Pool provides object reuse for frequently created types
- Go's escape analysis helps keep values on stack when possible

**Alternatives Considered**:
- Pointer-based types (rejected: heap allocation overhead)
- Interface-based approach (rejected: boxing allocations)
- External functional programming libraries (rejected: dependency requirement)

**Zero-Allocation Result Implementation**:
```go
type Result[T any] struct {
    value T
    err   error
    isOk  bool
}

func Ok[T any](value T) Result[T] {
    return Result[T]{value: value, isOk: true}
}

func Err[T any](err error) Result[T] {
    var zero T
    return Result[T]{value: zero, err: err, isOk: false}
}

func (r Result[T]) IsOk() bool { return r.isOk }
func (r Result[T]) IsErr() bool { return !r.isOk }

func (r Result[T]) Unwrap() (T, error) {
    if r.isOk {
        return r.value, nil
    }
    var zero T
    return zero, r.err
}

// Monadic operations
func Map[T, U any](r Result[T], f func(T) U) Result[U] {
    if r.IsErr() {
        return Err[U](r.err)
    }
    return Ok(f(r.value))
}

func Bind[T, U any](r Result[T], f func(T) Result[U]) Result[U] {
    if r.IsErr() {
        return Err[U](r.err)
    }
    return f(r.value)
}
```

**Maybe Type Implementation**:
```go
type Maybe[T any] struct {
    value   T
    hasValue bool
}

func Some[T any](value T) Maybe[T] {
    return Maybe[T]{value: value, hasValue: true}
}

func None[T any]() Maybe[T] {
    var zero T
    return Maybe[T]{value: zero, hasValue: false}
}

func (m Maybe[T]) IsSome() bool { return m.hasValue }
func (m Maybe[T]) IsNone() bool { return !m.hasValue }
```

**Performance Optimizations**:
- Use value receivers for small structs to avoid pointer indirection
- Implement object pooling for frequently allocated domain events
- Leverage pre-allocation patterns for slice-based collections
- Use strings.Builder for string concatenation in hot paths

**Pool Pattern for Domain Events**:
```go
var domainEventPool = sync.Pool{
    New: func() interface{} {
        return &DomainEventBase{}
    },
}

func NewDomainEvent() *DomainEventBase {
    event := domainEventPool.Get().(*DomainEventBase)
    event.Reset() // Reset to clean state
    return event
}

func (e *DomainEventBase) Release() {
    domainEventPool.Put(e)
}
```

## 4. Go Error Handling Patterns vs Exception-Based Languages

**Decision**: Embrace Go's explicit error-as-values approach with domain-specific error types, structured error categorization, and functional composition patterns.

**Rationale**:
- Go's explicit error handling provides better control and predictability
- Error-as-values approach aligns with functional programming principles
- Domain-specific errors carry business context and enable proper handling
- No hidden control flow or unexpected exceptions to handle

**Alternatives Considered**:
- Panic/recover for domain errors (rejected: violates Go idioms)
- Generic error interfaces only (rejected: loses domain context)
- Third-party exception libraries (rejected: external dependency)

**Domain Error Design**:
```go
type ErrorCategory int

const (
    DomainError ErrorCategory = iota
    ValidationError
    InfrastructureError
    ConcurrencyError
    SecurityError
)

type DomainErr struct {
    Code     string
    Message  string
    Category ErrorCategory
    Metadata map[string]interface{}
    Inner    error
}

func (e *DomainErr) Error() string {
    return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

func (e *DomainErr) Unwrap() error {
    return e.Inner
}

// Factory functions for different error categories
func NewDomainError(code, message string) *DomainErr {
    return &DomainErr{
        Code:     code,
        Message:  message,
        Category: DomainError,
        Metadata: make(map[string]interface{}),
    }
}

func NewValidationError(code, message string) *DomainErr {
    return &DomainErr{
        Code:     code,
        Message:  message,
        Category: ValidationError,
        Metadata: make(map[string]interface{}),
    }
}
```

**Error Wrapping and Context**:
```go
func (s *OrderService) CreateOrder(ctx context.Context, cmd CreateOrderCommand) Result[*Order] {
    // Validate command
    if err := cmd.Validate(); err != nil {
        return Err[*Order](NewValidationError("ORDER.INVALID_COMMAND", err.Error()))
    }

    // Check business rules
    if existing, err := s.repo.GetByID(ctx, cmd.CustomerID); err != nil {
        return Err[*Order](fmt.Errorf("failed to check existing orders: %w", err))
    } else if existing.IsNone() {
        return Err[*Order](NewDomainError("ORDER.CUSTOMER_NOT_FOUND", "Customer does not exist"))
    }

    // Create and save order
    order := NewOrder(cmd.CustomerID, cmd.Items)
    if err := s.repo.Save(ctx, order); err != nil {
        return Err[*Order](fmt.Errorf("failed to save order: %w", err))
    }

    return Ok(order)
}
```

**Error Handling Best Practices**:
- Always check errors explicitly at the call site
- Use error wrapping with `fmt.Errorf("%w", err)` for context
- Create domain-specific error types for business logic failures
- Use Result[T] pattern for operations that can fail predictably
- Reserve panic/recover for truly exceptional circumstances

## 5. Go Testing Patterns and Benchmarking Approaches for DDD Components

**Decision**: Implement table-driven tests with Given-When-Then structure, comprehensive benchmarking for performance-critical paths, and property-based testing for monadic laws.

**Rationale**:
- Table-driven tests reduce boilerplate and improve test maintainability
- Given-When-Then structure aligns with BDD practices and domain understanding
- Benchmarking ensures performance requirements are met
- Property-based testing validates mathematical properties of functional types

**Alternatives Considered**:
- Individual test functions per case (rejected: excessive boilerplate)
- External testing frameworks like Ginkgo (rejected: adds complexity)
- Manual property verification (rejected: incomplete coverage)

**TDD Test Structure**:
```go
func TestOrder_AddItem_Should_IncreaseTotal_When_ValidItem(t *testing.T) {
    tests := []struct {
        name     string
        given    *Order
        when     OrderItem
        then     Money
        expectErr bool
    }{
        {
            name:  "adding valid item increases total",
            given: NewOrder(CustomerID("123"), []OrderItem{}),
            when:  NewOrderItem("Product1", Money{Amount: 1000, Currency: "USD"}),
            then:  Money{Amount: 1000, Currency: "USD"},
            expectErr: false,
        },
        {
            name:  "adding item with different currency fails",
            given: func() *Order {
                order := NewOrder(CustomerID("123"), []OrderItem{})
                order.AddItem(NewOrderItem("Product1", Money{Amount: 500, Currency: "USD"}))
                return order
            }(),
            when:  NewOrderItem("Product2", Money{Amount: 1000, Currency: "EUR"}),
            expectErr: true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // When
            err := tt.given.AddItem(tt.when)

            // Then
            if tt.expectErr {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
                assert.Equal(t, tt.then, tt.given.GetTotal())
            }
        })
    }
}
```

**Benchmark Implementation**:
```go
func BenchmarkValueObject_Equals(b *testing.B) {
    // Setup test data
    money1 := Money{Amount: 1000, Currency: "USD"}
    money2 := Money{Amount: 1000, Currency: "USD"}
    money3 := Money{Amount: 2000, Currency: "EUR"}

    b.Run("SameValues", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            _ = money1.Equals(money2)
        }
    })

    b.Run("DifferentValues", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            _ = money1.Equals(money3)
        }
    })
}

func BenchmarkResult_Map_Chain(b *testing.B) {
    result := Ok(42)

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        final := Map(Map(Map(result, func(x int) int { return x * 2 }),
                      func(x int) int { return x + 10 }),
                      func(x int) string { return fmt.Sprintf("value: %d", x) })
        _ = final
    }
}
```

**Property-Based Testing for Monadic Laws**:
```go
func TestResult_MonadicLaws(t *testing.T) {
    t.Run("LeftIdentity", func(t *testing.T) {
        // For any value a and function f: Ok(a).Bind(f) == f(a)
        value := 42
        f := func(x int) Result[string] { return Ok(fmt.Sprintf("value: %d", x)) }

        left := Bind(Ok(value), f)
        right := f(value)

        assert.Equal(t, right.IsOk(), left.IsOk())
        if left.IsOk() && right.IsOk() {
            leftVal, _ := left.Unwrap()
            rightVal, _ := right.Unwrap()
            assert.Equal(t, rightVal, leftVal)
        }
    })

    t.Run("RightIdentity", func(t *testing.T) {
        // For any Result r: r.Bind(Ok) == r
        result := Ok(42)
        identity := func(x int) Result[int] { return Ok(x) }

        bound := Bind(result, identity)

        assert.Equal(t, result.IsOk(), bound.IsOk())
        if result.IsOk() && bound.IsOk() {
            resultVal, _ := result.Unwrap()
            boundVal, _ := bound.Unwrap()
            assert.Equal(t, resultVal, boundVal)
        }
    })

    t.Run("Associativity", func(t *testing.T) {
        // For Result r and functions f, g: r.Bind(f).Bind(g) == r.Bind(x => f(x).Bind(g))
        result := Ok(42)
        f := func(x int) Result[int] { return Ok(x * 2) }
        g := func(x int) Result[string] { return Ok(fmt.Sprintf("value: %d", x)) }

        left := Bind(Bind(result, f), g)
        right := Bind(result, func(x int) Result[string] { return Bind(f(x), g) })

        assert.Equal(t, left.IsOk(), right.IsOk())
        if left.IsOk() && right.IsOk() {
            leftVal, _ := left.Unwrap()
            rightVal, _ := right.Unwrap()
            assert.Equal(t, rightVal, leftVal)
        }
    })
}
```

**Testing Best Practices**:
- Use `testing.T` and `testing.B` from standard library
- Implement table-driven tests for comprehensive scenario coverage
- Follow Given-When-Then naming: `TestUnit_Method_Should_ExpectedBehavior_When_StateUnderTest`
- Use subtests with `t.Run()` for logical grouping
- Benchmark performance-critical paths with realistic data
- Verify monadic laws for all functional types
- Mock interfaces using simple implementations, not external frameworks

## 6. Go Version Compatibility Strategy for Go 1.21+ vs 1.25 Features

**Decision**: Target Go 1.21 as minimum version with Go 1.25 optimizations, use toolchain management for team consistency, and leverage forward compatibility features.

**Rationale**:
- Go 1.21 LTS provides stability and broad adoption
- Go 1.25 offers latest performance improvements and language features
- Toolchain management ensures consistent builds across environments
- Forward compatibility allows gradual migration to newer features

**Alternatives Considered**:
- Go 1.18 minimum (rejected: missing toolchain management features)
- Go 1.25 minimum only (rejected: limits adoption for teams on older versions)
- No version strategy (rejected: unpredictable behavior across environments)

**Version Strategy Implementation**:
```go
// go.mod configuration
module github.com/example/architecture-core

go 1.21

toolchain go1.25.0

require (
    // No external dependencies for core package
)
```

**Feature Compatibility Matrix**:

| Feature | Go 1.21 | Go 1.22 | Go 1.23 | Go 1.24 | Go 1.25 | Implementation Strategy |
|---------|---------|---------|---------|---------|---------|------------------------|
| Generics | ✅ Full | ✅ Enhanced | ✅ Enhanced | ✅ Enhanced | ✅ Enhanced | Use from 1.21+ |
| Type Inference | ✅ Basic | ✅ Improved | ✅ Advanced | ✅ Advanced | ✅ Advanced | Progressive enhancement |
| Generic Type Aliases | ❌ | ❌ | 🔄 Preview | ✅ Full | ✅ Full | Use from 1.24+ |
| Toolchain Management | ✅ New | ✅ Stable | ✅ Stable | ✅ Enhanced | ✅ Enhanced | Use from 1.21+ |
| Performance Improvements | ✅ | ✅ | ✅ | ✅ | ✅ Latest | Leverage newest available |

**Build Constraints for Feature Detection**:
```go
//go:build go1.24

package core

// Use generic type aliases when available
type EntityID[T comparable] = ID[T]
type AggregateID[T comparable] = ID[T]
```

```go
//go:build !go1.24

package core

// Fallback to type definitions for older versions
type EntityID[T comparable] ID[T]
type AggregateID[T comparable] ID[T]
```

**CI/CD Strategy**:
```yaml
# .github/workflows/test.yml
strategy:
  matrix:
    go-version: ['1.21', '1.22', '1.23', '1.24', '1.25']
    os: [ubuntu-latest, windows-latest, macos-latest]
```

**Team Development Setup**:
- Require Go 1.21+ for all developers
- Use `toolchain go1.25.0` directive for latest performance
- Document version-specific features in code comments
- Test against multiple Go versions in CI
- Provide clear upgrade path documentation

**Migration Strategy**:
1. **Phase 1**: Implement core functionality using Go 1.21 features
2. **Phase 2**: Add performance optimizations available in Go 1.22+
3. **Phase 3**: Leverage advanced type inference from Go 1.23+
4. **Phase 4**: Adopt generic type aliases when Go 1.24 becomes baseline

## Summary

All research findings support a Go implementation with:
- **Zero external runtime dependencies** (Go standard library only)
- **Go 1.21+ compatibility** with Go 1.25 optimizations
- **Type-safe generics** for DDD abstractions and functional types
- **Zero-allocation patterns** for performance-critical operations
- **Explicit error handling** following Go idioms and DDD principles
- **Comprehensive testing strategy** with TDD, benchmarking, and property-based testing
- **Clean architecture** with dependency inversion through interface design

The implementation will follow Go community best practices while providing equivalent functionality to the TypeScript and .NET implementations, ensuring consistency across the Universal DDD Architecture project.