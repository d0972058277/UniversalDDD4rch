package cqrs

import (
	"context"
	"fmt"
	"reflect"
	"sort"
)

// handlerEntry stores handler function and metadata
type handlerEntry struct {
	handler      interface{}
	handlerType  reflect.Type
	handlerName  string
	requestType  reflect.Type
	responseType reflect.Type
}

// behaviorEntry stores behavior and its matcher
type behaviorEntry struct {
	behavior interface{}
	matcher  BehaviorMatcher
	order    int
}

// mediatorImpl implements the Mediator interface.
type mediatorImpl struct {
	handlers  map[reflect.Type]*handlerEntry
	behaviors []behaviorEntry
}

// NewMediator creates a new Mediator instance.
// Validates that exactly one handler is registered per request type (panic if zero or multiple per FR-008).
// handlers: Map of request type name to handler instance
// behaviors: List of pipeline behaviors
//
// Panics if:
//   - Zero handlers registered for any expected request type
//   - Multiple handlers registered for the same request type (ambiguous routing)
//   - Handler does not implement correct interface
func NewMediator(handlers map[string]interface{}, behaviors []interface{}) Mediator {
	m := &mediatorImpl{
		handlers:  make(map[reflect.Type]*handlerEntry),
		behaviors: make([]behaviorEntry, 0),
	}

	// Validate that at least one handler is registered
	if len(handlers) == 0 {
		panic("No handlers registered - mediator requires at least one handler")
	}

	// Register handlers and validate uniqueness
	handlersByType := make(map[reflect.Type][]string)

	for requestTypeName, handler := range handlers {
		// Check if handler is a slice (multiple handlers for same type)
		handlerValue := reflect.ValueOf(handler)
		if handlerValue.Kind() == reflect.Slice {
			// Multiple handlers detected - extract handler names and panic
			handlerNames := make([]string, handlerValue.Len())
			for i := 0; i < handlerValue.Len(); i++ {
				elem := handlerValue.Index(i).Interface()
				elemType := reflect.TypeOf(elem)
				// Handle pointer types - get the element type
				if elemType.Kind() == reflect.Ptr {
					elemType = elemType.Elem()
				}
				handlerNames[i] = elemType.Name()
			}
			panic(fmt.Sprintf("Ambiguous handler registration for %s: multiple handlers registered %v",
				requestTypeName, handlerNames))
		}

		handlerType := reflect.TypeOf(handler)
		if handlerType == nil {
			panic(fmt.Sprintf("Handler for %s is nil", requestTypeName))
		}

		// Extract request and response types from handler
		// Handler should have Handle(ctx context.Context, request T) (R, error) method
		handleMethod, ok := handlerType.MethodByName("Handle")
		if !ok {
			panic(fmt.Sprintf("Handler %s does not have Handle method", handlerType.Name()))
		}

		methodType := handleMethod.Type
		if methodType.NumIn() != 3 { // receiver, context, request
			panic(fmt.Sprintf("Handler %s.Handle must have signature Handle(ctx, request)", handlerType.Name()))
		}

		// Get request type (second parameter after receiver and context)
		requestType := methodType.In(2)

		// Check for duplicate handlers
		handlersByType[requestType] = append(handlersByType[requestType], handlerType.Name())

		if len(handlersByType[requestType]) > 1 {
			panic(fmt.Sprintf("Ambiguous handler registration for %s: multiple handlers registered [%v]",
				requestType.Name(), handlersByType[requestType]))
		}

		// Get response type (first return value)
		if methodType.NumOut() != 2 { // response, error
			panic(fmt.Sprintf("Handler %s.Handle must return (response, error)", handlerType.Name()))
		}
		responseType := methodType.Out(0)

		m.handlers[requestType] = &handlerEntry{
			handler:      handler,
			handlerType:  handlerType,
			handlerName:  handlerType.Name(),
			requestType:  requestType,
			responseType: responseType,
		}
	}

	// Register behaviors
	for _, behavior := range behaviors {
		behaviorValue := reflect.ValueOf(behavior)
		behaviorType := behaviorValue.Type()

		// Get Order() method
		orderMethod := behaviorValue.MethodByName("Order")
		if !orderMethod.IsValid() {
			panic(fmt.Sprintf("Behavior %s does not have Order() method", behaviorType.Name()))
		}
		orderResults := orderMethod.Call(nil)
		order := int(orderResults[0].Int())

		// Default matcher: AllRequestsMatcher
		matcher := BehaviorMatcher(&AllRequestsMatcher{})

		m.behaviors = append(m.behaviors, behaviorEntry{
			behavior: behavior,
			matcher:  matcher,
			order:    order,
		})
	}

	// Sort behaviors by order (lower values execute first)
	sort.Slice(m.behaviors, func(i, j int) bool {
		return m.behaviors[i].order < m.behaviors[j].order
	})

	return m
}

// Send implements Mediator.Send
func (m *mediatorImpl) Send(ctx context.Context, request BaseRequest) (interface{}, error) {
	requestType := reflect.TypeOf(request)

	// Find handler for request type
	entry, ok := m.handlers[requestType]
	if !ok {
		return nil, fmt.Errorf("no handler registered for request type %s", requestType.Name())
	}

	// Build pipeline with applicable behaviors
	var pipeline RequestHandlerDelegate[interface{}]

	// Final handler invocation
	pipeline = func() (interface{}, error) {
		handlerValue := reflect.ValueOf(entry.handler)
		handleMethod := handlerValue.MethodByName("Handle")

		// Call handler
		results := handleMethod.Call([]reflect.Value{
			reflect.ValueOf(ctx),
			reflect.ValueOf(request),
		})

		// Extract response and error
		response := results[0].Interface()
		var err error
		if !results[1].IsNil() {
			err = results[1].Interface().(error)
		}

		return response, err
	}

	// Wrap pipeline with behaviors (in reverse order so first behavior executes first)
	for i := len(m.behaviors) - 1; i >= 0; i-- {
		behaviorEntry := m.behaviors[i]

		// Check if behavior applies to this request type
		if !behaviorEntry.matcher.Matches(request) {
			continue
		}

		// Capture current pipeline for closure
		currentPipeline := pipeline
		currentBehavior := behaviorEntry.behavior

		// Wrap pipeline with behavior
		pipeline = func() (interface{}, error) {
			behaviorValue := reflect.ValueOf(currentBehavior)
			handleMethod := behaviorValue.MethodByName("Handle")

			// Create delegate function for next
			nextDelegate := reflect.MakeFunc(
				reflect.TypeOf((*func() (interface{}, error))(nil)).Elem(),
				func(args []reflect.Value) []reflect.Value {
					result, err := currentPipeline()
					var errValue reflect.Value
					if err != nil {
						errValue = reflect.ValueOf(err)
					} else {
						errValue = reflect.Zero(reflect.TypeOf((*error)(nil)).Elem())
					}
					return []reflect.Value{
						reflect.ValueOf(result),
						errValue,
					}
				},
			)

			// Call behavior
			results := handleMethod.Call([]reflect.Value{
				reflect.ValueOf(ctx),
				reflect.ValueOf(request),
				nextDelegate,
			})

			// Extract response and error
			response := results[0].Interface()
			var err error
			if !results[1].IsNil() {
				err = results[1].Interface().(error)
			}

			return response, err
		}
	}

	// Execute final pipeline
	return pipeline()
}
