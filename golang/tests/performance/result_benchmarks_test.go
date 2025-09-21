package performance

import (
	"strconv"
	"testing"

	"github.com/universalddd/architecture-core-go/pkg/functional"
	testutils "github.com/universalddd/architecture-core-go/internal/testing"
)

// =============================================================================
// BENCHMARK TESTS FOR RESULT[T] OPERATIONS
// Requirements: Zero allocations for Map/Bind operations (Research Goal)
// =============================================================================

func BenchmarkResult_Creation(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// Benchmark Ok creation
	tester.BenchmarkOperation("Ok_Creation_String", func() {
		_ = functional.Ok("test value")
	})

	tester.BenchmarkOperation("Ok_Creation_Int", func() {
		_ = functional.Ok(42)
	})

	// Benchmark Fail creation
	tester.BenchmarkOperation("Fail_Creation", func() {
		err := functional.NewDomainError("TEST.ERROR", "Test error")
		_ = functional.Fail[string](err)
	})

	// Zero allocation tests
	tester.BenchmarkZeroAlloc("Ok_Creation_String", func() {
		_ = functional.Ok("test value")
	})

	tester.BenchmarkZeroAlloc("Ok_Creation_Int", func() {
		_ = functional.Ok(42)
	})
}

func BenchmarkResult_Map_SingleOperation(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// Setup
	result := functional.Ok(42)

	// String conversion
	tester.BenchmarkOperation("Map_IntToString", func() {
		_ = result.Map(func(x int) string {
			return strconv.Itoa(x)
		})
	})

	// Arithmetic operation
	tester.BenchmarkOperation("Map_Arithmetic", func() {
		_ = result.Map(func(x int) int {
			return x * 2
		})
	})

	// Boolean conversion
	tester.BenchmarkOperation("Map_ToBoolean", func() {
		_ = result.Map(func(x int) bool {
			return x > 0
		})
	})

	// Zero allocation tests - CRITICAL REQUIREMENT
	tester.BenchmarkZeroAlloc("Map_IntToString", func() {
		_ = result.Map(func(x int) string {
			return strconv.Itoa(x)
		})
	})

	tester.BenchmarkZeroAlloc("Map_Arithmetic", func() {
		_ = result.Map(func(x int) int {
			return x * 2
		})
	})
}

func BenchmarkResult_Map_ChainedOperations(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// Setup
	result := functional.Ok(42)

	// Chain of 3 operations
	tester.BenchmarkOperation("Map_Chain_3_Operations", func() {
		_ = result.
			Map(func(x int) int { return x * 2 }).
			Map(func(x int) int { return x + 1 }).
			Map(func(x int) string { return strconv.Itoa(x) })
	})

	// Chain of 5 operations
	tester.BenchmarkOperation("Map_Chain_5_Operations", func() {
		_ = result.
			Map(func(x int) int { return x * 2 }).
			Map(func(x int) int { return x + 1 }).
			Map(func(x int) int { return x - 5 }).
			Map(func(x int) int { return x / 2 }).
			Map(func(x int) string { return strconv.Itoa(x) })
	})

	// Chain of 10 operations
	tester.BenchmarkOperation("Map_Chain_10_Operations", func() {
		_ = result.
			Map(func(x int) int { return x * 2 }).
			Map(func(x int) int { return x + 1 }).
			Map(func(x int) int { return x - 5 }).
			Map(func(x int) int { return x / 2 }).
			Map(func(x int) int { return x * 3 }).
			Map(func(x int) int { return x + 10 }).
			Map(func(x int) int { return x - 2 }).
			Map(func(x int) int { return x / 4 }).
			Map(func(x int) int { return x + 7 }).
			Map(func(x int) string { return strconv.Itoa(x) })
	})

	// Zero allocation tests for chained operations
	tester.BenchmarkZeroAlloc("Map_Chain_3_Operations", func() {
		_ = result.
			Map(func(x int) int { return x * 2 }).
			Map(func(x int) int { return x + 1 }).
			Map(func(x int) string { return strconv.Itoa(x) })
	})
}

