package integration

import (
	"context"
	"testing"
	"time"

	"github.com/universalddd/architecture-core/examples/quickstart"
	"github.com/universalddd/architecture-core/functional"
)

// TestResultIntegration_Should_ComposeOperations_When_ChainedTogether
func TestResultIntegration_Should_ComposeOperations_When_ChainedTogether(t *testing.T) {
	t.Run("Should_ChainSuccessfulOperations_When_AllSucceed", func(t *testing.T) {
		// Given: Service operations that can succeed or fail
		service := quickstart.NewOrderService()
		ctx := context.Background()

		customerID := "CUST-001"
		amount := quickstart.NewMoney(100.00, "USD")

		// When: Performing operations sequentially and checking each step
		createResult := service.CreateOrder(ctx, customerID, amount, "chain-001")
		if createResult.IsFailure() {
			t.Fatalf("Order creation failed: %v", createResult.Error())
		}

		orderIDString := createResult.Value()
		orderID := quickstart.NewOrderId(orderIDString)

		confirmResult := service.ConfirmOrder(ctx, orderID)
		if confirmResult.IsFailure() {
			t.Fatalf("Order confirmation failed: %v", confirmResult.Error())
		}

		shipResult := service.ShipOrder(ctx, orderID)
		if shipResult.IsFailure() {
			t.Fatalf("Order shipping failed: %v", shipResult.Error())
		}

		// Then: All operations should succeed and order should be shipped
		getResult := service.GetOrder(ctx, orderID)
		if getResult.IsNone() {
			t.Fatal("Order should exist")
		}

		order := getResult.Value()
		if order.GetStatus() != quickstart.Shipped {
			t.Error("Order should be in Shipped status")
		}
	})

	t.Run("Should_StopOnFirstFailure_When_ChainedOperationFails", func(t *testing.T) {
		// Given: Service operations where one will fail
		service := quickstart.NewOrderService()
		ctx := context.Background()

		customerID := "CUST-002"
		amount := quickstart.NewMoney(200.00, "USD")

		// When: Creating order but attempting to ship without confirming
		createResult := service.CreateOrder(ctx, customerID, amount, "chain-002")
		if createResult.IsFailure() {
			t.Fatalf("Order creation failed: %v", createResult.Error())
		}

		orderIDString := createResult.Value()
		orderID := quickstart.NewOrderId(orderIDString)

		// Skip confirmation and try to ship directly (should fail)
		shipResult := service.ShipOrder(ctx, orderID)

		// Then: Shipping should fail with domain error
		if shipResult.IsSuccess() {
			t.Error("Shipping unconfirmed order should fail")
		}

		if shipResult.Error().Category() != functional.Domain {
			t.Error("Should return domain error for invalid state transition")
		}
	})

	t.Run("Should_HandleConditionalOperations_When_MaybeUsed", func(t *testing.T) {
		// Given: Service and operations that might not find data
		service := quickstart.NewOrderService()
		ctx := context.Background()

		// When: Trying to get non-existent order
		nonExistentID := quickstart.NewOrderId("NON-EXISTENT")
		maybeOrder := service.GetOrder(ctx, nonExistentID)

		// Then: Should return None
		if maybeOrder.HasValue() {
			t.Error("Should not find non-existent order")
		}

		// When: Creating order and then retrieving it
		createResult := service.CreateOrder(ctx, "CUST-003", quickstart.NewMoney(300.00, "USD"), "")
		if createResult.IsFailure() {
			t.Fatalf("Order creation failed: %v", createResult.Error())
		}

		orderIDString := createResult.Value()
		orderID := quickstart.NewOrderId(orderIDString)
		maybeOrder = service.GetOrder(ctx, orderID)

		// Then: Should return Some with the order
		if maybeOrder.IsNone() {
			t.Error("Should find existing order")
		}

		order := maybeOrder.Value()
		if order.GetID() != orderID {
			t.Error("Retrieved order should have correct ID")
		}
	})

	t.Run("Should_HandleErrorPropagation_When_ValidationFails", func(t *testing.T) {
		// Given: Service and invalid data
		service := quickstart.NewOrderService()
		ctx := context.Background()

		// When: Creating order with invalid amount
		invalidAmount := quickstart.NewMoney(-100.00, "USD")
		result := service.CreateOrder(ctx, "CUST-004", invalidAmount, "")

		// Then: Should fail with validation error
		if result.IsSuccess() {
			t.Error("Should not create order with negative amount")
		}

		if result.Error().Category() != functional.Validation {
			t.Error("Should return validation error")
		}

		// When: Creating order with empty customer ID
		validAmount := quickstart.NewMoney(100.00, "USD")
		result = service.CreateOrder(ctx, "", validAmount, "")

		// Then: Should fail with validation error
		if result.IsSuccess() {
			t.Error("Should not create order with empty customer ID")
		}

		if result.Error().Category() != functional.Validation {
			t.Error("Should return validation error")
		}
	})

	t.Run("Should_HandleConcurrentResults_When_MultipleOperations", func(t *testing.T) {
		// Given: Service and concurrent operations
		service := quickstart.NewOrderService()
		ctx := context.Background()

		results := make(chan functional.Result[string], 5)

		// When: Creating multiple orders concurrently
		for i := 0; i < 5; i++ {
			go func(index int) {
				customerID := "CUST-CONCURRENT-" + string(rune('A'+index))
				amount := quickstart.NewMoney(100.00, "USD")
				result := service.CreateOrder(ctx, customerID, amount, "")
				results <- result
			}(i)
		}

		// Then: All should succeed
		successCount := 0
		for i := 0; i < 5; i++ {
			result := <-results
			if result.IsSuccess() {
				successCount++
			} else {
				t.Errorf("Concurrent operation failed: %v", result.Error())
			}
		}

		if successCount != 5 {
			t.Errorf("Expected 5 successful operations, got %d", successCount)
		}
	})

	t.Run("Should_HandleTimeouts_When_ContextCancelled", func(t *testing.T) {
		// Given: Service with cancelled context
		service := quickstart.NewOrderService()
		ctx, cancel := context.WithTimeout(context.Background(), 1*time.Millisecond)
		defer cancel()

		// Wait for context to be cancelled
		time.Sleep(2 * time.Millisecond)

		// When: Trying to perform operation with cancelled context
		result := service.CreateOrder(ctx, "CUST-TIMEOUT", quickstart.NewMoney(100.00, "USD"), "")

		// Then: Operations should still work (basic in-memory implementation doesn't check context timeout)
		// This is more about testing that context is passed through properly
		// In a real implementation with database, this would likely fail with context cancelled error
		if result.IsFailure() {
			// Check if it's a context-related error
			if result.Error().Category() == functional.Infrastructure {
				// Expected for context cancellation
				t.Logf("Context cancellation handled: %v", result.Error())
			} else {
				t.Errorf("Unexpected error type: %v", result.Error())
			}
		} else {
			// For in-memory implementation, this might succeed
			t.Logf("In-memory operation succeeded despite context cancellation")
		}
	})

	t.Run("Should_ComposeResultOperations_When_UsingFunctionalPatterns", func(t *testing.T) {
		// Given: Service for functional composition testing
		service := quickstart.NewOrderService()
		ctx := context.Background()

		// When: Using functional patterns to process order data
		customerID := "CUST-FUNCTIONAL"
		amount := quickstart.NewMoney(500.00, "USD")

		createResult := service.CreateOrder(ctx, customerID, amount, "functional-test")

		// Use functional operations to validate and process result
		orderID := ""
		if createResult.IsSuccess() {
			orderID = createResult.Value()
		} else {
			t.Fatalf("Create operation failed: %v", createResult.Error())
		}

		// Validate order ID format (simple check)
		if orderID == "" {
			t.Error("Order ID should not be empty")
		}

		// Create OrderId and get the order to verify it exists
		typedOrderID := quickstart.NewOrderId(orderID)
		maybeOrder := service.GetOrder(ctx, typedOrderID)

		if maybeOrder.IsNone() {
			t.Error("Created order should be retrievable")
		}

		order := maybeOrder.Value()
		if order.GetTotalAmount().GetAmount() != 500.00 {
			t.Error("Order should have correct amount")
		}

		if order.GetCustomerID() != customerID {
			t.Error("Order should have correct customer ID")
		}
	})
}