package cqrs

// WireCqrs creates a fully configured Mediator instance with registered handlers and behaviors
//
// This function provides a convenient way to wire up the CQRS mediator with all required components.
// Note: To avoid import cycles, behaviors must be created and configured externally.
//
// Behavior Execution Order (per spec.md BR-004):
//  1. Validation (order: 10) - Fail fast on invalid payloads
//  2. Authorization (order: 20) - Verify permissions before business logic
//  3. UnitOfWork/Transaction (order: 30) - Open transaction after validation/authorization
//  4. Telemetry (order: 40) - Measure handler execution time
//  5. Caching (order: 50, queries only) - Return cached results or write-through
//
// Example usage with behaviors package:
//
//	import "github.com/universalddd/architecture-shell-cqrs/behaviors"
//
//	mediator := cqrs.WireCqrs(
//		map[string]interface{}{
//			"CreateOrderCommand": &CreateOrderHandler{},
//			"GetOrderDetailsQuery": &GetOrderDetailsHandler{},
//		},
//		[]interface{}{
//			&behaviors.ValidationBehavior{Validator: myValidator},
//			&behaviors.UnitOfWorkBehavior{UnitOfWork: myUnitOfWork},
//			&behaviors.TelemetryBehavior{Logger: myLogger},
//		},
//	)
//
// Panics if:
//   - No handlers registered (handlers map is empty)
//   - Handler registration is ambiguous (multiple handlers for same request type)
func WireCqrs(handlers map[string]interface{}, behaviors []interface{}) Mediator {
	if len(handlers) == 0 {
		panic("No handlers registered - at least one handler is required")
	}

	// Create mediator with handlers and behaviors
	// NewMediator validates handler uniqueness and panics if zero or multiple handlers per type
	return NewMediator(handlers, behaviors)
}

// WireCqrsWithDefaults creates a Mediator with default configuration (no behaviors)
//
// Use this function when you want to manually configure behaviors or only need basic mediator functionality.
//
// Example:
//
//	mediator := WireCqrsWithDefaults(map[string]interface{}{
//		"CreateOrderCommand": &CreateOrderHandler{},
//	})
func WireCqrsWithDefaults(handlers map[string]interface{}) Mediator {
	return WireCqrs(handlers, []interface{}{})
}
