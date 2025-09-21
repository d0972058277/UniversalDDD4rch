// Package contracts defines the core interface contracts for Architecture.Core Go implementation
// These interfaces ensure cross-language consistency and provide the foundation for TDD implementation
package contracts

import (
	"context"
	"time"
)

// EntityID represents a comparable identifier that can be used for entities and aggregates
type EntityID interface {
	comparable
	String() string
}

// =============================================================================
// DOMAIN ABSTRACTIONS
// =============================================================================

// AggregateRoot represents the root of an aggregate with version control and event tracking
// Requirements: FR-001, FR-002
type AggregateRoot[TID EntityID] interface {
	// Identity and versioning
	ID() TID
	Version() int64

	// Domain event management (FR-002)
	DomainEvents() []DomainEvent
	AddDomainEvent(event DomainEvent)
	ClearDomainEvents()

	// Aggregate lifecycle
	MarkAsDeleted()
	IsDeleted() bool
}

// Entity represents a domain entity with identity-based equality
// Requirements: FR-003
type Entity[TID EntityID] interface {
	ID() TID
	Equals(other Entity[TID]) bool
}

// ValueObject represents an immutable value with structural equality
// Requirements: FR-004, FR-012
type ValueObject interface {
	GetEqualityComponents() []interface{}
	Equals(other ValueObject) bool
	GetHashCode() int
}

// DomainEvent represents a domain event with correlation metadata
// Requirements: FR-005
type DomainEvent interface {
	ID() string
	OccurredAt() time.Time
	CorrelationID() *string
	CausationID() *string
	Metadata() map[string]interface{}
	EventType() string
}

// Repository represents the contract for aggregate persistence
// Requirements: FR-006, FR-007
type Repository[TAggregate AggregateRoot[TID], TID EntityID] interface {
	GetByID(ctx context.Context, id TID) (Maybe[TAggregate], error)
	Save(ctx context.Context, aggregate TAggregate) error
	Delete(ctx context.Context, id TID) error
	Exists(ctx context.Context, id TID) (bool, error)
}

// =============================================================================
// FUNCTIONAL TYPES
// =============================================================================

// Result represents a computation that can succeed with a value or fail with an error
// Requirements: FR-008, FR-011, FR-013
type Result[T any] interface {
	// State queries
	IsOk() bool
	IsError() bool
	Value() T
	Error() *Error

	// Monadic operations (FR-011)
	Map(f func(T) U) Result[U]
	Bind(f func(T) Result[U]) Result[U]
	Match(onSuccess func(T) U, onError func(*Error) U) U

	// Validation
	Ensure(predicate func(T) bool, errorMessage string) Result[T]
}

// Maybe represents an optional value that may or may not exist
// Requirements: FR-009, FR-011, FR-013
type Maybe[T any] interface {
	// State queries
	HasValue() bool
	IsNone() bool
	Value() T
	ValueOr(defaultValue T) T

	// Monadic operations (FR-011)
	Map(f func(T) U) Maybe[U]
	Bind(f func(T) Maybe[U]) Maybe[U]
	Filter(predicate func(T) bool) Maybe[T]
	OrElse(alternative Maybe[T]) Maybe[T]

	// Conversion
	ToResult(errorMessage string) Result[T]
}

// ErrorCategory represents the category of an error
// Requirements: FR-010, FR-014
type ErrorCategory int

const (
	Domain ErrorCategory = iota
	Validation
	Infrastructure
	Concurrency
	Security
)

// Error represents a structured error with categorization and metadata
// Requirements: FR-010, FR-014
type Error interface {
	Code() string
	Message() string
	Category() ErrorCategory
	Metadata() map[string]interface{}
	Inner() error
	Error() string // Implements Go's error interface
	AddMetadata(key string, value interface{}) *Error
}

// =============================================================================
// FACTORY INTERFACES
// =============================================================================

// ResultFactory provides methods to create Result instances
type ResultFactory interface {
	Ok[T any](value T) Result[T]
	Fail[T any](err *Error) Result[T]
	FailWithMessage[T any](message string) Result[T]
}

// MaybeFactory provides methods to create Maybe instances
type MaybeFactory interface {
	Some[T any](value T) Maybe[T]
	None[T any]() Maybe[T]
}

