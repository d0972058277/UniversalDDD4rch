package quickstart

import (
	"context"

	"github.com/universalddd/architecture-core/domain"
	"github.com/universalddd/architecture-core/functional"
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
func (s *OrderService) CreateOrder(ctx context.Context, customerID string, amount Money, correlationID string) functional.Result[string] {
	// Validate input
	validationResult := s.validateCreateOrderInput(customerID, amount)
	if validationResult.IsFailure() {
		return functional.Fail[string](validationResult.Error())
	}

	// Create order
	var order *Order
	if correlationID != "" {
		order = NewOrderWithCorrelation(customerID, amount, correlationID)
	} else {
		order = NewOrder(customerID, amount)
	}

	// Save to repository
	err := s.repository.Save(ctx, order)
	if err != nil {
		return functional.Fail[string](functional.InfrastructureError("SAVE_FAILED", err.Error()))
	}

	return functional.OkWith(order.ID().String())
}

// GetOrder retrieves an order by ID
func (s *OrderService) GetOrder(ctx context.Context, orderID OrderId) functional.Maybe[*Order] {
	maybeOrder, _ := s.repository.GetByID(ctx, orderID)
	return maybeOrder
}

// ConfirmOrder confirms an existing order
func (s *OrderService) ConfirmOrder(ctx context.Context, orderID OrderId) functional.Result[interface{}] {
	// Get the order
	maybeOrder, _ := s.repository.GetByID(ctx, orderID)
	if !maybeOrder.HasValue() {
		return functional.Fail[interface{}](functional.DomainError("ORDER_NOT_FOUND", "Order not found"))
	}

	order := maybeOrder.Value()

	// Confirm the order
	confirmResult := order.ConfirmOrder()
	if confirmResult.IsFailure() {
		return confirmResult
	}

	// Update in repository
	err := s.repository.Save(ctx, order)
	if err != nil {
		return functional.Fail[interface{}](functional.InfrastructureError("SAVE_FAILED", err.Error()))
	}
	return functional.Ok[interface{}](nil)
}

// ShipOrder ships an existing order
func (s *OrderService) ShipOrder(ctx context.Context, orderID OrderId) functional.Result[interface{}] {
	// Get the order
	maybeOrder, _ := s.repository.GetByID(ctx, orderID)
	if !maybeOrder.HasValue() {
		return functional.Fail[interface{}](functional.DomainError("ORDER_NOT_FOUND", "Order not found"))
	}

	order := maybeOrder.Value()

	// Ship the order
	shipResult := order.ShipOrder()
	if shipResult.IsFailure() {
		return shipResult
	}

	// Update in repository
	err := s.repository.Save(ctx, order)
	if err != nil {
		return functional.Fail[interface{}](functional.InfrastructureError("SAVE_FAILED", err.Error()))
	}
	return functional.Ok[interface{}](nil)
}

// CancelOrder cancels an existing order
func (s *OrderService) CancelOrder(ctx context.Context, orderID OrderId) functional.Result[interface{}] {
	// Get the order
	maybeOrder, _ := s.repository.GetByID(ctx, orderID)
	if !maybeOrder.HasValue() {
		return functional.Fail[interface{}](functional.DomainError("ORDER_NOT_FOUND", "Order not found"))
	}

	order := maybeOrder.Value()

	// Cancel the order
	cancelResult := order.CancelOrder()
	if cancelResult.IsFailure() {
		return cancelResult
	}

	// Update in repository
	err := s.repository.Save(ctx, order)
	if err != nil {
		return functional.Fail[interface{}](functional.InfrastructureError("SAVE_FAILED", err.Error()))
	}
	return functional.Ok[interface{}](nil)
}

// GetOrdersByStatus retrieves orders by status
func (s *OrderService) GetOrdersByStatus(ctx context.Context, status OrderStatus) functional.ResultOf[[]Order] {
	return s.repository.GetOrdersByStatusAsync(ctx, status)
}

// GetOrderByCustomer retrieves an order by customer ID
func (s *OrderService) GetOrderByCustomer(ctx context.Context, customerID string) functional.Maybe[*Order] {
	return s.repository.GetByCustomerIDAsync(ctx, customerID)
}

// ProcessOrderWorkflow executes a complete order workflow
func (s *OrderService) ProcessOrderWorkflow(ctx context.Context, customerID string, amount Money, correlationID string) functional.Result[string] {
	createResult := s.CreateOrder(ctx, customerID, amount, correlationID)
	if createResult.IsFailure() {
		return createResult
	}

	orderID := createResult.Value()
	orderIDType := NewOrderId(orderID)

	confirmResult := s.ConfirmOrder(ctx, orderIDType)
	if confirmResult.IsFailure() {
		return functional.Fail[string](confirmResult.Error())
	}

	shipResult := s.ShipOrder(ctx, orderIDType)
	if shipResult.IsFailure() {
		return functional.Fail[string](shipResult.Error())
	}

	return functional.Ok(orderID)
}

// ValidateOrder validates an order's business rules
func (s *OrderService) ValidateOrder(ctx context.Context, orderID OrderId) functional.Result[interface{}] {
	maybeOrder, _ := s.repository.GetByID(ctx, orderID)
	if !maybeOrder.HasValue() {
		return functional.Fail[interface{}](functional.DomainError("ORDER_NOT_FOUND", "Order not found"))
	}

	order := maybeOrder.Value()

	// Validate business rules
	if order.GetTotalAmount().GetAmount() <= 0 {
		return functional.Fail[interface{}](functional.ValidationError("INVALID_AMOUNT", "Order amount must be positive"))
	}

	if order.GetCustomerID() == "" {
		return functional.Fail[interface{}](functional.ValidationError("MISSING_CUSTOMER", "Order must have a customer"))
	}

	return functional.Ok[interface{}](nil)
}

// GetOrderEvents retrieves events for an order
func (s *OrderService) GetOrderEvents(ctx context.Context, orderID OrderId) functional.ResultOf[[]domain.DomainEvent] {
	maybeOrder, _ := s.repository.GetByID(ctx, orderID)
	if !maybeOrder.HasValue() {
		return functional.ResultOf[[]domain.DomainEvent](functional.Fail[[]domain.DomainEvent](functional.DomainError("ORDER_NOT_FOUND", "Order not found")))
	}

	order := maybeOrder.Value()
	events := order.DomainEvents()

	return functional.ResultOf[[]domain.DomainEvent](functional.Ok(events))
}

// ClearOrderEvents clears events for an order (typically after publishing)
func (s *OrderService) ClearOrderEvents(ctx context.Context, orderID OrderId) functional.Result[interface{}] {
	maybeOrder, _ := s.repository.GetByID(ctx, orderID)
	if !maybeOrder.HasValue() {
		return functional.Fail[interface{}](functional.DomainError("ORDER_NOT_FOUND", "Order not found"))
	}

	order := maybeOrder.Value()
	order.ClearDomainEvents()

	err := s.repository.Save(ctx, order)
	if err != nil {
		return functional.Fail[interface{}](functional.InfrastructureError("SAVE_FAILED", err.Error()))
	}
	return functional.Ok[interface{}](nil)
}

// validateCreateOrderInput validates input for order creation
func (s *OrderService) validateCreateOrderInput(customerID string, amount Money) functional.Result[interface{}] {
	if customerID == "" {
		return functional.Fail[interface{}](functional.ValidationError("EMPTY_CUSTOMER_ID", "Customer ID cannot be empty"))
	}

	if amount.GetAmount() <= 0 {
		return functional.Fail[interface{}](functional.ValidationError("INVALID_AMOUNT", "Order amount must be positive"))
	}

	if amount.GetCurrency() == "" {
		return functional.Fail[interface{}](functional.ValidationError("EMPTY_CURRENCY", "Currency cannot be empty"))
	}

	return functional.Ok[interface{}](nil)
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
func (s *OrderService) GetOrderSummary(ctx context.Context, orderID OrderId) functional.ResultOf[OrderSummary] {
	maybeOrder, _ := s.repository.GetByID(ctx, orderID)
	if !maybeOrder.HasValue() {
		return functional.ResultOf[OrderSummary](functional.Fail[OrderSummary](functional.DomainError("ORDER_NOT_FOUND", "Order not found")))
	}

	order := maybeOrder.Value()

	summary := OrderSummary{
		OrderID:     order.ID().String(),
		CustomerID:  order.GetCustomerID(),
		TotalAmount: order.GetTotalAmount(),
		Status:      order.GetStatus(),
		EventCount:  order.GetEventCount(),
	}

	return functional.ResultOf[OrderSummary](functional.Ok(summary))
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
			errors = append(errors, *result.Error())
		}
	}

	if len(errors) > 0 {
		// Return first error for simplicity
		return functional.ResultOf[[]string](functional.Fail[[]string](&errors[0]))
	}

	return functional.ResultOf[[]string](functional.Ok(orderIDs))
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
			return functional.ResultOf[OrderStatistics](functional.Fail[OrderStatistics](ordersResult.Error()))
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

	return functional.ResultOf[OrderStatistics](functional.Ok(stats))
}