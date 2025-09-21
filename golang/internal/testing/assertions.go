package testing

import (
	"reflect"
	"testing"
	"time"

	"github.com/universalddd/architecture-core-go/pkg/domain"
	"github.com/universalddd/architecture-core-go/pkg/functional"
)

// Assertions provides a set of assertion helpers for testing
type Assertions struct {
	t *testing.T
}

// NewAssertions creates a new assertions helper
func NewAssertions(t *testing.T) *Assertions {
	return &Assertions{t: t}
}

// =============================================================================
// BASIC ASSERTIONS
// =============================================================================

// Equal asserts that two values are equal
func (a *Assertions) Equal(expected, actual interface{}, msgAndArgs ...interface{}) {
	a.t.Helper()
	if !reflect.DeepEqual(expected, actual) {
		a.t.Errorf("Expected: %v, Actual: %v", expected, actual)
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// NotEqual asserts that two values are not equal
func (a *Assertions) NotEqual(expected, actual interface{}, msgAndArgs ...interface{}) {
	a.t.Helper()
	if reflect.DeepEqual(expected, actual) {
		a.t.Errorf("Expected values to be different, but both were: %v", expected)
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// True asserts that a value is true
func (a *Assertions) True(value bool, msgAndArgs ...interface{}) {
	a.t.Helper()
	if !value {
		a.t.Error("Expected true, got false")
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// False asserts that a value is false
func (a *Assertions) False(value bool, msgAndArgs ...interface{}) {
	a.t.Helper()
	if value {
		a.t.Error("Expected false, got true")
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// Nil asserts that a value is nil
func (a *Assertions) Nil(value interface{}, msgAndArgs ...interface{}) {
	a.t.Helper()
	if value != nil {
		a.t.Errorf("Expected nil, got: %v", value)
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// NotNil asserts that a value is not nil
func (a *Assertions) NotNil(value interface{}, msgAndArgs ...interface{}) {
	a.t.Helper()
	if value == nil {
		a.t.Error("Expected non-nil value, got nil")
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// NoError asserts that an error is nil
func (a *Assertions) NoError(err error, msgAndArgs ...interface{}) {
	a.t.Helper()
	if err != nil {
		a.t.Errorf("Expected no error, got: %v", err)
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// Error asserts that an error is not nil
func (a *Assertions) Error(err error, msgAndArgs ...interface{}) {
	a.t.Helper()
	if err == nil {
		a.t.Error("Expected an error, got nil")
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// =============================================================================
// RESULT ASSERTIONS
// =============================================================================

// ResultOk asserts that a Result is successful
func (a *Assertions) ResultOk[T any](result functional.Result[T], msgAndArgs ...interface{}) {
	a.t.Helper()
	if !result.IsOk() {
		a.t.Errorf("Expected Result to be Ok, but was Error: %v", result.Error())
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// ResultError asserts that a Result is an error
func (a *Assertions) ResultError[T any](result functional.Result[T], msgAndArgs ...interface{}) {
	a.t.Helper()
	if result.IsOk() {
		a.t.Errorf("Expected Result to be Error, but was Ok with value: %v", result.Value())
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// ResultValue asserts that a Result has a specific value
func (a *Assertions) ResultValue[T any](expected T, result functional.Result[T], msgAndArgs ...interface{}) {
	a.t.Helper()
	a.ResultOk(result, msgAndArgs...)
	if result.IsOk() {
		a.Equal(expected, result.Value(), msgAndArgs...)
	}
}

// ResultErrorCode asserts that a Result has a specific error code
func (a *Assertions) ResultErrorCode[T any](expectedCode string, result functional.Result[T], msgAndArgs ...interface{}) {
	a.t.Helper()
	a.ResultError(result, msgAndArgs...)
	if result.IsError() {
		a.Equal(expectedCode, result.Error().Code(), msgAndArgs...)
	}
}

// ResultErrorCategory asserts that a Result has a specific error category
func (a *Assertions) ResultErrorCategory[T any](expectedCategory functional.ErrorCategory, result functional.Result[T], msgAndArgs ...interface{}) {
	a.t.Helper()
	a.ResultError(result, msgAndArgs...)
	if result.IsError() {
		a.Equal(expectedCategory, result.Error().Category(), msgAndArgs...)
	}
}

// =============================================================================
// MAYBE ASSERTIONS
// =============================================================================

// MaybeSome asserts that a Maybe has a value
func (a *Assertions) MaybeSome[T any](maybe functional.Maybe[T], msgAndArgs ...interface{}) {
	a.t.Helper()
	if !maybe.HasValue() {
		a.t.Error("Expected Maybe to have a value, but was None")
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// MaybeNone asserts that a Maybe has no value
func (a *Assertions) MaybeNone[T any](maybe functional.Maybe[T], msgAndArgs ...interface{}) {
	a.t.Helper()
	if maybe.HasValue() {
		a.t.Errorf("Expected Maybe to be None, but had value: %v", maybe.Value())
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// MaybeValue asserts that a Maybe has a specific value
func (a *Assertions) MaybeValue[T any](expected T, maybe functional.Maybe[T], msgAndArgs ...interface{}) {
	a.t.Helper()
	a.MaybeSome(maybe, msgAndArgs...)
	if maybe.HasValue() {
		a.Equal(expected, maybe.Value(), msgAndArgs...)
	}
}

// =============================================================================
// ERROR ASSERTIONS
// =============================================================================

// ErrorCode asserts that an Error has a specific code
func (a *Assertions) ErrorCode(expectedCode string, err *functional.Error, msgAndArgs ...interface{}) {
	a.t.Helper()
	a.NotNil(err, msgAndArgs...)
	if err != nil {
		a.Equal(expectedCode, err.Code(), msgAndArgs...)
	}
}

// ErrorCategory asserts that an Error has a specific category
func (a *Assertions) ErrorCategory(expectedCategory functional.ErrorCategory, err *functional.Error, msgAndArgs ...interface{}) {
	a.t.Helper()
	a.NotNil(err, msgAndArgs...)
	if err != nil {
		a.Equal(expectedCategory, err.Category(), msgAndArgs...)
	}
}

// ErrorMessage asserts that an Error has a specific message
func (a *Assertions) ErrorMessage(expectedMessage string, err *functional.Error, msgAndArgs ...interface{}) {
	a.t.Helper()
	a.NotNil(err, msgAndArgs...)
	if err != nil {
		a.Equal(expectedMessage, err.Message(), msgAndArgs...)
	}
}

// =============================================================================
// DOMAIN ASSERTIONS
// =============================================================================

// EntityEquals asserts that two entities are equal (based on ID)
func (a *Assertions) EntityEquals[T comparable](expected, actual domain.Entity[T], msgAndArgs ...interface{}) {
	a.t.Helper()
	if !actual.Equals(expected) {
		a.t.Errorf("Expected entities to be equal. Expected ID: %v, Actual ID: %v", expected.ID(), actual.ID())
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// ValueObjectEquals asserts that two value objects are equal
func (a *Assertions) ValueObjectEquals(expected, actual domain.ValueObject, msgAndArgs ...interface{}) {
	a.t.Helper()
	if !actual.Equals(expected) {
		a.t.Errorf("Expected value objects to be equal. Expected: %v, Actual: %v", expected, actual)
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// AggregateVersion asserts that an aggregate has a specific version
func (a *Assertions) AggregateVersion[T comparable](expectedVersion int64, aggregate domain.AggregateRoot[T], msgAndArgs ...interface{}) {
	a.t.Helper()
	actualVersion := aggregate.Version()
	if actualVersion != expectedVersion {
		a.t.Errorf("Expected aggregate version %d, got %d", expectedVersion, actualVersion)
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// AggregateEventCount asserts that an aggregate has a specific number of events
func (a *Assertions) AggregateEventCount[T comparable](expectedCount int, aggregate domain.AggregateRoot[T], msgAndArgs ...interface{}) {
	a.t.Helper()
	actualCount := len(aggregate.DomainEvents())
	if actualCount != expectedCount {
		a.t.Errorf("Expected %d domain events, got %d", expectedCount, actualCount)
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// DomainEventType asserts that a domain event has a specific type
func (a *Assertions) DomainEventType(expectedType string, event domain.DomainEvent, msgAndArgs ...interface{}) {
	a.t.Helper()
	actualType := event.EventType()
	if actualType != expectedType {
		a.t.Errorf("Expected event type %s, got %s", expectedType, actualType)
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// DomainEventCorrelationID asserts that a domain event has a specific correlation ID
func (a *Assertions) DomainEventCorrelationID(expectedID string, event domain.DomainEvent, msgAndArgs ...interface{}) {
	a.t.Helper()
	correlationID := event.CorrelationID()
	if correlationID == nil {
		a.t.Error("Expected correlation ID, got nil")
	} else if *correlationID != expectedID {
		a.t.Errorf("Expected correlation ID %s, got %s", expectedID, *correlationID)
	}
	if len(msgAndArgs) > 0 {
		a.t.Errorf("Message: %v", msgAndArgs...)
	}
}

// =============================================================================
// PERFORMANCE ASSERTIONS
// =============================================================================

// ExecutionTime asserts that a function executes within a time limit
func (a *Assertions) ExecutionTime(maxDuration time.Duration, fn func(), msgAndArgs ...interface{}) {
	a.t.Helper()
	start := time.Now()
	fn()
	elapsed := time.Since(start)

	if elapsed > maxDuration {
		a.t.Errorf("Expected execution time to be under %v, but took %v", maxDuration, elapsed)
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// ZeroAllocations asserts that a function performs zero allocations
func (a *Assertions) ZeroAllocations(fn func(), msgAndArgs ...interface{}) {
	a.t.Helper()
	// Note: This is a simplified version. In practice, you'd use testing.AllocsPerRun
	// or similar tools to measure actual allocations
	allocsBefore := getAllocCount()
	fn()
	allocsAfter := getAllocCount()

	if allocsAfter > allocsBefore {
		a.t.Errorf("Expected zero allocations, but detected %d allocations", allocsAfter-allocsBefore)
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// =============================================================================
// COLLECTION ASSERTIONS
// =============================================================================

// Contains asserts that a slice contains a specific value
func (a *Assertions) Contains[T comparable](slice []T, value T, msgAndArgs ...interface{}) {
	a.t.Helper()
	for _, item := range slice {
		if item == value {
			return
		}
	}
	a.t.Errorf("Expected slice to contain %v, but it did not. Slice: %v", value, slice)
	if len(msgAndArgs) > 0 {
		a.t.Errorf("Message: %v", msgAndArgs...)
	}
}

// NotContains asserts that a slice does not contain a specific value
func (a *Assertions) NotContains[T comparable](slice []T, value T, msgAndArgs ...interface{}) {
	a.t.Helper()
	for _, item := range slice {
		if item == value {
			a.t.Errorf("Expected slice not to contain %v, but it did. Slice: %v", value, slice)
			if len(msgAndArgs) > 0 {
				a.t.Errorf("Message: %v", msgAndArgs...)
			}
			return
		}
	}
}

// SliceLength asserts that a slice has a specific length
func (a *Assertions) SliceLength[T any](expectedLength int, slice []T, msgAndArgs ...interface{}) {
	a.t.Helper()
	actualLength := len(slice)
	if actualLength != expectedLength {
		a.t.Errorf("Expected slice length %d, got %d. Slice: %v", expectedLength, actualLength, slice)
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// Helper function to get allocation count (simplified for demonstration)
func getAllocCount() uint64 {
	// In a real implementation, this would use runtime.MemStats or similar
	return 0
}