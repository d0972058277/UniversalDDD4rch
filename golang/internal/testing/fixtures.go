package testing

import (
	"context"
	"sync"
	"time"

	"github.com/universalddd/architecture-core-go/pkg/domain"
	"github.com/universalddd/architecture-core-go/pkg/functional"
)

// TestFixtures provides common test data and utilities for testing
type TestFixtures struct {
	mu sync.RWMutex
}

// NewTestFixtures creates a new instance of test fixtures
func NewTestFixtures() *TestFixtures {
	return &TestFixtures{}
}

// =============================================================================
// ENTITY ID FIXTURES
// =============================================================================

// TestEntityID is a simple string-based entity ID for testing
type TestEntityID struct {
	value string
}

func NewTestEntityID(value string) TestEntityID {
	return TestEntityID{value: value}
}

func (t TestEntityID) String() string {
	return t.value
}

// ValidEntityIDs returns a slice of valid entity IDs for testing
func (f *TestFixtures) ValidEntityIDs() []TestEntityID {
	return []TestEntityID{
		NewTestEntityID("test-id-1"),
		NewTestEntityID("test-id-2"),
		NewTestEntityID("test-id-3"),
		NewTestEntityID("valid-uuid-format"),
		NewTestEntityID("another-valid-id"),
	}
}

// InvalidEntityIDs returns a slice of invalid entity IDs for testing
func (f *TestFixtures) InvalidEntityIDs() []TestEntityID {
	return []TestEntityID{
		NewTestEntityID(""),
		NewTestEntityID(" "),
		NewTestEntityID("\n"),
		NewTestEntityID("\t"),
	}
}

// =============================================================================
// VALUE OBJECT FIXTURES
// =============================================================================

// TestValueObject is a sample value object for testing
type TestValueObject struct {
	StringField string
	IntField    int
	BoolField   bool
}

func NewTestValueObject(str string, i int, b bool) TestValueObject {
	return TestValueObject{
		StringField: str,
		IntField:    i,
		BoolField:   b,
	}
}

func (t TestValueObject) GetEqualityComponents() []interface{} {
	return []interface{}{t.StringField, t.IntField, t.BoolField}
}

func (t TestValueObject) Equals(other domain.ValueObject) bool {
	if otherTest, ok := other.(TestValueObject); ok {
		return t.StringField == otherTest.StringField &&
			t.IntField == otherTest.IntField &&
			t.BoolField == otherTest.BoolField
	}
	return false
}

func (t TestValueObject) GetHashCode() uint64 {
	hash := uint64(17)
	hash = hash*31 + uint64(hashString(t.StringField))
	hash = hash*31 + uint64(t.IntField)
	hash = hash*31 + uint64(hashBool(t.BoolField))
	return hash
}

// ValidValueObjects returns a collection of valid value objects for testing
func (f *TestFixtures) ValidValueObjects() []TestValueObject {
	return []TestValueObject{
		NewTestValueObject("test", 42, true),
		NewTestValueObject("another", 100, false),
		NewTestValueObject("", 0, false),
		NewTestValueObject("special chars: !@#$%", -1, true),
		NewTestValueObject("unicode: 你好世界", 999, false),
	}
}

// EqualValueObjectPairs returns pairs of value objects that should be equal
func (f *TestFixtures) EqualValueObjectPairs() [][]TestValueObject {
	return [][]TestValueObject{
		{NewTestValueObject("test", 42, true), NewTestValueObject("test", 42, true)},
		{NewTestValueObject("", 0, false), NewTestValueObject("", 0, false)},
		{NewTestValueObject("same", 123, true), NewTestValueObject("same", 123, true)},
	}
}

// UnequalValueObjectPairs returns pairs of value objects that should not be equal
func (f *TestFixtures) UnequalValueObjectPairs() [][]TestValueObject {
	return [][]TestValueObject{
		{NewTestValueObject("test", 42, true), NewTestValueObject("test", 42, false)},
		{NewTestValueObject("test", 42, true), NewTestValueObject("different", 42, true)},
		{NewTestValueObject("test", 42, true), NewTestValueObject("test", 99, true)},
		{NewTestValueObject("", 0, false), NewTestValueObject("non-empty", 0, false)},
	}
}

// =============================================================================
// DOMAIN EVENT FIXTURES
// =============================================================================

// TestDomainEvent is a sample domain event for testing
type TestDomainEvent struct {
	id            string
	occurredAt    time.Time
	correlationID *string
	causationID   *string
	metadata      map[string]interface{}
	eventType     string
	payload       map[string]interface{}
}

func NewTestDomainEvent(eventType string, payload map[string]interface{}) TestDomainEvent {
	return TestDomainEvent{
		id:         generateTestID(),
		occurredAt: time.Now().UTC(),
		eventType:  eventType,
		payload:    payload,
		metadata:   make(map[string]interface{}),
	}
}

