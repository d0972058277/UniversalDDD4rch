package performance

import (
	"fmt"
	"testing"
	"time"

	"github.com/universalddd/architecture-core-go/pkg/domain"
	testutils "github.com/universalddd/architecture-core-go/internal/testing"
)

// =============================================================================
// BENCHMARK TESTS FOR AGGREGATE ROOT EVENT COLLECTION PERFORMANCE
// Requirements: Efficient event collection with slice reuse (Research Goal)
// =============================================================================

// TestAggregateID for benchmark testing
type TestAggregateID struct {
	value string
}

func NewTestAggregateID(value string) TestAggregateID {
	return TestAggregateID{value: value}
}

func (t TestAggregateID) String() string {
	return t.value
}

// TestAggregateRoot implementation for benchmarking
type TestAggregateRoot struct {
	id      TestAggregateID
	version int64
	events  []domain.DomainEvent
	deleted bool
	data    map[string]interface{}
}

func NewTestAggregateRoot(id TestAggregateID) *TestAggregateRoot {
	return &TestAggregateRoot{
		id:      id,
		version: 0,
		events:  make([]domain.DomainEvent, 0, 10), // Pre-allocate for performance
		deleted: false,
		data:    make(map[string]interface{}),
	}
}

func (t *TestAggregateRoot) ID() TestAggregateID                    { return t.id }
func (t *TestAggregateRoot) Version() int64                        { return t.version }
func (t *TestAggregateRoot) DomainEvents() []domain.DomainEvent    { return t.events }
func (t *TestAggregateRoot) IsDeleted() bool                       { return t.deleted }

func (t *TestAggregateRoot) AddDomainEvent(event domain.DomainEvent) {
	t.events = append(t.events, event)
}

func (t *TestAggregateRoot) ClearDomainEvents() {
	// Reuse slice to avoid allocation
	t.events = t.events[:0]
}

func (t *TestAggregateRoot) MarkAsDeleted() {
	t.deleted = true
	// Add deletion event
	deletionEvent := testutils.NewTestDomainEventBuilder().
		WithEventType("AggregateDeleted").
		WithPayloadField("aggregateId", t.id.String()).
		WithPayloadField("version", t.version).
		Build()
	t.AddDomainEvent(deletionEvent)
}

func (t *TestAggregateRoot) IncrementVersion() {
	t.version++
}

func (t *TestAggregateRoot) SetData(key string, value interface{}) {
	t.data[key] = value
}

// =============================================================================
// EVENT COLLECTION BENCHMARKS
// =============================================================================

func BenchmarkAggregate_EventCollection_SingleAdd(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// Setup
	aggregate := NewTestAggregateRoot(NewTestAggregateID("test-aggregate"))
	event := testutils.NewTestDomainEventBuilder().
		WithEventType("TestEvent").
		WithPayloadField("data", "test").
		Build()

	// Single event addition
	tester.BenchmarkOperation("AddDomainEvent_Single", func() {
		// Clear events first to reset state
		aggregate.ClearDomainEvents()
		aggregate.AddDomainEvent(event)
	})

	// Event retrieval
	aggregate.AddDomainEvent(event) // Ensure there's an event
	tester.BenchmarkOperation("DomainEvents_Retrieval", func() {
		_ = aggregate.DomainEvents()
	})

	// Event clearing
	tester.BenchmarkOperation("ClearDomainEvents", func() {
		aggregate.AddDomainEvent(event)
		aggregate.ClearDomainEvents()
	})

	// Zero allocation tests - CRITICAL REQUIREMENT
	tester.BenchmarkZeroAlloc("DomainEvents_Retrieval", func() {
		_ = aggregate.DomainEvents()
	})

	tester.BenchmarkZeroAlloc("ClearDomainEvents", func() {
		aggregate.AddDomainEvent(event)
		aggregate.ClearDomainEvents()
	})
}

