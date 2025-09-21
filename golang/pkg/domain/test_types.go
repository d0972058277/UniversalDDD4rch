package domain

import (
	"context"
	"time"

	"github.com/universalddd/architecture-core-go/pkg/functional"
)

// StringID implements EntityID for testing
type StringID string

func (id StringID) String() string {
	return string(id)
}

// CustomTestID implements EntityID for testing with custom type
type CustomTestID struct {
	Value string
}

func (id CustomTestID) String() string {
	return id.Value
}

// Support any generic EntityID type
func NewTestEntityWithAnyID[TID EntityID](id TID) *BaseEntity[TID] {
	return NewBaseEntity(id)
}

// TestEntity is a concrete implementation for testing Entity functionality
type TestEntity struct {
	*BaseEntity[StringID]
}

func NewTestEntity(id string) *TestEntity {
	return &TestEntity{
		BaseEntity: NewBaseEntity(StringID(id)),
	}
}

// TestEntityWithCustomID is a concrete implementation with custom ID type
type TestEntityWithCustomID struct {
	*BaseEntity[CustomTestID]
}

func NewTestEntityWithCustomID(id CustomTestID) *TestEntityWithCustomID {
	return &TestEntityWithCustomID{
		BaseEntity: NewBaseEntity(id),
	}
}

func (te *TestEntity) GetID() StringID {
	return te.ID()
}

func (te *TestEntity) GetHashCode() uint64 {
	return te.BaseEntity.GetHashCode()
}

func (tec *TestEntityWithCustomID) GetID() CustomTestID {
	return tec.ID()
}

func (tec *TestEntityWithCustomID) GetHashCode() uint64 {
	return tec.BaseEntity.GetHashCode()
}

// TestAggregate is a concrete implementation for testing AggregateRoot functionality
type TestAggregate struct {
	*BaseAggregateRoot[StringID]
	state string
}

func NewTestAggregate(id string) *TestAggregate {
	return &TestAggregate{
		BaseAggregateRoot: NewBaseAggregateRoot(StringID(id)),
		state:             "initial",
	}
}

func (ta *TestAggregate) ModifyState(newState string) {
	ta.state = newState
	ta.IncrementVersion()
}

func (ta *TestAggregate) GetState() string {
	return ta.state
}

// Convenience methods for contract tests
func (ta *TestAggregate) GetVersion() int64 {
	return ta.Version()
}

func (ta *TestAggregate) GetEvents() []DomainEvent {
	return ta.DomainEvents()
}

func (ta *TestAggregate) ClearEvents() {
	ta.ClearDomainEvents()
}

func (ta *TestAggregate) AddTestEvent(event DomainEvent) {
	ta.AddDomainEvent(event)
}

func (ta *TestAggregate) GetID() StringID {
	return ta.ID()
}

// TestEvent is a concrete implementation for testing DomainEvent functionality
type TestEvent struct {
	*BaseDomainEvent
	payload string
}

func NewTestEvent(eventType string, payload ...string) *TestEvent {
	var eventPayload string
	if len(payload) > 0 {
		eventPayload = payload[0]
	}
	return &TestEvent{
		BaseDomainEvent: NewBaseDomainEvent(eventType),
		payload:         eventPayload,
	}
}

func NewTestEventWithCorrelation(eventType, correlationID string) *TestEvent {
	corrID := &correlationID
	return &TestEvent{
		BaseDomainEvent: NewBaseDomainEventWithCorrelation(eventType, corrID, nil, nil),
		payload:         "",
	}
}

func NewTestEventWithCausation(eventType, causationID string) *TestEvent {
	causID := &causationID
	return &TestEvent{
		BaseDomainEvent: NewBaseDomainEventWithCorrelation(eventType, nil, causID, nil),
		payload:         "",
	}
}

func (te *TestEvent) GetPayload() string {
	return te.payload
}

// Convenience methods for contract tests
func (te *TestEvent) GetID() string {
	return te.ID()
}

func (te *TestEvent) GetOccurredAt() time.Time {
	return te.OccurredAt()
}

func (te *TestEvent) GetCorrelationID() string {
	corr := te.CorrelationID()
	if corr != nil {
		return *corr
	}
	return ""
}

