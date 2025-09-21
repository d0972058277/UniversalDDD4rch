package unit

import (
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/universalddd/architecture-core-go/pkg/domain"
	testutils "github.com/universalddd/architecture-core-go/internal/testing"
)

// =============================================================================
// UNIT TESTS FOR AGGREGATEROOT VERSION CONTROL AND EVENT MANAGEMENT
// Requirements: Version control, event collection, thread safety
// =============================================================================

// Test entity ID types
type TestOrderID string

func (id TestOrderID) String() string { return string(id) }

type TestCustomerID string

func (id TestCustomerID) String() string { return string(id) }

// Test domain events
type TestOrderCreatedEvent struct {
	*domain.DomainEventBase
	OrderID    TestOrderID
	CustomerID TestCustomerID
	Amount     float64
}

func NewTestOrderCreatedEvent(orderID TestOrderID, customerID TestCustomerID, amount float64) *TestOrderCreatedEvent {
	return &TestOrderCreatedEvent{
		DomainEventBase: domain.NewDomainEventBase("OrderCreated", string(orderID), "Order"),
		OrderID:         orderID,
		CustomerID:      customerID,
		Amount:          amount,
	}
}

type TestOrderStatusChangedEvent struct {
	*domain.DomainEventBase
	OrderID   TestOrderID
	OldStatus string
	NewStatus string
}

func NewTestOrderStatusChangedEvent(orderID TestOrderID, oldStatus, newStatus string) *TestOrderStatusChangedEvent {
	return &TestOrderStatusChangedEvent{
		DomainEventBase: domain.NewDomainEventBase("OrderStatusChanged", string(orderID), "Order"),
		OrderID:         orderID,
		OldStatus:       oldStatus,
		NewStatus:       newStatus,
	}
}

// Test aggregate
type TestOrder struct {
	*domain.AggregateRoot[TestOrderID]
	CustomerID TestCustomerID
	Amount     float64
	Status     string
}

func NewTestOrder(orderID TestOrderID, customerID TestCustomerID, amount float64) *TestOrder {
	order := &TestOrder{
		AggregateRoot: domain.NewAggregateRoot(orderID),
		CustomerID:    customerID,
		Amount:        amount,
		Status:        "pending",
	}

	// Add creation event
	event := NewTestOrderCreatedEvent(orderID, customerID, amount)
	order.AddEvent(event)

	return order
}

func (o *TestOrder) ChangeStatus(newStatus string) {
	if o.Status != newStatus {
		oldStatus := o.Status
		o.Status = newStatus

		event := NewTestOrderStatusChangedEvent(o.GetID(), oldStatus, newStatus)
		o.AddEvent(event)
		o.IncrementVersion()
	}
}

func TestAggregateRoot_Should_CreateWithInitialState_When_NewAggregateRootCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	orderID := TestOrderID("order-123")

	// When
	aggregate := domain.NewAggregateRoot(orderID)

	// Then
	assertions.NotNil(aggregate, "Aggregate should not be nil")
	assertions.Equal(orderID, aggregate.GetID(), "Aggregate ID should match")
	assertions.Equal(int64(0), aggregate.GetVersion(), "Initial version should be 0")
	assertions.Equal(0, len(aggregate.GetEvents()), "Initial events should be empty")
	assertions.False(aggregate.HasUncommittedEvents(), "Should not have uncommitted events initially")
	assertions.Equal(0, aggregate.GetEventCount(), "Event count should be 0 initially")
}

func TestAggregateRoot_Should_IncrementVersion_When_IncrementVersionCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	aggregate := domain.NewAggregateRoot(TestOrderID("order-123"))

	// When
	aggregate.IncrementVersion()

	// Then
	assertions.Equal(int64(1), aggregate.GetVersion(), "Version should be incremented to 1")

	// When - increment again
	aggregate.IncrementVersion()

	// Then
	assertions.Equal(int64(2), aggregate.GetVersion(), "Version should be incremented to 2")
}

