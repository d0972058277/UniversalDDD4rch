package domain

import (
	"fmt"
	"hash/fnv"
)

// IEntity defines the interface for entities
type IEntity[TID EntityID] interface {
	GetID() TID
	Equals(other IEntity[TID]) bool
	GetHashCode() uint64
}

// Entity provides base implementation for entities with identity-based equality
type Entity[TID EntityID] struct {
	id TID
}

// NewEntity creates a new entity with the specified ID
func NewEntity[TID EntityID](id TID) *Entity[TID] {
	return &Entity[TID]{id: id}
}

// GetID returns the entity's identifier
func (e *Entity[TID]) GetID() TID {
	return e.id
}

// Equals compares entities based on their identity
func (e *Entity[TID]) Equals(other IEntity[TID]) bool {
	if other == nil {
		return false
	}
	return e.id == other.GetID()
}

// GetHashCode returns a hash code based on the entity's ID
func (e *Entity[TID]) GetHashCode() uint64 {
	h := fnv.New64a()
	h.Write([]byte(fmt.Sprintf("%v", e.id)))
	return h.Sum64()
}

// String returns a string representation of the entity
func (e *Entity[TID]) String() string {
	return fmt.Sprintf("Entity[%v]", e.id)
}

// IsTransient returns true if the entity doesn't have a persistent identity yet
func (e *Entity[TID]) IsTransient() bool {
	// For generic types, we can't easily check for "zero" value
	// This would need to be implemented by specific entity types
	return false
}

// SetID sets the entity's identifier (should only be used during creation/hydration)
func (e *Entity[TID]) SetID(id TID) {
	e.id = id
}

// EntityEquals is a utility function for comparing entities
func EntityEquals[TID EntityID](left, right IEntity[TID]) bool {
	if left == nil && right == nil {
		return true
	}
	if left == nil || right == nil {
		return false
	}
	return left.Equals(right)
}

// EntityHashCode is a utility function for getting entity hash codes
func EntityHashCode[TID EntityID](entity IEntity[TID]) uint64 {
	if entity == nil {
		return 0
	}
	return entity.GetHashCode()
}