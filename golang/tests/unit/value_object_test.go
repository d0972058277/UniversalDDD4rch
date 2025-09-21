package unit

import (
	"fmt"
	"math"
	"testing"
	"time"

	"github.com/universalddd/architecture-core-go/pkg/domain"
	testutils "github.com/universalddd/architecture-core-go/internal/testing"
)

// =============================================================================
// UNIT TESTS FOR VALUEOBJECT STRUCTURAL EQUALITY
// Requirements: Multi-field equality, collections, nulls, immutability
// =============================================================================

// Test value objects
type Money struct {
	*domain.BaseValueObject
	Amount   float64
	Currency string
}

func NewMoney(amount float64, currency string) *Money {
	return &Money{
		BaseValueObject: &domain.BaseValueObject{},
		Amount:          amount,
		Currency:        currency,
	}
}

func (m *Money) GetEqualityComponents() []interface{} {
	return []interface{}{m.Amount, m.Currency}
}

func (m *Money) Equals(other domain.ValueObject) bool {
	return domain.ValueObjectEquals(m, other)
}

func (m *Money) GetHashCode() uint64 {
	return domain.ValueObjectHashCode(m)
}

type Address struct {
	*domain.BaseValueObject
	Street     string
	City       string
	State      string
	PostalCode string
	Country    string
}

func NewAddress(street, city, state, postalCode, country string) *Address {
	return &Address{
		BaseValueObject: &domain.BaseValueObject{},
		Street:          street,
		City:            city,
		State:           state,
		PostalCode:      postalCode,
		Country:         country,
	}
}

func (a *Address) GetEqualityComponents() []interface{} {
	return []interface{}{a.Street, a.City, a.State, a.PostalCode, a.Country}
}

func (a *Address) Equals(other domain.ValueObject) bool {
	return domain.ValueObjectEquals(a, other)
}

func (a *Address) GetHashCode() uint64 {
	return domain.ValueObjectHashCode(a)
}

type PersonName struct {
	domain.BaseValueObject
	FirstName  string
	MiddleName *string // Nullable field
	LastName   string
}

func NewPersonName(firstName, lastName string, middleName *string) *PersonName {
	return &PersonName{
		FirstName:  firstName,
		MiddleName: middleName,
		LastName:   lastName,
	}
}

func (p *PersonName) GetEqualityComponents() []interface{} {
	return []interface{}{p.FirstName, p.MiddleName, p.LastName}
}

func (p *PersonName) Equals(other domain.ValueObject) bool {
	return domain.ValueObjectEquals(p, other)
}

func (p *PersonName) GetHashCode() uint64 {
	return domain.ValueObjectHashCode(p)
}

type ProductTags struct {
	domain.BaseValueObject
	Tags []string
}

func NewProductTags(tags []string) *ProductTags {
	// Copy slice to ensure immutability
	tagsCopy := make([]string, len(tags))
	copy(tagsCopy, tags)
	return &ProductTags{
		Tags: tagsCopy,
	}
}

func (p *ProductTags) GetEqualityComponents() []interface{} {
	// Return a copy of the slice to ensure immutability
	tagsCopy := make([]string, len(p.Tags))
	copy(tagsCopy, p.Tags)
	return []interface{}{tagsCopy}
}

func (p *ProductTags) Equals(other domain.ValueObject) bool {
	return domain.ValueObjectEquals(p, other)
}

func (p *ProductTags) GetHashCode() uint64 {
	return domain.ValueObjectHashCode(p)
}

type Metadata struct {
	domain.BaseValueObject
	Properties map[string]interface{}
}

func NewMetadata(properties map[string]interface{}) *Metadata {
	// Copy map to ensure immutability
	propsCopy := make(map[string]interface{})
	for k, v := range properties {
		propsCopy[k] = v
	}
	return &Metadata{
		Properties: propsCopy,
	}
}

func (m *Metadata) GetEqualityComponents() []interface{} {
	return []interface{}{m.Properties}
}

func (m *Metadata) Equals(other domain.ValueObject) bool {
	return domain.ValueObjectEquals(m, other)
}

