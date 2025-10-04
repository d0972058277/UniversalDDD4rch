package behaviors

import (
	"context"
	"fmt"
	"log/slog"
	"time"
)

// TelemetryBehavior is a pipeline behavior that logs request execution metrics
//
// Logs request type, duration, status, and exceptions for observability.
// Emits structured logs compatible with centralized log aggregation systems.
//
// Recommended order: 40 (after transaction, to measure handler execution time)
//
// Minimum required fields per NFR-002 and LP-006:
//   - Timestamp (ISO 8601)
//   - Log level (Debug, Info, Warning, Error)
//   - Request type name
//   - Duration (milliseconds)
//   - Status (Success, BusinessFailure, InfrastructureError, Cancelled)
//   - Exception details (if thrown)
//   - TransactionId (for commands, from UnitOfWork if active)
//
// Example:
//
//	behavior := &TelemetryBehavior{Logger: myLogger}
//	mediator := NewMediator(handlers, []interface{}{behavior})
type TelemetryBehavior struct {
	Logger *slog.Logger
}

// Handle executes the telemetry behavior
func (b *TelemetryBehavior) Handle(ctx context.Context, request interface{}, next func() (interface{}, error)) (interface{}, error) {
	// Record start time
	startTime := time.Now()

	requestType := requestTypeName(request)

	// Log request start
	if b.Logger != nil {
		b.Logger.Info("Request started",
			"requestType", requestType,
			"timestamp", startTime.Format(time.RFC3339))
	}

	// Execute handler and capture metrics
	response, err := next()
	duration := time.Since(startTime)

	// Log request completion
	if err != nil {
		// Infrastructure error or panic
		if b.Logger != nil {
			b.Logger.Error("Request failed",
				"requestType", requestType,
				"duration", duration.Milliseconds(),
				"status", "InfrastructureError",
				"error", err)
		}
		return nil, err
	}

	// Check if response is a business failure (Result.Failure)
	if result, ok := response.(interface{ IsFailure() bool }); ok && result.IsFailure() {
		// Business failure - log as warning
		if b.Logger != nil {
			b.Logger.Warn("Request completed with business failure",
				"requestType", requestType,
				"duration", duration.Milliseconds(),
				"status", "BusinessFailure")
		}
	} else {
		// Success
		if b.Logger != nil {
			b.Logger.Info("Request completed successfully",
				"requestType", requestType,
				"duration", duration.Milliseconds(),
				"status", "Success")
		}
	}

	return response, nil
}

// Order returns the execution order for this behavior
func (b *TelemetryBehavior) Order() int {
	return 40
}

// requestTypeName returns the type name of the request
func requestTypeName(request interface{}) string {
	if request == nil {
		return "nil"
	}
	return fmt.Sprintf("%T", request)
}
