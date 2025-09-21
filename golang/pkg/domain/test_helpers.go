package domain

import ()

// Test helper types and functions for contract tests

// TestEntity is a concrete implementation for testing Entity functionality
type TestEntity struct {
	*Entity[string]
}

// NewTestEntity creates a new test entity
func NewTestEntity(id string) *TestEntity {
	return &TestEntity{
		Entity: NewEntity(id),
	}
}

// TestEntityWithCustomID is a concrete implementation with custom ID type
type TestEntityWithCustomID struct {
	*Entity[CustomTestID]
}

// CustomTestID is a custom ID type for testing
type CustomTestID struct {
	Value string
}

// NewTestEntityWithCustomID creates a new test entity with custom ID
func NewTestEntityWithCustomID(id CustomTestID) *TestEntityWithCustomID {
	return &TestEntityWithCustomID{
		Entity: NewEntity(id),
	}
}

// TestAggregate is a concrete implementation for testing AggregateRoot functionality
type TestAggregate struct {
	*AggregateRoot[string]
	state string
}

// NewTestAggregate creates a new test aggregate
func NewTestAggregate(id string) *TestAggregate {
	return &TestAggregate{
		AggregateRoot: NewAggregateRoot(id),
		state:         "initial",
	}
}

// ModifyState modifies the aggregate state and increments version
func (ta *TestAggregate) ModifyState(newState string) {
	ta.state = newState
	ta.IncrementVersion()

	// Add a test event
	event := NewTestEvent("StateModified")
	ta.AddEvent(event)
}

// GetState returns the current state
func (ta *TestAggregate) GetState() string {
	return ta.state
}

// AddTestEvent is a helper method for adding test events
func (ta *TestAggregate) AddTestEvent(event IDomainEvent) {
	ta.AddEvent(event)
}

// TestEvent is a concrete implementation for testing DomainEvent functionality
type TestEvent struct {
	*DomainEventBase
	name string
}

// NewTestEvent creates a new test event
func NewTestEvent(name string) *TestEvent {
	base := NewDomainEventBase("TestEvent", "test-aggregate", "TestAggregate")
	return &TestEvent{
		DomainEventBase: base,
		name:            name,
	}
}

// NewTestEventWithCorrelation creates a new test event with correlation
func NewTestEventWithCorrelation(name, correlationID string) *TestEvent {
	base := NewDomainEventBaseWithCorrelation("TestEvent", "test-aggregate", "TestAggregate", correlationID, "", nil)
	return &TestEvent{
		DomainEventBase: base,
		name:            name,
	}
}

// NewTestEventWithCausation creates a new test event with causation
func NewTestEventWithCausation(name, causationID string) *TestEvent {
	base := NewDomainEventBaseWithCorrelation("TestEvent", "test-aggregate", "TestAggregate", "", causationID, nil)
	return &TestEvent{
		DomainEventBase: base,
		name:            name,
	}
}

// NewTestEventWithMetadata creates a new test event with metadata
func NewTestEventWithMetadata(name string, metadata map[string]interface{}) *TestEvent {
	base := NewDomainEventBaseWithCorrelation("TestEvent", "test-aggregate", "TestAggregate", "", "", metadata)
	return &TestEvent{
		DomainEventBase: base,
		name:            name,
	}
}

// GetName returns the event name
func (te *TestEvent) GetName() string {
	return te.name
}

// TestMoney is a concrete value object for testing
type TestMoney struct {
	ValueObject
	amount   float64
	currency string
}

// NewTestMoney creates a new test money value object
func NewTestMoney(amount float64, currency string) *TestMoney {
	return &TestMoney{
		amount:   amount,
		currency: currency,
	}
}

// GetAmount returns the amount
func (tm *TestMoney) GetAmount() float64 {
	return tm.amount
}

// GetCurrency returns the currency
func (tm *TestMoney) GetCurrency() string {
	return tm.currency
}

// GetEqualityComponents returns the equality components
func (tm *TestMoney) GetEqualityComponents() []interface{} {
	return []interface{}{tm.amount, tm.currency}
}

// TestValueObjectWithNil is a value object with nil components for testing
type TestValueObjectWithNil struct {
	ValueObject
	value interface{}
}

// NewTestValueObjectWithNil creates a new test value object with nil
func NewTestValueObjectWithNil() *TestValueObjectWithNil {
	return &TestValueObjectWithNil{
		value: nil,
	}
}

// GetEqualityComponents returns the equality components (with nil)
func (tv *TestValueObjectWithNil) GetEqualityComponents() []interface{} {
	return []interface{}{tv.value}
}

// TestValueObjectWithCollection is a value object with collection for testing
type TestValueObjectWithCollection struct {
	ValueObject
	items []string
}

// NewTestValueObjectWithCollection creates a new test value object with collection
func NewTestValueObjectWithCollection(items []string) *TestValueObjectWithCollection {
	// Copy the slice to ensure immutability
	itemsCopy := make([]string, len(items))
	copy(itemsCopy, items)

	return &TestValueObjectWithCollection{
		items: itemsCopy,
	}
}

// GetEqualityComponents returns the equality components (with collection)
func (tv *TestValueObjectWithCollection) GetEqualityComponents() []interface{} {
	return []interface{}{tv.items}
}

// TestAddress is a multi-field value object for testing
type TestAddress struct {
	ValueObject
	street     string
	city       string
	postalCode string
	country    string
}

// NewTestAddress creates a new test address
func NewTestAddress(street, city, postalCode, country string) *TestAddress {
	return &TestAddress{
		street:     street,
		city:       city,
		postalCode: postalCode,
		country:    country,
	}
}

// GetEqualityComponents returns the equality components
func (ta *TestAddress) GetEqualityComponents() []interface{} {
	return []interface{}{ta.street, ta.city, ta.postalCode, ta.country}
}

// TestRepository is a concrete repository implementation for testing
type TestRepository struct {
	*InMemoryRepository[*TestAggregate, string]
}

// NewTestRepository creates a new test repository
func NewTestRepository() *TestRepository {
	return &TestRepository{
		InMemoryRepository: NewInMemoryRepository[*TestAggregate, string](),
	}
}