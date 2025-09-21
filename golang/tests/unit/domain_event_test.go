package unit

import (
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/universalddd/architecture-core-go/pkg/domain"
	testutils "github.com/universalddd/architecture-core-go/internal/testing"
)

// =============================================================================
// UNIT TESTS FOR DOMAINEVENT METADATA AND CORRELATION/CAUSATION IDS
// Requirements: Event metadata, correlation/causation tracking, immutability
// =============================================================================

// Test domain events
type TestOrderCreatedEvent struct {
	*domain.DomainEventBase
	OrderID    string
	CustomerID string
	Amount     float64
}

func NewTestOrderCreatedEvent(orderID, customerID string, amount float64) *TestOrderCreatedEvent {
	return &TestOrderCreatedEvent{
		DomainEventBase: domain.NewDomainEventBase("OrderCreated", orderID, "Order"),
		OrderID:         orderID,
		CustomerID:      customerID,
		Amount:          amount,
	}
}

type TestOrderPaymentProcessedEvent struct {
	*domain.DomainEventBase
	OrderID       string
	PaymentID     string
	AmountPaid    float64
	PaymentMethod string
}

func NewTestOrderPaymentProcessedEvent(orderID, paymentID string, amountPaid float64, paymentMethod string) *TestOrderPaymentProcessedEvent {
	return &TestOrderPaymentProcessedEvent{
		DomainEventBase: domain.NewDomainEventBase("OrderPaymentProcessed", orderID, "Order"),
		OrderID:         orderID,
		PaymentID:       paymentID,
		AmountPaid:      amountPaid,
		PaymentMethod:   paymentMethod,
	}
}

type TestOrderShippedEvent struct {
	*domain.DomainEventBase
	OrderID        string
	TrackingNumber string
	ShippingMethod string
	EstimatedDate  time.Time
}

func NewTestOrderShippedEvent(orderID, trackingNumber, shippingMethod string, estimatedDate time.Time) *TestOrderShippedEvent {
	return &TestOrderShippedEvent{
		DomainEventBase: domain.NewDomainEventBase("OrderShipped", orderID, "Order"),
		OrderID:         orderID,
		TrackingNumber:  trackingNumber,
		ShippingMethod:  shippingMethod,
		EstimatedDate:   estimatedDate,
	}
}

func TestDomainEvent_Should_CreateWithBasicProperties_When_NewDomainEventBaseCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	eventType := "OrderCreated"
	aggregateID := "order-123"
	aggregateType := "Order"

	// When
	event := domain.NewDomainEventBase(eventType, aggregateID, aggregateType)

	// Then
	assertions.NotNil(event, "Event should not be nil")
	assertions.Equal(eventType, event.GetEventType(), "Event type should match")
	assertions.Equal(aggregateID, event.GetAggregateID(), "Aggregate ID should match")
	assertions.Equal(aggregateType, event.GetAggregateType(), "Aggregate type should match")

	// UUID should be generated
	assertions.True(len(string(event.GetID())) > 0, "Event ID should be generated")
	assertions.True(strings.Contains(string(event.GetID()), "-"), "Event ID should be UUID format")

	// Timestamp should be recent
	now := time.Now().UTC()
	eventTime := event.GetOccurredAt()
	timeDiff := now.Sub(eventTime)
	assertions.True(timeDiff >= 0, "Event time should be in the past or now")
	assertions.True(timeDiff < time.Second*5, "Event time should be recent")

	// Default values
	assertions.Equal("", event.GetCorrelationID(), "Default correlation ID should be empty")
	assertions.Equal("", event.GetCausationID(), "Default causation ID should be empty")
	assertions.NotNil(event.GetMetadata(), "Metadata should not be nil")
	assertions.Equal(0, len(event.GetMetadata()), "Default metadata should be empty")
}

