package tests

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/universalddd/architecture-shell-cqrs"
	"github.com/universalddd/architecture-shell-cqrs/behaviors"
)

// T179: Should_AbortExecution_When_ValidationFails
// Validates that validation behavior short-circuits pipeline on validation failure
func TestShould_AbortExecution_When_ValidationFails(t *testing.T) {
	// Given: Mediator with validation behavior and test handler
	handler := &ValidationTestCommandHandler{
		Executed: false,
	}

	handlers := map[string]interface{}{
		"*tests.ValidationTestCommand": handler,
	}

	// Create validator that always fails
	validator := &AlwaysFailValidator{
		FailureMessage: "Validation failed for test",
	}

	validationBehavior := &behaviors.ValidationBehavior{
		Validator: validator,
	}

	behaviors := []interface{}{validationBehavior}

	mediator := cqrs.NewMediator(handlers, behaviors)
	ctx := context.Background()

	command := &ValidationTestCommand{Value: "invalid"}

	// When: Command is executed with invalid data
	result, err := mediator.Send(ctx, command)

	// Then: Should throw ValidationException and not execute handler
	assert.Error(t, err, "Should return validation error")
	assert.Nil(t, result, "Should not return result on validation failure")
	assert.False(t, handler.Executed, "Handler should not be executed when validation fails")

	// Verify error contains validation failure message
	assert.Contains(t, err.Error(), "Validation failed", "Error message should indicate validation failure")
	assert.Contains(t, err.Error(), "Validation failed for test", "Error message should contain specific failure message")
}

// Test helper types for validation tests

// ValidationTestCommand is a test command for validation testing
type ValidationTestCommand struct {
	Value string
}

func (c *ValidationTestCommand) IsRequest() {}
func (c *ValidationTestCommand) IsCommand() {}

// ValidationTestCommandHandler handles validation test commands
type ValidationTestCommandHandler struct {
	Executed bool
}

func (h *ValidationTestCommandHandler) Handle(ctx context.Context, command *ValidationTestCommand) (string, error) {
	h.Executed = true
	return "processed-" + command.Value, nil
}

// AlwaysFailValidator is a test validator that always returns validation failure
type AlwaysFailValidator struct {
	FailureMessage string
}

func (v *AlwaysFailValidator) Validate(ctx context.Context, request interface{}) (*behaviors.ValidationResult, error) {
	return &behaviors.ValidationResult{
		IsValid: false,
		Errors: []behaviors.ValidationError{
			{
				PropertyName:   "Value",
				ErrorMessage:   v.FailureMessage,
				AttemptedValue: request,
			},
		},
	}, nil
}

// AlwaysPassValidator is a test validator that always returns validation success
type AlwaysPassValidator struct{}

func (v *AlwaysPassValidator) Validate(ctx context.Context, request interface{}) (*behaviors.ValidationResult, error) {
	return &behaviors.ValidationResult{
		IsValid: true,
		Errors:  nil,
	}, nil
}