// ErrorFactory provides methods to create Error instances
type ErrorFactory interface {
	NewError(code, message string, category ErrorCategory, metadata map[string]interface{}) *Error
	NewErrorWithInner(code, message string, category ErrorCategory, inner error, metadata map[string]interface{}) *Error

	// Convenience methods for common error categories
	DomainError(code, message string) *Error
	ValidationError(code, message string) *Error
	InfrastructureError(code, message string) *Error
	ConcurrencyError(code, message string) *Error
	SecurityError(code, message string) *Error
}

// =============================================================================
// MONADIC LAW VERIFICATION INTERFACES
// =============================================================================

// MonadicLaws defines the interface for verifying monadic laws
// Requirements: FR-011
type MonadicLaws[M any] interface {
	// Left Identity: return(a) >>= f ≡ f(a)
	VerifyLeftIdentity(value interface{}, f func(interface{}) M) bool

	// Right Identity: m >>= return ≡ m
	VerifyRightIdentity(m M) bool

	// Associativity: (m >>= f) >>= g ≡ m >>= (\x -> f(x) >>= g)
	VerifyAssociativity(m M, f func(interface{}) M, g func(interface{}) M) bool
}

// ResultMonadicLaws verifies monadic laws for Result types
type ResultMonadicLaws[T any] interface {
	MonadicLaws[Result[T]]
}

// MaybeMonadicLaws verifies monadic laws for Maybe types
type MaybeMonadicLaws[T any] interface {
	MonadicLaws[Maybe[T]]
}

// =============================================================================
// EQUALITY AND HASHING CONTRACTS
// =============================================================================

// EqualityComparer provides methods for comparing values
type EqualityComparer[T any] interface {
	Equals(a, b T) bool
	GetHashCode(value T) int
}

// ValueObjectEqualityComparer provides specialized equality for value objects
// Requirements: FR-012
type ValueObjectEqualityComparer interface {
	EqualityComparer[ValueObject]
	CompareComponents(a, b []interface{}) bool
	GetComponentsHashCode(components []interface{}) int
}

// =============================================================================
// TESTING CONTRACTS
// =============================================================================

// TestDataBuilder provides a contract for building test data
type TestDataBuilder[T any] interface {
	WithDefaults() TestDataBuilder[T]
	With(property string, value interface{}) TestDataBuilder[T]
	Build() T
}

// AggregateTestDataBuilder provides specialized test data building for aggregates
type AggregateTestDataBuilder[TAggregate AggregateRoot[TID], TID EntityID] interface {
	TestDataBuilder[TAggregate]
	WithID(id TID) AggregateTestDataBuilder[TAggregate, TID]
	WithVersion(version int64) AggregateTestDataBuilder[TAggregate, TID]
	WithDomainEvents(events []DomainEvent) AggregateTestDataBuilder[TAggregate, TID]
}

// RepositoryTestContract defines the testing contract for repositories
// Requirements: FR-016
type RepositoryTestContract[TAggregate AggregateRoot[TID], TID EntityID] interface {
	// Test data setup
	SetupTestData() []TAggregate
	CleanupTestData()

	// Test scenarios
	TestGetByID_Should_ReturnAggregate_When_AggregateExists()
	TestGetByID_Should_ReturnNone_When_AggregateDoesNotExist()
	TestSave_Should_PersistAggregate_When_ValidAggregateProvided()
	TestDelete_Should_MarkAsDeleted_When_AggregateExists()
	TestExists_Should_ReturnTrue_When_AggregateExists()
	TestExists_Should_ReturnFalse_When_AggregateDoesNotExist()
}

// =============================================================================
// PERFORMANCE CONTRACTS
// =============================================================================

// PerformanceContract defines performance requirements for core types
type PerformanceContract interface {
	// Memory allocation requirements
	MeasureAllocations(operation func()) int64
	VerifyZeroAllocations(operation func()) bool

	// Timing requirements
	MeasureExecutionTime(operation func()) time.Duration
	VerifyPerformanceThreshold(operation func(), maxDuration time.Duration) bool
}

// ResultPerformanceContract defines performance requirements for Result types
type ResultPerformanceContract[T any] interface {
	PerformanceContract

	// Result-specific performance requirements
	TestMap_Should_HaveZeroAllocations_When_ValueIsSmall()
	TestBind_Should_CompleteUnderThreshold_When_ChainLength(chainLength int)
	TestCombine_Should_ScaleLinearly_When_ResultCount(resultCount int)
}

