package contract

import (
	"testing"
	"time"

	"github.com/universalddd/architecture-core-go/pkg/domain"
)

// TestDomainEvent_Should_ProvideMetadataAndTraceability_When_Created
func TestDomainEvent_Should_ProvideMetadataAndTraceability_When_Created(t *testing.T) {
	t.Run("Should_HaveUniqueID_When_Created", func(t *testing.T) {
		// Given: Creating multiple domain events
		event1 := domain.NewTestEvent("test-event-1")
		event2 := domain.NewTestEvent("test-event-2")

		// When: Getting event IDs
		id1 := event1.GetID()
		id2 := event2.GetID()

		// Then: IDs should be unique
		if id1 == id2 {
			t.Error("Domain events should have unique IDs")
		}
	})

	t.Run("Should_CaptureOccurredAt_When_Created", func(t *testing.T) {
		// Given: Current time before event creation
		beforeCreation := time.Now()

		// When: Creating domain event
		event := domain.NewTestEvent("timed-event")
		occurredAt := event.GetOccurredAt()

		// Then: OccurredAt should be close to creation time
		afterCreation := time.Now()
		if occurredAt.Before(beforeCreation) || occurredAt.After(afterCreation) {
			t.Error("OccurredAt should be set to creation time")
		}
	})

	t.Run("Should_SupportCorrelationID_When_Provided", func(t *testing.T) {
		// Given: A correlation ID
		correlationID := "correlation-123"

		// When: Creating event with correlation ID
		event := domain.NewTestEventWithCorrelation("correlated-event", correlationID)

		// Then: Should store correlation ID
		if event.GetCorrelationID() != correlationID {
			t.Errorf("Expected correlation ID '%s', got '%s'", correlationID, event.GetCorrelationID())
		}
	})

	t.Run("Should_SupportCausationID_When_Provided", func(t *testing.T) {
		// Given: A causation ID
		causationID := "causation-456"

		// When: Creating event with causation ID
		event := domain.NewTestEventWithCausation("caused-event", causationID)

		// Then: Should store causation ID
		if event.GetCausationID() != causationID {
			t.Errorf("Expected causation ID '%s', got '%s'", causationID, event.GetCausationID())
		}
	})

	t.Run("Should_SupportMetadata_When_Provided", func(t *testing.T) {
		// Given: Metadata for event
		metadata := map[string]interface{}{
			"userId":    "user-123",
			"sessionId": "session-456",
			"source":    "web-app",
		}

		// When: Creating event with metadata
		event := domain.NewTestEventWithMetadata("metadata-event", metadata)

		// Then: Should store and return metadata
		storedMetadata := event.GetMetadata()
		if len(storedMetadata) != len(metadata) {
			t.Error("Metadata should be stored completely")
		}

		for key, value := range metadata {
			if storedMetadata[key] != value {
				t.Errorf("Metadata key '%s' expected '%v', got '%v'", key, value, storedMetadata[key])
			}
		}
	})

	t.Run("Should_HandleEmptyMetadata_When_NotProvided", func(t *testing.T) {
		// Given: Creating event without metadata
		event := domain.NewTestEvent("no-metadata-event")

		// When: Getting metadata
		metadata := event.GetMetadata()

		// Then: Should return empty metadata (not nil)
		if metadata == nil {
			t.Error("Metadata should not be nil")
		}
		if len(metadata) != 0 {
			t.Error("Metadata should be empty when not provided")
		}
	})

	t.Run("Should_SupportChainedCausation_When_EventsCascade", func(t *testing.T) {
		// Given: Initial event
		event1 := domain.NewTestEvent("initial-event")
		event1ID := event1.GetID()

		// When: Creating cascaded event with first event as causation
		event2 := domain.NewTestEventWithCausation("cascaded-event", event1ID)

		// Then: Should maintain causation chain
		if event2.GetCausationID() != event1ID {
			t.Error("Cascaded event should reference causing event ID")
		}
	})
}