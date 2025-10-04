package cqrs

// Command represents state-changing operations with no return value.
// Commands MUST modify state (otherwise use Query).
// Commands MUST execute within transaction boundary (enforced by UnitOfWork behavior).
// Commands MAY return Result[Unit] for business validation errors.
type Command interface {
	BaseRequest
	// IsCommand is a marker method to identify commands.
	IsCommand()
}

// CommandOf represents state-changing operations with return value.
// Examples: created entity ID, updated version number.
// Commands MUST modify state (otherwise use Query).
// Commands MUST execute within transaction boundary.
// TResult typically Result[TValue] for mixed error handling.
// Return values should be minimal (IDs, counts, versions) not full entities.
type CommandOf[TResult any] interface {
	BaseRequest
	IsCommand()
	// GetResultType returns a zero value of TResult for runtime type checking.
	GetResultType() TResult
}
