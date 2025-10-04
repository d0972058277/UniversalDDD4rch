package contract

import (
	"testing"

	"github.com/universalddd/architecture-core/domain"
)

// TestValueObject_Should_ProvideStructuralEquality_When_Compared
func TestValueObject_Should_ProvideStructuralEquality_When_Compared(t *testing.T) {
	t.Run("Should_BeEqual_When_SameValues", func(t *testing.T) {
		// Given: Two value objects with same component values
		vo1 := domain.NewTestMoney(100.50, "USD")
		vo2 := domain.NewTestMoney(100.50, "USD")

		// When: Comparing value objects
		// Then: Should be equal based on values
		if !vo1.Equals(vo2) {
			t.Error("Value objects with same values should be equal")
		}
	})

	t.Run("Should_NotBeEqual_When_DifferentValues", func(t *testing.T) {
		// Given: Two value objects with different values
		vo1 := domain.NewTestMoney(100.50, "USD")
		vo2 := domain.NewTestMoney(200.75, "USD")

		// When: Comparing value objects
		// Then: Should not be equal
		if vo1.Equals(vo2) {
			t.Error("Value objects with different values should not be equal")
		}
	})

	t.Run("Should_HaveConsistentHashCode_When_SameValues", func(t *testing.T) {
		// Given: Two value objects with same values
		vo1 := domain.NewTestMoney(100.50, "USD")
		vo2 := domain.NewTestMoney(100.50, "USD")

		// When: Getting hash codes
		hash1 := vo1.GetHashCode()
		hash2 := vo2.GetHashCode()

		// Then: Hash codes should be equal
		if hash1 != hash2 {
			t.Error("Value objects with same values should have equal hash codes")
		}
	})

	t.Run("Should_HandleNullComponents_When_Comparing", func(t *testing.T) {
		// Given: Value objects with nil components
		vo1 := domain.NewTestValueObjectWithNil()
		vo2 := domain.NewTestValueObjectWithNil()

		// When: Comparing value objects with nil components
		// Then: Should handle nil properly
		if !vo1.Equals(vo2) {
			t.Error("Value objects with same nil components should be equal")
		}
	})

	t.Run("Should_CompareCollections_When_EqualityComponents", func(t *testing.T) {
		// Given: Value objects with collection components
		vo1 := domain.NewTestValueObjectWithCollection([]string{"a", "b", "c"})
		vo2 := domain.NewTestValueObjectWithCollection([]string{"a", "b", "c"})
		vo3 := domain.NewTestValueObjectWithCollection([]string{"a", "b", "d"})

		// When: Comparing value objects with collections
		// Then: Should compare collection contents
		if !vo1.Equals(vo2) {
			t.Error("Value objects with same collection contents should be equal")
		}
		if vo1.Equals(vo3) {
			t.Error("Value objects with different collection contents should not be equal")
		}
	})

	t.Run("Should_SupportMultipleFields_When_ComparingEquality", func(t *testing.T) {
		// Given: Value objects with multiple fields
		vo1 := domain.NewTestAddress("123 Main St", "Anytown", "12345", "USA")
		vo2 := domain.NewTestAddress("123 Main St", "Anytown", "12345", "USA")
		vo3 := domain.NewTestAddress("456 Oak Ave", "Anytown", "12345", "USA")

		// When: Comparing multi-field value objects
		// Then: Should compare all field values
		if !vo1.Equals(vo2) {
			t.Error("Value objects with same field values should be equal")
		}
		if vo1.Equals(vo3) {
			t.Error("Value objects with different field values should not be equal")
		}
	})

	t.Run("Should_BeImmutable_When_Created", func(t *testing.T) {
		// Given: A value object
		money := domain.NewTestMoney(100.00, "USD")

		// When: Attempting to get values
		amount := money.GetAmount()
		currency := money.GetCurrency()

		// Then: Values should be consistent (immutability enforced by design)
		if amount != 100.00 || currency != "USD" {
			t.Error("Value object should maintain consistent values")
		}
	})
}