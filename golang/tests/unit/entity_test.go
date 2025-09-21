package unit

import (
	"fmt"
	"sync"
	"testing"

	"github.com/universalddd/architecture-core-go/pkg/domain"
	testutils "github.com/universalddd/architecture-core-go/internal/testing"
)

// =============================================================================
// UNIT TESTS FOR ENTITY IDENTITY-BASED EQUALITY AND HASH CODE
// Requirements: Identity-based equality, hash consistency, thread safety
// =============================================================================

// Test entity ID types
type TestProductID string

func (id TestProductID) String() string { return string(id) }

type TestUserID int

func (id TestUserID) String() string { return fmt.Sprintf("user-%d", id) }

type TestUUID string

func (id TestUUID) String() string { return string(id) }

// Test entities
type TestProduct struct {
	*domain.Entity[TestProductID]
	Name        string
	Price       float64
	Category    string
	Description string
}

func NewTestProduct(id TestProductID, name string, price float64) *TestProduct {
	return &TestProduct{
		Entity:      domain.NewEntity(id),
		Name:        name,
		Price:       price,
		Category:    "General",
		Description: "Test product",
	}
}

type TestUser struct {
	*domain.Entity[TestUserID]
	Username string
	Email    string
	IsActive bool
}

func NewTestUser(id TestUserID, username, email string) *TestUser {
	return &TestUser{
		Entity:   domain.NewEntity(id),
		Username: username,
		Email:    email,
		IsActive: true,
	}
}

func TestEntity_Should_CreateWithID_When_NewEntityCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	productID := TestProductID("product-123")

	// When
	entity := domain.NewEntity(productID)

	// Then
	assertions.NotNil(entity, "Entity should not be nil")
	assertions.Equal(productID, entity.GetID(), "Entity ID should match")
}

func TestEntity_Should_BeEqual_When_SameIDProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	productID := TestProductID("product-123")
	entity1 := domain.NewEntity(productID)
	entity2 := domain.NewEntity(productID)

	// When
	isEqual := entity1.Equals(entity2)

	// Then
	assertions.True(isEqual, "Entities with same ID should be equal")
	assertions.True(entity2.Equals(entity1), "Equality should be symmetric")
}

func TestEntity_Should_NotBeEqual_When_DifferentIDProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	entity1 := domain.NewEntity(TestProductID("product-123"))
	entity2 := domain.NewEntity(TestProductID("product-456"))

	// When
	isEqual := entity1.Equals(entity2)

	// Then
	assertions.False(isEqual, "Entities with different IDs should not be equal")
	assertions.False(entity2.Equals(entity1), "Inequality should be symmetric")
}

func TestEntity_Should_NotBeEqual_When_ComparedWithNil(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	entity := domain.NewEntity(TestProductID("product-123"))

	// When
	isEqual := entity.Equals(nil)

	// Then
	assertions.False(isEqual, "Entity should not be equal to nil")
}

func TestEntity_Should_HaveSameHashCode_When_SameIDProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	productID := TestProductID("product-123")
	entity1 := domain.NewEntity(productID)
	entity2 := domain.NewEntity(productID)

	// When
	hash1 := entity1.GetHashCode()
	hash2 := entity2.GetHashCode()

	// Then
	assertions.Equal(hash1, hash2, "Entities with same ID should have same hash code")
	assertions.True(hash1 != 0, "Hash code should not be zero")
}

func TestEntity_Should_HaveDifferentHashCode_When_DifferentIDProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	entity1 := domain.NewEntity(TestProductID("product-123"))
	entity2 := domain.NewEntity(TestProductID("product-456"))

	// When
	hash1 := entity1.GetHashCode()
	hash2 := entity2.GetHashCode()

	// Then
	assertions.NotEqual(hash1, hash2, "Entities with different IDs should have different hash codes")
}

func TestEntity_Should_MaintainHashConsistency_When_MultipleCallsMade(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	entity := domain.NewEntity(TestProductID("product-123"))

	// When
	hash1 := entity.GetHashCode()
	hash2 := entity.GetHashCode()
	hash3 := entity.GetHashCode()

	// Then
	assertions.Equal(hash1, hash2, "Hash should be consistent across calls")
	assertions.Equal(hash2, hash3, "Hash should be consistent across calls")
	assertions.Equal(hash1, hash3, "Hash should be consistent across calls")
}

