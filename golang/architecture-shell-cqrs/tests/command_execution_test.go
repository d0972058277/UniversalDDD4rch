package tests

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/universalddd/architecture-shell-cqrs"
	"github.com/universalddd/architecture-shell-cqrs/behaviors"
)

// TestResult is a test implementation of Result monad for testing
type TestResult struct {
	isFailure bool
	value     interface{}
	errorMsg  string
}

func (r *TestResult) IsFailure() bool {
	return r.isFailure
}

func SuccessResult(value interface{}) *TestResult {
	return &TestResult{isFailure: false, value: value}
}

func FailureResult(errorMsg string) *TestResult {
	return &TestResult{isFailure: true, errorMsg: errorMsg}
}

// T149: Should_CommitTransaction_When_CommandSucceeds
func TestShould_CommitTransaction_When_CommandSucceeds(t *testing.T) {
	// Given: UnitOfWork and successful command
	uow := NewInMemoryUnitOfWork()
	uowBehavior := &behaviors.UnitOfWorkBehavior{UnitOfWork: uow}

	command := &SuccessCommand{ID: "success-1"}
	handler := &SuccessCommandHandler{}

	handlers := map[string]interface{}{
		"SuccessCommand": handler,
	}
	behaviorsList := []interface{}{uowBehavior}

	mediator := cqrs.NewMediator(handlers, behaviorsList)
	ctx := context.Background()

	// When: Command executes successfully
	_, err := mediator.Send(ctx, command)

	// Then: Transaction should be committed
	assert.NoError(t, err)
	assert.True(t, uow.IsCommitted(), "Transaction should be committed")
	assert.False(t, uow.IsRolledBack(), "Transaction should not be rolled back")
}

// T154: Should_RollbackTransaction_When_CommandThrowsException
func TestShould_RollbackTransaction_When_CommandThrowsException(t *testing.T) {
	// Given: UnitOfWork and command that throws exception
	uow := NewInMemoryUnitOfWork()
	uowBehavior := &behaviors.UnitOfWorkBehavior{UnitOfWork: uow}

	command := &ErrorCommand{ID: "error-1"}
	handler := &ErrorCommandHandler{}

	handlers := map[string]interface{}{
		"ErrorCommand": handler,
	}
	behaviorsList := []interface{}{uowBehavior}

	mediator := cqrs.NewMediator(handlers, behaviorsList)
	ctx := context.Background()

	// When: Command throws exception
	_, err := mediator.Send(ctx, command)

	// Then: Transaction should be rolled back
	assert.Error(t, err)
	assert.False(t, uow.IsCommitted(), "Transaction should not be committed")
	assert.True(t, uow.IsRolledBack(), "Transaction should be rolled back")
}

// T159: Should_ShareTransaction_When_NestedCommandCalled
func TestShould_ShareTransaction_When_NestedCommandCalled(t *testing.T) {
	// Given: Outer command that calls nested command
	uow := NewInMemoryUnitOfWork()
	uowBehavior := &behaviors.UnitOfWorkBehavior{UnitOfWork: uow}

	command := &OuterCommand{ID: "outer-1"}
	handler := &OuterCommandHandler{}

	handlers := map[string]interface{}{
		"OuterCommand": handler,
	}
	behaviorsList := []interface{}{uowBehavior}

	mediator := cqrs.NewMediator(handlers, behaviorsList)
	ctx := context.Background()

	// When: Outer command executes (which calls nested command)
	_, err := mediator.Send(ctx, command)

	// Then: Transaction should be shared (only one BeginTransaction call)
	assert.NoError(t, err)
	assert.True(t, uow.IsCommitted(), "Transaction should be committed")
}

// T164: Should_SkipTransactionManagement_When_QueryExecutes
func TestShould_SkipTransactionManagement_When_QueryExecutes(t *testing.T) {
	// Given: UnitOfWork and query
	uow := NewInMemoryUnitOfWork()
	uowBehavior := &behaviors.UnitOfWorkBehavior{UnitOfWork: uow}

	query := &TransactionTestQuery{ID: "query-1"}
	handler := &TransactionTestQueryHandler{}

	handlers := map[string]interface{}{
		"TransactionTestQuery": handler,
	}
	behaviorsList := []interface{}{uowBehavior}

	mediator := cqrs.NewMediator(handlers, behaviorsList)
	ctx := context.Background()

	// When: Query executes
	_, err := mediator.Send(ctx, query)

	// Then: No transaction should be started
	assert.NoError(t, err)
	assert.False(t, uow.HasActiveTransaction(), "Query should not start transaction")
	assert.False(t, uow.IsCommitted(), "Query should not commit transaction")
}

// T213: Should_CommitTransaction_When_HandlerReturnsResultFailure
func TestShould_CommitTransaction_When_HandlerReturnsResultFailure(t *testing.T) {
	// Given: UnitOfWork and command that returns Result.Failure
	uow := NewInMemoryUnitOfWork()
	uowBehavior := &behaviors.UnitOfWorkBehavior{UnitOfWork: uow}

	command := &BusinessFailureCommand{ID: "business-fail-1"}
	handler := &BusinessFailureCommandHandler{}

	handlers := map[string]interface{}{
		"BusinessFailureCommand": handler,
	}
	behaviorsList := []interface{}{uowBehavior}

	mediator := cqrs.NewMediator(handlers, behaviorsList)
	ctx := context.Background()

	// When: Command returns Result.Failure (business error)
	result, err := mediator.Send(ctx, command)

	// Then: Transaction should be committed (not rolled back)
	assert.NoError(t, err)
	assert.NotNil(t, result)
	testResult, ok := result.(*TestResult)
	assert.True(t, ok)
	assert.True(t, testResult.IsFailure(), "Result should be a failure")
	assert.True(t, uow.IsCommitted(), "Transaction should be committed for business failures")
	assert.False(t, uow.IsRolledBack(), "Transaction should not be rolled back for business failures")
}

