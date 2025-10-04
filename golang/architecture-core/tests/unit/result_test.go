package unit

import (
	"fmt"
	"strconv"
	"testing"

	"github.com/universalddd/architecture-core/functional"
	testutils "github.com/universalddd/architecture-core/internal/testing"
)

// =============================================================================
// UNIT TESTS FOR RESULT[T] SCENARIOS
// Requirements: Monadic operations, error handling, zero allocations
// =============================================================================

func TestResult_Should_CreateSuccessResult_When_OkFactoryUsed(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	value := "test value"

	// When
	result := functional.Ok(value)

	// Then
	assertions.ResultOk(result, "Result should be Ok")
	assertions.True(result.IsOk(), "IsOk should return true")
	assertions.False(result.IsError(), "IsError should return false")
	assertions.Equal(value, result.Value(), "Value should match input")
	assertions.Nil(result.Error(), "Error should be nil for Ok result")
}

func TestResult_Should_CreateErrorResult_When_FailFactoryUsed(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	err := functional.NewDomainError("TEST.ERROR", "Test error message")

	// When
	result := functional.Fail[string](err)

	// Then
	assertions.ResultError(result, "Result should be Error")
	assertions.False(result.IsOk(), "IsOk should return false")
	assertions.True(result.IsError(), "IsError should return true")
	assertions.Equal(err, result.Error(), "Error should match input")
	// Note: Value() behavior on error Result depends on implementation
	// Some implementations panic, others return zero value
}

func TestResult_Should_ApplyFunction_When_MapOperationOnOkResult(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	result := functional.Ok(42)

	// When
	mappedResult := functional.Map(result, func(x int) string {
		return strconv.Itoa(x)
	})

	// Then
	assertions.ResultOk(mappedResult, "Mapped result should be Ok")
	assertions.ResultValue("42", mappedResult, "Mapped value should be string representation")
}

func TestResult_Should_ReturnError_When_MapOperationOnErrorResult(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	err := functional.NewDomainError("TEST.ERROR", "Test error")
	result := functional.Fail[int](err)

	// When
	mappedResult := functional.Map(result, func(x int) string {
		return strconv.Itoa(x) // This should not execute
	})

	// Then
	assertions.ResultError(mappedResult, "Mapped result should remain Error")
	assertions.Equal(err, mappedResult.Error(), "Error should be preserved")
}

func TestResult_Should_ChainOperations_When_MultipleMapsCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	result := functional.Ok(10)

	// When
	step1 := functional.Map(result, func(x int) int { return x * 2 })     // 20
	step2 := functional.Map(step1, func(x int) int { return x + 5 })      // 25
	finalResult := functional.Map(step2, func(x int) string { return strconv.Itoa(x) }) // "25"

	// Then
	assertions.ResultOk(finalResult, "Final result should be Ok")
	assertions.ResultValue("25", finalResult, "Final value should be '25'")
}

func TestResult_Should_StopChain_When_ErrorOccursInChain(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	err := functional.NewDomainError("CHAIN.ERROR", "Error in chain")
	result := functional.Fail[int](err)

	// When
	step1 := functional.Map(result, func(x int) int { return x * 2 })     // Should not execute
	step2 := functional.Map(step1, func(x int) int { return x + 5 })      // Should not execute
	finalResult := functional.Map(step2, func(x int) string { return strconv.Itoa(x) }) // Should not execute

	// Then
	assertions.ResultError(finalResult, "Final result should be Error")
	assertions.Equal(err, finalResult.Error(), "Original error should be preserved")
}

func TestResult_Should_BindSuccessfully_When_BindOperationOnOkResult(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	result := functional.Ok(42)

	// When
	boundResult := functional.Bind(result,func(x int) functional.Result[string] {
		if x > 0 {
			return functional.Ok(strconv.Itoa(x))
		}
		return functional.Fail[string](functional.NewDomainError("NEGATIVE", "Value is negative"))
	})

	// Then
	assertions.ResultOk(boundResult, "Bound result should be Ok")
	assertions.ResultValue("42", boundResult, "Bound value should be '42'")
}

