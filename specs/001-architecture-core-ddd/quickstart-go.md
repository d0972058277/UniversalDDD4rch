# Go Quickstart: Architecture.Core DDD Abstractions

**Date**: 2025-09-21
**Context**: Architecture.Core implementation for Go
**Prerequisites**: Go 1.21+ installed

## Quick Start Guide

This guide demonstrates how to use Architecture.Core Go implementation for building domain-driven applications with functional error handling.

## 1. Project Setup

### Initialize Go Module

```bash
# Create new Go module
mkdir my-ddd-app && cd my-ddd-app
go mod init github.com/yourorg/my-ddd-app

# Add Architecture.Core dependency (when published)
go get github.com/universalddd/architecture-core-go
```

### Basic Project Structure

```
my-ddd-app/
├── go.mod
├── go.sum
├── main.go
├── domain/
│   ├── entities/
│   ├── valueobjects/
│   ├── services/
│   └── events/
├── application/
│   ├── commands/
│   ├── queries/
│   └── handlers/
├── infrastructure/
│   └── repositories/
└── tests/
    ├── unit/
    └── integration/
```

## 2. Define Domain Model

### Step 1: Create Entity ID Type

```go
// domain/entities/order_id.go
package entities

import "fmt"

type OrderID string

func NewOrderID(value string) OrderID {
    return OrderID(value)
}

func (id OrderID) String() string {
    return string(id)
}

// Satisfies EntityID constraint
var _ fmt.Stringer = OrderID("")
```

### Step 2: Create Value Objects

```go
// domain/valueobjects/money.go
package valueobjects

import (
    "github.com/universalddd/architecture-core-go/pkg/domain"
    "github.com/universalddd/architecture-core-go/pkg/functional"
)

type Money struct {
    *domain.ValueObjectBase
    amount   float64
    currency string
}

func NewMoney(amount float64, currency string) functional.Result[Money] {
    // Given: Input validation
    if amount < 0 {
        return functional.FailWithMessage[Money]("Amount cannot be negative")
    }
    if currency == "" {
        return functional.FailWithMessage[Money]("Currency cannot be empty")
    }

    // When: Create money value object
    money := Money{
        ValueObjectBase: &domain.ValueObjectBase{},
        amount:         amount,
        currency:       currency,
    }

    // Then: Return successful result
    return functional.Ok(money)
}

func (m Money) GetEqualityComponents() []interface{} {
    return []interface{}{m.amount, m.currency}
}

func (m Money) Amount() float64 {
    return m.amount
}

func (m Money) Currency() string {
    return m.currency
}

func (m Money) Add(other Money) functional.Result[Money] {
    // Given: Currency validation
    if m.currency != other.currency {
        return functional.FailWithMessage[Money]("Cannot add money with different currencies")
    }

    // When: Add amounts
    newAmount := m.amount + other.amount

    // Then: Create new money instance
    return NewMoney(newAmount, m.currency)
}
```

### Step 3: Create Domain Events

```go
// domain/events/order_events.go
package events

import (
    "github.com/universalddd/architecture-core-go/pkg/domain"
    "github.com/yourorg/my-ddd-app/domain/entities"
    "github.com/yourorg/my-ddd-app/domain/valueobjects"
)

type OrderCreatedEvent struct {
    *domain.DomainEventBase
    orderID    entities.OrderID
    customerID string
    total      valueobjects.Money
}

func NewOrderCreatedEvent(orderID entities.OrderID, customerID string, total valueobjects.Money) *OrderCreatedEvent {
    return &OrderCreatedEvent{
        DomainEventBase: domain.NewDomainEventBase("OrderCreated"),
        orderID:        orderID,
        customerID:     customerID,
        total:          total,
    }
}

func (e *OrderCreatedEvent) OrderID() entities.OrderID {
    return e.orderID
}

func (e *OrderCreatedEvent) CustomerID() string {
    return e.customerID
}

func (e *OrderCreatedEvent) Total() valueobjects.Money {
    return e.total
}
```

### Step 4: Create Aggregate Root