func TestDomainEvent_Should_CreateWithCorrelationContext_When_NewDomainEventBaseWithCorrelationCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	eventType := "OrderCreated"
	aggregateID := "order-123"
	aggregateType := "Order"
	correlationID := "correlation-456"
	causationID := "causation-789"
	metadata := map[string]interface{}{
		"userId":    "user-123",
		"sessionId": "session-456",
		"source":    "web-app",
	}

	// When
	event := domain.NewDomainEventBaseWithCorrelation(eventType, aggregateID, aggregateType, correlationID, causationID, metadata)

	// Then
	assertions.NotNil(event, "Event should not be nil")
	assertions.Equal(eventType, event.GetEventType(), "Event type should match")
	assertions.Equal(aggregateID, event.GetAggregateID(), "Aggregate ID should match")
	assertions.Equal(aggregateType, event.GetAggregateType(), "Aggregate type should match")
	assertions.Equal(correlationID, event.GetCorrelationID(), "Correlation ID should match")
	assertions.Equal(causationID, event.GetCausationID(), "Causation ID should match")

	eventMetadata := event.GetMetadata()
	assertions.Equal(3, len(eventMetadata), "Metadata should have 3 items")
	assertions.Equal("user-123", eventMetadata["userId"], "User ID metadata should match")
	assertions.Equal("session-456", eventMetadata["sessionId"], "Session ID metadata should match")
	assertions.Equal("web-app", eventMetadata["source"], "Source metadata should match")
}

func TestDomainEvent_Should_ModifyCorrelationID_When_SetCorrelationIDCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	event := domain.NewDomainEventBase("TestEvent", "aggregate-123", "TestAggregate")
	newCorrelationID := "new-correlation-123"

	// When
	event.SetCorrelationID(newCorrelationID)

	// Then
	assertions.Equal(newCorrelationID, event.GetCorrelationID(), "Correlation ID should be updated")
}

func TestDomainEvent_Should_ModifyCausationID_When_SetCausationIDCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	event := domain.NewDomainEventBase("TestEvent", "aggregate-123", "TestAggregate")
	newCausationID := "new-causation-123"

	// When
	event.SetCausationID(newCausationID)

	// Then
	assertions.Equal(newCausationID, event.GetCausationID(), "Causation ID should be updated")
}

func TestDomainEvent_Should_AddMetadata_When_AddMetadataCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	event := domain.NewDomainEventBase("TestEvent", "aggregate-123", "TestAggregate")

	// When
	event.AddMetadata("key1", "value1")
	event.AddMetadata("key2", 42)
	event.AddMetadata("key3", true)

	// Then
	metadata := event.GetMetadata()
	assertions.Equal(3, len(metadata), "Should have 3 metadata items")
	assertions.Equal("value1", metadata["key1"], "String metadata should match")
	assertions.Equal(42, metadata["key2"], "Integer metadata should match")
	assertions.Equal(true, metadata["key3"], "Boolean metadata should match")
}

func TestDomainEvent_Should_ReplaceMetadata_When_SetMetadataCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	event := domain.NewDomainEventBase("TestEvent", "aggregate-123", "TestAggregate")

	// Add initial metadata
	event.AddMetadata("initial", "value")

	newMetadata := map[string]interface{}{
		"replaced": "metadata",
		"count":    5,
		"active":   false,
	}

	// When
	event.SetMetadata(newMetadata)

	// Then
	metadata := event.GetMetadata()
	assertions.Equal(3, len(metadata), "Should have 3 metadata items")
	assertions.Equal("metadata", metadata["replaced"], "Replaced metadata should match")
	assertions.Equal(5, metadata["count"], "Count metadata should match")
	assertions.Equal(false, metadata["active"], "Active metadata should match")

	// Original metadata should be gone
	_, exists := metadata["initial"]
	assertions.False(exists, "Initial metadata should be replaced")
}

func TestDomainEvent_Should_HandleNilMetadata_When_SetMetadataCalledWithNil(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	event := domain.NewDomainEventBase("TestEvent", "aggregate-123", "TestAggregate")

	// Add initial metadata
	event.AddMetadata("initial", "value")

	// When
	event.SetMetadata(nil)

	// Then
	metadata := event.GetMetadata()
	assertions.Equal(0, len(metadata), "Metadata should be empty")
	assertions.NotNil(metadata, "Metadata should not be nil")
}