func TestResult_Should_ReturnError_When_BindOperationOnErrorResult(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	err := functional.NewDomainError("TEST.ERROR", "Test error")
	result := functional.Fail[int](err)

	// When
	boundResult := functional.Bind(result,func(x int) functional.Result[string] {
		return functional.Ok(strconv.Itoa(x)) // Should not execute
	})

	// Then
	assertions.ResultError(boundResult, "Bound result should be Error")
	assertions.Equal(err, boundResult.Error(), "Original error should be preserved")
}

func TestResult_Should_ReturnBindError_When_BindFunctionReturnsError(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	result := functional.Ok(-5)

	// When
	boundResult := functional.Bind(result,func(x int) functional.Result[string] {
		if x > 0 {
			return functional.Ok(strconv.Itoa(x))
		}
		return functional.Fail[string](functional.NewDomainError("NEGATIVE", "Value is negative"))
	})

	// Then
	assertions.ResultError(boundResult, "Bound result should be Error")
	assertions.ResultErrorCode("NEGATIVE", boundResult, "Error code should be NEGATIVE")
}

func TestResult_Should_ChainBindOperations_When_MultipleBindsCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	result := functional.Ok(10)

	// When
	step1 := functional.Bind(result, func(x int) functional.Result[int] {
		if x > 5 {
			return functional.Ok(x * 2)
		}
		return functional.Fail[int](functional.NewDomainError("TOO_SMALL", "Value too small"))
	})
	step2 := functional.Bind(step1, func(x int) functional.Result[int] {
		if x < 100 {
			return functional.Ok(x + 5)
		}
		return functional.Fail[int](functional.NewDomainError("TOO_LARGE", "Value too large"))
	})
	finalResult := functional.Bind(step2, func(x int) functional.Result[string] {
		return functional.Ok("Result: " + strconv.Itoa(x))
	})

	// Then
	assertions.ResultOk(finalResult, "Final result should be Ok")
	assertions.ResultValue("Result: 25", finalResult, "Final value should be 'Result: 25'")
}

func TestResult_Should_MixMapAndBind_When_CombinedOperationsUsed(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	result := functional.Ok(8)

	// When
	step1 := functional.Map(result, func(x int) int { return x * 2 }) // 16
	step2 := functional.Bind(step1, func(x int) functional.Result[int] {
		if x%2 == 0 {
			return functional.Ok(x / 2) // 8
		}
		return functional.Fail[int](functional.NewDomainError("ODD", "Value is odd"))
	})
	finalResult := functional.Map(step2, func(x int) string { return fmt.Sprintf("Final: %d", x) }) // "Final: 8"

	// Then
	assertions.ResultOk(finalResult, "Final result should be Ok")
	assertions.ResultValue("Final: 8", finalResult, "Final value should be 'Final: 8'")
}

func TestResult_Should_ExecuteCorrectPath_When_MatchOperationCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)

	testCases := []struct {
		name           string
		result         functional.Result[int]
		expectedOutput string
	}{
		{
			name:           "Success case",
			result:         functional.Ok(42),
			expectedOutput: "Success: 42",
		},
		{
			name:           "Error case",
			result:         functional.Fail[int](functional.NewDomainError("TEST.ERROR", "Test error")),
			expectedOutput: "Error: Test error",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// When
			output := functional.Match(tc.result,
				func(value int) string {
					return fmt.Sprintf("Success: %d", value)
				},
				func(err *functional.Error) string {
					return fmt.Sprintf("Error: %s", err.Message())
				},
			)

			// Then
			assertions.Equal(tc.expectedOutput, output, "Match output should be correct")
		})
	}
}