func BenchmarkResult_Bind_Operations(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// Setup
	result := functional.Ok(42)

	// Single bind operation
	tester.BenchmarkOperation("Bind_Single", func() {
		_ = result.Bind(func(x int) functional.Result[string] {
			if x > 0 {
				return functional.Ok(strconv.Itoa(x))
			}
			return functional.Fail[string](functional.NewDomainError("NEGATIVE", "Negative number"))
		})
	})

	// Chained bind operations
	tester.BenchmarkOperation("Bind_Chain_3", func() {
		_ = result.
			Bind(func(x int) functional.Result[int] {
				return functional.Ok(x * 2)
			}).
			Bind(func(x int) functional.Result[int] {
				return functional.Ok(x + 1)
			}).
			Bind(func(x int) functional.Result[string] {
				return functional.Ok(strconv.Itoa(x))
			})
	})

	// Mixed Map and Bind operations
	tester.BenchmarkOperation("Mixed_Map_Bind", func() {
		_ = result.
			Map(func(x int) int { return x * 2 }).
			Bind(func(x int) functional.Result[int] {
				if x > 50 {
					return functional.Ok(x)
				}
				return functional.Fail[int](functional.NewValidationError("TOO_SMALL", "Value too small"))
			}).
			Map(func(x int) string { return strconv.Itoa(x) })
	})

	// Zero allocation tests
	tester.BenchmarkZeroAlloc("Bind_Single", func() {
		_ = result.Bind(func(x int) functional.Result[string] {
			return functional.Ok(strconv.Itoa(x))
		})
	})
}

func BenchmarkResult_Match_Operations(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// Setup successful result
	okResult := functional.Ok(42)
	errorResult := functional.Fail[int](functional.NewDomainError("TEST.ERROR", "Test error"))

	// Match on successful result
	tester.BenchmarkOperation("Match_Success", func() {
		_ = okResult.Match(
			func(value int) string {
				return strconv.Itoa(value)
			},
			func(err *functional.Error) string {
				return "error: " + err.Message()
			},
		)
	})

	// Match on error result
	tester.BenchmarkOperation("Match_Error", func() {
		_ = errorResult.Match(
			func(value int) string {
				return strconv.Itoa(value)
			},
			func(err *functional.Error) string {
				return "error: " + err.Message()
			},
		)
	})

	// Zero allocation tests
	tester.BenchmarkZeroAlloc("Match_Success", func() {
		_ = okResult.Match(
			func(value int) string {
				return strconv.Itoa(value)
			},
			func(err *functional.Error) string {
				return "error"
			},
		)
	})
}

func BenchmarkResult_Ensure_Operations(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// Setup
	result := functional.Ok(42)

	// Ensure with passing predicate
	tester.BenchmarkOperation("Ensure_Pass", func() {
		_ = result.Ensure(func(x int) bool {
			return x > 0
		}, "Value must be positive")
	})

	// Ensure with failing predicate
	tester.BenchmarkOperation("Ensure_Fail", func() {
		_ = result.Ensure(func(x int) bool {
			return x < 0
		}, "Value must be negative")
	})

	// Multiple ensures
	tester.BenchmarkOperation("Ensure_Multiple", func() {
		_ = result.
			Ensure(func(x int) bool { return x > 0 }, "Must be positive").
			Ensure(func(x int) bool { return x < 100 }, "Must be less than 100").
			Ensure(func(x int) bool { return x%2 == 0 }, "Must be even")
	})

	// Zero allocation tests
	tester.BenchmarkZeroAlloc("Ensure_Pass", func() {
		_ = result.Ensure(func(x int) bool {
			return x > 0
		}, "Value must be positive")
	})
}