func TestDomainEvent_Should_ReturnMetadataCopy_When_GetMetadataCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	event := domain.NewDomainEventBase("TestEvent", "aggregate-123", "TestAggregate")
	event.AddMetadata("key1", "value1")
	event.AddMetadata("key2", "value2")

	// When
	metadata1 := event.GetMetadata()
	metadata2 := event.GetMetadata()

	// Modify one of the returned maps
	metadata1["key3"] = "value3"
	delete(metadata1, "key1")

	// Then
	// Original event metadata should be unchanged
	metadata3 := event.GetMetadata()
	assertions.Equal(2, len(metadata3), "Original metadata should have 2 items")
	assertions.Equal("value1", metadata3["key1"], "Original metadata should be preserved")
	assertions.Equal("value2", metadata3["key2"], "Original metadata should be preserved")

	// Second call should return original metadata
	assertions.Equal(2, len(metadata2), "Second call should return original metadata")
	assertions.Equal("value1", metadata2["key1"], "Second call should have original values")
}

func TestDomainEvent_Should_GenerateStringRepresentation_When_StringCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	event := domain.NewDomainEventBase("OrderCreated", "order-123", "Order")

	// When
	str := event.String()

	// Then
	assertions.True(len(str) > 0, "String representation should not be empty")
	assertions.Contains(str, "OrderCreated", "String should contain event type")
	assertions.Contains(str, "order-123", "String should contain aggregate ID")
	assertions.Contains(str, string(event.GetID()), "String should contain event ID")
}

func TestDomainEvent_Should_CompareTimestamps_When_IsMoreRecentThanCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	event1 := domain.NewDomainEventBase("Event1", "aggregate-123", "TestAggregate")

	// Wait to ensure different timestamps
	time.Sleep(time.Millisecond * 10)

	event2 := domain.NewDomainEventBase("Event2", "aggregate-123", "TestAggregate")

	// When & Then
	assertions.True(event2.IsMoreRecentThan(event1), "Event2 should be more recent than Event1")
	assertions.False(event1.IsMoreRecentThan(event2), "Event1 should not be more recent than Event2")
	assertions.False(event1.IsMoreRecentThan(event1), "Event should not be more recent than itself")
}

func TestDomainEvent_Should_CheckAggregateRelation_When_IsSameAggregateCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	event1 := domain.NewDomainEventBase("Event1", "order-123", "Order")
	event2 := domain.NewDomainEventBase("Event2", "order-123", "Order")
	event3 := domain.NewDomainEventBase("Event3", "order-456", "Order")
	event4 := domain.NewDomainEventBase("Event4", "order-123", "Product")

	// When & Then
	assertions.True(event1.IsSameAggregate(event2), "Events with same aggregate ID and type should be from same aggregate")
	assertions.False(event1.IsSameAggregate(event3), "Events with different aggregate ID should not be from same aggregate")
	assertions.False(event1.IsSameAggregate(event4), "Events with different aggregate type should not be from same aggregate")
	assertions.True(event1.IsSameAggregate(event1), "Event should be from same aggregate as itself")
}

func TestDomainEvent_Should_CheckCorrelationRelation_When_IsRelatedToCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	correlationID := "correlation-123"

	event1 := domain.NewDomainEventBaseWithCorrelation("Event1", "aggregate-1", "Type1", correlationID, "", nil)
	event2 := domain.NewDomainEventBaseWithCorrelation("Event2", "aggregate-2", "Type2", correlationID, "", nil)
	event3 := domain.NewDomainEventBaseWithCorrelation("Event3", "aggregate-3", "Type3", "different-correlation", "", nil)
	event4 := domain.NewDomainEventBase("Event4", "aggregate-4", "Type4") // No correlation ID

	// When & Then
	assertions.True(event1.IsRelatedTo(event2), "Events with same correlation ID should be related")
	assertions.True(event2.IsRelatedTo(event1), "Relation should be symmetric")
	assertions.False(event1.IsRelatedTo(event3), "Events with different correlation IDs should not be related")
	assertions.False(event1.IsRelatedTo(event4), "Events with missing correlation ID should not be related")
	assertions.False(event4.IsRelatedTo(event1), "Events with missing correlation ID should not be related")
}

func TestDomainEvent_Should_CheckCausationRelation_When_IsCausedByCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	causingEvent := domain.NewDomainEventBase("CausingEvent", "aggregate-1", "Type1")
	causationID := string(causingEvent.GetID())

	causedEvent := domain.NewDomainEventBaseWithCorrelation("CausedEvent", "aggregate-2", "Type2", "", causationID, nil)
	unrelatedEvent := domain.NewDomainEventBase("UnrelatedEvent", "aggregate-3", "Type3")

	// When & Then
	assertions.True(causedEvent.IsCausedBy(causingEvent), "Event with causation ID should be caused by the causing event")
	assertions.False(unrelatedEvent.IsCausedBy(causingEvent), "Unrelated event should not be caused by the causing event")
	assertions.False(causingEvent.IsCausedBy(causedEvent), "Causing event should not be caused by caused event")
	assertions.False(causedEvent.IsCausedBy(causedEvent), "Event should not be caused by itself")
}

