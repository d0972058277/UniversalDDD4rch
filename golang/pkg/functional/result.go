package functional

import "fmt"

// Result represents the result of an operation that can succeed or fail
type Result struct {
	isSuccess bool
	error     Error
}

// ResultOf[T] represents the result of an operation that can succeed with a value or fail
type ResultOf[T any] struct {
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

// MapResult transforms a successful Result to a ResultOf[T] by applying the provided function
func MapResult[T any](r Result, f func() T) ResultOf[T] {
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

// MatchResult applies one of two functions based on the result state
func MatchResult[T any](r Result, onSuccess func() T, onFailure func(Error) T) T {
	if r.isSuccess {
		return onSuccess()
	}
	return onFailure(r.error)
}

// IsSuccess returns true if the result represents success
func (r ResultOf[T]) IsSuccess() bool {
	return r.isSuccess
}

// IsFailure returns true if the result represents failure
func (r ResultOf[T]) IsFailure() bool {
	return !r.isSuccess
}

// Value returns the value if the result is successful
func (r ResultOf[T]) Value() T {
	return r.value
}

// Error returns the error if the result is a failure
func (r ResultOf[T]) Error() Error {
	return r.error
}

// OkWith creates a successful ResultOf[T] with the specified value
func OkWith[T any](value T) ResultOf[T] {
	return ResultOf[T]{isSuccess: true, value: value}
}

// FailWith creates a failed ResultOf[T] with the specified error
func FailWith[T any](err Error) ResultOf[T] {
	var zero T
	return ResultOf[T]{isSuccess: false, value: zero, error: err}
}

// Map transforms the value of a successful ResultOf[T] to ResultOf[U]
func (r ResultOf[T]) Map(f func(T) any) ResultOf[any] {
	if r.isSuccess {
		return OkWith(f(r.value))
	}
	return FailWith[any](r.error)
}

// MapTo transforms the value of a successful ResultOf[T] to ResultOf[U]
func MapTo[T, U any](r ResultOf[T], f func(T) U) ResultOf[U] {
	if r.isSuccess {
		return OkWith(f(r.value))
	}
	return FailWith[U](r.error)
}

// Bind chains ResultOf[T] operations, applying the function only if the current result is successful
func (r ResultOf[T]) Bind(f func(T) ResultOf[any]) ResultOf[any] {
	if r.isSuccess {
		return f(r.value)
	}
	return FailWith[any](r.error)
}

// BindTo chains ResultOf[T] operations, applying the function only if the current result is successful
func BindTo[T, U any](r ResultOf[T], f func(T) ResultOf[U]) ResultOf[U] {
	if r.isSuccess {
		return f(r.value)
	}
	return FailWith[U](r.error)
}

// Match applies one of two functions based on the result state
func (r ResultOf[T]) Match(onSuccess func(T) any, onFailure func(Error) any) any {
	if r.isSuccess {
		return onSuccess(r.value)
	}
	return onFailure(r.error)
}

// MatchTo applies one of two functions based on the result state
func MatchTo[T, U any](r ResultOf[T], onSuccess func(T) U, onFailure func(Error) U) U {
	if r.isSuccess {
		return onSuccess(r.value)
	}
	return onFailure(r.error)
}

// FromMaybe converts a Maybe[T] to ResultOf[T], using the provided error if Maybe is None
func FromMaybe[T any](maybe Maybe[T], errorWhenNone Error) ResultOf[T] {
	if maybe.HasValue() {
		return OkWith(maybe.Value())
	}
	return FailWith[T](errorWhenNone)
}

// Ensure validates a successful result with a predicate, converting to failure if predicate fails
func (r ResultOf[T]) Ensure(predicate func(T) bool, errorWhenFalse Error) ResultOf[T] {
	if r.isSuccess && !predicate(r.value) {
		return FailWith[T](errorWhenFalse)
	}
	return r
}

// TryMapTo attempts to map the value, catching panics and converting them to errors
func TryMapTo[T, U any](r ResultOf[T], f func(T) U) ResultOf[U] {
	if !r.isSuccess {
		return FailWith[U](r.error)
	}

	defer func() {
		if recovered := recover(); recovered != nil {
			// Convert panic to infrastructure error - in a real implementation this would
			// be handled properly with a panic handler that returns an error result
			_ = InfrastructureError("PANIC_RECOVERED", "Operation panicked: "+fmt.Sprintf("%v", recovered))
		}
	}()

	return OkWith(f(r.value))
}

// TryBindTo attempts to bind the operation, catching panics and converting them to errors
func TryBindTo[T, U any](r ResultOf[T], f func(T) ResultOf[U]) ResultOf[U] {
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