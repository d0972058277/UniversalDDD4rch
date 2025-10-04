package unit

import (
	"github.com/universalddd/architecture-core/domain"
)

// =============================================================================
// SHARED TEST TYPES FOR UNIT TESTS
// =============================================================================

// Test entity ID types
type TestOrderID string

func (id TestOrderID) String() string { return string(id) }

type TestCustomerID string

func (id TestCustomerID) String() string { return string(id) }

// Test domain events
type TestOrderCreatedEvent struct {
	*domain.BaseDomainEvent
	OrderID    TestOrderID
	CustomerID TestCustomerID
	Amount     float64
}

func NewTestOrderCreatedEvent(orderID TestOrderID, customerID TestCustomerID, amount float64) *TestOrderCreatedEvent {
	return &TestOrderCreatedEvent{
		BaseDomainEvent: domain.NewBaseDomainEvent("OrderCreated"),
		OrderID:         orderID,
		CustomerID:      customerID,
		Amount:          amount,
	}
}

type TestOrderStatusChangedEvent struct {
	*domain.BaseDomainEvent
	OrderID   TestOrderID
	OldStatus string
	NewStatus string
}

func NewTestOrderStatusChangedEvent(orderID TestOrderID, oldStatus, newStatus string) *TestOrderStatusChangedEvent {
	return &TestOrderStatusChangedEvent{
		BaseDomainEvent: domain.NewBaseDomainEvent("OrderStatusChanged"),
		OrderID:         orderID,
		OldStatus:       oldStatus,
		NewStatus:       newStatus,
	}
}

// Test aggregates
type TestOrder struct {
	*domain.BaseAggregateRoot[TestOrderID]
	CustomerID TestCustomerID
	Amount     float64
	Status     string
	Items      []TestOrderItem
}

type TestOrderItem struct {
	ID       string
	Name     string
	Quantity int
	Price    float64
}

func NewTestOrder(id TestOrderID, customerID TestCustomerID, amount float64) *TestOrder {
	order := &TestOrder{
		BaseAggregateRoot: domain.NewBaseAggregateRoot(id),
		CustomerID:        customerID,
		Amount:            amount,
		Status:            "pending",
		Items:             []TestOrderItem{},
	}
	// Add creation event
	event := NewTestOrderCreatedEvent(id, customerID, amount)
	order.AddDomainEvent(event)
	return order
}

func (o *TestOrder) ChangeStatus(newStatus string) {
	if o.Status == newStatus {
		return // No change needed
	}
	oldStatus := o.Status
	o.Status = newStatus
	event := NewTestOrderStatusChangedEvent(o.ID(), oldStatus, newStatus)
	o.AddDomainEvent(event)
	o.IncrementVersion() // Business operations increment version
}

func (o *TestOrder) AddItem(name string, quantity int, price float64) {
	item := TestOrderItem{
		ID:       name,
		Name:     name,
		Quantity: quantity,
		Price:    price,
	}
	o.Items = append(o.Items, item)
	o.Amount += float64(quantity) * price
	o.IncrementVersion() // Business operations increment version
}

func (o *TestOrder) GetVersion() int64 {
	return o.Version()
}

func (o *TestOrder) GetID() TestOrderID {
	return o.ID()
}