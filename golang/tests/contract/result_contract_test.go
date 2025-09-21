package contract

import (
	"testing"

	"github.com/universalddd/architecture-core-go/pkg/functional"
)

// TestResult_Should_ProvideMonadicOperations_When_Used
func TestResult_Should_ProvideMonadicOperations_When_Used(t *testing.T) {
	t.Run("Should_CreateSuccessResult_When_OkCalled", func(t *testing.T) {
		// Given: Creating a success result
		result := functional.Ok()

		// When: Checking result state
		// Then: Should be success
		if !result.IsSuccess() {
			t.Error("Ok() should create success result")
		}
		if result.IsFailure() {
			t.Error("Ok() result should not be failure")
		}
	})

	t.Run("Should_CreateFailureResult_When_FailCalled", func(t *testing.T) {
		// Given: Creating a failure result
		err := functional.DomainError("TEST_ERROR", "Test error message")
		result := functional.Fail(err)

		// When: Checking result state
		// Then: Should be failure
		if result.IsSuccess() {
			t.Error("Fail() result should not be success")
		}
		if !result.IsFailure() {
			t.Error("Fail() should create failure result")
		}
		if result.Error() != err {
			t.Error("Fail() should store provided error")
		}
	})

	t.Run("Should_MapToValue_When_Success", func(t *testing.T) {
		// Given: A success result
		result := functional.Ok()

		// When: Mapping to value
		valueResult := result.Map(func() string { return "mapped value" })

		// Then: Should create success result with value
		if !valueResult.IsSuccess() {
			t.Error("Map on success should create success result")
		}
		if valueResult.Value() != "mapped value" {
			t.Error("Map should transform to expected value")
		}
	})

	t.Run("Should_NotMap_When_Failure", func(t *testing.T) {
		// Given: A failure result
		err := functional.DomainError("TEST_ERROR", "Test error")
		result := functional.Fail(err)

		// When: Mapping to value
		valueResult := result.Map(func() string { return "should not execute" })

		// Then: Should remain failure without executing map function
		if !valueResult.IsFailure() {
			t.Error("Map on failure should remain failure")
		}
		if valueResult.Error() != err {
			t.Error("Map on failure should preserve error")
		}
	})

	t.Run("Should_BindOperation_When_Success", func(t *testing.T) {
		// Given: A success result
		result := functional.Ok()

		// When: Binding to another operation
		boundResult := result.Bind(func() functional.Result {
			return functional.Ok()
		})

		// Then: Should execute bind function
		if !boundResult.IsSuccess() {
			t.Error("Bind on success should execute function")
		}
	})

	t.Run("Should_NotBind_When_Failure", func(t *testing.T) {
		// Given: A failure result
		err := functional.DomainError("TEST_ERROR", "Test error")
		result := functional.Fail(err)

		// When: Binding to another operation
		boundResult := result.Bind(func() functional.Result {
			return functional.Ok() // Should not execute
		})

		// Then: Should remain failure without executing bind function
		if !boundResult.IsFailure() {
			t.Error("Bind on failure should remain failure")
		}
		if boundResult.Error() != err {
			t.Error("Bind on failure should preserve error")
		}
	})

	t.Run("Should_MatchBothPaths_When_Called", func(t *testing.T) {
		// Given: Success and failure results
		successResult := functional.Ok()
		err := functional.DomainError("TEST_ERROR", "Test error")
		failureResult := functional.Fail(err)

		// When: Matching both cases
		successValue := successResult.Match(
			func() string { return "success path" },
			func(e functional.Error) string { return "failure path" },
		)
		failureValue := failureResult.Match(
			func() string { return "success path" },
			func(e functional.Error) string { return "failure path" },
		)

		// Then: Should execute correct path
		if successValue != "success path" {
			t.Error("Match should execute success path for success result")
		}
		if failureValue != "failure path" {
			t.Error("Match should execute failure path for failure result")
		}
	})
}

// TestResultOfT_Should_ProvideTypedOperations_When_Used
func TestResultOfT_Should_ProvideTypedOperations_When_Used(t *testing.T) {
	t.Run("Should_CreateTypedSuccessResult_When_OkCalled", func(t *testing.T) {
		// Given: Creating a typed success result
		value := "test value"
		result := functional.OkWith(value)

		// When: Checking result state
		// Then: Should be success with value
		if !result.IsSuccess() {
			t.Error("OkWith() should create success result")
		}
		if result.Value() != value {
			t.Error("OkWith() should store provided value")
		}
	})

	t.Run("Should_MapToNewType_When_Success", func(t *testing.T) {
		// Given: A success result with string value
		result := functional.OkWith("123")

		// When: Mapping to different type
		intResult := result.Map(func(s string) int {
			return len(s)
		})

		// Then: Should create success result with new type
		if !intResult.IsSuccess() {
			t.Error("Map should create success result")
		}
		if intResult.Value() != 3 {
			t.Error("Map should transform value correctly")
		}
	})

	t.Run("Should_BindToNewResult_When_Success", func(t *testing.T) {
		// Given: A success result with integer value
		result := functional.OkWith(5)

		// When: Binding to operation that might fail
		boundResult := result.Bind(func(i int) functional.Result[string] {
			if i > 0 {
				return functional.OkWith("positive")
			}
			return functional.FailWith[string](functional.DomainError("NEGATIVE", "Value is negative"))
		})

		// Then: Should execute bind function successfully
		if !boundResult.IsSuccess() {
			t.Error("Bind should execute function successfully")
		}
		if boundResult.Value() != "positive" {
			t.Error("Bind should return expected value")
		}
	})

	t.Run("Should_HandleBindFailure_When_Success", func(t *testing.T) {
		// Given: A success result with negative integer
		result := functional.OkWith(-5)

		// When: Binding to operation that fails
		boundResult := result.Bind(func(i int) functional.Result[string] {
			if i > 0 {
				return functional.OkWith("positive")
			}
			return functional.FailWith[string](functional.DomainError("NEGATIVE", "Value is negative"))
		})

		// Then: Should return failure from bind function
		if !boundResult.IsFailure() {
			t.Error("Bind should return failure when function fails")
		}
		if boundResult.Error().Code() != "NEGATIVE" {
			t.Error("Bind should preserve error from function")
		}
	})

	t.Run("Should_ConvertFromMaybe_When_SomeValue", func(t *testing.T) {
		// Given: A Maybe with value
		maybe := functional.Some("test value")
		errorWhenNone := functional.DomainError("NO_VALUE", "No value present")

		// When: Converting to Result
		result := functional.FromMaybe(maybe, errorWhenNone)

		// Then: Should create success result
		if !result.IsSuccess() {
			t.Error("FromMaybe should create success result when Maybe has value")
		}
		if result.Value() != "test value" {
			t.Error("FromMaybe should preserve value from Maybe")
		}
	})

	t.Run("Should_ConvertFromMaybe_When_NoValue", func(t *testing.T) {
		// Given: A Maybe without value
		maybe := functional.None[string]()
		errorWhenNone := functional.DomainError("NO_VALUE", "No value present")

		// When: Converting to Result
		result := functional.FromMaybe(maybe, errorWhenNone)

		// Then: Should create failure result
		if !result.IsFailure() {
			t.Error("FromMaybe should create failure result when Maybe has no value")
		}
		if result.Error() != errorWhenNone {
			t.Error("FromMaybe should use provided error when Maybe has no value")
		}
	})
}