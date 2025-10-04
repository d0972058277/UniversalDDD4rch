package contract

import (
	"testing"

	"github.com/universalddd/architecture-core/domain"
)

// TestEntity_Should_ProvideIdentityBasedEquality_When_Compared
func TestEntity_Should_ProvideIdentityBasedEquality_When_Compared(t *testing.T) {
	t.Run("Should_BeEqual_When_SameID", func(t *testing.T) {
		// Given: Two entities with same ID
		id := "entity-001"
		entity1 := domain.NewTestEntity(id)
		entity2 := domain.NewTestEntity(id)

		// When: Comparing entities
		// Then: Should be equal based on ID
		if !entity1.Equals(entity2) {
			t.Error("Entities with same ID should be equal")
		}
	})

	t.Run("Should_NotBeEqual_When_DifferentID", func(t *testing.T) {
		// Given: Two entities with different IDs
		entity1 := domain.NewTestEntity("entity-001")
		entity2 := domain.NewTestEntity("entity-002")

		// When: Comparing entities
		// Then: Should not be equal
		if entity1.Equals(entity2) {
			t.Error("Entities with different IDs should not be equal")
		}
	})

	t.Run("Should_HaveConsistentHashCode_When_SameID", func(t *testing.T) {
		// Given: Two entities with same ID
		id := "entity-003"
		entity1 := domain.NewTestEntity(id)
		entity2 := domain.NewTestEntity(id)

		// When: Getting hash codes
		hash1 := entity1.GetHashCode()
		hash2 := entity2.GetHashCode()

		// Then: Hash codes should be equal
		if hash1 != hash2 {
			t.Error("Entities with same ID should have equal hash codes")
		}
	})

	t.Run("Should_ReturnImmutableID_When_Accessed", func(t *testing.T) {
		// Given: An entity with ID
		originalID := "entity-004"
		entity := domain.NewTestEntity(originalID)

		// When: Getting ID multiple times
		id1 := entity.ID()
		id2 := entity.ID()

		// Then: ID should be immutable and consistent
		if id1.String() != originalID || id2.String() != originalID || id1 != id2 {
			t.Error("Entity ID should be immutable and consistent")
		}
	})

	t.Run("Should_SupportGenericIDTypes_When_Constrained", func(t *testing.T) {
		// Given: Different ID types that satisfy constraints
		stringEntity := domain.NewTestEntity("string-id")

		customID := domain.CustomTestID{Value: "custom-id"}
		customEntity := domain.NewTestEntityWithCustomID(customID)

		// When: Working with different ID types
		// Then: Should compile and work correctly
		if stringEntity == nil || customEntity == nil {
			t.Error("Should support different ID types")
		}
	})

	t.Run("Should_NotBeEqual_When_ComparedToNil", func(t *testing.T) {
		// Given: An entity
		entity := domain.NewTestEntity("entity-005")

		// When: Comparing to nil
		// Then: Should not be equal
		if entity.Equals(nil) {
			t.Error("Entity should not equal nil")
		}
	})
}