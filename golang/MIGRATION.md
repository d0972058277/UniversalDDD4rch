# Migration Guide: Go Universal DDD Architecture v1.x to v2.0

## Overview

This guide helps you migrate your Go Universal DDD Architecture implementation from v1.x to v2.0. The new version provides enhanced multi-language consistency, improved API alignment, and better integration patterns while maintaining Go idioms and zero-allocation performance.

## Breaking Changes Summary

### 1. Repository Interface Changes

**v1.x:**
```go
type Repository[TAggregate AggregateRoot[TId], TId EntityId] interface {
    Save(ctx context.Context, aggregate TAggregate) error
    // ... other methods
}
```

**v2.0:**
```go
type Repository[TAggregate AggregateRoot[TId], TId EntityId] interface {
    Add(ctx context.Context, aggregate TAggregate) error
    Update(ctx context.Context, aggregate TAggregate) error
    // ... other methods
}
```

**Migration Action:**
- Replace `Save()` calls with appropriate `Add()` or `Update()` calls
- For new aggregates: Use `Add()`
- For existing aggregates: Use `Update()`

### 2. AggregateRoot Interface Standardization

**v1.x:**
```go
type AggregateRoot[TId EntityId] interface {
    UpdateVersion() // Old method name
}
```

**v2.0:**
```go
type AggregateRoot[TId EntityId] interface {
    IncrementVersion() // Standardized across languages
}
```

**Migration Action:**
- Replace `UpdateVersion()` calls with `IncrementVersion()`
- Update implementations to use the new method name

### 3. Result Creation Function Names

**v1.x:**
```go
// Mixed naming patterns
result := Success(value)  // Sometimes used
result := Ok(value)       // Sometimes used
```

**v2.0:**
```go
// Standardized naming
result := Ok[T](value)    // Always use this
result := Fail[T](error)  // Always use this
```

**Migration Action:**
- Replace `Success()` with `Ok[T]()`
- Ensure consistent use of `Fail[T]()` for failures

### 4. Package Structure Changes

**v1.x:**
```
architecture-core (monolithic)
├── All functionality combined
└── Optional dependencies included
```

**v2.0:**
```
architecture-core (pure core)
├── Core DDD abstractions only
├── Zero external dependencies
└── Optional integrations:
    ├── integrations/gorm/
    ├── integrations/gin/
    └── integrations/chi/
```

**Migration Action:**
- Update import paths to use v2 module
- Import optional integrations separately
- Update build tags if using optional features

## Step-by-Step Migration

### Step 1: Update Module Dependencies

**go.mod Before:**
```go
module your-app

require (
    github.com/architecture/core v1.x.x
)
```

**go.mod After:**
```go
module your-app

require (
    github.com/architecture/core/v2 v2.0.0
    // Optional integrations
    github.com/architecture/core/integrations/gorm/v2 v2.0.0
)
```

### Step 2: Update Repository Implementations

**Before:**
```go
type CustomerService struct {
    repository CustomerRepository
}

func (s *CustomerService) CreateCustomer(ctx context.Context, customer *Customer) error {
    return s.repository.Save(ctx, customer)
}

func (s *CustomerService) UpdateCustomer(ctx context.Context, customer *Customer) error {
    return s.repository.Save(ctx, customer) // Same method for both
}
```

**After:**
```go
type CustomerService struct {
    repository CustomerRepository
}

func (s *CustomerService) CreateCustomer(ctx context.Context, customer *Customer) error {
    return s.repository.Add(ctx, customer)
}

func (s *CustomerService) UpdateCustomer(ctx context.Context, customer *Customer) error {
    return s.repository.Update(ctx, customer)
}
```

### Step 3: Update AggregateRoot Usage

**Before:**
```go
func (o *Order) ConfirmOrder() Result[struct{}] {
    o.status = OrderStatusConfirmed
    o.AddDomainEvent(NewOrderConfirmed(o.id, time.Now()))
    o.UpdateVersion() // Old method
    return Ok(struct{}{})
}
```

**After:**
```go
func (o *Order) ConfirmOrder() Result[struct{}] {
    o.status = OrderStatusConfirmed
    o.AddDomainEvent(NewOrderConfirmed(o.id, time.Now()))
    o.IncrementVersion() // New standardized method
    return Ok(struct{}{})
}
```

### Step 4: Update Result Usage

**Before:**
```go
// Inconsistent creation functions
func CreateCustomer(email string, name string) Result[*Customer] {
    if err := validateEmail(email); err != nil {
        return Failure[*Customer](err) // Old function name
    }

    customer := &Customer{...}
    return Success(customer) // Old function name
}
```

**After:**
```go
// Consistent creation functions
func CreateCustomer(email string, name string) Result[*Customer] {
    if err := validateEmail(email); err != nil {
        return Fail[*Customer](err) // New function name
    }

    customer := &Customer{...}
    return Ok(customer) // New function name
}
```

### Step 5: Update GORM Integration

**Before:**
```go
// Direct GORM usage in domain
type CustomerRepository struct {
    db *gorm.DB
    // Implementation mixed with GORM concerns
}

func (r *CustomerRepository) Save(ctx context.Context, customer *Customer) error {
    // Direct GORM operations
}
```

**After:**
```go
// Use dedicated GORM integration package
import "github.com/architecture/core/integrations/gorm/v2"

type CustomerRepository struct {
    *gorm.GormRepository[*Customer, CustomerId]
}

func NewCustomerRepository(db *gorm.DB) *CustomerRepository {
    return &CustomerRepository{
        GormRepository: gorm.NewGormRepository[*Customer, CustomerId](
            db,
            func() interface{} { return &CustomerModel{} },
            customerToModel,
            modelToCustomer,
        ),
    }
}

// Additional custom methods if needed
func (r *CustomerRepository) GetByEmail(ctx context.Context, email EmailAddress) (Maybe[*Customer], error) {
    // Implementation using GORM integration helpers
}
```

