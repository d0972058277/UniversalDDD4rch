package cqrs

import "context"

// Mediator is the single entry point for sending commands and queries.
// Routes requests to registered handlers via pipeline behaviors.
//
// Behavior:
//  1. Resolve handler for request type (panic if zero or multiple handlers registered per FR-008)
//  2. Resolve applicable pipeline behaviors (filtered by type guards)
//  3. Build behavior chain in configured order
//  4. Execute pipeline → behaviors wrap handler execution
//  5. Return result or propagate error
//
// Constraints:
//   - Handler resolution MUST occur at mediator construction time (not runtime reflection)
//   - Pipeline construction MUST happen per-request (behaviors may be stateful per request)
type Mediator interface {
	// Send sends a request through the pipeline.
	// Returns (response, nil) on success, (zero, error) on failure.
	// Infrastructure errors propagate as errors.
	// Business errors should be wrapped in Result[T].Failure() returned as response.
	Send(ctx context.Context, request BaseRequest) (interface{}, error)
}
