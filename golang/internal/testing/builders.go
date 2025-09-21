package testing

import (
	"time"

	"github.com/universalddd/architecture-core-go/pkg/domain"
	"github.com/universalddd/architecture-core-go/pkg/functional"
)

// =============================================================================
// TEST DATA BUILDERS
// =============================================================================

// TestEntityIDBuilder builds test entity IDs
type TestEntityIDBuilder struct {
	value string
}

// NewTestEntityIDBuilder creates a new test entity ID builder
func NewTestEntityIDBuilder() *TestEntityIDBuilder {
	return &TestEntityIDBuilder{
		value: "default-test-id",
	}
}

// WithValue sets the entity ID value
func (b *TestEntityIDBuilder) WithValue(value string) *TestEntityIDBuilder {
	b.value = value
	return b
}

// Build creates the test entity ID
func (b *TestEntityIDBuilder) Build() TestEntityID {
	return NewTestEntityID(b.value)
}

// =============================================================================
// VALUE OBJECT BUILDER
// =============================================================================

// TestValueObjectBuilder builds test value objects
type TestValueObjectBuilder struct {
	stringField string
	intField    int
	boolField   bool
}

// NewTestValueObjectBuilder creates a new test value object builder
func NewTestValueObjectBuilder() *TestValueObjectBuilder {
	return &TestValueObjectBuilder{
		stringField: "default",
		intField:    0,
		boolField:   false,
	}
}

// WithStringField sets the string field
func (b *TestValueObjectBuilder) WithStringField(value string) *TestValueObjectBuilder {
	b.stringField = value
	return b
}

// WithIntField sets the int field
func (b *TestValueObjectBuilder) WithIntField(value int) *TestValueObjectBuilder {
	b.intField = value
	return b
}

// WithBoolField sets the bool field
func (b *TestValueObjectBuilder) WithBoolField(value bool) *TestValueObjectBuilder {
	b.boolField = value
	return b
}

// WithDefaults sets default values
func (b *TestValueObjectBuilder) WithDefaults() *TestValueObjectBuilder {
	return b.WithStringField("default").WithIntField(42).WithBoolField(true)
}

// Build creates the test value object
func (b *TestValueObjectBuilder) Build() TestValueObject {
	return NewTestValueObject(b.stringField, b.intField, b.boolField)
}

// =============================================================================
// DOMAIN EVENT BUILDER
// =============================================================================

// TestDomainEventBuilder builds test domain events
type TestDomainEventBuilder struct {
	id            string
	occurredAt    time.Time
	correlationID *string
	causationID   *string
	metadata      map[string]interface{}
	eventType     string
	payload       map[string]interface{}
}

// NewTestDomainEventBuilder creates a new test domain event builder
func NewTestDomainEventBuilder() *TestDomainEventBuilder {
	return &TestDomainEventBuilder{
		id:         generateTestID(),
		occurredAt: time.Now().UTC(),
		eventType:  "TestEvent",
		payload:    make(map[string]interface{}),
		metadata:   make(map[string]interface{}),
	}
}

// WithID sets the event ID
func (b *TestDomainEventBuilder) WithID(id string) *TestDomainEventBuilder {
	b.id = id
	return b
}

// WithOccurredAt sets the occurred at time
func (b *TestDomainEventBuilder) WithOccurredAt(time time.Time) *TestDomainEventBuilder {
	b.occurredAt = time
	return b
}

// WithCorrelationID sets the correlation ID
func (b *TestDomainEventBuilder) WithCorrelationID(correlationID string) *TestDomainEventBuilder {
	b.correlationID = &correlationID
	return b
}

// WithCausationID sets the causation ID
func (b *TestDomainEventBuilder) WithCausationID(causationID string) *TestDomainEventBuilder {
	b.causationID = &causationID
	return b
}

// WithEventType sets the event type
func (b *TestDomainEventBuilder) WithEventType(eventType string) *TestDomainEventBuilder {
	b.eventType = eventType
	return b
}