func TestResult_Should_ValidateCondition_When_EnsureOperationCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)

	testCases := []struct {
		name      string
		value     int
		predicate func(int) bool
		message   string
		shouldPass bool
	}{
		{
			name:      "Positive number validation passes",
			value:     10,
			predicate: func(x int) bool { return x > 0 },
			message:   "Must be positive",
			shouldPass: true,
		},
		{
			name:      "Positive number validation fails",
			value:     -5,
			predicate: func(x int) bool { return x > 0 },
			message:   "Must be positive",
			shouldPass: false,
		},
		{
			name:      "Even number validation passes",
			value:     8,
			predicate: func(x int) bool { return x%2 == 0 },
			message:   "Must be even",
			shouldPass: true,
		},
		{
			name:      "Even number validation fails",
			value:     7,
			predicate: func(x int) bool { return x%2 == 0 },
			message:   "Must be even",
			shouldPass: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Given
			result := functional.Ok(tc.value)

			// When
			ensuredResult := result.Ensure(tc.predicate, tc.message)

			// Then
			if tc.shouldPass {
				assertions.ResultOk(ensuredResult, "Ensure should pass")
				assertions.ResultValue(tc.value, ensuredResult, "Value should be preserved")
			} else {
				assertions.ResultError(ensuredResult, "Ensure should fail")
				assertions.True(len(ensuredResult.Error().Message()) > 0, "Error message should not be empty")
			}
		})
	}
}

func TestResult_Should_ChainEnsureOperations_When_MultipleValidationsNeeded(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	result := functional.Ok(10)

	// When
	validatedResult := result.
		Ensure(func(x int) bool { return x > 0 }, "Must be positive").
		Ensure(func(x int) bool { return x < 100 }, "Must be less than 100").
		Ensure(func(x int) bool { return x%2 == 0 }, "Must be even")

	// Then
	assertions.ResultOk(validatedResult, "All validations should pass")
	assertions.ResultValue(10, validatedResult, "Value should be preserved")
}

func TestResult_Should_StopAtFirstFailure_When_EnsureChainFails(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	result := functional.Ok(15) // Positive, less than 100, but odd

	// When
	validatedResult := result.
		Ensure(func(x int) bool { return x > 0 }, "Must be positive").      // Pass
		Ensure(func(x int) bool { return x < 100 }, "Must be less than 100"). // Pass
		Ensure(func(x int) bool { return x%2 == 0 }, "Must be even")         // Fail

	// Then
	assertions.ResultError(validatedResult, "Validation should fail at third ensure")
}

func TestResult_Should_HandleDifferentTypes_When_TypeConversionsPerformed(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)

	// String to int conversion
	stringResult := functional.Ok("123")
	intResult := functional.Map(stringResult,func(s string) int {
		val, _ := strconv.Atoi(s)
		return val
	})
	assertions.ResultOk(intResult, "String to int conversion should succeed")
	assertions.ResultValue(123, intResult, "Converted value should be 123")

	// Int to float conversion
	floatResult := functional.Map(intResult,func(i int) float64 {
		return float64(i) * 1.5
	})
	assertions.ResultOk(floatResult, "Int to float conversion should succeed")
	assertions.ResultValue(184.5, floatResult, "Converted value should be 184.5")

	// Float to string conversion
	finalResult := functional.Map(floatResult,func(f float64) string {
		return fmt.Sprintf("%.2f", f)
	})
	assertions.ResultOk(finalResult, "Float to string conversion should succeed")
	assertions.ResultValue("184.50", finalResult, "Final string should be '184.50'")
}

