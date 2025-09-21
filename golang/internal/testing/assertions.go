package testing

import (
	"fmt"
	"reflect"
	"strings"
	"testing"
	"time"

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
		a.t.Errorf("Expected true, but was false")
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// False asserts that a value is false
func (a *Assertions) False(value bool, msgAndArgs ...interface{}) {
	a.t.Helper()
	if value {
		a.t.Errorf("Expected false, but was true")
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// Nil asserts that a value is nil
func (a *Assertions) Nil(value interface{}, msgAndArgs ...interface{}) {
	a.t.Helper()
	if !isNil(value) {
		a.t.Errorf("Expected nil, but was: %v", value)
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// isNil checks if a value is nil, handling typed nil pointers correctly
func isNil(value interface{}) bool {
	if value == nil {
		return true
	}

	// Use reflection to check for typed nil pointers
	v := reflect.ValueOf(value)
	switch v.Kind() {
	case reflect.Chan, reflect.Func, reflect.Interface, reflect.Map, reflect.Ptr, reflect.Slice:
		return v.IsNil()
	default:
		return false
	}
}

// NotNil asserts that a value is not nil
func (a *Assertions) NotNil(value interface{}, msgAndArgs ...interface{}) {
	a.t.Helper()
	if value == nil {
		a.t.Errorf("Expected non-nil value, but was nil")
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// Contains asserts that a string contains a substring
func (a *Assertions) Contains(str, substr string, msgAndArgs ...interface{}) {
	a.t.Helper()
	if !strings.Contains(str, substr) {
		a.t.Errorf("Expected string to contain '%s', but string was: %s", substr, str)
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// NotContains asserts that a string does not contain a substring
func (a *Assertions) NotContains(str, substr string, msgAndArgs ...interface{}) {
	a.t.Helper()
	if strings.Contains(str, substr) {
		a.t.Errorf("Expected string to not contain '%s', but string was: %s", substr, str)
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// =============================================================================
// RESULT ASSERTIONS
// =============================================================================

// ResultOk asserts that a Result is successful
func (a *Assertions) ResultOk(result interface{}, msgAndArgs ...interface{}) {
	a.t.Helper()

	// Use reflection to call IsOk() method
	rv := reflect.ValueOf(result)
	if rv.Kind() == reflect.Ptr {
		rv = rv.Elem()
	}

	isOkMethod := rv.MethodByName("IsOk")
	if !isOkMethod.IsValid() {
		a.t.Errorf("Result type does not have IsOk() method")
		return
	}

	results := isOkMethod.Call(nil)
	if len(results) == 0 || !results[0].Bool() {
		// Try to get error
		errorMethod := rv.MethodByName("Error")
		var errorMsg string
		if errorMethod.IsValid() {
			errorResults := errorMethod.Call(nil)
			if len(errorResults) > 0 {
				errorMsg = fmt.Sprintf(": %v", errorResults[0].Interface())
			}
		}
		a.t.Errorf("Expected Result to be Ok, but was Error%s", errorMsg)
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// ResultError asserts that a Result is an error
func (a *Assertions) ResultError(result interface{}, msgAndArgs ...interface{}) {
	a.t.Helper()

	rv := reflect.ValueOf(result)
	if rv.Kind() == reflect.Ptr {
		rv = rv.Elem()
	}

	isOkMethod := rv.MethodByName("IsOk")
	if !isOkMethod.IsValid() {
		a.t.Errorf("Result type does not have IsOk() method")
		return
	}

	results := isOkMethod.Call(nil)
	if len(results) > 0 && results[0].Bool() {
		// Try to get value
		valueMethod := rv.MethodByName("Value")
		var valueMsg string
		if valueMethod.IsValid() {
			valueResults := valueMethod.Call(nil)
			if len(valueResults) > 0 {
				valueMsg = fmt.Sprintf(" with value: %v", valueResults[0].Interface())
			}
		}
		a.t.Errorf("Expected Result to be Error, but was Ok%s", valueMsg)
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// ResultValue asserts that a Result contains the expected value
func (a *Assertions) ResultValue(expected interface{}, result interface{}, msgAndArgs ...interface{}) {
	a.t.Helper()

	rv := reflect.ValueOf(result)
	if rv.Kind() == reflect.Ptr {
		rv = rv.Elem()
	}

	// First check if it's Ok
	isOkMethod := rv.MethodByName("IsOk")
	if !isOkMethod.IsValid() {
		a.t.Errorf("Result type does not have IsOk() method")
		return
	}

	isOkResults := isOkMethod.Call(nil)
	if len(isOkResults) == 0 || !isOkResults[0].Bool() {
		a.t.Errorf("Expected Result to be Ok for value comparison")
		return
	}

	// Get the value
	valueMethod := rv.MethodByName("Value")
	if !valueMethod.IsValid() {
		a.t.Errorf("Result type does not have Value() method")
		return
	}

	valueResults := valueMethod.Call(nil)
	if len(valueResults) == 0 {
		a.t.Errorf("Value() method returned no results")
		return
	}

	actual := valueResults[0].Interface()
	if !reflect.DeepEqual(expected, actual) {
		a.t.Errorf("Expected Result value: %v, Actual: %v", expected, actual)
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// ResultErrorCode asserts that a Result error has the expected code
func (a *Assertions) ResultErrorCode(expectedCode string, result interface{}, msgAndArgs ...interface{}) {
	a.t.Helper()

	rv := reflect.ValueOf(result)
	if rv.Kind() == reflect.Ptr {
		rv = rv.Elem()
	}

	// First check if it's Error
	isOkMethod := rv.MethodByName("IsOk")
	if !isOkMethod.IsValid() {
		a.t.Errorf("Result type does not have IsOk() method")
		return
	}

	isOkResults := isOkMethod.Call(nil)
	if len(isOkResults) > 0 && isOkResults[0].Bool() {
		a.t.Errorf("Expected Result to be Error for error code comparison")
		return
	}

	// Get the error
	errorMethod := rv.MethodByName("Error")
	if !errorMethod.IsValid() {
		a.t.Errorf("Result type does not have Error() method")
		return
	}

	errorResults := errorMethod.Call(nil)
	if len(errorResults) == 0 {
		a.t.Errorf("Error() method returned no results")
		return
	}

	errorValue := errorResults[0]
	codeMethod := errorValue.MethodByName("Code")
	if !codeMethod.IsValid() {
		a.t.Errorf("Error type does not have Code() method")
		return
	}

	codeResults := codeMethod.Call(nil)
	if len(codeResults) == 0 {
		a.t.Errorf("Code() method returned no results")
		return
	}

	actualCode := codeResults[0].String()
	if expectedCode != actualCode {
		a.t.Errorf("Expected error code: %s, Actual: %s", expectedCode, actualCode)
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// ResultErrorCategory asserts that a Result error has the expected category
func (a *Assertions) ResultErrorCategory(expectedCategory functional.ErrorCategory, result interface{}, msgAndArgs ...interface{}) {
	a.t.Helper()

	rv := reflect.ValueOf(result)
	if rv.Kind() == reflect.Ptr {
		rv = rv.Elem()
	}

	// First check if it's Error
	isOkMethod := rv.MethodByName("IsOk")
	if !isOkMethod.IsValid() {
		a.t.Errorf("Result type does not have IsOk() method")
		return
	}

	isOkResults := isOkMethod.Call(nil)
	if len(isOkResults) > 0 && isOkResults[0].Bool() {
		a.t.Errorf("Expected Result to be Error for error category comparison")
		return
	}

	// Get the error
	errorMethod := rv.MethodByName("Error")
	if !errorMethod.IsValid() {
		a.t.Errorf("Result type does not have Error() method")
		return
	}

	errorResults := errorMethod.Call(nil)
	if len(errorResults) == 0 {
		a.t.Errorf("Error() method returned no results")
		return
	}

	errorValue := errorResults[0]
	categoryMethod := errorValue.MethodByName("Category")
	if !categoryMethod.IsValid() {
		a.t.Errorf("Error type does not have Category() method")
		return
	}

	categoryResults := categoryMethod.Call(nil)
	if len(categoryResults) == 0 {
		a.t.Errorf("Category() method returned no results")
		return
	}

	actualCategory := categoryResults[0].Interface().(functional.ErrorCategory)
	if expectedCategory != actualCategory {
		a.t.Errorf("Expected error category: %v, Actual: %v", expectedCategory, actualCategory)
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// =============================================================================
// TIME ASSERTIONS
// =============================================================================

// WithinDuration asserts that a time is within the specified duration of expected time
func (a *Assertions) WithinDuration(expected time.Time, actual time.Time, delta time.Duration, msgAndArgs ...interface{}) {
	a.t.Helper()
	diff := actual.Sub(expected)
	if diff < 0 {
		diff = -diff
	}
	if diff > delta {
		a.t.Errorf("Expected time %v to be within %v of %v, but difference was %v", actual, delta, expected, diff)
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// =============================================================================
// ERROR ASSERTIONS
// =============================================================================

// NoError asserts that an error is nil
func (a *Assertions) NoError(err error, msgAndArgs ...interface{}) {
	a.t.Helper()
	if err != nil {
		a.t.Errorf("Expected no error, but got: %v", err)
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// Error asserts that an error is not nil
func (a *Assertions) Error(err error, msgAndArgs ...interface{}) {
	a.t.Helper()
	if err == nil {
		a.t.Errorf("Expected an error, but got nil")
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// ErrorContains asserts that an error message contains a substring
func (a *Assertions) ErrorContains(err error, substr string, msgAndArgs ...interface{}) {
	a.t.Helper()
	if err == nil {
		a.t.Errorf("Expected an error, but got nil")
		return
	}
	if !strings.Contains(err.Error(), substr) {
		a.t.Errorf("Expected error message to contain '%s', but error was: %v", substr, err)
		if len(msgAndArgs) > 0 {
			a.t.Errorf("Message: %v", msgAndArgs...)
		}
	}
}

// =============================================================================
// PANIC ASSERTIONS
// =============================================================================

// Panics asserts that the function panics
func (a *Assertions) Panics(f func(), msgAndArgs ...interface{}) {
	a.t.Helper()
	defer func() {
		if r := recover(); r == nil {
			a.t.Errorf("Expected function to panic, but it didn't")
			if len(msgAndArgs) > 0 {
				a.t.Errorf("Message: %v", msgAndArgs...)
			}
		}
	}()
	f()
}

// NotPanics asserts that the function does not panic
func (a *Assertions) NotPanics(f func(), msgAndArgs ...interface{}) {
	a.t.Helper()
	defer func() {
		if r := recover(); r != nil {
			a.t.Errorf("Expected function not to panic, but it panicked with: %v", r)
			if len(msgAndArgs) > 0 {
				a.t.Errorf("Message: %v", msgAndArgs...)
			}
		}
	}()
	f()
}