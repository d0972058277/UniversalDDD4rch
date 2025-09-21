// Package quickstart provides example implementations of Architecture.Core concepts
package quickstart

import (
	"fmt"
	"strings"

	"github.com/universalddd/architecture-core-go/pkg/domain"
	"github.com/universalddd/architecture-core-go/pkg/functional"
)

// OrderStatus represents the status of an order
type OrderStatus int

const (
	// Pending represents a newly created order
	Pending OrderStatus = iota
	// Confirmed represents a confirmed order
	Confirmed
	// Shipped represents a shipped order
	Shipped
	// Delivered represents a delivered order
	Delivered
	// Cancelled represents a cancelled order
	Cancelled
)

// String returns the string representation of the order status
func (os OrderStatus) String() string {
	switch os {
	case Pending:
		return "Pending"
	case Confirmed:
		return "Confirmed"
	case Shipped:
		return "Shipped"
	case Delivered:
		return "Delivered"
	case Cancelled:
		return "Cancelled"
	default:
		return "Unknown"
	}
}

// Money represents a monetary value with currency
type Money struct {
	domain.ValueObject
	amount   float64
	currency string
}

// NewMoney creates a new Money value object
func NewMoney(amount float64, currency string) Money {
	return Money{
		amount:   amount,
		currency: currency,
	}
}

// GetAmount returns the monetary amount
func (m Money) GetAmount() float64 {
	return m.amount
}

// GetCurrency returns the currency code
func (m Money) GetCurrency() string {
	return m.currency
}

// GetEqualityComponents returns components for structural equality
func (m Money) GetEqualityComponents() []interface{} {
	return []interface{}{m.amount, m.currency}
}

// Add adds two Money values (same currency)
func (m Money) Add(other Money) Money {
	if m.currency != other.currency {
		panic("Cannot add money with different currencies")
	}
	return NewMoney(m.amount+other.amount, m.currency)
}

// Subtract subtracts one Money value from another (same currency)
func (m Money) Subtract(other Money) Money {
	if m.currency != other.currency {
		panic("Cannot subtract money with different currencies")
	}
	return NewMoney(m.amount-other.amount, m.currency)
}

// String returns string representation of Money
func (m Money) String() string {
	return fmt.Sprintf("%.2f %s", m.amount, m.currency)
}

// CustomerId represents a customer identifier
type CustomerId struct {
	domain.ValueObject
	value string
}

// NewCustomerId creates a new customer ID
func NewCustomerId(value string) CustomerId {
	return CustomerId{value: value}
}

// GetValue returns the customer ID value
func (c CustomerId) GetValue() string {
	return c.value
}

// GetEqualityComponents returns components for structural equality
func (c CustomerId) GetEqualityComponents() []interface{} {
	return []interface{}{c.value}
}

// String returns string representation
func (c CustomerId) String() string {
	return c.value
}

// OrderId represents an order identifier
type OrderId struct {
	domain.ValueObject
	value string
}

// NewOrderId creates a new order ID
func NewOrderId(value string) OrderId {
	return OrderId{value: value}
}

// GetValue returns the order ID value
func (o OrderId) GetValue() string {
	return o.value
}

// GetEqualityComponents returns components for structural equality
func (o OrderId) GetEqualityComponents() []interface{} {
	return []interface{}{o.value}
}

// String returns string representation
func (o OrderId) String() string {
	return o.value
}

// OrderCreatedEvent represents an order creation event
type OrderCreatedEvent struct {
	*domain.DomainEventBase
	orderID    string
	customerID string
	amount     Money
}

// NewOrderCreatedEvent creates a new order created event
func NewOrderCreatedEvent(orderID, customerID string, amount Money, correlationID, causationID string) *OrderCreatedEvent {
	base := domain.NewDomainEventBaseWithCorrelation(
		"OrderCreated",
		orderID,
		"Order",
		correlationID,
		causationID,
		nil,
	)

	return &OrderCreatedEvent{
		DomainEventBase: base,
		orderID:         orderID,
		customerID:      customerID,
		amount:          amount,
	}
}

// GetOrderID returns the order ID
func (e *OrderCreatedEvent) GetOrderID() string {
	return e.orderID
}

// GetCustomerID returns the customer ID
func (e *OrderCreatedEvent) GetCustomerID() string {
	return e.customerID
}

// GetAmount returns the order amount
func (e *OrderCreatedEvent) GetAmount() Money {
	return e.amount
}

// OrderStatusChangedEvent represents an order status change event
type OrderStatusChangedEvent struct {
	*domain.DomainEventBase
	orderID       string
	previousStatus string
	newStatus     string
}

