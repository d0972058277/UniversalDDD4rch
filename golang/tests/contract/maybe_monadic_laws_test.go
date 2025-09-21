package contract

import (
	"testing"

	"github.com/universalddd/architecture-core-go/pkg/functional"
)

// TestMaybe_Should_SatisfyMonadicLaws_When_Used
// Tests the three monadic laws: Left Identity, Right Identity, and Associativity
func TestMaybe_Should_SatisfyMonadicLaws_When_Used(t *testing.T) {
	t.Run("Should_SatisfyLeftIdentityLaw_When_BindingValue", func(t *testing.T) {
		// Given: A value and a monadic function
		value := "test value"
		f := func(s string) functional.Maybe[int] {
			return functional.Some(len(s))
		}

		// When: Applying the left identity law
		// unit(a).bind(f) === f(a)
		leftSide := functional.BindTyped(functional.Some(value), f)
		rightSide := f(value)

		// Then: Both sides should be equivalent
		if leftSide.HasValue() != rightSide.HasValue() {
			t.Error("Left identity law violated: value presence differs")
		}
		if leftSide.HasValue() && leftSide.Value() != rightSide.Value() {
			t.Error("Left identity law violated: values differ")
		}
	})

	t.Run("Should_SatisfyRightIdentityLaw_When_BindingUnit", func(t *testing.T) {
		// Given: A monadic Maybe value
		maybe := functional.Some("test value")

		// When: Applying the right identity law
		// m.bind(unit) === m
		leftSide := functional.BindTyped(maybe, func(s string) functional.Maybe[string] {
			return functional.Some(s) // This is the unit function
		})
		rightSide := maybe

		// Then: Both sides should be equivalent
		if leftSide.HasValue() != rightSide.HasValue() {
			t.Error("Right identity law violated: value presence differs")
		}
		if leftSide.HasValue() && leftSide.Value() != rightSide.Value() {
			t.Error("Right identity law violated: values differ")
		}
	})

	t.Run("Should_SatisfyAssociativityLaw_When_ChainingBinds", func(t *testing.T) {
		// Given: A monadic value and two functions
		maybe := functional.Some(10)
		f := func(i int) functional.Maybe[string] {
			if i > 0 {
				return functional.Some(string(rune('A' + i)))
			}
			return functional.None[string]()
		}
		g := func(s string) functional.Maybe[int] {
			return functional.Some(len(s))
		}

		// When: Applying the associativity law
		// m.bind(f).bind(g) === m.bind(x => f(x).bind(g))
		leftSide := functional.BindTyped(functional.BindTyped(maybe, f), g)
		rightSide := functional.BindTyped(maybe, func(x int) functional.Maybe[int] {
			return functional.BindTyped(f(x), g)
		})

		// Then: Both sides should be equivalent
		if leftSide.HasValue() != rightSide.HasValue() {
			t.Error("Associativity law violated: value presence differs")
		}
		if leftSide.HasValue() && leftSide.Value() != rightSide.Value() {
			t.Error("Associativity law violated: values differ")
		}
	})

	t.Run("Should_SatisfyLeftIdentityLaw_When_BindingToNone", func(t *testing.T) {
		// Given: A value and a function that returns None
		value := "test"
		f := func(s string) functional.Maybe[int] {
			return functional.None[int]() // Always return None
		}

		// When: Applying left identity law with None result
		leftSide := functional.BindTyped(functional.Some(value), f)
		rightSide := f(value)

		// Then: Both should be None
		if leftSide.HasValue() || rightSide.HasValue() {
			t.Error("Left identity law violated: should both be None")
		}
	})

	t.Run("Should_SatisfyRightIdentityLaw_When_StartingWithNone", func(t *testing.T) {
		// Given: A None Maybe
		maybe := functional.None[string]()

		// When: Applying right identity law
		leftSide := functional.BindTyped(maybe, func(s string) functional.Maybe[string] {
			return functional.Some(s)
		})
		rightSide := maybe

		// Then: Both should be None
		if leftSide.HasValue() || rightSide.HasValue() {
			t.Error("Right identity law violated: binding None should remain None")
		}
	})

	t.Run("Should_SatisfyAssociativityLaw_When_FirstFunctionReturnsNone", func(t *testing.T) {
		// Given: A monadic value and functions where first returns None
		maybe := functional.Some(10)
		f := func(i int) functional.Maybe[string] {
			return functional.None[string]() // Always return None
		}
		g := func(s string) functional.Maybe[int] {
			return functional.Some(len(s))
		}

		// When: Applying associativity law with first function returning None
		leftSide := functional.BindTyped(functional.BindTyped(maybe, f), g)
		rightSide := functional.BindTyped(maybe, func(x int) functional.Maybe[int] {
			return functional.BindTyped(f(x), g)
		})

		// Then: Both should be None
		if leftSide.HasValue() || rightSide.HasValue() {
			t.Error("Associativity law violated: should both be None when first function returns None")
		}
	})

	t.Run("Should_SatisfyAssociativityLaw_When_SecondFunctionReturnsNone", func(t *testing.T) {
		// Given: A monadic value and functions where second returns None
		maybe := functional.Some(10)
		f := func(i int) functional.Maybe[string] {
			return functional.Some("success")
		}
		g := func(s string) functional.Maybe[int] {
			return functional.None[int]() // Always return None
		}

		// When: Applying associativity law with second function returning None
		leftSide := functional.BindTyped(functional.BindTyped(maybe, f), g)
		rightSide := functional.BindTyped(maybe, func(x int) functional.Maybe[int] {
			return functional.BindTyped(f(x), g)
		})

		// Then: Both should be None
		if leftSide.HasValue() || rightSide.HasValue() {
			t.Error("Associativity law violated: should both be None when second function returns None")
		}
	})

	t.Run("Should_ShortCircuitOnNone_When_ChainingOperations", func(t *testing.T) {
		// Given: Starting with None
		maybe := functional.None[string]()

		// When: Chaining operations
		firstBind := functional.BindTyped(maybe, func(s string) functional.Maybe[int] {
			t.Error("This function should never be called on None")
			return functional.Some(len(s))
		})
		finalMaybe := functional.BindTyped(firstBind, func(i int) functional.Maybe[string] {
			t.Error("This function should never be called on None")
			return functional.Some("final")
		})

		// Then: Should remain None and not execute any functions
		if finalMaybe.HasValue() {
			t.Error("Monadic chain should short-circuit on None")
		}
	})

	t.Run("Should_SatisfyFunctorLaw_When_MappingComposition", func(t *testing.T) {
		// Given: A Maybe value and two functions
		maybe := functional.Some(5)
		f := func(i int) string { return string(rune('A' + i)) }
		g := func(s string) int { return len(s) }

		// When: Applying functor composition law
		// map(g ∘ f) === map(f).map(g)
		leftSide := functional.MapMaybe(maybe, func(i int) int {
			return g(f(i)) // Composition g ∘ f
		})
		rightSide := functional.MapMaybe(functional.MapMaybe(maybe, f), g)

		// Then: Both sides should be equivalent
		if leftSide.HasValue() != rightSide.HasValue() {
			t.Error("Functor composition law violated: value presence differs")
		}
		if leftSide.HasValue() && leftSide.Value() != rightSide.Value() {
			t.Error("Functor composition law violated: values differ")
		}
	})

	t.Run("Should_SatisfyFunctorIdentityLaw_When_MappingIdentity", func(t *testing.T) {
		// Given: A Maybe value
		maybe := functional.Some("test")

		// When: Applying functor identity law
		// map(id) === id
		mapped := functional.MapMaybe(maybe, func(s string) string { return s }) // Identity function

		// Then: Should be equivalent to original
		if maybe.HasValue() != mapped.HasValue() {
			t.Error("Functor identity law violated: value presence differs")
		}
		if maybe.HasValue() && maybe.Value() != mapped.Value() {
			t.Error("Functor identity law violated: values differ")
		}
	})
}