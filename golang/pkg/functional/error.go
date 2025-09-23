// Package functional provides functional programming types for error handling and optional values
package functional

import (
	"fmt"
	"strings"
)

// ErrorCategory represents the category of an error
type ErrorCategory int

const (
	// Domain represents business logic errors
	Domain ErrorCategory = iota
	// Validation represents input validation errors
	Validation
	// Infrastructure represents external system errors
	Infrastructure
	// Concurrency represents concurrency control errors
	Concurrency
	// Security represents authorization/authentication errors
	Security
)

// String returns the string representation of the error category
func (ec ErrorCategory) String() string {
	switch ec {
	case Domain:
		return "Domain"
	case Validation:
		return "Validation"
	case Infrastructure:
		return "Infrastructure"
	case Concurrency:
		return "Concurrency"
	case Security:
		return "Security"
	default:
		return "Unknown"
	}
}

// Error represents a categorized error with metadata
type Error struct {
	code     string
	message  string
	category ErrorCategory
	metadata map[string]interface{}
	inner    error
}

// Code returns the error code
func (e *Error) Code() string {
	return e.code
}

// Message returns the error message
func (e *Error) Message() string {
	return e.message
}

// Category returns the error category
func (e *Error) Category() ErrorCategory {
	return e.category
}

// Metadata returns the error metadata
func (e *Error) Metadata() map[string]interface{} {
	if e.metadata == nil {
		return make(map[string]interface{})
	}
	// Return a copy to maintain immutability
	result := make(map[string]interface{})
	for k, v := range e.metadata {
		result[k] = v
	}
	return result
}

// Inner returns the inner error if present
func (e *Error) Inner() error {
	return e.inner
}

// AddMetadata adds metadata to the error and returns a new error
func (e *Error) AddMetadata(key string, value interface{}) *Error {
	newMetadata := make(map[string]interface{})
	for k, v := range e.metadata {
		newMetadata[k] = v
	}
	newMetadata[key] = value

	return &Error{
		code:     e.code,
		message:  e.message,
		category: e.category,
		metadata: newMetadata,
		inner:    e.inner,
	}
}

// String returns the string representation of the error
func (e *Error) String() string {
	var parts []string
	parts = append(parts, fmt.Sprintf("[%s]", e.category.String()))
	parts = append(parts, fmt.Sprintf("%s: %s", e.code, e.message))

	if len(e.metadata) > 0 {
		var metaParts []string
		for k, v := range e.metadata {
			metaParts = append(metaParts, fmt.Sprintf("%s=%v", k, v))
		}
		parts = append(parts, fmt.Sprintf("{%s}", strings.Join(metaParts, ", ")))
	}

	return strings.Join(parts, " ")
}

// Error implements the built-in error interface
func (e *Error) Error() string {
	return e.String()
}

// newError creates a new Error with the specified category
func newError(category ErrorCategory, code, message string, metadata map[string]interface{}) *Error {
	var meta map[string]interface{}
	if metadata != nil {
		meta = make(map[string]interface{})
		for k, v := range metadata {
			meta[k] = v
		}
	}

	return &Error{
		code:     code,
		message:  message,
		category: category,
		metadata: meta,
	}
}

// newErrorWithInner creates a new Error with the specified category and inner error
func newErrorWithInner(category ErrorCategory, code, message string, inner error, metadata map[string]interface{}) *Error {
	var meta map[string]interface{}
	if metadata != nil {
		meta = make(map[string]interface{})
		for k, v := range metadata {
			meta[k] = v
		}
	}

	return &Error{
		code:     code,
		message:  message,
		category: category,
		metadata: meta,
		inner:    inner,
	}
}

// DomainError creates a new domain error
func DomainError(code, message string) *Error {
	return newError(Domain, code, message, nil)
}

// DomainErrorWithMetadata creates a new domain error with metadata
func DomainErrorWithMetadata(code, message string, metadata map[string]interface{}) *Error {
	return newError(Domain, code, message, metadata)
}

// ValidationError creates a new validation error
func ValidationError(code, message string) *Error {
	return newError(Validation, code, message, nil)
}

// ValidationErrorWithMetadata creates a new validation error with metadata
func ValidationErrorWithMetadata(code, message string, metadata map[string]interface{}) *Error {
	return newError(Validation, code, message, metadata)
}

// InfrastructureError creates a new infrastructure error
func InfrastructureError(code, message string) *Error {
	return newError(Infrastructure, code, message, nil)
}

// InfrastructureErrorWithMetadata creates a new infrastructure error with metadata
func InfrastructureErrorWithMetadata(code, message string, metadata map[string]interface{}) *Error {
	return newError(Infrastructure, code, message, metadata)
}

// ConcurrencyError creates a new concurrency error
func ConcurrencyError(code, message string) *Error {
	return newError(Concurrency, code, message, nil)
}

// ConcurrencyErrorWithMetadata creates a new concurrency error with metadata
func ConcurrencyErrorWithMetadata(code, message string, metadata map[string]interface{}) *Error {
	return newError(Concurrency, code, message, metadata)
}

// SecurityError creates a new security error
func SecurityError(code, message string) *Error {
	return newError(Security, code, message, nil)
}

// SecurityErrorWithMetadata creates a new security error with metadata
func SecurityErrorWithMetadata(code, message string, metadata map[string]interface{}) *Error {
	return newError(Security, code, message, metadata)
}

// NewError creates a new error with specified parameters
func NewError(code, message string, category ErrorCategory, metadata map[string]interface{}) *Error {
	return newError(category, code, message, metadata)
}

// NewErrorWithInner creates a new error with an inner error
func NewErrorWithInner(code, message string, category ErrorCategory, inner error, metadata map[string]interface{}) *Error {
	return newErrorWithInner(category, code, message, inner, metadata)
}

// NewDomainError creates a new domain error (alias for DomainError)
func NewDomainError(code, message string) *Error {
	return DomainError(code, message)
}

// NewValidationError creates a new validation error (alias for ValidationError)
func NewValidationError(code, message string) *Error {
	return ValidationError(code, message)
}

// NewInfrastructureError creates a new infrastructure error (alias for InfrastructureError)
func NewInfrastructureError(code, message string) *Error {
	return InfrastructureError(code, message)
}

// NewConcurrencyError creates a new concurrency error (alias for ConcurrencyError)
func NewConcurrencyError(code, message string) *Error {
	return ConcurrencyError(code, message)
}

// NewSecurityError creates a new security error (alias for SecurityError)
func NewSecurityError(code, message string) *Error {
	return SecurityError(code, message)
}