func (m *Metadata) GetHashCode() uint64 {
	return domain.ValueObjectHashCode(m)
}

type ComplexValueObject struct {
	domain.BaseValueObject
	StringField  string
	IntField     int
	FloatField   float64
	BoolField    bool
	SliceField   []string
	MapField     map[string]int
	PointerField *string
	NestedField  *Money
}

func NewComplexValueObject(
	stringField string,
	intField int,
	floatField float64,
	boolField bool,
	sliceField []string,
	mapField map[string]int,
	pointerField *string,
	nestedField *Money,
) *ComplexValueObject {
	// Deep copy collections to ensure immutability
	sliceCopy := make([]string, len(sliceField))
	copy(sliceCopy, sliceField)

	mapCopy := make(map[string]int)
	for k, v := range mapField {
		mapCopy[k] = v
	}

	return &ComplexValueObject{
		StringField:  stringField,
		IntField:     intField,
		FloatField:   floatField,
		BoolField:    boolField,
		SliceField:   sliceCopy,
		MapField:     mapCopy,
		PointerField: pointerField,
		NestedField:  nestedField,
	}
}

func (c *ComplexValueObject) GetEqualityComponents() []interface{} {
	return []interface{}{
		c.StringField,
		c.IntField,
		c.FloatField,
		c.BoolField,
		c.SliceField,
		c.MapField,
		c.PointerField,
		c.NestedField,
	}
}

func (c *ComplexValueObject) Equals(other domain.ValueObject) bool {
	return domain.ValueObjectEquals(c, other)
}

func (c *ComplexValueObject) GetHashCode() uint64 {
	return domain.ValueObjectHashCode(c)
}

func TestValueObject_Should_BeEqual_When_SameComponentsProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	money1 := NewMoney(100.50, "USD")
	money2 := NewMoney(100.50, "USD")

	// When
	isEqual := money1.Equals(money2)

	// Then
	assertions.True(isEqual, "Value objects with same components should be equal")
	assertions.True(money2.Equals(money1), "Equality should be symmetric")
}

func TestValueObject_Should_NotBeEqual_When_DifferentComponentsProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	money1 := NewMoney(100.50, "USD")
	money2 := NewMoney(100.50, "EUR")
	money3 := NewMoney(200.00, "USD")

	// When & Then
	assertions.False(money1.Equals(money2), "Value objects with different currency should not be equal")
	assertions.False(money1.Equals(money3), "Value objects with different amount should not be equal")
	assertions.False(money2.Equals(money3), "Value objects with different amount and currency should not be equal")
}

func TestValueObject_Should_NotBeEqual_When_ComparedWithNil(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	money := NewMoney(100.50, "USD")

	// When
	isEqual := money.Equals(nil)

	// Then
	assertions.False(isEqual, "Value object should not be equal to nil")
}

func TestValueObject_Should_NotBeEqual_When_DifferentTypesCompared(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	money := NewMoney(100.50, "USD")
	address := NewAddress("123 Main St", "Anytown", "CA", "12345", "USA")

	// When
	isEqual := money.Equals(address)

	// Then
	assertions.False(isEqual, "Different value object types should not be equal")
}

func TestValueObject_Should_HaveSameHashCode_When_EqualObjectsProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	money1 := NewMoney(100.50, "USD")
	money2 := NewMoney(100.50, "USD")

	// When
	hash1 := money1.GetHashCode()
	hash2 := money2.GetHashCode()

	// Then
	assertions.Equal(hash1, hash2, "Equal value objects should have same hash code")
	assertions.True(hash1 != 0, "Hash code should not be zero")
}

func TestValueObject_Should_HaveDifferentHashCode_When_DifferentObjectsProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	money1 := NewMoney(100.50, "USD")
	money2 := NewMoney(100.50, "EUR")

	// When
	hash1 := money1.GetHashCode()
	hash2 := money2.GetHashCode()

	// Then
	assertions.NotEqual(hash1, hash2, "Different value objects should have different hash codes")
}

