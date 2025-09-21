package contract

import (
	"testing"

	"github.com/universalddd/architecture-core-go/pkg/functional"
)

// TestResult_Should_SatisfyMonadicLaws_When_Used
// Tests the three monadic laws: Left Identity, Right Identity, and Associativity
func TestResult_Should_SatisfyMonadicLaws_When_Used(t *testing.T) {
	t.Run("Should_SatisfyLeftIdentityLaw_When_BindingValue", func(t *testing.T) {
		// Given: A value and a monadic function
		value := "test value"
		f := func(s string) functional.Result[int] {
			return functional.OkWith(len(s))
		}

		// When: Applying the left identity law
		// unit(a).bind(f) === f(a)
		leftSide := functional.OkWith(value).Bind(f)
		rightSide := f(value)

		// Then: Both sides should be equivalent
		if leftSide.IsSuccess() != rightSide.IsSuccess() {
			t.Error("Left identity law violated: success states differ")
		}
		if leftSide.IsSuccess() && leftSide.Value() != rightSide.Value() {
			t.Error("Left identity law violated: values differ")
		}
		if leftSide.IsFailure() && leftSide.Error() != rightSide.Error() {
			t.Error("Left identity law violated: errors differ")
		}
	})

	t.Run("Should_SatisfyRightIdentityLaw_When_BindingUnit", func(t *testing.T) {
		// Given: A monadic Result value
		result := functional.OkWith("test value")

		// When: Applying the right identity law
		// m.bind(unit) === m
		leftSide := result.Bind(func(s string) functional.Result[string] {
			return functional.OkWith(s) // This is the unit function
		})
		rightSide := result

		// Then: Both sides should be equivalent
		if leftSide.IsSuccess() != rightSide.IsSuccess() {
			t.Error("Right identity law violated: success states differ")
		}
		if leftSide.IsSuccess() && leftSide.Value() != rightSide.Value() {
			t.Error("Right identity law violated: values differ")
		}
	})

	t.Run("Should_SatisfyAssociativityLaw_When_ChainingBinds", func(t *testing.T) {
		// Given: A monadic value and two functions
		result := functional.OkWith(10)
		f := func(i int) functional.Result[string] {
			return functional.OkWith(string(rune('A' + i)))
		}
		g := func(s string) functional.Result[int] {
			return functional.OkWith(len(s))
		}

		// When: Applying the associativity law
		// m.bind(f).bind(g) === m.bind(x => f(x).bind(g))
		leftSide := result.Bind(f).Bind(g)
		rightSide := result.Bind(func(x int) functional.Result[int] {
			return f(x).Bind(g)
		})

		// Then: Both sides should be equivalent
		if leftSide.IsSuccess() != rightSide.IsSuccess() {
			t.Error("Associativity law violated: success states differ")
		}
		if leftSide.IsSuccess() && leftSide.Value() != rightSide.Value() {
			t.Error("Associativity law violated: values differ")
		}
		if leftSide.IsFailure() && leftSide.Error() != rightSide.Error() {
			t.Error("Associativity law violated: errors differ")
		}
	})

	t.Run("Should_SatisfyLeftIdentityLaw_When_BindingFailure", func(t *testing.T) {
		// Given: A value and a function that returns failure
		value := "test"
		err := functional.DomainError("TEST_ERROR", "Test error")
		f := func(s string) functional.Result[int] {
			return functional.FailWith[int](err)
		}

		// When: Applying left identity law with failure
		leftSide := functional.OkWith(value).Bind(f)
		rightSide := f(value)

		// Then: Both should be equivalent failures
		if leftSide.IsSuccess() || rightSide.IsSuccess() {
			t.Error("Left identity law violated: should both be failures")
		}
		if leftSide.Error() != rightSide.Error() {
			t.Error("Left identity law violated: errors should be equal")
		}
	})

	t.Run("Should_SatisfyAssociativityLaw_When_FirstFunctionFails", func(t *testing.T) {
		// Given: A monadic value and functions where first fails
		result := functional.OkWith(10)
		err := functional.DomainError("FIRST_FAIL", "First function failed")
		f := func(i int) functional.Result[string] {
			return functional.FailWith[string](err)
		}
		g := func(s string) functional.Result[int] {
			return functional.OkWith(len(s))
		}

		// When: Applying associativity law with failure
		leftSide := result.Bind(f).Bind(g)
		rightSide := result.Bind(func(x int) functional.Result[int] {
			return f(x).Bind(g)
		})

		// Then: Both should be equivalent failures
		if leftSide.IsSuccess() || rightSide.IsSuccess() {
			t.Error("Associativity law violated: should both be failures when first function fails")
		}
		if leftSide.Error() != rightSide.Error() {
			t.Error("Associativity law violated: failure errors should be equal")
		}
	})

	t.Run("Should_SatisfyAssociativityLaw_When_SecondFunctionFails", func(t *testing.T) {
		// Given: A monadic value and functions where second fails
		result := functional.OkWith(10)
		f := func(i int) functional.Result[string] {
			return functional.OkWith("success")
		}
		err := functional.DomainError("SECOND_FAIL", "Second function failed")
		g := func(s string) functional.Result[int] {
			return functional.FailWith[int](err)
		}

		// When: Applying associativity law with second function failure
		leftSide := result.Bind(f).Bind(g)
		rightSide := result.Bind(func(x int) functional.Result[int] {
			return f(x).Bind(g)
		})

		// Then: Both should be equivalent failures
		if leftSide.IsSuccess() || rightSide.IsSuccess() {
			t.Error("Associativity law violated: should both be failures when second function fails")
		}
		if leftSide.Error() != rightSide.Error() {
			t.Error("Associativity law violated: failure errors should be equal")
		}
	})

	t.Run("Should_PreserveErrorsInMonadicChain_When_EarlyFailure", func(t *testing.T) {
		// Given: Starting with a failure result
		err := functional.DomainError("INITIAL_ERROR", "Initial error")
		result := functional.FailWith[string](err)

		// When: Chaining operations
		finalResult := result.Bind(func(s string) functional.Result[int] {
			t.Error("This function should never be called on failure")
			return functional.OkWith(len(s))
		}).Bind(func(i int) functional.Result[string] {
			t.Error("This function should never be called on failure")
			return functional.OkWith("final")
		})

		// Then: Should preserve original error
		if finalResult.IsSuccess() {
			t.Error("Monadic chain should preserve initial failure")
		}
		if finalResult.Error() != err {
			t.Error("Monadic chain should preserve original error")
		}
	})
}