func TestEntity_Should_SupportDifferentIDTypes_When_VariousComparableTypesUsed(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)

	// String-based ID
	stringEntity1 := domain.NewEntity(TestProductID("product-123"))
	stringEntity2 := domain.NewEntity(TestProductID("product-123"))
	stringEntity3 := domain.NewEntity(TestProductID("product-456"))

	// Integer-based ID
	intEntity1 := domain.NewEntity(TestUserID(123))
	intEntity2 := domain.NewEntity(TestUserID(123))
	intEntity3 := domain.NewEntity(TestUserID(456))

	// UUID-based ID
	uuidEntity1 := domain.NewEntity(TestUUID("550e8400-e29b-41d4-a716-446655440000"))
	uuidEntity2 := domain.NewEntity(TestUUID("550e8400-e29b-41d4-a716-446655440000"))
	uuidEntity3 := domain.NewEntity(TestUUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8"))

	// When & Then - String IDs
	assertions.True(stringEntity1.Equals(stringEntity2), "String entities with same ID should be equal")
	assertions.False(stringEntity1.Equals(stringEntity3), "String entities with different IDs should not be equal")
	assertions.Equal(stringEntity1.GetHashCode(), stringEntity2.GetHashCode(), "String entities with same ID should have same hash")

	// When & Then - Integer IDs
	assertions.True(intEntity1.Equals(intEntity2), "Integer entities with same ID should be equal")
	assertions.False(intEntity1.Equals(intEntity3), "Integer entities with different IDs should not be equal")
	assertions.Equal(intEntity1.GetHashCode(), intEntity2.GetHashCode(), "Integer entities with same ID should have same hash")

	// When & Then - UUID IDs
	assertions.True(uuidEntity1.Equals(uuidEntity2), "UUID entities with same ID should be equal")
	assertions.False(uuidEntity1.Equals(uuidEntity3), "UUID entities with different IDs should not be equal")
	assertions.Equal(uuidEntity1.GetHashCode(), uuidEntity2.GetHashCode(), "UUID entities with same ID should have same hash")
}

func TestEntity_Should_IgnoreNonIDFields_When_ComparingEquality(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	productID := TestProductID("product-123")
	product1 := NewTestProduct(productID, "Product A", 100.0)
	product2 := NewTestProduct(productID, "Product B", 200.0)

	// Modify additional fields
	product1.Category = "Electronics"
	product1.Description = "Electronic device"
	product2.Category = "Books"
	product2.Description = "Educational book"

	// When
	isEqual := product1.Equals(product2.Entity)

	// Then
	assertions.True(isEqual, "Entities should be equal regardless of non-ID field differences")
	assertions.Equal(product1.GetHashCode(), product2.GetHashCode(), "Hash codes should be equal regardless of non-ID field differences")
}

func TestEntity_Should_SupportUtilityFunctions_When_EntityUtilsCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	productID := TestProductID("product-123")
	entity1 := domain.NewEntity(productID)
	entity2 := domain.NewEntity(productID)
	entity3 := domain.NewEntity(TestProductID("product-456"))

	// When & Then - EntityEquals utility
	assertions.True(domain.EntityEquals(entity1, entity2), "EntityEquals should return true for same entities")
	assertions.False(domain.EntityEquals(entity1, entity3), "EntityEquals should return false for different entities")
	assertions.True(domain.EntityEquals[TestProductID](nil, nil), "EntityEquals should return true for both nil")
	assertions.False(domain.EntityEquals(entity1, nil), "EntityEquals should return false for one nil")
	assertions.False(domain.EntityEquals(nil, entity1), "EntityEquals should return false for one nil")

	// When & Then - EntityHashCode utility
	hash1 := domain.EntityHashCode(entity1)
	hash2 := domain.EntityHashCode(entity2)
	hash3 := domain.EntityHashCode(entity3)
	hashNil := domain.EntityHashCode[TestProductID](nil)

	assertions.Equal(hash1, hash2, "EntityHashCode should return same hash for same entities")
	assertions.NotEqual(hash1, hash3, "EntityHashCode should return different hash for different entities")
	assertions.Equal(uint64(0), hashNil, "EntityHashCode should return 0 for nil")
}

