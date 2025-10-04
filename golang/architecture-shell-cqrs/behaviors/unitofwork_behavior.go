package behaviors

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	cqrs "github.com/universalddd/architecture-shell-cqrs"
)

// IResult is a minimal interface for detecting business failures vs infrastructure failures
//
// This is compatible with Architecture.Core Result monad.
// Implementations should use the full Result type from Architecture.Core.
type IResult interface {
	IsFailure() bool
}

// UnitOfWorkBehavior is a pipeline behavior that manages transaction lifecycle
//
// Opens transaction for commands, commits on success (including Result.Failure business errors),
// rolls back on exceptions. Skips transaction management for queries.
// Reuses active transaction for nested commands.
//
// Recommended order: 30 (after validation and authorization)
//
// Transaction semantics per BR-006, BR-007, BR-008:
//   - BeginTransaction(): Opens new transaction if none active; panics if transaction provider unavailable (fail fast)
//   - Nested commands reuse active transaction (HasActiveTransaction check)
//   - Result.Failure() commits transaction (business rejection is valid state per BR-008)
//   - Panics rollback transaction (infrastructure errors)
//   - Logs TransactionId before rollback for correlation (per BR-002)
//
// Example:
//
//	behavior := &UnitOfWorkBehavior{UnitOfWork: myUnitOfWork, Logger: myLogger}
//	mediator := NewMediator(handlers, []interface{}{behavior})
type UnitOfWorkBehavior struct {
	UnitOfWork cqrs.UnitOfWork
	Logger     *slog.Logger
}

// Handle executes the unit of work behavior
func (b *UnitOfWorkBehavior) Handle(ctx context.Context, request interface{}, next func() (interface{}, error)) (interface{}, error) {
	// Skip transaction management for queries (BR-003)
	if !b.isCommand(request) {
		return next()
	}

	// Reuse active transaction for nested commands (BR-005)
	if b.UnitOfWork.HasActiveTransaction() {
		return next()
	}

	// Begin transaction for commands
	startTime := time.Now()

	// Defer rollback on panic (infrastructure error)
	defer func() {
		if r := recover(); r != nil {
			// Log error with TransactionId before rollback per BR-002
			// This ensures correlation even if rollback itself fails
			duration := time.Since(startTime)
			if b.Logger != nil {
				b.Logger.Error("Request failed - rolling back transaction",
					"requestType", fmt.Sprintf("%T", request),
					"transactionId", b.UnitOfWork.TransactionID(),
					"duration", duration.Milliseconds(),
					"error", r)
			}

			// Rollback transaction
			_ = b.UnitOfWork.Rollback(ctx)

			// Re-panic to propagate error
			panic(r)
		}
	}()

	// Begin transaction
	if err := b.UnitOfWork.BeginTransaction(ctx); err != nil {
		// Transaction provider failure - fail fast per BR-006
		return nil, err
	}

	// Execute handler
	response, err := next()

	if err != nil {
		// Log error with TransactionId before rollback per BR-002
		duration := time.Since(startTime)
		if b.Logger != nil {
			b.Logger.Error("Request failed - rolling back transaction",
				"requestType", fmt.Sprintf("%T", request),
				"transactionId", b.UnitOfWork.TransactionID(),
				"duration", duration.Milliseconds(),
				"error", err)
		}

		// Rollback on error
		_ = b.UnitOfWork.Rollback(ctx)
		return nil, err
	}

	// Commit transaction on success or business failure (BR-008)
	// Result.Failure() indicates business validation failure, not infrastructure error
	if err := b.UnitOfWork.Commit(ctx); err != nil {
		return nil, err
	}

	return response, nil
}

// Order returns the execution order for this behavior
func (b *UnitOfWorkBehavior) Order() int {
	return 30
}

// isCommand checks if request is a command
func (b *UnitOfWorkBehavior) isCommand(request interface{}) bool {
	_, ok := request.(interface{ IsCommand() })
	return ok
}