```go
// domain/entities/order.go
package entities

import (
    "github.com/universalddd/architecture-core-go/pkg/domain"
    "github.com/universalddd/architecture-core-go/pkg/functional"
    "github.com/yourorg/my-ddd-app/domain/events"
    "github.com/yourorg/my-ddd-app/domain/valueobjects"
)

type OrderStatus int

const (
    Pending OrderStatus = iota
    Confirmed
    Shipped
    Delivered
    Cancelled
)

type Order struct {
    *domain.AggregateRootBase[OrderID]
    customerID string
    total      valueobjects.Money
    status     OrderStatus
}

func NewOrder(id OrderID, customerID string, total valueobjects.Money) *Order {
    // Given: Create aggregate root base
    order := &Order{
        AggregateRootBase: domain.NewAggregateRootBase(id),
        customerID:       customerID,
        total:           total,
        status:          Pending,
    }

    // When: Add domain event
    event := events.NewOrderCreatedEvent(id, customerID, total)
    order.AddDomainEvent(event)

    // Then: Return new order
    return order
}

func (o *Order) CustomerID() string {
    return o.customerID
}

func (o *Order) Total() valueobjects.Money {
    return o.total
}

func (o *Order) Status() OrderStatus {
    return o.status
}

func (o *Order) Confirm() functional.Result[bool] {
    // Given: Status validation
    if o.status != Pending {
        return functional.FailWithMessage[bool]("Order is not in pending status")
    }

    // When: Change status and increment version
    o.status = Confirmed
    o.IncrementVersion()

    // Add domain event
    event := events.NewOrderConfirmedEvent(o.ID())
    o.AddDomainEvent(event)

    // Then: Return success
    return functional.Ok(true)
}

func (o *Order) Ship() functional.Result[bool] {
    // Given: Status validation
    if o.status != Confirmed {
        return functional.FailWithMessage[bool]("Order must be confirmed before shipping")
    }

    // When: Change status
    o.status = Shipped
    o.IncrementVersion()

    // Add domain event
    event := events.NewOrderShippedEvent(o.ID())
    o.AddDomainEvent(event)

    // Then: Return success
    return functional.Ok(true)
}
```

## 3. Create Repository Interface

```go
// domain/repositories/order_repository.go
package repositories

import (
    "context"
    "github.com/universalddd/architecture-core-go/pkg/domain"
    "github.com/universalddd/architecture-core-go/pkg/functional"
    "github.com/yourorg/my-ddd-app/domain/entities"
)

type OrderRepository interface {
    domain.Repository[*entities.Order, entities.OrderID]

    // Domain-specific methods
    GetByCustomerID(ctx context.Context, customerID string) ([]entities.Order, error)
    GetPendingOrders(ctx context.Context) ([]entities.Order, error)
}
```

## 4. Implement Infrastructure

### In-Memory Repository Implementation

```go
// infrastructure/repositories/in_memory_order_repository.go
package repositories

import (
    "context"
    "sync"

    "github.com/universalddd/architecture-core-go/pkg/domain"
    "github.com/universalddd/architecture-core-go/pkg/functional"
    "github.com/yourorg/my-ddd-app/domain/entities"
    domainRepos "github.com/yourorg/my-ddd-app/domain/repositories"
)

type InMemoryOrderRepository struct {
    *domain.RepositoryBase[*entities.Order, entities.OrderID]
    orders map[entities.OrderID]*entities.Order
    mutex  sync.RWMutex
}

func NewInMemoryOrderRepository() domainRepos.OrderRepository {
    return &InMemoryOrderRepository{
        RepositoryBase: domain.NewRepositoryBase[*entities.Order, entities.OrderID](),
        orders:        make(map[entities.OrderID]*entities.Order),
    }
}

func (r *InMemoryOrderRepository) GetByCustomerID(ctx context.Context, customerID string) ([]entities.Order, error) {
    r.mutex.RLock()
    defer r.mutex.RUnlock()

    var customerOrders []entities.Order
    for _, order := range r.orders {
        if order.CustomerID() == customerID && !order.IsDeleted() {
            customerOrders = append(customerOrders, *order)
        }
    }

    return customerOrders, nil
}

func (r *InMemoryOrderRepository) GetPendingOrders(ctx context.Context) ([]entities.Order, error) {
    r.mutex.RLock()
    defer r.mutex.RUnlock()

    var pendingOrders []entities.Order
    for _, order := range r.orders {
        if order.Status() == entities.Pending && !order.IsDeleted() {
            pendingOrders = append(pendingOrders, *order)
        }
    }

    return pendingOrders, nil
}
```

## 5. Application Service

