package cqrs

import "context"

// CommandHandler processes commands with no return value.
// Commands are state-changing operations that execute within a transaction boundary.
// Return type is struct{} (equivalent to Unit/void in other languages).
type CommandHandler[TCommand Command] interface {
	// Handle processes the command.
	// Returns struct{} on success, error on infrastructure failure.
	// Business validation errors should return via Result[struct{}].
	Handle(ctx context.Context, command TCommand) (struct{}, error)
}

// CommandHandlerOf processes commands with return value.
// Commands are state-changing operations that execute within a transaction boundary.
// TResult typically contains minimal data (IDs, counts, versions) not full entities.
type CommandHandlerOf[TCommand CommandOf[TResult], TResult any] interface {
	// Handle processes the command and returns TResult.
	// Returns (result, nil) on success, (zero, error) on infrastructure failure.
	// Business validation errors should return via Result[TResult].
	Handle(ctx context.Context, command TCommand) (TResult, error)
}
