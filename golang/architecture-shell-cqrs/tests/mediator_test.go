package tests

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/universalddd/architecture-shell-cqrs"
)

// T028: Should_ThrowException_When_ZeroHandlersRegistered
func TestShould_PanicException_When_ZeroHandlersRegistered(t *testing.T) {
	// Given: No handlers registered for a command
	defer func() {
		if r := recover(); r == nil {
			t.Errorf("Expected panic when zero handlers registered, but no panic occurred")
		}
	}()

	// When: Creating a mediator with no handlers
	handlers := make(map[string]interface{})
	behaviors := []interface{}{}

	// Then: Should panic during construction
	cqrs.NewMediator(handlers, behaviors)
}

// T033: Should_ThrowException_When_MultipleHandlersRegistered
func TestShould_PanicException_When_MultipleHandlersRegistered(t *testing.T) {
	// Given: Multiple handlers registered for the same command type
	defer func() {
		r := recover()
		if r == nil {
			t.Errorf("Expected panic when multiple handlers registered, but no panic occurred")
		} else {
			// Verify panic message contains handler names
			panicMsg, ok := r.(string)
			assert.True(t, ok, "Panic should be a string message")
			assert.Contains(t, panicMsg, "handler", "Panic message should mention handlers")
		}
	}()

	// When: Creating mediator with duplicate handlers
	handlers := map[string]interface{}{
		"TestCommand": []interface{}{
			&TestCommandHandler1{},
			&TestCommandHandler2{},
		},
	}
	behaviors := []interface{}{}

	// Then: Should panic during construction
	cqrs.NewMediator(handlers, behaviors)
}

// T038b: Should_ThrowException_When_ConstructorDetectsAmbiguousHandlers
func TestShould_PanicException_When_ConstructorDetectsAmbiguousHandlers(t *testing.T) {
	// Given: 2+ handlers for same command type
	defer func() {
		r := recover()
		if r == nil {
			t.Errorf("Expected panic when ambiguous handlers detected, but no panic occurred")
		} else {
			// Verify panic message includes handler names
			panicMsg, ok := r.(string)
			assert.True(t, ok, "Panic should be a string message")
			assert.Contains(t, panicMsg, "TestCommandHandler1", "Panic should include first handler name")
			assert.Contains(t, panicMsg, "TestCommandHandler2", "Panic should include second handler name")
		}
	}()

	// When: Registering multiple handlers for same command
	handlers := map[string]interface{}{
		"TestCommand": []interface{}{
			&TestCommandHandler1{},
			&TestCommandHandler2{},
		},
	}
	behaviors := []interface{}{}

	// Then: NewMediator should panic with handler names in error message
	cqrs.NewMediator(handlers, behaviors)
}

// Test helper types
type TestCommand struct {
	ID string
}

func (c *TestCommand) IsRequest() {}
func (c *TestCommand) IsCommand() {}

type TestCommandHandler1 struct{}

func (h *TestCommandHandler1) Handle(ctx context.Context, cmd *TestCommand) (struct{}, error) {
	return struct{}{}, nil
}

type TestCommandHandler2 struct{}

func (h *TestCommandHandler2) Handle(ctx context.Context, cmd *TestCommand) (struct{}, error) {
	return struct{}{}, nil
}