func TestValueObject_Should_HandleMultipleFields_When_ComplexObjectCreated(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	address1 := NewAddress("123 Main St", "Anytown", "CA", "12345", "USA")
	address2 := NewAddress("123 Main St", "Anytown", "CA", "12345", "USA")
	address3 := NewAddress("456 Oak Ave", "Anytown", "CA", "12345", "USA")

	// When & Then
	assertions.True(address1.Equals(address2), "Addresses with same components should be equal")
	assertions.False(address1.Equals(address3), "Addresses with different street should not be equal")
	assertions.Equal(address1.GetHashCode(), address2.GetHashCode(), "Equal addresses should have same hash code")
}

func TestValueObject_Should_HandleNullableFields_When_NullValuesPresent(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	middleName := "James"

	name1 := NewPersonName("John", "Doe", nil)
	name2 := NewPersonName("John", "Doe", nil)
	name3 := NewPersonName("John", "Doe", &middleName)
	name4 := NewPersonName("John", "Doe", &middleName)

	// When & Then - Both nil middle names
	assertions.True(name1.Equals(name2), "Names with both nil middle names should be equal")
	assertions.Equal(name1.GetHashCode(), name2.GetHashCode(), "Names with both nil middle names should have same hash")

	// When & Then - Both non-nil middle names
	assertions.True(name3.Equals(name4), "Names with same non-nil middle names should be equal")
	assertions.Equal(name3.GetHashCode(), name4.GetHashCode(), "Names with same non-nil middle names should have same hash")

	// When & Then - One nil, one non-nil
	assertions.False(name1.Equals(name3), "Names with different middle name nullability should not be equal")
	assertions.NotEqual(name1.GetHashCode(), name3.GetHashCode(), "Names with different middle name nullability should have different hash")

	// When & Then - Different non-nil middle names
	differentMiddleName := "William"
	name5 := NewPersonName("John", "Doe", &differentMiddleName)
	assertions.False(name3.Equals(name5), "Names with different middle names should not be equal")
}

func TestValueObject_Should_HandleSliceFields_When_CollectionsProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	tags1 := NewProductTags([]string{"electronics", "gadget", "mobile"})
	tags2 := NewProductTags([]string{"electronics", "gadget", "mobile"})
	tags3 := NewProductTags([]string{"electronics", "gadget"})
	tags4 := NewProductTags([]string{"electronics", "mobile", "gadget"}) // Different order
	tags5 := NewProductTags([]string{})
	tags6 := NewProductTags([]string{})

	// When & Then - Same content
	assertions.True(tags1.Equals(tags2), "Product tags with same content should be equal")
	assertions.Equal(tags1.GetHashCode(), tags2.GetHashCode(), "Product tags with same content should have same hash")

	// When & Then - Different content
	assertions.False(tags1.Equals(tags3), "Product tags with different content should not be equal")
	assertions.False(tags1.Equals(tags4), "Product tags with different order should not be equal")

	// When & Then - Empty slices
	assertions.True(tags5.Equals(tags6), "Empty product tags should be equal")
	assertions.Equal(tags5.GetHashCode(), tags6.GetHashCode(), "Empty product tags should have same hash")

	// When & Then - Empty vs non-empty
	assertions.False(tags1.Equals(tags5), "Non-empty and empty tags should not be equal")
}

func TestValueObject_Should_HandleMapFields_When_MapsProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	props1 := map[string]interface{}{
		"color":    "red",
		"size":     "large",
		"weight":   2.5,
		"features": []string{"waterproof", "durable"},
	}
	props2 := map[string]interface{}{
		"color":    "red",
		"size":     "large",
		"weight":   2.5,
		"features": []string{"waterproof", "durable"},
	}
	props3 := map[string]interface{}{
		"color":  "blue",
		"size":   "large",
		"weight": 2.5,
	}

	metadata1 := NewMetadata(props1)
	metadata2 := NewMetadata(props2)
	metadata3 := NewMetadata(props3)
	metadata4 := NewMetadata(map[string]interface{}{})
	metadata5 := NewMetadata(map[string]interface{}{})

	// When & Then - Same content
	assertions.True(metadata1.Equals(metadata2), "Metadata with same content should be equal")
	assertions.Equal(metadata1.GetHashCode(), metadata2.GetHashCode(), "Metadata with same content should have same hash")

	// When & Then - Different content
	assertions.False(metadata1.Equals(metadata3), "Metadata with different content should not be equal")

	// When & Then - Empty maps
	assertions.True(metadata4.Equals(metadata5), "Empty metadata should be equal")
	assertions.Equal(metadata4.GetHashCode(), metadata5.GetHashCode(), "Empty metadata should have same hash")

	// When & Then - Empty vs non-empty
	assertions.False(metadata1.Equals(metadata4), "Non-empty and empty metadata should not be equal")
}