func (te *TestEvent) GetCausationID() string {
	caus := te.CausationID()
	if caus != nil {
		return *caus
	}
	return ""
}

func (te *TestEvent) GetMetadata() map[string]interface{} {
	return te.Metadata()
}

func NewTestEventWithMetadata(eventType string, metadata map[string]interface{}) *TestEvent {
	return &TestEvent{
		BaseDomainEvent: NewBaseDomainEventWithCorrelation(eventType, nil, nil, metadata),
		payload:         "",
	}
}

// TestValueObject is a concrete implementation for testing ValueObject functionality
type TestValueObject struct {
	*BaseValueObject
	value1 string
	value2 int
}

func NewTestValueObject(value1 string, value2 int) *TestValueObject {
	return &TestValueObject{
		BaseValueObject: &BaseValueObject{},
		value1:          value1,
		value2:          value2,
	}
}

func (tvo *TestValueObject) GetEqualityComponents() []interface{} {
	return []interface{}{tvo.value1, tvo.value2}
}

func (tvo *TestValueObject) Equals(other ValueObject) bool {
	return ValueObjectEquals(tvo, other)
}

func (tvo *TestValueObject) GetHashCode() uint64 {
	return ValueObjectHashCode(tvo)
}

func (tvo *TestValueObject) GetValue1() string {
	return tvo.value1
}

func (tvo *TestValueObject) GetValue2() int {
	return tvo.value2
}

// TestRepository is a concrete implementation for testing Repository functionality
type TestRepository struct {
	data map[StringID]*TestAggregate
}

func NewTestRepository() *TestRepository {
	return &TestRepository{
		data: make(map[StringID]*TestAggregate),
	}
}

func (tr *TestRepository) GetByID(ctx context.Context, id StringID) (functional.Maybe[*TestAggregate], error) {
	select {
	case <-ctx.Done():
		return functional.None[*TestAggregate](), ctx.Err()
	default:
	}

	if aggregate, exists := tr.data[id]; exists {
		return functional.Some(aggregate), nil
	}
	return functional.None[*TestAggregate](), nil
}

func (tr *TestRepository) Save(ctx context.Context, aggregate *TestAggregate) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}

	tr.data[aggregate.ID()] = aggregate
	return nil
}

func (tr *TestRepository) Delete(ctx context.Context, id StringID) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}

	delete(tr.data, id)
	return nil
}

func (tr *TestRepository) Exists(ctx context.Context, id StringID) (bool, error) {
	select {
	case <-ctx.Done():
		return false, ctx.Err()
	default:
	}

	_, exists := tr.data[id]
	return exists, nil
}

// Async alias methods for test compatibility
func (tr *TestRepository) AddAsync(ctx context.Context, aggregate *TestAggregate) functional.Result[bool] {
	err := tr.Save(ctx, aggregate)
	if err != nil {
		return functional.Fail[bool](functional.InfrastructureError("SAVE_FAILED", err.Error()))
	}
	return functional.Ok(true)
}

func (tr *TestRepository) GetByIDAsync(ctx context.Context, id StringID) functional.Maybe[*TestAggregate] {
	maybe, err := tr.GetByID(ctx, id)
	if err != nil {
		// In this simplified test implementation, we'll return None on error
		return functional.None[*TestAggregate]()
	}
	return maybe
}

func (tr *TestRepository) UpdateAsync(ctx context.Context, aggregate *TestAggregate) functional.Result[bool] {
	err := tr.Save(ctx, aggregate)
	if err != nil {
		return functional.Fail[bool](functional.InfrastructureError("UPDATE_FAILED", err.Error()))
	}
	return functional.Ok(true)
}

func (tr *TestRepository) DeleteAsync(ctx context.Context, id StringID) functional.Result[bool] {
	err := tr.Delete(ctx, id)
	if err != nil {
		return functional.Fail[bool](functional.InfrastructureError("DELETE_FAILED", err.Error()))
	}
	return functional.Ok(true)
}

func (tr *TestRepository) ExistsAsync(ctx context.Context, id StringID) functional.Result[bool] {
	exists, err := tr.Exists(ctx, id)
	if err != nil {
		return functional.Fail[bool](functional.InfrastructureError("EXISTS_FAILED", err.Error()))
	}
	return functional.Ok(exists)
}

