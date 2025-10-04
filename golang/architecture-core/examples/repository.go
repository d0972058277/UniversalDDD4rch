package quickstart

import (
	"context"
	"fmt"

	"github.com/universalddd/architecture-core/domain"
	"github.com/universalddd/architecture-core/functional"
)

// IOrderRepository defines the interface for order repository
type IOrderRepository interface {
	domain.IRepository[*Order, OrderId]
	GetOrdersByStatusAsync(ctx context.Context, status OrderStatus) functional.ResultOf[[]Order]
	GetByCustomerIDAsync(ctx context.Context, customerID string) functional.Maybe[*Order]
	AddAsync(ctx context.Context, order *Order) functional.Result[interface{}]
	UpdateAsync(ctx context.Context, order *Order) functional.Result[interface{}]
}

// InMemoryOrderRepository provides an in-memory implementation of order repository
type InMemoryOrderRepository struct {
	*domain.InMemoryRepository[*Order, OrderId]
}

// NewInMemoryOrderRepository creates a new in-memory order repository
func NewInMemoryOrderRepository() *InMemoryOrderRepository {
	return &InMemoryOrderRepository{
		InMemoryRepository: domain.NewInMemoryRepository[*Order, OrderId](),
	}
}

// GetOrdersByStatusAsync retrieves orders by status
func (r *InMemoryOrderRepository) GetOrdersByStatusAsync(ctx context.Context, status OrderStatus) functional.ResultOf[[]Order] {
	// Check for cancellation
	select {
	case <-ctx.Done():
		return functional.ResultOf[[]Order](functional.Fail[[]Order](functional.InfrastructureError("CONTEXT_CANCELLED", "Operation was cancelled")))
	default:
	}

	// Get all orders
	allOrders := r.GetAll(ctx)

	// Filter by status
	var filteredOrders []Order
	for _, orderPtr := range allOrders {
		if orderPtr.GetStatus() == status {
			filteredOrders = append(filteredOrders, *orderPtr)
		}
	}

	return functional.ResultOf[[]Order](functional.Ok(filteredOrders))
}

// GetByCustomerIDAsync retrieves an order by customer ID (returns first match)
func (r *InMemoryOrderRepository) GetByCustomerIDAsync(ctx context.Context, customerID string) functional.Maybe[*Order] {
	// Check for cancellation
	select {
	case <-ctx.Done():
		return functional.None[*Order]()
	default:
	}

	// Get all orders
	allOrders := r.GetAll(ctx)

	// Find first order with matching customer ID
	for _, orderPtr := range allOrders {
		if orderPtr.GetCustomerID() == customerID {
			return functional.Some(orderPtr)
		}
	}

	return functional.None[*Order]()
}

// ValidateOrderForAdd performs order-specific validation before adding
func (r *InMemoryOrderRepository) ValidateOrderForAdd(order *Order) functional.Result[interface{}] {
	if order == nil {
		return functional.Fail[interface{}](functional.ValidationError("NULL_ORDER", "Order cannot be null"))
	}

	if order.ID().String() == "" {
		return functional.Fail[interface{}](functional.ValidationError("EMPTY_ORDER_ID", "Order ID cannot be empty"))
	}

	if order.GetCustomerID() == "" {
		return functional.Fail[interface{}](functional.ValidationError("EMPTY_CUSTOMER_ID", "Customer ID cannot be empty"))
	}

	if order.GetTotalAmount().GetAmount() <= 0 {
		return functional.Fail[interface{}](functional.ValidationError("INVALID_AMOUNT", "Order amount must be positive"))
	}

	return functional.Ok[interface{}](nil)
}

// AddAsync adds a new order with validation
func (r *InMemoryOrderRepository) AddAsync(ctx context.Context, order *Order) functional.Result[interface{}] {
	// Validate the order first
	validationResult := r.ValidateOrderForAdd(order)
	if validationResult.IsFailure() {
		return validationResult
	}

	// Call the base implementation
	err := r.InMemoryRepository.Save(ctx, order)
	if err != nil {
		return functional.Fail[interface{}](functional.InfrastructureError("SAVE_FAILED", err.Error()))
	}
	return functional.Ok[interface{}](nil)
}

// UpdateAsync updates an existing order with validation
func (r *InMemoryOrderRepository) UpdateAsync(ctx context.Context, order *Order) functional.Result[interface{}] {
	// Validate the order first
	validationResult := r.ValidateOrderForAdd(order)
	if validationResult.IsFailure() {
		return validationResult
	}

	// Call the base implementation
	err := r.InMemoryRepository.Save(ctx, order)
	if err != nil {
		return functional.Fail[interface{}](functional.InfrastructureError("UPDATE_FAILED", err.Error()))
	}
	return functional.Ok[interface{}](nil)
}

// RepositoryError represents repository-specific errors
type RepositoryError struct {
	Code    string
	Message string
}

// Error implements the error interface
func (re RepositoryError) Error() string {
	return fmt.Sprintf("[%s] %s", re.Code, re.Message)
}

// NewRepositoryError creates a new repository error
func NewRepositoryError(code, message string) RepositoryError {
	return RepositoryError{
		Code:    code,
		Message: message,
	}
}

// GetByIDAsync retrieves an order by ID (wrapper for base method)
func (r *InMemoryOrderRepository) GetByIDAsync(ctx context.Context, id OrderId) functional.Maybe[*Order] {
	maybeOrder, err := r.InMemoryRepository.GetByID(ctx, id)
	if err != nil {
		return functional.None[*Order]()
	}
	return maybeOrder
}

// DeleteAsync deletes an order by ID (wrapper for base method)
func (r *InMemoryOrderRepository) DeleteAsync(ctx context.Context, id OrderId) functional.Result[interface{}] {
	err := r.InMemoryRepository.Delete(ctx, id)
	if err != nil {
		return functional.Fail[interface{}](functional.InfrastructureError("DELETE_FAILED", err.Error()))
	}
	return functional.Ok[interface{}](nil)
}

// ExistsAsync checks if an order exists (wrapper for base method)
func (r *InMemoryOrderRepository) ExistsAsync(ctx context.Context, id OrderId) functional.Result[bool] {
	exists, err := r.InMemoryRepository.Exists(ctx, id)
	if err != nil {
		return functional.Fail[bool](functional.InfrastructureError("EXISTS_CHECK_FAILED", err.Error()))
	}
	return functional.Ok(exists)
}