func TestValueObject_Should_HandleComplexNestedStructures_When_ComplexObjectsProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	pointerString1 := "test"
	pointerString2 := "test"

	complex1 := NewComplexValueObject(
		"string1",
		42,
		3.14,
		true,
		[]string{"a", "b", "c"},
		map[string]int{"x": 1, "y": 2},
		&pointerString1,
		NewMoney(100.0, "USD"),
	)

	complex2 := NewComplexValueObject(
		"string1",
		42,
		3.14,
		true,
		[]string{"a", "b", "c"},
		map[string]int{"x": 1, "y": 2},
		&pointerString2,
		NewMoney(100.0, "USD"),
	)

	complex3 := NewComplexValueObject(
		"string2", // Different string
		42,
		3.14,
		true,
		[]string{"a", "b", "c"},
		map[string]int{"x": 1, "y": 2},
		&pointerString1,
		NewMoney(100.0, "USD"),
	)

	// When & Then - Same content
	assertions.True(complex1.Equals(complex2), "Complex objects with same content should be equal")
	assertions.Equal(complex1.GetHashCode(), complex2.GetHashCode(), "Complex objects with same content should have same hash")

	// When & Then - Different content
	assertions.False(complex1.Equals(complex3), "Complex objects with different content should not be equal")
}

func TestValueObject_Should_HandleNestedValueObjects_When_CompositionUsed(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	money1 := NewMoney(100.0, "USD")
	money2 := NewMoney(100.0, "USD")
	money3 := NewMoney(200.0, "USD")

	complex1 := NewComplexValueObject("test", 1, 1.0, true, []string{}, map[string]int{}, nil, money1)
	complex2 := NewComplexValueObject("test", 1, 1.0, true, []string{}, map[string]int{}, nil, money2)
	complex3 := NewComplexValueObject("test", 1, 1.0, true, []string{}, map[string]int{}, nil, money3)

	// When & Then
	assertions.True(complex1.Equals(complex2), "Objects with equal nested value objects should be equal")
	assertions.False(complex1.Equals(complex3), "Objects with different nested value objects should not be equal")
}

func TestValueObject_Should_MaintainEqualityInvariant_When_PerformingComplexOperations(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	money := NewMoney(100.50, "USD")

	// Create multiple equivalent objects
	equivalents := []*Money{
		NewMoney(100.50, "USD"),
		NewMoney(100.50, "USD"),
		NewMoney(100.50, "USD"),
	}

	// When & Then - Reflexivity: a.Equals(a) should be true
	assertions.True(money.Equals(money), "Object should be equal to itself")

	// When & Then - Symmetry: a.Equals(b) == b.Equals(a)
	for i, equiv := range equivalents {
		equal1 := money.Equals(equiv)
		equal2 := equiv.Equals(money)
		assertions.Equal(equal1, equal2, fmt.Sprintf("Symmetry should hold for equivalent %d", i))
	}

	// When & Then - Transitivity: if a.Equals(b) and b.Equals(c), then a.Equals(c)
	if len(equivalents) >= 2 {
		a, b, c := money, equivalents[0], equivalents[1]
		if a.Equals(b) && b.Equals(c) {
			assertions.True(a.Equals(c), "Transitivity should hold")
		}
	}

	// When & Then - Consistency: multiple calls should return same result
	result1 := money.Equals(equivalents[0])
	result2 := money.Equals(equivalents[0])
	result3 := money.Equals(equivalents[0])
	assertions.Equal(result1, result2, "Equality should be consistent")
	assertions.Equal(result2, result3, "Equality should be consistent")

	// When & Then - Hash code consistency with equality
	for _, equiv := range equivalents {
		if money.Equals(equiv) {
			assertions.Equal(money.GetHashCode(), equiv.GetHashCode(), "Equal objects should have same hash code")
		}
	}
}

