package integration

import (
	"context"
	"testing"

	"github.com/universalddd/architecture-core/examples"
	"github.com/universalddd/architecture-core/functional"
)

// TestOrderWorkflow_Should_HandleFullLifecycle_When_ValidOperations
func TestOrderWorkflow_Should_HandleFullLifecycle_When_ValidOperations(t *testing.T) {
	t.Run("Should_CreateConfirmShipOrder_When_ValidWorkflow", func(t *testing.T) {
		// Given: Order service and valid order data
		service := examples.NewOrderService()
		ctx := context.Background()

		customerID := "CUST-001"
		amount := examples.NewMoney(150.75, "USD")
		correlationID := "workflow-001"

		// When: Creating order
		createResult := service.CreateOrder(ctx, customerID, amount, correlationID)

		// Then: Order should be created successfully
		if createResult.IsFailure() {
			t.Fatalf("Order creation failed: %v", createResult.Error())
		}

		orderIDString := createResult.Value()
		orderID := examples.NewOrderId(orderIDString)

		// When: Confirming order
		confirmResult := service.ConfirmOrder(ctx, orderID)

		// Then: Order should be confirmed successfully
		if confirmResult.IsFailure() {
			t.Fatalf("Order confirmation failed: %v", confirmResult.Error())
		}

		// When: Shipping order
		shipResult := service.ShipOrder(ctx, orderID)

		// Then: Order should be shipped successfully
		if shipResult.IsFailure() {
			t.Fatalf("Order shipping failed: %v", shipResult.Error())
		}

		// When: Getting final order state
		getResult := service.GetOrder(ctx, orderID)

		// Then: Order should be in shipped state
		if getResult.IsNone() {
			t.Fatal("Order should exist")
		}

		order := getResult.Value()
		if order.GetStatus() != examples.Shipped {
			t.Errorf("Expected order status Shipped, got %v", order.GetStatus())
		}
	})

	t.Run("Should_PreventInvalidTransitions_When_WrongOrderStatus", func(t *testing.T) {
		// Given: Order service and created order
		service := examples.NewOrderService()
		ctx := context.Background()

		customerID := "CUST-002"
		amount := examples.NewMoney(100.00, "USD")

		createResult := service.CreateOrder(ctx, customerID, amount, "")
		if createResult.IsFailure() {
			t.Fatalf("Setup failed: %v", createResult.Error())
		}
		orderIDString := createResult.Value()
		orderID := examples.NewOrderId(orderIDString)

		// When: Attempting to ship without confirming
		shipResult := service.ShipOrder(ctx, orderID)

		// Then: Should fail with domain error
		if shipResult.IsSuccess() {
			t.Error("Should not be able to ship unconfirmed order")
		}
		if shipResult.Error().Category() != functional.Domain {
			t.Error("Should return domain error for invalid state transition")
		}
	})

	t.Run("Should_HandleCancellation_When_ValidState", func(t *testing.T) {
		// Given: Confirmed order
		service := examples.NewOrderService()
		ctx := context.Background()

		customerID := "CUST-003"
		amount := examples.NewMoney(200.00, "USD")

		createResult := service.CreateOrder(ctx, customerID, amount, "")
		orderIDString := createResult.Value()
		orderID := examples.NewOrderId(orderIDString)
		service.ConfirmOrder(ctx, orderID)

		// When: Cancelling order
		cancelResult := service.CancelOrder(ctx, orderID)

		// Then: Should succeed
		if cancelResult.IsFailure() {
			t.Errorf("Order cancellation failed: %v", cancelResult.Error())
		}

		// And order should be cancelled
		getResult := service.GetOrder(ctx, orderID)
		if getResult.IsNone() {
			t.Fatal("Order should exist")
		}
		order := getResult.Value()
		if order.GetStatus() != examples.Cancelled {
			t.Errorf("Expected order status Cancelled, got %v", order.GetStatus())
		}
	})

	t.Run("Should_PreventCancellation_When_AlreadyShipped", func(t *testing.T) {
		// Given: Shipped order
		service := examples.NewOrderService()
		ctx := context.Background()

		customerID := "CUST-004"
		amount := examples.NewMoney(300.00, "USD")

		createResult := service.CreateOrder(ctx, customerID, amount, "")
		orderIDString := createResult.Value()
		orderID := examples.NewOrderId(orderIDString)
		service.ConfirmOrder(ctx, orderID)
		service.ShipOrder(ctx, orderID)

		// When: Attempting to cancel shipped order
		cancelResult := service.CancelOrder(ctx, orderID)

		// Then: Should fail with domain error
		if cancelResult.IsSuccess() {
			t.Error("Should not be able to cancel shipped order")
		}
		if cancelResult.Error().Category() != functional.Domain {
			t.Error("Should return domain error for invalid cancellation")
		}
	})

	t.Run("Should_CollectDomainEvents_When_StateChanges", func(t *testing.T) {
		// Given: Order service
		service := examples.NewOrderService()
		ctx := context.Background()

		customerID := "CUST-005"
		amount := examples.NewMoney(400.00, "USD")

		// When: Executing full workflow
		createResult := service.CreateOrder(ctx, customerID, amount, "correlation-123")
		orderIDString := createResult.Value()
		orderID := examples.NewOrderId(orderIDString)

		// Get order and check events after creation
		getResult := service.GetOrder(ctx, orderID)
		if getResult.IsNone() {
			t.Fatal("Order should exist")
		}
		order := getResult.Value()
		events := order.GetEvents()

		if len(events) != 1 {
			t.Errorf("Expected 1 event after creation, got %d", len(events))
		}

		// Confirm order and check additional events
		service.ConfirmOrder(ctx, orderID)
		getResult = service.GetOrder(ctx, orderID)
		if getResult.IsNone() {
			t.Fatal("Order should exist")
		}
		order = getResult.Value()
		events = order.GetEvents()

		if len(events) != 2 {
			t.Errorf("Expected 2 events after confirmation, got %d", len(events))
		}

		// Ship order and check final events
		service.ShipOrder(ctx, orderID)
		getResult = service.GetOrder(ctx, orderID)
		if getResult.IsNone() {
			t.Fatal("Order should exist")
		}
		order = getResult.Value()
		events = order.GetEvents()

		if len(events) != 3 {
			t.Errorf("Expected 3 events after shipping, got %d", len(events))
		}
	})

	t.Run("Should_HandleConcurrentOperations_When_MultipleRequests", func(t *testing.T) {
		// Given: Order service and multiple goroutines
		service := examples.NewOrderService()
		ctx := context.Background()

		// When: Creating multiple orders concurrently
		results := make(chan functional.Result[string], 5)

		for i := 0; i < 5; i++ {
			go func(index int) {
				customerID := "CUST-CONCURRENT-" + string(rune('A'+index))
				amount := examples.NewMoney(100.00, "USD")
				result := service.CreateOrder(ctx, customerID, amount, "")
				results <- result
			}(i)
		}

		// Then: All operations should succeed
		successCount := 0
		for i := 0; i < 5; i++ {
			result := <-results
			if result.IsSuccess() {
				successCount++
			} else {
				t.Errorf("Concurrent order creation failed: %v", result.Error())
			}
		}

		if successCount != 5 {
			t.Errorf("Expected 5 successful concurrent operations, got %d", successCount)
		}
	})

	t.Run("Should_ValidateBusinessRules_When_InvalidData", func(t *testing.T) {
		// Given: Order service
		service := examples.NewOrderService()
		ctx := context.Background()

		// When: Creating order with invalid amount
		invalidAmount := examples.NewMoney(-100.00, "USD")
		result := service.CreateOrder(ctx, "CUST-006", invalidAmount, "")

		// Then: Should fail with validation error
		if result.IsSuccess() {
			t.Error("Should not create order with negative amount")
		}
		if result.Error().Category() != functional.Validation {
			t.Error("Should return validation error for invalid amount")
		}

		// When: Creating order with empty customer ID
		validAmount := examples.NewMoney(100.00, "USD")
		result = service.CreateOrder(ctx, "", validAmount, "")

		// Then: Should fail with validation error
		if result.IsSuccess() {
			t.Error("Should not create order with empty customer ID")
		}
		if result.Error().Category() != functional.Validation {
			t.Error("Should return validation error for empty customer ID")
		}
	})
}