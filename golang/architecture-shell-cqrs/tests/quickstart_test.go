package tests

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	cqrs "github.com/universalddd/architecture-shell-cqrs"
	"github.com/universalddd/architecture-shell-cqrs/behaviors"
)

// Domain types (from quickstart.md example)

// QuickstartCreateOrderCommand is a command that creates an order with items
type QuickstartCreateOrderCommand struct {
	CustomerId string
	Items      []OrderItem
}

func (c *QuickstartCreateOrderCommand) IsRequest() {}
func (c *QuickstartCreateOrderCommand) IsCommand() {}

// OrderItem represents a line item in an order
type OrderItem struct {
	ProductId string
	Quantity  int
}

// GetOrderDetailsQuery is a query that retrieves order details
type GetOrderDetailsQuery struct {
	OrderId string
}

func (q *GetOrderDetailsQuery) IsRequest() {}
func (q *GetOrderDetailsQuery) IsQuery() {}

// OrderDetailsDto is the data transfer object for order details
type OrderDetailsDto struct {
	OrderId     string
	CustomerId  string
	Status      string
	Items       []OrderItemDto
	TotalAmount float64
}

// OrderItemDto is the data transfer object for order items
type OrderItemDto struct {
	ProductId   string
	ProductName string
	Quantity    int
	Price       float64
}

// Result monad (simplified for quickstart)
type Result struct {
	Value     interface{}
	Error     string
	IsSuccess bool
}

func Success(value interface{}) Result {
	return Result{Value: value, IsSuccess: true}
}

func Failure(error string) Result {
	return Result{Error: error, IsSuccess: false}
}

func (r Result) IsFailure() bool {
	return !r.IsSuccess
}

// Handlers

// QuickstartCreateOrderHandler handles QuickstartCreateOrderCommand
type QuickstartCreateOrderHandler struct {
	orderStore map[string]OrderDetailsDto
}

func (h *QuickstartCreateOrderHandler) Handle(ctx context.Context, cmd *QuickstartCreateOrderCommand) (Result, error) {
	// Given: Business validation
	if cmd.Items == nil || len(cmd.Items) == 0 {
		return Failure("Order must have at least one item"), nil
	}

	// When: Create order
	orderId := fmt.Sprintf("order-%d", time.Now().UnixNano())
	items := make([]OrderItemDto, len(cmd.Items))
	totalAmount := 0.0

	for i, item := range cmd.Items {
		price := 19.99
		items[i] = OrderItemDto{
			ProductId:   item.ProductId,
			ProductName: fmt.Sprintf("Product %s", item.ProductId),
			Quantity:    item.Quantity,
			Price:       price,
		}
		totalAmount += float64(item.Quantity) * price
	}

	order := OrderDetailsDto{
		OrderId:     orderId,
		CustomerId:  cmd.CustomerId,
		Status:      "Draft",
		Items:       items,
		TotalAmount: totalAmount,
	}

	h.orderStore[orderId] = order
	return Success(orderId), nil
}

// GetOrderDetailsHandler handles GetOrderDetailsQuery
type GetOrderDetailsHandler struct {
	orderStore map[string]OrderDetailsDto
}

func (h *GetOrderDetailsHandler) Handle(ctx context.Context, query *GetOrderDetailsQuery) (OrderDetailsDto, error) {
	// Given: Query read model (no transaction)
	order, exists := h.orderStore[query.OrderId]
	if !exists {
		return OrderDetailsDto{}, fmt.Errorf("Order %s not found", query.OrderId)
	}

	// Then: Return DTO
	return order, nil
}

