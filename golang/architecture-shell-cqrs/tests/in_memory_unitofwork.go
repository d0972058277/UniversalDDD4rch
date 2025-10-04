package tests

import (
	"context"

	"github.com/google/uuid"
)

// InMemoryUnitOfWork is a test implementation of UnitOfWork for testing
//
// Provides transaction management for in-memory test scenarios.
// Does not persist data - used only for behavioral testing.
type InMemoryUnitOfWork struct {
	transactionID        string
	hasActiveTransaction bool
	isCommitted          bool
	isRolledBack         bool
}

// NewInMemoryUnitOfWork creates a new in-memory unit of work
func NewInMemoryUnitOfWork() *InMemoryUnitOfWork {
	return &InMemoryUnitOfWork{
		transactionID:        "",
		hasActiveTransaction: false,
		isCommitted:          false,
		isRolledBack:         false,
	}
}

// TransactionID returns the current transaction ID
func (u *InMemoryUnitOfWork) TransactionID() string {
	return u.transactionID
}

// HasActiveTransaction returns true if a transaction is currently active
func (u *InMemoryUnitOfWork) HasActiveTransaction() bool {
	return u.hasActiveTransaction
}

// BeginTransaction starts a new transaction
func (u *InMemoryUnitOfWork) BeginTransaction(ctx context.Context) error {
	if u.hasActiveTransaction {
		// Don't start nested transactions
		return nil
	}

	u.transactionID = uuid.New().String()
	u.hasActiveTransaction = true
	u.isCommitted = false
	u.isRolledBack = false

	return nil
}

// Commit commits the current transaction
func (u *InMemoryUnitOfWork) Commit(ctx context.Context) error {
	if !u.hasActiveTransaction {
		return nil
	}

	u.isCommitted = true
	u.hasActiveTransaction = false

	return nil
}

// Rollback rolls back the current transaction
func (u *InMemoryUnitOfWork) Rollback(ctx context.Context) error {
	if !u.hasActiveTransaction {
		return nil
	}

	u.isRolledBack = true
	u.hasActiveTransaction = false

	return nil
}

// IsCommitted returns true if the transaction was committed (for testing)
func (u *InMemoryUnitOfWork) IsCommitted() bool {
	return u.isCommitted
}

// IsRolledBack returns true if the transaction was rolled back (for testing)
func (u *InMemoryUnitOfWork) IsRolledBack() bool {
	return u.isRolledBack
}

// Reset resets the unit of work state (for testing)
func (u *InMemoryUnitOfWork) Reset() {
	u.transactionID = ""
	u.hasActiveTransaction = false
	u.isCommitted = false
	u.isRolledBack = false
}