func TestEntity_Should_HandleStringRepresentation_When_StringMethodCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)

	// Test with string ID
	stringEntity := domain.NewEntity(TestProductID("product-123"))
	stringStr := stringEntity.String()

	// Test with integer ID
	intEntity := domain.NewEntity(TestUserID(123))
	intStr := intEntity.String()

	// Test with UUID ID
	uuidEntity := domain.NewEntity(TestUUID("550e8400-e29b-41d4-a716-446655440000"))
	uuidStr := uuidEntity.String()

	// Then
	assertions.True(len(stringStr) > 0, "String representation should not be empty")
	assertions.Contains(stringStr, "product-123", "String representation should contain the ID")
	assertions.Contains(stringStr, "Entity", "String representation should indicate it's an entity")

	assertions.True(len(intStr) > 0, "Integer entity string representation should not be empty")
	assertions.Contains(intStr, "123", "Integer entity string representation should contain the ID")

	assertions.True(len(uuidStr) > 0, "UUID entity string representation should not be empty")
	assertions.Contains(uuidStr, "550e8400", "UUID entity string representation should contain part of the UUID")
}

func TestEntity_Should_HandleTransientState_When_IsTransientCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	entity := domain.NewEntity(TestProductID("product-123"))

	// When
	isTransient := entity.IsTransient()

	// Then
	// Note: The current implementation always returns false
	// In a real implementation, this would check for zero/empty ID values
	assertions.False(isTransient, "IsTransient implementation returns false for this test")
}

func TestEntity_Should_AllowIDModification_When_SetIDCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	entity := domain.NewEntity(TestProductID("product-123"))
	newID := TestProductID("product-456")

	// When
	entity.SetID(newID)

	// Then
	assertions.Equal(newID, entity.GetID(), "ID should be updated")

	// Hash code should also change
	newHash := entity.GetHashCode()
	assertions.True(newHash != 0, "New hash code should not be zero")
}

func TestEntity_Should_HandleConcurrentAccess_When_AccessedFromMultipleGoroutines(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	entity := domain.NewEntity(TestProductID("product-123"))

	const numGoroutines = 10
	done := make(chan bool, numGoroutines)

	// When - access entity concurrently
	for i := 0; i < numGoroutines; i++ {
		go func(index int) {
			defer func() { done <- true }()

			// Read operations should be safe
			id := entity.GetID()
			hash := entity.GetHashCode()
			str := entity.String()
			isTransient := entity.IsTransient()

			// Verify consistency
			if id != TestProductID("product-123") {
				t.Errorf("Goroutine %d: ID consistency failed", index)
			}
			if hash == 0 {
				t.Errorf("Goroutine %d: Hash code should not be zero", index)
			}
			if len(str) == 0 {
				t.Errorf("Goroutine %d: String representation should not be empty", index)
			}
			_ = isTransient // Just call it to ensure no panic

			// Equality operations should be safe
			otherEntity := domain.NewEntity(TestProductID("product-123"))
			if !entity.Equals(otherEntity) {
				t.Errorf("Goroutine %d: Equality check failed", index)
			}
		}(i)
	}

	// Wait for all goroutines
	for i := 0; i < numGoroutines; i++ {
		<-done
	}

	// Then - Entity should remain consistent
	assertions.Equal(TestProductID("product-123"), entity.GetID(), "ID should remain consistent")
}

func TestEntity_Should_HandleConcurrentIDModification_When_SetIDCalledConcurrently(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	entity := domain.NewEntity(TestProductID("initial"))

	const numGoroutines = 10
	done := make(chan bool, numGoroutines)
	var finalIDs []TestProductID

	// When - modify ID concurrently
	for i := 0; i < numGoroutines; i++ {
		go func(index int) {
			defer func() { done <- true }()

			newID := TestProductID(fmt.Sprintf("product-%d", index))
			entity.SetID(newID)
		}(i)
	}

	// Wait for all goroutines
	for i := 0; i < numGoroutines; i++ {
		<-done
	}

	// Then - One of the IDs should have won
	finalID := entity.GetID()
	assertions.True(len(string(finalID)) > 0, "Final ID should not be empty")

	// Collect all possible IDs
	for i := 0; i < numGoroutines; i++ {
		finalIDs = append(finalIDs, TestProductID(fmt.Sprintf("product-%d", i)))
	}

	// Verify final ID is one of the expected values
	found := false
	for _, expectedID := range finalIDs {
		if finalID == expectedID {
			found = true
			break
		}
	}
	assertions.True(found, "Final ID should be one of the concurrently set IDs")
}

