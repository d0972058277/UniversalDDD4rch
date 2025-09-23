package domain

import (
	"context"
	"time"

	"github.com/universalddd/architecture-core-go/pkg/functional"
)

// EntityID represents a comparable identifier that can be used for entities and aggregates
// Matches the contract interface
type EntityID interface {
	comparable
	String() string
}

// DomainEvent represents a domain event with correlation metadata
// Matches the contract interface exactly
type DomainEvent interface {
	ID() string
	OccurredAt() time.Time
	CorrelationID() *string
	CausationID() *string
	Metadata() map[string]interface{}
	EventType() string
}

// AggregateRoot represents the root of an aggregate with version control and event tracking
// Matches the contract interface exactly
type AggregateRoot[TID EntityID] interface {
	// Identity and versioning
	ID() TID
	Version() int64
	IncrementVersion()

	// Domain event management
	DomainEvents() []DomainEvent
	AddDomainEvent(event DomainEvent)
	ClearDomainEvents()

	// Aggregate lifecycle
	MarkAsDeleted()
	IsDeleted() bool
}

// Entity represents a domain entity with identity-based equality
// Matches the contract interface exactly
type Entity[TID EntityID] interface {
	ID() TID
	Equals(other Entity[TID]) bool
}

// ValueObject represents an immutable value with structural equality
// Matches the contract interface exactly
type ValueObject interface {
	GetEqualityComponents() []interface{}
	Equals(other ValueObject) bool
	GetHashCode() uint64
}

// Repository represents the contract for aggregate persistence
// Matches the contract interface exactly
type Repository[TAggregate AggregateRoot[TID], TID EntityID] interface {
	GetByID(ctx context.Context, id TID) (functional.Maybe[TAggregate], error)
	Save(ctx context.Context, aggregate TAggregate) error
	Delete(ctx context.Context, id TID) error
	Exists(ctx context.Context, id TID) (bool, error)
}

// IRepository is an interface alias for Repository for compatibility
type IRepository[TAggregate AggregateRoot[TID], TID EntityID] interface {
	GetByID(ctx context.Context, id TID) (functional.Maybe[TAggregate], error)
	Save(ctx context.Context, aggregate TAggregate) error
	Delete(ctx context.Context, id TID) error
	Exists(ctx context.Context, id TID) (bool, error)
}