## Testing Updates

### Update Contract Tests

**Before:**
```go
func TestRepository_Save_ShouldPersistAggregate(t *testing.T) {
    err := repository.Save(ctx, customer)
    assert.NoError(t, err)
}
```

**After:**
```go
func TestRepository_Add_ShouldPersistNewAggregate(t *testing.T) {
    err := repository.Add(ctx, customer)
    assert.NoError(t, err)
}

func TestRepository_Update_ShouldModifyExistingAggregate(t *testing.T) {
    err := repository.Update(ctx, customer)
    assert.NoError(t, err)
}
```

### Add Cross-Language Contract Tests

```go
func TestAggregateRoot_Should_IncrementVersion_When_IncrementVersionCalled(t *testing.T) {
    // GIVEN
    customer := CreateCustomer(email, name).Value()
    initialVersion := customer.Version()

    // WHEN
    customer.IncrementVersion()

    // THEN
    assert.Equal(t, initialVersion+1, customer.Version())
}
```

### Add Performance Benchmarks

```go
func BenchmarkCustomerCreation_V2(b *testing.B) {
    email := EmailAddress{value: "test@example.com"}
    name := CustomerName{first: "John", last: "Doe"}

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        customer := CreateCustomer(email, name)
        _ = customer
    }
}

func BenchmarkRepositoryAdd_V2(b *testing.B) {
    customer := CreateCustomer(email, name).Value()

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        err := repository.Add(context.Background(), customer)
        _ = err
    }
}
```

## Performance Considerations

### v2.0 Performance Improvements

- **Zero allocations** for Result/Maybe operations in hot paths
- **Optimized event collections** with pre-allocated slices
- **Better memory pooling** for frequently used objects
- **Reduced interface overhead** through optimized type constraints

### Memory Usage Optimization

```go
// v2.0 introduces memory-efficient patterns
type Customer struct {
    id           CustomerId
    email        EmailAddress
    name         CustomerName
    domainEvents []DomainEvent // Pre-allocated capacity
    version      int64
}

// Efficient event management
func (c *Customer) AddDomainEvent(event DomainEvent) {
    if cap(c.domainEvents) == 0 {
        c.domainEvents = make([]DomainEvent, 0, 4) // Pre-allocate common case
    }
    c.domainEvents = append(c.domainEvents, event)
}
```

### Concurrency Improvements

```go
// v2.0 provides better concurrency patterns
func (s *CustomerService) ProcessCustomers(ctx context.Context, customers []*Customer) error {
    g, ctx := errgroup.WithContext(ctx)

    for _, customer := range customers {
        customer := customer // Capture loop variable
        g.Go(func() error {
            return s.repository.Update(ctx, customer)
        })
    }

    return g.Wait()
}
```

## Troubleshooting

### Common Migration Issues

1. **Compilation Errors with Repository.Save()**
   - **Cause:** Method no longer exists
   - **Solution:** Use `Add()` for new aggregates, `Update()` for existing

2. **Missing IncrementVersion() Method**
   - **Cause:** Using old `UpdateVersion()` method
   - **Solution:** Replace with `IncrementVersion()`

3. **Module Import Issues**
   - **Cause:** Still importing v1.x module path
   - **Solution:** Update to `github.com/architecture/core/v2`

4. **GORM Integration Issues**
   - **Cause:** Using old direct GORM integration
   - **Solution:** Import `integrations/gorm/v2` and use provided helpers

5. **Generic Type Issues**
   - **Cause:** Go generics syntax changes between versions
   - **Solution:** Update type constraint syntax to match v2.0

### Verification Steps

After migration, verify your implementation:

1. **Run all unit tests** - Ensure business logic still works
2. **Run contract tests** - Validate cross-language consistency
3. **Run integration tests** - Ensure database/messaging still works
4. **Run benchmarks** - Verify performance improvements
5. **Run race detector** - `go test -race ./...`
6. **Check memory usage** - `go test -benchmem -bench=.`

### Debug Performance Issues

```go
// Use the built-in profiling tools
import _ "net/http/pprof"

func main() {
    go func() {
        log.Println(http.ListenAndServe("localhost:6060", nil))
    }()

    // Your application code
}

// Then access http://localhost:6060/debug/pprof/
```

## Build and Deployment

### Updated Build Configuration

```go
//go:build v2
// +build v2

package main

import (
    "github.com/architecture/core/v2/domain"
    "github.com/architecture/core/v2/functional"
)
```

### Docker Build Updates

```dockerfile
# Dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=builder /app/main .
CMD ["./main"]
```

## Support and Resources

- **Documentation:** [Go Architecture Documentation](../docs)
- **Examples:** [Quickstart Examples](../examples)
- **Issues:** [GitHub Issues](https://github.com/architecture/core/issues)
- **Community:** [Discussion Forum](https://github.com/architecture/core/discussions)
- **Go Best Practices:** [Effective Go Guide](https://golang.org/doc/effective_go.html)

## Conclusion

Universal DDD Architecture v2.0 maintains Go's idioms and performance characteristics while providing better cross-language consistency. The migration requires updating method names and import paths, but the core concepts remain the same.

The zero-allocation performance characteristics are preserved and improved in v2.0, making it suitable for high-performance systems. The separation of core and integration packages provides better modularity and cleaner dependencies.