// MaybePerformanceContract defines performance requirements for Maybe types
type MaybePerformanceContract[T any] interface {
	PerformanceContract

	// Maybe-specific performance requirements
	TestMap_Should_HaveZeroAllocations_When_ValueIsSmall()
	TestBind_Should_CompleteUnderThreshold_When_ChainLength(chainLength int)
	TestFilter_Should_ScaleLinearly_When_PredicateComplexity(complexity int)
}

// =============================================================================
// CROSS-LANGUAGE CONSISTENCY CONTRACTS
// =============================================================================

// CrossLanguageContract ensures consistency across language implementations
type CrossLanguageContract interface {
	// Behavioral consistency
	VerifyBehavioralConsistency(testCase string) bool

	// Structural consistency
	VerifyStructuralConsistency(typename string) bool

	// API consistency
	VerifyAPIConsistency(interfaceName string) bool
}

// SerializationContract ensures consistent serialization across languages
type SerializationContract[T any] interface {
	Serialize(value T) ([]byte, error)
	Deserialize(data []byte) (T, error)
	VerifyRoundTrip(value T) bool
}

// =============================================================================
// INTEGRATION CONTRACTS
// =============================================================================

// DatabaseIntegrationContract defines the contract for database integrations
type DatabaseIntegrationContract[TAggregate AggregateRoot[TID], TID EntityID] interface {
	Repository[TAggregate, TID]

	// Transaction support
	BeginTransaction(ctx context.Context) (Transaction, error)
	WithTransaction(ctx context.Context, tx Transaction) Repository[TAggregate, TID]
}

// Transaction represents a database transaction
type Transaction interface {
	Commit(ctx context.Context) error
	Rollback(ctx context.Context) error
	IsActive() bool
}

// HTTPIntegrationContract defines the contract for HTTP framework integrations
type HTTPIntegrationContract interface {
	// Request/Response handling
	HandleRequest(ctx context.Context, request HTTPRequest) HTTPResponse

	// Middleware support
	AddMiddleware(middleware HTTPMiddleware)

	// Error handling
	HandleError(err *Error) HTTPResponse
}

// HTTPRequest represents an HTTP request abstraction
type HTTPRequest interface {
	Method() string
	Path() string
	Headers() map[string]string
	Body() []byte
	QueryParams() map[string]string
}

// HTTPResponse represents an HTTP response abstraction
type HTTPResponse interface {
	StatusCode() int
	Headers() map[string]string
	Body() []byte
}

// HTTPMiddleware represents HTTP middleware functionality
type HTTPMiddleware interface {
	Handle(ctx context.Context, request HTTPRequest, next func(HTTPRequest) HTTPResponse) HTTPResponse
}

// =============================================================================
// VERSION COMPATIBILITY CONTRACTS
// =============================================================================

// VersionCompatibilityContract ensures backward compatibility
type VersionCompatibilityContract interface {
	// Version checking
	GetVersion() string
	IsCompatibleWith(version string) bool

	// Migration support
	MigrateFrom(oldVersion string, data interface{}) (interface{}, error)
	GetMigrationPath(fromVersion, toVersion string) []string
}

// =============================================================================
// METRICS AND OBSERVABILITY CONTRACTS
// =============================================================================

// MetricsContract defines observability requirements
type MetricsContract interface {
	// Performance metrics
	RecordOperationDuration(operation string, duration time.Duration)
	RecordOperationCount(operation string)
	RecordErrorCount(category ErrorCategory)

	// Memory metrics
	RecordMemoryUsage(component string, bytes int64)
	RecordAllocationCount(component string, count int64)
}

// ObservabilityContract defines tracing and logging requirements
type ObservabilityContract interface {
	// Tracing
	StartTrace(operationName string) TraceContext
	EndTrace(traceContext TraceContext)

	// Logging
	LogDebug(message string, metadata map[string]interface{})
	LogInfo(message string, metadata map[string]interface{})
	LogWarning(message string, metadata map[string]interface{})
	LogError(err *Error, metadata map[string]interface{})
}

// TraceContext represents a tracing context
type TraceContext interface {
	TraceID() string
	SpanID() string
	AddMetadata(key string, value interface{})
	GetMetadata() map[string]interface{}
}