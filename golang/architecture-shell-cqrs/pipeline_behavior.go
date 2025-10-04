package cqrs

import "context"

// RequestHandlerDelegate represents the next step in the pipeline (next behavior or handler).
// Returns (response, nil) on success, (zero, error) on failure.
type RequestHandlerDelegate[TResponse any] func() (TResponse, error)

// PipelineBehavior represents a pipeline behavior for cross-cutting concerns.
// Wraps handler execution with pre/post logic.
//
// Common Behaviors:
//   - ValidationBehavior: Validates request payload; returns error on validation failure (short-circuits pipeline)
//   - AuthorizationBehavior: Checks permissions; returns error if denied
//   - UnitOfWorkBehavior: Opens transaction for commands; detects active transaction for nested commands; commits on success, rolls back on error
//   - CachingBehavior: Checks cache for queries; returns cached value on hit, executes handler on miss
//   - TelemetryBehavior: Logs request type, duration, status, errors
//   - ResilienceBehavior: Wraps handler with retry/timeout/circuit breaker logic
//
// Constraints:
//   - Behaviors execute in configured order (default: Validation → Authorization → Transaction → Telemetry → Resilience)
//   - Behaviors MAY short-circuit pipeline by returning error or returning early
//   - Behaviors MUST call next() to continue pipeline unless explicitly short-circuiting
type PipelineBehavior[TRequest BaseRequest, TResponse any] interface {
	// Handle executes cross-cutting logic before/after calling next.
	// ctx: Context for cancellation and deadline control
	// request: The request being processed
	// next: The next behavior or final handler in the pipeline
	// Returns: (response, nil) on success, (zero, error) on failure
	Handle(
		ctx context.Context,
		request TRequest,
		next RequestHandlerDelegate[TResponse],
	) (TResponse, error)

	// Order returns the execution order (lower values execute first).
	// Default: 100
	// Recommended: Validation=10, Authorization=20, Transaction=30, Telemetry=40, Caching=50, Resilience=60
	Order() int
}
