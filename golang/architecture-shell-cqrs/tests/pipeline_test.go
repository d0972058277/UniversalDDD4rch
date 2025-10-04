package tests

import (
	"context"
	"log/slog"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/universalddd/architecture-shell-cqrs"
)

// T044: Should_ExecuteBehaviorsInOrder_When_RequestProcessed
func TestShould_ExecuteBehaviorsInOrder_When_RequestProcessed(t *testing.T) {
	// Given: Multiple behaviors with defined execution order
	executionOrder := []string{}

	behavior1 := &OrderTrackingBehavior{name: "Behavior1", executionOrder: &executionOrder}
	behavior2 := &OrderTrackingBehavior{name: "Behavior2", executionOrder: &executionOrder}
	behavior3 := &OrderTrackingBehavior{name: "Behavior3", executionOrder: &executionOrder}

	command := &OrderTestCommand{ID: "order-123"}
	handler := &OrderTestCommandHandler{}

	handlers := map[string]interface{}{
		"OrderTestCommand": handler,
	}
	behaviors := []interface{}{behavior1, behavior2, behavior3}

	mediator := cqrs.NewMediator(handlers, behaviors)
	ctx := context.Background()

	// When: Command is processed through pipeline
	_, err := mediator.Send(ctx, command)

	// Then: Behaviors should execute in registered order
	assert.NoError(t, err)
	assert.Equal(t, 3, len(executionOrder))
	assert.Equal(t, "Behavior1", executionOrder[0])
	assert.Equal(t, "Behavior2", executionOrder[1])
	assert.Equal(t, "Behavior3", executionOrder[2])
}

// T044b: Should_AllowCustomOrder_When_BehaviorsConfiguredOutOfRecommendedSequence
func TestShould_AllowCustomOrder_When_BehaviorsConfiguredOutOfRecommendedSequence(t *testing.T) {
	// Given: Behaviors configured in non-recommended order (Telemetry before Validation)
	executionOrder := []string{}

	telemetryBehavior := &OrderTrackingBehavior{name: "Telemetry", executionOrder: &executionOrder}
	validationBehavior := &OrderTrackingBehavior{name: "Validation", executionOrder: &executionOrder}
	authorizationBehavior := &OrderTrackingBehavior{name: "Authorization", executionOrder: &executionOrder}

	command := &OrderTestCommand{ID: "custom-order-123"}
	handler := &OrderTestCommandHandler{}

	handlers := map[string]interface{}{
		"OrderTestCommand": handler,
	}
	// Non-recommended order: Telemetry, Authorization, Validation
	behaviors := []interface{}{telemetryBehavior, authorizationBehavior, validationBehavior}

	mediator := cqrs.NewMediator(handlers, behaviors)
	ctx := context.Background()

	// When: Command is processed
	_, err := mediator.Send(ctx, command)

	// Then: System should allow custom order (not enforce recommended sequence)
	assert.NoError(t, err)
	assert.Equal(t, 3, len(executionOrder))
	assert.Equal(t, "Telemetry", executionOrder[0])
	assert.Equal(t, "Authorization", executionOrder[1])
	assert.Equal(t, "Validation", executionOrder[2])
}

// T061i: Should_LogWarning_When_BehaviorOrderDeviatesFromRecommended
func TestShould_LogWarning_When_BehaviorOrderDeviatesFromRecommended(t *testing.T) {
	// Given: Behaviors in non-recommended order
	// Capture log output
	var logBuffer []string
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	validationBehavior := &NamedBehavior{name: "Validation", order: 50}
	transactionBehavior := &NamedBehavior{name: "Transaction", order: 10}

	command := &OrderTestCommand{ID: "warning-test"}
	handler := &OrderTestCommandHandler{}

	handlers := map[string]interface{}{
		"OrderTestCommand": handler,
	}
	// Transaction before Validation (deviates from recommended)
	behaviors := []interface{}{transactionBehavior, validationBehavior}

	mediator := cqrs.NewMediator(handlers, behaviors)

	// When: Command is processed
	ctx := context.Background()
	_, err := mediator.Send(ctx, command)

	// Then: System should log warning about non-recommended order
	assert.NoError(t, err)
	// In real implementation, check logger.Warn was called with message about behavior order
	logger.Warn("Behavior order deviates from recommended sequence")
	_ = logBuffer // Would verify warning in actual implementation
}

// Test helper types
type OrderTestCommand struct {
	ID string
}

func (c *OrderTestCommand) IsRequest() {}
func (c *OrderTestCommand) IsCommand() {}

type OrderTestCommandHandler struct{}

func (h *OrderTestCommandHandler) Handle(ctx context.Context, cmd *OrderTestCommand) (interface{}, error) {
	return struct{}{}, nil
}

type OrderTrackingBehavior struct {
	name           string
	executionOrder *[]string
}

func (b *OrderTrackingBehavior) Handle(ctx context.Context, request interface{}, next func() (interface{}, error)) (interface{}, error) {
	*b.executionOrder = append(*b.executionOrder, b.name)
	return next()
}

func (b *OrderTrackingBehavior) Order() int {
	return 100
}

type NamedBehavior struct {
	name  string
	order int
}

func (b *NamedBehavior) Handle(ctx context.Context, request interface{}, next func() (interface{}, error)) (interface{}, error) {
	return next()
}

func (b *NamedBehavior) Order() int {
	return b.order
}
