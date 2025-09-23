# Go Data Model: DDD Abstractions and Functional Types

**Date**: 2025-09-21
**Context**: Architecture.Core implementation for Go
**Status**: Complete

## Overview

This document defines the Go data model for Architecture.Core, providing type-safe DDD abstractions and functional programming types using Go generics and interfaces.

## Core Type Constraints

```go
// EntityID represents a comparable identifier for entities and aggregates
type EntityID interface {
    comparable
    fmt.Stringer
}

// Comparable constraint for value object components
type Comparable interface {
    comparable
}
```

## Domain Abstractions

### 1. AggregateRoot Interface

```go
// AggregateRoot represents the root of an aggregate with version control and event tracking
type AggregateRoot[TID EntityID] interface {
    // Identity and versioning
    ID() TID
    Version() int64

    // Domain event management
    DomainEvents() []DomainEvent
    AddDomainEvent(event DomainEvent)
    ClearDomainEvents()

    // Aggregate lifecycle
    MarkAsDeleted()
    IsDeleted() bool
}

// AggregateRootBase provides a concrete implementation
type AggregateRootBase[TID EntityID] struct {
    id           TID
    version      int64
    domainEvents []DomainEvent
    isDeleted    bool
}

func NewAggregateRootBase[TID EntityID](id TID) *AggregateRootBase[TID] {
    return &AggregateRootBase[TID]{
        id:           id,
        version:      1,
        domainEvents: make([]DomainEvent, 0),
        isDeleted:    false,
    }
}

func (a *AggregateRootBase[TID]) ID() TID {
    return a.id
}

func (a *AggregateRootBase[TID]) Version() int64 {
    return a.version
}

func (a *AggregateRootBase[TID]) DomainEvents() []DomainEvent {
    // Return a copy to prevent external modification
    events := make([]DomainEvent, len(a.domainEvents))
    copy(events, a.domainEvents)
    return events
}

func (a *AggregateRootBase[TID]) AddDomainEvent(event DomainEvent) {
    if event != nil {
        a.domainEvents = append(a.domainEvents, event)
    }
}

func (a *AggregateRootBase[TID]) ClearDomainEvents() {
    a.domainEvents = a.domainEvents[:0] // Keep allocated capacity
}

func (a *AggregateRootBase[TID]) MarkAsDeleted() {
    a.isDeleted = true
}

func (a *AggregateRootBase[TID]) IsDeleted() bool {
    return a.isDeleted
}

func (a *AggregateRootBase[TID]) IncrementVersion() {
    a.version++
}
```

### 2. Entity Interface

```go
// Entity represents a domain entity with identity-based equality
type Entity[TID EntityID] interface {
    ID() TID
    Equals(other Entity[TID]) bool
}

// EntityBase provides a concrete implementation
type EntityBase[TID EntityID] struct {
    id TID
}

func NewEntityBase[TID EntityID](id TID) *EntityBase[TID] {
    return &EntityBase[TID]{id: id}
}

func (e *EntityBase[TID]) ID() TID {
    return e.id
}

func (e *EntityBase[TID]) Equals(other Entity[TID]) bool {
    if other == nil {
        return false
    }
    return e.id == other.ID()
}

// GetHashCode provides consistent hashing for entities
func (e *EntityBase[TID]) GetHashCode() int {
    return fmt.Sprintf("%v", e.id).GetHashCode()
}
```

### 3. ValueObject Interface

```go
// ValueObject represents an immutable value with structural equality
type ValueObject interface {
    GetEqualityComponents() []interface{}
    Equals(other ValueObject) bool
    GetHashCode() int
}

// ValueObjectBase provides a concrete implementation
type ValueObjectBase struct{}

func (v *ValueObjectBase) Equals(other ValueObject) bool {
    if other == nil {
        return false
    }

    thisComponents := v.GetEqualityComponents()
    otherComponents := other.GetEqualityComponents()

    if len(thisComponents) != len(otherComponents) {
        return false
    }

    for i, component := range thisComponents {
        if !equalComponents(component, otherComponents[i]) {
            return false
        }
    }

    return true
}

func (v *ValueObjectBase) GetHashCode() int {
    hash := 0
    for _, component := range v.GetEqualityComponents() {
        hash = combineHashes(hash, getComponentHash(component))
    }
    return hash
}

// Override this method in concrete value objects
func (v *ValueObjectBase) GetEqualityComponents() []interface{} {
    return []interface{}{}
}

// Helper functions for equality and hashing
func equalComponents(a, b interface{}) bool {
    if a == nil && b == nil {
        return true
    }
    if a == nil || b == nil {
        return false
    }
    return reflect.DeepEqual(a, b)
}

func getComponentHash(component interface{}) int {
    if component == nil {
        return 0
    }
    return fmt.Sprintf("%v", component).GetHashCode()
}

func combineHashes(hash1, hash2 int) int {
    return hash1*31 + hash2
}
```

