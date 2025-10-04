package tests

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/universalddd/architecture-shell-cqrs"
)

// Basic integration test to verify mediator works end-to-end
func TestShould_ExecuteHandler_When_ValidCommandSent(t *testing.T) {
	// Given: A command and handler registered with mediator
	handler := &CreateOrderCommandHandler{}
	handlers := map[string]interface{}{
		"CreateOrderCommand": handler,
	}
	behaviors := []interface{}{}

	mediator := cqrs.NewMediator(handlers, behaviors)

	// When: Sending command through mediator
	cmd := &CreateOrderCommand{CustomerId: "customer-123"}
	result, err := mediator.Send(context.Background(), cmd)

	// Then: Handler should execute successfully
	assert.NoError(t, err)
	assert.NotNil(t, result)
	orderResult, ok := result.(OrderResult)
	assert.True(t, ok, "Result should be OrderResult type")
	assert.NotEmpty(t, orderResult.OrderId)
	assert.Equal(t, "customer-123", orderResult.CustomerId)
}

// Test command
type CreateOrderCommand struct {
	CustomerId string
}

func (c *CreateOrderCommand) IsRequest() {}
func (c *CreateOrderCommand) IsCommand() {}

// Test result
type OrderResult struct {
	OrderId    string
	CustomerId string
}

// Test handler
type CreateOrderCommandHandler struct{}

func (h *CreateOrderCommandHandler) Handle(ctx context.Context, cmd *CreateOrderCommand) (OrderResult, error) {
	return OrderResult{
		OrderId:    "order-456",
		CustomerId: cmd.CustomerId,
	}, nil
}