func TestValueObject_Should_SupportUtilityFunctions_When_UtilsCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	money1 := NewMoney(100.50, "USD")
	money2 := NewMoney(100.50, "USD")
	money3 := NewMoney(200.00, "USD")

	// When & Then - ValueObjectEquals utility
	assertions.True(domain.ValueObjectEquals(money1, money2), "ValueObjectEquals should return true for equal objects")
	assertions.False(domain.ValueObjectEquals(money1, money3), "ValueObjectEquals should return false for different objects")
	assertions.True(domain.ValueObjectEquals(nil, nil), "ValueObjectEquals should return true for both nil")
	assertions.False(domain.ValueObjectEquals(money1, nil), "ValueObjectEquals should return false for one nil")
	assertions.False(domain.ValueObjectEquals(nil, money1), "ValueObjectEquals should return false for one nil")

	// When & Then - ValueObjectHashCode utility
	hash1 := domain.ValueObjectHashCode(money1)
	hash2 := domain.ValueObjectHashCode(money2)
	hash3 := domain.ValueObjectHashCode(money3)
	hashNil := domain.ValueObjectHashCode(nil)

	assertions.Equal(hash1, hash2, "ValueObjectHashCode should return same hash for equal objects")
	assertions.NotEqual(hash1, hash3, "ValueObjectHashCode should return different hash for different objects")
	assertions.Equal(uint64(0), hashNil, "ValueObjectHashCode should return 0 for nil")
}

func TestValueObject_Should_HandleConcurrentAccess_When_AccessedFromMultipleGoroutines(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	money := NewMoney(100.50, "USD")

	const numGoroutines = 10
	done := make(chan bool, numGoroutines)

	// When - access value object concurrently
	for i := 0; i < numGoroutines; i++ {
		go func(index int) {
			defer func() { done <- true }()

			// Read operations should be safe
			components := money.GetEqualityComponents()
			hash := money.GetHashCode()

			// Verify consistency
			if len(components) != 2 {
				t.Errorf("Goroutine %d: Components length consistency failed", index)
			}
			if components[0] != 100.50 {
				t.Errorf("Goroutine %d: Amount consistency failed", index)
			}
			if components[1] != "USD" {
				t.Errorf("Goroutine %d: Currency consistency failed", index)
			}
			if hash == 0 {
				t.Errorf("Goroutine %d: Hash code should not be zero", index)
			}

			// Equality operations should be safe
			otherMoney := NewMoney(100.50, "USD")
			if !money.Equals(otherMoney) {
				t.Errorf("Goroutine %d: Equality check failed", index)
			}
		}(i)
	}

	// Wait for all goroutines
	for i := 0; i < numGoroutines; i++ {
		<-done
	}

	// Then - Value object should remain consistent
	assertions.Equal(100.50, money.Amount, "Amount should remain consistent")
	assertions.Equal("USD", money.Currency, "Currency should remain consistent")
}

func TestValueObject_Should_HandleEdgeCases_When_UnusualValuesProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)

	// Zero values
	zeroMoney := NewMoney(0.0, "")
	assertions.NotEqual(uint64(0), zeroMoney.GetHashCode(), "Zero values should still have non-zero hash")

	// Negative values
	negativeMoney := NewMoney(-100.0, "USD")
	assertions.True(negativeMoney.GetHashCode() != 0, "Negative values should have non-zero hash")

	// Very large values
	largeMoney := NewMoney(999999999999.99, "USD")
	assertions.True(largeMoney.GetHashCode() != 0, "Large values should have non-zero hash")

	// Special float values
	nanMoney := NewMoney(math.NaN(), "USD") // NaN
	infMoney := NewMoney(math.Inf(1), "USD") // +Inf
	negInfMoney := NewMoney(math.Inf(-1), "USD") // -Inf

	// These should not panic
	_ = nanMoney.GetHashCode()
	_ = infMoney.GetHashCode()
	_ = negInfMoney.GetHashCode()

	// Empty slices and maps
	emptyTags := NewProductTags([]string{})
	emptyMetadata := NewMetadata(map[string]interface{}{})
	assertions.True(emptyTags.GetHashCode() != 0, "Empty slice should have non-zero hash")
	assertions.True(emptyMetadata.GetHashCode() != 0, "Empty map should have non-zero hash")

	// Nil slices and maps
	nilTags := &ProductTags{Tags: nil}
	nilMetadata := &Metadata{Properties: nil}
	assertions.True(nilTags.GetHashCode() != 0, "Nil slice should have non-zero hash")
	assertions.True(nilMetadata.GetHashCode() != 0, "Nil map should have non-zero hash")
}