// WithPayload sets the payload
func (b *TestDomainEventBuilder) WithPayload(payload map[string]interface{}) *TestDomainEventBuilder {
	b.payload = payload
	return b
}

// WithPayloadField adds a field to the payload
func (b *TestDomainEventBuilder) WithPayloadField(key string, value interface{}) *TestDomainEventBuilder {
	if b.payload == nil {
		b.payload = make(map[string]interface{})
	}
	b.payload[key] = value
	return b
}

// WithMetadata sets the metadata
func (b *TestDomainEventBuilder) WithMetadata(metadata map[string]interface{}) *TestDomainEventBuilder {
	b.metadata = metadata
	return b
}

// WithMetadataField adds a field to the metadata
func (b *TestDomainEventBuilder) WithMetadataField(key string, value interface{}) *TestDomainEventBuilder {
	if b.metadata == nil {
		b.metadata = make(map[string]interface{})
	}
	b.metadata[key] = value
	return b
}

// WithDefaults sets default values
func (b *TestDomainEventBuilder) WithDefaults() *TestDomainEventBuilder {
	return b.
		WithEventType("DefaultTestEvent").
		WithPayloadField("defaultKey", "defaultValue").
		WithMetadataField("source", "test")
}

// Build creates the test domain event
func (b *TestDomainEventBuilder) Build() TestDomainEvent {
	return TestDomainEvent{
		id:            b.id,
		occurredAt:    b.occurredAt,
		correlationID: b.correlationID,
		causationID:   b.causationID,
		metadata:      b.metadata,
		eventType:     b.eventType,
		payload:       b.payload,
	}
}

// =============================================================================
// AGGREGATE ROOT BUILDER
// =============================================================================

// TestAggregateRootBuilder builds test aggregate roots
type TestAggregateRootBuilder struct {
	id      TestEntityID
	version int64
	events  []domain.DomainEvent
	deleted bool
	data    map[string]interface{}
}

// NewTestAggregateRootBuilder creates a new test aggregate root builder
func NewTestAggregateRootBuilder() *TestAggregateRootBuilder {
	return &TestAggregateRootBuilder{
		id:      NewTestEntityID("default-aggregate-id"),
		version: 0,
		events:  make([]domain.DomainEvent, 0),
		deleted: false,
		data:    make(map[string]interface{}),
	}
}

// WithID sets the aggregate ID
func (b *TestAggregateRootBuilder) WithID(id TestEntityID) *TestAggregateRootBuilder {
	b.id = id
	return b
}

// WithVersion sets the version
func (b *TestAggregateRootBuilder) WithVersion(version int64) *TestAggregateRootBuilder {
	b.version = version
	return b
}

// WithDomainEvent adds a domain event
func (b *TestAggregateRootBuilder) WithDomainEvent(event domain.DomainEvent) *TestAggregateRootBuilder {
	b.events = append(b.events, event)
	return b
}

// WithDomainEvents sets the domain events
func (b *TestAggregateRootBuilder) WithDomainEvents(events []domain.DomainEvent) *TestAggregateRootBuilder {
	b.events = events
	return b
}

// WithDeleted sets the deleted status
func (b *TestAggregateRootBuilder) WithDeleted(deleted bool) *TestAggregateRootBuilder {
	b.deleted = deleted
	return b
}

// WithData sets the data
func (b *TestAggregateRootBuilder) WithData(data map[string]interface{}) *TestAggregateRootBuilder {
	b.data = data
	return b
}

// WithDataField adds a data field
func (b *TestAggregateRootBuilder) WithDataField(key string, value interface{}) *TestAggregateRootBuilder {
	if b.data == nil {
		b.data = make(map[string]interface{})
	}
	b.data[key] = value
	return b
}

// WithDefaults sets default values
func (b *TestAggregateRootBuilder) WithDefaults() *TestAggregateRootBuilder {
	defaultEvent := NewTestDomainEventBuilder().
		WithEventType("AggregateCreated").
		WithPayloadField("aggregateId", b.id.String()).
		Build()

	return b.
		WithVersion(1).
		WithDomainEvent(defaultEvent).
		WithDataField("created", time.Now()).
		WithDataField("status", "active")
}

