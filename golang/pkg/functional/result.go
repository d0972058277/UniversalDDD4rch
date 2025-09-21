package functional

import "fmt"

// Result represents the result of an operation that can succeed or fail
type Result struct {
	isSuccess bool
	error     Error
}

// Result[T] represents the result of an operation that can succeed with a value or fail
type Result[T any] struct {
	isSuccess bool
	value     T
	error     Error
}

// IsSuccess returns true if the result represents success
func (r Result) IsSuccess() bool {
	return r.isSuccess
}

// IsFailure returns true if the result represents failure
func (r Result) IsFailure() bool {
	return !r.isSuccess
}

// Error returns the error if the result is a failure
func (r Result) Error() Error {
	return r.error
}

// Ok creates a successful Result
func Ok() Result {
	return Result{isSuccess: true}
}

// Fail creates a failed Result with the specified error
func Fail(err Error) Result {
	return Result{isSuccess: false, error: err}
}

// Map transforms a successful Result to a Result[T] by applying the provided function
func (r Result) Map(f func() T) Result[T] {
	if r.isSuccess {
		return OkWith(f())
	}
	return FailWith[T](r.error)
}

// Bind chains Result operations, applying the function only if the current result is successful
func (r Result) Bind(f func() Result) Result {
	if r.isSuccess {
		return f()
	}
	return r
}

// Match applies one of two functions based on the result state
func (r Result) Match(onSuccess func() T, onFailure func(Error) T) T {
	if r.isSuccess {
		return onSuccess()
	}
	return onFailure(r.error)
}

// IsSuccess returns true if the result represents success
func (r Result[T]) IsSuccess() bool {
	return r.isSuccess
}

// IsFailure returns true if the result represents failure
func (r Result[T]) IsFailure() bool {
	return !r.isSuccess
}

// Value returns the value if the result is successful
func (r Result[T]) Value() T {
	return r.value
}

// Error returns the error if the result is a failure
func (r Result[T]) Error() Error {
	return r.error
}

// OkWith creates a successful Result[T] with the specified value
func OkWith[T any](value T) Result[T] {
	return Result[T]{isSuccess: true, value: value}
}

// FailWith creates a failed Result[T] with the specified error
func FailWith[T any](err Error) Result[T] {
	var zero T
	return Result[T]{isSuccess: false, value: zero, error: err}
}

// Map transforms the value of a successful Result[T] to Result[U]
func (r Result[T]) Map(f func(T) U) Result[U] {
	if r.isSuccess {
		return OkWith(f(r.value))
	}
	return FailWith[U](r.error)
}

// Bind chains Result[T] operations, applying the function only if the current result is successful
func (r Result[T]) Bind(f func(T) Result[U]) Result[U] {
	if r.isSuccess {
		return f(r.value)
	}
	return FailWith[U](r.error)
}

// Match applies one of two functions based on the result state
func (r Result[T]) Match(onSuccess func(T) U, onFailure func(Error) U) U {
	if r.isSuccess {
		return onSuccess(r.value)
	}
	return onFailure(r.error)
}

// FromMaybe converts a Maybe[T] to Result[T], using the provided error if Maybe is None
func FromMaybe[T any](maybe Maybe[T], errorWhenNone Error) Result[T] {
	if maybe.HasValue() {
		return OkWith(maybe.Value())
	}
	return FailWith[T](errorWhenNone)
}

// Ensure validates a successful result with a predicate, converting to failure if predicate fails
func (r Result[T]) Ensure(predicate func(T) bool, errorWhenFalse Error) Result[T] {
	if r.isSuccess && !predicate(r.value) {
		return FailWith[T](errorWhenFalse)
	}
	return r
}

// TryMap attempts to map the value, catching panics and converting them to errors
func (r Result[T]) TryMap(f func(T) U) Result[U] {
	if !r.isSuccess {
		return FailWith[U](r.error)
	}

	defer func() {
		if recovered := recover(); recovered != nil {
			// Convert panic to infrastructure error
			err := InfrastructureError("PANIC_RECOVERED", "Operation panicked: "+fmt.Sprintf("%v", recovered))
			result := FailWith[U](err)
			// This is a bit hacky but necessary for the defer to work
			r = Result[T]{isSuccess: false, error: err}
		}
	}()

	return OkWith(f(r.value))
}

// TryBind attempts to bind the operation, catching panics and converting them to errors
func (r Result[T]) TryBind(f func(T) Result[U]) Result[U] {
	if !r.isSuccess {
		return FailWith[U](r.error)
	}

	defer func() {
		if recovered := recover(); recovered != nil {
			// This is handled in the calling context since we can't modify return value from defer
		}
	}()

	return f(r.value)
}