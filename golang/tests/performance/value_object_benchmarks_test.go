package performance

import (
	"fmt"
	"testing"

	"github.com/universalddd/architecture-core-go/pkg/domain"
	testutils "github.com/universalddd/architecture-core-go/internal/testing"
)

// =============================================================================
// BENCHMARK TESTS FOR VALUE OBJECT EQUALITY OPERATIONS
// Requirements: Optimized equality operations for multi-field, collections, nulls
// =============================================================================

// SimpleValueObject for testing basic equality
type SimpleValueObject struct {
	value string
}

func NewSimpleValueObject(value string) SimpleValueObject {
	return SimpleValueObject{value: value}
}

func (s SimpleValueObject) GetEqualityComponents() []interface{} {
	return []interface{}{s.value}
}

func (s SimpleValueObject) Equals(other domain.ValueObject) bool {
	if otherSimple, ok := other.(SimpleValueObject); ok {
		return s.value == otherSimple.value
	}
	return false
}

func (s SimpleValueObject) GetHashCode() int {
	return hashString(s.value)
}

// ComplexValueObject for testing multi-field equality
type ComplexValueObject struct {
	stringField string
	intField    int
	floatField  float64
	boolField   bool
}

func NewComplexValueObject(s string, i int, f float64, b bool) ComplexValueObject {
	return ComplexValueObject{
		stringField: s,
		intField:    i,
		floatField:  f,
		boolField:   b,
	}
}

func (c ComplexValueObject) GetEqualityComponents() []interface{} {
	return []interface{}{c.stringField, c.intField, c.floatField, c.boolField}
}

func (c ComplexValueObject) Equals(other domain.ValueObject) bool {
	if otherComplex, ok := other.(ComplexValueObject); ok {
		return c.stringField == otherComplex.stringField &&
			c.intField == otherComplex.intField &&
			c.floatField == otherComplex.floatField &&
			c.boolField == otherComplex.boolField
	}
	return false
}

func (c ComplexValueObject) GetHashCode() int {
	hash := 17
	hash = hash*31 + hashString(c.stringField)
	hash = hash*31 + c.intField
	hash = hash*31 + hashFloat(c.floatField)
	hash = hash*31 + hashBool(c.boolField)
	return hash
}

// CollectionValueObject for testing collection equality
type CollectionValueObject struct {
	items []string
	tags  map[string]int
}

func NewCollectionValueObject(items []string, tags map[string]int) CollectionValueObject {
	// Create copies to ensure immutability
	itemsCopy := make([]string, len(items))
	copy(itemsCopy, items)

	tagsCopy := make(map[string]int)
	for k, v := range tags {
		tagsCopy[k] = v
	}

	return CollectionValueObject{
		items: itemsCopy,
		tags:  tagsCopy,
	}
}

func (c CollectionValueObject) GetEqualityComponents() []interface{} {
	components := make([]interface{}, 0, len(c.items)+len(c.tags)+1)

	// Add slice length first
	components = append(components, len(c.items))

	// Add slice items
	for _, item := range c.items {
		components = append(components, item)
	}

	// Add map size
	components = append(components, len(c.tags))

	// Add map items (note: maps should be compared in deterministic order)
	for k, v := range c.tags {
		components = append(components, k, v)
	}

	return components
}

func (c CollectionValueObject) Equals(other domain.ValueObject) bool {
	if otherCollection, ok := other.(CollectionValueObject); ok {
		// Compare slices
		if len(c.items) != len(otherCollection.items) {
			return false
		}
		for i, item := range c.items {
			if item != otherCollection.items[i] {
				return false
			}
		}

		// Compare maps
		if len(c.tags) != len(otherCollection.tags) {
			return false
		}
		for k, v := range c.tags {
			if otherV, exists := otherCollection.tags[k]; !exists || v != otherV {
				return false
			}
		}

		return true
	}
	return false
}

func (c CollectionValueObject) GetHashCode() int {
	hash := 17

	// Hash slice
	hash = hash*31 + len(c.items)
	for _, item := range c.items {
		hash = hash*31 + hashString(item)
	}

	// Hash map
	hash = hash*31 + len(c.tags)
	for k, v := range c.tags {
		hash = hash*31 + hashString(k)
		hash = hash*31 + v
	}

	return hash
}

// =============================================================================
// BASIC EQUALITY BENCHMARKS
// =============================================================================