```go
// application/services/order_service.go
package services

import (
    "context"

    "github.com/universalddd/architecture-core-go/pkg/functional"
    "github.com/yourorg/my-ddd-app/domain/entities"
    "github.com/yourorg/my-ddd-app/domain/repositories"
    "github.com/yourorg/my-ddd-app/domain/valueobjects"
)

type OrderService struct {
    orderRepo repositories.OrderRepository
}

func NewOrderService(orderRepo repositories.OrderRepository) *OrderService {
    return &OrderService{
        orderRepo: orderRepo,
    }
}

type CreateOrderCommand struct {
    OrderID    string
    CustomerID string
    Amount     float64
    Currency   string
}

func (s *OrderService) CreateOrder(ctx context.Context, cmd CreateOrderCommand) functional.Result[*entities.Order] {
    // Given: Validate and create value objects
    orderID := entities.NewOrderID(cmd.OrderID)

    moneyResult := valueobjects.NewMoney(cmd.Amount, cmd.Currency)
    if moneyResult.IsError() {
        return functional.Fail[*entities.Order](moneyResult.Error())
    }

    money := moneyResult.Value()

    // When: Create and save order
    order := entities.NewOrder(orderID, cmd.CustomerID, money)

    if err := s.orderRepo.Save(ctx, order); err != nil {
        return functional.FailWithMessage[*entities.Order]("Failed to save order")
    }

    // Then: Return created order
    return functional.Ok(order)
}

func (s *OrderService) ConfirmOrder(ctx context.Context, orderID string) functional.Result[bool] {
    // Given: Get order
    id := entities.NewOrderID(orderID)
    maybeOrder, err := s.orderRepo.GetByID(ctx, id)
    if err != nil {
        return functional.FailWithMessage[bool]("Failed to retrieve order")
    }

    if maybeOrder.IsNone() {
        return functional.FailWithMessage[bool]("Order not found")
    }

    order := maybeOrder.Value()

    // When: Confirm order
    confirmResult := order.Confirm()
    if confirmResult.IsError() {
        return confirmResult
    }

    // Save updated order
    if err := s.orderRepo.Save(ctx, order); err != nil {
        return functional.FailWithMessage[bool]("Failed to save confirmed order")
    }

    // Then: Return success
    return functional.Ok(true)
}
```

## 6. Main Application

```go
// main.go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/yourorg/my-ddd-app/application/services"
    "github.com/yourorg/my-ddd-app/infrastructure/repositories"
)

func main() {
    // Given: Setup dependencies
    orderRepo := repositories.NewInMemoryOrderRepository()
    orderService := services.NewOrderService(orderRepo)

    ctx := context.Background()

    // When: Create an order
    createCmd := services.CreateOrderCommand{
        OrderID:    "order-123",
        CustomerID: "customer-456",
        Amount:     99.99,
        Currency:   "USD",
    }

    createResult := orderService.CreateOrder(ctx, createCmd)
    if createResult.IsError() {
        log.Fatalf("Failed to create order: %v", createResult.Error())
    }

    order := createResult.Value()
    fmt.Printf("Created order: %s for customer: %s with total: %.2f %s\n",
        order.ID(), order.CustomerID(), order.Total().Amount(), order.Total().Currency())

    // When: Confirm the order
    confirmResult := orderService.ConfirmOrder(ctx, "order-123")
    if confirmResult.IsError() {
        log.Fatalf("Failed to confirm order: %v", confirmResult.Error())
    }

    // Then: Display success
    fmt.Println("Order confirmed successfully!")

    // Display domain events
    events := order.DomainEvents()
    fmt.Printf("Domain events raised: %d\n", len(events))
    for _, event := range events {
        fmt.Printf("- %s at %s\n", event.EventType(), event.OccurredAt().Format("2006-01-02 15:04:05"))
    }
}
```

## 7. Testing Examples

### Unit Test for Value Object

