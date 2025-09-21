package domain

import (
	"crypto/rand"
	"fmt"
	"time"
)

// UUID represents a universally unique identifier using string
type UUID string

// generateUUID creates a new UUID using crypto/rand
func generateUUID() UUID {
	bytes := make([]byte, 16)
	rand.Read(bytes)

	// Set version (4) and variant bits
	bytes[6] = (bytes[6] & 0x0f) | 0x40 // Version 4
	bytes[8] = (bytes[8] & 0x3f) | 0x80 // Variant 10

	return UUID(fmt.Sprintf("%x-%x-%x-%x-%x",
		bytes[0:4], bytes[4:6], bytes[6:8], bytes[8:10], bytes[10:16]))
}

// String returns the string representation of the UUID
func (u UUID) String() string {
	return string(u)
}

// IDomainEvent defines the interface for domain events
type IDomainEvent interface {
	GetID() UUID
	GetOccurredAt() time.Time
	GetCorrelationID() string
	GetCausationID() string
	GetMetadata() map[string]interface{}
	GetEventType() string
	GetAggregateID() string
	GetAggregateType() string
}

// DomainEventBase provides base implementation for domain events
type DomainEventBase struct {
	id            UUID
	occurredAt    time.Time
	correlationID string
	causationID   string
	metadata      map[string]interface{}
	eventType     string
	aggregateID   string
	aggregateType string
}

// NewDomainEventBase creates a new domain event base
func NewDomainEventBase(eventType, aggregateID, aggregateType string) *DomainEventBase {
	return &DomainEventBase{
		id:            generateUUID(),
		occurredAt:    time.Now().UTC(),
		metadata:      make(map[string]interface{}),
		eventType:     eventType,
		aggregateID:   aggregateID,
		aggregateType: aggregateType,
	}
}

// NewDomainEventBaseWithCorrelation creates a new domain event base with correlation context
func NewDomainEventBaseWithCorrelation(eventType, aggregateID, aggregateType, correlationID, causationID string, metadata map[string]interface{}) *DomainEventBase {
	event := NewDomainEventBase(eventType, aggregateID, aggregateType)
	event.correlationID = correlationID
	event.causationID = causationID

	if metadata != nil {
		for k, v := range metadata {
			event.metadata[k] = v
		}
	}

	return event
}

// GetID returns the unique identifier of the event
func (e *DomainEventBase) GetID() UUID {
	return e.id
}

// GetOccurredAt returns when the event occurred
func (e *DomainEventBase) GetOccurredAt() time.Time {
	return e.occurredAt
}

// GetCorrelationID returns the correlation ID for tracing
func (e *DomainEventBase) GetCorrelationID() string {
	return e.correlationID
}

// GetCausationID returns the causation ID for event chains
func (e *DomainEventBase) GetCausationID() string {
	return e.causationID
}

// GetMetadata returns the event metadata
func (e *DomainEventBase) GetMetadata() map[string]interface{} {
	// Return a copy to maintain immutability
	result := make(map[string]interface{})
	for k, v := range e.metadata {
		result[k] = v
	}
	return result
}

// GetEventType returns the type of the event
func (e *DomainEventBase) GetEventType() string {
	return e.eventType
}

// GetAggregateID returns the ID of the aggregate that generated this event
func (e *DomainEventBase) GetAggregateID() string {
	return e.aggregateID
}

// GetAggregateType returns the type of the aggregate that generated this event
func (e *DomainEventBase) GetAggregateType() string {
	return e.aggregateType
}

// SetCorrelationID sets the correlation ID
func (e *DomainEventBase) SetCorrelationID(correlationID string) {
	e.correlationID = correlationID
}

// SetCausationID sets the causation ID
func (e *DomainEventBase) SetCausationID(causationID string) {
	e.causationID = causationID
}

// AddMetadata adds metadata to the event
func (e *DomainEventBase) AddMetadata(key string, value interface{}) {
	if e.metadata == nil {
		e.metadata = make(map[string]interface{})
	}
	e.metadata[key] = value
}

// SetMetadata replaces all metadata
func (e *DomainEventBase) SetMetadata(metadata map[string]interface{}) {
	e.metadata = make(map[string]interface{})
	if metadata != nil {
		for k, v := range metadata {
			e.metadata[k] = v
		}
	}
}

// String returns a string representation of the event
func (e *DomainEventBase) String() string {
	return fmt.Sprintf("DomainEvent[%s] %s on %s at %s", e.id, e.eventType, e.aggregateID, e.occurredAt.Format(time.RFC3339))
}

// IsMoreRecentThan checks if this event is more recent than another
func (e *DomainEventBase) IsMoreRecentThan(other IDomainEvent) bool {
	return e.occurredAt.After(other.GetOccurredAt())
}

// IsSameAggregate checks if this event is from the same aggregate as another
func (e *DomainEventBase) IsSameAggregate(other IDomainEvent) bool {
	return e.aggregateID == other.GetAggregateID() && e.aggregateType == other.GetAggregateType()
}

// IsRelatedTo checks if this event is related to another via correlation
func (e *DomainEventBase) IsRelatedTo(other IDomainEvent) bool {
	return e.correlationID != "" && e.correlationID == other.GetCorrelationID()
}

// IsCausedBy checks if this event was caused by another event
func (e *DomainEventBase) IsCausedBy(other IDomainEvent) bool {
	return e.causationID != "" && e.causationID == other.GetID().String()
}