func BenchmarkResult_StateQuery_Operations(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// Setup
	okResult := functional.Ok(42)
	errorResult := functional.Fail[int](functional.NewDomainError("TEST.ERROR", "Test error"))

	// IsOk/IsError calls
	tester.BenchmarkOperation("IsOk_Success", func() {
		_ = okResult.IsOk()
	})

	tester.BenchmarkOperation("IsOk_Error", func() {
		_ = errorResult.IsOk()
	})

	tester.BenchmarkOperation("IsError_Success", func() {
		_ = okResult.IsError()
	})

	tester.BenchmarkOperation("IsError_Error", func() {
		_ = errorResult.IsError()
	})

	// Value/Error access
	tester.BenchmarkOperation("Value_Access", func() {
		if okResult.IsOk() {
			_ = okResult.Value()
		}
	})

	tester.BenchmarkOperation("Error_Access", func() {
		if errorResult.IsError() {
			_ = errorResult.Error()
		}
	})

	// Zero allocation tests - state queries should be zero allocation
	tester.BenchmarkZeroAlloc("IsOk_Success", func() {
		_ = okResult.IsOk()
	})

	tester.BenchmarkZeroAlloc("Value_Access", func() {
		if okResult.IsOk() {
			_ = okResult.Value()
		}
	})
}

func BenchmarkResult_ErrorHandling_Paths(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// Setup error result
	errorResult := functional.Fail[int](functional.NewDomainError("TEST.ERROR", "Test error"))

	// Map operation on error (should short-circuit)
	tester.BenchmarkOperation("Map_On_Error", func() {
		_ = errorResult.Map(func(x int) string {
			return strconv.Itoa(x) // This should not execute
		})
	})

	// Bind operation on error (should short-circuit)
	tester.BenchmarkOperation("Bind_On_Error", func() {
		_ = errorResult.Bind(func(x int) functional.Result[string] {
			return functional.Ok(strconv.Itoa(x)) // This should not execute
		})
	})

	// Chain operations on error (should short-circuit)
	tester.BenchmarkOperation("Chain_On_Error", func() {
		_ = errorResult.
			Map(func(x int) int { return x * 2 }).
			Map(func(x int) int { return x + 1 }).
			Bind(func(x int) functional.Result[string] {
				return functional.Ok(strconv.Itoa(x))
			})
	})

	// Zero allocation tests - error path operations should also be zero allocation
	tester.BenchmarkZeroAlloc("Map_On_Error", func() {
		_ = errorResult.Map(func(x int) string {
			return strconv.Itoa(x)
		})
	})

	tester.BenchmarkZeroAlloc("Chain_On_Error", func() {
		_ = errorResult.
			Map(func(x int) int { return x * 2 }).
			Map(func(x int) int { return x + 1 })
	})
}

func BenchmarkResult_Different_Types(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// String results
	stringResult := functional.Ok("test string")
	tester.BenchmarkOperation("Map_String", func() {
		_ = stringResult.Map(func(s string) int {
			return len(s)
		})
	})

	// Boolean results
	boolResult := functional.Ok(true)
	tester.BenchmarkOperation("Map_Boolean", func() {
		_ = boolResult.Map(func(b bool) string {
			if b {
				return "true"
			}
			return "false"
		})
	})

	// Struct results
	type testStruct struct {
		ID    int
		Name  string
		Value float64
	}
	structResult := functional.Ok(testStruct{ID: 1, Name: "test", Value: 3.14})
	tester.BenchmarkOperation("Map_Struct", func() {
		_ = structResult.Map(func(s testStruct) string {
			return s.Name
		})
	})

	// Zero allocation tests for different types
	tester.BenchmarkZeroAlloc("Map_String", func() {
		_ = stringResult.Map(func(s string) int {
			return len(s)
		})
	})

	tester.BenchmarkZeroAlloc("Map_Boolean", func() {
		_ = boolResult.Map(func(b bool) string {
			if b {
				return "true"
			}
			return "false"
		})
	})
}

func BenchmarkResult_Parallel_Operations(b *testing.B) {
	// Test parallel access to Result operations
	result := functional.Ok(42)

	b.Run("Map_Parallel", func(b *testing.B) {
		b.RunParallel(func(pb *testing.PB) {
			for pb.Next() {
				_ = result.Map(func(x int) int {
					return x * 2
				})
			}
		})
	})

	b.Run("IsOk_Parallel", func(b *testing.B) {
		b.RunParallel(func(pb *testing.PB) {
			for pb.Next() {
				_ = result.IsOk()
			}
		})
	})

	b.Run("Value_Access_Parallel", func(b *testing.B) {
		b.RunParallel(func(pb *testing.PB) {
			for pb.Next() {
				if result.IsOk() {
					_ = result.Value()
				}
			}
		})
	})
}