```go
// tests/unit/money_test.go
package unit

import (
    "testing"

    "github.com/yourorg/my-ddd-app/domain/valueobjects"
)

func TestMoney_Should_CreateValidMoney_When_ValidInputProvided(t *testing.T) {
    tests := []struct {
        name     string
        amount   float64
        currency string
        wantErr  bool
    }{
        {"valid positive amount", 100.50, "USD", false},
        {"valid zero amount", 0.0, "EUR", false},
        {"invalid negative amount", -10.0, "USD", true},
        {"invalid empty currency", 100.0, "", true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Given
            // Test parameters provided

            // When
            result := valueobjects.NewMoney(tt.amount, tt.currency)

            // Then
            if tt.wantErr {
                if result.IsOk() {
                    t.Errorf("Expected error but got success")
                }
            } else {
                if result.IsError() {
                    t.Errorf("Expected success but got error: %v", result.Error())
                }

                money := result.Value()
                if money.Amount() != tt.amount {
                    t.Errorf("Expected amount %f, got %f", tt.amount, money.Amount())
                }
                if money.Currency() != tt.currency {
                    t.Errorf("Expected currency %s, got %s", tt.currency, money.Currency())
                }
            }
        })
    }
}

func TestMoney_Should_AddCorrectly_When_SameCurrency(t *testing.T) {
    // Given
    money1Result := valueobjects.NewMoney(50.25, "USD")
    money2Result := valueobjects.NewMoney(25.75, "USD")

    if money1Result.IsError() || money2Result.IsError() {
        t.Fatal("Failed to create test money objects")
    }

    money1 := money1Result.Value()
    money2 := money2Result.Value()

    // When
    sumResult := money1.Add(money2)

    // Then
    if sumResult.IsError() {
        t.Errorf("Expected success but got error: %v", sumResult.Error())
    }

    sum := sumResult.Value()
    expected := 76.0
    if sum.Amount() != expected {
        t.Errorf("Expected sum %f, got %f", expected, sum.Amount())
    }
}
```

### Integration Test for Order Service

```go
// tests/integration/order_service_test.go
package integration

import (
    "context"
    "testing"

    "github.com/yourorg/my-ddd-app/application/services"
    "github.com/yourorg/my-ddd-app/infrastructure/repositories"
)

func TestOrderService_Should_CreateAndConfirmOrder_When_ValidDataProvided(t *testing.T) {
    // Given
    orderRepo := repositories.NewInMemoryOrderRepository()
    orderService := services.NewOrderService(orderRepo)
    ctx := context.Background()

    createCmd := services.CreateOrderCommand{
        OrderID:    "test-order-123",
        CustomerID: "test-customer-456",
        Amount:     199.99,
        Currency:   "USD",
    }

    // When: Create order
    createResult := orderService.CreateOrder(ctx, createCmd)

    // Then: Order should be created successfully
    if createResult.IsError() {
        t.Fatalf("Failed to create order: %v", createResult.Error())
    }

    order := createResult.Value()
    if order.CustomerID() != createCmd.CustomerID {
        t.Errorf("Expected customer ID %s, got %s", createCmd.CustomerID, order.CustomerID())
    }

    // When: Confirm order
    confirmResult := orderService.ConfirmOrder(ctx, createCmd.OrderID)

    // Then: Order should be confirmed successfully
    if confirmResult.IsError() {
        t.Fatalf("Failed to confirm order: %v", confirmResult.Error())
    }

    if !confirmResult.Value() {
        t.Error("Expected confirmation to return true")
    }

    // Verify domain events were raised
    events := order.DomainEvents()
    if len(events) != 2 { // OrderCreated + OrderConfirmed
        t.Errorf("Expected 2 domain events, got %d", len(events))
    }
}
```

## 8. Running the Application

```bash
# Run the application
go run main.go

# Run tests
go test ./tests/unit/...
go test ./tests/integration/...

# Run with race detection
go test -race ./...

# Run benchmarks
go test -bench=. ./tests/performance/...

# Generate test coverage
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

## Key Features Demonstrated

1. **Type-Safe Domain Modeling**: Using Go generics for entities and aggregates
2. **Functional Error Handling**: Result and Maybe types for predictable error handling
3. **Value Object Equality**: Structural equality through component comparison
4. **Domain Events**: Event-driven architecture with correlation tracking
5. **Repository Pattern**: Clean dependency inversion with interface-based design
6. **TDD Structure**: Given-When-Then test organization
7. **Zero External Dependencies**: Pure Go standard library implementation

## Next Steps

1. **Add Persistence**: Implement SQL/NoSQL repository adapters
2. **Add HTTP API**: Integrate with Gin or Chi for REST endpoints
3. **Add Validation**: Implement comprehensive input validation
4. **Add Logging**: Integrate structured logging and observability
5. **Add Events**: Implement event publishing and handlers
6. **Add Performance**: Add benchmarking and optimization

This quickstart provides a complete example of building domain-driven applications with Architecture.Core Go implementation, demonstrating all core concepts through practical, testable code.