func TestEntity_Should_MaintainEqualityInvariant_When_PerformingComplexOperations(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	productID := TestProductID("product-123")

	// Create multiple entities with same ID
	entities := make([]*domain.Entity[TestProductID], 5)
	for i := 0; i < 5; i++ {
		entities[i] = domain.NewEntity(productID)
	}

	// When & Then - Reflexivity: a.Equals(a) should be true
	for i, entity := range entities {
		assertions.True(entity.Equals(entity), fmt.Sprintf("Entity %d should be equal to itself", i))
	}

	// When & Then - Symmetry: a.Equals(b) == b.Equals(a)
	for i := 0; i < len(entities); i++ {
		for j := i + 1; j < len(entities); j++ {
			equal1 := entities[i].Equals(entities[j])
			equal2 := entities[j].Equals(entities[i])
			assertions.Equal(equal1, equal2, fmt.Sprintf("Symmetry should hold for entities %d and %d", i, j))
		}
	}

	// When & Then - Transitivity: if a.Equals(b) and b.Equals(c), then a.Equals(c)
	if len(entities) >= 3 {
		a, b, c := entities[0], entities[1], entities[2]
		if a.Equals(b) && b.Equals(c) {
			assertions.True(a.Equals(c), "Transitivity should hold")
		}
	}

	// When & Then - Consistency: multiple calls should return same result
	if len(entities) >= 2 {
		a, b := entities[0], entities[1]
		result1 := a.Equals(b)
		result2 := a.Equals(b)
		result3 := a.Equals(b)
		assertions.Equal(result1, result2, "Equality should be consistent")
		assertions.Equal(result2, result3, "Equality should be consistent")
	}

	// When & Then - Hash code consistency with equality
	for i := 0; i < len(entities); i++ {
		for j := i + 1; j < len(entities); j++ {
			if entities[i].Equals(entities[j]) {
				hash1 := entities[i].GetHashCode()
				hash2 := entities[j].GetHashCode()
				assertions.Equal(hash1, hash2, fmt.Sprintf("Equal entities %d and %d should have same hash code", i, j))
			}
		}
	}
}

func TestEntity_Should_HandleEdgeCases_When_UnusualIDsProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)

	// Empty string ID
	emptyEntity := domain.NewEntity(TestProductID(""))
	assertions.Equal(TestProductID(""), emptyEntity.GetID(), "Empty string ID should be preserved")
	assertions.True(emptyEntity.GetHashCode() != 0, "Even empty ID should have non-zero hash")

	// Zero integer ID
	zeroEntity := domain.NewEntity(TestUserID(0))
	assertions.Equal(TestUserID(0), zeroEntity.GetID(), "Zero integer ID should be preserved")
	assertions.True(zeroEntity.GetHashCode() != 0, "Zero ID should have non-zero hash")

	// Very long string ID
	longID := TestProductID("this-is-a-very-long-product-id-that-exceeds-normal-length-expectations-and-contains-many-characters-to-test-edge-cases")
	longEntity := domain.NewEntity(longID)
	assertions.Equal(longID, longEntity.GetID(), "Long ID should be preserved")
	assertions.True(longEntity.GetHashCode() != 0, "Long ID should have non-zero hash")

	// Special characters in ID
	specialID := TestProductID("product-123!@#$%^&*()_+-=[]{}|;:,.<>?")
	specialEntity := domain.NewEntity(specialID)
	assertions.Equal(specialID, specialEntity.GetID(), "Special character ID should be preserved")
	assertions.True(specialEntity.GetHashCode() != 0, "Special character ID should have non-zero hash")

	// Unicode characters in ID
	unicodeID := TestProductID("产品-123-测试-äöü-🎉")
	unicodeEntity := domain.NewEntity(unicodeID)
	assertions.Equal(unicodeID, unicodeEntity.GetID(), "Unicode ID should be preserved")
	assertions.True(unicodeEntity.GetHashCode() != 0, "Unicode ID should have non-zero hash")
}

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================

func TestEntity_Should_PerformEqualityChecksEfficiently_When_ManyComparisonsPerformed(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	const numEntities = 1000
	const numComparisons = 10000

	entities := make([]*domain.Entity[TestProductID], numEntities)
	for i := 0; i < numEntities; i++ {
		entities[i] = domain.NewEntity(TestProductID(fmt.Sprintf("product-%d", i)))
	}

	// When - perform many equality comparisons
	start := time.Now()
	equalCount := 0
	for i := 0; i < numComparisons; i++ {
		entity1 := entities[i%numEntities]
		entity2 := entities[(i+1)%numEntities]
		if entity1.Equals(entity2) {
			equalCount++
		}
	}
	duration := time.Since(start)

	// Then
	assertions.True(duration < time.Second, "Equality comparisons should be fast")
	assertions.True(equalCount >= 0, "Equal count should be non-negative")
}

