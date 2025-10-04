package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/universalddd/architecture-core-go/examples/quickstart"
	"github.com/universalddd/architecture-core/functional"
)

func main() {
	fmt.Println("=== Architecture.Core Go Quickstart Demo ===")
	fmt.Println()

	// Create the order service
	service := quickstart.NewOrderService()
	ctx := context.Background()

	// Example 1: Value Objects
	fmt.Println("=== Value Objects Example ===")
	demonstrateValueObjects()
	fmt.Println()

	// Example 2: Basic Order Workflow
	fmt.Println("=== Basic Order Workflow ===")
	demonstrateBasicWorkflow(ctx, service)
	fmt.Println()

	// Example 3: Error Handling with Result
	fmt.Println("=== Error Handling with Result ===")
	demonstrateErrorHandling(ctx, service)
	fmt.Println()

	// Example 4: Maybe Type Usage
	fmt.Println("=== Maybe Type Usage ===")
	demonstrateMaybeUsage(ctx, service)
	fmt.Println()

	// Example 5: Operation Chaining
	fmt.Println("=== Operation Chaining ===")
	demonstrateOperationChaining(ctx, service)
	fmt.Println()

	// Example 6: Domain Events
	fmt.Println("=== Domain Events ===")
	demonstrateDomainEvents(ctx, service)
	fmt.Println()

	// Example 7: Advanced Scenarios
	fmt.Println("=== Advanced Scenarios ===")
	demonstrateAdvancedScenarios(ctx, service)

	fmt.Println()
	fmt.Println("=== Demo Complete ===")
}

func demonstrateValueObjects() {
	// Money value objects
	money1 := quickstart.NewMoney(100.50, "USD")
	money2 := quickstart.NewMoney(100.50, "USD")
	money3 := quickstart.NewMoney(100.50, "EUR")

	fmt.Printf("money1: %s\n", money1)
	fmt.Printf("money2: %s\n", money2)
	fmt.Printf("money3: %s\n", money3)

	fmt.Printf("money1 == money2: %t\n", money1.Equals(money2))
	fmt.Printf("money1 == money3: %t\n", money1.Equals(money3))

	// Money arithmetic
	sum := money1.Add(money2)
	fmt.Printf("money1 + money2 = %s\n", sum)

	// Address value object
	address1 := quickstart.NewAddress("123 Main St", "Anytown", "12345", "USA")
	address2 := quickstart.NewAddress("123 Main St", "Anytown", "12345", "USA")
	fmt.Printf("address1 == address2: %t\n", address1.Equals(address2))
}

func demonstrateBasicWorkflow(ctx context.Context, service *quickstart.OrderService) {
	customerID := "CUST-001"
	amount := quickstart.NewMoney(150.75, "USD")
	correlationID := "demo-workflow-001"

	// Create order
	fmt.Println("Creating order...")
	createResult := service.CreateOrder(ctx, customerID, amount, correlationID)
	if createResult.IsFailure() {
		log.Printf("Failed to create order: %v", createResult.Error())
		return
	}

	orderID := createResult.Value()
	fmt.Printf("Order created with ID: %s\n", orderID)

	// Get order
	maybeOrder := service.GetOrder(ctx, quickstart.NewOrderId(orderID))
	if maybeOrder.HasValue() {
		order := maybeOrder.Value()
		fmt.Printf("Order status: %s\n", order.GetStatus())
		fmt.Printf("Order amount: %s\n", order.GetTotalAmount())
	}

	// Confirm order
	fmt.Println("Confirming order...")
	confirmResult := service.ConfirmOrder(ctx, quickstart.NewOrderId(orderID))
	if confirmResult.IsSuccess() {
		fmt.Println("Order confirmed successfully")
	} else {
		fmt.Printf("Failed to confirm order: %v\n", confirmResult.Error())
	}

	// Ship order
	fmt.Println("Shipping order...")
	shipResult := service.ShipOrder(ctx, quickstart.NewOrderId(orderID))
	if shipResult.IsSuccess() {
		fmt.Println("Order shipped successfully")
	} else {
		fmt.Printf("Failed to ship order: %v\n", shipResult.Error())
	}

	// Check final status
	finalOrder := service.GetOrder(ctx, quickstart.NewOrderId(orderID))
	if finalOrder.HasValue() {
		fmt.Printf("Final order status: %s\n", finalOrder.Value().GetStatus())
	}
}