func TestDomainEvent_Should_SupportEventChaining_When_EventsCausedByOtherEvents(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	correlationID := "workflow-123"

	// Create event chain: Order Created -> Payment Processed -> Order Shipped
	orderCreated := domain.NewDomainEventBaseWithCorrelation(
		"OrderCreated",
		"order-123",
		"Order",
		correlationID,
		"",
		map[string]interface{}{"step": 1},
	)

	time.Sleep(time.Millisecond) // Ensure different timestamps

	paymentProcessed := domain.NewDomainEventBaseWithCorrelation(
		"PaymentProcessed",
		"payment-456",
		"Payment",
		correlationID,
		string(orderCreated.GetID()),
		map[string]interface{}{"step": 2, "orderEventId": string(orderCreated.GetID())},
	)

	time.Sleep(time.Millisecond) // Ensure different timestamps

	orderShipped := domain.NewDomainEventBaseWithCorrelation(
		"OrderShipped",
		"order-123",
		"Order",
		correlationID,
		string(paymentProcessed.GetID()),
		map[string]interface{}{"step": 3, "paymentEventId": string(paymentProcessed.GetID())},
	)

	// When & Then - Causation chain
	assertions.True(paymentProcessed.IsCausedBy(orderCreated), "Payment should be caused by order creation")
	assertions.True(orderShipped.IsCausedBy(paymentProcessed), "Shipping should be caused by payment")
	assertions.False(orderShipped.IsCausedBy(orderCreated), "Shipping should not be directly caused by order creation")

	// When & Then - Correlation
	assertions.True(orderCreated.IsRelatedTo(paymentProcessed), "All events should be correlated")
	assertions.True(orderCreated.IsRelatedTo(orderShipped), "All events should be correlated")
	assertions.True(paymentProcessed.IsRelatedTo(orderShipped), "All events should be correlated")

	// When & Then - Temporal ordering
	assertions.True(paymentProcessed.IsMoreRecentThan(orderCreated), "Payment should be more recent than order creation")
	assertions.True(orderShipped.IsMoreRecentThan(paymentProcessed), "Shipping should be more recent than payment")
	assertions.True(orderShipped.IsMoreRecentThan(orderCreated), "Shipping should be more recent than order creation")

	// When & Then - Metadata
	orderMetadata := orderCreated.GetMetadata()
	paymentMetadata := paymentProcessed.GetMetadata()
	shippingMetadata := orderShipped.GetMetadata()

	assertions.Equal(1, orderMetadata["step"], "Order should be step 1")
	assertions.Equal(2, paymentMetadata["step"], "Payment should be step 2")
	assertions.Equal(3, shippingMetadata["step"], "Shipping should be step 3")
}

func TestDomainEvent_Should_HandleComplexMetadata_When_RichDataProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	complexMetadata := map[string]interface{}{
		"userId":    "user-123",
		"timestamp": time.Now().Unix(),
		"source":    "mobile-app",
		"version":   "2.1.0",
		"location": map[string]interface{}{
			"country": "US",
			"state":   "CA",
			"city":    "San Francisco",
			"coords": map[string]float64{
				"lat": 37.7749,
				"lng": -122.4194,
			},
		},
		"tags":     []string{"urgent", "customer-initiated", "mobile"},
		"metrics":  map[string]float64{"processingTime": 1.23, "priority": 9.5},
		"features": []map[string]interface{}{
			{"name": "feature1", "enabled": true},
			{"name": "feature2", "enabled": false},
		},
	}

	event := domain.NewDomainEventBaseWithCorrelation(
		"ComplexEvent",
		"aggregate-123",
		"TestAggregate",
		"correlation-456",
		"causation-789",
		complexMetadata,
	)

	// When
	retrievedMetadata := event.GetMetadata()

	// Then
	assertions.Equal(7, len(retrievedMetadata), "Should have 7 metadata items")
	assertions.Equal("user-123", retrievedMetadata["userId"], "User ID should match")
	assertions.Equal("mobile-app", retrievedMetadata["source"], "Source should match")

	// Nested map
	location := retrievedMetadata["location"].(map[string]interface{})
	assertions.Equal("US", location["country"], "Country should match")
	coords := location["coords"].(map[string]float64)
	assertions.Equal(37.7749, coords["lat"], "Latitude should match")

	// Slice
	tags := retrievedMetadata["tags"].([]string)
	assertions.Equal(3, len(tags), "Should have 3 tags")
	assertions.Equal("urgent", tags[0], "First tag should match")

	// Complex nested slice
	features := retrievedMetadata["features"].([]map[string]interface{})
	assertions.Equal(2, len(features), "Should have 2 features")
	assertions.Equal("feature1", features[0]["name"], "Feature name should match")
	assertions.Equal(true, features[0]["enabled"], "Feature enabled should match")
}