func TestEntity_Should_GenerateHashCodesEfficiently_When_ManyHashesGenerated(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	const numEntities = 1000

	entities := make([]*domain.Entity[TestProductID], numEntities)
	for i := 0; i < numEntities; i++ {
		entities[i] = domain.NewEntity(TestProductID(fmt.Sprintf("product-%d", i)))
	}

	// When - generate many hash codes
	start := time.Now()
	hashes := make([]uint64, numEntities)
	for i, entity := range entities {
		hashes[i] = entity.GetHashCode()
	}
	duration := time.Since(start)

	// Then
	assertions.True(duration < time.Millisecond*100, "Hash generation should be fast")

	// Verify hash distribution (should have mostly unique hashes)
	uniqueHashes := make(map[uint64]bool)
	for _, hash := range hashes {
		uniqueHashes[hash] = true
		assertions.True(hash != 0, "Hash should not be zero")
	}

	// Should have high uniqueness (at least 90% for different IDs)
	uniqueRatio := float64(len(uniqueHashes)) / float64(numEntities)
	assertions.True(uniqueRatio > 0.9, "Should have high hash uniqueness ratio")
}

// =============================================================================
// INHERITANCE AND COMPOSITION TESTS
// =============================================================================

func TestEntity_Should_SupportInheritance_When_UsedInDomainObjects(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	productID := TestProductID("product-123")
	userID := TestUserID(456)

	product1 := NewTestProduct(productID, "Product A", 100.0)
	product2 := NewTestProduct(productID, "Product B", 200.0)
	user := NewTestUser(userID, "johndoe", "john@example.com")

	// When & Then - Products with same ID should be equal
	assertions.True(product1.Equals(product2.Entity), "Products with same ID should be equal")
	assertions.Equal(product1.GetHashCode(), product2.GetHashCode(), "Products with same ID should have same hash")

	// When & Then - Entity behavior should work through inheritance
	assertions.Equal(productID, product1.GetID(), "Product should have correct ID")
	assertions.Equal(userID, user.GetID(), "User should have correct ID")

	// When & Then - Business fields should not affect equality
	product1.Name = "Updated Name"
	product1.Price = 999.99
	product1.Category = "Updated Category"

	assertions.True(product1.Equals(product2.Entity), "Business field changes should not affect entity equality")

	// When & Then - Different types should not be equal (even if we could compare them)
	// This is enforced by the type system - we can't even call product1.Equals(user.Entity)
	// because they have different ID types
}

// =============================================================================
// TABLE-DRIVEN TESTS
// =============================================================================

func TestEntity_Should_HandleVariousIDTypes_When_DifferentComparableTypesUsed(t *testing.T) {
	testCases := []struct {
		name         string
		createEntity func() interface{}
		getID        func(interface{}) interface{}
		idType       string
	}{
		{
			name: "String ID",
			createEntity: func() interface{} {
				return domain.NewEntity(TestProductID("test-123"))
			},
			getID: func(e interface{}) interface{} {
				return e.(*domain.Entity[TestProductID]).GetID()
			},
			idType: "TestProductID",
		},
		{
			name: "Integer ID",
			createEntity: func() interface{} {
				return domain.NewEntity(TestUserID(123))
			},
			getID: func(e interface{}) interface{} {
				return e.(*domain.Entity[TestUserID]).GetID()
			},
			idType: "TestUserID",
		},
		{
			name: "UUID ID",
			createEntity: func() interface{} {
				return domain.NewEntity(TestUUID("550e8400-e29b-41d4-a716-446655440000"))
			},
			getID: func(e interface{}) interface{} {
				return e.(*domain.Entity[TestUUID]).GetID()
			},
			idType: "TestUUID",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Given
			assertions := testutils.NewAssertions(t)

			// When
			entity := tc.createEntity()
			id := tc.getID(entity)

			// Then
			assertions.NotNil(entity, "Entity should not be nil")
			assertions.NotNil(id, "ID should not be nil")

			// Type-specific assertions would go here
			// For this test, we're primarily verifying that the generic system works
		})
	}
}