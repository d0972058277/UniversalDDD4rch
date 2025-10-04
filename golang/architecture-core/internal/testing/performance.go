package testing

import (
	"fmt"
	"runtime"
	"testing"
	"time"
)

// PerformanceTester provides utilities for performance testing
type PerformanceTester struct {
	b *testing.B
}

// NewPerformanceTester creates a new performance tester
func NewPerformanceTester(b *testing.B) *PerformanceTester {
	return &PerformanceTester{b: b}
}

// BenchmarkOperation benchmarks an operation and reports allocations
func (p *PerformanceTester) BenchmarkOperation(name string, fn func()) {
	p.b.Run(name, func(b *testing.B) {
		b.ResetTimer()
		b.ReportAllocs()

		for i := 0; i < b.N; i++ {
			fn()
		}
	})
}

// BenchmarkZeroAlloc verifies that an operation performs zero allocations
func (p *PerformanceTester) BenchmarkZeroAlloc(name string, fn func()) {
	p.b.Run(name+"_ZeroAlloc", func(b *testing.B) {
		allocs := testing.AllocsPerRun(100, fn)
		if allocs > 0 {
			b.Errorf("Expected zero allocations, got %f", allocs)
		}
	})
}

// BenchmarkMemory benchmarks memory usage of an operation
func (p *PerformanceTester) BenchmarkMemory(name string, fn func()) {
	p.b.Run(name+"_Memory", func(b *testing.B) {
		var m1, m2 runtime.MemStats
		runtime.GC()
		runtime.ReadMemStats(&m1)

		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			fn()
		}
		b.StopTimer()

		runtime.GC()
		runtime.ReadMemStats(&m2)

		bytesPerOp := (m2.TotalAlloc - m1.TotalAlloc) / uint64(b.N)
		b.ReportMetric(float64(bytesPerOp), "bytes/op")
	})
}

// BenchmarkWithSetup benchmarks an operation with setup and teardown
func (p *PerformanceTester) BenchmarkWithSetup(name string, setup func() interface{}, fn func(interface{}), teardown func(interface{})) {
	p.b.Run(name, func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			b.StopTimer()
			data := setup()
			b.StartTimer()

			fn(data)

			b.StopTimer()
			if teardown != nil {
				teardown(data)
			}
			b.StartTimer()
		}
	})
}

// TimeOperation measures the execution time of an operation
func TimeOperation(name string, fn func()) time.Duration {
	start := time.Now()
	fn()
	elapsed := time.Since(start)
	return elapsed
}

// MeasureAllocations measures allocations for a given operation
func MeasureAllocations(fn func()) float64 {
	return testing.AllocsPerRun(100, fn)
}

// =============================================================================
// PERFORMANCE EXPECTATIONS
// =============================================================================

// PerformanceExpectations defines expected performance characteristics
type PerformanceExpectations struct {
	MaxDuration   time.Duration
	MaxAllocations float64
	MaxMemoryBytes int64
}

// NewPerformanceExpectations creates performance expectations
func NewPerformanceExpectations(maxDuration time.Duration, maxAllocations float64, maxMemoryBytes int64) *PerformanceExpectations {
	return &PerformanceExpectations{
		MaxDuration:   maxDuration,
		MaxAllocations: maxAllocations,
		MaxMemoryBytes: maxMemoryBytes,
	}
}

// ZeroAllocationExpectation returns expectations for zero-allocation operations
func ZeroAllocationExpectation(maxDuration time.Duration) *PerformanceExpectations {
	return NewPerformanceExpectations(maxDuration, 0, 0)
}

// ValidatePerformance validates that an operation meets performance expectations
func ValidatePerformance(t *testing.T, name string, expectations *PerformanceExpectations, fn func()) {
	t.Helper()

	// Measure execution time
	duration := TimeOperation(name, fn)
	if duration > expectations.MaxDuration {
		t.Errorf("%s: execution time %v exceeded maximum %v", name, duration, expectations.MaxDuration)
	}

	// Measure allocations
	if expectations.MaxAllocations >= 0 {
		allocs := MeasureAllocations(fn)
		if allocs > expectations.MaxAllocations {
			t.Errorf("%s: allocations %f exceeded maximum %f", name, allocs, expectations.MaxAllocations)
		}
	}
}

// =============================================================================
// BENCHMARK TEMPLATES
// =============================================================================

// BenchmarkTemplate provides a template for standard benchmarks
type BenchmarkTemplate struct {
	Name        string
	Setup       func() interface{}
	Operation   func(interface{})
	Teardown    func(interface{})
	Expectations *PerformanceExpectations
}

// RunBenchmarkTemplate runs a benchmark using the template
func RunBenchmarkTemplate(b *testing.B, template BenchmarkTemplate) {
	tester := NewPerformanceTester(b)

	if template.Setup != nil && template.Teardown != nil {
		tester.BenchmarkWithSetup(
			template.Name,
			template.Setup,
			template.Operation,
			template.Teardown,
		)
	} else {
		tester.BenchmarkOperation(template.Name, func() {
			var data interface{}
			if template.Setup != nil {
				data = template.Setup()
			}
			template.Operation(data)
		})
	}

	// Run zero allocation test if expected
	if template.Expectations != nil && template.Expectations.MaxAllocations == 0 {
		tester.BenchmarkZeroAlloc(template.Name, func() {
			var data interface{}
			if template.Setup != nil {
				data = template.Setup()
			}
			template.Operation(data)
		})
	}
}

// =============================================================================
// COMMON PERFORMANCE PATTERNS
// =============================================================================

// BenchmarkChainedOperations benchmarks a series of chained operations
func BenchmarkChainedOperations(b *testing.B, name string, operations []func()) {
	b.Run(name, func(b *testing.B) {
		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			for _, op := range operations {
				op()
			}
		}
	})
}

// BenchmarkParallelOperation benchmarks an operation running in parallel
func BenchmarkParallelOperation(b *testing.B, name string, fn func()) {
	b.Run(name+"_Parallel", func(b *testing.B) {
		b.RunParallel(func(pb *testing.PB) {
			for pb.Next() {
				fn()
			}
		})
	})
}

// BenchmarkWithDifferentSizes benchmarks an operation with different input sizes
func BenchmarkWithDifferentSizes(b *testing.B, name string, sizes []int, setupWithSize func(int) interface{}, fn func(interface{})) {
	for _, size := range sizes {
		b.Run(name+"_Size"+fmt.Sprintf("%d", size), func(b *testing.B) {
			data := setupWithSize(size)
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				fn(data)
			}
		})
	}
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// ForceGC forces garbage collection (useful for memory measurements)
func ForceGC() {
	runtime.GC()
	runtime.GC() // Call twice to ensure cleanup
}

// GetMemStats returns current memory statistics
func GetMemStats() *runtime.MemStats {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	return &m
}

// MeasureMemoryGrowth measures memory growth during an operation
func MeasureMemoryGrowth(fn func()) int64 {
	ForceGC()
	before := GetMemStats()

	fn()

	ForceGC()
	after := GetMemStats()

	return int64(after.TotalAlloc - before.TotalAlloc)
}