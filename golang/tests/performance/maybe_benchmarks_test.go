package performance

import (
	"strconv"
	"testing"

	"github.com/universalddd/architecture-core-go/pkg/functional"
	testutils "github.com/universalddd/architecture-core-go/internal/testing"
)

// =============================================================================
// BENCHMARK TESTS FOR MAYBE[T] OPERATIONS
// Requirements: Zero allocations and optimized equality operations (Research Goal)
// =============================================================================

func BenchmarkMaybe_Creation(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// Benchmark Some creation
	tester.BenchmarkOperation("Some_Creation_String", func() {
		_ = functional.Some("test value")
	})

	tester.BenchmarkOperation("Some_Creation_Int", func() {
		_ = functional.Some(42)
	})

	// Benchmark None creation
	tester.BenchmarkOperation("None_Creation_String", func() {
		_ = functional.None[string]()
	})

	tester.BenchmarkOperation("None_Creation_Int", func() {
		_ = functional.None[int]()
	})

	// Zero allocation tests - CRITICAL REQUIREMENT
	tester.BenchmarkZeroAlloc("Some_Creation_String", func() {
		_ = functional.Some("test value")
	})

	tester.BenchmarkZeroAlloc("Some_Creation_Int", func() {
		_ = functional.Some(42)
	})

	tester.BenchmarkZeroAlloc("None_Creation_String", func() {
		_ = functional.None[string]()
	})

	tester.BenchmarkZeroAlloc("None_Creation_Int", func() {
		_ = functional.None[int]()
	})
}

func BenchmarkMaybe_Map_SingleOperation(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// Setup
	someValue := functional.Some(42)
	noneValue := functional.None[int]()

	// Map on Some
	tester.BenchmarkOperation("Map_Some_IntToString", func() {
		_ = someValue.Map(func(x int) string {
			return strconv.Itoa(x)
		})
	})

	tester.BenchmarkOperation("Map_Some_Arithmetic", func() {
		_ = someValue.Map(func(x int) int {
			return x * 2
		})
	})

	// Map on None (should short-circuit)
	tester.BenchmarkOperation("Map_None_IntToString", func() {
		_ = noneValue.Map(func(x int) string {
			return strconv.Itoa(x) // This should not execute
		})
	})

	// Zero allocation tests
	tester.BenchmarkZeroAlloc("Map_Some_IntToString", func() {
		_ = someValue.Map(func(x int) string {
			return strconv.Itoa(x)
		})
	})

	tester.BenchmarkZeroAlloc("Map_Some_Arithmetic", func() {
		_ = someValue.Map(func(x int) int {
			return x * 2
		})
	})

	tester.BenchmarkZeroAlloc("Map_None_IntToString", func() {
		_ = noneValue.Map(func(x int) string {
			return strconv.Itoa(x)
		})
	})
}

func BenchmarkMaybe_Map_ChainedOperations(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// Setup
	someValue := functional.Some(42)
	noneValue := functional.None[int]()

	// Chain of 3 operations on Some
	tester.BenchmarkOperation("Map_Some_Chain_3_Operations", func() {
		_ = someValue.
			Map(func(x int) int { return x * 2 }).
			Map(func(x int) int { return x + 1 }).
			Map(func(x int) string { return strconv.Itoa(x) })
	})

	// Chain of 5 operations on Some
	tester.BenchmarkOperation("Map_Some_Chain_5_Operations", func() {
		_ = someValue.
			Map(func(x int) int { return x * 2 }).
			Map(func(x int) int { return x + 1 }).
			Map(func(x int) int { return x - 5 }).
			Map(func(x int) int { return x / 2 }).
			Map(func(x int) string { return strconv.Itoa(x) })
	})

	// Chain of operations on None (should short-circuit throughout)
	tester.BenchmarkOperation("Map_None_Chain_5_Operations", func() {
		_ = noneValue.
			Map(func(x int) int { return x * 2 }).
			Map(func(x int) int { return x + 1 }).
			Map(func(x int) int { return x - 5 }).
			Map(func(x int) int { return x / 2 }).
			Map(func(x int) string { return strconv.Itoa(x) })
	})

	// Zero allocation tests for chained operations
	tester.BenchmarkZeroAlloc("Map_Some_Chain_3_Operations", func() {
		_ = someValue.
			Map(func(x int) int { return x * 2 }).
			Map(func(x int) int { return x + 1 }).
			Map(func(x int) string { return strconv.Itoa(x) })
	})

	tester.BenchmarkZeroAlloc("Map_None_Chain_3_Operations", func() {
		_ = noneValue.
			Map(func(x int) int { return x * 2 }).
			Map(func(x int) int { return x + 1 }).
			Map(func(x int) string { return strconv.Itoa(x) })
	})
}

