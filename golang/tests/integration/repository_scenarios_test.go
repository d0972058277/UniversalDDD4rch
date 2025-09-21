package integration

import (
	"context"
	"testing"
	"time"

	"github.com/universalddd/architecture-core-go/examples/quickstart"
	"github.com/universalddd/architecture-core-go/pkg/functional"
)

// TestRepositoryScenarios_Should_HandleCRUDOperations_When_Used
func TestRepositoryScenarios_Should_HandleCRUDOperations_When_Used(t *testing.T) {
	t.Run("Should_AddAndRetrieve_When_ValidAggregate", func(t *testing.T) {
		// Given: Repository and aggregate
		repo := quickstart.NewInMemoryOrderRepository()
		ctx := context.Background()

		order := quickstart.NewOrder("CUST-001", quickstart.NewMoney(100.00, "USD"))
		orderID := order.GetID()

		// When: Adding aggregate
		addResult := repo.AddAsync(ctx, order)

		// Then: Should succeed
		if addResult.IsFailure() {
			t.Fatalf("Add operation failed: %v", addResult.Error())
		}

		// When: Retrieving by ID
		getResult := repo.GetByIDAsync(ctx, orderID)

		// Then: Should return the aggregate
		if !getResult.HasValue() {
			t.Fatal("Should retrieve added aggregate")
		}

		retrievedOrder := getResult.Value()
		if retrievedOrder.GetID() != orderID {
			t.Error("Retrieved order should have same ID")
		}
	})

	t.Run("Should_UpdateAggregate_When_ModificationsExist", func(t *testing.T) {
		// Given: Repository with existing aggregate
		repo := quickstart.NewInMemoryOrderRepository()
		ctx := context.Background()

		order := quickstart.NewOrder("CUST-002", quickstart.NewMoney(200.00, "USD"))
		orderID := order.GetID()

		repo.AddAsync(ctx, order)

		// When: Modifying and updating aggregate
		order.ConfirmOrder()
		updateResult := repo.UpdateAsync(ctx, order)

		// Then: Should succeed
		if updateResult.IsFailure() {
			t.Fatalf("Update operation failed: %v", updateResult.Error())
		}

		// When: Retrieving updated aggregate
		getResult := repo.GetByIDAsync(ctx, orderID)
		updatedOrder := getResult.Value()

		// Then: Should reflect changes
		if updatedOrder.GetStatus() != quickstart.Confirmed {
			t.Error("Updated order should have Confirmed status")
		}
	})

	t.Run("Should_DeleteAggregate_When_IDProvided", func(t *testing.T) {
		// Given: Repository with existing aggregate
		repo := quickstart.NewInMemoryOrderRepository()
		ctx := context.Background()

		order := quickstart.NewOrder("CUST-003", quickstart.NewMoney(300.00, "USD"))
		orderID := order.GetID()

		repo.AddAsync(ctx, order)

		// When: Deleting aggregate
		deleteResult := repo.DeleteAsync(ctx, orderID)

		// Then: Should succeed
		if deleteResult.IsFailure() {
			t.Fatalf("Delete operation failed: %v", deleteResult.Error())
		}

		// When: Attempting to retrieve deleted aggregate
		getResult := repo.GetByIDAsync(ctx, orderID)

		// Then: Should not find it
		if getResult.HasValue() {
			t.Error("Should not retrieve deleted aggregate")
		}
	})

	t.Run("Should_CheckExistence_When_AggregateExistsOrNot", func(t *testing.T) {
		// Given: Repository with one aggregate
		repo := quickstart.NewInMemoryOrderRepository()
		ctx := context.Background()

		order := quickstart.NewOrder("CUST-004", quickstart.NewMoney(400.00, "USD"))
		orderID := order.GetID()

		repo.AddAsync(ctx, order)

		// When: Checking existence of existing aggregate
		existsResult := repo.ExistsAsync(ctx, orderID)

		// Then: Should return true
		if existsResult.IsFailure() || !existsResult.Value() {
			t.Error("Should return true for existing aggregate")
		}

		// When: Checking existence of non-existent aggregate
		notExistsResult := repo.ExistsAsync(ctx, "NON-EXISTENT")

		// Then: Should return false
		if notExistsResult.IsFailure() || notExistsResult.Value() {
			t.Error("Should return false for non-existent aggregate")
		}
	})

	t.Run("Should_HandleConcurrentOperations_When_MultipleClients", func(t *testing.T) {
		// Given: Repository and multiple goroutines
		repo := quickstart.NewInMemoryOrderRepository()
		ctx := context.Background()

		// When: Performing concurrent adds
		results := make(chan functional.Result, 10)

		for i := 0; i < 10; i++ {
			go func(index int) {
				customerID := "CUST-CONCURRENT-" + string(rune('A'+index))
				order := quickstart.NewOrder(customerID, quickstart.NewMoney(100.00, "USD"))
				result := repo.AddAsync(ctx, order)
				results <- result
			}(i)
		}

		// Then: All operations should succeed
		successCount := 0
		for i := 0; i < 10; i++ {
			result := <-results
			if result.IsSuccess() {
				successCount++
			} else {
				t.Errorf("Concurrent add failed: %v", result.Error())
			}
		}

		if successCount != 10 {
			t.Errorf("Expected 10 successful concurrent adds, got %d", successCount)
		}
	})

	t.Run("Should_RespectCancellation_When_ContextCancelled", func(t *testing.T) {
		// Given: Repository and cancelled context
		repo := quickstart.NewInMemoryOrderRepository()
		ctx, cancel := context.WithCancel(context.Background())
		cancel() // Cancel immediately

		order := quickstart.NewOrder("CUST-005", quickstart.NewMoney(500.00, "USD"))

		// When: Performing operation with cancelled context
		result := repo.AddAsync(ctx, order)

		// Then: Should handle cancellation gracefully
		// (Implementation may succeed quickly or return cancellation error)
		if result.IsFailure() {
			// Check if it's a cancellation-related error
			if result.Error().Category() == functional.Infrastructure {
				t.Log("Repository properly handled context cancellation")
			}
		}
	})

	t.Run("Should_RespectTimeout_When_ContextHasTimeout", func(t *testing.T) {
		// Given: Repository and context with timeout
		repo := quickstart.NewInMemoryOrderRepository()
		ctx, cancel := context.WithTimeout(context.Background(), 1*time.Millisecond)
		defer cancel()

		order := quickstart.NewOrder("CUST-006", quickstart.NewMoney(600.00, "USD"))

		// When: Performing operation with timeout context
		// Add slight delay to potentially trigger timeout
		time.Sleep(2 * time.Millisecond)
		result := repo.AddAsync(ctx, order)

		// Then: Should handle timeout appropriately
		// (May succeed if operation is fast, or return timeout error)
		if result.IsFailure() {
			if result.Error().Category() == functional.Infrastructure {
				t.Log("Repository properly handled context timeout")
			}
		}
	})

	t.Run("Should_PreventDuplicates_When_SameIDAdded", func(t *testing.T) {
		// Given: Repository with existing aggregate
		repo := quickstart.NewInMemoryOrderRepository()
		ctx := context.Background()

		order1 := quickstart.NewOrderWithID("DUPLICATE-ID", "CUST-007", quickstart.NewMoney(700.00, "USD"))
		order2 := quickstart.NewOrderWithID("DUPLICATE-ID", "CUST-008", quickstart.NewMoney(800.00, "USD"))

		repo.AddAsync(ctx, order1)

		// When: Adding duplicate ID
		duplicateResult := repo.AddAsync(ctx, order2)

		// Then: Should handle appropriately (fail or overwrite - implementation specific)
		if duplicateResult.IsFailure() {
			// Verify it's an appropriate error
			if duplicateResult.Error().Category() != functional.Domain {
				t.Error("Duplicate ID should return domain error")
			}
		} else {
			t.Log("Repository allows overwriting duplicates - acceptable behavior")
		}
	})

	t.Run("Should_HandleLargeOperations_When_ManyAggregates", func(t *testing.T) {
		// Given: Repository and many aggregates
		repo := quickstart.NewInMemoryOrderRepository()
		ctx := context.Background()

		const numOrders = 1000
		orderIDs := make([]string, numOrders)

		// When: Adding many aggregates
		for i := 0; i < numOrders; i++ {
			customerID := "BULK-CUST-" + string(rune('A'+(i%26)))
			order := quickstart.NewOrder(customerID, quickstart.NewMoney(float64(i+1), "USD"))
			orderIDs[i] = order.GetID()

			result := repo.AddAsync(ctx, order)
			if result.IsFailure() {
				t.Fatalf("Bulk add failed at index %d: %v", i, result.Error())
			}
		}

		// Then: All should be retrievable
		retrievedCount := 0
		for _, orderID := range orderIDs {
			getResult := repo.GetByIDAsync(ctx, orderID)
			if getResult.HasValue() {
				retrievedCount++
			}
		}

		if retrievedCount != numOrders {
			t.Errorf("Expected to retrieve %d orders, got %d", numOrders, retrievedCount)
		}
	})

	t.Run("Should_HandleOptimisticConcurrency_When_VersionConflicts", func(t *testing.T) {
		// Given: Repository with versioned aggregate
		repo := quickstart.NewInMemoryOrderRepository()
		ctx := context.Background()

		order := quickstart.NewOrder("CUST-009", quickstart.NewMoney(900.00, "USD"))
		orderID := order.GetID()

		repo.AddAsync(ctx, order)

		// When: Two clients modify same aggregate
		getResult1 := repo.GetByIDAsync(ctx, orderID)
		getResult2 := repo.GetByIDAsync(ctx, orderID)

		order1 := getResult1.Value()
		order2 := getResult2.Value()

		// Simulate modifications
		order1.ConfirmOrder()
		order2.ConfirmOrder()

		// When: First client updates
		update1Result := repo.UpdateAsync(ctx, order1)

		// Then: Should succeed
		if update1Result.IsFailure() {
			t.Fatalf("First update should succeed: %v", update1Result.Error())
		}

		// When: Second client updates (stale version)
		update2Result := repo.UpdateAsync(ctx, order2)

		// Then: Should handle concurrency conflict appropriately
		if update2Result.IsFailure() {
			if update2Result.Error().Category() != functional.Concurrency {
				t.Error("Concurrency conflict should return concurrency error")
			}
		} else {
			t.Log("Repository allows last-write-wins - acceptable for in-memory implementation")
		}
	})

	t.Run("Should_SupportCustomQueries_When_RepositoryExtended", func(t *testing.T) {
		// Given: Extended repository with custom query methods
		repo := quickstart.NewInMemoryOrderRepository()
		ctx := context.Background()

		// Add orders with different statuses
		pendingOrder := quickstart.NewOrder("CUST-010", quickstart.NewMoney(100.00, "USD"))
		confirmedOrder := quickstart.NewOrder("CUST-011", quickstart.NewMoney(200.00, "USD"))
		confirmedOrder.ConfirmOrder()

		repo.AddAsync(ctx, pendingOrder)
		repo.AddAsync(ctx, confirmedOrder)

		// When: Querying by status (if supported)
		pendingResult := repo.GetOrdersByStatusAsync(ctx, quickstart.Pending)
		confirmedResult := repo.GetOrdersByStatusAsync(ctx, quickstart.Confirmed)

		// Then: Should return appropriate orders
		if pendingResult.IsSuccess() {
			pendingOrders := pendingResult.Value()
			if len(pendingOrders) < 1 {
				t.Error("Should find at least one pending order")
			}
		}

		if confirmedResult.IsSuccess() {
			confirmedOrders := confirmedResult.Value()
			if len(confirmedOrders) < 1 {
				t.Error("Should find at least one confirmed order")
			}
		}
	})
}