// =============================================================================
// COMPREHENSIVE PERFORMANCE VALIDATION
// =============================================================================

func BenchmarkResult_ComprehensiveScenarios(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// Scenario 1: Simple data transformation pipeline
	tester.BenchmarkOperation("Scenario_DataTransformation", func() {
		result := functional.Ok("123")
		_ = result.
			Map(func(s string) int {
				val, _ := strconv.Atoi(s)
				return val
			}).
			Ensure(func(x int) bool { return x > 0 }, "Must be positive").
			Map(func(x int) float64 { return float64(x) * 1.5 }).
			Map(func(x float64) string { return strconv.FormatFloat(x, 'f', 2, 64) })
	})

	// Scenario 2: Error handling workflow
	tester.BenchmarkOperation("Scenario_ErrorHandling", func() {
		result := functional.Ok(10)
		_ = result.
			Ensure(func(x int) bool { return x > 5 }, "Too small").
			Bind(func(x int) functional.Result[int] {
				if x%2 == 0 {
					return functional.Ok(x / 2)
				}
				return functional.Fail[int](functional.NewDomainError("ODD", "Must be even"))
			}).
			Map(func(x int) string { return "Result: " + strconv.Itoa(x) })
	})

	// Scenario 3: Complex business logic simulation
	tester.BenchmarkOperation("Scenario_BusinessLogic", func() {
		result := functional.Ok(100)
		_ = result.
			Ensure(func(x int) bool { return x >= 0 }, "Must be non-negative").
			Map(func(x int) int { return x * 2 }). // Double the value
			Ensure(func(x int) bool { return x <= 1000 }, "Too large").
			Bind(func(x int) functional.Result[int] {
				// Simulate some business rule
				if x%10 == 0 {
					return functional.Ok(x + 5)
				}
				return functional.Ok(x)
			}).
			Map(func(x int) string { return "Final: " + strconv.Itoa(x) })
	})

	// Zero allocation validation for scenarios
	tester.BenchmarkZeroAlloc("Scenario_DataTransformation", func() {
		result := functional.Ok("123")
		_ = result.
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

func TestResult_ZeroAllocations(t *testing.T) {
	// This test verifies the zero allocation requirement from research.md
	assertions := testutils.NewAssertions(t)

	result := functional.Ok(42)

	// Test Map operations
	allocs := testutils.MeasureAllocations(func() {
		_ = result.Map(func(x int) int { return x * 2 })
	})
	assertions.Equal(0.0, allocs, "Map operation should have zero allocations")

	// Test Bind operations
	allocs = testutils.MeasureAllocations(func() {
		_ = result.Bind(func(x int) functional.Result[int] {
			return functional.Ok(x + 1)
		})
	})
	assertions.Equal(0.0, allocs, "Bind operation should have zero allocations")

	// Test chained operations
	allocs = testutils.MeasureAllocations(func() {
		_ = result.
			Map(func(x int) int { return x * 2 }).
			Map(func(x int) int { return x + 1 })
	})
	assertions.Equal(0.0, allocs, "Chained Map operations should have zero allocations")
}

func TestResult_PerformanceThresholds(t *testing.T) {
	// Validate performance meets the requirements from research.md
	expectations := testutils.ZeroAllocationExpectation(100 * time.Nanosecond)

	// Test single Map operation
	testutils.ValidatePerformance(t, "Result.Map", expectations, func() {
		result := functional.Ok(42)
		_ = result.Map(func(x int) int { return x * 2 })
	})

	// Test single Bind operation
	testutils.ValidatePerformance(t, "Result.Bind", expectations, func() {
		result := functional.Ok(42)
		_ = result.Bind(func(x int) functional.Result[int] {
			return functional.Ok(x + 1)
		})
	})

	// Test state queries
	stateExpectations := testutils.ZeroAllocationExpectation(10 * time.Nanosecond)
	testutils.ValidatePerformance(t, "Result.IsOk", stateExpectations, func() {
		result := functional.Ok(42)
		_ = result.IsOk()
	})
}