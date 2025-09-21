package functional

import "fmt"

// Maybe[T] represents an optional value that may or may not be present
type Maybe[T any] struct {
	hasValue bool
	value    T
}

// HasValue returns true if the Maybe contains a value
func (m Maybe[T]) HasValue() bool {
	return m.hasValue
}

// Value returns the contained value (only call if HasValue() is true)
func (m Maybe[T]) Value() T {
	return m.value
}

// Some creates a Maybe[T] with a value
func Some[T any](value T) Maybe[T] {
	return Maybe[T]{hasValue: true, value: value}
}

// None creates a Maybe[T] without a value
func None[T any]() Maybe[T] {
	var zero T
	return Maybe[T]{hasValue: false, value: zero}
}

// Map transforms the value inside Maybe[T] to Maybe[any] if a value is present
func (m Maybe[T]) Map(f func(T) any) Maybe[any] {
	if m.hasValue {
		return Some(f(m.value))
	}
	return None[any]()
}

// MapTo transforms the value inside Maybe[T] to Maybe[U] if a value is present
func MapToMaybe[T, U any](m Maybe[T], f func(T) U) Maybe[U] {
	if m.hasValue {
		return Some(f(m.value))
	}
	return None[U]()
}

// Bind chains Maybe operations, applying the function only if a value is present
func (m Maybe[T]) Bind(f func(T) Maybe[any]) Maybe[any] {
	if m.hasValue {
		return f(m.value)
	}
	return None[any]()
}

// BindTo chains Maybe operations, applying the function only if a value is present
func BindToMaybe[T, U any](m Maybe[T], f func(T) Maybe[U]) Maybe[U] {
	if m.hasValue {
		return f(m.value)
	}
	return None[U]()
}

// Filter keeps the value only if the predicate returns true
func (m Maybe[T]) Filter(predicate func(T) bool) Maybe[T] {
	if m.hasValue && predicate(m.value) {
		return m
	}
	return None[T]()
}

// OrElse returns the contained value if present, otherwise returns the default value
func (m Maybe[T]) OrElse(defaultValue T) T {
	if m.hasValue {
		return m.value
	}
	return defaultValue
}

// OrElseFunc returns the contained value if present, otherwise calls the factory function
func (m Maybe[T]) OrElseFunc(factory func() T) T {
	if m.hasValue {
		return m.value
	}
	return factory()
}

// Match applies one of two functions based on whether a value is present
func (m Maybe[T]) Match(onSome func(T) any, onNone func() any) any {
	if m.hasValue {
		return onSome(m.value)
	}
	return onNone()
}

// MatchTo applies one of two functions based on whether a value is present
func MatchToMaybe[T, U any](m Maybe[T], onSome func(T) U, onNone func() U) U {
	if m.hasValue {
		return onSome(m.value)
	}
	return onNone()
}

// ToResult converts Maybe[T] to ResultOf[T], using the provided error if no value is present
func (m Maybe[T]) ToResult(errorWhenNone Error) ResultOf[T] {
	if m.hasValue {
		return OkWith(m.value)
	}
	return FailWith[T](errorWhenNone)
}

// ToPointer converts Maybe[T] to *T, returning nil if no value is present
func (m Maybe[T]) ToPointer() *T {
	if m.hasValue {
		return &m.value
	}
	return nil
}

// FromPointer creates Maybe[T] from *T, returning None if pointer is nil
func FromPointer[T any](ptr *T) Maybe[T] {
	if ptr != nil {
		return Some(*ptr)
	}
	return None[T]()
}

// Where filters the Maybe based on a predicate (alias for Filter for LINQ-style usage)
func (m Maybe[T]) Where(predicate func(T) bool) Maybe[T] {
	return m.Filter(predicate)
}

// Select transforms the value (alias for Map for LINQ-style usage)
func (m Maybe[T]) Select(f func(T) any) Maybe[any] {
	return m.Map(f)
}

// SelectTo transforms the value (alias for MapTo for LINQ-style usage)
func SelectToMaybe[T, U any](m Maybe[T], f func(T) U) Maybe[U] {
	return MapToMaybe(m, f)
}

// SelectMany chains Maybe operations (alias for Bind for LINQ-style usage)
func (m Maybe[T]) SelectMany(f func(T) Maybe[any]) Maybe[any] {
	return m.Bind(f)
}

// SelectManyTo chains Maybe operations (alias for BindTo for LINQ-style usage)
func SelectManyToMaybe[T, U any](m Maybe[T], f func(T) Maybe[U]) Maybe[U] {
	return BindToMaybe(m, f)
}

// IsNone returns true if no value is present
func (m Maybe[T]) IsNone() bool {
	return !m.hasValue
}

// IsSome returns true if a value is present
func (m Maybe[T]) IsSome() bool {
	return m.hasValue
}

// String returns a string representation of the Maybe
func (m Maybe[T]) String() string {
	if m.hasValue {
		return fmt.Sprintf("Some(%v)", m.value)
	}
	return "None"
}