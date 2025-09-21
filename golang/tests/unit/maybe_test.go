package unit

import (
	"fmt"
	"strconv"
	"testing"

	"github.com/universalddd/architecture-core-go/pkg/functional"
	testutils "github.com/universalddd/architecture-core-go/internal/testing"
)

// =============================================================================
// UNIT TESTS FOR MAYBE[T] SCENARIOS
// Requirements: Optional values, monadic operations, zero allocations
// =============================================================================

func TestMaybe_Should_CreateSomeValue_When_SomeFactoryUsed(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	value := "test value"

	// When
	maybe := functional.Some(value)

	// Then
	assertions.True(maybe.HasValue(), "Maybe should have value")
	assertions.True(maybe.IsSome(), "IsSome should return true")
	assertions.False(maybe.IsNone(), "IsNone should return false")
	assertions.Equal(value, maybe.Value(), "Value should match input")
}

func TestMaybe_Should_CreateNoneValue_When_NoneFactoryUsed(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)

	// When
	maybe := functional.None[string]()

	// Then
	assertions.False(maybe.HasValue(), "Maybe should not have value")
	assertions.False(maybe.IsSome(), "IsSome should return false")
	assertions.True(maybe.IsNone(), "IsNone should return true")
}

func TestMaybe_Should_ApplyFunction_When_MapOperationOnSomeValue(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	maybe := functional.Some(42)

	// When
	mapped := functional.MapToMaybe(maybe, func(x int) string {
		return strconv.Itoa(x)
	})

	// Then
	assertions.True(mapped.HasValue(), "Mapped maybe should have value")
	assertions.Equal("42", mapped.Value(), "Mapped value should be string representation")
}

func TestMaybe_Should_ReturnNone_When_MapOperationOnNoneValue(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	maybe := functional.None[int]()

	// When
	mapped := functional.MapToMaybe(maybe, func(x int) string {
		return strconv.Itoa(x) // This should not execute
	})

	// Then
	assertions.False(mapped.HasValue(), "Mapped maybe should not have value")
	assertions.True(mapped.IsNone(), "Mapped maybe should be None")
}

func TestMaybe_Should_ChainOperations_When_MultipleMapsCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	maybe := functional.Some(10)

	// When
	step1 := functional.MapToMaybe(maybe, func(x int) int { return x * 2 })     // 20
	step2 := functional.MapToMaybe(step1, func(x int) int { return x + 5 })     // 25
	final := functional.MapToMaybe(step2, func(x int) string { return strconv.Itoa(x) }) // "25"

	// Then
	assertions.True(final.HasValue(), "Final maybe should have value")
	assertions.Equal("25", final.Value(), "Final value should be '25'")
}

func TestMaybe_Should_StopChain_When_NoneOccursInChain(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	maybe := functional.None[int]()

	// When
	step1 := functional.MapToMaybe(maybe, func(x int) int { return x * 2 })     // Should not execute
	step2 := functional.MapToMaybe(step1, func(x int) int { return x + 5 })     // Should not execute
	final := functional.MapToMaybe(step2, func(x int) string { return strconv.Itoa(x) }) // Should not execute

	// Then
	assertions.False(final.HasValue(), "Final maybe should not have value")
	assertions.True(final.IsNone(), "Final maybe should be None")
}

func TestMaybe_Should_BindSuccessfully_When_BindOperationOnSomeValue(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	maybe := functional.Some(42)

	// When
	bound := functional.BindToMaybe(maybe, func(x int) functional.Maybe[string] {
		if x > 0 {
			return functional.Some(strconv.Itoa(x))
		}
		return functional.None[string]()
	})

	// Then
	assertions.True(bound.HasValue(), "Bound maybe should have value")
	assertions.Equal("42", bound.Value(), "Bound value should be '42'")
}

func TestMaybe_Should_ReturnNone_When_BindOperationOnNoneValue(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	maybe := functional.None[int]()

	// When
	bound := functional.BindToMaybe(maybe, func(x int) functional.Maybe[string] {
		return functional.Some(strconv.Itoa(x)) // Should not execute
	})

	// Then
	assertions.False(bound.HasValue(), "Bound maybe should not have value")
	assertions.True(bound.IsNone(), "Bound maybe should be None")
}

func TestMaybe_Should_ReturnNone_When_BindFunctionReturnsNone(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	maybe := functional.Some(-5)

	// When
	bound := functional.BindToMaybe(maybe, func(x int) functional.Maybe[string] {
		if x > 0 {
			return functional.Some(strconv.Itoa(x))
		}
		return functional.None[string]() // Return None for negative values
	})

	// Then
	assertions.False(bound.HasValue(), "Bound maybe should not have value")
	assertions.True(bound.IsNone(), "Bound maybe should be None")
}

