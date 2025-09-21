package contract

import (
	"testing"

	"github.com/universalddd/architecture-core-go/pkg/domain"
)

// TestAggregateRoot_Should_ManageVersionAndEvents_When_StateChanges
func TestAggregateRoot_Should_ManageVersionAndEvents_When_StateChanges(t *testing.T) {
	t.Run("Should_InitializeWithZeroVersion_When_Created", func(t *testing.T) {
		// Given: A new aggregate root
		// When: Creating aggregate root
		aggregate := domain.NewTestAggregate("agg-001")

		// Then: Version should be 0
		if aggregate.GetVersion() != 0 {
			t.Errorf("Expected version 0, got %d", aggregate.GetVersion())
		}
	})

	t.Run("Should_CollectDomainEvents_When_EventsAdded", func(t *testing.T) {
		// Given: An aggregate root
		aggregate := domain.NewTestAggregate("agg-002")

		// When: Adding domain events
		event1 := domain.NewTestEvent("event-1")
		event2 := domain.NewTestEvent("event-2")
		aggregate.AddTestEvent(event1)
		aggregate.AddTestEvent(event2)

		// Then: Events should be collected
		events := aggregate.GetEvents()
		if len(events) != 2 {
			t.Errorf("Expected 2 events, got %d", len(events))
		}
	})

	t.Run("Should_ClearEvents_When_ClearEventsCalled", func(t *testing.T) {
		// Given: An aggregate with events
		aggregate := domain.NewTestAggregate("agg-003")
		aggregate.AddTestEvent(domain.NewTestEvent("event-1"))

		// When: Clearing events
		aggregate.ClearEvents()

		// Then: Events collection should be empty
		events := aggregate.GetEvents()
		if len(events) != 0 {
			t.Errorf("Expected 0 events after clearing, got %d", len(events))
		}
	})

	t.Run("Should_IncrementVersion_When_StateModified", func(t *testing.T) {
		// Given: An aggregate root
		aggregate := domain.NewTestAggregate("agg-004")
		originalVersion := aggregate.GetVersion()

		// When: Modifying state (triggering version increment)
		aggregate.ModifyState("new-state")

		// Then: Version should be incremented
		newVersion := aggregate.GetVersion()
		if newVersion != originalVersion+1 {
			t.Errorf("Expected version %d, got %d", originalVersion+1, newVersion)
		}
	})

	t.Run("Should_ExtendEntity_When_ImplementingInterface", func(t *testing.T) {
		// Given: An aggregate root
		aggregate := domain.NewTestAggregate("agg-005")

		// When: Accessing entity properties
		id := aggregate.GetID()

		// Then: Should have entity behavior
		if id != "agg-005" {
			t.Errorf("Expected ID 'agg-005', got '%s'", id)
		}
	})
}