// TestShould_ExecuteQuickstartExample_When_IntegratedCorrectly validates the quickstart.md example works end-to-end
//
// Quickstart Integration Test validates:
//  1. Command creates order with transaction
//  2. Query retrieves order without transaction
//  3. Pipeline behaviors execute in correct order
func TestShould_ExecuteQuickstartExample_When_IntegratedCorrectly(t *testing.T) {
	// Given: Shared in-memory order storage
	orderStore := make(map[string]OrderDetailsDto)

	// Given: UnitOfWork and logger (from quickstart.md Step 4)
	unitOfWork := NewInMemoryUnitOfWork()
	logger := createMockLogger()

	// Given: Handlers (from quickstart.md Step 3)
	createOrderHandler := &QuickstartCreateOrderHandler{orderStore: orderStore}
	getOrderDetailsHandler := &GetOrderDetailsHandler{orderStore: orderStore}

	// Given: Mediator with behaviors using WireCqrs (from quickstart.md Step 4)
	mediator := cqrs.WireCqrs(
		map[string]interface{}{
			"QuickstartCreateOrderCommand": createOrderHandler,
			"GetOrderDetailsQuery":          getOrderDetailsHandler,
		},
		[]interface{}{
			&behaviors.UnitOfWorkBehavior{UnitOfWork: unitOfWork},
			&behaviors.TelemetryBehavior{Logger: logger},
		},
	)

	// When: Execute command (from quickstart.md Step 5)
	createCommand := &QuickstartCreateOrderCommand{
		CustomerId: "customer-123",
		Items: []OrderItem{
			{ProductId: "P1", Quantity: 2},
			{ProductId: "P2", Quantity: 1},
		},
	}
	ctx := context.Background()
	createResult, err := mediator.Send(ctx, createCommand)

	// Then: Command succeeds with transaction
	require.NoError(t, err)
	require.NotNil(t, createResult)
	result, ok := createResult.(Result)
	require.True(t, ok, "Result should be Result type")
	assert.True(t, result.IsSuccess, "Command should succeed")

	orderId, ok := result.Value.(string)
	require.True(t, ok, "Result value should be string")
	assert.NotEmpty(t, orderId)
	assert.Contains(t, orderId, "order-")

	// Then: Transaction was committed
	assert.True(t, unitOfWork.IsCommitted(), "Transaction should be committed")
	assert.False(t, unitOfWork.IsRolledBack(), "Transaction should not be rolled back")

	// When: Execute query (from quickstart.md Step 5)
	getQuery := &GetOrderDetailsQuery{OrderId: orderId}
	orderDetailsResult, err := mediator.Send(ctx, getQuery)

	// Then: Query returns order details
	require.NoError(t, err)
	orderDetails, ok := orderDetailsResult.(OrderDetailsDto)
	require.True(t, ok, "Result should be OrderDetailsDto type")
	assert.Equal(t, orderId, orderDetails.OrderId)
	assert.Equal(t, "customer-123", orderDetails.CustomerId)
	assert.Equal(t, "Draft", orderDetails.Status)
	assert.Len(t, orderDetails.Items, 2)
	assert.InDelta(t, 59.97, orderDetails.TotalAmount, 0.01) // 2*19.99 + 1*19.99
}

// TestShould_ReturnValidationError_When_CommandInvalid validates business validation failures
func TestShould_ReturnValidationError_When_CommandInvalid(t *testing.T) {
	// Given: Shared storage and mediator
	orderStore := make(map[string]OrderDetailsDto)
	unitOfWork := NewInMemoryUnitOfWork()
	logger := createMockLogger()

	createOrderHandler := &QuickstartCreateOrderHandler{orderStore: orderStore}

	mediator := cqrs.WireCqrs(
		map[string]interface{}{
			"QuickstartCreateOrderCommand": createOrderHandler,
		},
		[]interface{}{
			&behaviors.UnitOfWorkBehavior{UnitOfWork: unitOfWork},
			&behaviors.TelemetryBehavior{Logger: logger},
		},
	)

	// When: Execute invalid command (empty items)
	invalidCommand := &QuickstartCreateOrderCommand{
		CustomerId: "customer-456",
		Items:      []OrderItem{}, // Empty items - validation error
	}
	ctx := context.Background()
	result, err := mediator.Send(ctx, invalidCommand)

	// Then: Business validation failure (transaction still commits per BR-008)
	require.NoError(t, err)
	businessResult, ok := result.(Result)
	require.True(t, ok, "Result should be Result type")
	assert.True(t, businessResult.IsFailure(), "Command should fail business validation")
	assert.Equal(t, "Order must have at least one item", businessResult.Error)

	// Then: Transaction commits even on business failure per BR-008
	assert.True(t, unitOfWork.IsCommitted(), "Transaction should commit on business failure")
	assert.False(t, unitOfWork.IsRolledBack(), "Transaction should not rollback on business failure")
}

// TestShould_UseWireCqrsWithDefaults_When_NoBehaviorsNeeded validates default wiring
func TestShould_UseWireCqrsWithDefaults_When_NoBehaviorsNeeded(t *testing.T) {
	// Given: Simple handler with default wiring (no behaviors)
	orderStore := make(map[string]OrderDetailsDto)
	createOrderHandler := &QuickstartCreateOrderHandler{orderStore: orderStore}

	// When: Wire mediator with defaults (all behaviors disabled)
	mediator := cqrs.WireCqrsWithDefaults(map[string]interface{}{
		"QuickstartCreateOrderCommand": createOrderHandler,
	})

	// When: Execute command
	createCommand := &QuickstartCreateOrderCommand{
		CustomerId: "customer-789",
		Items:      []OrderItem{{ProductId: "P3", Quantity: 5}},
	}
	ctx := context.Background()
	result, err := mediator.Send(ctx, createCommand)

	// Then: Command executes successfully without behaviors
	require.NoError(t, err)
	businessResult, ok := result.(Result)
	require.True(t, ok)
	assert.True(t, businessResult.IsSuccess)

	orderId, ok := businessResult.Value.(string)
	require.True(t, ok)
	assert.NotEmpty(t, orderId)
}

// Helper types and functions

// createMockLogger creates a slog.Logger that discards output (for testing)
func createMockLogger() *slog.Logger {
	return slog.New(slog.NewJSONHandler(io.Discard, nil))
}