func NewTestDomainEventWithCorrelation(eventType string, correlationID, causationID *string, payload map[string]interface{}) TestDomainEvent {
	return TestDomainEvent{
		id:            generateTestID(),
		occurredAt:    time.Now().UTC(),
		correlationID: correlationID,
		causationID:   causationID,
		eventType:     eventType,
		payload:       payload,
		metadata:      make(map[string]interface{}),
	}
}

func (t TestDomainEvent) ID() string                        { return t.id }
func (t TestDomainEvent) OccurredAt() time.Time             { return t.occurredAt }
func (t TestDomainEvent) CorrelationID() *string            { return t.correlationID }
func (t TestDomainEvent) CausationID() *string              { return t.causationID }
func (t TestDomainEvent) Metadata() map[string]interface{}  { return t.metadata }
func (t TestDomainEvent) EventType() string                 { return t.eventType }
func (t TestDomainEvent) Payload() map[string]interface{}   { return t.payload }

// ValidDomainEvents returns a collection of valid domain events for testing
func (f *TestFixtures) ValidDomainEvents() []TestDomainEvent {
	correlationID := "test-correlation-123"
	causationID := "test-causation-456"

	return []TestDomainEvent{
		NewTestDomainEvent("TestEvent", map[string]interface{}{"key": "value"}),
		NewTestDomainEvent("AnotherEvent", map[string]interface{}{"number": 42}),
		NewTestDomainEventWithCorrelation("EventWithCorrelation", &correlationID, nil, map[string]interface{}{"test": true}),
		NewTestDomainEventWithCorrelation("EventWithBoth", &correlationID, &causationID, map[string]interface{}{"complete": "event"}),
		NewTestDomainEvent("EmptyPayload", map[string]interface{}{}),
	}
}

// =============================================================================
// AGGREGATE ROOT FIXTURES
// =============================================================================

// TestAggregateRoot is a sample aggregate root for testing
type TestAggregateRoot struct {
	id      TestEntityID
	version int64
	events  []domain.DomainEvent
	deleted bool
	data    map[string]interface{}
}

func NewTestAggregateRoot(id TestEntityID) *TestAggregateRoot {
	return &TestAggregateRoot{
		id:      id,
		version: 0,
		events:  make([]domain.DomainEvent, 0),
		deleted: false,
		data:    make(map[string]interface{}),
	}
}

func (t *TestAggregateRoot) ID() TestEntityID                    { return t.id }
func (t *TestAggregateRoot) Version() int64                     { return t.version }
func (t *TestAggregateRoot) DomainEvents() []domain.DomainEvent { return t.events }
func (t *TestAggregateRoot) IsDeleted() bool                    { return t.deleted }
func (t *TestAggregateRoot) SetData(key string, value interface{}) { t.data[key] = value }
func (t *TestAggregateRoot) GetData(key string) interface{}     { return t.data[key] }

func (t *TestAggregateRoot) AddDomainEvent(event domain.DomainEvent) {
	t.events = append(t.events, event)
}

func (t *TestAggregateRoot) ClearDomainEvents() {
	t.events = t.events[:0]
}

func (t *TestAggregateRoot) MarkAsDeleted() {
	t.deleted = true
	t.AddDomainEvent(NewTestDomainEvent("AggregateDeleted", map[string]interface{}{
		"aggregateId": t.id.String(),
		"version":     t.version,
	}))
}

func (t *TestAggregateRoot) IncrementVersion() {
	t.version++
}

// ValidAggregateRoots returns a collection of valid aggregate roots for testing
func (f *TestFixtures) ValidAggregateRoots() []*TestAggregateRoot {
	aggregates := make([]*TestAggregateRoot, 0)

	for _, id := range f.ValidEntityIDs() {
		agg := NewTestAggregateRoot(id)
		agg.SetData("created", time.Now())
		agg.SetData("testField", "testValue")
		aggregates = append(aggregates, agg)
	}

	return aggregates
}

// =============================================================================
// ERROR FIXTURES
// =============================================================================

// ValidErrors returns a collection of valid errors for testing
func (f *TestFixtures) ValidErrors() []*functional.Error {
	return []*functional.Error{
		functional.NewDomainError("Domain.TestError", "Test domain error"),
		functional.NewValidationError("Validation.Required", "Field is required"),
		functional.NewInfrastructureError("Infrastructure.Database", "Database connection failed"),
		functional.NewConcurrencyError("Concurrency.OptimisticLock", "Version conflict detected"),
		functional.NewSecurityError("Security.Unauthorized", "Access denied"),
	}
}