func BenchmarkValueObject_SimpleEquality(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// Setup
	obj1 := NewSimpleValueObject("test")
	obj2 := NewSimpleValueObject("test")   // Equal
	obj3 := NewSimpleValueObject("other")  // Not equal

	// Equal objects
	tester.BenchmarkOperation("Equals_Simple_True", func() {
		_ = obj1.Equals(obj2)
	})

	// Non-equal objects
	tester.BenchmarkOperation("Equals_Simple_False", func() {
		_ = obj1.Equals(obj3)
	})

	// Hash code generation
	tester.BenchmarkOperation("HashCode_Simple", func() {
		_ = obj1.GetHashCode()
	})

	// Zero allocation tests
	tester.BenchmarkZeroAlloc("Equals_Simple_True", func() {
		_ = obj1.Equals(obj2)
	})

	tester.BenchmarkZeroAlloc("Equals_Simple_False", func() {
		_ = obj1.Equals(obj3)
	})

	tester.BenchmarkZeroAlloc("HashCode_Simple", func() {
		_ = obj1.GetHashCode()
	})
}

func BenchmarkValueObject_ComplexEquality(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// Setup
	obj1 := NewComplexValueObject("test", 42, 3.14, true)
	obj2 := NewComplexValueObject("test", 42, 3.14, true)   // Equal
	obj3 := NewComplexValueObject("test", 42, 3.14, false)  // Different bool
	obj4 := NewComplexValueObject("test", 99, 3.14, true)   // Different int
	obj5 := NewComplexValueObject("other", 42, 3.14, true)  // Different string

	// Equal objects
	tester.BenchmarkOperation("Equals_Complex_True", func() {
		_ = obj1.Equals(obj2)
	})

	// Non-equal objects (different fields)
	tester.BenchmarkOperation("Equals_Complex_False_Bool", func() {
		_ = obj1.Equals(obj3)
	})

	tester.BenchmarkOperation("Equals_Complex_False_Int", func() {
		_ = obj1.Equals(obj4)
	})

	tester.BenchmarkOperation("Equals_Complex_False_String", func() {
		_ = obj1.Equals(obj5)
	})

	// Hash code generation
	tester.BenchmarkOperation("HashCode_Complex", func() {
		_ = obj1.GetHashCode()
	})

	// Zero allocation tests
	tester.BenchmarkZeroAlloc("Equals_Complex_True", func() {
		_ = obj1.Equals(obj2)
	})

	tester.BenchmarkZeroAlloc("Equals_Complex_False_Bool", func() {
		_ = obj1.Equals(obj3)
	})

	tester.BenchmarkZeroAlloc("HashCode_Complex", func() {
		_ = obj1.GetHashCode()
	})
}

func BenchmarkValueObject_CollectionEquality(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// Setup small collections
	items1 := []string{"a", "b", "c"}
	tags1 := map[string]int{"x": 1, "y": 2}
	obj1 := NewCollectionValueObject(items1, tags1)
	obj2 := NewCollectionValueObject(items1, tags1) // Equal

	items2 := []string{"a", "b", "d"}  // Different item
	obj3 := NewCollectionValueObject(items2, tags1)

	tags2 := map[string]int{"x": 1, "z": 3}  // Different tag
	obj4 := NewCollectionValueObject(items1, tags2)

	// Equal collections
	tester.BenchmarkOperation("Equals_Collection_Small_True", func() {
		_ = obj1.Equals(obj2)
	})

	// Non-equal collections
	tester.BenchmarkOperation("Equals_Collection_Small_False_Items", func() {
		_ = obj1.Equals(obj3)
	})

	tester.BenchmarkOperation("Equals_Collection_Small_False_Tags", func() {
		_ = obj1.Equals(obj4)
	})

	// Hash code for collections
	tester.BenchmarkOperation("HashCode_Collection_Small", func() {
		_ = obj1.GetHashCode()
	})

	// Zero allocation tests
	tester.BenchmarkZeroAlloc("Equals_Collection_Small_True", func() {
		_ = obj1.Equals(obj2)
	})

	tester.BenchmarkZeroAlloc("HashCode_Collection_Small", func() {
		_ = obj1.GetHashCode()
	})
}

