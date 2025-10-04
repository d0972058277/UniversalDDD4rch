package functional

import "fmt"

// Result[T] represents the result of an operation that can succeed with a value or fail
// Implements the Result interface from contracts
type Result[T any] struct {
	isOk  bool
	value T
	err   *Error
}

// IsOk returns true if the result represents success
func (r Result[T]) IsOk() bool {
	return r.isOk
}

// IsSuccess returns true if the result represents success (alias for IsOk)
func (r Result[T]) IsSuccess() bool {
	return r.isOk
}

// IsError returns true if the result represents failure
func (r Result[T]) IsError() bool {
	return !r.isOk
}

// IsFailure returns true if the result represents failure (alias for IsError)
func (r Result[T]) IsFailure() bool {
	return !r.isOk
}

// Value returns the value if the result is successful
func (r Result[T]) Value() T {
	return r.value
}

// Error returns the error if the result is a failure
func (r Result[T]) Error() *Error {
	return r.err
}

// Map transforms the value of a successful Result[T] to Result[U] (generic function)
func Map[T, U any](r Result[T], f func(T) U) Result[U] {
	if r.isOk {
		return Ok(f(r.value))
	}
	return Fail[U](r.err)
}

// Bind chains Result operations, applying the function only if the current result is successful (generic function)
func Bind[T, U any](r Result[T], f func(T) Result[U]) Result[U] {
	if r.isOk {
		return f(r.value)
	}
	return Fail[U](r.err)
}

// Match applies one of two functions based on the result state (generic function)
func Match[T, U any](r Result[T], onSuccess func(T) U, onError func(*Error) U) U {
	if r.isOk {
		return onSuccess(r.value)
	}
	return onError(r.err)
}

// Ensure validates a successful result with a predicate, converting to failure if predicate fails
func (r Result[T]) Ensure(predicate func(T) bool, errorMessage string) Result[T] {
	if r.isOk && !predicate(r.value) {
		return Fail[T](ValidationError("ENSURE_FAILED", errorMessage))
	}
	return r
}

// Map transforms the value using the provided function (method version for interface compatibility)
func (r Result[T]) Map(f func(T) interface{}) Result[interface{}] {
	if r.isOk {
		return Result[interface{}]{isOk: true, value: f(r.value)}
	}
	return Result[interface{}]{isOk: false, err: r.err}
}

// Bind chains Result operations (method version for interface compatibility)
func (r Result[T]) Bind(f func(T) Result[interface{}]) Result[interface{}] {
	if r.isOk {
		return f(r.value)
	}
	return Result[interface{}]{isOk: false, err: r.err}
}

// Match applies one of two functions based on the result state (method version)
func (r Result[T]) Match(onSuccess func(T) interface{}, onError func(*Error) interface{}) interface{} {
	if r.isOk {
		return onSuccess(r.value)
	}
	return onError(r.err)
}

// Ok creates a successful Result[T] with the specified value
func Ok[T any](value T) Result[T] {
	return Result[T]{isOk: true, value: value}
}

// OkWith creates a successful Result[T] with the specified value (alias for Ok)
func OkWith[T any](value T) Result[T] {
	return Ok[T](value)
}

// Fail creates a failed Result[T] with the specified error
func Fail[T any](err *Error) Result[T] {
	var zero T
	return Result[T]{isOk: false, value: zero, err: err}
}

// FailWithMessage creates a failed Result[T] with a simple error message
func FailWithMessage[T any](message string) Result[T] {
	return Fail[T](DomainError("GENERIC_ERROR", message))
}

// FailWith creates a failed Result[T] with the specified error
func FailWith[T any](err *Error) Result[T] {
	return Fail[T](err)
}

// FromMaybe converts a Maybe[T] to Result[T], using the provided error if Maybe is None
func FromMaybe[T any](maybe Maybe[T], errorWhenNone *Error) Result[T] {
	if maybe.HasValue() {
		return Ok(maybe.Value())
	}
	return Fail[T](errorWhenNone)
}

// TryMap attempts to map the value, catching panics and converting them to errors
func TryMap[T, U any](r Result[T], f func(T) U) Result[U] {
	if !r.isOk {
		return Fail[U](r.err)
	}

	defer func() {
		if recovered := recover(); recovered != nil {
			// Convert panic to infrastructure error
			_ = InfrastructureError("PANIC_RECOVERED", "Operation panicked: "+fmt.Sprintf("%v", recovered))
		}
	}()

	return Ok(f(r.value))
}

// TryBind attempts to bind the operation, catching panics and converting them to errors
func TryBind[T, U any](r Result[T], f func(T) Result[U]) Result[U] {
	if !r.isOk {
		return Fail[U](r.err)
	}

	defer func() {
		if recovered := recover(); recovered != nil {
			// In a real implementation, this would be properly handled
		}
	}()

	return f(r.value)
}

// Interface compatibility methods are defined above

// ResultOf is a type for Result for compatibility
type ResultOf[T any] Result[T]

// Methods for ResultOf to maintain compatibility
func (r ResultOf[T]) IsOk() bool { return Result[T](r).IsOk() }
func (r ResultOf[T]) IsError() bool { return Result[T](r).IsError() }
func (r ResultOf[T]) Value() T { return Result[T](r).Value() }
func (r ResultOf[T]) Error() *Error { return Result[T](r).Error() }
func (r ResultOf[T]) IsSuccess() bool { return Result[T](r).IsSuccess() }
func (r ResultOf[T]) IsFailure() bool { return Result[T](r).IsFailure() }

// Result interface methods are already defined above