func BenchmarkAggregate_EventCollection_MultipleAdd(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// Setup
	aggregate := NewTestAggregateRoot(NewTestAggregateID("test-aggregate"))

	// Create different events for testing
	events := make([]testutils.TestDomainEvent, 10)
	for i := 0; i < 10; i++ {
		events[i] = testutils.NewTestDomainEventBuilder().
			WithEventType(fmt.Sprintf("TestEvent%d", i)).
			WithPayloadField("index", i).
			WithPayloadField("data", fmt.Sprintf("test-data-%d", i)).
			Build()
	}

	// Add 5 events
	tester.BenchmarkOperation("AddDomainEvent_5_Events", func() {
		aggregate.ClearDomainEvents()
		for i := 0; i < 5; i++ {
			aggregate.AddDomainEvent(events[i])
		}
	})

	// Add 10 events
	tester.BenchmarkOperation("AddDomainEvent_10_Events", func() {
		aggregate.ClearDomainEvents()
		for i := 0; i < 10; i++ {
			aggregate.AddDomainEvent(events[i])
		}
	})

	// Add 20 events (test slice growth)
	tester.BenchmarkOperation("AddDomainEvent_20_Events", func() {
		aggregate.ClearDomainEvents()
		for i := 0; i < 20; i++ {
			eventIndex := i % len(events)
			aggregate.AddDomainEvent(events[eventIndex])
		}
	})

	// Measure slice reuse efficiency
	tester.BenchmarkOperation("SliceReuse_Cycle", func() {
		// Add events, clear, add again to test reuse
		aggregate.ClearDomainEvents()
		for i := 0; i < 5; i++ {
			aggregate.AddDomainEvent(events[i])
		}
		aggregate.ClearDomainEvents()
		for i := 0; i < 5; i++ {
			aggregate.AddDomainEvent(events[i])
		}
	})
}

func BenchmarkAggregate_EventCollection_Scaling(b *testing.B) {
	// Test how event collection performance scales with number of events
	testutils.BenchmarkWithDifferentSizes(b, "EventCollection",
		[]int{1, 5, 10, 25, 50, 100},
		func(size int) interface{} {
			aggregate := NewTestAggregateRoot(NewTestAggregateID("test-aggregate"))
			events := make([]testutils.TestDomainEvent, size)
			for i := 0; i < size; i++ {
				events[i] = testutils.NewTestDomainEventBuilder().
					WithEventType(fmt.Sprintf("TestEvent%d", i)).
					WithPayloadField("index", i).
					Build()
			}
			return map[string]interface{}{
				"aggregate": aggregate,
				"events":    events,
			}
		},
		func(data interface{}) {
			params := data.(map[string]interface{})
			aggregate := params["aggregate"].(*TestAggregateRoot)
			events := params["events"].([]testutils.TestDomainEvent)

			aggregate.ClearDomainEvents()
			for _, event := range events {
				aggregate.AddDomainEvent(event)
			}
		})
}

// =============================================================================
// AGGREGATE LIFECYCLE BENCHMARKS
// =============================================================================

func BenchmarkAggregate_Lifecycle_Operations(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// Setup
	aggregate := NewTestAggregateRoot(NewTestAggregateID("test-aggregate"))

	// Version increment
	tester.BenchmarkOperation("IncrementVersion", func() {
		aggregate.IncrementVersion()
	})

	// Delete marking
	tester.BenchmarkOperation("MarkAsDeleted", func() {
		freshAggregate := NewTestAggregateRoot(NewTestAggregateID("delete-test"))
		freshAggregate.MarkAsDeleted()
	})

	// Data operations
	tester.BenchmarkOperation("SetData", func() {
		aggregate.SetData("key", "value")
	})

	// State queries
	tester.BenchmarkOperation("ID_Query", func() {
		_ = aggregate.ID()
	})

	tester.BenchmarkOperation("Version_Query", func() {
		_ = aggregate.Version()
	})

	tester.BenchmarkOperation("IsDeleted_Query", func() {
		_ = aggregate.IsDeleted()
	})

	// Zero allocation tests for state queries
	tester.BenchmarkZeroAlloc("ID_Query", func() {
		_ = aggregate.ID()
	})

	tester.BenchmarkZeroAlloc("Version_Query", func() {
		_ = aggregate.Version()
	})

	tester.BenchmarkZeroAlloc("IsDeleted_Query", func() {
		_ = aggregate.IsDeleted()
	})
}