func BenchmarkValueObject_LargeCollectionEquality(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// Setup large collections
	largeItems := make([]string, 100)
	for i := 0; i < 100; i++ {
		largeItems[i] = fmt.Sprintf("item_%d", i)
	}

	largeTags := make(map[string]int)
	for i := 0; i < 50; i++ {
		largeTags[fmt.Sprintf("tag_%d", i)] = i
	}

	obj1 := NewCollectionValueObject(largeItems, largeTags)
	obj2 := NewCollectionValueObject(largeItems, largeTags) // Equal

	// Different item at the end
	differentItems := make([]string, 100)
	copy(differentItems, largeItems)
	differentItems[99] = "different"
	obj3 := NewCollectionValueObject(differentItems, largeTags)

	// Equal large collections
	tester.BenchmarkOperation("Equals_Collection_Large_True", func() {
		_ = obj1.Equals(obj2)
	})

	// Non-equal large collections (difference at end)
	tester.BenchmarkOperation("Equals_Collection_Large_False", func() {
		_ = obj1.Equals(obj3)
	})

	// Hash code for large collections
	tester.BenchmarkOperation("HashCode_Collection_Large", func() {
		_ = obj1.GetHashCode()
	})

	// Zero allocation tests
	tester.BenchmarkZeroAlloc("Equals_Collection_Large_True", func() {
		_ = obj1.Equals(obj2)
	})

	tester.BenchmarkZeroAlloc("HashCode_Collection_Large", func() {
		_ = obj1.GetHashCode()
	})
}

// =============================================================================
// SCALING BENCHMARKS
// =============================================================================

func BenchmarkValueObject_ScalingEquality(b *testing.B) {
	// Test how equality performance scales with object complexity
	testutils.BenchmarkWithDifferentSizes(b, "ComplexEquality",
		[]int{1, 5, 10, 20, 50},
		func(size int) interface{} {
			// Create complex objects with varying numbers of fields
			// (simulated by creating multiple simple objects)
			objects := make([]SimpleValueObject, size)
			for i := 0; i < size; i++ {
				objects[i] = NewSimpleValueObject(fmt.Sprintf("field_%d", i))
			}
			return objects
		},
		func(data interface{}) {
			objects := data.([]SimpleValueObject)
			// Compare all objects to first one
			first := objects[0]
			for i := 1; i < len(objects); i++ {
				_ = first.Equals(objects[i])
			}
		})
}

func BenchmarkValueObject_CollectionScaling(b *testing.B) {
	// Test how collection equality scales with collection size
	testutils.BenchmarkWithDifferentSizes(b, "CollectionEquality",
		[]int{10, 50, 100, 500, 1000},
		func(size int) interface{} {
			items := make([]string, size)
			for i := 0; i < size; i++ {
				items[i] = fmt.Sprintf("item_%d", i)
			}
			tags := make(map[string]int)
			for i := 0; i < size/2; i++ {
				tags[fmt.Sprintf("tag_%d", i)] = i
			}
			return []CollectionValueObject{
				NewCollectionValueObject(items, tags),
				NewCollectionValueObject(items, tags), // Equal copy
			}
		},
		func(data interface{}) {
			objects := data.([]CollectionValueObject)
			_ = objects[0].Equals(objects[1])
		})
}

// =============================================================================
// NULL/EMPTY HANDLING BENCHMARKS
// =============================================================================

func BenchmarkValueObject_NullEmptyHandling(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// Setup objects with empty/nil values
	emptyObj := NewSimpleValueObject("")
	normalObj := NewSimpleValueObject("normal")

	emptyCollectionObj := NewCollectionValueObject([]string{}, map[string]int{})
	nilSliceObj := NewCollectionValueObject(nil, map[string]int{})
	nilMapObj := NewCollectionValueObject([]string{"test"}, nil)

	// Empty string equality
	tester.BenchmarkOperation("Equals_EmptyString", func() {
		_ = emptyObj.Equals(normalObj)
	})

	// Empty collection equality
	tester.BenchmarkOperation("Equals_EmptyCollection", func() {
		_ = emptyCollectionObj.Equals(nilSliceObj)
	})

	// Nil map equality
	tester.BenchmarkOperation("Equals_NilMap", func() {
		_ = nilMapObj.Equals(emptyCollectionObj)
	})

	// Hash codes for empty/nil values
	tester.BenchmarkOperation("HashCode_Empty", func() {
		_ = emptyObj.GetHashCode()
	})

	tester.BenchmarkOperation("HashCode_EmptyCollection", func() {
		_ = emptyCollectionObj.GetHashCode()
	})

	// Zero allocation tests
	tester.BenchmarkZeroAlloc("Equals_EmptyString", func() {
		_ = emptyObj.Equals(normalObj)
	})

	tester.BenchmarkZeroAlloc("HashCode_Empty", func() {
		_ = emptyObj.GetHashCode()
	})
}

// =============================================================================
// PARALLEL ACCESS BENCHMARKS
// =============================================================================