func TestAggregateRoot_Should_SetVersion_When_SetVersionCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	aggregate := domain.NewAggregateRoot(TestOrderID("order-123"))

	// When
	aggregate.SetVersion(42)

	// Then
	assertions.Equal(int64(42), aggregate.GetVersion(), "Version should be set to 42")

	// When - set to different value
	aggregate.SetVersion(100)

	// Then
	assertions.Equal(int64(100), aggregate.GetVersion(), "Version should be set to 100")
}

func TestAggregateRoot_Should_AddEvent_When_AddEventCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	aggregate := domain.NewAggregateRoot(TestOrderID("order-123"))
	event := NewTestOrderCreatedEvent(TestOrderID("order-123"), TestCustomerID("customer-456"), 100.0)

	// When
	aggregate.AddEvent(event)

	// Then
	assertions.Equal(1, len(aggregate.GetEvents()), "Should have 1 event")
	assertions.True(aggregate.HasUncommittedEvents(), "Should have uncommitted events")
	assertions.Equal(1, aggregate.GetEventCount(), "Event count should be 1")

	events := aggregate.GetEvents()
	assertions.Equal(event.GetID(), events[0].GetID(), "Event ID should match")
	assertions.Equal("OrderCreated", events[0].GetEventType(), "Event type should match")
}

func TestAggregateRoot_Should_AddMultipleEvents_When_MultipleAddEventsCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	aggregate := domain.NewAggregateRoot(TestOrderID("order-123"))

	event1 := NewTestOrderCreatedEvent(TestOrderID("order-123"), TestCustomerID("customer-456"), 100.0)
	event2 := NewTestOrderStatusChangedEvent(TestOrderID("order-123"), "pending", "confirmed")
	event3 := NewTestOrderStatusChangedEvent(TestOrderID("order-123"), "confirmed", "shipped")

	// When
	aggregate.AddEvent(event1)
	aggregate.AddEvent(event2)
	aggregate.AddEvent(event3)

	// Then
	assertions.Equal(3, len(aggregate.GetEvents()), "Should have 3 events")
	assertions.True(aggregate.HasUncommittedEvents(), "Should have uncommitted events")
	assertions.Equal(3, aggregate.GetEventCount(), "Event count should be 3")

	events := aggregate.GetEvents()
	assertions.Equal("OrderCreated", events[0].GetEventType(), "First event should be OrderCreated")
	assertions.Equal("OrderStatusChanged", events[1].GetEventType(), "Second event should be OrderStatusChanged")
	assertions.Equal("OrderStatusChanged", events[2].GetEventType(), "Third event should be OrderStatusChanged")
}

func TestAggregateRoot_Should_ClearEvents_When_ClearEventsCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	aggregate := domain.NewAggregateRoot(TestOrderID("order-123"))

	event1 := NewTestOrderCreatedEvent(TestOrderID("order-123"), TestCustomerID("customer-456"), 100.0)
	event2 := NewTestOrderStatusChangedEvent(TestOrderID("order-123"), "pending", "confirmed")

	aggregate.AddEvent(event1)
	aggregate.AddEvent(event2)

	// Verify events are present
	assertions.Equal(2, aggregate.GetEventCount(), "Should have 2 events before clear")

	// When
	aggregate.ClearEvents()

	// Then
	assertions.Equal(0, len(aggregate.GetEvents()), "Should have 0 events after clear")
	assertions.False(aggregate.HasUncommittedEvents(), "Should not have uncommitted events after clear")
	assertions.Equal(0, aggregate.GetEventCount(), "Event count should be 0 after clear")
}

func TestAggregateRoot_Should_GetEventsCopy_When_GetEventsCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	aggregate := domain.NewAggregateRoot(TestOrderID("order-123"))
	event := NewTestOrderCreatedEvent(TestOrderID("order-123"), TestCustomerID("customer-456"), 100.0)

	aggregate.AddEvent(event)

	// When
	events1 := aggregate.GetEvents()
	events2 := aggregate.GetEvents()

	// Then
	assertions.Equal(len(events1), len(events2), "Both calls should return same length")
	assertions.Equal(events1[0].GetID(), events2[0].GetID(), "Events should have same content")

	// Verify that modifying returned slice doesn't affect aggregate
	if len(events1) > 0 {
		// This should not affect the aggregate's internal events
		events1 = events1[:0] // Clear the returned slice
	}

	events3 := aggregate.GetEvents()
	assertions.Equal(1, len(events3), "Original events should be preserved")
}

