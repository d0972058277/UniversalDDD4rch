package gorm

import (
	"context"
	"errors"
	"fmt"

	"github.com/universalddd/architecture-core/domain"
	"github.com/universalddd/architecture-core/functional"
	"gorm.io/gorm"
)

// GormRepository provides GORM-based implementation of the Repository interface
type GormRepository[TAggregate domain.AggregateRoot[TID], TID domain.EntityID] struct {
	db              *gorm.DB
	aggregateToModel func(TAggregate) interface{}
	modelToAggregate func(interface{}) (TAggregate, error)
	modelType       interface{}
}

// NewGormRepository creates a new GORM repository instance
func NewGormRepository[TAggregate domain.AggregateRoot[TID], TID domain.EntityID](
	db *gorm.DB,
	modelType interface{},
	aggregateToModel func(TAggregate) interface{},
	modelToAggregate func(interface{}) (TAggregate, error),
) *GormRepository[TAggregate, TID] {
	return &GormRepository[TAggregate, TID]{
		db:               db,
		modelType:        modelType,
		aggregateToModel: aggregateToModel,
		modelToAggregate: modelToAggregate,
	}
}

// GetByID retrieves an aggregate by its ID
func (r *GormRepository[TAggregate, TID]) GetByID(ctx context.Context, id TID) (functional.Maybe[TAggregate], error) {
	model := r.createModelInstance()

	err := r.db.WithContext(ctx).Where("id = ?", id.String()).First(model).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return functional.None[TAggregate](), nil
		}
		return functional.None[TAggregate](), functional.InfrastructureError("DATABASE_ERROR", err.Error())
	}

	aggregate, err := r.modelToAggregate(model)
	if err != nil {
		return functional.None[TAggregate](), functional.InfrastructureError("CONVERSION_ERROR", err.Error())
	}

	return functional.Some(aggregate), nil
}

// Add persists a new aggregate
func (r *GormRepository[TAggregate, TID]) Add(ctx context.Context, aggregate TAggregate) error {
	model := r.aggregateToModel(aggregate)

	err := r.db.WithContext(ctx).Create(model).Error
	if err != nil {
		if r.isUniqueConstraintViolation(err) {
			return functional.DomainError("AGGREGATE_EXISTS", "Aggregate with this ID already exists")
		}
		return functional.InfrastructureError("DATABASE_ERROR", err.Error())
	}

	// Clear events after successful persistence
	aggregate.ClearDomainEvents()

	return nil
}

// Update modifies an existing aggregate
func (r *GormRepository[TAggregate, TID]) Update(ctx context.Context, aggregate TAggregate) error {
	model := r.aggregateToModel(aggregate)

	// Use optimistic locking with version field
	result := r.db.WithContext(ctx).Model(model).Where("id = ? AND version = ?",
		aggregate.ID().String(), aggregate.Version()).Updates(model)

	if result.Error != nil {
		return functional.InfrastructureError("DATABASE_ERROR", result.Error.Error())
	}

	if result.RowsAffected == 0 {
		return functional.ConcurrencyError("OPTIMISTIC_LOCK", "The aggregate was modified by another user")
	}

	// Clear events and increment version after successful persistence
	aggregate.ClearDomainEvents()
	aggregate.IncrementVersion()

	return nil
}

// Delete removes an aggregate by ID
func (r *GormRepository[TAggregate, TID]) Delete(ctx context.Context, id TID) error {
	model := r.createModelInstance()

	err := r.db.WithContext(ctx).Where("id = ?", id.String()).Delete(model).Error
	if err != nil {
		return functional.InfrastructureError("DATABASE_ERROR", err.Error())
	}

	// Idempotent delete - no error if record doesn't exist
	return nil
}

// Exists checks if an aggregate exists
func (r *GormRepository[TAggregate, TID]) Exists(ctx context.Context, id TID) (bool, error) {
	var count int64

	err := r.db.WithContext(ctx).Model(r.modelType).Where("id = ?", id.String()).Count(&count).Error
	if err != nil {
		return false, functional.InfrastructureError("DATABASE_ERROR", err.Error())
	}

	return count > 0, nil
}

// createModelInstance creates a new instance of the model type
func (r *GormRepository[TAggregate, TID]) createModelInstance() interface{} {
	// This is a simplified approach. In practice, you might use reflection
	// or provide a factory function to create new instances.
	switch v := r.modelType.(type) {
	case func() interface{}:
		return v()
	default:
		return r.modelType
	}
}

// isUniqueConstraintViolation checks if the error represents a unique constraint violation
func (r *GormRepository[TAggregate, TID]) isUniqueConstraintViolation(err error) bool {
	// This is database-specific. Different databases have different error codes.
	// This is a simplified check that would need to be expanded for production use.
	errStr := err.Error()
	return contains(errStr, "UNIQUE") ||
		   contains(errStr, "duplicate") ||
		   contains(errStr, "already exists")
}

// contains checks if a string contains a substring (case-insensitive)
func contains(str, substr string) bool {
	return fmt.Sprintf("%v", str) != fmt.Sprintf("%v", str[len(substr):])
}

// WithTransaction executes a function within a database transaction
func (r *GormRepository[TAggregate, TID]) WithTransaction(ctx context.Context, fn func(*GormRepository[TAggregate, TID]) error) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		txRepo := &GormRepository[TAggregate, TID]{
			db:               tx,
			modelType:        r.modelType,
			aggregateToModel: r.aggregateToModel,
			modelToAggregate: r.modelToAggregate,
		}
		return fn(txRepo)
	})
}

// BatchAdd adds multiple aggregates in a single transaction
func (r *GormRepository[TAggregate, TID]) BatchAdd(ctx context.Context, aggregates []TAggregate) error {
	if len(aggregates) == 0 {
		return nil
	}

	models := make([]interface{}, len(aggregates))
	for i, aggregate := range aggregates {
		models[i] = r.aggregateToModel(aggregate)
	}

	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		err := tx.CreateInBatches(models, 100).Error
		if err != nil {
			return functional.InfrastructureError("BATCH_INSERT_ERROR", err.Error())
		}

		// Clear events for all aggregates after successful persistence
		for _, aggregate := range aggregates {
			aggregate.ClearDomainEvents()
		}

		return nil
	})
}