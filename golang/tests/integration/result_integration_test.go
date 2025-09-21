package integration

import (
	"context"
	"testing"
	"time"

	"github.com/universalddd/architecture-core-go/examples/quickstart"
	"github.com/universalddd/architecture-core-go/pkg/functional"
)

// TestResultIntegration_Should_ComposeOperations_When_ChainedTogether
func TestResultIntegration_Should_ComposeOperations_When_ChainedTogether(t *testing.T) {
	t.Run("Should_ChainSuccessfulOperations_When_AllSucceed", func(t *testing.T) {
		// Given: Service operations that can succeed or fail
		service := quickstart.NewOrderService()
		ctx := context.Background()

		customerID := "CUST-001"
		amount := quickstart.NewMoney(100.00, "USD")

		// When: Chaining multiple operations using Result
		finalResult := service.CreateOrder(ctx, customerID, amount, "chain-001").
			Bind(func(orderID string) functional.Result[string] {
				return service.ConfirmOrder(ctx, orderID).Map(func() string { return orderID })
			}).
			Bind(func(orderID string) functional.Result[string] {
				return service.ShipOrder(ctx, orderID).Map(func() string { return orderID })
			})

		// Then: All operations should succeed
		if finalResult.IsFailure() {
			t.Fatalf("Chained operations failed: %v", finalResult.Error())
		}

		orderID := finalResult.Value()
		if orderID == "" {
			t.Error("Final result should contain order ID")
		}
	})

	t.Run("Should_StopOnFirstFailure_When_ChainedOperationFails", func(t *testing.T) {
		// Given: Service operations where one will fail
		service := quickstart.NewOrderService()
		ctx := context.Background()

		customerID := "CUST-002"
		amount := quickstart.NewMoney(200.00, "USD")

		// When: Chaining operations where shipping will fail (not confirmed)
		finalResult := service.CreateOrder(ctx, customerID, amount, "chain-002").
			Bind(func(orderID string) functional.Result[string] {
				// Skip confirmation and try to ship directly (should fail)
				return service.ShipOrder(ctx, orderID).Map(func() string { return orderID })
			}).
			Bind(func(orderID string) functional.Result[string] {
				t.Error("This operation should never execute due to previous failure")
				return functional.OkWith(orderID)
			})

		// Then: Should fail at the invalid operation
		if finalResult.IsSuccess() {
			t.Error("Should fail when trying to ship unconfirmed order")
		}

		if finalResult.Error().Category() != functional.Domain {
			t.Error("Should return domain error for business rule violation")
		}
	})

	t.Run("Should_ComposeWithMaybe_When_OptionalValues", func(t *testing.T) {
		// Given: Operations that return Maybe values
		service := quickstart.NewOrderService()
		ctx := context.Background()

		customerID := "CUST-003"
		amount := quickstart.NewMoney(300.00, "USD")

		// Create an order first
		createResult := service.CreateOrder(ctx, customerID, amount, "maybe-001")
		if createResult.IsFailure() {
			t.Fatalf("Setup failed: %v", createResult.Error())
		}
		orderID := createResult.Value()

		// When: Using Maybe to Result conversion
		maybeOrder := service.GetOrder(ctx, orderID)
		errorWhenNone := functional.DomainError("ORDER_NOT_FOUND", "Order not found")
		resultFromMaybe := maybeOrder.ToResult(errorWhenNone)

		// Then: Should successfully convert Maybe to Result
		if resultFromMaybe.IsFailure() {
			t.Fatalf("Maybe to Result conversion failed: %v", resultFromMaybe.Error())
		}

		order := resultFromMaybe.Value()
		if order.GetID() != orderID {
			t.Error("Converted result should contain correct order")
		}
	})

	t.Run("Should_HandleMaybeToResultConversion_When_NoValue", func(t *testing.T) {
		// Given: Operations that return Maybe with no value
		service := quickstart.NewOrderService()
		ctx := context.Background()

		// When: Getting non-existent order and converting to Result
		maybeOrder := service.GetOrder(ctx, "NON-EXISTENT")
		errorWhenNone := functional.DomainError("ORDER_NOT_FOUND", "Order not found")
		resultFromMaybe := maybeOrder.ToResult(errorWhenNone)

		// Then: Should create failure Result with provided error
		if resultFromMaybe.IsSuccess() {
			t.Error("Should create failure Result when Maybe has no value")
		}

		if resultFromMaybe.Error() != errorWhenNone {
			t.Error("Should use provided error when converting None to Result")
		}
	})

	t.Run("Should_ComposeResultAndMaybe_When_ComplexOperations", func(t *testing.T) {
		// Given: Service with mixed Result and Maybe operations
		service := quickstart.NewOrderService()
		ctx := context.Background()

		customerID := "CUST-004"
		amount := quickstart.NewMoney(400.00, "USD")

		// When: Composing Result and Maybe operations
		workflow := service.CreateOrder(ctx, customerID, amount, "compose-001").
			Bind(func(orderID string) functional.Result[quickstart.Order] {
				// Get order (returns Maybe) and convert to Result
				maybeOrder := service.GetOrder(ctx, orderID)
				notFoundError := functional.DomainError("ORDER_NOT_FOUND", "Order not found after creation")
				return maybeOrder.ToResult(notFoundError)
			}).
			Bind(func(order quickstart.Order) functional.Result[quickstart.Order] {
				// Confirm order and return updated order
				confirmResult := service.ConfirmOrder(ctx, order.GetID())
				return confirmResult.Map(func() quickstart.Order {
					// Get updated order
					updatedMaybe := service.GetOrder(ctx, order.GetID())
					notFoundError := functional.DomainError("ORDER_NOT_FOUND", "Order not found after confirmation")
					updatedResult := updatedMaybe.ToResult(notFoundError)
					if updatedResult.IsFailure() {
						panic("Order should exist after confirmation") // For test purposes
					}
					return updatedResult.Value()
				})
			})

		// Then: Should successfully compose operations
		if workflow.IsFailure() {
			t.Fatalf("Composed workflow failed: %v", workflow.Error())
		}

		finalOrder := workflow.Value()
		if finalOrder.GetStatus() != quickstart.Confirmed {
			t.Error("Final order should be confirmed")
		}
	})

	t.Run("Should_HandleAsyncOperations_When_ResultComposition", func(t *testing.T) {
		// Given: Async operations returning Results
		service := quickstart.NewOrderService()
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		customerID := "CUST-005"
		amount := quickstart.NewMoney(500.00, "USD")

		// When: Composing async operations
		asyncWorkflow := func() functional.Result[string] {
			return service.CreateOrder(ctx, customerID, amount, "async-001").
				Bind(func(orderID string) functional.Result[string] {
					// Simulate async delay
					time.Sleep(10 * time.Millisecond)
					return service.ConfirmOrder(ctx, orderID).Map(func() string { return orderID })
				}).
				Bind(func(orderID string) functional.Result[string] {
					// Another async operation
					time.Sleep(10 * time.Millisecond)
					return service.ShipOrder(ctx, orderID).Map(func() string { return orderID })
				})
		}

		result := asyncWorkflow()

		// Then: Should handle async composition correctly
		if result.IsFailure() {
			t.Fatalf("Async workflow failed: %v", result.Error())
		}

		orderID := result.Value()
		if orderID == "" {
			t.Error("Async workflow should return order ID")
		}
	})

	t.Run("Should_HandleErrorPropagation_When_EarlyFailure", func(t *testing.T) {
		// Given: Operations where first fails
		service := quickstart.NewOrderService()
		ctx := context.Background()

		// When: Starting with failing operation
		invalidAmount := quickstart.NewMoney(-100.00, "USD") // Invalid negative amount
		failureChain := service.CreateOrder(ctx, "CUST-006", invalidAmount, "error-001").
			Bind(func(orderID string) functional.Result[string] {
				t.Error("This should never execute due to creation failure")
				return service.ConfirmOrder(ctx, orderID).Map(func() string { return orderID })
			}).
			Bind(func(orderID string) functional.Result[string] {
				t.Error("This should never execute due to creation failure")
				return service.ShipOrder(ctx, orderID).Map(func() string { return orderID })
			})

		// Then: Should propagate first error without executing subsequent operations
		if failureChain.IsSuccess() {
			t.Error("Chain should fail due to invalid initial operation")
		}

		if failureChain.Error().Category() != functional.Validation {
			t.Error("Should propagate validation error from first operation")
		}
	})

	t.Run("Should_SupportRecoveryPatterns_When_ErrorHandling", func(t *testing.T) {
		// Given: Operations that might fail with recovery options
		service := quickstart.NewOrderService()
		ctx := context.Background()

		customerID := "CUST-007"
		amount := quickstart.NewMoney(700.00, "USD")

		// When: Using Match to handle errors and recover
		recoveryResult := service.CreateOrder(ctx, customerID, amount, "recovery-001").
			Bind(func(orderID string) functional.Result[string] {
				// Try to ship directly (will fail)
				shipResult := service.ShipOrder(ctx, orderID)

				// Use Match to recover from failure
				return shipResult.Match(
					func() functional.Result[string] {
						// If shipping succeeded, return order ID
						return functional.OkWith(orderID)
					},
					func(err functional.Error) functional.Result[string] {
						// If shipping failed, confirm first then ship
						confirmResult := service.ConfirmOrder(ctx, orderID)
						if confirmResult.IsFailure() {
							return functional.FailWith[string](confirmResult.Error())
						}

						shipResult := service.ShipOrder(ctx, orderID)
						return shipResult.Map(func() string { return orderID })
					},
				)
			})

		// Then: Should recover from initial failure
		if recoveryResult.IsFailure() {
			t.Fatalf("Recovery pattern failed: %v", recoveryResult.Error())
		}

		orderID := recoveryResult.Value()
		if orderID == "" {
			t.Error("Recovery should return order ID")
		}

		// Verify final state
		maybeOrder := service.GetOrder(ctx, orderID)
		if !maybeOrder.HasValue() {
			t.Error("Order should exist after recovery")
		}

		if maybeOrder.Value().GetStatus() != quickstart.Shipped {
			t.Error("Order should be shipped after recovery")
		}
	})

	t.Run("Should_ComposeWithCustomOperations_When_ExtendingFunctionality", func(t *testing.T) {
		// Given: Custom operations using Result
		validateCustomer := func(customerID string) functional.Result[string] {
			if customerID == "" {
				return functional.FailWith[string](functional.ValidationError("EMPTY_CUSTOMER", "Customer ID cannot be empty"))
			}
			if customerID == "INVALID" {
				return functional.FailWith[string](functional.DomainError("INVALID_CUSTOMER", "Customer is not valid"))
			}
			return functional.OkWith(customerID)
		}

		validateAmount := func(amount quickstart.Money) functional.Result[quickstart.Money] {
			if amount.GetAmount() <= 0 {
				return functional.FailWith[quickstart.Money](functional.ValidationError("INVALID_AMOUNT", "Amount must be positive"))
			}
			if amount.GetAmount() > 10000 {
				return functional.FailWith[quickstart.Money](functional.DomainError("AMOUNT_TOO_HIGH", "Amount exceeds limit"))
			}
			return functional.OkWith(amount)
		}

		service := quickstart.NewOrderService()
		ctx := context.Background()

		// When: Composing custom validations with service operations
		customerID := "CUST-008"
		amount := quickstart.NewMoney(800.00, "USD")

		composedOperation := validateCustomer(customerID).
			Bind(func(validCustomerID string) functional.Result[quickstart.Money] {
				return validateAmount(amount)
			}).
			Bind(func(validAmount quickstart.Money) functional.Result[string] {
				return service.CreateOrder(ctx, customerID, validAmount, "custom-001")
			}).
			Bind(func(orderID string) functional.Result[string] {
				return service.ConfirmOrder(ctx, orderID).Map(func() string { return orderID })
			})

		// Then: Should successfully compose custom and service operations
		if composedOperation.IsFailure() {
			t.Fatalf("Composed custom operation failed: %v", composedOperation.Error())
		}

		orderID := composedOperation.Value()
		if orderID == "" {
			t.Error("Composed operation should return order ID")
		}
	})
}