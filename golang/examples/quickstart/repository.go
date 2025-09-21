package quickstart

import (
	"context"
	"fmt"

	"github.com/universalddd/architecture-core-go/pkg/domain"
	"github.com/universalddd/architecture-core-go/pkg/functional"
)

// IOrderRepository defines the interface for order repository
type IOrderRepository interface {
	domain.IRepository[*Order, string]
	GetOrdersByStatusAsync(ctx context.Context, status OrderStatus) functional.Result[[]Order]
	GetByCustomerIDAsync(ctx context.Context, customerID string) functional.Maybe[Order]
}

// InMemoryOrderRepository provides an in-memory implementation of order repository
type InMemoryOrderRepository struct {
	*domain.InMemoryRepository[*Order, string]
}

// NewInMemoryOrderRepository creates a new in-memory order repository
func NewInMemoryOrderRepository() *InMemoryOrderRepository {
	return &InMemoryOrderRepository{
		InMemoryRepository: domain.NewInMemoryRepository[*Order, string](),
	}
}

// GetOrdersByStatusAsync retrieves orders by status
func (r *InMemoryOrderRepository) GetOrdersByStatusAsync(ctx context.Context, status OrderStatus) functional.Result[[]Order] {
	// Check for cancellation
	select {
	case <-ctx.Done():
		return functional.FailWith[[]Order](functional.InfrastructureError("CONTEXT_CANCELLED", "Operation was cancelled"))
	default:
	}

	// Get all orders
	allOrdersResult := r.GetAllAsync(ctx)
	if allOrdersResult.IsFailure() {
		return functional.FailWith[[]Order](allOrdersResult.Error())
	}

	// Filter by status
	var filteredOrders []Order
	for _, orderPtr := range allOrdersResult.Value() {
		if orderPtr.GetStatus() == status {
			filteredOrders = append(filteredOrders, *orderPtr)
		}
	}

	return functional.OkWith(filteredOrders)
}

// GetByCustomerIDAsync retrieves an order by customer ID (returns first match)
func (r *InMemoryOrderRepository) GetByCustomerIDAsync(ctx context.Context, customerID string) functional.Maybe[Order] {
	// Check for cancellation
	select {
	case <-ctx.Done():
		return functional.None[Order]()
	default:
	}

	// Get all orders
	allOrdersResult := r.GetAllAsync(ctx)
	if allOrdersResult.IsFailure() {
		return functional.None[Order]()
	}

	// Find first order with matching customer ID
	for _, orderPtr := range allOrdersResult.Value() {
		if orderPtr.GetCustomerID() == customerID {
			return functional.Some(*orderPtr)
		}
	}

	return functional.None[Order]()
}

// ValidateOrderForAdd performs order-specific validation before adding
func (r *InMemoryOrderRepository) ValidateOrderForAdd(order *Order) functional.Result {
	if order == nil {
		return functional.Fail(functional.ValidationError("NULL_ORDER", "Order cannot be null"))
	}

	if order.GetID() == "" {
		return functional.Fail(functional.ValidationError("EMPTY_ORDER_ID", "Order ID cannot be empty"))
	}

	if order.GetCustomerID() == "" {
		return functional.Fail(functional.ValidationError("EMPTY_CUSTOMER_ID", "Customer ID cannot be empty"))
	}

	if order.GetTotalAmount().GetAmount() <= 0 {
		return functional.Fail(functional.ValidationError("INVALID_AMOUNT", "Order amount must be positive"))
	}

	return functional.Ok()
}

// AddAsync adds a new order with validation
func (r *InMemoryOrderRepository) AddAsync(ctx context.Context, order *Order) functional.Result {
	// Validate the order first
	validationResult := r.ValidateOrderForAdd(order)
	if validationResult.IsFailure() {
		return validationResult
	}

	// Call the base implementation
	return r.InMemoryRepository.AddAsync(ctx, order)
}

// UpdateAsync updates an existing order with validation
func (r *InMemoryOrderRepository) UpdateAsync(ctx context.Context, order *Order) functional.Result {
	// Validate the order first
	validationResult := r.ValidateOrderForAdd(order)
	if validationResult.IsFailure() {
		return validationResult
	}

	// Call the base implementation
	return r.InMemoryRepository.UpdateAsync(ctx, order)
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