func TestMaybe_Should_ChainBindOperations_When_MultipleBindsCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	maybe := functional.Some(10)

	// When
	step1 := functional.BindToMaybe(maybe, func(x int) functional.Maybe[int] {
		if x > 5 {
			return functional.Some(x * 2)
		}
		return functional.None[int]()
	})
	step2 := functional.BindToMaybe(step1, func(x int) functional.Maybe[int] {
		if x < 100 {
			return functional.Some(x + 5)
		}
		return functional.None[int]()
	})
	final := functional.BindToMaybe(step2, func(x int) functional.Maybe[string] {
		return functional.Some("Result: " + strconv.Itoa(x))
	})

	// Then
	assertions.True(final.HasValue(), "Final maybe should have value")
	assertions.Equal("Result: 25", final.Value(), "Final value should be 'Result: 25'")
}

func TestMaybe_Should_FilterValue_When_FilterOperationCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)

	testCases := []struct {
		name       string
		value      int
		predicate  func(int) bool
		shouldPass bool
	}{
		{
			name:       "Even number filter passes",
			value:      8,
			predicate:  func(x int) bool { return x%2 == 0 },
			shouldPass: true,
		},
		{
			name:       "Even number filter fails",
			value:      7,
			predicate:  func(x int) bool { return x%2 == 0 },
			shouldPass: false,
		},
		{
			name:       "Positive number filter passes",
			value:      10,
			predicate:  func(x int) bool { return x > 0 },
			shouldPass: true,
		},
		{
			name:       "Positive number filter fails",
			value:      -5,
			predicate:  func(x int) bool { return x > 0 },
			shouldPass: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Given
			maybe := functional.Some(tc.value)

			// When
			filtered := maybe.Filter(tc.predicate)

			// Then
			if tc.shouldPass {
				assertions.True(filtered.HasValue(), "Filtered maybe should have value")
				assertions.Equal(tc.value, filtered.Value(), "Value should be preserved")
			} else {
				assertions.False(filtered.HasValue(), "Filtered maybe should not have value")
				assertions.True(filtered.IsNone(), "Filtered maybe should be None")
			}
		})
	}
}

func TestMaybe_Should_ReturnNone_When_FilterOperationOnNoneValue(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	maybe := functional.None[int]()

	// When
	filtered := maybe.Filter(func(x int) bool {
		return x > 0 // Should not execute
	})

	// Then
	assertions.False(filtered.HasValue(), "Filtered maybe should not have value")
	assertions.True(filtered.IsNone(), "Filtered maybe should be None")
}

func TestMaybe_Should_ReturnValue_When_OrElseCalledOnSomeValue(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	maybe := functional.Some("actual value")
	defaultValue := "default value"

	// When
	result := maybe.OrElse(defaultValue)

	// Then
	assertions.Equal("actual value", result, "Should return actual value")
}

func TestMaybe_Should_ReturnDefault_When_OrElseCalledOnNoneValue(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	maybe := functional.None[string]()
	defaultValue := "default value"

	// When
	result := maybe.OrElse(defaultValue)

	// Then
	assertions.Equal("default value", result, "Should return default value")
}

func TestMaybe_Should_ReturnValue_When_OrElseFuncCalledOnSomeValue(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	maybe := functional.Some("actual value")

	// When
	result := maybe.OrElseFunc(func() string {
		return "factory value" // Should not execute
	})

	// Then
	assertions.Equal("actual value", result, "Should return actual value")
}

func TestMaybe_Should_ReturnFactoryValue_When_OrElseFuncCalledOnNoneValue(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	maybe := functional.None[string]()

	// When
	result := maybe.OrElseFunc(func() string {
		return "factory value"
	})

	// Then
	assertions.Equal("factory value", result, "Should return factory value")
}

func TestMaybe_Should_ExecuteCorrectPath_When_MatchOperationCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)

	testCases := []struct {
		name           string
		maybe          functional.Maybe[int]
		expectedOutput string
	}{
		{
			name:           "Some case",
			maybe:          functional.Some(42),
			expectedOutput: "Value: 42",
		},
		{
			name:           "None case",
			maybe:          functional.None[int](),
			expectedOutput: "No value",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// When
			output := functional.MatchToMaybe(tc.maybe,
				func(value int) string {
					return fmt.Sprintf("Value: %d", value)
				},
				func() string {
					return "No value"
				},
			)

			// Then
			assertions.Equal(tc.expectedOutput, output, "Match output should be correct")
		})
	}
}