func BenchmarkAggregate_CompleteWorkflow(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// Complete aggregate workflow simulation
	tester.BenchmarkOperation("Complete_Workflow", func() {
		// Create aggregate
		aggregate := NewTestAggregateRoot(NewTestAggregateID("workflow-test"))

		// Set initial data
		aggregate.SetData("status", "created")
		aggregate.SetData("timestamp", time.Now())

		// Add creation event
		creationEvent := testutils.NewTestDomainEventBuilder().
			WithEventType("AggregateCreated").
			WithPayloadField("aggregateId", aggregate.ID().String()).
			Build()
		aggregate.AddDomainEvent(creationEvent)

		// Simulate business operations
		for i := 0; i < 3; i++ {
			aggregate.IncrementVersion()
			aggregate.SetData(fmt.Sprintf("operation_%d", i), i)

			operationEvent := testutils.NewTestDomainEventBuilder().
				WithEventType("OperationPerformed").
				WithPayloadField("operationIndex", i).
				WithPayloadField("version", aggregate.Version()).
				Build()
			aggregate.AddDomainEvent(operationEvent)
		}

		// Retrieve events for processing
		events := aggregate.DomainEvents()
		_ = len(events) // Use the events

		// Clear events (simulate after persistence)
		aggregate.ClearDomainEvents()
	})

	// Workflow with error handling
	tester.BenchmarkOperation("Workflow_With_Error", func() {
		aggregate := NewTestAggregateRoot(NewTestAggregateID("error-test"))

		// Normal operations
		aggregate.SetData("status", "processing")
		successEvent := testutils.NewTestDomainEventBuilder().
			WithEventType("ProcessingStarted").
			Build()
		aggregate.AddDomainEvent(successEvent)

		// Error scenario
		aggregate.SetData("status", "error")
		errorEvent := testutils.NewTestDomainEventBuilder().
			WithEventType("ErrorOccurred").
			WithPayloadField("errorCode", "PROCESSING_FAILED").
			Build()
		aggregate.AddDomainEvent(errorEvent)

		// Recovery
		aggregate.SetData("status", "recovered")
		recoveryEvent := testutils.NewTestDomainEventBuilder().
			WithEventType("ErrorRecovered").
			Build()
		aggregate.AddDomainEvent(recoveryEvent)

		// Process events
		events := aggregate.DomainEvents()
		for _, event := range events {
			_ = event.EventType() // Simulate event processing
		}

		aggregate.ClearDomainEvents()
	})
}

// =============================================================================
// MEMORY EFFICIENCY BENCHMARKS
// =============================================================================

func BenchmarkAggregate_MemoryEfficiency(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// Memory usage for event collection growth
	tester.BenchmarkMemory("EventCollection_Growth", func() {
		aggregate := NewTestAggregateRoot(NewTestAggregateID("memory-test"))

		// Add many events to test memory behavior
		for i := 0; i < 100; i++ {
			event := testutils.NewTestDomainEventBuilder().
				WithEventType("MemoryTestEvent").
				WithPayloadField("index", i).
				Build()
			aggregate.AddDomainEvent(event)
		}

		// Clear and reuse
		aggregate.ClearDomainEvents()

		// Add again to test slice reuse
		for i := 0; i < 50; i++ {
			event := testutils.NewTestDomainEventBuilder().
				WithEventType("ReuseTestEvent").
				WithPayloadField("index", i).
				Build()
			aggregate.AddDomainEvent(event)
		}
	})

	// Slice reuse efficiency
	tester.BenchmarkOperation("SliceReuse_Efficiency", func() {
		aggregate := NewTestAggregateRoot(NewTestAggregateID("reuse-test"))

		// Fill, clear, refill cycle
		for cycle := 0; cycle < 5; cycle++ {
			for i := 0; i < 10; i++ {
				event := testutils.NewTestDomainEventBuilder().
					WithEventType("CycleEvent").
					WithPayloadField("cycle", cycle).
					WithPayloadField("index", i).
					Build()
				aggregate.AddDomainEvent(event)
			}
			aggregate.ClearDomainEvents()
		}
	})
}

// =============================================================================
// CONCURRENT ACCESS BENCHMARKS
// =============================================================================