// Build creates the test aggregate root
func (b *TestAggregateRootBuilder) Build() *TestAggregateRoot {
	aggregate := &TestAggregateRoot{
		id:      b.id,
		version: b.version,
		events:  make([]domain.DomainEvent, len(b.events)),
		deleted: b.deleted,
		data:    make(map[string]interface{}),
	}

	// Copy events
	copy(aggregate.events, b.events)

	// Copy data
	for k, v := range b.data {
		aggregate.data[k] = v
	}

	return aggregate
}

// =============================================================================
// ERROR BUILDER
// =============================================================================

// ErrorBuilder builds test errors
type ErrorBuilder struct {
	code     string
	message  string
	category functional.ErrorCategory
	metadata map[string]interface{}
	inner    error
}

// NewErrorBuilder creates a new error builder
func NewErrorBuilder() *ErrorBuilder {
	return &ErrorBuilder{
		code:     "TEST.ERROR",
		message:  "Test error message",
		category: functional.Domain,
		metadata: make(map[string]interface{}),
	}
}

// WithCode sets the error code
func (b *ErrorBuilder) WithCode(code string) *ErrorBuilder {
	b.code = code
	return b
}

// WithMessage sets the error message
func (b *ErrorBuilder) WithMessage(message string) *ErrorBuilder {
	b.message = message
	return b
}

// WithCategory sets the error category
func (b *ErrorBuilder) WithCategory(category functional.ErrorCategory) *ErrorBuilder {
	b.category = category
	return b
}

// WithMetadata sets the metadata
func (b *ErrorBuilder) WithMetadata(metadata map[string]interface{}) *ErrorBuilder {
	b.metadata = metadata
	return b
}

// WithMetadataField adds a metadata field
func (b *ErrorBuilder) WithMetadataField(key string, value interface{}) *ErrorBuilder {
	if b.metadata == nil {
		b.metadata = make(map[string]interface{})
	}
	b.metadata[key] = value
	return b
}

// WithInner sets the inner error
func (b *ErrorBuilder) WithInner(inner error) *ErrorBuilder {
	b.inner = inner
	return b
}

// AsDomainError creates a domain error
func (b *ErrorBuilder) AsDomainError() *ErrorBuilder {
	return b.WithCategory(functional.Domain)
}

// AsValidationError creates a validation error
func (b *ErrorBuilder) AsValidationError() *ErrorBuilder {
	return b.WithCategory(functional.Validation)
}

// AsInfrastructureError creates an infrastructure error
func (b *ErrorBuilder) AsInfrastructureError() *ErrorBuilder {
	return b.WithCategory(functional.Infrastructure)
}

// AsConcurrencyError creates a concurrency error
func (b *ErrorBuilder) AsConcurrencyError() *ErrorBuilder {
	return b.WithCategory(functional.Concurrency)
}

// AsSecurityError creates a security error
func (b *ErrorBuilder) AsSecurityError() *ErrorBuilder {
	return b.WithCategory(functional.Security)
}

// Build creates the error
func (b *ErrorBuilder) Build() *functional.Error {
	if b.inner != nil {
		return functional.NewErrorWithInner(b.code, b.message, b.category, b.inner, b.metadata)
	}
	return functional.NewError(b.code, b.message, b.category, b.metadata)
}

// =============================================================================
// SCENARIO BUILDERS
// =============================================================================

// TestScenarioBuilder builds complete test scenarios
type TestScenarioBuilder struct {
	name        string
	description string
	aggregates  []*TestAggregateRoot
	events      []TestDomainEvent
	errors      []*functional.Error
	setup       func()
	teardown    func()
}

// NewTestScenarioBuilder creates a new test scenario builder
func NewTestScenarioBuilder(name string) *TestScenarioBuilder {
	return &TestScenarioBuilder{
		name:       name,
		aggregates: make([]*TestAggregateRoot, 0),
		events:     make([]TestDomainEvent, 0),
		errors:     make([]*functional.Error, 0),
	}
}