func TestMaybe_Should_ConvertToResult_When_ToResultCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	errorWhenNone := functional.NewDomainError("NO_VALUE", "No value present")

	// When - Some case
	someValue := functional.Some(42)
	someResult := someValue.ToResult(*errorWhenNone)

	// Then
	assertions.True(someResult.IsOk(), "Result from Some should be Ok")
	assertions.Equal(42, someResult.Value(), "Result value should match Some value")

	// When - None case
	noneValue := functional.None[int]()
	noneResult := noneValue.ToResult(*errorWhenNone)

	// Then
	assertions.True(noneResult.IsError(), "Result from None should be Error")
	assertions.Equal("NO_VALUE", noneResult.Error().Code(), "Error code should match")
}

func TestMaybe_Should_ConvertToPointer_When_ToPointerCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)

	// When - Some case
	someValue := functional.Some(42)
	somePtr := someValue.ToPointer()

	// Then
	assertions.NotNil(somePtr, "Pointer from Some should not be nil")
	assertions.Equal(42, *somePtr, "Pointer value should match Some value")

	// When - None case
	noneValue := functional.None[int]()
	nonePtr := noneValue.ToPointer()

	// Then
	assertions.Nil(nonePtr, "Pointer from None should be nil")
}

func TestMaybe_Should_CreateFromPointer_When_FromPointerCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	value := 42

	// When - Non-nil pointer
	ptr := &value
	maybeFromPtr := functional.FromPointer(ptr)

	// Then
	assertions.True(maybeFromPtr.HasValue(), "Maybe from non-nil pointer should have value")
	assertions.Equal(42, maybeFromPtr.Value(), "Value should match pointer value")

	// When - Nil pointer
	var nilPtr *int = nil
	maybeFromNil := functional.FromPointer(nilPtr)

	// Then
	assertions.False(maybeFromNil.HasValue(), "Maybe from nil pointer should not have value")
	assertions.True(maybeFromNil.IsNone(), "Maybe from nil pointer should be None")
}

func TestMaybe_Should_HandleDifferentTypes_When_TypeConversionsPerformed(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)

	// String to int conversion
	stringMaybe := functional.Some("123")
	intMaybe := functional.MapToMaybe(stringMaybe, func(s string) int {
		val, _ := strconv.Atoi(s)
		return val
	})
	assertions.True(intMaybe.HasValue(), "String to int conversion should succeed")
	assertions.Equal(123, intMaybe.Value(), "Converted value should be 123")

	// Int to float conversion
	floatMaybe := functional.MapToMaybe(intMaybe, func(i int) float64 {
		return float64(i) * 1.5
	})
	assertions.True(floatMaybe.HasValue(), "Int to float conversion should succeed")
	assertions.Equal(184.5, floatMaybe.Value(), "Converted value should be 184.5")

	// Float to string conversion
	finalMaybe := functional.MapToMaybe(floatMaybe, func(f float64) string {
		return fmt.Sprintf("%.2f", f)
	})
	assertions.True(finalMaybe.HasValue(), "Float to string conversion should succeed")
	assertions.Equal("184.50", finalMaybe.Value(), "Final string should be '184.50'")
}

func TestMaybe_Should_SupportLinqStyleOperations_When_AliasMethodsUsed(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	maybe := functional.Some(10)

	// When - Using LINQ-style aliases
	result := functional.SelectToMaybe(
		maybe.Where(func(x int) bool { return x > 5 }), // Filter using Where
		func(x int) string { return strconv.Itoa(x * 2) }, // Transform using Select
	)

	// Then
	assertions.True(result.HasValue(), "LINQ-style operations should succeed")
	assertions.Equal("20", result.Value(), "Result should be '20'")
}

func TestMaybe_Should_HandleComplexBusinessScenarios_When_RealWorldOperationsPerformed(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)

	// Simulate user lookup scenario
	type User struct {
		ID       int
		Name     string
		Email    string
		Age      int
		IsActive bool
	}

	findUserByID := func(id int) functional.Maybe[User] {
		if id <= 0 {
			return functional.None[User]()
		}
		return functional.Some(User{
			ID:       id,
			Name:     "John Doe",
			Email:    "john@example.com",
			Age:      30,
			IsActive: true,
		})
	}

	validateUser := func(user User) functional.Maybe[User] {
		if !user.IsActive || user.Age < 18 {
			return functional.None[User]()
		}
		return functional.Some(user)
	}

	getUserEmail := func(user User) string {
		return user.Email
	}

	// When - Successful scenario
	successResult := functional.BindToMaybe(
		findUserByID(123),
		func(user User) functional.Maybe[User] {
			return validateUser(user)
		},
	)

	// Then
	assertions.True(successResult.HasValue(), "User lookup should succeed")
	if successResult.HasValue() {
		user := successResult.Value()
		assertions.Equal(123, user.ID, "User ID should be preserved")
		assertions.Equal("john@example.com", getUserEmail(user), "User email should be accessible")
	}

	// When - Failed scenario (invalid ID)
	failureResult := functional.BindToMaybe(
		findUserByID(0),
		func(user User) functional.Maybe[User] {
			return validateUser(user)
		},
	)

	// Then
	assertions.False(failureResult.HasValue(), "Invalid user lookup should fail")
	assertions.True(failureResult.IsNone(), "Result should be None")
}

