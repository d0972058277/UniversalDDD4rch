package domain

import (
	"sync"
	"time"
)

// EntityID is a constraint for entity identifiers - must be comparable
type EntityID interface {
	comparable
}

// IAggregateRoot defines the interface for aggregate roots
type IAggregateRoot[TID EntityID] interface {
	IEntity[TID]
	GetVersion() int64
	GetEvents() []IDomainEvent
	ClearEvents()
}

// AggregateRoot provides base implementation for aggregate roots
type AggregateRoot[TID EntityID] struct {
	Entity[TID]
	version int64
	events  []IDomainEvent
	mutex   sync.RWMutex
}

// NewAggregateRoot creates a new aggregate root with the specified ID
func NewAggregateRoot[TID EntityID](id TID) *AggregateRoot[TID] {
	return &AggregateRoot[TID]{
		Entity:  *NewEntity(id),
		version: 0,
		events:  make([]IDomainEvent, 0),
	}
}

// GetVersion returns the current version for optimistic concurrency control
func (a *AggregateRoot[TID]) GetVersion() int64 {
	a.mutex.RLock()
	defer a.mutex.RUnlock()
	return a.version
}

// GetEvents returns a copy of the domain events
func (a *AggregateRoot[TID]) GetEvents() []IDomainEvent {
	a.mutex.RLock()
	defer a.mutex.RUnlock()

	// Return a copy to maintain immutability
	eventsCopy := make([]IDomainEvent, len(a.events))
	copy(eventsCopy, a.events)
	return eventsCopy
}

// AddEvent adds a domain event to the aggregate
func (a *AggregateRoot[TID]) AddEvent(event IDomainEvent) {
	a.mutex.Lock()
	defer a.mutex.Unlock()

	a.events = append(a.events, event)
}

// ClearEvents removes all domain events from the aggregate
func (a *AggregateRoot[TID]) ClearEvents() {
	a.mutex.Lock()
	defer a.mutex.Unlock()

	a.events = a.events[:0] // Clear slice while keeping capacity
}

// IncrementVersion increments the version for optimistic concurrency control
func (a *AggregateRoot[TID]) IncrementVersion() {
	a.mutex.Lock()
	defer a.mutex.Unlock()

	a.version++
}

// SetVersion sets the version (used by repositories during loading)
func (a *AggregateRoot[TID]) SetVersion(version int64) {
	a.mutex.Lock()
	defer a.mutex.Unlock()

	a.version = version
}

// GetEventsSince returns events that occurred after the specified time
func (a *AggregateRoot[TID]) GetEventsSince(since time.Time) []IDomainEvent {
	a.mutex.RLock()
	defer a.mutex.RUnlock()

	var result []IDomainEvent
	for _, event := range a.events {
		if event.GetOccurredAt().After(since) {
			result = append(result, event)
		}
	}
	return result
}

// GetEventsOfType returns events of the specified type
func (a *AggregateRoot[TID]) GetEventsOfType(eventType string) []IDomainEvent {
	a.mutex.RLock()
	defer a.mutex.RUnlock()

	var result []IDomainEvent
	for _, event := range a.events {
		if event.GetEventType() == eventType {
			result = append(result, event)
		}
	}
	return result
}

// HasUncommittedEvents returns true if there are uncommitted events
func (a *AggregateRoot[TID]) HasUncommittedEvents() bool {
	a.mutex.RLock()
	defer a.mutex.RUnlock()

	return len(a.events) > 0
}

// GetEventCount returns the number of uncommitted events
func (a *AggregateRoot[TID]) GetEventCount() int {
	a.mutex.RLock()
	defer a.mutex.RUnlock()

	return len(a.events)
}