// Architecture.Shell.Cqrs - Go Interface Contracts
// Language: Go 1.21+
// Purpose: Core CQRS abstractions for mediator pattern implementation
// Dependencies: Standard library only (context package for cancellation)

package cqrs

import (
	"context"
)

// BaseRequest is the common ancestor for all application-layer requests.
// Enables uniform pipeline processing for commands, queries, and future request types.
type BaseRequest interface {
	// IsRequest is a marker method to identify base requests.
	IsRequest()
}

// BaseRequestOf represents requests that return a value.
// Used by queries and commands with return values.
type BaseRequestOf[TResult any] interface {
	BaseRequest
	// GetResultType returns the type of TResult for runtime type checking.
	GetResultType() TResult
}

// Command represents state-changing operations with no return value.
// Executes within transaction boundary.
type Command interface {
	BaseRequest
	// IsCommand is a marker method to identify commands.
	IsCommand()
}

// CommandOf represents state-changing operations with return value.
// Executes within transaction boundary.
type CommandOf[TResult any] interface {
	BaseRequestOf[TResult]
	IsCommand()
}

// Query represents read-only operations with return value.
// Executes WITHOUT transaction; may use caching.
type Query[TResult any] interface {
	BaseRequestOf[TResult]
	// IsQuery is a marker method to identify queries.
	IsQuery()
}

// RequestHandler is the base handler interface for processing requests.
// Business errors return (result, nil); infrastructure errors return (zero, error).
type RequestHandler[TRequest BaseRequest, TResponse any] interface {
	// Handle processes the request.
	// Business errors: return Result[T].Failure(), nil
	// Infrastructure errors: return zero value, error
	Handle(ctx context.Context, request TRequest) (TResponse, error)
}

// CommandHandler processes commands with no return value.
type CommandHandler[TCommand Command] interface {
	RequestHandler[TCommand, struct{}]
}

// CommandHandlerOf processes commands with return value.
type CommandHandlerOf[TCommand CommandOf[TResult], TResult any] interface {
	RequestHandler[TCommand, TResult]
}

// QueryHandler processes read-only queries.
type QueryHandler[TQuery Query[TResult], TResult any] interface {
	RequestHandler[TQuery, TResult]
}

// Mediator is the single entry point for sending commands and queries.
// Routes requests to registered handlers via pipeline behaviors.
type Mediator interface {
	// Send sends a request with return value through the pipeline.
	Send(ctx context.Context, request BaseRequest) (interface{}, error)

	// SendTyped sends a typed request through the pipeline.
	SendTyped[TResponse any](ctx context.Context, request BaseRequestOf[TResponse]) (TResponse, error)
}

// RequestHandlerDelegate represents the next step in the pipeline (next behavior or handler).
type RequestHandlerDelegate[TResponse any] func() (TResponse, error)

// PipelineBehavior represents a pipeline behavior for cross-cutting concerns.
// Wraps handler execution with pre/post logic.
type PipelineBehavior[TRequest BaseRequest, TResponse any] interface {
	// Handle executes cross-cutting logic before/after calling next.
	Handle(
		ctx context.Context,
		request TRequest,
		next RequestHandlerDelegate[TResponse],
	) (TResponse, error)

	// Order returns the execution order (lower values execute first).
	// Default: 100. Recommended: Validation=10, Authorization=20, Transaction=30, Telemetry=40, Resilience=50
	Order() int
}

// UnitOfWork represents transaction boundary abstraction for commands.
type UnitOfWork interface {
	// TransactionID returns the unique identifier for the current transaction.
	TransactionID() string

	// HasActiveTransaction indicates whether a transaction is currently active.
	HasActiveTransaction() bool

	// BeginTransaction begins a new transaction.
	// Returns error if transaction provider unavailable (fail fast).
	BeginTransaction(ctx context.Context) error

	// Commit commits the current transaction.
	// Called on successful handler completion (including Result.Failure business errors).
	Commit(ctx context.Context) error

	// Rollback rolls back the current transaction.
	// Called on error (infrastructure errors).
	Rollback(ctx context.Context) error
}

// BehaviorMatcher determines which behaviors apply to which request types.
type BehaviorMatcher interface {
	// Matches returns true if this behavior should execute for the given request type.
	Matches(request BaseRequest) bool
}

// CommandOnlyMatcher is a predefined matcher for commands only.
type CommandOnlyMatcher struct{}

// Matches implements BehaviorMatcher.
func (m *CommandOnlyMatcher) Matches(request BaseRequest) bool {
	_, isCommand := request.(interface{ IsCommand() })
	return isCommand
}

// QueryOnlyMatcher is a predefined matcher for queries only.
type QueryOnlyMatcher struct{}

// Matches implements BehaviorMatcher.
func (m *QueryOnlyMatcher) Matches(request BaseRequest) bool {
	_, isQuery := request.(interface{ IsQuery() })
	return isQuery
}

// AllRequestsMatcher is a predefined matcher for all requests.
type AllRequestsMatcher struct{}

// Matches implements BehaviorMatcher.
func (m *AllRequestsMatcher) Matches(request BaseRequest) bool {
	return true
}

// Helper type assertions for compile-time validation
var (
	_ BaseRequest = (*Command)(nil)
	_ BehaviorMatcher = (*CommandOnlyMatcher)(nil)
	_ BehaviorMatcher = (*QueryOnlyMatcher)(nil)
	_ BehaviorMatcher = (*AllRequestsMatcher)(nil)
)

// IsCommand checks if a request is a command.
func IsCommand(request BaseRequest) bool {
	_, ok := request.(interface{ IsCommand() })
	return ok
}

// IsQuery checks if a request is a query.
func IsQuery(request BaseRequest) bool {
	_, ok := request.(interface{ IsQuery() })
	return ok
}