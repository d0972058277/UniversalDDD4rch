package cqrs

// QueryOf represents read-only operations with return value.
// Queries MUST NOT modify state (enforced semantically; architecture tests verify no repository writes).
// Queries MUST NOT open transactions (enforced by UnitOfWork behavior).
// TResult typically DTO/projection, not domain entities.
// QueryOf MAY return Result[TResult] if business-level query failures possible (e.g., authorization within handler).
type QueryOf[TResult any] interface {
	BaseRequest
	// IsQuery is a marker method to identify queries.
	IsQuery()
	// GetResultType returns a zero value of TResult for runtime type checking.
	GetResultType() TResult
}