func BenchmarkValueObject_ParallelEquality(b *testing.B) {
	obj1 := NewComplexValueObject("test", 42, 3.14, true)
	obj2 := NewComplexValueObject("test", 42, 3.14, true)

	b.Run("Equals_Parallel", func(b *testing.B) {
		b.RunParallel(func(pb *testing.PB) {
			for pb.Next() {
				_ = obj1.Equals(obj2)
			}
		})
	})

	b.Run("HashCode_Parallel", func(b *testing.B) {
		b.RunParallel(func(pb *testing.PB) {
			for pb.Next() {
				_ = obj1.GetHashCode()
			}
		})
	})
}

// =============================================================================
// COMPREHENSIVE SCENARIOS
// =============================================================================

func BenchmarkValueObject_ComprehensiveScenarios(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// Scenario 1: Hash table operations (typical usage pattern)
	tester.BenchmarkOperation("Scenario_HashTable", func() {
		// Simulate adding value objects to a hash table
		objects := make(map[int]SimpleValueObject)
		for i := 0; i < 10; i++ {
			obj := NewSimpleValueObject(fmt.Sprintf("key_%d", i))
			hash := obj.GetHashCode()
			objects[hash] = obj
		}

		// Simulate lookups
		lookupObj := NewSimpleValueObject("key_5")
		lookupHash := lookupObj.GetHashCode()
		if stored, exists := objects[lookupHash]; exists {
			_ = stored.Equals(lookupObj)
		}
	})

	// Scenario 2: Equality chain comparison
	tester.BenchmarkOperation("Scenario_EqualityChain", func() {
		objects := make([]ComplexValueObject, 5)
		for i := 0; i < 5; i++ {
			objects[i] = NewComplexValueObject("test", i, 3.14, true)
		}

		// Compare each object to every other object
		for i := 0; i < len(objects); i++ {
			for j := i + 1; j < len(objects); j++ {
				_ = objects[i].Equals(objects[j])
			}
		}
	})

	// Scenario 3: Collection deduplication
	tester.BenchmarkOperation("Scenario_Deduplication", func() {
		objects := make([]SimpleValueObject, 20)
		for i := 0; i < 20; i++ {
			// Create some duplicates
			val := fmt.Sprintf("value_%d", i%5)
			objects[i] = NewSimpleValueObject(val)
		}

		// Simulate deduplication by comparing each object to all previous ones
		unique := make([]SimpleValueObject, 0, 20)
		for _, obj := range objects {
			isUnique := true
			for _, existing := range unique {
				if obj.Equals(existing) {
					isUnique = false
					break
				}
			}
			if isUnique {
				unique = append(unique, obj)
			}
		}
	})
}

// =============================================================================
// PERFORMANCE VALIDATION TESTS
// =============================================================================

func TestValueObject_EqualityPerformance(t *testing.T) {
	// Validate that equality operations meet performance requirements
	expectations := testutils.ZeroAllocationExpectation(50 * time.Nanosecond)

	// Simple equality
	testutils.ValidatePerformance(t, "SimpleValueObject.Equals", expectations, func() {
		obj1 := NewSimpleValueObject("test")
		obj2 := NewSimpleValueObject("test")
		_ = obj1.Equals(obj2)
	})

	// Complex equality
	complexExpectations := testutils.ZeroAllocationExpectation(200 * time.Nanosecond)
	testutils.ValidatePerformance(t, "ComplexValueObject.Equals", complexExpectations, func() {
		obj1 := NewComplexValueObject("test", 42, 3.14, true)
		obj2 := NewComplexValueObject("test", 42, 3.14, true)
		_ = obj1.Equals(obj2)
	})

	// Hash code generation
	testutils.ValidatePerformance(t, "ValueObject.GetHashCode", expectations, func() {
		obj := NewSimpleValueObject("test")
		_ = obj.GetHashCode()
	})
}

func TestValueObject_ZeroAllocations(t *testing.T) {
	assertions := testutils.NewAssertions(t)

	obj1 := NewSimpleValueObject("test")
	obj2 := NewSimpleValueObject("test")

	// Test equality allocations
	allocs := testutils.MeasureAllocations(func() {
		_ = obj1.Equals(obj2)
	})
	assertions.Equal(0.0, allocs, "Equals operation should have zero allocations")

	// Test hash code allocations
	allocs = testutils.MeasureAllocations(func() {
		_ = obj1.GetHashCode()
	})
	assertions.Equal(0.0, allocs, "GetHashCode operation should have zero allocations")
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

func hashString(s string) int {
	h := 0
	for _, c := range s {
		h = 31*h + int(c)
	}
	return h
}

func hashFloat(f float64) int {
	// Simple float hash - in production you'd use a proper implementation
	return int(f * 1000000) // Convert to int representation
}

func hashBool(b bool) int {
	if b {
		return 1
	}
	return 0
}