func BenchmarkMaybe_Bind_Operations(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// Setup
	someValue := functional.Some(42)
	noneValue := functional.None[int]()

	// Single bind operation on Some
	tester.BenchmarkOperation("Bind_Some_Single", func() {
		_ = someValue.Bind(func(x int) functional.Maybe[string] {
			if x > 0 {
				return functional.Some(strconv.Itoa(x))
			}
			return functional.None[string]()
		})
	})

	// Single bind operation on None
	tester.BenchmarkOperation("Bind_None_Single", func() {
		_ = noneValue.Bind(func(x int) functional.Maybe[string] {
			return functional.Some(strconv.Itoa(x)) // Should not execute
		})
	})

	// Chained bind operations on Some
	tester.BenchmarkOperation("Bind_Some_Chain_3", func() {
		_ = someValue.
			Bind(func(x int) functional.Maybe[int] {
				return functional.Some(x * 2)
			}).
			Bind(func(x int) functional.Maybe[int] {
				return functional.Some(x + 1)
			}).
			Bind(func(x int) functional.Maybe[string] {
				return functional.Some(strconv.Itoa(x))
			})
	})

	// Mixed Map and Bind operations
	tester.BenchmarkOperation("Mixed_Map_Bind_Some", func() {
		_ = someValue.
			Map(func(x int) int { return x * 2 }).
			Bind(func(x int) functional.Maybe[int] {
				if x > 50 {
					return functional.Some(x)
				}
				return functional.None[int]()
			}).
			Map(func(x int) string { return strconv.Itoa(x) })
	})

	// Zero allocation tests
	tester.BenchmarkZeroAlloc("Bind_Some_Single", func() {
		_ = someValue.Bind(func(x int) functional.Maybe[string] {
			return functional.Some(strconv.Itoa(x))
		})
	})

	tester.BenchmarkZeroAlloc("Bind_None_Single", func() {
		_ = noneValue.Bind(func(x int) functional.Maybe[string] {
			return functional.Some(strconv.Itoa(x))
		})
	})
}

func BenchmarkMaybe_Filter_Operations(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// Setup
	someValue := functional.Some(42)
	noneValue := functional.None[int]()

	// Filter with passing predicate
	tester.BenchmarkOperation("Filter_Some_Pass", func() {
		_ = someValue.Filter(func(x int) bool {
			return x > 0
		})
	})

	// Filter with failing predicate
	tester.BenchmarkOperation("Filter_Some_Fail", func() {
		_ = someValue.Filter(func(x int) bool {
			return x < 0
		})
	})

	// Filter on None
	tester.BenchmarkOperation("Filter_None", func() {
		_ = noneValue.Filter(func(x int) bool {
			return x > 0 // Should not execute
		})
	})

	// Multiple filters
	tester.BenchmarkOperation("Filter_Multiple", func() {
		_ = someValue.
			Filter(func(x int) bool { return x > 0 }).
			Filter(func(x int) bool { return x < 100 }).
			Filter(func(x int) bool { return x%2 == 0 })
	})

	// Zero allocation tests
	tester.BenchmarkZeroAlloc("Filter_Some_Pass", func() {
		_ = someValue.Filter(func(x int) bool {
			return x > 0
		})
	})

	tester.BenchmarkZeroAlloc("Filter_None", func() {
		_ = noneValue.Filter(func(x int) bool {
			return x > 0
		})
	})
}

func BenchmarkMaybe_OrElse_Operations(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// Setup
	someValue := functional.Some(42)
	noneValue := functional.None[int]()
	alternative := functional.Some(99)

	// OrElse on Some (should return original)
	tester.BenchmarkOperation("OrElse_Some", func() {
		_ = someValue.OrElse(alternative)
	})

	// OrElse on None (should return alternative)
	tester.BenchmarkOperation("OrElse_None", func() {
		_ = noneValue.OrElse(alternative)
	})

	// Zero allocation tests
	tester.BenchmarkZeroAlloc("OrElse_Some", func() {
		_ = someValue.OrElse(alternative)
	})

	tester.BenchmarkZeroAlloc("OrElse_None", func() {
		_ = noneValue.OrElse(alternative)
	})
}