func TestAggregateRoot_Should_GetEventsSince_When_EventsAddedAtDifferentTimes(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	aggregate := domain.NewAggregateRoot(TestOrderID("order-123"))

	// Add first event
	event1 := NewTestOrderCreatedEvent(TestOrderID("order-123"), TestCustomerID("customer-456"), 100.0)
	aggregate.AddEvent(event1)

	// Wait a small amount to ensure different timestamps
	time.Sleep(time.Millisecond * 10)
	cutoffTime := time.Now().UTC()
	time.Sleep(time.Millisecond * 10)

	// Add second event after cutoff
	event2 := NewTestOrderStatusChangedEvent(TestOrderID("order-123"), "pending", "confirmed")
	aggregate.AddEvent(event2)

	// When
	recentEvents := aggregate.GetEventsSince(cutoffTime)

	// Then
	assertions.Equal(1, len(recentEvents), "Should have 1 recent event")
	assertions.Equal(event2.GetID(), recentEvents[0].GetID(), "Recent event should be event2")
	assertions.Equal("OrderStatusChanged", recentEvents[0].GetEventType(), "Recent event should be status change")
}

func TestAggregateRoot_Should_GetEventsOfType_When_MultipleEventTypesPresent(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	aggregate := domain.NewAggregateRoot(TestOrderID("order-123"))

	event1 := NewTestOrderCreatedEvent(TestOrderID("order-123"), TestCustomerID("customer-456"), 100.0)
	event2 := NewTestOrderStatusChangedEvent(TestOrderID("order-123"), "pending", "confirmed")
	event3 := NewTestOrderStatusChangedEvent(TestOrderID("order-123"), "confirmed", "shipped")

	aggregate.AddEvent(event1)
	aggregate.AddEvent(event2)
	aggregate.AddEvent(event3)

	// When
	createdEvents := aggregate.GetEventsOfType("OrderCreated")
	statusEvents := aggregate.GetEventsOfType("OrderStatusChanged")
	nonExistentEvents := aggregate.GetEventsOfType("NonExistent")

	// Then
	assertions.Equal(1, len(createdEvents), "Should have 1 OrderCreated event")
	assertions.Equal(2, len(statusEvents), "Should have 2 OrderStatusChanged events")
	assertions.Equal(0, len(nonExistentEvents), "Should have 0 NonExistent events")

	assertions.Equal("OrderCreated", createdEvents[0].GetEventType(), "Created event type should match")
	assertions.Equal("OrderStatusChanged", statusEvents[0].GetEventType(), "First status event type should match")
	assertions.Equal("OrderStatusChanged", statusEvents[1].GetEventType(), "Second status event type should match")
}

func TestAggregateRoot_Should_MaintainEventOrder_When_EventsAddedSequentially(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	aggregate := domain.NewAggregateRoot(TestOrderID("order-123"))

	// Add events with slight delays to ensure timestamp ordering
	events := make([]*TestOrderStatusChangedEvent, 5)
	for i := 0; i < 5; i++ {
		events[i] = NewTestOrderStatusChangedEvent(
			TestOrderID("order-123"),
			fmt.Sprintf("status-%d", i),
			fmt.Sprintf("status-%d", i+1),
		)
		aggregate.AddEvent(events[i])
		time.Sleep(time.Millisecond) // Ensure different timestamps
	}

	// When
	retrievedEvents := aggregate.GetEvents()

	// Then
	assertions.Equal(5, len(retrievedEvents), "Should have 5 events")

	// Verify order is maintained
	for i := 0; i < 5; i++ {
		assertions.Equal(events[i].GetID(), retrievedEvents[i].GetID(), fmt.Sprintf("Event %d should be in correct order", i))
	}
}