func BenchmarkAggregate_ConcurrentAccess(b *testing.B) {
	aggregate := NewTestAggregateRoot(NewTestAggregateID("concurrent-test"))

	// Add some initial events
	for i := 0; i < 10; i++ {
		event := testutils.NewTestDomainEventBuilder().
			WithEventType("InitialEvent").
			WithPayloadField("index", i).
			Build()
		aggregate.AddDomainEvent(event)
	}

	// Concurrent read access
	b.Run("Events_Read_Parallel", func(b *testing.B) {
		b.RunParallel(func(pb *testing.PB) {
			for pb.Next() {
				events := aggregate.DomainEvents()
				_ = len(events)
			}
		})
	})

	// Concurrent state queries
	b.Run("State_Query_Parallel", func(b *testing.B) {
		b.RunParallel(func(pb *testing.PB) {
			for pb.Next() {
				_ = aggregate.ID()
				_ = aggregate.Version()
				_ = aggregate.IsDeleted()
			}
		})
	})

	// Note: AddDomainEvent and ClearDomainEvents are not thread-safe by design
	// This follows the DDD principle that aggregates should be accessed by single threads
}

// =============================================================================
// BUSINESS SCENARIO BENCHMARKS
// =============================================================================

func BenchmarkAggregate_BusinessScenarios(b *testing.B) {
	tester := testutils.NewPerformanceTester(b)

	// E-commerce order scenario
	tester.BenchmarkOperation("Scenario_ECommerce_Order", func() {
		order := NewTestAggregateRoot(NewTestAggregateID("order-12345"))

		// Order creation
		order.SetData("customerId", "customer-001")
		order.SetData("status", "pending")
		order.SetData("total", 99.99)

		orderCreated := testutils.NewTestDomainEventBuilder().
			WithEventType("OrderCreated").
			WithPayloadField("orderId", order.ID().String()).
			WithPayloadField("customerId", "customer-001").
			WithPayloadField("total", 99.99).
			Build()
		order.AddDomainEvent(orderCreated)

		// Add items
		for i := 0; i < 3; i++ {
			order.IncrementVersion()
			itemAdded := testutils.NewTestDomainEventBuilder().
				WithEventType("ItemAdded").
				WithPayloadField("itemId", fmt.Sprintf("item-%d", i)).
				WithPayloadField("quantity", 1).
				Build()
			order.AddDomainEvent(itemAdded)
		}

		// Payment processing
		order.SetData("status", "processing")
		order.IncrementVersion()
		paymentStarted := testutils.NewTestDomainEventBuilder().
			WithEventType("PaymentStarted").
			Build()
		order.AddDomainEvent(paymentStarted)

		// Order fulfillment
		order.SetData("status", "shipped")
		order.IncrementVersion()
		orderShipped := testutils.NewTestDomainEventBuilder().
			WithEventType("OrderShipped").
			WithPayloadField("trackingNumber", "TRACK-123").
			Build()
		order.AddDomainEvent(orderShipped)

		// Process events for event sourcing
		events := order.DomainEvents()
		for _, event := range events {
			_ = event.EventType()
			_ = event.OccurredAt()
		}

		order.ClearDomainEvents()
	})

	// Banking account scenario
	tester.BenchmarkOperation("Scenario_Banking_Account", func() {
		account := NewTestAggregateRoot(NewTestAggregateID("account-789"))

		// Account creation
		account.SetData("balance", 1000.0)
		account.SetData("accountType", "checking")

		accountOpened := testutils.NewTestDomainEventBuilder().
			WithEventType("AccountOpened").
			WithPayloadField("accountId", account.ID().String()).
			WithPayloadField("initialBalance", 1000.0).
			Build()
		account.AddDomainEvent(accountOpened)

		// Multiple transactions
		balance := 1000.0
		for i := 0; i < 5; i++ {
			amount := float64((i + 1) * 50)
			if i%2 == 0 {
				// Credit
				balance += amount
				account.SetData("balance", balance)
				account.IncrementVersion()

				creditEvent := testutils.NewTestDomainEventBuilder().
					WithEventType("AmountCredited").
					WithPayloadField("amount", amount).
					WithPayloadField("newBalance", balance).
					Build()
				account.AddDomainEvent(creditEvent)
			} else {
				// Debit
				balance -= amount
				account.SetData("balance", balance)
				account.IncrementVersion()

				debitEvent := testutils.NewTestDomainEventBuilder().
					WithEventType("AmountDebited").
					WithPayloadField("amount", amount).
					WithPayloadField("newBalance", balance).
					Build()
				account.AddDomainEvent(debitEvent)
			}
		}

		// Generate statement
		events := account.DomainEvents()
		transactions := 0
		for _, event := range events {
			if event.EventType() == "AmountCredited" || event.EventType() == "AmountDebited" {
				transactions++
			}
		}
		_ = transactions

		account.ClearDomainEvents()
	})
}

