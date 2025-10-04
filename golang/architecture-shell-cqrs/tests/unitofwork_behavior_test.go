package tests

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/universalddd/architecture-shell-cqrs"
)

// T054: Should_CallBeginTransaction_When_CommandExecutes
func TestShould_CallBeginTransaction_When_CommandExecutes(t *testing.T) {
	// Given: Mock UnitOfWork and command
	mockUnitOfWork := &MockUnitOfWork{
		transactionID:        uuid.New().String(),
		hasActiveTransaction: false,
		beginCalled:          false,
	}

	command := &TransactionTestCommand{ID: "tx-test-1"}
	handler := &TransactionTestCommandHandler{}

	handlers := map[string]interface{}{
		"TransactionTestCommand": handler,
	}

	// UnitOfWork behavior will be implemented in Phase 3.4
	uowBehavior := &MockUnitOfWorkBehavior{unitOfWork: mockUnitOfWork}
	behaviors := []interface{}{uowBehavior}

	mediator := cqrs.NewMediator(handlers, behaviors)
	ctx := context.Background()

	// When: Command executes
	_, err := mediator.Send(ctx, command)

	// Then: BeginTransaction should be called
	assert.NoError(t, err)
	assert.True(t, mockUnitOfWork.beginCalled, "BeginTransaction should have been called")
}

// T059: Should_ReuseTransaction_When_NestedCommandExecuted
func TestShould_ReuseTransaction_When_NestedCommandExecuted(t *testing.T) {
	// Given: Active transaction and nested command
	mockUnitOfWork := &MockUnitOfWork{
		transactionID:        uuid.New().String(),
		hasActiveTransaction: true, // Already has active transaction
		beginCalled:          false,
	}

	command := &NestedTransactionCommand{ID: "nested-tx-1"}
	handler := &NestedTransactionCommandHandler{}

	handlers := map[string]interface{}{
		"NestedTransactionCommand": handler,
	}

	uowBehavior := &MockNestedUnitOfWorkBehavior{unitOfWork: mockUnitOfWork}
	behaviors := []interface{}{uowBehavior}

	mediator := cqrs.NewMediator(handlers, behaviors)
	ctx := context.Background()

	// When: Nested command executes
	_, err := mediator.Send(ctx, command)

	// Then: BeginTransaction should NOT be called (reuse existing)
	assert.NoError(t, err)
	assert.False(t, mockUnitOfWork.beginCalled, "BeginTransaction should NOT be called for nested command")
}

// Test helper types
type TransactionTestCommand struct {
	ID string
}

func (c *TransactionTestCommand) IsRequest() {}
func (c *TransactionTestCommand) IsCommand() {}

type TransactionTestCommandHandler struct{}

func (h *TransactionTestCommandHandler) Handle(ctx context.Context, cmd *TransactionTestCommand) (interface{}, error) {
	return struct{}{}, nil
}

type NestedTransactionCommand struct {
	ID string
}

func (c *NestedTransactionCommand) IsRequest() {}
func (c *NestedTransactionCommand) IsCommand() {}

type NestedTransactionCommandHandler struct{}

func (h *NestedTransactionCommandHandler) Handle(ctx context.Context, cmd *NestedTransactionCommand) (interface{}, error) {
	return struct{}{}, nil
}

// Mock UnitOfWork for testing
type MockUnitOfWork struct {
	transactionID        string
	hasActiveTransaction bool
	beginCalled          bool
	commitCalled         bool
	rollbackCalled       bool
}

func (m *MockUnitOfWork) TransactionID() string {
	return m.transactionID
}

func (m *MockUnitOfWork) HasActiveTransaction() bool {
	return m.hasActiveTransaction
}

func (m *MockUnitOfWork) BeginTransaction(ctx context.Context) error {
	m.beginCalled = true
	m.hasActiveTransaction = true
	return nil
}

func (m *MockUnitOfWork) Commit(ctx context.Context) error {
	m.commitCalled = true
	m.hasActiveTransaction = false
	return nil
}

func (m *MockUnitOfWork) Rollback(ctx context.Context) error {
	m.rollbackCalled = true
	m.hasActiveTransaction = false
	return nil
}

// Mock UnitOfWorkBehavior for testing
type MockUnitOfWorkBehavior struct {
	unitOfWork *MockUnitOfWork
}

func (b *MockUnitOfWorkBehavior) Handle(ctx context.Context, request interface{}, next func() (interface{}, error)) (interface{}, error) {
	// Check for existing transaction
	if !b.unitOfWork.HasActiveTransaction() {
		if err := b.unitOfWork.BeginTransaction(ctx); err != nil {
			return nil, err
		}
	}

	// Execute handler
	result, err := next()

	if err != nil {
		b.unitOfWork.Rollback(ctx)
		return nil, err
	}

	b.unitOfWork.Commit(ctx)
	return result, nil
}

func (b *MockUnitOfWorkBehavior) Order() int {
	return 30
}