func TestResult_Should_PreserveErrorCategory_When_ErrorPropagated(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)

	testCases := []struct {
		name     string
		category functional.ErrorCategory
		factory  func(string, string) *functional.Error
	}{
		{"Domain Error", functional.Domain, functional.NewDomainError},
		{"Validation Error", functional.Validation, functional.NewValidationError},
		{"Infrastructure Error", functional.Infrastructure, functional.NewInfrastructureError},
		{"Concurrency Error", functional.Concurrency, functional.NewConcurrencyError},
		{"Security Error", functional.Security, functional.NewSecurityError},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Given
			err := tc.factory("TEST.CODE", "Test message")
			result := functional.Fail[int](err)

			// When
			step1 := functional.Map(result, func(x int) int { return x * 2 })
			propagatedResult := functional.Bind(step1, func(x int) functional.Result[string] {
				return functional.Ok(strconv.Itoa(x))
			})

			// Then
			assertions.ResultError(propagatedResult, "Result should remain error")
			assertions.ResultErrorCategory(tc.category, propagatedResult, "Error category should be preserved")
		})
	}
}

func TestResult_Should_HandleComplexBusinessScenarios_When_RealWorldOperationsPerformed(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)

	// Simulate order processing scenario
	type Order struct {
		ID       string
		Amount   float64
		Customer string
		Status   string
	}

	processOrder := func(orderID string) functional.Result[Order] {
		// Simulate validation
		if orderID == "" {
			return functional.Fail[Order](functional.NewValidationError("INVALID_ORDER_ID", "Order ID cannot be empty"))
		}

		// Simulate order creation
		order := Order{
			ID:       orderID,
			Amount:   100.0,
			Customer: "customer-123",
			Status:   "pending",
		}

		return functional.Ok(order)
	}

	validateOrder := func(order Order) functional.Result[Order] {
		if order.Amount <= 0 {
			return functional.Fail[Order](functional.NewDomainError("INVALID_AMOUNT", "Order amount must be positive"))
		}
		if order.Customer == "" {
			return functional.Fail[Order](functional.NewValidationError("MISSING_CUSTOMER", "Customer is required"))
		}
		return functional.Ok(order)
	}

	processPayment := func(order Order) functional.Result[Order] {
		// Simulate payment processing
		if order.Amount > 1000 {
			return functional.Fail[Order](functional.NewInfrastructureError("PAYMENT_FAILED", "Amount exceeds limit"))
		}

		processedOrder := order
		processedOrder.Status = "paid"
		return functional.Ok(processedOrder)
	}

	// When - Successful scenario
	step1 := processOrder("order-123")
	step2 := functional.Bind(step1, validateOrder)
	successResult := functional.Bind(step2, processPayment)

	// Then
	assertions.ResultOk(successResult, "Successful order processing should succeed")
	if successResult.IsOk() {
		order := successResult.Value()
		assertions.Equal("order-123", order.ID, "Order ID should be preserved")
		assertions.Equal("paid", order.Status, "Order status should be updated to paid")
	}

	// When - Failed scenario (empty order ID)
	step1Fail := processOrder("")
	step2Fail := functional.Bind(step1Fail, validateOrder)
	failureResult := functional.Bind(step2Fail, processPayment)

	// Then
	assertions.ResultError(failureResult, "Invalid order processing should fail")
	assertions.ResultErrorCategory(functional.Validation, failureResult, "Should be validation error")
}

func TestResult_Should_SupportErrorRecovery_When_RecoveryPatternsUsed(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)

	// Simulate a function that might fail
	riskyOperation := func(value int) functional.Result[int] {
		if value < 0 {
			return functional.Fail[int](functional.NewDomainError("NEGATIVE_VALUE", "Negative values not allowed"))
		}
		return functional.Ok(value * 2)
	}

	// Recovery function
	recoverFromError := func(err *functional.Error) functional.Result[int] {
		if err.Code() == "NEGATIVE_VALUE" {
			// Recover by using absolute value
			return functional.Ok(0) // Default safe value
		}
		return functional.Fail[int](err) // Re-throw other errors
	}

	// When - Test recovery
	result := functional.Match(riskyOperation(-5),
		func(value int) functional.Result[int] {
			return functional.Ok(value)
		},
		recoverFromError,
	)

	// Then
	assertions.ResultOk(result, "Error recovery should succeed")
	assertions.ResultValue(0, result, "Recovered value should be 0")
}