func TestValueObject_Should_HandleSliceOrderDependency_When_OrderMatters(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	tags1 := NewProductTags([]string{"a", "b", "c"})
	tags2 := NewProductTags([]string{"a", "b", "c"})
	tags3 := NewProductTags([]string{"c", "b", "a"}) // Different order

	// When & Then
	assertions.True(tags1.Equals(tags2), "Same order should be equal")
	assertions.False(tags1.Equals(tags3), "Different order should not be equal")
	assertions.NotEqual(tags1.GetHashCode(), tags3.GetHashCode(), "Different order should have different hash")
}

func TestValueObject_Should_HandleNestedSlicesAndMaps_When_ComplexStructuresProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	nestedMap1 := map[string]interface{}{
		"level1": map[string]interface{}{
			"level2": []string{"a", "b", "c"},
			"other":  42,
		},
		"simple": "value",
	}
	nestedMap2 := map[string]interface{}{
		"level1": map[string]interface{}{
			"level2": []string{"a", "b", "c"},
			"other":  42,
		},
		"simple": "value",
	}
	nestedMap3 := map[string]interface{}{
		"level1": map[string]interface{}{
			"level2": []string{"a", "b", "d"}, // Different
			"other":  42,
		},
		"simple": "value",
	}

	metadata1 := NewMetadata(nestedMap1)
	metadata2 := NewMetadata(nestedMap2)
	metadata3 := NewMetadata(nestedMap3)

	// When & Then
	assertions.True(metadata1.Equals(metadata2), "Same nested structures should be equal")
	assertions.False(metadata1.Equals(metadata3), "Different nested structures should not be equal")
}

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================

func TestValueObject_Should_PerformEqualityChecksEfficiently_When_ManyComparisonsPerformed(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	const numComparisons = 1000

	money1 := NewMoney(100.50, "USD")
	money2 := NewMoney(100.50, "USD")
	money3 := NewMoney(200.00, "EUR")

	// When - perform many equality comparisons
	start := time.Now()
	equalCount := 0
	for i := 0; i < numComparisons; i++ {
		if i%2 == 0 {
			if money1.Equals(money2) {
				equalCount++
			}
		} else {
			if money1.Equals(money3) {
				equalCount++
			}
		}
	}
	duration := time.Since(start)

	// Then
	assertions.True(duration < time.Second, "Equality comparisons should be fast")
	assertions.Equal(numComparisons/2, equalCount, "Should have correct number of equal comparisons")
}

func TestValueObject_Should_GenerateHashCodesEfficiently_When_ManyHashesGenerated(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	const numObjects = 1000

	objects := make([]*Money, numObjects)
	for i := 0; i < numObjects; i++ {
		objects[i] = NewMoney(float64(i), "USD")
	}

	// When - generate many hash codes
	start := time.Now()
	hashes := make([]uint64, numObjects)
	for i, obj := range objects {
		hashes[i] = obj.GetHashCode()
	}
	duration := time.Since(start)

	// Then
	assertions.True(duration < time.Millisecond*100, "Hash generation should be fast")

	// Verify hash distribution
	uniqueHashes := make(map[uint64]bool)
	for _, hash := range hashes {
		uniqueHashes[hash] = true
		assertions.True(hash != 0, "Hash should not be zero")
	}

	// Should have high uniqueness
	uniqueRatio := float64(len(uniqueHashes)) / float64(numObjects)
	assertions.True(uniqueRatio > 0.9, "Should have high hash uniqueness ratio")
}

