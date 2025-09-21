package contract

import (
	"testing"

	"github.com/universalddd/architecture-core-go/pkg/domain"
)

// TestEntityID_Should_SatisfyComparableConstraint_When_UsedAsGenericParameter
func TestEntityID_Should_SatisfyComparableConstraint_When_StateUnderTest(t *testing.T) {
	t.Run("Should_AcceptStringAsEntityID_When_UsedWithEntity", func(t *testing.T) {
		// Given: A function that requires comparable EntityID constraint
		// When: Using string as EntityID
		// Then: Should compile without errors

		// This test will fail until Entity is implemented with proper constraints
		entity := domain.NewTestEntity("test-id")
		if entity == nil {
			t.Fatal("Entity creation should not return nil")
		}
	})

	t.Run("Should_AcceptCustomIDType_When_ImplementingComparable", func(t *testing.T) {
		// Given: A custom ID type that implements comparable constraint
		type CustomID struct {
			Value string
		}

		// When: Using CustomID as EntityID
		// Then: Should work with Entity generic constraint

		// This test will fail until Entity is implemented
		var customID CustomID = CustomID{Value: "custom-123"}
		entity := domain.NewTestEntityWithCustomID(customID)
		if entity == nil {
			t.Fatal("Entity with custom ID creation should not return nil")
		}
	})

	t.Run("Should_SupportEqualityComparison_When_SameIDValues", func(t *testing.T) {
		// Given: Two entities with same ID
		id := "same-id"

		// When: Creating entities with same ID
		entity1 := domain.NewTestEntity(id)
		entity2 := domain.NewTestEntity(id)

		// Then: Should be equal
		if !entity1.Equals(entity2) {
			t.Error("Entities with same ID should be equal")
		}
	})
}