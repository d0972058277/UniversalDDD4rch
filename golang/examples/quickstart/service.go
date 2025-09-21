package quickstart

import (
	"context"
	"fmt"

	"github.com/universalddd/architecture-core-go/pkg/domain"
	"github.com/universalddd/architecture-core-go/pkg/functional"
)

// OrderService provides application services for order management
type OrderService struct {
	repository IOrderRepository
}

// NewOrderService creates a new order service
func NewOrderService() *OrderService {
	return &OrderService{
		repository: NewInMemoryOrderRepository(),
	}
}

// NewOrderServiceWithRepository creates a new order service with a specific repository
func NewOrderServiceWithRepository(repository IOrderRepository) *OrderService {
	return &OrderService{
		repository: repository,
	}
}

// CreateOrder creates a new order
func (s *OrderService) CreateOrder(ctx context.Context, customerID string, amount Money, correlationID string) functional.ResultOf[string] {
	// Validate input
	validationResult := s.validateCreateOrderInput(customerID, amount)
	if validationResult.IsFailure() {
		return functional.FailWith[string](validationResult.Error())
	}

	// Create order
	var order *Order
	if correlationID != "" {
		order = NewOrderWithCorrelation(customerID, amount, correlationID)
	} else {
		order = NewOrder(customerID, amount)
	}

	// Save to repository
	addResult := s.repository.AddAsync(ctx, order)
	if addResult.IsFailure() {
		return functional.FailWith[string](addResult.Error())
	}

	return functional.OkWith(order.GetID())
}

// GetOrder retrieves an order by ID
func (s *OrderService) GetOrder(ctx context.Context, orderID string) functional.Maybe[Order] {
	maybeOrder := s.repository.GetByIDAsync(ctx, orderID)
	if maybeOrder.HasValue() {
		// Dereference the pointer to return the value
		return functional.Some(*maybeOrder.Value())
	}
	return functional.None[Order]()
}

// ConfirmOrder confirms an existing order
func (s *OrderService) ConfirmOrder(ctx context.Context, orderID string) functional.Result {
	// Get the order
	maybeOrder := s.repository.GetByIDAsync(ctx, orderID)
	if !maybeOrder.HasValue() {
		return functional.Fail(functional.DomainError("ORDER_NOT_FOUND", "Order not found"))
	}

	order := maybeOrder.Value()

	// Confirm the order
	confirmResult := order.ConfirmOrder()
	if confirmResult.IsFailure() {
		return confirmResult
	}

	// Update in repository
	return s.repository.UpdateAsync(ctx, order)
}

// ShipOrder ships an existing order
func (s *OrderService) ShipOrder(ctx context.Context, orderID string) functional.Result {
	// Get the order
	maybeOrder := s.repository.GetByIDAsync(ctx, orderID)
	if !maybeOrder.HasValue() {
		return functional.Fail(functional.DomainError("ORDER_NOT_FOUND", "Order not found"))
	}

	order := maybeOrder.Value()

	// Ship the order
	shipResult := order.ShipOrder()
	if shipResult.IsFailure() {
		return shipResult
	}

	// Update in repository
	return s.repository.UpdateAsync(ctx, order)
}

// CancelOrder cancels an existing order
func (s *OrderService) CancelOrder(ctx context.Context, orderID string) functional.Result {
	// Get the order
	maybeOrder := s.repository.GetByIDAsync(ctx, orderID)
	if !maybeOrder.HasValue() {
		return functional.Fail(functional.DomainError("ORDER_NOT_FOUND", "Order not found"))
	}

	order := maybeOrder.Value()

	// Cancel the order
	cancelResult := order.CancelOrder()
	if cancelResult.IsFailure() {
		return cancelResult
	}

	// Update in repository
	return s.repository.UpdateAsync(ctx, order)
}

// GetOrdersByStatus retrieves orders by status
func (s *OrderService) GetOrdersByStatus(ctx context.Context, status OrderStatus) functional.ResultOf[[]Order] {
	return s.repository.GetOrdersByStatusAsync(ctx, status)
}

// GetOrderByCustomer retrieves an order by customer ID
func (s *OrderService) GetOrderByCustomer(ctx context.Context, customerID string) functional.Maybe[Order] {
	return s.repository.GetByCustomerIDAsync(ctx, customerID)
}

// ProcessOrderWorkflow executes a complete order workflow
func (s *OrderService) ProcessOrderWorkflow(ctx context.Context, customerID string, amount Money, correlationID string) functional.ResultOf[string] {
	return s.CreateOrder(ctx, customerID, amount, correlationID).
		Bind(func(orderID string) functional.ResultOf[string] {
			return s.ConfirmOrder(ctx, orderID).Map(func() string { return orderID })
		}).
		Bind(func(orderID string) functional.ResultOf[string] {
			return s.ShipOrder(ctx, orderID).Map(func() string { return orderID })
		})
}

