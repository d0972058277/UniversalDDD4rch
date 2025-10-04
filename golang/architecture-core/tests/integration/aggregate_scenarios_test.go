package integration

import (
	"testing"

	"github.com/universalddd/architecture-core/examples/quickstart"
)

// TestAggregateScenarios_Should_ManageEventsAndVersion_When_StateChanges
func TestAggregateScenarios_Should_ManageEventsAndVersion_When_StateChanges(t *testing.T) {
	t.Run("Should_IncrementVersion_When_StateModified", func(t *testing.T) {
		// Given: A new order aggregate
		order := quickstart.NewOrder("CUST-001", quickstart.NewMoney(100.00, "USD"))
		initialVersion := order.GetVersion()

		// When: Modifying aggregate state
		result := order.ConfirmOrder()

		// Then: Version should increment and operation succeed
		if result.IsFailure() {
			t.Fatalf("Confirm order failed: %v", result.Error())
		}

		newVersion := order.GetVersion()
		if newVersion != initialVersion+1 {
			t.Errorf("Expected version %d, got %d", initialVersion+1, newVersion)
		}
	})

	t.Run("Should_CollectDomainEvents_When_BusinessOperationsExecuted", func(t *testing.T) {
		// Given: A new order aggregate
		order := quickstart.NewOrder("CUST-002", quickstart.NewMoney(200.00, "USD"))

		// When: Checking initial events
		initialEvents := order.GetEvents()

		// Then: Should have creation event
		if len(initialEvents) != 1 {
			t.Errorf("Expected 1 initial event, got %d", len(initialEvents))
		}

		// When: Performing business operations
		order.ConfirmOrder()
		order.ShipOrder()

		// Then: Should collect all events
		allEvents := order.GetEvents()
		if len(allEvents) != 3 {
			t.Errorf("Expected 3 total events, got %d", len(allEvents))
		}
	})

	t.Run("Should_ClearEvents_When_EventsProcessed", func(t *testing.T) {
		// Given: Aggregate with events
		order := quickstart.NewOrder("CUST-003", quickstart.NewMoney(300.00, "USD"))
		order.ConfirmOrder()

		initialEventCount := len(order.GetEvents())
		if initialEventCount == 0 {
			t.Fatal("Should have events before clearing")
		}

		// When: Clearing events
		order.ClearEvents()

		// Then: Events should be empty
		eventsAfterClear := order.GetEvents()
		if len(eventsAfterClear) != 0 {
			t.Errorf("Expected 0 events after clearing, got %d", len(eventsAfterClear))
		}
	})

	t.Run("Should_MaintainEventOrder_When_MultipleOperations", func(t *testing.T) {
		// Given: A new order aggregate
		order := quickstart.NewOrder("CUST-004", quickstart.NewMoney(400.00, "USD"))

		// When: Performing sequence of operations
		order.ConfirmOrder()
		order.ShipOrder()

		// Then: Events should be in chronological order
		events := order.GetEvents()
		if len(events) < 3 {
			t.Fatal("Should have at least 3 events")
		}

		// Check that events are ordered by occurrence time
		for i := 1; i < len(events); i++ {
			prev := events[i-1]
			curr := events[i]

			if curr.OccurredAt().Before(prev.OccurredAt()) {
				t.Error("Events should be in chronological order")
			}
		}
	})

	t.Run("Should_PreventInvalidStateTransitions_When_BusinessRulesViolated", func(t *testing.T) {
		// Given: A new order aggregate
		order := quickstart.NewOrder("CUST-005", quickstart.NewMoney(500.00, "USD"))

		// When: Attempting invalid state transition (ship before confirm)
		shipResult := order.ShipOrder()

		// Then: Should fail with domain error
		if shipResult.IsSuccess() {
			t.Error("Should not allow shipping unconfirmed order")
		}

		// And version should not increment on failed operations
		expectedVersion := int64(1) // Only creation should have incremented version
		if order.GetVersion() != expectedVersion {
			t.Errorf("Version should remain %d after failed operation, got %d", expectedVersion, order.GetVersion())
		}
	})

	t.Run("Should_EnforceBusinessInvariants_When_AggregateModified", func(t *testing.T) {
		// Given: Order with business constraints
		order := quickstart.NewOrder("CUST-006", quickstart.NewMoney(600.00, "USD"))

		// Confirm and ship the order
		order.ConfirmOrder()
		order.ShipOrder()

		// When: Attempting to cancel shipped order
		cancelResult := order.CancelOrder()

		// Then: Should prevent invalid business operation
		if cancelResult.IsSuccess() {
			t.Error("Should not allow cancelling shipped order")
		}

		// And aggregate state should remain consistent
		if order.GetStatus() != quickstart.Shipped {
			t.Error("Order status should remain Shipped after failed cancellation")
		}
	})

	t.Run("Should_SupportEventMetadata_When_EventsGenerated", func(t *testing.T) {
		// Given: Order with correlation context
		correlationID := "correlation-123"
		order := quickstart.NewOrderWithCorrelation("CUST-007", quickstart.NewMoney(700.00, "USD"), correlationID)

		// When: Performing operations
		order.ConfirmOrder()

		// Then: Events should contain metadata
		events := order.GetEvents()
		if len(events) < 2 {
			t.Fatal("Should have at least 2 events")
		}

		// Check that events have proper correlation tracking
		for _, event := range events {
			if event.CorrelationID() == nil || *event.CorrelationID() != correlationID {
				t.Error("Events should maintain correlation ID")
			}

			metadata := event.Metadata()
			if metadata == nil {
				t.Error("Events should have metadata")
			}
		}
	})

	t.Run("Should_SupportEventCausation_When_EventsChained", func(t *testing.T) {
		// Given: Order aggregate
		order := quickstart.NewOrder("CUST-008", quickstart.NewMoney(800.00, "USD"))

		// When: Performing chained operations
		order.ConfirmOrder()

		events := order.GetEvents()
		if len(events) < 2 {
			t.Fatal("Should have at least 2 events")
		}

		// Then: Later events should reference earlier events as causation
		creationEvent := events[0]
		confirmationEvent := events[1]

		if confirmationEvent.CausationID() == nil || *confirmationEvent.CausationID() != creationEvent.ID() {
			t.Error("Confirmation event should reference creation event as causation")
		}
	})

	t.Run("Should_HandleComplexBusinessWorkflows_When_MultipleSteps", func(t *testing.T) {
		// Given: Order aggregate for complex workflow
		order := quickstart.NewOrder("CUST-009", quickstart.NewMoney(900.00, "USD"))

		// When: Executing full business workflow
		steps := []struct {
			operation    func() error
			expectedStatus quickstart.OrderStatus
			description  string
		}{
			{
				operation: func() error {
					result := order.ConfirmOrder()
					if result.IsFailure() {
						return result.Error()
					}
					return nil
				},
				expectedStatus: quickstart.Confirmed,
				description:    "confirm order",
			},
			{
				operation: func() error {
					result := order.ShipOrder()
					if result.IsFailure() {
						return result.Error()
					}
					return nil
				},
				expectedStatus: quickstart.Shipped,
				description:    "ship order",
			},
			{
				operation: func() error {
					result := order.DeliverOrder()
					if result.IsFailure() {
						return result.Error()
					}
					return nil
				},
				expectedStatus: quickstart.Delivered,
				description:    "deliver order",
			},
		}

		// Execute each step and verify state
		for i, step := range steps {
			err := step.operation()
			if err != nil {
				t.Fatalf("Step %d (%s) failed: %v", i+1, step.description, err)
			}

			if order.GetStatus() != step.expectedStatus {
				t.Errorf("After step %d (%s), expected status %v, got %v",
					i+1, step.description, step.expectedStatus, order.GetStatus())
			}

			// Version should increment with each successful operation
			expectedVersion := int64(i + 2) // +1 for creation, +1 for each step
			if order.GetVersion() != expectedVersion {
				t.Errorf("After step %d, expected version %d, got %d",
					i+1, expectedVersion, order.GetVersion())
			}
		}

		// Then: Should have collected all events
		finalEvents := order.GetEvents()
		expectedEventCount := len(steps) + 1 // +1 for creation event
		if len(finalEvents) != expectedEventCount {
			t.Errorf("Expected %d total events, got %d", expectedEventCount, len(finalEvents))
		}
	})

	t.Run("Should_MaintainConsistency_When_ConcurrentModifications", func(t *testing.T) {
		// Given: Order aggregate
		order := quickstart.NewOrder("CUST-010", quickstart.NewMoney(1000.00, "USD"))

		// When: Simulating concurrent modifications (in single thread for testing)
		order.ConfirmOrder()

		// Capture state before potential concurrent modification
		versionBeforeConcurrency := order.GetVersion()
		eventsBeforeConcurrency := len(order.GetEvents())

		// Simulate another operation
		order.ShipOrder()

		// Then: State should be consistent
		if order.GetVersion() <= versionBeforeConcurrency {
			t.Error("Version should increment with each modification")
		}

		if len(order.GetEvents()) <= eventsBeforeConcurrency {
			t.Error("Event count should increase with each operation")
		}

		// All events should be properly ordered
		events := order.GetEvents()
		for i := 1; i < len(events); i++ {
			if events[i].OccurredAt().Before(events[i-1].OccurredAt()) {
				t.Error("Events should maintain chronological order")
			}
		}
	})
}