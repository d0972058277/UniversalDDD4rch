package contract

import (
	"testing"

	"github.com/universalddd/architecture-core/functional"
)

// TestMaybe_Should_ProvideOptionalValueSemantics_When_Used
func TestMaybe_Should_ProvideOptionalValueSemantics_When_Used(t *testing.T) {
	t.Run("Should_CreateSomeValue_When_ValueProvided", func(t *testing.T) {
		// Given: Creating Maybe with value
		value := "test value"
		maybe := functional.Some(value)

		// When: Checking Maybe state
		// Then: Should have value
		if !maybe.HasValue() {
			t.Error("Some() should create Maybe with value")
		}
		if maybe.Value() != value {
			t.Error("Some() should store provided value")
		}
	})

	t.Run("Should_CreateNoneValue_When_NoCalled", func(t *testing.T) {
		// Given: Creating Maybe without value
		maybe := functional.None[string]()

		// When: Checking Maybe state
		// Then: Should not have value
		if maybe.HasValue() {
			t.Error("None() should create Maybe without value")
		}
	})

	t.Run("Should_MapValue_When_HasValue", func(t *testing.T) {
		// Given: Maybe with value
		maybe := functional.Some("hello")

		// When: Mapping value
		mapped := functional.MapMaybe(maybe, func(s string) int {
			return len(s)
		})

		// Then: Should create Some with mapped value
		if !mapped.HasValue() {
			t.Error("Map on Some should create Some")
		}
		if mapped.Value() != 5 {
			t.Error("Map should transform value correctly")
		}
	})

	t.Run("Should_NotMap_When_NoValue", func(t *testing.T) {
		// Given: Maybe without value
		maybe := functional.None[string]()

		// When: Mapping value
		mapped := functional.MapMaybe(maybe, func(s string) int {
			return len(s) // Should not execute
		})

		// Then: Should remain None
		if mapped.HasValue() {
			t.Error("Map on None should remain None")
		}
	})

	t.Run("Should_BindValue_When_HasValue", func(t *testing.T) {
		// Given: Maybe with value
		maybe := functional.Some("hello")

		// When: Binding to function that returns Maybe
		bound := functional.BindMaybe(maybe, func(s string) functional.Maybe[int] {
			if len(s) > 0 {
				return functional.Some(len(s))
			}
			return functional.None[int]()
		})

		// Then: Should execute bind function
		if !bound.HasValue() {
			t.Error("Bind on Some should execute function")
		}
		if bound.Value() != 5 {
			t.Error("Bind should return expected value")
		}
	})

	t.Run("Should_NotBind_When_NoValue", func(t *testing.T) {
		// Given: Maybe without value
		maybe := functional.None[string]()

		// When: Binding to function
		bound := functional.BindMaybe(maybe, func(s string) functional.Maybe[int] {
			return functional.Some(len(s)) // Should not execute
		})

		// Then: Should remain None
		if bound.HasValue() {
			t.Error("Bind on None should remain None")
		}
	})

	t.Run("Should_ReturnValue_When_OrElseWithValue", func(t *testing.T) {
		// Given: Maybe with value
		maybe := functional.Some("original")

		// When: Using ValueOr
		result := maybe.ValueOr("default")

		// Then: Should return original value
		if result != "original" {
			t.Error("ValueOr should return original value when present")
		}
	})

	t.Run("Should_ReturnDefault_When_ValueOrWithoutValue", func(t *testing.T) {
		// Given: Maybe without value
		maybe := functional.None[string]()

		// When: Using ValueOr
		result := maybe.ValueOr("default")

		// Then: Should return default value
		if result != "default" {
			t.Error("ValueOr should return default value when no value present")
		}
	})

	t.Run("Should_ReturnFactoryResult_When_OrElseFactoryWithoutValue", func(t *testing.T) {
		// Given: Maybe without value
		maybe := functional.None[string]()

		// When: Using OrElse with factory
		result := maybe.OrElseFunc(func() string {
			return "factory default"
		})

		// Then: Should return factory result
		if result != "factory default" {
			t.Error("OrElseFunc should call factory when no value present")
		}
	})

	t.Run("Should_NotCallFactory_When_OrElseFactoryWithValue", func(t *testing.T) {
		// Given: Maybe with value
		maybe := functional.Some("original")

		// When: Using OrElse with factory
		result := maybe.OrElseFunc(func() string {
			t.Error("Factory should not be called when value is present")
			return "should not execute"
		})

		// Then: Should return original value without calling factory
		if result != "original" {
			t.Error("OrElseFunc should return original value when present")
		}
	})

	t.Run("Should_MatchBothPaths_When_Called", func(t *testing.T) {
		// Given: Maybe with and without value
		some := functional.Some("test")
		none := functional.None[string]()

		// When: Matching both cases
		someResult := functional.MatchTyped(some,
			func(s string) string { return "has: " + s },
			func() string { return "no value" },
		)
		noneResult := functional.MatchTyped(none,
			func(s string) string { return "has: " + s },
			func() string { return "no value" },
		)

		// Then: Should execute correct path
		if someResult != "has: test" {
			t.Error("Match should execute Some path when value present")
		}
		if noneResult != "no value" {
			t.Error("Match should execute None path when no value")
		}
	})

	t.Run("Should_ConvertToResult_When_HasValue", func(t *testing.T) {
		// Given: Maybe with value
		maybe := functional.Some("test value")
		errorWhenNone := functional.DomainError("NO_VALUE", "No value present")

		// When: Converting to Result
		result := maybe.ToResultWithError(errorWhenNone)

		// Then: Should create success result
		if !result.IsOk() {
			t.Error("ToResult should create success when Maybe has value")
		}
		if result.Value() != "test value" {
			t.Error("ToResult should preserve value")
		}
	})

	t.Run("Should_ConvertToResult_When_NoValue", func(t *testing.T) {
		// Given: Maybe without value
		maybe := functional.None[string]()
		errorWhenNone := functional.DomainError("NO_VALUE", "No value present")

		// When: Converting to Result
		result := maybe.ToResultWithError(errorWhenNone)

		// Then: Should create failure result
		if !result.IsError() {
			t.Error("ToResult should create failure when Maybe has no value")
		}
		if result.Error() != errorWhenNone {
			t.Error("ToResult should use provided error when no value")
		}
	})
}