func BenchmarkMaybe_StateQuery_Operations(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// Setup
	someValue := functional.Some(42)
	noneValue := functional.None[int]()

	// HasValue/IsNone calls
	tester.BenchmarkOperation("HasValue_Some", func() {
		_ = someValue.HasValue()
	})

	tester.BenchmarkOperation("HasValue_None", func() {
		_ = noneValue.HasValue()
	})

	tester.BenchmarkOperation("IsNone_Some", func() {
		_ = someValue.IsNone()
	})

	tester.BenchmarkOperation("IsNone_None", func() {
		_ = noneValue.IsNone()
	})

	// Value access
	tester.BenchmarkOperation("Value_Access", func() {
		if someValue.HasValue() {
			_ = someValue.Value()
		}
	})

	// ValueOr operations
	tester.BenchmarkOperation("ValueOr_Some", func() {
		_ = someValue.ValueOr(0)
	})

	tester.BenchmarkOperation("ValueOr_None", func() {
		_ = noneValue.ValueOr(0)
	})

	// Zero allocation tests - state queries should be zero allocation
	tester.BenchmarkZeroAlloc("HasValue_Some", func() {
		_ = someValue.HasValue()
	})

	tester.BenchmarkZeroAlloc("Value_Access", func() {
		if someValue.HasValue() {
			_ = someValue.Value()
		}
	})

	tester.BenchmarkZeroAlloc("ValueOr_Some", func() {
		_ = someValue.ValueOr(0)
	})
}

func BenchmarkMaybe_ToResult_Operations(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// Setup
	someValue := functional.Some(42)
	noneValue := functional.None[int]()

	// ToResult on Some
	tester.BenchmarkOperation("ToResult_Some", func() {
		_ = someValue.ToResult("No value")
	})

	// ToResult on None
	tester.BenchmarkOperation("ToResult_None", func() {
		_ = noneValue.ToResult("No value")
	})

	// Zero allocation tests
	tester.BenchmarkZeroAlloc("ToResult_Some", func() {
		_ = someValue.ToResult("No value")
	})
}

func BenchmarkMaybe_Different_Types(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// String Maybe
	stringMaybe := functional.Some("test string")
	tester.BenchmarkOperation("Map_String", func() {
		_ = stringMaybe.Map(func(s string) int {
			return len(s)
		})
	})

	// Boolean Maybe
	boolMaybe := functional.Some(true)
	tester.BenchmarkOperation("Map_Boolean", func() {
		_ = boolMaybe.Map(func(b bool) string {
			if b {
				return "true"
			}
			return "false"
		})
	})

	// Struct Maybe
	type testStruct struct {
		ID    int
		Name  string
		Value float64
	}
	structMaybe := functional.Some(testStruct{ID: 1, Name: "test", Value: 3.14})
	tester.BenchmarkOperation("Map_Struct", func() {
		_ = structMaybe.Map(func(s testStruct) string {
			return s.Name
		})
	})

	// Zero allocation tests for different types
	tester.BenchmarkZeroAlloc("Map_String", func() {
		_ = stringMaybe.Map(func(s string) int {
			return len(s)
		})
	})

	tester.BenchmarkZeroAlloc("Map_Boolean", func() {
		_ = boolMaybe.Map(func(b bool) string {
			if b {
				return "true"
			}
			return "false"
		})
	})
}

func BenchmarkMaybe_Parallel_Operations(b *testing.B) {
	// Test parallel access to Maybe operations
	maybe := functional.Some(42)

	b.Run("Map_Parallel", func(b *testing.B) {
		b.RunParallel(func(pb *testing.PB) {
			for pb.Next() {
				_ = maybe.Map(func(x int) int {
					return x * 2
				})
			}
		})
	})

	b.Run("HasValue_Parallel", func(b *testing.B) {
		b.RunParallel(func(pb *testing.PB) {
			for pb.Next() {
				_ = maybe.HasValue()
			}
		})
	})

	b.Run("Value_Access_Parallel", func(b *testing.B) {
		b.RunParallel(func(pb *testing.PB) {
			for pb.Next() {
				if maybe.HasValue() {
					_ = maybe.Value()
				}
			}
		})
	})
}

// =============================================================================
// COMPREHENSIVE MAYBE SCENARIOS
// =============================================================================