func TestDomainEvent_Should_HandleConcurrentAccess_When_AccessedFromMultipleGoroutines(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	event := domain.NewDomainEventBaseWithCorrelation(
		"ConcurrentEvent",
		"aggregate-123",
		"TestAggregate",
		"correlation-456",
		"causation-789",
		map[string]interface{}{
			"key1": "value1",
			"key2": "value2",
		},
	)

	const numGoroutines = 10
	done := make(chan bool, numGoroutines)

	// When - access event concurrently
	for i := 0; i < numGoroutines; i++ {
		go func(index int) {
			defer func() { done <- true }()

			// Read operations should be safe
			id := event.GetID()
			eventType := event.GetEventType()
			aggregateID := event.GetAggregateID()
			aggregateType := event.GetAggregateType()
			occurredAt := event.GetOccurredAt()
			correlationID := event.GetCorrelationID()
			causationID := event.GetCausationID()
			metadata := event.GetMetadata()
			str := event.String()

			// Verify consistency
			if len(string(id)) == 0 {
				t.Errorf("Goroutine %d: ID should not be empty", index)
			}
			if eventType != "ConcurrentEvent" {
				t.Errorf("Goroutine %d: Event type consistency failed", index)
			}
			if aggregateID != "aggregate-123" {
				t.Errorf("Goroutine %d: Aggregate ID consistency failed", index)
			}
			if aggregateType != "TestAggregate" {
				t.Errorf("Goroutine %d: Aggregate type consistency failed", index)
			}
			if occurredAt.IsZero() {
				t.Errorf("Goroutine %d: Occurred at should not be zero", index)
			}
			if correlationID != "correlation-456" {
				t.Errorf("Goroutine %d: Correlation ID consistency failed", index)
			}
			if causationID != "causation-789" {
				t.Errorf("Goroutine %d: Causation ID consistency failed", index)
			}
			if len(metadata) != 2 {
				t.Errorf("Goroutine %d: Metadata length consistency failed", index)
			}
			if len(str) == 0 {
				t.Errorf("Goroutine %d: String representation should not be empty", index)
			}
		}(i)
	}

	// Wait for all goroutines
	for i := 0; i < numGoroutines; i++ {
		<-done
	}

	// Then - Event should remain consistent
	assertions.Equal("ConcurrentEvent", event.GetEventType(), "Event type should remain consistent")
	assertions.Equal("correlation-456", event.GetCorrelationID(), "Correlation ID should remain consistent")
}

func TestDomainEvent_Should_HandleMetadataModification_When_ModifiedConcurrently(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	event := domain.NewDomainEventBase("ConcurrentMetadataEvent", "aggregate-123", "TestAggregate")

	const numGoroutines = 5
	const modificationsPerGoroutine = 10
	var wg sync.WaitGroup
	wg.Add(numGoroutines)

	// When - modify metadata concurrently
	for i := 0; i < numGoroutines; i++ {
		go func(goroutineID int) {
			defer wg.Done()

			for j := 0; j < modificationsPerGoroutine; j++ {
				key := fmt.Sprintf("g%d-key%d", goroutineID, j)
				value := fmt.Sprintf("g%d-value%d", goroutineID, j)
				event.AddMetadata(key, value)
			}
		}(i)
	}

	wg.Wait()

	// Then
	metadata := event.GetMetadata()
	expectedCount := numGoroutines * modificationsPerGoroutine
	assertions.Equal(expectedCount, len(metadata), "Should have all metadata items")

	// Verify all expected keys are present
	for i := 0; i < numGoroutines; i++ {
		for j := 0; j < modificationsPerGoroutine; j++ {
			key := fmt.Sprintf("g%d-key%d", i, j)
			expectedValue := fmt.Sprintf("g%d-value%d", i, j)
			actualValue, exists := metadata[key]
			assertions.True(exists, fmt.Sprintf("Key %s should exist", key))
			assertions.Equal(expectedValue, actualValue, fmt.Sprintf("Value for key %s should match", key))
		}
	}
}

