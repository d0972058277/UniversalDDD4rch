package domain

import (
	"fmt"
	"hash"
	"hash/fnv"
	"reflect"
)

// IValueObject defines the interface for value objects
type IValueObject interface {
	GetEqualityComponents() []interface{}
	Equals(other IValueObject) bool
	GetHashCode() uint64
}

// ValueObject provides base implementation for value objects with structural equality
type ValueObject struct{}

// GetEqualityComponents must be implemented by concrete value objects
// It should return all the components that determine equality
func (vo *ValueObject) GetEqualityComponents() []interface{} {
	// This should be overridden by concrete implementations
	panic("GetEqualityComponents must be implemented by concrete value objects")
}

// Equals compares value objects based on their equality components
func (vo *ValueObject) Equals(other IValueObject) bool {
	if other == nil {
		return false
	}

	if reflect.TypeOf(vo) != reflect.TypeOf(other) {
		return false
	}

	return equalityComponentsEqual(vo.GetEqualityComponents(), other.GetEqualityComponents())
}

// GetHashCode returns a hash code based on the equality components
func (vo *ValueObject) GetHashCode() uint64 {
	return hashEqualityComponents(vo.GetEqualityComponents())
}

// equalityComponentsEqual compares two slices of equality components
func equalityComponentsEqual(left, right []interface{}) bool {
	if len(left) != len(right) {
		return false
	}

	for i, leftComponent := range left {
		rightComponent := right[i]

		if !componentEquals(leftComponent, rightComponent) {
			return false
		}
	}

	return true
}

// componentEquals compares two individual components
func componentEquals(left, right interface{}) bool {
	if left == nil && right == nil {
		return true
	}

	if left == nil || right == nil {
		return false
	}

	// Handle slices specially
	leftValue := reflect.ValueOf(left)
	rightValue := reflect.ValueOf(right)

	if leftValue.Kind() == reflect.Slice && rightValue.Kind() == reflect.Slice {
		return sliceEquals(leftValue, rightValue)
	}

	// Handle maps specially
	if leftValue.Kind() == reflect.Map && rightValue.Kind() == reflect.Map {
		return mapEquals(leftValue, rightValue)
	}

	// For other types, use reflect.DeepEqual
	return reflect.DeepEqual(left, right)
}

// sliceEquals compares two slices
func sliceEquals(left, right reflect.Value) bool {
	if left.Len() != right.Len() {
		return false
	}

	for i := 0; i < left.Len(); i++ {
		if !componentEquals(left.Index(i).Interface(), right.Index(i).Interface()) {
			return false
		}
	}

	return true
}

// mapEquals compares two maps
func mapEquals(left, right reflect.Value) bool {
	if left.Len() != right.Len() {
		return false
	}

	for _, key := range left.MapKeys() {
		leftValue := left.MapIndex(key)
		rightValue := right.MapIndex(key)

		if !rightValue.IsValid() {
			return false
		}

		if !componentEquals(leftValue.Interface(), rightValue.Interface()) {
			return false
		}
	}

	return true
}

// hashEqualityComponents creates a hash from equality components
func hashEqualityComponents(components []interface{}) uint64 {
	h := fnv.New64a()

	for _, component := range components {
		hashComponent(h, component)
	}

	return h.Sum64()
}

// hashComponent adds a single component to the hash
func hashComponent(h hash.Hash64, component interface{}) {
	if component == nil {
		h.Write([]byte("null"))
		return
	}

	value := reflect.ValueOf(component)

	switch value.Kind() {
	case reflect.Slice:
		h.Write([]byte("slice["))
		for i := 0; i < value.Len(); i++ {
			hashComponent(h, value.Index(i).Interface())
			h.Write([]byte(","))
		}
		h.Write([]byte("]"))

	case reflect.Map:
		h.Write([]byte("map["))
		keys := value.MapKeys()
		for _, key := range keys {
			hashComponent(h, key.Interface())
			h.Write([]byte("="))
			hashComponent(h, value.MapIndex(key).Interface())
			h.Write([]byte(","))
		}
		h.Write([]byte("]"))

	default:
		h.Write([]byte(fmt.Sprintf("%v", component)))
	}
}

// ValueObjectEquals is a utility function for comparing value objects
func ValueObjectEquals(left, right IValueObject) bool {
	if left == nil && right == nil {
		return true
	}
	if left == nil || right == nil {
		return false
	}
	return left.Equals(right)
}

// ValueObjectHashCode is a utility function for getting value object hash codes
func ValueObjectHashCode(vo IValueObject) uint64 {
	if vo == nil {
		return 0
	}
	return vo.GetHashCode()
}