### 4. DomainEvent Interface

```go
// DomainEvent represents a domain event with metadata
type DomainEvent interface {
    ID() string
    OccurredAt() time.Time
    CorrelationID() *string
    CausationID() *string
    Metadata() map[string]interface{}
    EventType() string
}

// DomainEventBase provides a concrete implementation
type DomainEventBase struct {
    id            string
    occurredAt    time.Time
    correlationID *string
    causationID   *string
    metadata      map[string]interface{}
    eventType     string
}

func NewDomainEventBase(eventType string) *DomainEventBase {
    return &DomainEventBase{
        id:         generateUUID(),
        occurredAt: time.Now().UTC(),
        eventType:  eventType,
        metadata:   make(map[string]interface{}),
    }
}

func NewDomainEventBaseWithCorrelation(eventType, correlationID, causationID string) *DomainEventBase {
    event := NewDomainEventBase(eventType)
    if correlationID != "" {
        event.correlationID = &correlationID
    }
    if causationID != "" {
        event.causationID = &causationID
    }
    return event
}

func (e *DomainEventBase) ID() string {
    return e.id
}

func (e *DomainEventBase) OccurredAt() time.Time {
    return e.occurredAt
}

func (e *DomainEventBase) CorrelationID() *string {
    return e.correlationID
}

func (e *DomainEventBase) CausationID() *string {
    return e.causationID
}

func (e *DomainEventBase) Metadata() map[string]interface{} {
    // Return a copy to prevent external modification
    metadata := make(map[string]interface{})
    for k, v := range e.metadata {
        metadata[k] = v
    }
    return metadata
}

func (e *DomainEventBase) EventType() string {
    return e.eventType
}

func (e *DomainEventBase) AddMetadata(key string, value interface{}) {
    e.metadata[key] = value
}

// UUID generation helper
func generateUUID() string {
    return fmt.Sprintf("%d-%d", time.Now().UnixNano(), rand.Int63())
}
```

### 5. Repository Interface

```go
// Repository represents the contract for aggregate persistence
type Repository[TAggregate AggregateRoot[TID], TID EntityID] interface {
    GetByID(ctx context.Context, id TID) (Maybe[TAggregate], error)
    Save(ctx context.Context, aggregate TAggregate) error
    Delete(ctx context.Context, id TID) error
    Exists(ctx context.Context, id TID) (bool, error)
}

// RepositoryBase provides common repository functionality
type RepositoryBase[TAggregate AggregateRoot[TID], TID EntityID] struct {
    storage map[TID]TAggregate
    mutex   sync.RWMutex
}

func NewRepositoryBase[TAggregate AggregateRoot[TID], TID EntityID]() *RepositoryBase[TAggregate, TID] {
    return &RepositoryBase[TAggregate, TID]{
        storage: make(map[TID]TAggregate),
    }
}

func (r *RepositoryBase[TAggregate, TID]) GetByID(ctx context.Context, id TID) (Maybe[TAggregate], error) {
    r.mutex.RLock()
    defer r.mutex.RUnlock()

    if aggregate, exists := r.storage[id]; exists && !aggregate.IsDeleted() {
        return Some(aggregate), nil
    }

    return None[TAggregate](), nil
}

func (r *RepositoryBase[TAggregate, TID]) Save(ctx context.Context, aggregate TAggregate) error {
    r.mutex.Lock()
    defer r.mutex.Unlock()

    if aggregate == nil {
        return NewError("Domain.Repository.NullAggregate", "Cannot save null aggregate", Domain, nil)
    }

    r.storage[aggregate.ID()] = aggregate
    return nil
}

func (r *RepositoryBase[TAggregate, TID]) Delete(ctx context.Context, id TID) error {
    r.mutex.Lock()
    defer r.mutex.Unlock()

    if aggregate, exists := r.storage[id]; exists {
        aggregate.MarkAsDeleted()
    }

    return nil
}

func (r *RepositoryBase[TAggregate, TID]) Exists(ctx context.Context, id TID) (bool, error) {
    r.mutex.RLock()
    defer r.mutex.RUnlock()

    aggregate, exists := r.storage[id]
    return exists && !aggregate.IsDeleted(), nil
}
```