// WithDescription sets the scenario description
func (b *TestScenarioBuilder) WithDescription(description string) *TestScenarioBuilder {
	b.description = description
	return b
}

// WithAggregate adds an aggregate to the scenario
func (b *TestScenarioBuilder) WithAggregate(aggregate *TestAggregateRoot) *TestScenarioBuilder {
	b.aggregates = append(b.aggregates, aggregate)
	return b
}

// WithEvent adds an event to the scenario
func (b *TestScenarioBuilder) WithEvent(event TestDomainEvent) *TestScenarioBuilder {
	b.events = append(b.events, event)
	return b
}

// WithError adds an error to the scenario
func (b *TestScenarioBuilder) WithError(err *functional.Error) *TestScenarioBuilder {
	b.errors = append(b.errors, err)
	return b
}

// WithSetup sets the setup function
func (b *TestScenarioBuilder) WithSetup(setup func()) *TestScenarioBuilder {
	b.setup = setup
	return b
}

// WithTeardown sets the teardown function
func (b *TestScenarioBuilder) WithTeardown(teardown func()) *TestScenarioBuilder {
	b.teardown = teardown
	return b
}

// TestScenario represents a complete test scenario
type TestScenario struct {
	Name        string
	Description string
	Aggregates  []*TestAggregateRoot
	Events      []TestDomainEvent
	Errors      []*functional.Error
	Setup       func()
	Teardown    func()
}

// Build creates the test scenario
func (b *TestScenarioBuilder) Build() *TestScenario {
	return &TestScenario{
		Name:        b.name,
		Description: b.description,
		Aggregates:  b.aggregates,
		Events:      b.events,
		Errors:      b.errors,
		Setup:       b.setup,
		Teardown:    b.teardown,
	}
}

// Execute runs the test scenario
func (s *TestScenario) Execute(t *testing.T, testFunc func(*TestScenario)) {
	t.Helper()
	t.Run(s.Name, func(t *testing.T) {
		if s.Setup != nil {
			s.Setup()
		}
		defer func() {
			if s.Teardown != nil {
				s.Teardown()
			}
		}()

		testFunc(s)
	})
}

// =============================================================================
// BATCH BUILDERS
// =============================================================================

// BatchBuilder builds multiple test objects at once
type BatchBuilder struct {
	count int
}

// NewBatchBuilder creates a new batch builder
func NewBatchBuilder(count int) *BatchBuilder {
	return &BatchBuilder{count: count}
}

// BuildEntityIDs builds multiple entity IDs
func (b *BatchBuilder) BuildEntityIDs() []TestEntityID {
	ids := make([]TestEntityID, b.count)
	for i := 0; i < b.count; i++ {
		ids[i] = NewTestEntityIDBuilder().
			WithValue(fmt.Sprintf("batch-id-%d", i)).
			Build()
	}
	return ids
}

// BuildValueObjects builds multiple value objects
func (b *BatchBuilder) BuildValueObjects() []TestValueObject {
	objects := make([]TestValueObject, b.count)
	for i := 0; i < b.count; i++ {
		objects[i] = NewTestValueObjectBuilder().
			WithStringField(fmt.Sprintf("batch-value-%d", i)).
			WithIntField(i).
			WithBoolField(i%2 == 0).
			Build()
	}
	return objects
}

// BuildAggregateRoots builds multiple aggregate roots
func (b *BatchBuilder) BuildAggregateRoots() []*TestAggregateRoot {
	aggregates := make([]*TestAggregateRoot, b.count)
	for i := 0; i < b.count; i++ {
		id := NewTestEntityIDBuilder().
			WithValue(fmt.Sprintf("batch-aggregate-%d", i)).
			Build()

		aggregates[i] = NewTestAggregateRootBuilder().
			WithID(id).
			WithDefaults().
			Build()
	}
	return aggregates
}