func TestAggregateRoot_Should_HandleVersioningWorkflow_When_BusinessOperationsPerformed(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	order := NewTestOrder(TestOrderID("order-123"), TestCustomerID("customer-456"), 100.0)

	// Initial state after creation
	assertions.Equal(int64(0), order.GetVersion(), "Initial version should be 0")
	assertions.Equal(1, order.GetEventCount(), "Should have creation event")

	// When - perform business operation
	order.ChangeStatus("confirmed")

	// Then
	assertions.Equal(int64(1), order.GetVersion(), "Version should be incremented")
	assertions.Equal(2, order.GetEventCount(), "Should have 2 events")
	assertions.Equal("confirmed", order.Status, "Status should be updated")

	// When - perform another operation
	order.ChangeStatus("shipped")

	// Then
	assertions.Equal(int64(2), order.GetVersion(), "Version should be incremented again")
	assertions.Equal(3, order.GetEventCount(), "Should have 3 events")
	assertions.Equal("shipped", order.Status, "Status should be updated again")

	// Verify event sequence
	events := order.GetEvents()
	assertions.Equal("OrderCreated", events[0].GetEventType(), "First event should be creation")
	assertions.Equal("OrderStatusChanged", events[1].GetEventType(), "Second event should be status change")
	assertions.Equal("OrderStatusChanged", events[2].GetEventType(), "Third event should be status change")
}

func TestAggregateRoot_Should_HandleConcurrentEventAddition_When_MultipleGoroutinesAddEvents(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	aggregate := domain.NewAggregateRoot(TestOrderID("order-123"))

	const numGoroutines = 10
	const eventsPerGoroutine = 5
	const totalEvents = numGoroutines * eventsPerGoroutine

	var wg sync.WaitGroup
	wg.Add(numGoroutines)

	// When - add events concurrently
	for i := 0; i < numGoroutines; i++ {
		go func(goroutineID int) {
			defer wg.Done()

			for j := 0; j < eventsPerGoroutine; j++ {
				event := NewTestOrderStatusChangedEvent(
					TestOrderID("order-123"),
					fmt.Sprintf("g%d-status-%d", goroutineID, j),
					fmt.Sprintf("g%d-status-%d", goroutineID, j+1),
				)
				aggregate.AddEvent(event)
			}
		}(i)
	}

	wg.Wait()

	// Then
	assertions.Equal(totalEvents, aggregate.GetEventCount(), "Should have all events added")
	assertions.True(aggregate.HasUncommittedEvents(), "Should have uncommitted events")

	events := aggregate.GetEvents()
	assertions.Equal(totalEvents, len(events), "Retrieved events count should match")

	// Verify all events are present (they might be in different order due to concurrency)
	eventTypeCount := 0
	for _, event := range events {
		if event.GetEventType() == "OrderStatusChanged" {
			eventTypeCount++
		}
	}
	assertions.Equal(totalEvents, eventTypeCount, "All events should be of correct type")
}

func TestAggregateRoot_Should_HandleConcurrentVersioning_When_MultipleGoroutinesIncrementVersion(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	aggregate := domain.NewAggregateRoot(TestOrderID("order-123"))

	const numGoroutines = 10
	const incrementsPerGoroutine = 5
	const totalIncrements = numGoroutines * incrementsPerGoroutine

	var wg sync.WaitGroup
	wg.Add(numGoroutines)

	// When - increment version concurrently
	for i := 0; i < numGoroutines; i++ {
		go func() {
			defer wg.Done()

			for j := 0; j < incrementsPerGoroutine; j++ {
				aggregate.IncrementVersion()
			}
		}()
	}

	wg.Wait()

	// Then
	assertions.Equal(int64(totalIncrements), aggregate.GetVersion(), "Version should be incremented correctly")
}