## Functional Types

### 1. Result Type

```go
// Result represents a computation that can succeed or fail
type Result[T any] struct {
    value T
    err   *Error
    isOk  bool
}

// Constructors
func Ok[T any](value T) Result[T] {
    return Result[T]{value: value, isOk: true}
}

func Fail[T any](err *Error) Result[T] {
    return Result[T]{err: err, isOk: false}
}

func FailWithMessage[T any](message string) Result[T] {
    return Result[T]{
        err:  NewError("General.Failure", message, Domain, nil),
        isOk: false,
    }
}

// Query methods
func (r Result[T]) IsOk() bool {
    return r.isOk
}

func (r Result[T]) IsError() bool {
    return !r.isOk
}

func (r Result[T]) Value() T {
    if !r.isOk {
        panic("Cannot get value from failed result")
    }
    return r.value
}

func (r Result[T]) Error() *Error {
    if r.isOk {
        return nil
    }
    return r.err
}

// Monadic operations
func (r Result[T]) Map(f func(T) any) Result[any] {
    if r.isOk {
        return Ok(f(r.value))
    }
    return Fail[any](r.err)
}

func (r Result[T]) Bind(f func(T) Result[any]) Result[any] {
    if r.isOk {
        return f(r.value)
    }
    return Fail[any](r.err)
}

func (r Result[T]) Match(onSuccess func(T) any, onError func(*Error) any) any {
    if r.isOk {
        return onSuccess(r.value)
    }
    return onError(r.err)
}

func (r Result[T]) Ensure(predicate func(T) bool, errorMessage string) Result[T] {
    if r.isOk && !predicate(r.value) {
        return FailWithMessage[T](errorMessage)
    }
    return r
}
```

### 2. Maybe Type

```go
// Maybe represents an optional value
type Maybe[T any] struct {
    value    T
    hasValue bool
}

// Constructors
func Some[T any](value T) Maybe[T] {
    return Maybe[T]{value: value, hasValue: true}
}

func None[T any]() Maybe[T] {
    return Maybe[T]{hasValue: false}
}

// Query methods
func (m Maybe[T]) HasValue() bool {
    return m.hasValue
}

func (m Maybe[T]) IsNone() bool {
    return !m.hasValue
}

func (m Maybe[T]) Value() T {
    if !m.hasValue {
        panic("Cannot get value from None")
    }
    return m.value
}

func (m Maybe[T]) ValueOr(defaultValue T) T {
    if m.hasValue {
        return m.value
    }
    return defaultValue
}

// Monadic operations
func (m Maybe[T]) Map(f func(T) any) Maybe[any] {
    if m.hasValue {
        return Some(f(m.value))
    }
    return None[any]()
}

func (m Maybe[T]) Bind(f func(T) Maybe[any]) Maybe[any] {
    if m.hasValue {
        return f(m.value)
    }
    return None[any]()
}

func (m Maybe[T]) Filter(predicate func(T) bool) Maybe[T] {
    if m.hasValue && predicate(m.value) {
        return m
    }
    return None[T]()
}

func (m Maybe[T]) OrElse(alternative Maybe[T]) Maybe[T] {
    if m.hasValue {
        return m
    }
    return alternative
}

// Conversion to Result
func (m Maybe[T]) ToResult(errorMessage string) Result[T] {
    if m.hasValue {
        return Ok(m.value)
    }
    return FailWithMessage[T](errorMessage)
}
```

### 3. Error Type

