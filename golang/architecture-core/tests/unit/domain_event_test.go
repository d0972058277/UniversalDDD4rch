package unit

import (
	"testing"
	"time"

	"github.com/universalddd/architecture-core/domain"
	testutils "github.com/universalddd/architecture-core/internal/testing"
)

// =============================================================================
// UNIT TESTS FOR DOMAINEVENT METADATA AND CORRELATION/CAUSATION IDS
// Requirements: Event metadata, correlation/causation tracking, immutability
// =============================================================================

// Test domain events
type TestDomainOrderCreatedEvent struct {
	*domain.DomainEventBase
	OrderID    string
	CustomerID string
	Amount     float64
}

func NewTestDomainOrderCreatedEvent(orderID, customerID string, amount float64) *TestDomainOrderCreatedEvent {
	return &TestDomainOrderCreatedEvent{
		DomainEventBase: domain.NewDomainEventBase("OrderCreated"),
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
		DomainEventBase: domain.NewDomainEventBase("OrderPaymentProcessed"),
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
		DomainEventBase: domain.NewDomainEventBase("OrderShipped"),
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

	// When
	event := domain.NewDomainEventBase(eventType)

	// Then
	assertions.NotNil(event, "Event should not be nil")
	assertions.Equal(eventType, event.EventType(), "Event type should match")

	// ID should be generated
	assertions.True(len(event.ID()) > 0, "Event ID should be generated")

	// Timestamp should be recent
	now := time.Now().UTC()
	eventTime := event.OccurredAt()
	timeDiff := now.Sub(eventTime)
	assertions.True(timeDiff >= 0, "Event time should be in the past or now")
	assertions.True(timeDiff < time.Second*5, "Event time should be recent")

	// Default values (correlation and causation IDs are pointers, can be nil)
	var nilStringPtr *string = nil
	assertions.Equal(nilStringPtr, event.CorrelationID(), "Default correlation ID should be nil")
	assertions.Equal(nilStringPtr, event.CausationID(), "Default causation ID should be nil")
	assertions.NotNil(event.Metadata(), "Metadata should not be nil")
	assertions.Equal(0, len(event.Metadata()), "Default metadata should be empty")
}

func TestDomainEvent_Should_CreateWithCorrelationContext_When_NewDomainEventBaseWithCorrelationCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	eventType := "OrderCreated"
	correlationID := "correlation-456"
	causationID := "causation-789"
	metadata := map[string]interface{}{
		"userId":    "user-123",
		"sessionId": "session-456",
		"source":    "web-app",
	}

	// When
	event := domain.NewDomainEventBaseWithCorrelation(eventType, &correlationID, &causationID, metadata)

	// Then
	assertions.NotNil(event, "Event should not be nil")
	assertions.Equal(eventType, event.EventType(), "Event type should match")
	assertions.Equal(correlationID, *event.CorrelationID(), "Correlation ID should match")
	assertions.Equal(causationID, *event.CausationID(), "Causation ID should match")

	eventMetadata := event.Metadata()
	assertions.Equal(3, len(eventMetadata), "Metadata should have 3 items")
	assertions.Equal("user-123", eventMetadata["userId"], "User ID metadata should match")
	assertions.Equal("session-456", eventMetadata["sessionId"], "Session ID metadata should match")
	assertions.Equal("web-app", eventMetadata["source"], "Source metadata should match")
}

func TestDomainEvent_Should_HaveImmutableCorrelationAndCausationIDs_When_CreatedWithContext(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	correlationID := "correlation-123"
	causationID := "causation-456"

	// When
	event := domain.NewDomainEventBaseWithCorrelation("TestEvent", &correlationID, &causationID, nil)

	// Then - correlation and causation IDs should be immutable
	assertions.Equal(correlationID, *event.CorrelationID(), "Correlation ID should match")
	assertions.Equal(causationID, *event.CausationID(), "Causation ID should match")
}

func TestDomainEvent_Should_AddMetadata_When_AddMetadataCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	event := domain.NewDomainEventBase("TestEvent")

	// When
	event.AddMetadata("key1", "value1")
	event.AddMetadata("key2", 42)
	event.AddMetadata("key3", true)

	// Then
	metadata := event.Metadata()
	assertions.Equal(3, len(metadata), "Should have 3 metadata items")
	assertions.Equal("value1", metadata["key1"], "String metadata should match")
	assertions.Equal(42, metadata["key2"], "Integer metadata should match")
	assertions.Equal(true, metadata["key3"], "Boolean metadata should match")
}

func TestDomainEvent_Should_ReturnMetadataCopy_When_MetadataCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	event := domain.NewDomainEventBase("TestEvent")
	event.AddMetadata("key1", "value1")
	event.AddMetadata("key2", "value2")

	// When
	metadata1 := event.Metadata()
	metadata2 := event.Metadata()

	// Modify one of the returned maps
	metadata1["key3"] = "value3"
	delete(metadata1, "key1")

	// Then
	// Original event metadata should be unchanged
	metadata3 := event.Metadata()
	assertions.Equal(2, len(metadata3), "Original metadata should have 2 items")
	assertions.Equal("value1", metadata3["key1"], "Original metadata should be preserved")
	assertions.Equal("value2", metadata3["key2"], "Original metadata should be preserved")

	// Second call should return original metadata
	assertions.Equal(2, len(metadata2), "Second call should return original metadata")
	assertions.Equal("value1", metadata2["key1"], "Second call should have original values")
}

func TestDomainEvent_Should_CompareTimestamps_When_EventsCreatedAtDifferentTimes(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	event1 := domain.NewDomainEventBase("Event1")

	// Wait to ensure different timestamps
	time.Sleep(time.Millisecond * 10)

	event2 := domain.NewDomainEventBase("Event2")

	// When & Then
	assertions.True(event2.OccurredAt().After(event1.OccurredAt()), "Event2 should be more recent than Event1")
	assertions.False(event1.OccurredAt().After(event2.OccurredAt()), "Event1 should not be more recent than Event2")
	assertions.False(event1.OccurredAt().After(event1.OccurredAt()), "Event should not be more recent than itself")
}

// Additional tests for domain events can be added here as needed