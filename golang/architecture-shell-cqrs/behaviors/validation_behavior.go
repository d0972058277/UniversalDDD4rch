package behaviors

import (
	"context"
	"fmt"
	"strings"
)

// Validator is the validation abstraction for request payloads
//
// Integrate with validation libraries or implement custom validation logic.
type Validator interface {
	// Validate checks if the request payload is valid
	//
	// Returns validation result with errors if invalid
	Validate(ctx context.Context, request interface{}) (*ValidationResult, error)
}

// ValidationResult represents the result of validation operation
type ValidationResult struct {
	IsValid bool
	Errors  []ValidationError
}

// ValidationError represents an individual validation failure
type ValidationError struct {
	PropertyName   string
	ErrorMessage   string
	AttemptedValue interface{}
}

// ValidationException is the error type thrown when validation fails
//
// Signals that request payload is invalid and pipeline should short-circuit.
type ValidationException struct {
	ValidationErrors []ValidationError
}

func (e *ValidationException) Error() string {
	var messages []string
	for _, err := range e.ValidationErrors {
		messages = append(messages, fmt.Sprintf("%s: %s", err.PropertyName, err.ErrorMessage))
	}
	return fmt.Sprintf("Validation failed: %s", strings.Join(messages, ", "))
}

// ValidationBehavior is a pipeline behavior that validates request payloads
//
// Executes before handler to ensure request data is valid.
// Short-circuits pipeline by returning ValidationException on validation failure.
//
// Recommended order: 10 (execute first to fail fast on invalid data)
//
// Example:
//
//	behavior := &ValidationBehavior{Validator: myValidator}
//	mediator := NewMediator(handlers, []interface{}{behavior})
type ValidationBehavior struct {
	Validator Validator
}

// Handle executes the validation behavior
func (b *ValidationBehavior) Handle(ctx context.Context, request interface{}, next func() (interface{}, error)) (interface{}, error) {
	// Pre-handler validation
	validationResult, err := b.Validator.Validate(ctx, request)
	if err != nil {
		return nil, err
	}

	if !validationResult.IsValid {
		return nil, &ValidationException{ValidationErrors: validationResult.Errors}
	}

	// Continue pipeline
	return next()
}

// Order returns the execution order for this behavior
func (b *ValidationBehavior) Order() int {
	return 10
}