func demonstrateErrorHandling(ctx context.Context, service *quickstart.OrderService) {
	// Try to create order with invalid data
	fmt.Println("Attempting to create order with negative amount...")
	invalidAmount := quickstart.NewMoney(-100.00, "USD")
	result := service.CreateOrder(ctx, "CUST-002", invalidAmount, "")

	result.Match(
		func(orderID string) interface{} {
			fmt.Printf("Order created: %s (unexpected!)\n", orderID)
			return nil
		},
		func(err *functional.Error) interface{} {
			fmt.Printf("Creation failed as expected: [%s] %s\n", err.Category(), err.Message())
			return nil
		},
	)

	// Try to create order with empty customer ID
	fmt.Println("Attempting to create order with empty customer ID...")
	validAmount := quickstart.NewMoney(100.00, "USD")
	result2 := service.CreateOrder(ctx, "", validAmount, "")

	if result2.IsFailure() {
		fmt.Printf("Creation failed as expected: %s\n", result2.Error().Message())
	}

	// Try invalid state transition
	fmt.Println("Creating valid order and trying invalid transition...")
	createResult := service.CreateOrder(ctx, "CUST-003", validAmount, "")
	if createResult.IsSuccess() {
		orderID := createResult.Value()

		// Try to ship without confirming
		shipResult := service.ShipOrder(ctx, quickstart.NewOrderId(orderID))
		if shipResult.IsFailure() {
			fmt.Printf("Ship failed as expected: %s\n", shipResult.Error().Message())
		}
	}
}

func demonstrateMaybeUsage(ctx context.Context, service *quickstart.OrderService) {
	// Try to get non-existent order
	fmt.Println("Looking for non-existent order...")
	maybeOrder := service.GetOrder(ctx, quickstart.NewOrderId("NON-EXISTENT"))

	result := maybeOrder.
		Map(func(o *quickstart.Order) interface{} {
			return fmt.Sprintf("Found order: %s", o.ID())
		}).
		ValueOr("Order not found")

	fmt.Println(result)

	// Create order and demonstrate Maybe operations
	fmt.Println("Creating order and using Maybe operations...")
	createResult := service.CreateOrder(ctx, "CUST-004", quickstart.NewMoney(200.00, "USD"), "")
	if createResult.IsSuccess() {
		orderID := createResult.Value()

		maybeOrder := service.GetOrder(ctx, quickstart.NewOrderId(orderID))

		// Chain Maybe operations
		summary := maybeOrder.
			Map(func(o *quickstart.Order) interface{} {
				return fmt.Sprintf("Order %s: %s (%s)", o.ID(), o.GetTotalAmount(), o.GetStatus())
			}).
			ValueOr("No order information available")

		fmt.Println(summary)

		// Convert Maybe to Result
		errorWhenNone := functional.DomainError("ORDER_NOT_FOUND", "Order not found")
		orderResult := maybeOrder.ToResultWithError(errorWhenNone)

		if orderResult.IsSuccess() {
			fmt.Printf("Order retrieved via Result: %s\n", orderResult.Value().ID())
		}
	}
}

func demonstrateOperationChaining(ctx context.Context, service *quickstart.OrderService) {
	customerID := "CUST-005"
	amount := quickstart.NewMoney(300.00, "USD")

	fmt.Println("Demonstrating operation chaining...")

	// Chain operations using Result.Bind
	result := functional.Bind(service.CreateOrder(ctx, customerID, amount, "chain-demo"),
		func(orderID string) functional.Result[string] {
			fmt.Printf("Created order %s, now confirming...\n", orderID)
			confirmResult := service.ConfirmOrder(ctx, quickstart.NewOrderId(orderID))
			return functional.Map(confirmResult, func(interface{}) string { return orderID })
		})

	functional.Match(result,
		func(orderID string) interface{} {
			fmt.Printf("Successfully completed workflow for order: %s\n", orderID)
			return nil
		},
		func(err *functional.Error) interface{} {
			fmt.Printf("Workflow failed: %s\n", err.Message())
			return nil
		},
	)

	// Demonstrate recovery pattern
	fmt.Println("Demonstrating recovery pattern...")

	recoveryResult := service.CreateOrder(ctx, "CUST-006", quickstart.NewMoney(400.00, "USD"), "").
		Bind(func(orderID string) functional.Result[any] {
			// Try to ship directly (will fail)
			orderIdValue := quickstart.NewOrderId(orderID)
			shipResult := service.ShipOrder(ctx, orderIdValue)

			if shipResult.IsSuccess() {
				return functional.Ok[any](orderID)
			} else {
				// Recovery: confirm first, then ship
				fmt.Println("Direct shipping failed, trying recovery pattern...")
				orderIdValue := quickstart.NewOrderId(orderID)
				confirmResult := service.ConfirmOrder(ctx, orderIdValue)
				if confirmResult.IsFailure() {
					return functional.Fail[any](confirmResult.Error())
				}

				shipResult := service.ShipOrder(ctx, orderIdValue)
				if shipResult.IsSuccess() {
					return functional.Ok[any](orderID)
				} else {
					return functional.Fail[any](shipResult.Error())
				}
			}
		})

	if recoveryResult.IsSuccess() {
		fmt.Printf("Recovery successful for order: %s\n", recoveryResult.Value())
	}
}