// NewOrderStatusChangedEvent creates a new order status changed event
func NewOrderStatusChangedEvent(orderID, previousStatus, newStatus, correlationID, causationID string) *OrderStatusChangedEvent {
	base := domain.NewDomainEventBaseWithCorrelation(
		"OrderStatusChanged",
		orderID,
		"Order",
		correlationID,
		causationID,
		nil,
	)

	return &OrderStatusChangedEvent{
		DomainEventBase: base,
		orderID:         orderID,
		previousStatus:  previousStatus,
		newStatus:       newStatus,
	}
}

// GetOrderID returns the order ID
func (e *OrderStatusChangedEvent) GetOrderID() string {
	return e.orderID
}

// GetPreviousStatus returns the previous status
func (e *OrderStatusChangedEvent) GetPreviousStatus() string {
	return e.previousStatus
}

// GetNewStatus returns the new status
func (e *OrderStatusChangedEvent) GetNewStatus() string {
	return e.newStatus
}

// Order represents an order aggregate root
type Order struct {
	*domain.AggregateRoot[string]
	customerID    string
	totalAmount   Money
	status        OrderStatus
	correlationID string
}

// NewOrder creates a new order
func NewOrder(customerID string, totalAmount Money) *Order {
	orderId := generateOrderID()

	order := &Order{
		AggregateRoot: domain.NewAggregateRoot(orderId),
		customerID:    customerID,
		totalAmount:   totalAmount,
		status:        Pending,
	}

	// Add creation event
	event := NewOrderCreatedEvent(orderId, customerID, totalAmount, "", "")
	order.AddEvent(event)
	order.IncrementVersion()

	return order
}

// NewOrderWithCorrelation creates a new order with correlation context
func NewOrderWithCorrelation(customerID string, totalAmount Money, correlationID string) *Order {
	orderId := generateOrderID()

	order := &Order{
		AggregateRoot: domain.NewAggregateRoot(orderId),
		customerID:    customerID,
		totalAmount:   totalAmount,
		status:        Pending,
		correlationID: correlationID,
	}

	// Add creation event with correlation
	event := NewOrderCreatedEvent(orderId, customerID, totalAmount, correlationID, "")
	order.AddEvent(event)
	order.IncrementVersion()

	return order
}

// NewOrderWithID creates a new order with specific ID (for testing)
func NewOrderWithID(orderID, customerID string, totalAmount Money) *Order {
	order := &Order{
		AggregateRoot: domain.NewAggregateRoot(orderID),
		customerID:    customerID,
		totalAmount:   totalAmount,
		status:        Pending,
	}

	// Add creation event
	event := NewOrderCreatedEvent(orderID, customerID, totalAmount, "", "")
	order.AddEvent(event)
	order.IncrementVersion()

	return order
}

// GetCustomerID returns the customer ID
func (o *Order) GetCustomerID() string {
	return o.customerID
}

// GetTotalAmount returns the total amount
func (o *Order) GetTotalAmount() Money {
	return o.totalAmount
}

// GetStatus returns the order status
func (o *Order) GetStatus() OrderStatus {
	return o.status
}

// ConfirmOrder confirms the order
func (o *Order) ConfirmOrder() functional.Result {
	if o.status != Pending {
		return functional.Fail(functional.DomainError(
			"INVALID_STATUS_TRANSITION",
			fmt.Sprintf("Cannot confirm order in %s status", o.status),
		))
	}

	previousStatus := o.status
	o.status = Confirmed

	// Add status change event
	event := NewOrderStatusChangedEvent(
		o.GetID(),
		previousStatus.String(),
		o.status.String(),
		o.correlationID,
		"", // Would be set to previous event ID in real implementation
	)
	o.AddEvent(event)
	o.IncrementVersion()

	return functional.Ok()
}

// ShipOrder ships the order
func (o *Order) ShipOrder() functional.Result {
	if o.status != Confirmed {
		return functional.Fail(functional.DomainError(
			"INVALID_STATUS_TRANSITION",
			fmt.Sprintf("Cannot ship order in %s status", o.status),
		))
	}

	previousStatus := o.status
	o.status = Shipped

	// Add status change event
	event := NewOrderStatusChangedEvent(
		o.GetID(),
		previousStatus.String(),
		o.status.String(),
		o.correlationID,
		"",
	)
	o.AddEvent(event)
	o.IncrementVersion()

	return functional.Ok()
}

