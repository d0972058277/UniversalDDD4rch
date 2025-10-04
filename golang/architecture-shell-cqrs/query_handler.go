package cqrs

import "context"

// QueryHandler processes read-only queries.
// Queries are read-only operations that do NOT modify state.
// Queries do NOT open transactions (enforced by UnitOfWork behavior).
// TResult typically DTO/projection, not domain entities.
//
// Constraints:
//   - MUST NOT call repository Add/Update/Delete/Save methods
//   - Infrastructure errors (DB timeout, network failure) return error
//   - Business errors (data not found) may return Result.Failure or error depending on query semantics
type QueryHandler[TQuery QueryOf[TResult], TResult any] interface {
	// Handle processes the query and returns TResult.
	// Returns (result, nil) on success, (zero, error) on infrastructure failure.
	Handle(ctx context.Context, query TQuery) (TResult, error)
}