func demonstrateDomainEvents(ctx context.Context, service *quickstart.OrderService) {
	customerID := "CUST-007"
	amount := quickstart.NewMoney(500.00, "USD")

	fmt.Println("Creating order and tracking events...")

	createResult := service.CreateOrder(ctx, customerID, amount, "events-demo")
	if createResult.IsFailure() {
		return
	}

	orderID := createResult.Value()

	// Check events after creation
	orderIdValue := quickstart.NewOrderId(orderID)
	eventsResult := service.GetOrderEvents(ctx, orderIdValue)
	if eventsResult.IsSuccess() {
		events := eventsResult.Value()
		fmt.Printf("Events after creation: %d\n", len(events))
		for i, event := range events {
			fmt.Printf("  Event %d: %s at %s\n", i+1, event.EventType(), event.OccurredAt().Format(time.RFC3339))
		}
	}

	// Confirm order and check events
	service.ConfirmOrder(ctx, orderIdValue)
	eventsResult = service.GetOrderEvents(ctx, orderIdValue)
	if eventsResult.IsSuccess() {
		events := eventsResult.Value()
		fmt.Printf("Events after confirmation: %d\n", len(events))
	}

	// Ship order and check events
	service.ShipOrder(ctx, orderIdValue)
	eventsResult = service.GetOrderEvents(ctx, orderIdValue)
	if eventsResult.IsSuccess() {
		events := eventsResult.Value()
		fmt.Printf("Events after shipping: %d\n", len(events))
	}

	// Clear events
	fmt.Println("Clearing events...")
	service.ClearOrderEvents(ctx, orderIdValue)
	eventsResult = service.GetOrderEvents(ctx, orderIdValue)
	if eventsResult.IsSuccess() {
		events := eventsResult.Value()
		fmt.Printf("Events after clearing: %d\n", len(events))
	}
}

func demonstrateAdvancedScenarios(ctx context.Context, service *quickstart.OrderService) {
	// Batch operations
	fmt.Println("Creating multiple orders...")

	requests := []quickstart.CreateOrderRequest{
		{CustomerID: "CUST-BATCH-1", Amount: quickstart.NewMoney(100.00, "USD"), CorrelationID: "batch-1"},
		{CustomerID: "CUST-BATCH-2", Amount: quickstart.NewMoney(200.00, "USD"), CorrelationID: "batch-2"},
		{CustomerID: "CUST-BATCH-3", Amount: quickstart.NewMoney(300.00, "USD"), CorrelationID: "batch-3"},
	}

	batchResult := service.BatchCreateOrders(ctx, requests)
	if batchResult.IsSuccess() {
		orderIDs := batchResult.Value()
		fmt.Printf("Created %d orders in batch\n", len(orderIDs))
	}

	// Get statistics
	fmt.Println("Getting order statistics...")
	statsResult := service.GetOrderStatistics(ctx)
	if statsResult.IsSuccess() {
		stats := statsResult.Value()
		fmt.Printf("Total orders: %d\n", stats.TotalOrders)
		fmt.Printf("Pending: %d, Confirmed: %d, Shipped: %d, Delivered: %d, Cancelled: %d\n",
			stats.PendingOrders, stats.ConfirmedOrders, stats.ShippedOrders,
			stats.DeliveredOrders, stats.CancelledOrders)
	}

	// Complex workflow with timeout context
	fmt.Println("Testing with timeout context...")
	timeoutCtx, cancel := context.WithTimeout(ctx, 100*time.Millisecond)
	defer cancel()

	// Add slight delay to potentially trigger timeout
	time.Sleep(50 * time.Millisecond)

	timeoutResult := service.ProcessOrderWorkflow(timeoutCtx, "CUST-TIMEOUT", quickstart.NewMoney(600.00, "USD"), "timeout-test")
	if timeoutResult.IsFailure() {
		fmt.Printf("Workflow with timeout: %s\n", timeoutResult.Error().Message())
	} else {
		fmt.Printf("Workflow completed despite timeout: %s\n", timeoutResult.Value())
	}
}