// TestMoney is a value object for testing money operations
type TestMoney struct {
	*BaseValueObject
	amount   float64
	currency string
}

func NewTestMoney(amount float64, currency string) *TestMoney {
	return &TestMoney{
		BaseValueObject: &BaseValueObject{},
		amount:          amount,
		currency:        currency,
	}
}

func (tm *TestMoney) GetEqualityComponents() []interface{} {
	return []interface{}{tm.amount, tm.currency}
}

func (tm *TestMoney) Equals(other ValueObject) bool {
	return ValueObjectEquals(tm, other)
}

func (tm *TestMoney) GetHashCode() uint64 {
	return ValueObjectHashCode(tm)
}

func (tm *TestMoney) Amount() float64 {
	return tm.amount
}

func (tm *TestMoney) Currency() string {
	return tm.currency
}

func (tm *TestMoney) GetAmount() float64 {
	return tm.amount
}

func (tm *TestMoney) GetCurrency() string {
	return tm.currency
}

// TestValueObjectWithNil is a value object that has nil components for testing
type TestValueObjectWithNil struct {
	*BaseValueObject
	value1 *string
	value2 *int
}

func NewTestValueObjectWithNil(values ...*interface{}) *TestValueObjectWithNil {
	var value1 *string
	var value2 *int

	if len(values) >= 1 && values[0] != nil {
		if s, ok := (*values[0]).(string); ok {
			value1 = &s
		}
	}
	if len(values) >= 2 && values[1] != nil {
		if i, ok := (*values[1]).(int); ok {
			value2 = &i
		}
	}

	return &TestValueObjectWithNil{
		BaseValueObject: &BaseValueObject{},
		value1:          value1,
		value2:          value2,
	}
}

func (tvon *TestValueObjectWithNil) GetEqualityComponents() []interface{} {
	return []interface{}{tvon.value1, tvon.value2}
}

func (tvon *TestValueObjectWithNil) Equals(other ValueObject) bool {
	return ValueObjectEquals(tvon, other)
}

func (tvon *TestValueObjectWithNil) GetHashCode() uint64 {
	return ValueObjectHashCode(tvon)
}

// TestValueObjectWithCollection is a value object that contains collections for testing
type TestValueObjectWithCollection struct {
	*BaseValueObject
	items []string
	tags  map[string]int
}

func NewTestValueObjectWithCollection(items []string, tags ...map[string]int) *TestValueObjectWithCollection {
	var tagsMap map[string]int
	if len(tags) > 0 {
		tagsMap = tags[0]
	}

	return &TestValueObjectWithCollection{
		BaseValueObject: &BaseValueObject{},
		items:           items,
		tags:            tagsMap,
	}
}

func (tvoc *TestValueObjectWithCollection) GetEqualityComponents() []interface{} {
	return []interface{}{tvoc.items, tvoc.tags}
}

func (tvoc *TestValueObjectWithCollection) Equals(other ValueObject) bool {
	return ValueObjectEquals(tvoc, other)
}

func (tvoc *TestValueObjectWithCollection) GetHashCode() uint64 {
	return ValueObjectHashCode(tvoc)
}

// TestAddress is a value object for testing address operations
type TestAddress struct {
	*BaseValueObject
	street   string
	city     string
	zipCode  string
	country  string
}

func NewTestAddress(street, city, zipCode, country string) *TestAddress {
	return &TestAddress{
		BaseValueObject: &BaseValueObject{},
		street:          street,
		city:            city,
		zipCode:         zipCode,
		country:         country,
	}
}

func (ta *TestAddress) GetEqualityComponents() []interface{} {
	return []interface{}{ta.street, ta.city, ta.zipCode, ta.country}
}

func (ta *TestAddress) Equals(other ValueObject) bool {
	return ValueObjectEquals(ta, other)
}

func (ta *TestAddress) GetHashCode() uint64 {
	return ValueObjectHashCode(ta)
}

func (ta *TestAddress) Street() string {
	return ta.street
}

func (ta *TestAddress) City() string {
	return ta.city
}

func (ta *TestAddress) ZipCode() string {
	return ta.zipCode
}

func (ta *TestAddress) Country() string {
	return ta.country
}