// =============================================================================
// PERFORMANCE VALIDATION TESTS
// =============================================================================

func TestAggregate_EventCollectionPerformance(t *testing.T) {
	// Validate that event collection operations meet performance requirements
	expectations := testutils.ZeroAllocationExpectation(200 * time.Nanosecond)

	// Single event addition
	testutils.ValidatePerformance(t, "AddDomainEvent", expectations, func() {
		aggregate := NewTestAggregateRoot(NewTestAggregateID("perf-test"))
		event := testutils.NewTestDomainEventBuilder().
			WithEventType("PerfTestEvent").
			Build()
		aggregate.AddDomainEvent(event)
	})

	// Event retrieval
	testutils.ValidatePerformance(t, "DomainEvents", expectations, func() {
		aggregate := NewTestAggregateRoot(NewTestAggregateID("perf-test"))
		_ = aggregate.DomainEvents()
	})

	// Event clearing
	testutils.ValidatePerformance(t, "ClearDomainEvents", expectations, func() {
		aggregate := NewTestAggregateRoot(NewTestAggregateID("perf-test"))
		aggregate.ClearDomainEvents()
	})
}

func TestAggregate_SliceReuseEfficiency(t *testing.T) {
	assertions := testutils.NewAssertions(t)

	aggregate := NewTestAggregateRoot(NewTestAggregateID("reuse-test"))

	// Measure memory growth with slice reuse
	initialMemory := testutils.GetMemStats().TotalAlloc

	// Add events, clear, add again multiple times
	for cycle := 0; cycle < 10; cycle++ {
		for i := 0; i < 20; i++ {
			event := testutils.NewTestDomainEventBuilder().
				WithEventType("ReuseTestEvent").
				WithPayloadField("cycle", cycle).
				WithPayloadField("index", i).
				Build()
			aggregate.AddDomainEvent(event)
		}
		aggregate.ClearDomainEvents()
	}

	finalMemory := testutils.GetMemStats().TotalAlloc
	memoryGrowth := finalMemory - initialMemory

	// Memory growth should be minimal due to slice reuse
	// This is implementation-dependent, but we expect it to be reasonable
	t.Logf("Memory growth with slice reuse: %d bytes", memoryGrowth)

	// Verify that clearing actually resets the slice length
	aggregate.AddDomainEvent(testutils.NewTestDomainEventBuilder().Build())
	assertions.Equal(1, len(aggregate.DomainEvents()), "Should have 1 event after adding")

	aggregate.ClearDomainEvents()
	assertions.Equal(0, len(aggregate.DomainEvents()), "Should have 0 events after clearing")
}

func TestAggregate_ZeroAllocations(t *testing.T) {
	assertions := testutils.NewAssertions(t)

	aggregate := NewTestAggregateRoot(NewTestAggregateID("alloc-test"))

	// Add an initial event
	event := testutils.NewTestDomainEventBuilder().Build()
	aggregate.AddDomainEvent(event)

	// Test that event retrieval has zero allocations
	allocs := testutils.MeasureAllocations(func() {
		_ = aggregate.DomainEvents()
	})
	assertions.Equal(0.0, allocs, "DomainEvents() should have zero allocations")

	// Test that state queries have zero allocations
	allocs = testutils.MeasureAllocations(func() {
		_ = aggregate.ID()
		_ = aggregate.Version()
		_ = aggregate.IsDeleted()
	})
	assertions.Equal(0.0, allocs, "State queries should have zero allocations")

	// Test that clearing events has zero allocations (reuses slice)
	allocs = testutils.MeasureAllocations(func() {
		aggregate.ClearDomainEvents()
	})
	assertions.Equal(0.0, allocs, "ClearDomainEvents() should have zero allocations")
}