// DeliverOrder delivers the order
func (o *Order) DeliverOrder() functional.Result {
	if o.status != Shipped {
		return functional.Fail(functional.DomainError(
			"INVALID_STATUS_TRANSITION",
			fmt.Sprintf("Cannot deliver order in %s status", o.status),
		))
	}

	previousStatus := o.status
	o.status = Delivered

	// Add status change event
	event := NewOrderStatusChangedEvent(
		o.GetID(),
		previousStatus.String(),
		o.status.String(),
		o.correlationID,
		"",
	)
	o.AddEvent(event)
	o.IncrementVersion()

	return functional.Ok()
}

// CancelOrder cancels the order
func (o *Order) CancelOrder() functional.Result {
	if o.status == Shipped || o.status == Delivered {
		return functional.Fail(functional.DomainError(
			"CANNOT_CANCEL",
			fmt.Sprintf("Cannot cancel order in %s status", o.status),
		))
	}

	if o.status == Cancelled {
		return functional.Fail(functional.DomainError(
			"ALREADY_CANCELLED",
			"Order is already cancelled",
		))
	}

	previousStatus := o.status
	o.status = Cancelled

	// Add status change event
	event := NewOrderStatusChangedEvent(
		o.GetID(),
		previousStatus.String(),
		o.status.String(),
		o.correlationID,
		"",
	)
	o.AddEvent(event)
	o.IncrementVersion()

	return functional.Ok()
}

// ModifyState is a test helper method
func (o *Order) ModifyState(newState string) {
	// This is for testing - adds metadata and increments version
	o.IncrementVersion()
}

// generateOrderID generates a simple order ID for examples
func generateOrderID() string {
	// Simple ID generation for example purposes
	return fmt.Sprintf("ORDER-%d", len("temp"))
}

// Additional value objects for testing

// Address represents a postal address
type Address struct {
	domain.ValueObject
	street     string
	city       string
	postalCode string
	country    string
}

// NewAddress creates a new address
func NewAddress(street, city, postalCode, country string) Address {
	return Address{
		street:     street,
		city:       city,
		postalCode: postalCode,
		country:    country,
	}
}

// GetEqualityComponents returns components for structural equality
func (a Address) GetEqualityComponents() []interface{} {
	return []interface{}{a.street, a.city, a.postalCode, a.country}
}

// String returns string representation
func (a Address) String() string {
	return fmt.Sprintf("%s, %s %s, %s", a.street, a.city, a.postalCode, a.country)
}

// ProductTags represents product tags (for collection testing)
type ProductTags struct {
	domain.ValueObject
	productID string
	tags      []string
}

// NewProductTags creates new product tags
func NewProductTags(productID string, tags []string) ProductTags {
	// Make a copy of the slice to ensure immutability
	tagsCopy := make([]string, len(tags))
	copy(tagsCopy, tags)

	return ProductTags{
		productID: productID,
		tags:      tagsCopy,
	}
}

// GetEqualityComponents returns components for structural equality
func (p ProductTags) GetEqualityComponents() []interface{} {
	return []interface{}{p.productID, p.tags}
}

// PhoneNumber represents a phone number
type PhoneNumber struct {
	domain.ValueObject
	number string
}

// NewPhoneNumber creates a new phone number
func NewPhoneNumber(number string) *PhoneNumber {
	return &PhoneNumber{number: number}
}

// GetEqualityComponents returns components for structural equality
func (p *PhoneNumber) GetEqualityComponents() []interface{} {
	return []interface{}{p.number}
}

// ContactInfo represents contact information with optional phone
type ContactInfo struct {
	domain.ValueObject
	email string
	phone *PhoneNumber
}

// NewContactInfo creates new contact info
func NewContactInfo(email string, phone *PhoneNumber) ContactInfo {
	return ContactInfo{
		email: email,
		phone: phone,
	}
}

// GetEqualityComponents returns components for structural equality
func (c ContactInfo) GetEqualityComponents() []interface{} {
	return []interface{}{c.email, c.phone}
}

// OrderItem represents an order line item
type OrderItem struct {
	domain.ValueObject
	productID string
	quantity  int
	unitPrice Money
}

// NewOrderItem creates a new order item
func NewOrderItem(productID string, quantity int, unitPrice Money) OrderItem {
	return OrderItem{
		productID: productID,
		quantity:  quantity,
		unitPrice: unitPrice,
	}
}

// GetEqualityComponents returns components for structural equality
func (oi OrderItem) GetEqualityComponents() []interface{} {
	return []interface{}{oi.productID, oi.quantity, oi.unitPrice}
}