// Mock UnitOfWorkBehavior for nested transaction testing
type MockNestedUnitOfWorkBehavior struct {
	unitOfWork *MockUnitOfWork
}

func (b *MockNestedUnitOfWorkBehavior) Handle(ctx context.Context, request interface{}, next func() (interface{}, error)) (interface{}, error) {
	// Check for existing transaction
	if !b.unitOfWork.HasActiveTransaction() {
		if err := b.unitOfWork.BeginTransaction(ctx); err != nil {
			return nil, err
		}
	}

	// Execute handler
	result, err := next()

	if err != nil {
		b.unitOfWork.Rollback(ctx)
		return nil, err
	}

	b.unitOfWork.Commit(ctx)
	return result, nil
}

func (b *MockNestedUnitOfWorkBehavior) Order() int {
	return 30
}

// T218: Should_ThrowException_When_TransactionProviderFails
// Validates that UnitOfWork fails fast when transaction provider unavailable (BR-006)
func TestShould_ThrowException_When_TransactionProviderFails(t *testing.T) {
	// Given: UnitOfWork that fails to begin transaction (DB unavailable, connection pool exhausted)
	mockUnitOfWork := &FailingMockUnitOfWork{
		shouldFailBeginTransaction: true,
		failureMessage:             "Connection pool exhausted",
	}

	command := &TransactionProviderFailureCommand{ID: "tx-fail-1"}
	handler := &TransactionProviderFailureCommandHandler{}

	handlers := map[string]interface{}{
		"*tests.TransactionProviderFailureCommand": handler,
	}

	// Use behavior that propagates transaction provider failures
	behaviors := []interface{}{
		&FailingUnitOfWorkBehavior{unitOfWork: mockUnitOfWork},
	}

	mediator := cqrs.NewMediator(handlers, behaviors)
	ctx := context.Background()

	// When: Command attempts to execute with failing transaction provider
	result, err := mediator.Send(ctx, command)

	// Then: Exception should propagate (fail-fast per BR-006)
	assert.Error(t, err, "Should return error when transaction provider fails")
	assert.Nil(t, result, "Should not return result when transaction fails to begin")
	assert.Contains(t, err.Error(), "Connection pool exhausted", "Error should contain failure message")
	assert.False(t, handler.Executed, "Handler should not execute when transaction fails to begin")
}

// FailingMockUnitOfWork simulates transaction provider failures
type FailingMockUnitOfWork struct {
	shouldFailBeginTransaction bool
	failureMessage             string
	transactionID              string
	hasActiveTransaction       bool
}

func (m *FailingMockUnitOfWork) TransactionID() string {
	return m.transactionID
}

func (m *FailingMockUnitOfWork) HasActiveTransaction() bool {
	return m.hasActiveTransaction
}

func (m *FailingMockUnitOfWork) BeginTransaction(ctx context.Context) error {
	if m.shouldFailBeginTransaction {
		return &TransactionProviderError{Message: m.failureMessage}
	}
	m.hasActiveTransaction = true
	return nil
}

func (m *FailingMockUnitOfWork) Commit(ctx context.Context) error {
	m.hasActiveTransaction = false
	return nil
}

func (m *FailingMockUnitOfWork) Rollback(ctx context.Context) error {
	m.hasActiveTransaction = false
	return nil
}

// TransactionProviderError simulates infrastructure errors
type TransactionProviderError struct {
	Message string
}

func (e *TransactionProviderError) Error() string {
	return e.Message
}

// FailingUnitOfWorkBehavior behavior that propagates transaction provider failures
type FailingUnitOfWorkBehavior struct {
	unitOfWork *FailingMockUnitOfWork
}

func (b *FailingUnitOfWorkBehavior) Handle(ctx context.Context, request interface{}, next func() (interface{}, error)) (interface{}, error) {
	// Check if request is a command
	if _, isCommand := request.(interface{ IsCommand() }); !isCommand {
		return next()
	}

	// Check for existing transaction
	if !b.unitOfWork.HasActiveTransaction() {
		if err := b.unitOfWork.BeginTransaction(ctx); err != nil {
			// Fail fast - propagate transaction provider error
			return nil, err
		}
	}

	// Execute handler
	result, err := next()

	if err != nil {
		b.unitOfWork.Rollback(ctx)
		return nil, err
	}

	b.unitOfWork.Commit(ctx)
	return result, nil
}

func (b *FailingUnitOfWorkBehavior) Order() int {
	return 30
}

// Test command types for transaction provider failure testing
type TransactionProviderFailureCommand struct {
	ID string
}

func (c *TransactionProviderFailureCommand) IsRequest() {}
func (c *TransactionProviderFailureCommand) IsCommand() {}

type TransactionProviderFailureCommandHandler struct {
	Executed bool
}

func (h *TransactionProviderFailureCommandHandler) Handle(ctx context.Context, cmd *TransactionProviderFailureCommand) (interface{}, error) {
	h.Executed = true
	return struct{}{}, nil
}
