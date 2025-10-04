package cqrs

import "context"

// UnitOfWork represents transaction boundary abstraction for commands.
//
// Transaction Semantics:
//   - Commands open transactions via BeginTransaction()
//   - Queries do NOT open transactions (BR-003)
//   - Nested commands reuse active transaction (no nested transaction opening)
//   - Commit occurs on successful handler completion (including Result.Failure business errors)
//   - Rollback occurs on error (infrastructure errors only)
//
// Implementation Notes:
//   - Transaction context propagates via context.Context values
//   - BeginTransaction() throws if transaction provider unavailable (fail fast per BR-006)
type UnitOfWork interface {
	// TransactionID returns the unique identifier for the current transaction.
	// Used for correlation in telemetry logs per NFR-002.
	TransactionID() string

	// HasActiveTransaction indicates whether a transaction is currently active.
	// Used by UnitOfWork behavior to detect nested commands and reuse existing transaction.
	HasActiveTransaction() bool

	// BeginTransaction begins a new transaction.
	// Returns error if transaction provider unavailable (connection pool exhaustion, database down).
	// Fail-fast behavior per BR-006.
	BeginTransaction(ctx context.Context) error

	// Commit commits the current transaction.
	// Called on successful handler completion (including Result.Failure business errors per BR-008).
	// Returns error if commit fails (e.g., constraint violation, deadlock).
	Commit(ctx context.Context) error

	// Rollback rolls back the current transaction.
	// Called on error (infrastructure errors, handler panics).
	// Returns error if rollback fails (should be logged but not re-thrown).
	Rollback(ctx context.Context) error
}
