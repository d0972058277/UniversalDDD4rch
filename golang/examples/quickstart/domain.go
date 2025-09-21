// Package quickstart provides example implementations of Architecture.Core concepts
package quickstart

import (
	"fmt"
	"hash/fnv"

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
	domain.BaseValueObject
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

// GetHashCode returns the hash code for this money object
func (m Money) GetHashCode() uint64 {
	h := fnv.New64a()
	for _, component := range m.GetEqualityComponents() {
		if component != nil {
			h.Write([]byte(fmt.Sprintf("%v", component)))
		} else {
			h.Write([]byte("null"))
		}
	}
	return h.Sum64()
}

// Equals compares two Money objects for equality
func (m Money) Equals(other domain.ValueObject) bool {
	if other == nil {
		return false
	}

	otherMoney, ok := other.(Money)
	if !ok {
		return false
	}

	return m.amount == otherMoney.amount && m.currency == otherMoney.currency
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
	domain.BaseValueObject
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

// GetHashCode returns the hash code for this customer ID
func (c CustomerId) GetHashCode() uint64 {
	h := fnv.New64a()
	for _, component := range c.GetEqualityComponents() {
		if component != nil {
			h.Write([]byte(fmt.Sprintf("%v", component)))
		} else {
			h.Write([]byte("null"))
		}
	}
	return h.Sum64()
}

// Equals compares two CustomerId objects for equality
func (c CustomerId) Equals(other domain.ValueObject) bool {
	if other == nil {
		return false
	}

	otherCustomerId, ok := other.(CustomerId)
	if !ok {
		return false
	}

	return c.value == otherCustomerId.value
}

// String returns string representation
func (c CustomerId) String() string {
	return c.value
}

// OrderId represents an order identifier
type OrderId struct {
	domain.BaseValueObject
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

// GetHashCode returns the hash code for this order ID
func (o OrderId) GetHashCode() uint64 {
	h := fnv.New64a()
	for _, component := range o.GetEqualityComponents() {
		if component != nil {
			h.Write([]byte(fmt.Sprintf("%v", component)))
		} else {
			h.Write([]byte("null"))
		}
	}
	return h.Sum64()
}

// Equals compares two OrderId objects for equality
func (o OrderId) Equals(other domain.ValueObject) bool {
	if other == nil {
		return false
	}

	otherOrderId, ok := other.(OrderId)
	if !ok {
		return false
	}

	return o.value == otherOrderId.value
}

// String returns string representation
func (o OrderId) String() string {
	return o.value
}

// OrderCreatedEvent represents an order creation event
type OrderCreatedEvent struct {
	*domain.BaseDomainEvent
	orderID    string
	customerID string
	amount     Money
}

// NewOrderCreatedEvent creates a new order created event
func NewOrderCreatedEvent(orderID, customerID string, amount Money, correlationID, causationID string) *OrderCreatedEvent {
	var corrID, causID *string
	if correlationID != "" {
		corrID = &correlationID
	}
	if causationID != "" {
		causID = &causationID
	}

	base := domain.NewBaseDomainEventWithCorrelation(
		"OrderCreated",
		corrID,
		causID,
		nil,
	)

	return &OrderCreatedEvent{
		BaseDomainEvent: base,
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
	*domain.BaseDomainEvent
	orderID       string
	previousStatus string
	newStatus     string
}

// NewOrderStatusChangedEvent creates a new order status changed event
func NewOrderStatusChangedEvent(orderID, previousStatus, newStatus, correlationID, causationID string) *OrderStatusChangedEvent {
	var corrID, causID *string
	if correlationID != "" {
		corrID = &correlationID
	}
	if causationID != "" {
		causID = &causationID
	}

	base := domain.NewBaseDomainEventWithCorrelation(
		"OrderStatusChanged",
		corrID,
		causID,
		nil,
	)

	return &OrderStatusChangedEvent{
		BaseDomainEvent: base,
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
	*domain.BaseAggregateRoot[OrderId]
	customerID    string
	totalAmount   Money
	status        OrderStatus
	correlationID string
}

// NewOrder creates a new order
func NewOrder(customerID string, totalAmount Money) *Order {
	orderId := NewOrderId(generateOrderID())

	order := &Order{
		BaseAggregateRoot: domain.NewBaseAggregateRoot(orderId),
		customerID:        customerID,
		totalAmount:       totalAmount,
		status:            Pending,
	}

	// Add creation event
	event := NewOrderCreatedEvent(orderId.String(), customerID, totalAmount, "", "")
	order.AddDomainEvent(event)
	order.IncrementVersion()

	return order
}

// NewOrderWithCorrelation creates a new order with correlation context
func NewOrderWithCorrelation(customerID string, totalAmount Money, correlationID string) *Order {
	orderId := NewOrderId(generateOrderID())

	order := &Order{
		BaseAggregateRoot: domain.NewBaseAggregateRoot(orderId),
		customerID:        customerID,
		totalAmount:       totalAmount,
		status:            Pending,
		correlationID:     correlationID,
	}

	// Add creation event with correlation
	event := NewOrderCreatedEvent(orderId.String(), customerID, totalAmount, correlationID, "")
	order.AddDomainEvent(event)
	order.IncrementVersion()

	return order
}

// NewOrderWithID creates a new order with specific ID (for testing)
func NewOrderWithID(orderID, customerID string, totalAmount Money) *Order {
	orderId := NewOrderId(orderID)
	order := &Order{
		BaseAggregateRoot: domain.NewBaseAggregateRoot(orderId),
		customerID:    customerID,
		totalAmount:   totalAmount,
		status:        Pending,
	}

	// Add creation event
	event := NewOrderCreatedEvent(orderID, customerID, totalAmount, "", "")
	order.AddDomainEvent(event)
	order.IncrementVersion()

	return order
}

// GetCustomerID returns the customer ID
func (o Order) GetCustomerID() string {
	return o.customerID
}

// GetTotalAmount returns the total amount
func (o Order) GetTotalAmount() Money {
	return o.totalAmount
}

// GetStatus returns the order status
func (o *Order) GetStatus() OrderStatus {
	return o.status
}

// ConfirmOrder confirms the order
func (o *Order) ConfirmOrder() functional.Result[interface{}] {
	if o.status != Pending {
		return functional.Fail[interface{}](functional.DomainError(
			"INVALID_STATUS_TRANSITION",
			fmt.Sprintf("Cannot confirm order in %s status", o.status),
		))
	}

	previousStatus := o.status
	o.status = Confirmed

	// Get the last event ID for causation
	var causationID string
	events := o.GetEvents()
	if len(events) > 0 {
		causationID = events[len(events)-1].ID()
	}

	// Add status change event
	event := NewOrderStatusChangedEvent(
		o.ID().String(),
		previousStatus.String(),
		o.status.String(),
		o.correlationID,
		causationID,
	)
	o.AddDomainEvent(event)
	o.IncrementVersion()

	return functional.Ok[interface{}](nil)
}

// ShipOrder ships the order
func (o *Order) ShipOrder() functional.Result[interface{}] {
	if o.status != Confirmed {
		return functional.Fail[interface{}](functional.DomainError(
			"INVALID_STATUS_TRANSITION",
			fmt.Sprintf("Cannot ship order in %s status", o.status),
		))
	}

	previousStatus := o.status
	o.status = Shipped

	// Get the last event ID for causation
	var causationID string
	events := o.GetEvents()
	if len(events) > 0 {
		causationID = events[len(events)-1].ID()
	}

	// Add status change event
	event := NewOrderStatusChangedEvent(
		o.ID().String(),
		previousStatus.String(),
		o.status.String(),
		o.correlationID,
		causationID,
	)
	o.AddDomainEvent(event)
	o.IncrementVersion()

	return functional.Ok[interface{}](nil)
}

// DeliverOrder delivers the order
func (o *Order) DeliverOrder() functional.Result[interface{}] {
	if o.status != Shipped {
		return functional.Fail[interface{}](functional.DomainError(
			"INVALID_STATUS_TRANSITION",
			fmt.Sprintf("Cannot deliver order in %s status", o.status),
		))
	}

	previousStatus := o.status
	o.status = Delivered

	// Get the last event ID for causation
	var causationID string
	events := o.GetEvents()
	if len(events) > 0 {
		causationID = events[len(events)-1].ID()
	}

	// Add status change event
	event := NewOrderStatusChangedEvent(
		o.ID().String(),
		previousStatus.String(),
		o.status.String(),
		o.correlationID,
		causationID,
	)
	o.AddDomainEvent(event)
	o.IncrementVersion()

	return functional.Ok[interface{}](nil)
}

// CancelOrder cancels the order
func (o *Order) CancelOrder() functional.Result[interface{}] {
	if o.status == Shipped || o.status == Delivered {
		return functional.Fail[interface{}](functional.DomainError(
			"CANNOT_CANCEL",
			fmt.Sprintf("Cannot cancel order in %s status", o.status),
		))
	}

	if o.status == Cancelled {
		return functional.Fail[interface{}](functional.DomainError(
			"ALREADY_CANCELLED",
			"Order is already cancelled",
		))
	}

	previousStatus := o.status
	o.status = Cancelled

	// Add status change event
	event := NewOrderStatusChangedEvent(
		o.ID().String(),
		previousStatus.String(),
		o.status.String(),
		o.correlationID,
		"",
	)
	o.AddDomainEvent(event)
	o.IncrementVersion()

	return functional.Ok[interface{}](nil)
}

// ModifyState is a test helper method
func (o *Order) ModifyState(newState string) {
	// This is for testing - adds metadata and increments version
	o.IncrementVersion()
}

// Wrapper methods for integration test compatibility
func (o *Order) GetVersion() int64 {
	return o.Version()
}

func (o *Order) GetEvents() []domain.DomainEvent {
	return o.DomainEvents()
}

func (o *Order) ClearEvents() {
	o.ClearDomainEvents()
}

func (o *Order) GetID() OrderId {
	return o.ID()
}

// orderCounter provides a simple counter for generating unique order IDs
var orderCounter int64 = 0

// generateOrderID generates a simple order ID for examples
func generateOrderID() string {
	// Simple ID generation for example purposes - increment counter for uniqueness
	orderCounter++
	return fmt.Sprintf("ORDER-%d", orderCounter)
}

// Additional value objects for testing

// Address represents a postal address
type Address struct {
	domain.BaseValueObject
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

// GetHashCode returns the hash code for this address
func (a Address) GetHashCode() uint64 {
	h := fnv.New64a()
	for _, component := range a.GetEqualityComponents() {
		if component != nil {
			h.Write([]byte(fmt.Sprintf("%v", component)))
		} else {
			h.Write([]byte("null"))
		}
	}
	return h.Sum64()
}

// Equals compares two Address objects for equality
func (a Address) Equals(other domain.ValueObject) bool {
	if other == nil {
		return false
	}

	otherAddress, ok := other.(Address)
	if !ok {
		return false
	}

	return a.street == otherAddress.street &&
		   a.city == otherAddress.city &&
		   a.postalCode == otherAddress.postalCode &&
		   a.country == otherAddress.country
}

// String returns string representation
func (a Address) String() string {
	return fmt.Sprintf("%s, %s %s, %s", a.street, a.city, a.postalCode, a.country)
}

// ProductTags represents product tags (for collection testing)
type ProductTags struct {
	domain.BaseValueObject
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
	// Return a copy of the slice to ensure immutability
	tagsCopy := make([]string, len(p.tags))
	copy(tagsCopy, p.tags)
	return []interface{}{p.productID, tagsCopy}
}

// Equals compares two ProductTags for equality
func (p ProductTags) Equals(other domain.ValueObject) bool {
	return domain.ValueObjectEquals(p, other)
}

// GetHashCode returns the hash code for ProductTags
func (p ProductTags) GetHashCode() uint64 {
	return domain.ValueObjectHashCode(p)
}

// PhoneNumber represents a phone number
type PhoneNumber struct {
	domain.BaseValueObject
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

// Equals compares two PhoneNumber objects for equality
func (p *PhoneNumber) Equals(other domain.ValueObject) bool {
	return domain.ValueObjectEquals(p, other)
}

// GetHashCode returns the hash code for PhoneNumber
func (p *PhoneNumber) GetHashCode() uint64 {
	return domain.ValueObjectHashCode(p)
}

// ContactInfo represents contact information with optional phone
type ContactInfo struct {
	domain.BaseValueObject
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

// Equals compares two ContactInfo objects for equality
func (c ContactInfo) Equals(other domain.ValueObject) bool {
	return domain.ValueObjectEquals(c, other)
}

// GetHashCode returns the hash code for ContactInfo
func (c ContactInfo) GetHashCode() uint64 {
	return domain.ValueObjectHashCode(c)
}

// OrderItem represents an order line item
type OrderItem struct {
	domain.BaseValueObject
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

// Equals compares two OrderItem objects for equality
func (oi OrderItem) Equals(other domain.ValueObject) bool {
	return domain.ValueObjectEquals(oi, other)
}

// GetHashCode returns the hash code for OrderItem
func (oi OrderItem) GetHashCode() uint64 {
	return domain.ValueObjectHashCode(oi)
}