func TestDomainEvent_Should_HandleEdgeCases_When_UnusualValuesProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)

	// Empty strings
	event1 := domain.NewDomainEventBase("", "", "")
	assertions.Equal("", event1.GetEventType(), "Empty event type should be preserved")
	assertions.Equal("", event1.GetAggregateID(), "Empty aggregate ID should be preserved")
	assertions.Equal("", event1.GetAggregateType(), "Empty aggregate type should be preserved")

	// Very long strings
	longString := strings.Repeat("a", 1000)
	event2 := domain.NewDomainEventBase(longString, longString, longString)
	assertions.Equal(longString, event2.GetEventType(), "Long event type should be preserved")
	assertions.Equal(longString, event2.GetAggregateID(), "Long aggregate ID should be preserved")
	assertions.Equal(longString, event2.GetAggregateType(), "Long aggregate type should be preserved")

	// Special characters
	specialString := "!@#$%^&*()_+-=[]{}|;:,.<>?/~`"
	event3 := domain.NewDomainEventBase(specialString, specialString, specialString)
	assertions.Equal(specialString, event3.GetEventType(), "Special character event type should be preserved")

	// Unicode characters
	unicodeString := "测试事件-🎉-äöü"
	event4 := domain.NewDomainEventBase(unicodeString, unicodeString, unicodeString)
	assertions.Equal(unicodeString, event4.GetEventType(), "Unicode event type should be preserved")

	// Nil metadata handling
	event5 := domain.NewDomainEventBaseWithCorrelation("Test", "agg", "Type", "corr", "caus", nil)
	metadata5 := event5.GetMetadata()
	assertions.NotNil(metadata5, "Metadata should not be nil when nil provided")
	assertions.Equal(0, len(metadata5), "Metadata should be empty when nil provided")
}

// =============================================================================
// BUSINESS SCENARIO TESTS
// =============================================================================

