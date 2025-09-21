package domain

import (
	"context"

	"github.com/universalddd/architecture-core-go/pkg/functional"
)

// IRepository defines the interface for aggregate repositories
type IRepository[TAggregate any, TID EntityID] interface {
	GetByIDAsync(ctx context.Context, id TID) functional.Maybe[TAggregate]
	AddAsync(ctx context.Context, aggregate TAggregate) functional.Result
	UpdateAsync(ctx context.Context, aggregate TAggregate) functional.Result
	DeleteAsync(ctx context.Context, id TID) functional.Result
	ExistsAsync(ctx context.Context, id TID) functional.Result[bool]
}

// RepositoryBase provides base functionality for repositories
type RepositoryBase[TAggregate any, TID EntityID] struct {
	// This can be extended with common repository functionality
}

// NewRepositoryBase creates a new repository base
func NewRepositoryBase[TAggregate any, TID EntityID]() *RepositoryBase[TAggregate, TID] {
	return &RepositoryBase[TAggregate, TID]{}
}

// ValidateAggregate performs common validation on aggregates
func (r *RepositoryBase[TAggregate, TID]) ValidateAggregate(aggregate TAggregate) functional.Result {
	// This would contain common validation logic
	// For now, we'll just return success
	return functional.Ok()
}

// ValidateID performs common validation on entity IDs
func (r *RepositoryBase[TAggregate, TID]) ValidateID(id TID) functional.Result {
	// This would contain common ID validation logic
	// For now, we'll just return success
	return functional.Ok()
}

// HandleConcurrency checks for concurrency conflicts
func (r *RepositoryBase[TAggregate, TID]) HandleConcurrency(expectedVersion, actualVersion int64) functional.Result {
	if expectedVersion != actualVersion {
		return functional.Fail(functional.ConcurrencyError(
			"OPTIMISTIC_LOCK_EXCEPTION",
			"The aggregate has been modified by another process",
		))
	}
	return functional.Ok()
}

// InMemoryRepository provides a simple in-memory implementation for testing
type InMemoryRepository[TAggregate IAggregateRoot[TID], TID EntityID] struct {
	RepositoryBase[TAggregate, TID]
	data map[TID]TAggregate
}

// NewInMemoryRepository creates a new in-memory repository
func NewInMemoryRepository[TAggregate IAggregateRoot[TID], TID EntityID]() *InMemoryRepository[TAggregate, TID] {
	return &InMemoryRepository[TAggregate, TID]{
		data: make(map[TID]TAggregate),
	}
}

// GetByIDAsync retrieves an aggregate by ID
func (r *InMemoryRepository[TAggregate, TID]) GetByIDAsync(ctx context.Context, id TID) functional.Maybe[TAggregate] {
	// Check for cancellation
	select {
	case <-ctx.Done():
		return functional.None[TAggregate]()
	default:
	}

	if aggregate, exists := r.data[id]; exists {
		return functional.Some(aggregate)
	}
	return functional.None[TAggregate]()
}

// AddAsync adds a new aggregate
func (r *InMemoryRepository[TAggregate, TID]) AddAsync(ctx context.Context, aggregate TAggregate) functional.Result {
	// Check for cancellation
	select {
	case <-ctx.Done():
		return functional.Fail(functional.InfrastructureError("CONTEXT_CANCELLED", "Operation was cancelled"))
	default:
	}

	id := aggregate.GetID()

	// Check if already exists
	if _, exists := r.data[id]; exists {
		return functional.Fail(functional.DomainError("DUPLICATE_AGGREGATE", "Aggregate with this ID already exists"))
	}

	r.data[id] = aggregate
	return functional.Ok()
}

// UpdateAsync updates an existing aggregate
func (r *InMemoryRepository[TAggregate, TID]) UpdateAsync(ctx context.Context, aggregate TAggregate) functional.Result {
	// Check for cancellation
	select {
	case <-ctx.Done():
		return functional.Fail(functional.InfrastructureError("CONTEXT_CANCELLED", "Operation was cancelled"))
	default:
	}

	id := aggregate.GetID()

	// Check if exists
	existing, exists := r.data[id]
	if !exists {
		return functional.Fail(functional.DomainError("AGGREGATE_NOT_FOUND", "Aggregate not found for update"))
	}

	// Check optimistic concurrency (simplified)
	if existing.GetVersion() != aggregate.GetVersion()-1 {
		return functional.Fail(functional.ConcurrencyError("OPTIMISTIC_LOCK_EXCEPTION", "Aggregate version conflict"))
	}

	r.data[id] = aggregate
	return functional.Ok()
}

// DeleteAsync deletes an aggregate by ID
func (r *InMemoryRepository[TAggregate, TID]) DeleteAsync(ctx context.Context, id TID) functional.Result {
	// Check for cancellation
	select {
	case <-ctx.Done():
		return functional.Fail(functional.InfrastructureError("CONTEXT_CANCELLED", "Operation was cancelled"))
	default:
	}

	if _, exists := r.data[id]; !exists {
		return functional.Fail(functional.DomainError("AGGREGATE_NOT_FOUND", "Aggregate not found for deletion"))
	}

	delete(r.data, id)
	return functional.Ok()
}

// ExistsAsync checks if an aggregate exists
func (r *InMemoryRepository[TAggregate, TID]) ExistsAsync(ctx context.Context, id TID) functional.Result[bool] {
	// Check for cancellation
	select {
	case <-ctx.Done():
		return functional.FailWith[bool](functional.InfrastructureError("CONTEXT_CANCELLED", "Operation was cancelled"))
	default:
	}

	_, exists := r.data[id]
	return functional.OkWith(exists)
}

// GetAllAsync retrieves all aggregates (useful for testing)
func (r *InMemoryRepository[TAggregate, TID]) GetAllAsync(ctx context.Context) functional.Result[[]TAggregate] {
	// Check for cancellation
	select {
	case <-ctx.Done():
		return functional.FailWith[[]TAggregate](functional.InfrastructureError("CONTEXT_CANCELLED", "Operation was cancelled"))
	default:
	}

	aggregates := make([]TAggregate, 0, len(r.data))
	for _, aggregate := range r.data {
		aggregates = append(aggregates, aggregate)
	}

	return functional.OkWith(aggregates)
}

// CountAsync returns the number of aggregates
func (r *InMemoryRepository[TAggregate, TID]) CountAsync(ctx context.Context) functional.Result[int] {
	// Check for cancellation
	select {
	case <-ctx.Done():
		return functional.FailWith[int](functional.InfrastructureError("CONTEXT_CANCELLED", "Operation was cancelled"))
	default:
	}

	return functional.OkWith(len(r.data))
}

// ClearAsync removes all aggregates (useful for testing)
func (r *InMemoryRepository[TAggregate, TID]) ClearAsync(ctx context.Context) functional.Result {
	// Check for cancellation
	select {
	case <-ctx.Done():
		return functional.Fail(functional.InfrastructureError("CONTEXT_CANCELLED", "Operation was cancelled"))
	default:
	}

	r.data = make(map[TID]TAggregate)
	return functional.Ok()
}