func TestResult_Should_HandleConcurrentAccess_When_AccessedFromMultipleGoroutines(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	result := functional.Ok(42)

	// When - Access from multiple goroutines
	done := make(chan bool, 10)
	for i := 0; i < 10; i++ {
		go func(index int) {
			defer func() { done <- true }()

			// Read operations should be safe
			isOk := result.IsOk()
			isError := result.IsError()

			if isOk {
				value := result.Value()
				if value != 42 {
					t.Errorf("Goroutine %d: Value consistency failed", index)
				}
			}

			if isError {
				t.Errorf("Goroutine %d: Result should not be error", index)
			}

			// Map operations should be safe (they create new instances)
			mapped := functional.Map(result,func(x int) int {
				return x * 2
			})

			if !mapped.IsOk() || mapped.Value() != 84 {
				t.Errorf("Goroutine %d: Map operation failed", index)
			}
		}(i)
	}

	// Wait for all goroutines
	for i := 0; i < 10; i++ {
		<-done
	}

	// Then - Original result should remain consistent
	assertions.True(result.IsOk(), "Original result should remain Ok")
	assertions.Equal(42, result.Value(), "Original value should remain unchanged")
}

// =============================================================================
// MONADIC LAWS VERIFICATION
// =============================================================================

func TestResult_Should_ObeyLeftIdentityLaw_When_MonadicOperationsPerformed(t *testing.T) {
	// Left Identity Law: Ok(a).Bind(f) ≡ f(a)
	// Given
	assertions := testutils.NewAssertions(t)
	value := 42
	f := func(x int) functional.Result[string] {
		return functional.Ok(strconv.Itoa(x))
	}

	// When
	leftSide := functional.Bind(functional.Ok(value), f)
	rightSide := f(value)

	// Then
	assertions.Equal(leftSide.IsOk(), rightSide.IsOk(), "Both sides should have same success state")
	if leftSide.IsOk() && rightSide.IsOk() {
		assertions.Equal(leftSide.Value(), rightSide.Value(), "Both sides should have same value")
	}
}

func TestResult_Should_ObeyRightIdentityLaw_When_MonadicOperationsPerformed(t *testing.T) {
	// Right Identity Law: m.Bind(Ok) ≡ m
	// Given
	assertions := testutils.NewAssertions(t)
	result := functional.Ok(42)

	// When
	boundResult := functional.Bind(result,func(x int) functional.Result[int] {
		return functional.Ok(x)
	})

	// Then
	assertions.Equal(result.IsOk(), boundResult.IsOk(), "Both results should have same success state")
	if result.IsOk() && boundResult.IsOk() {
		assertions.Equal(result.Value(), boundResult.Value(), "Both results should have same value")
	}
}

func TestResult_Should_ObeyAssociativityLaw_When_MonadicOperationsPerformed(t *testing.T) {
	// Associativity Law: m.Bind(f).Bind(g) ≡ m.Bind(x => f(x).Bind(g))
	// Given
	assertions := testutils.NewAssertions(t)
	result := functional.Ok(5)

	f := func(x int) functional.Result[int] {
		return functional.Ok(x * 2)
	}

	g := func(x int) functional.Result[string] {
		return functional.Ok(strconv.Itoa(x))
	}

	// When
	leftSide := functional.Bind(functional.Bind(result, f), g)
	rightSide := functional.Bind(result, func(x int) functional.Result[string] {
		return functional.Bind(f(x), g)
	})

	// Then
	assertions.Equal(leftSide.IsOk(), rightSide.IsOk(), "Both sides should have same success state")
	if leftSide.IsOk() && rightSide.IsOk() {
		assertions.Equal(leftSide.Value(), rightSide.Value(), "Both sides should have same value")
	}
}