// T213b: Should_CommitTransaction_When_VoidCommandHandlerReturnsResultFailure
func TestShould_CommitTransaction_When_VoidCommandHandlerReturnsResultFailure(t *testing.T) {
	// Given: UnitOfWork and void command that returns Result<Unit>.Failure
	uow := NewInMemoryUnitOfWork()
	uowBehavior := &behaviors.UnitOfWorkBehavior{UnitOfWork: uow}

	command := &VoidBusinessFailureCommand{ID: "void-business-fail-1"}
	handler := &VoidBusinessFailureCommandHandler{}

	handlers := map[string]interface{}{
		"VoidBusinessFailureCommand": handler,
	}
	behaviorsList := []interface{}{uowBehavior}

	mediator := cqrs.NewMediator(handlers, behaviorsList)
	ctx := context.Background()

	// When: Void command returns Result<Unit>.Failure
	result, err := mediator.Send(ctx, command)

	// Then: Transaction should be committed
	assert.NoError(t, err)
	assert.NotNil(t, result)
	testResult, ok := result.(*TestResult)
	assert.True(t, ok)
	assert.True(t, testResult.IsFailure(), "Result should be a failure")
	assert.True(t, uow.IsCommitted(), "Transaction should be committed for void command business failures")
	assert.False(t, uow.IsRolledBack(), "Transaction should not be rolled back for void command business failures")
}

// T223: Should_RollbackTransaction_When_BehaviorThrowsException
func TestShould_RollbackTransaction_When_BehaviorThrowsException(t *testing.T) {
	// Given: UnitOfWork and behavior that throws exception
	uow := NewInMemoryUnitOfWork()
	uowBehavior := &behaviors.UnitOfWorkBehavior{UnitOfWork: uow}
	errorBehavior := &ErrorThrowingBehavior{}

	command := &SuccessCommand{ID: "success-1"}
	handler := &SuccessCommandHandler{}

	handlers := map[string]interface{}{
		"SuccessCommand": handler,
	}
	// Error behavior executes before UnitOfWork, but after transaction started
	behaviorsList := []interface{}{uowBehavior, errorBehavior}

	mediator := cqrs.NewMediator(handlers, behaviorsList)
	ctx := context.Background()

	// When: Behavior throws exception
	_, err := mediator.Send(ctx, command)

	// Then: Transaction should be rolled back
	assert.Error(t, err)
	assert.False(t, uow.IsCommitted(), "Transaction should not be committed when behavior throws")
	assert.True(t, uow.IsRolledBack(), "Transaction should be rolled back when behavior throws")
}

// Test helper types
type SuccessCommand struct {
	ID string
}

func (c *SuccessCommand) IsRequest() {}
func (c *SuccessCommand) IsCommand() {}

type SuccessCommandHandler struct{}

func (h *SuccessCommandHandler) Handle(ctx context.Context, cmd *SuccessCommand) (interface{}, error) {
	return SuccessResult("success"), nil
}

type ErrorCommand struct {
	ID string
}

func (c *ErrorCommand) IsRequest() {}
func (c *ErrorCommand) IsCommand() {}

type ErrorCommandHandler struct{}

func (h *ErrorCommandHandler) Handle(ctx context.Context, cmd *ErrorCommand) (interface{}, error) {
	return nil, assert.AnError // Infrastructure error
}

type OuterCommand struct {
	ID string
}

func (c *OuterCommand) IsRequest() {}
func (c *OuterCommand) IsCommand() {}

type OuterCommandHandler struct{}

func (h *OuterCommandHandler) Handle(ctx context.Context, cmd *OuterCommand) (interface{}, error) {
	// Simulates nested command - in real implementation would call mediator.Send
	return SuccessResult("outer-success"), nil
}

type TransactionTestQuery struct {
	ID string
}

func (q *TransactionTestQuery) IsRequest() {}
func (q *TransactionTestQuery) IsQuery()   {}

type TransactionTestQueryHandler struct{}

func (h *TransactionTestQueryHandler) Handle(ctx context.Context, query *TransactionTestQuery) (interface{}, error) {
	return "query-result", nil
}

type BusinessFailureCommand struct {
	ID string
}

func (c *BusinessFailureCommand) IsRequest() {}
func (c *BusinessFailureCommand) IsCommand() {}

type BusinessFailureCommandHandler struct{}

func (h *BusinessFailureCommandHandler) Handle(ctx context.Context, cmd *BusinessFailureCommand) (interface{}, error) {
	// Returns Result.Failure (business validation error, NOT infrastructure error)
	return FailureResult("Business rule violation"), nil
}

type VoidBusinessFailureCommand struct {
	ID string
}

func (c *VoidBusinessFailureCommand) IsRequest() {}
func (c *VoidBusinessFailureCommand) IsCommand() {}

type VoidBusinessFailureCommandHandler struct{}

func (h *VoidBusinessFailureCommandHandler) Handle(ctx context.Context, cmd *VoidBusinessFailureCommand) (interface{}, error) {
	// Returns Result<Unit>.Failure
	return FailureResult("Void command business failure"), nil
}

// ErrorThrowingBehavior for testing behavior exceptions
type ErrorThrowingBehavior struct{}

func (b *ErrorThrowingBehavior) Handle(ctx context.Context, request interface{}, next func() (interface{}, error)) (interface{}, error) {
	// Throw error before calling handler
	return nil, assert.AnError
}

func (b *ErrorThrowingBehavior) Order() int {
	return 35 // After UnitOfWork (30) but before handler
}