func TestAggregateRoot_Should_HandleConcurrentReadAndWrite_When_ReadingWhileModifying(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	aggregate := domain.NewAggregateRoot(TestOrderID("order-123"))

	const duration = 100 * time.Millisecond
	done := make(chan bool, 2)
	var readOperations int
	var writeOperations int

	// Writer goroutine
	go func() {
		defer func() { done <- true }()
		start := time.Now()

		for time.Since(start) < duration {
			event := NewTestOrderStatusChangedEvent(
				TestOrderID("order-123"),
				"old",
				"new",
			)
			aggregate.AddEvent(event)
			aggregate.IncrementVersion()
			writeOperations++
			time.Sleep(time.Microsecond) // Small delay to allow reads
		}
	}()

	// Reader goroutine
	go func() {
		defer func() { done <- true }()
		start := time.Now()

		for time.Since(start) < duration {
			_ = aggregate.GetVersion()
			_ = aggregate.GetEvents()
			_ = aggregate.HasUncommittedEvents()
			_ = aggregate.GetEventCount()
			readOperations++
			time.Sleep(time.Microsecond) // Small delay
		}
	}()

	// Wait for both goroutines
	<-done
	<-done

	// Then - No panics should occur and state should be consistent
	assertions.True(writeOperations > 0, "Should have performed write operations")
	assertions.True(readOperations > 0, "Should have performed read operations")
	assertions.Equal(int64(writeOperations), aggregate.GetVersion(), "Version should match write operations")
	assertions.Equal(writeOperations, aggregate.GetEventCount(), "Event count should match write operations")
}

func TestAggregateRoot_Should_PreserveEntityBehavior_When_UsedAsEntity(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	orderID := TestOrderID("order-123")
	aggregate1 := domain.NewAggregateRoot(orderID)
	aggregate2 := domain.NewAggregateRoot(orderID)
	aggregate3 := domain.NewAggregateRoot(TestOrderID("order-456"))

	// When & Then - Entity equality behavior
	assertions.True(aggregate1.Equals(aggregate2), "Aggregates with same ID should be equal")
	assertions.False(aggregate1.Equals(aggregate3), "Aggregates with different IDs should not be equal")

	// Hash code behavior
	hash1 := aggregate1.GetHashCode()
	hash2 := aggregate2.GetHashCode()
	hash3 := aggregate3.GetHashCode()

	assertions.Equal(hash1, hash2, "Aggregates with same ID should have same hash code")
	assertions.NotEqual(hash1, hash3, "Aggregates with different IDs should have different hash codes")

	// String representation
	str := aggregate1.String()
	assertions.True(len(str) > 0, "String representation should not be empty")
	assertions.Contains(str, string(orderID), "String representation should contain ID")
}

func TestAggregateRoot_Should_HandleEdgeCases_When_UnusualOperationsPerformed(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	aggregate := domain.NewAggregateRoot(TestOrderID("order-123"))

	// When - clear events when no events exist
	aggregate.ClearEvents()

	// Then
	assertions.Equal(0, aggregate.GetEventCount(), "Event count should remain 0")
	assertions.False(aggregate.HasUncommittedEvents(), "Should not have events")

	// When - get events of non-existent type
	events := aggregate.GetEventsOfType("NonExistentType")

	// Then
	assertions.Equal(0, len(events), "Should return empty slice for non-existent type")

	// When - get events since future time
	futureTime := time.Now().Add(time.Hour)
	futureEvents := aggregate.GetEventsSince(futureTime)

	// Then
	assertions.Equal(0, len(futureEvents), "Should return empty slice for future time")

	// When - set negative version
	aggregate.SetVersion(-1)

	// Then
	assertions.Equal(int64(-1), aggregate.GetVersion(), "Should accept negative version")

	// When - set very large version
	aggregate.SetVersion(9223372036854775807) // max int64

	// Then
	assertions.Equal(int64(9223372036854775807), aggregate.GetVersion(), "Should accept large version")
}

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================