func BenchmarkMaybe_ComprehensiveScenarios(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// Scenario 1: Data processing pipeline with Maybe
	tester.BenchmarkOperation("Scenario_DataProcessing", func() {
		maybe := functional.Some("123")
		_ = maybe.
			Map(func(s string) int {
				val, _ := strconv.Atoi(s)
				return val
			}).
			Filter(func(x int) bool { return x > 0 }).
			Map(func(x int) float64 { return float64(x) * 1.5 }).
			Map(func(x float64) string { return strconv.FormatFloat(x, 'f', 2, 64) })
	})

	// Scenario 2: Safe navigation pattern
	tester.BenchmarkOperation("Scenario_SafeNavigation", func() {
		maybe := functional.Some(10)
		_ = maybe.
			Filter(func(x int) bool { return x > 5 }).
			Bind(func(x int) functional.Maybe[int] {
				if x%2 == 0 {
					return functional.Some(x / 2)
				}
				return functional.None[int]()
			}).
			Map(func(x int) string { return "Result: " + strconv.Itoa(x) }).
			OrElse(functional.Some("Default"))
	})

	// Scenario 3: Complex business logic with optional values
	tester.BenchmarkOperation("Scenario_BusinessLogic", func() {
		maybe := functional.Some(100)
		_ = maybe.
			Filter(func(x int) bool { return x >= 0 }).
			Map(func(x int) int { return x * 2 }).
			Filter(func(x int) bool { return x <= 1000 }).
			Bind(func(x int) functional.Maybe[int] {
				if x%10 == 0 {
					return functional.Some(x + 5)
				}
				return functional.Some(x)
			}).
			Map(func(x int) string { return "Final: " + strconv.Itoa(x) })
	})

	// Zero allocation validation for scenarios
	tester.BenchmarkZeroAlloc("Scenario_DataProcessing", func() {
		maybe := functional.Some("123")
		_ = maybe.
			Map(func(s string) int {
				val, _ := strconv.Atoi(s)
				return val
			}).
			Map(func(x int) float64 { return float64(x) * 1.5 })
	})
}

// =============================================================================
// MEMORY AND ALLOCATION TESTS
// =============================================================================

func TestMaybe_ZeroAllocations(t *testing.T) {
	// This test verifies the zero allocation requirement from research.md
	assertions := testutils.NewAssertions(t)

	maybe := functional.Some(42)

	// Test Map operations
	allocs := testutils.MeasureAllocations(func() {
		_ = maybe.Map(func(x int) int { return x * 2 })
	})
	assertions.Equal(0.0, allocs, "Map operation should have zero allocations")

	// Test Bind operations
	allocs = testutils.MeasureAllocations(func() {
		_ = maybe.Bind(func(x int) functional.Maybe[int] {
			return functional.Some(x + 1)
		})
	})
	assertions.Equal(0.0, allocs, "Bind operation should have zero allocations")

	// Test Filter operations
	allocs = testutils.MeasureAllocations(func() {
		_ = maybe.Filter(func(x int) bool { return x > 0 })
	})
	assertions.Equal(0.0, allocs, "Filter operation should have zero allocations")

	// Test chained operations
	allocs = testutils.MeasureAllocations(func() {
		_ = maybe.
			Map(func(x int) int { return x * 2 }).
			Filter(func(x int) bool { return x > 0 }).
			Map(func(x int) int { return x + 1 })
	})
	assertions.Equal(0.0, allocs, "Chained operations should have zero allocations")
}

func TestMaybe_PerformanceThresholds(t *testing.T) {
	// Validate performance meets the requirements from research.md
	expectations := testutils.ZeroAllocationExpectation(100 * time.Nanosecond)

	// Test single Map operation
	testutils.ValidatePerformance(t, "Maybe.Map", expectations, func() {
		maybe := functional.Some(42)
		_ = maybe.Map(func(x int) int { return x * 2 })
	})

	// Test single Bind operation
	testutils.ValidatePerformance(t, "Maybe.Bind", expectations, func() {
		maybe := functional.Some(42)
		_ = maybe.Bind(func(x int) functional.Maybe[int] {
			return functional.Some(x + 1)
		})
	})

	// Test state queries
	stateExpectations := testutils.ZeroAllocationExpectation(10 * time.Nanosecond)
	testutils.ValidatePerformance(t, "Maybe.HasValue", stateExpectations, func() {
		maybe := functional.Some(42)
		_ = maybe.HasValue()
	})
}