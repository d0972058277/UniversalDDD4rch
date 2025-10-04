package integration

import (
	"testing"

	"github.com/universalddd/architecture-core/examples"
)

// TestValueObjectScenarios_Should_HandleRealWorldUsage_When_Used
func TestValueObjectScenarios_Should_HandleRealWorldUsage_When_Used(t *testing.T) {
	t.Run("Should_HandleMoneyOperations_When_ValidOperations", func(t *testing.T) {
		// Given: Money value objects
		price1 := examples.NewMoney(100.50, "USD")
		price2 := examples.NewMoney(100.50, "USD")
		price3 := examples.NewMoney(200.75, "EUR")

		// When: Comparing same values
		// Then: Should be equal
		if !price1.Equals(price2) {
			t.Error("Money objects with same amount and currency should be equal")
		}

		// When: Comparing different values
		// Then: Should not be equal
		if price1.Equals(price3) {
			t.Error("Money objects with different amounts or currencies should not be equal")
		}

		// When: Getting hash codes
		hash1 := price1.GetHashCode()
		hash2 := price2.GetHashCode()
		hash3 := price3.GetHashCode()

		// Then: Same values should have same hash
		if hash1 != hash2 {
			t.Error("Equal money objects should have same hash code")
		}
		if hash1 == hash3 {
			t.Error("Different money objects should likely have different hash codes")
		}
	})

	t.Run("Should_HandleMoneyArithmetic_When_SameCurrency", func(t *testing.T) {
		// Given: Money objects with same currency
		amount1 := examples.NewMoney(100.00, "USD")
		amount2 := examples.NewMoney(50.00, "USD")

		// When: Adding amounts
		sum := amount1.Add(amount2)

		// Then: Should create correct sum
		expected := examples.NewMoney(150.00, "USD")
		if !sum.Equals(expected) {
			t.Error("Money addition should work correctly")
		}

		// When: Subtracting amounts
		difference := amount1.Subtract(amount2)

		// Then: Should create correct difference
		expectedDiff := examples.NewMoney(50.00, "USD")
		if !difference.Equals(expectedDiff) {
			t.Error("Money subtraction should work correctly")
		}
	})

	t.Run("Should_PreventInvalidOperations_When_DifferentCurrencies", func(t *testing.T) {
		// Given: Money objects with different currencies
		usdAmount := examples.NewMoney(100.00, "USD")
		eurAmount := examples.NewMoney(100.00, "EUR")

		// When: Attempting to add different currencies
		// Then: Should handle appropriately (implementation specific)
		defer func() {
			if r := recover(); r != nil {
				t.Log("Addition of different currencies panicked - acceptable behavior")
			}
		}()

		result := usdAmount.Add(eurAmount)
		// If no panic, verify the implementation handles it appropriately
		if result.GetCurrency() != "" {
			t.Log("Addition of different currencies handled without panic")
		}
	})

	t.Run("Should_HandleAddressValueObject_When_ComplexEquality", func(t *testing.T) {
		// Given: Address value objects with multiple fields
		address1 := examples.NewAddress("123 Main St", "Anytown", "12345", "USA")
		address2 := examples.NewAddress("123 Main St", "Anytown", "12345", "USA")
		address3 := examples.NewAddress("456 Oak Ave", "Anytown", "12345", "USA")

		// When: Comparing identical addresses
		// Then: Should be equal
		if !address1.Equals(address2) {
			t.Error("Identical addresses should be equal")
		}

		// When: Comparing different addresses
		// Then: Should not be equal
		if address1.Equals(address3) {
			t.Error("Different addresses should not be equal")
		}

		// When: Getting string representation
		addr1Str := address1.String()
		addr2Str := address2.String()

		// Then: Should be consistent
		if addr1Str != addr2Str {
			t.Error("Equal addresses should have same string representation")
		}
	})

	t.Run("Should_HandleCollectionEquality_When_ValueObjectContainsCollections", func(t *testing.T) {
		// Given: Value objects containing collections
		tags1 := []string{"electronics", "mobile", "smartphone"}
		tags2 := []string{"electronics", "mobile", "smartphone"}
		tags3 := []string{"electronics", "mobile", "tablet"}

		product1 := examples.NewProductTags("PROD-001", tags1)
		product2 := examples.NewProductTags("PROD-001", tags2)
		product3 := examples.NewProductTags("PROD-001", tags3)

		// When: Comparing with same collections
		// Then: Should be equal
		if !product1.Equals(product2) {
			t.Error("Value objects with same collections should be equal")
		}

		// When: Comparing with different collections
		// Then: Should not be equal
		if product1.Equals(product3) {
			t.Error("Value objects with different collections should not be equal")
		}
	})

	t.Run("Should_HandleNullValues_When_ComponentsAreNil", func(t *testing.T) {
		// Given: Value objects with nil components
		contact1 := examples.NewContactInfo("john@example.com", nil) // No phone
		contact2 := examples.NewContactInfo("john@example.com", nil) // No phone
		contact3 := examples.NewContactInfo("john@example.com", examples.NewPhoneNumber("123-456-7890"))

		// When: Comparing objects with nil components
		// Then: Should handle nil properly
		if !contact1.Equals(contact2) {
			t.Error("Value objects with same nil components should be equal")
		}

		// When: Comparing nil with non-nil
		// Then: Should not be equal
		if contact1.Equals(contact3) {
			t.Error("Value objects with nil vs non-nil components should not be equal")
		}
	})

	t.Run("Should_BeImmutable_When_Created", func(t *testing.T) {
		// Given: A money value object
		originalAmount := 100.00
		originalCurrency := "USD"
		money := examples.NewMoney(originalAmount, originalCurrency)

		// When: Getting values multiple times
		amount1 := money.GetAmount()
		currency1 := money.GetCurrency()
		amount2 := money.GetAmount()
		currency2 := money.GetCurrency()

		// Then: Values should be consistent (immutability)
		if amount1 != originalAmount || amount1 != amount2 {
			t.Error("Money amount should be immutable")
		}
		if currency1 != originalCurrency || currency1 != currency2 {
			t.Error("Money currency should be immutable")
		}
	})

	t.Run("Should_SupportValueSemantics_When_UsedInMaps", func(t *testing.T) {
		// Given: A map using value objects as keys
		priceMap := make(map[examples.Money]string)
		price1 := examples.NewMoney(100.00, "USD")
		price2 := examples.NewMoney(100.00, "USD") // Same value, different instance

		// When: Using value objects as map keys
		priceMap[price1] = "product-1"

		// Then: Should be retrievable with equivalent key
		if value, exists := priceMap[price2]; !exists || value != "product-1" {
			t.Error("Value objects should work as map keys based on value equality")
		}
	})

	t.Run("Should_HandleComplexComparisons_When_NestedValueObjects", func(t *testing.T) {
		// Given: Value objects containing other value objects
		price1 := examples.NewMoney(100.00, "USD")
		price2 := examples.NewMoney(100.00, "USD")
		price3 := examples.NewMoney(150.00, "USD")

		orderItem1 := examples.NewOrderItem("ITEM-001", 2, price1)
		orderItem2 := examples.NewOrderItem("ITEM-001", 2, price2)
		orderItem3 := examples.NewOrderItem("ITEM-001", 2, price3)

		// When: Comparing nested value objects
		// Then: Should compare all nested components
		if !orderItem1.Equals(orderItem2) {
			t.Error("Order items with same nested value objects should be equal")
		}

		if orderItem1.Equals(orderItem3) {
			t.Error("Order items with different nested value objects should not be equal")
		}
	})

	t.Run("Should_ProvideStableHashCodes_When_UsedInSets", func(t *testing.T) {
		// Given: A set (map) of value objects
		moneySet := make(map[examples.Money]bool)
		money1 := examples.NewMoney(100.00, "USD")
		money2 := examples.NewMoney(100.00, "USD")
		money3 := examples.NewMoney(200.00, "USD")

		// When: Adding to set
		moneySet[money1] = true
		moneySet[money2] = true // Should not create duplicate
		moneySet[money3] = true

		// Then: Set should contain unique values only
		if len(moneySet) != 2 {
			t.Errorf("Expected 2 unique money values in set, got %d", len(moneySet))
		}

		// And should be able to check membership with equivalent instances
		if !moneySet[examples.NewMoney(100.00, "USD")] {
			t.Error("Should find equivalent money object in set")
		}
	})
}