func TestMaybe_Should_HandleConcurrentAccess_When_AccessedFromMultipleGoroutines(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	maybe := functional.Some(42)

	// When - Access from multiple goroutines
	done := make(chan bool, 10)
	for i := 0; i < 10; i++ {
		go func(index int) {
			defer func() { done <- true }()

			// Read operations should be safe
			hasValue := maybe.HasValue()
			isSome := maybe.IsSome()
			isNone := maybe.IsNone()

			if !hasValue {
				t.Errorf("Goroutine %d: HasValue consistency failed", index)
			}
			if !isSome {
				t.Errorf("Goroutine %d: IsSome consistency failed", index)
			}
			if isNone {
				t.Errorf("Goroutine %d: IsNone consistency failed", index)
			}

			// Value access should be safe
			value := maybe.Value()
			if value != 42 {
				t.Errorf("Goroutine %d: Value consistency failed", index)
			}

			// Map operations should be safe (they create new instances)
			mapped := functional.MapToMaybe(maybe, func(x int) int {
				return x * 2
			})

			if !mapped.HasValue() || mapped.Value() != 84 {
				t.Errorf("Goroutine %d: Map operation failed", index)
			}
		}(i)
	}

	// Wait for all goroutines
	for i := 0; i < 10; i++ {
		<-done
	}

	// Then - Original maybe should remain consistent
	assertions.True(maybe.HasValue(), "Original maybe should remain Some")
	assertions.Equal(42, maybe.Value(), "Original value should remain unchanged")
}

func TestMaybe_Should_HandleStringRepresentation_When_StringMethodCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)

	// When - Some case
	someValue := functional.Some(42)
	someStr := someValue.String()

	// Then
	assertions.Equal("Some(42)", someStr, "Some string representation should be correct")

	// When - None case
	noneValue := functional.None[int]()
	noneStr := noneValue.String()

	// Then
	assertions.Equal("None", noneStr, "None string representation should be correct")
}

// =============================================================================
// MONADIC LAWS VERIFICATION
// =============================================================================

func TestMaybe_Should_ObeyLeftIdentityLaw_When_MonadicOperationsPerformed(t *testing.T) {
	// Left Identity Law: Some(a).Bind(f) ≡ f(a)
	// Given
	assertions := testutils.NewAssertions(t)
	value := 42
	f := func(x int) functional.Maybe[string] {
		return functional.Some(strconv.Itoa(x))
	}

	// When
	leftSide := functional.BindToMaybe(functional.Some(value), f)
	rightSide := f(value)

	// Then
	assertions.Equal(leftSide.HasValue(), rightSide.HasValue(), "Both sides should have same presence state")
	if leftSide.HasValue() && rightSide.HasValue() {
		assertions.Equal(leftSide.Value(), rightSide.Value(), "Both sides should have same value")
	}
}

func TestMaybe_Should_ObeyRightIdentityLaw_When_MonadicOperationsPerformed(t *testing.T) {
	// Right Identity Law: m.Bind(Some) ≡ m
	// Given
	assertions := testutils.NewAssertions(t)
	maybe := functional.Some(42)

	// When
	bound := functional.BindToMaybe(maybe, func(x int) functional.Maybe[int] {
		return functional.Some(x)
	})

	// Then
	assertions.Equal(maybe.HasValue(), bound.HasValue(), "Both maybes should have same presence state")
	if maybe.HasValue() && bound.HasValue() {
		assertions.Equal(maybe.Value(), bound.Value(), "Both maybes should have same value")
	}
}