// ValidateOrder validates an order's business rules
func (s *OrderService) ValidateOrder(ctx context.Context, orderID string) functional.Result {
	maybeOrder := s.repository.GetByIDAsync(ctx, orderID)
	if !maybeOrder.HasValue() {
		return functional.Fail(functional.DomainError("ORDER_NOT_FOUND", "Order not found"))
	}

	order := maybeOrder.Value()

	// Validate business rules
	if order.GetTotalAmount().GetAmount() <= 0 {
		return functional.Fail(functional.ValidationError("INVALID_AMOUNT", "Order amount must be positive"))
	}

	if order.GetCustomerID() == "" {
		return functional.Fail(functional.ValidationError("MISSING_CUSTOMER", "Order must have a customer"))
	}

	return functional.Ok()
}

// GetOrderEvents retrieves events for an order
func (s *OrderService) GetOrderEvents(ctx context.Context, orderID string) functional.ResultOf[[]domain.IDomainEvent] {
	maybeOrder := s.repository.GetByIDAsync(ctx, orderID)
	if !maybeOrder.HasValue() {
		return functional.FailWith[[]domain.IDomainEvent](functional.DomainError("ORDER_NOT_FOUND", "Order not found"))
	}

	order := maybeOrder.Value()
	events := order.GetEvents()

	return functional.OkWith(events)
}

// ClearOrderEvents clears events for an order (typically after publishing)
func (s *OrderService) ClearOrderEvents(ctx context.Context, orderID string) functional.Result {
	maybeOrder := s.repository.GetByIDAsync(ctx, orderID)
	if !maybeOrder.HasValue() {
		return functional.Fail(functional.DomainError("ORDER_NOT_FOUND", "Order not found"))
	}

	order := maybeOrder.Value()
	order.ClearEvents()

	return s.repository.UpdateAsync(ctx, order)
}

// validateCreateOrderInput validates input for order creation
func (s *OrderService) validateCreateOrderInput(customerID string, amount Money) functional.Result {
	if customerID == "" {
		return functional.Fail(functional.ValidationError("EMPTY_CUSTOMER_ID", "Customer ID cannot be empty"))
	}

	if amount.GetAmount() <= 0 {
		return functional.Fail(functional.ValidationError("INVALID_AMOUNT", "Order amount must be positive"))
	}

	if amount.GetCurrency() == "" {
		return functional.Fail(functional.ValidationError("EMPTY_CURRENCY", "Currency cannot be empty"))
	}

	return functional.Ok()
}

// OrderSummary represents a summary of an order
type OrderSummary struct {
	OrderID     string
	CustomerID  string
	TotalAmount Money
	Status      OrderStatus
	EventCount  int
}

// GetOrderSummary retrieves a summary of an order
func (s *OrderService) GetOrderSummary(ctx context.Context, orderID string) functional.ResultOf[OrderSummary] {
	maybeOrder := s.repository.GetByIDAsync(ctx, orderID)
	if !maybeOrder.HasValue() {
		return functional.FailWith[OrderSummary](functional.DomainError("ORDER_NOT_FOUND", "Order not found"))
	}

	order := maybeOrder.Value()

	summary := OrderSummary{
		OrderID:     order.GetID(),
		CustomerID:  order.GetCustomerID(),
		TotalAmount: order.GetTotalAmount(),
		Status:      order.GetStatus(),
		EventCount:  order.GetEventCount(),
	}

	return functional.OkWith(summary)
}

// BatchCreateOrders creates multiple orders in a batch
func (s *OrderService) BatchCreateOrders(ctx context.Context, requests []CreateOrderRequest) functional.ResultOf[[]string] {
	var orderIDs []string
	var errors []functional.Error

	for _, request := range requests {
		result := s.CreateOrder(ctx, request.CustomerID, request.Amount, request.CorrelationID)
		if result.IsSuccess() {
			orderIDs = append(orderIDs, result.Value())
		} else {
			errors = append(errors, result.Error())
		}
	}

	if len(errors) > 0 {
		// Return first error for simplicity
		return functional.FailWith[[]string](errors[0])
	}

	return functional.OkWith(orderIDs)
}

// CreateOrderRequest represents a request to create an order
type CreateOrderRequest struct {
	CustomerID    string
	Amount        Money
	CorrelationID string
}

// OrderStatistics represents order statistics
type OrderStatistics struct {
	TotalOrders     int
	PendingOrders   int
	ConfirmedOrders int
	ShippedOrders   int
	DeliveredOrders int
	CancelledOrders int
}

// GetOrderStatistics retrieves order statistics
func (s *OrderService) GetOrderStatistics(ctx context.Context) functional.ResultOf[OrderStatistics] {
	stats := OrderStatistics{}

	// Get all orders for each status
	statuses := []OrderStatus{Pending, Confirmed, Shipped, Delivered, Cancelled}

	for _, status := range statuses {
		ordersResult := s.repository.GetOrdersByStatusAsync(ctx, status)
		if ordersResult.IsFailure() {
			return functional.FailWith[OrderStatistics](ordersResult.Error())
		}

		count := len(ordersResult.Value())
		stats.TotalOrders += count

		switch status {
		case Pending:
			stats.PendingOrders = count
		case Confirmed:
			stats.ConfirmedOrders = count
		case Shipped:
			stats.ShippedOrders = count
		case Delivered:
			stats.DeliveredOrders = count
		case Cancelled:
			stats.CancelledOrders = count
		}
	}

	return functional.OkWith(stats)
}