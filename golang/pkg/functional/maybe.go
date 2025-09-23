package functional

import "fmt"

// Maybe[T] represents an optional value that may or may not be present
// Implements the Maybe interface from contracts
type Maybe[T any] struct {
	hasValue bool
	value    T
}

// HasValue returns true if the Maybe contains a value
func (m Maybe[T]) HasValue() bool {
	return m.hasValue
}

// IsNone returns true if no value is present
func (m Maybe[T]) IsNone() bool {
	return !m.hasValue
}

// Value returns the contained value (only call if HasValue() is true)
func (m Maybe[T]) Value() T {
	return m.value
}

// Map transforms the value inside Maybe[T] to Maybe[interface{}] if a value is present (method version)
func (m Maybe[T]) Map(f func(T) interface{}) Maybe[interface{}] {
	if m.hasValue {
		return Some[interface{}](f(m.value))
	}
	return None[interface{}]()
}

// Bind chains Maybe operations (method version for interface compatibility)
func (m Maybe[T]) Bind(f func(T) Maybe[interface{}]) Maybe[interface{}] {
	if m.hasValue {
		return f(m.value)
	}
	return None[interface{}]()
}

// ValueOr returns the contained value if present, otherwise returns the default value
func (m Maybe[T]) ValueOr(defaultValue T) T {
	if m.hasValue {
		return m.value
	}
	return defaultValue
}

// Map transforms the value inside Maybe[T] to Maybe[U] if a value is present
func MapMaybe[T, U any](m Maybe[T], f func(T) U) Maybe[U] {
	if m.hasValue {
		return Some(f(m.value))
	}
	return None[U]()
}

// Bind chains Maybe operations, applying the function only if a value is present
func BindMaybe[T, U any](m Maybe[T], f func(T) Maybe[U]) Maybe[U] {
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

// OrElse returns this Maybe if it has a value, otherwise returns the alternative
func (m Maybe[T]) OrElse(alternative Maybe[T]) Maybe[T] {
	if m.hasValue {
		return m
	}
	return alternative
}

// OrElseValue returns the contained value if present, otherwise returns the default value
// This is actually an alias for ValueOr for backward compatibility
func (m Maybe[T]) OrElseValue(defaultValue T) T {
	return m.ValueOr(defaultValue)
}

// ToResult converts Maybe[T] to Result[T], using the provided error if no value is present
func (m Maybe[T]) ToResult(errorMessage string) Result[T] {
	if m.hasValue {
		return Ok(m.value)
	}
	return FailWithMessage[T](errorMessage)
}

// ToResultWithError converts Maybe[T] to Result[T], using the provided Error if no value is present
func (m Maybe[T]) ToResultWithError(err *Error) Result[T] {
	if m.hasValue {
		return Ok(m.value)
	}
	return Fail[T](err)
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

// IsSome returns true if a value is present (alias for HasValue)
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


// Bind method is defined above

// OrElseFunc returns this Maybe if it has a value, otherwise calls the factory
func (m Maybe[T]) OrElseFunc(factory func() T) T {
	if m.hasValue {
		return m.value
	}
	return factory()
}

// Match applies one of two functions based on whether value is present
func (m Maybe[T]) Match(onSome func(T) interface{}, onNone func() interface{}) interface{} {
	if m.hasValue {
		return onSome(m.value)
	}
	return onNone()
}

// MatchTyped applies one of two functions based on whether value is present (type-safe version)
func MatchTyped[T, U any](m Maybe[T], onSome func(T) U, onNone func() U) U {
	if m.hasValue {
		return onSome(m.value)
	}
	return onNone()
}

// BindTyped chains Maybe operations (type-safe version)
func BindTyped[T, U any](m Maybe[T], f func(T) Maybe[U]) Maybe[U] {
	if m.hasValue {
		return f(m.value)
	}
	return None[U]()
}

// MapToMaybe is an alias for MapMaybe for backward compatibility
func MapToMaybe[T, U any](m Maybe[T], f func(T) U) Maybe[U] {
	return MapMaybe(m, f)
}

// BindToMaybe is an alias for BindMaybe for backward compatibility
func BindToMaybe[T, U any](m Maybe[T], f func(T) Maybe[U]) Maybe[U] {
	return BindMaybe(m, f)
}

// MatchToMaybe is an alias for MatchTyped for backward compatibility
func MatchToMaybe[T, U any](m Maybe[T], onSome func(T) U, onNone func() U) U {
	return MatchTyped(m, onSome, onNone)
}

// SelectToMaybe is an alias for MapMaybe for backward compatibility (LINQ-style Select)
func SelectToMaybe[T, U any](m Maybe[T], selector func(T) U) Maybe[U] {
	return MapMaybe(m, selector)
}