// ErrorsByCategory returns errors grouped by category for testing
func (f *TestFixtures) ErrorsByCategory() map[functional.ErrorCategory][]*functional.Error {
	return map[functional.ErrorCategory][]*functional.Error{
		functional.Domain: {
			functional.NewDomainError("Domain.InvalidState", "Invalid aggregate state"),
			functional.NewDomainError("Domain.BusinessRule", "Business rule violation"),
		},
		functional.Validation: {
			functional.NewValidationError("Validation.Required", "Required field missing"),
			functional.NewValidationError("Validation.Format", "Invalid format"),
		},
		functional.Infrastructure: {
			functional.NewInfrastructureError("Infrastructure.Database", "Database error"),
			functional.NewInfrastructureError("Infrastructure.Network", "Network timeout"),
		},
		functional.Concurrency: {
			functional.NewConcurrencyError("Concurrency.OptimisticLock", "Version conflict"),
			functional.NewConcurrencyError("Concurrency.Deadlock", "Deadlock detected"),
		},
		functional.Security: {
			functional.NewSecurityError("Security.Unauthorized", "Access denied"),
			functional.NewSecurityError("Security.InvalidToken", "Invalid security token"),
		},
	}
}

// =============================================================================
// RESULT FIXTURES
// =============================================================================

// ValidResults returns a collection of valid results for testing
func (f *TestFixtures) ValidResults() []functional.Result[string] {
	return []functional.Result[string]{
		functional.Ok("success value"),
		functional.Ok("another success"),
		functional.Ok(""),
		functional.Fail[string](functional.NewDomainError("Test.Error", "Test error")),
	}
}

// ValidResultsInt returns a collection of valid integer results for testing
func (f *TestFixtures) ValidResultsInt() []functional.Result[int] {
	return []functional.Result[int]{
		functional.Ok(42),
		functional.Ok(0),
		functional.Ok(-1),
		functional.Fail[int](functional.NewValidationError("Test.Invalid", "Invalid number")),
	}
}

// =============================================================================
// MAYBE FIXTURES
// =============================================================================

// ValidMaybes returns a collection of valid maybe values for testing
func (f *TestFixtures) ValidMaybes() []functional.Maybe[string] {
	return []functional.Maybe[string]{
		functional.Some("value"),
		functional.Some("another value"),
		functional.Some(""),
		functional.None[string](),
	}
}

// ValidMaybesInt returns a collection of valid integer maybe values for testing
func (f *TestFixtures) ValidMaybesInt() []functional.Maybe[int] {
	return []functional.Maybe[int]{
		functional.Some(42),
		functional.Some(0),
		functional.Some(-1),
		functional.None[int](),
	}
}

// =============================================================================
// REPOSITORY TEST FIXTURES
// =============================================================================

// MockRepository provides a mock repository implementation for testing
type MockRepository struct {
	mu        sync.RWMutex
	storage   map[string]*TestAggregateRoot
	saveError error
	getError  error
}

func NewMockRepository() *MockRepository {
	return &MockRepository{
		storage: make(map[string]*TestAggregateRoot),
	}
}

func (m *MockRepository) SetSaveError(err error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.saveError = err
}

func (m *MockRepository) SetGetError(err error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.getError = err
}

func (m *MockRepository) GetByID(ctx context.Context, id TestEntityID) (functional.Maybe[*TestAggregateRoot], error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.getError != nil {
		return functional.None[*TestAggregateRoot](), m.getError
	}

	if agg, exists := m.storage[id.String()]; exists {
		return functional.Some(agg), nil
	}

	return functional.None[*TestAggregateRoot](), nil
}

func (m *MockRepository) Save(ctx context.Context, aggregate *TestAggregateRoot) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.saveError != nil {
		return m.saveError
	}

	m.storage[aggregate.ID().String()] = aggregate
	return nil
}

func (m *MockRepository) Delete(ctx context.Context, id TestEntityID) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if agg, exists := m.storage[id.String()]; exists {
		agg.MarkAsDeleted()
	}

	return nil
}

func (m *MockRepository) Exists(ctx context.Context, id TestEntityID) (bool, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	_, exists := m.storage[id.String()]
	return exists, nil
}

func (m *MockRepository) Clear() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.storage = make(map[string]*TestAggregateRoot)
}

func (m *MockRepository) Count() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.storage)
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// GenerateTestContext creates a test context with timeout
func GenerateTestContext() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 30*time.Second)
}

// GenerateTestContextWithCancel creates a test context that can be cancelled
func GenerateTestContextWithCancel() (context.Context, context.CancelFunc) {
	return context.WithCancel(context.Background())
}

// Helper functions
func generateTestID() string {
	// Simple test ID generation - not cryptographically secure
	return time.Now().Format("20060102150405") + "-test"
}

func hashString(s string) int {
	h := 0
	for _, c := range s {
		h = 31*h + int(c)
	}
	return h
}

func hashBool(b bool) int {
	if b {
		return 1
	}
	return 0
}