func TestDomainEvent_Should_SupportOrderProcessingWorkflow_When_RealBusinessEventsUsed(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	correlationID := "order-workflow-123"
	orderID := "order-456"
	customerID := "customer-789"

	// Scenario: Customer places order, payment is processed, order is shipped

	// When - Order created
	orderCreated := NewTestOrderCreatedEvent(orderID, customerID, 199.99)
	orderCreated.SetCorrelationID(correlationID)
	orderCreated.AddMetadata("customerSegment", "premium")
	orderCreated.AddMetadata("channel", "web")

	// When - Payment processed (caused by order creation)
	time.Sleep(time.Millisecond * 10)
	paymentProcessed := NewTestOrderPaymentProcessedEvent(orderID, "payment-123", 199.99, "credit_card")
	paymentProcessed.SetCorrelationID(correlationID)
	paymentProcessed.SetCausationID(string(orderCreated.GetID()))
	paymentProcessed.AddMetadata("processor", "stripe")
	paymentProcessed.AddMetadata("last4", "1234")

	// When - Order shipped (caused by payment processing)
	time.Sleep(time.Millisecond * 10)
	estimatedDelivery := time.Now().Add(time.Hour * 48)
	orderShipped := NewTestOrderShippedEvent(orderID, "TRACK123", "express", estimatedDelivery)
	orderShipped.SetCorrelationID(correlationID)
	orderShipped.SetCausationID(string(paymentProcessed.GetID()))
	orderShipped.AddMetadata("warehouse", "west-coast")
	orderShipped.AddMetadata("carrier", "fedex")

	// Then - Verify event properties
	assertions.Equal("OrderCreated", orderCreated.GetEventType(), "Order created event type should match")
	assertions.Equal("OrderPaymentProcessed", paymentProcessed.GetEventType(), "Payment processed event type should match")
	assertions.Equal("OrderShipped", orderShipped.GetEventType(), "Order shipped event type should match")

	// Then - Verify correlation
	assertions.True(orderCreated.IsRelatedTo(paymentProcessed), "Order created and payment should be correlated")
	assertions.True(paymentProcessed.IsRelatedTo(orderShipped), "Payment and shipping should be correlated")
	assertions.True(orderCreated.IsRelatedTo(orderShipped), "Order created and shipping should be correlated")

	// Then - Verify causation chain
	assertions.True(paymentProcessed.IsCausedBy(orderCreated), "Payment should be caused by order creation")
	assertions.True(orderShipped.IsCausedBy(paymentProcessed), "Shipping should be caused by payment")
	assertions.False(orderShipped.IsCausedBy(orderCreated), "Shipping should not be directly caused by order creation")

	// Then - Verify temporal ordering
	assertions.True(paymentProcessed.IsMoreRecentThan(orderCreated), "Payment should be after order creation")
	assertions.True(orderShipped.IsMoreRecentThan(paymentProcessed), "Shipping should be after payment")

	// Then - Verify aggregate relationships
	assertions.True(orderCreated.IsSameAggregate(orderShipped), "Order created and shipped should be from same aggregate")
	assertions.False(orderCreated.IsSameAggregate(paymentProcessed), "Order and payment should be from different aggregates")

	// Then - Verify business data
	assertions.Equal(orderID, orderCreated.OrderID, "Order ID should match")
	assertions.Equal(customerID, orderCreated.CustomerID, "Customer ID should match")
	assertions.Equal(199.99, orderCreated.Amount, "Order amount should match")
	assertions.Equal("TRACK123", orderShipped.TrackingNumber, "Tracking number should match")

	// Then - Verify metadata
	orderMetadata := orderCreated.GetMetadata()
	paymentMetadata := paymentProcessed.GetMetadata()
	shippingMetadata := orderShipped.GetMetadata()

	assertions.Equal("premium", orderMetadata["customerSegment"], "Customer segment should match")
	assertions.Equal("stripe", paymentMetadata["processor"], "Payment processor should match")
	assertions.Equal("fedex", shippingMetadata["carrier"], "Carrier should match")
}

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================

func TestDomainEvent_Should_CreateEventsEfficiently_When_ManyEventsCreated(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	const numEvents = 1000

	// When - create many events
	start := time.Now()
	events := make([]domain.IDomainEvent, numEvents)
	for i := 0; i < numEvents; i++ {
		events[i] = domain.NewDomainEventBase(
			fmt.Sprintf("Event%d", i),
			fmt.Sprintf("aggregate-%d", i),
			"TestAggregate",
		)
	}
	duration := time.Since(start)

	// Then
	assertions.Equal(numEvents, len(events), "Should have created all events")
	assertions.True(duration < time.Second, "Event creation should be fast")

	// Verify all events have unique IDs
	seenIDs := make(map[string]bool)
	for _, event := range events {
		id := string(event.GetID())
		assertions.False(seenIDs[id], "Event IDs should be unique")
		seenIDs[id] = true
		assertions.True(len(id) > 0, "Event ID should not be empty")
	}
}

func TestDomainEvent_Should_HandleMetadataOperationsEfficiently_When_ManyOperationsPerformed(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	event := domain.NewDomainEventBase("PerformanceEvent", "aggregate-123", "TestAggregate")
	const numOperations = 1000

	// When - add many metadata items
	start := time.Now()
	for i := 0; i < numOperations; i++ {
		event.AddMetadata(fmt.Sprintf("key%d", i), fmt.Sprintf("value%d", i))
	}
	addDuration := time.Since(start)

	// When - retrieve metadata many times
	start = time.Now()
	for i := 0; i < numOperations; i++ {
		_ = event.GetMetadata()
	}
	getDuration := time.Since(start)

	// Then
	assertions.True(addDuration < time.Second, "Adding metadata should be fast")
	assertions.True(getDuration < time.Millisecond*100, "Getting metadata should be fast")

	metadata := event.GetMetadata()
	assertions.Equal(numOperations, len(metadata), "Should have all metadata items")
}