func TestAggregateRoot_Should_HandleLargeEventCollections_When_ManyEventsAdded(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	aggregate := domain.NewAggregateRoot(TestOrderID("order-123"))

	const numEvents = 1000

	// When - add many events
	start := time.Now()
	for i := 0; i < numEvents; i++ {
		event := NewTestOrderStatusChangedEvent(
			TestOrderID("order-123"),
			fmt.Sprintf("status-%d", i),
			fmt.Sprintf("status-%d", i+1),
		)
		aggregate.AddEvent(event)
	}
	addDuration := time.Since(start)

	// Then
	assertions.Equal(numEvents, aggregate.GetEventCount(), "Should have all events")

	// When - retrieve events
	start = time.Now()
	events := aggregate.GetEvents()
	retrieveDuration := time.Since(start)

	// Then
	assertions.Equal(numEvents, len(events), "Should retrieve all events")

	// Performance checks (these are rough benchmarks)
	assertions.True(addDuration < time.Second, "Adding events should be reasonably fast")
	assertions.True(retrieveDuration < time.Millisecond*100, "Retrieving events should be fast")

	// When - clear events
	start = time.Now()
	aggregate.ClearEvents()
	clearDuration := time.Since(start)

	// Then
	assertions.Equal(0, aggregate.GetEventCount(), "Should have no events after clear")
	assertions.True(clearDuration < time.Millisecond*10, "Clearing events should be very fast")
}

// =============================================================================
// BUSINESS SCENARIO TESTS
// =============================================================================

func TestAggregateRoot_Should_SupportTypicalBusinessWorkflow_When_OrderProcessingScenario(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	orderID := TestOrderID("order-123")
	customerID := TestCustomerID("customer-456")
	amount := 250.75

	// When - create order
	order := NewTestOrder(orderID, customerID, amount)

	// Then - initial state
	assertions.Equal(orderID, order.GetID(), "Order ID should be set")
	assertions.Equal(customerID, order.CustomerID, "Customer ID should be set")
	assertions.Equal(amount, order.Amount, "Amount should be set")
	assertions.Equal("pending", order.Status, "Initial status should be pending")
	assertions.Equal(int64(0), order.GetVersion(), "Initial version should be 0")
	assertions.Equal(1, order.GetEventCount(), "Should have creation event")

	// When - confirm order
	order.ChangeStatus("confirmed")

	// Then
	assertions.Equal("confirmed", order.Status, "Status should be confirmed")
	assertions.Equal(int64(1), order.GetVersion(), "Version should be incremented")
	assertions.Equal(2, order.GetEventCount(), "Should have 2 events")

	// When - ship order
	order.ChangeStatus("shipped")

	// Then
	assertions.Equal("shipped", order.Status, "Status should be shipped")
	assertions.Equal(int64(2), order.GetVersion(), "Version should be incremented again")
	assertions.Equal(3, order.GetEventCount(), "Should have 3 events")

	// When - attempt to set same status (no change)
	order.ChangeStatus("shipped")

	// Then
	assertions.Equal("shipped", order.Status, "Status should remain shipped")
	assertions.Equal(int64(2), order.GetVersion(), "Version should not change")
	assertions.Equal(3, order.GetEventCount(), "Event count should not change")

	// When - deliver order
	order.ChangeStatus("delivered")

	// Then
	assertions.Equal("delivered", order.Status, "Status should be delivered")
	assertions.Equal(int64(3), order.GetVersion(), "Version should be incremented")
	assertions.Equal(4, order.GetEventCount(), "Should have 4 events")

	// Verify complete event history
	events := order.GetEvents()
	assertions.Equal("OrderCreated", events[0].GetEventType(), "First event should be creation")
	assertions.Equal("OrderStatusChanged", events[1].GetEventType(), "Second event should be status change")
	assertions.Equal("OrderStatusChanged", events[2].GetEventType(), "Third event should be status change")
	assertions.Equal("OrderStatusChanged", events[3].GetEventType(), "Fourth event should be status change")

	// Verify event chronological order
	for i := 1; i < len(events); i++ {
		prev := events[i-1].GetOccurredAt()
		curr := events[i].GetOccurredAt()
		assertions.True(curr.After(prev) || curr.Equal(prev), fmt.Sprintf("Event %d should occur after event %d", i, i-1))
	}

	// When - simulate persistence (clear events)
	order.ClearEvents()

	// Then
	assertions.Equal(0, order.GetEventCount(), "Events should be cleared")
	assertions.Equal(int64(3), order.GetVersion(), "Version should be preserved")
	assertions.Equal("delivered", order.Status, "Business state should be preserved")
}