func TestMaybe_Should_ObeyAssociativityLaw_When_MonadicOperationsPerformed(t *testing.T) {
	// Associativity Law: m.Bind(f).Bind(g) ≡ m.Bind(x => f(x).Bind(g))
	// Given
	assertions := testutils.NewAssertions(t)
	maybe := functional.Some(5)

	f := func(x int) functional.Maybe[int] {
		return functional.Some(x * 2)
	}

	g := func(x int) functional.Maybe[string] {
		return functional.Some(strconv.Itoa(x))
	}

	// When
	leftSide := functional.BindToMaybe(
		functional.BindToMaybe(maybe, f),
		g,
	)
	rightSide := functional.BindToMaybe(maybe, func(x int) functional.Maybe[string] {
		return functional.BindToMaybe(f(x), g)
	})

	// Then
	assertions.Equal(leftSide.HasValue(), rightSide.HasValue(), "Both sides should have same presence state")
	if leftSide.HasValue() && rightSide.HasValue() {
		assertions.Equal(leftSide.Value(), rightSide.Value(), "Both sides should have same value")
	}
}

// =============================================================================
// EDGE CASES AND ERROR CONDITIONS
// =============================================================================

func TestMaybe_Should_HandleEdgeCases_When_UnusualInputsProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)

	// Zero values
	zeroInt := functional.Some(0)
	assertions.True(zeroInt.HasValue(), "Some(0) should have value")
	assertions.Equal(0, zeroInt.Value(), "Zero value should be preserved")

	// Empty string
	emptyString := functional.Some("")
	assertions.True(emptyString.HasValue(), "Some(\"\") should have value")
	assertions.Equal("", emptyString.Value(), "Empty string should be preserved")

	// Boolean values
	trueBool := functional.Some(true)
	falseBool := functional.Some(false)
	assertions.True(trueBool.HasValue() && falseBool.HasValue(), "Boolean values should be preserved")
	assertions.Equal(true, trueBool.Value(), "True value should be preserved")
	assertions.Equal(false, falseBool.Value(), "False value should be preserved")
}

func TestMaybe_Should_HandleNilPointerOperations_When_ConvertingFromNilPointers(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)

	// When - Converting from nil pointer
	var nilStringPtr *string = nil
	maybeFromNil := functional.FromPointer(nilStringPtr)

	// Then
	assertions.False(maybeFromNil.HasValue(), "Maybe from nil pointer should not have value")
	assertions.True(maybeFromNil.IsNone(), "Maybe from nil pointer should be None")

	// When - Converting Some to pointer and back
	original := functional.Some("test")
	ptr := original.ToPointer()
	roundTrip := functional.FromPointer(ptr)

	// Then
	assertions.True(roundTrip.HasValue(), "Round trip should preserve Some")
	assertions.Equal("test", roundTrip.Value(), "Round trip should preserve value")

	// When - Converting None to pointer and back
	noneOriginal := functional.None[string]()
	nonePtr := noneOriginal.ToPointer()
	noneRoundTrip := functional.FromPointer(nonePtr)

	// Then
	assertions.False(noneRoundTrip.HasValue(), "Round trip should preserve None")
	assertions.True(noneRoundTrip.IsNone(), "Round trip None should be None")
}

// =============================================================================
// TABLE-DRIVEN TESTS
// =============================================================================

func TestMaybe_Should_HandleVariousFilterOperations_When_DifferentPredicatesApplied(t *testing.T) {
	// Given
	testCases := []struct {
		name       string
		value      int
		predicate  func(int) bool
		shouldPass bool
	}{
		{"Positive filter with positive value", 10, func(x int) bool { return x > 0 }, true},
		{"Positive filter with negative value", -5, func(x int) bool { return x > 0 }, false},
		{"Positive filter with zero", 0, func(x int) bool { return x > 0 }, false},
		{"Even filter with even value", 8, func(x int) bool { return x%2 == 0 }, true},
		{"Even filter with odd value", 7, func(x int) bool { return x%2 == 0 }, false},
		{"Range filter with value in range", 50, func(x int) bool { return x >= 1 && x <= 100 }, true},
		{"Range filter with value below range", 0, func(x int) bool { return x >= 1 && x <= 100 }, false},
		{"Range filter with value above range", 101, func(x int) bool { return x >= 1 && x <= 100 }, false},
		{"Always true filter", 42, func(x int) bool { return true }, true},
		{"Always false filter", 42, func(x int) bool { return false }, false},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Given
			assertions := testutils.NewAssertions(t)
			maybe := functional.Some(tc.value)

			// When
			filtered := maybe.Filter(tc.predicate)

			// Then
			if tc.shouldPass {
				assertions.True(filtered.HasValue(), "Filter should pass")
				assertions.Equal(tc.value, filtered.Value(), "Value should be preserved")
			} else {
				assertions.False(filtered.HasValue(), "Filter should fail")
				assertions.True(filtered.IsNone(), "Result should be None")
			}
		})
	}
}