// =============================================================================
// IMMUTABILITY TESTS
// =============================================================================

func TestValueObject_Should_RemainImmutable_When_UnderlyingDataModified(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	originalTags := []string{"tag1", "tag2", "tag3"}
	productTags := NewProductTags(originalTags)

	originalHash := productTags.GetHashCode()
	originalComponents := productTags.GetEqualityComponents()

	// When - modify original slice (should not affect value object due to copy)
	originalTags[0] = "modified"

	// Then
	newComponents := productTags.GetEqualityComponents()
	newHash := productTags.GetHashCode()

	assertions.Equal(originalHash, newHash, "Hash should remain unchanged")
	assertions.Equal(len(originalComponents), len(newComponents), "Components length should remain unchanged")

	// Verify the value object wasn't affected
	tags := newComponents[0].([]string)
	assertions.Equal("tag1", tags[0], "First tag should remain unchanged")
	assertions.Equal("tag2", tags[1], "Second tag should remain unchanged")
	assertions.Equal("tag3", tags[2], "Third tag should remain unchanged")
}

func TestValueObject_Should_RemainImmutable_When_ReturnedComponentsModified(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	productTags := NewProductTags([]string{"tag1", "tag2", "tag3"})
	originalHash := productTags.GetHashCode()

	// When - modify returned components (should not affect value object if properly implemented)
	components := productTags.GetEqualityComponents()
	if slice, ok := components[0].([]string); ok {
		// This modification should not affect the original if properly copied
		slice[0] = "modified"
	}

	// Then
	newHash := productTags.GetHashCode()
	newComponents := productTags.GetEqualityComponents()

	// The hash and components should remain unchanged if immutability is properly implemented
	// Note: This test depends on whether GetEqualityComponents returns copies or references
	assertions.Equal(originalHash, newHash, "Hash should remain unchanged")

	if newSlice, ok := newComponents[0].([]string); ok {
		// If properly implemented, the original should be preserved
		assertions.Equal("tag1", newSlice[0], "Original data should be preserved")
	}
}

// =============================================================================
// TABLE-DRIVEN TESTS
// =============================================================================

func TestValueObject_Should_HandleVariousDataTypes_When_DifferentTypesUsed(t *testing.T) {
	testCases := []struct {
		name    string
		obj1    domain.ValueObject
		obj2    domain.ValueObject
		obj3    domain.ValueObject
		equal12 bool
		equal13 bool
	}{
		{
			name:    "Money objects",
			obj1:    NewMoney(100.0, "USD"),
			obj2:    NewMoney(100.0, "USD"),
			obj3:    NewMoney(200.0, "USD"),
			equal12: true,
			equal13: false,
		},
		{
			name:    "Address objects",
			obj1:    NewAddress("123 Main", "City", "ST", "12345", "US"),
			obj2:    NewAddress("123 Main", "City", "ST", "12345", "US"),
			obj3:    NewAddress("456 Oak", "City", "ST", "12345", "US"),
			equal12: true,
			equal13: false,
		},
		{
			name:    "ProductTags objects",
			obj1:    NewProductTags([]string{"a", "b"}),
			obj2:    NewProductTags([]string{"a", "b"}),
			obj3:    NewProductTags([]string{"c", "d"}),
			equal12: true,
			equal13: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Given
			assertions := testutils.NewAssertions(t)

			// When & Then - equality
			assertions.Equal(tc.equal12, tc.obj1.Equals(tc.obj2), "obj1.Equals(obj2) should match expected")
			assertions.Equal(tc.equal13, tc.obj1.Equals(tc.obj3), "obj1.Equals(obj3) should match expected")

			// When & Then - hash consistency
			if tc.equal12 {
				assertions.Equal(tc.obj1.GetHashCode(), tc.obj2.GetHashCode(), "Equal objects should have same hash")
			}
			if !tc.equal13 {
				// Different objects might have same hash (collision), but it's unlikely
				// We don't assert inequality here as it's not guaranteed
			}
		})
	}
}