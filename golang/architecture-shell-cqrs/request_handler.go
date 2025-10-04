package cqrs

import "context"

// RequestHandler is the base handler interface for processing requests.
// Each request type maps to exactly one handler (enforced at mediator construction).
// Handlers MUST respect context cancellation and terminate early when requested.
// Handlers MUST use Result[T] for business errors, return error for infrastructure errors.
//
// Error Handling Pattern:
//   - Business errors: return Result[T].Failure(), nil
//   - Infrastructure errors: return zero value, error
type RequestHandler[TRequest BaseRequest, TResponse any] interface {
	// Handle processes the request.
	// ctx: Context for cancellation and deadline control
	// request: The request to process
	// Returns: (response, nil) on success, (zero, error) on infrastructure failure
	Handle(ctx context.Context, request TRequest) (TResponse, error)
}