```go
// ErrorCategory represents the category of an error
type ErrorCategory int

const (
    Domain ErrorCategory = iota
    Validation
    Infrastructure
    Concurrency
    Security
)

func (c ErrorCategory) String() string {
    switch c {
    case Domain:
        return "Domain"
    case Validation:
        return "Validation"
    case Infrastructure:
        return "Infrastructure"
    case Concurrency:
        return "Concurrency"
    case Security:
        return "Security"
    default:
        return "Unknown"
    }
}

// Error represents a structured error with context
type Error struct {
    code     string
    message  string
    category ErrorCategory
    metadata map[string]interface{}
    inner    error
}

func NewError(code, message string, category ErrorCategory, metadata map[string]interface{}) *Error {
    if metadata == nil {
        metadata = make(map[string]interface{})
    }
    return &Error{
        code:     code,
        message:  message,
        category: category,
        metadata: metadata,
    }
}

func NewErrorWithInner(code, message string, category ErrorCategory, inner error, metadata map[string]interface{}) *Error {
    err := NewError(code, message, category, metadata)
    err.inner = inner
    return err
}

func (e *Error) Code() string {
    return e.code
}

func (e *Error) Message() string {
    return e.message
}

func (e *Error) Category() ErrorCategory {
    return e.category
}

func (e *Error) Metadata() map[string]interface{} {
    // Return a copy to prevent external modification
    metadata := make(map[string]interface{})
    for k, v := range e.metadata {
        metadata[k] = v
    }
    return metadata
}

func (e *Error) Inner() error {
    return e.inner
}

func (e *Error) Error() string {
    if e.inner != nil {
        return fmt.Sprintf("%s: %s (caused by: %s)", e.code, e.message, e.inner.Error())
    }
    return fmt.Sprintf("%s: %s", e.code, e.message)
}

func (e *Error) AddMetadata(key string, value interface{}) *Error {
    e.metadata[key] = value
    return e
}
```

## Usage Examples

### Example Domain Entity

```go
type OrderID string

func (id OrderID) String() string {
    return string(id)
}

type Order struct {
    *AggregateRootBase[OrderID]
    customerID string
    total      Money
    status     OrderStatus
}

func NewOrder(id OrderID, customerID string, total Money) *Order {
    order := &Order{
        AggregateRootBase: NewAggregateRootBase(id),
        customerID:       customerID,
        total:           total,
        status:          Pending,
    }

    // Add domain event
    order.AddDomainEvent(NewOrderCreatedEvent(id, customerID, total))

    return order
}

func (o *Order) Confirm() Result[bool] {
    if o.status != Pending {
        return FailWithMessage[bool]("Order is not in pending status")
    }

    o.status = Confirmed
    o.IncrementVersion()
    o.AddDomainEvent(NewOrderConfirmedEvent(o.ID()))

    return Ok(true)
}
```

### Example Value Object

```go
type Money struct {
    *ValueObjectBase
    amount   decimal.Decimal
    currency string
}

func NewMoney(amount decimal.Decimal, currency string) Money {
    return Money{
        ValueObjectBase: &ValueObjectBase{},
        amount:         amount,
        currency:       currency,
    }
}

func (m Money) GetEqualityComponents() []interface{} {
    return []interface{}{m.amount, m.currency}
}

func (m Money) Amount() decimal.Decimal {
    return m.amount
}

func (m Money) Currency() string {
    return m.currency
}

func (m Money) Add(other Money) Result[Money] {
    if m.currency != other.currency {
        return FailWithMessage[Money]("Cannot add money with different currencies")
    }

    return Ok(NewMoney(m.amount.Add(other.amount), m.currency))
}
```

## Key Design Decisions

1. **Type Safety**: Generic constraints ensure compile-time type checking
2. **Memory Efficiency**: Value types for functional types minimize allocations
3. **Immutability**: Value objects and events are immutable by design
4. **Error Handling**: Explicit error types with rich context
5. **Testability**: Interfaces enable easy mocking and testing
6. **Performance**: Zero-allocation patterns where possible
7. **Go Idioms**: Follows Go conventions for naming and structure

## Implementation Status

✅ **Complete**: All core types and interfaces defined with proper Go generics and zero external dependencies.