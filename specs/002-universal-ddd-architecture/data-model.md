# Data Model: Universal DDD Architecture Multi-Language Consistency v2.0

## Core Entities and Value Objects

### AggregateRoot<TId>
**Purpose**: Base class for aggregate roots with consistent event management and versioning across all languages

**Language-Specific Implementations**:

#### C# Implementation
```csharp
public abstract class AggregateRoot<TId> : Entity<TId>
{
    // Consistent property names across languages (semantically)
    public IReadOnlyList<IDomainEvent> Events { get; }
    public long Version { get; protected set; }

    // Consistent method signatures
    protected void AddEvent(IDomainEvent domainEvent)
    public void ClearEvents()
    public void IncrementVersion()
}
```

#### Go Implementation
```go
// Go uses interfaces and composition patterns
type AggregateRoot[T EntityId] interface {
    Entity[T]
    DomainEvents() []DomainEvent
    AddDomainEvent(event DomainEvent)
    ClearDomainEvents()
    Version() int64
    IncrementVersion()
}
```

#### Java Implementation
```java
// Java uses abstract classes with generics
public abstract class AggregateRoot<TId> extends Entity<TId> {
    private final List<DomainEvent> domainEvents = new ArrayList<>();
    private long version;

    public List<DomainEvent> getDomainEvents() { return Collections.unmodifiableList(domainEvents); }
    protected void addDomainEvent(DomainEvent event) { domainEvents.add(event); }
    public void clearDomainEvents() { domainEvents.clear(); }
    public long getVersion() { return version; }
    public void incrementVersion() { this.version++; }
}
```

#### Python Implementation
```python
# Python uses properties and snake_case
class AggregateRoot(Entity[TId], ABC):
    def __init__(self, id: TId):
        super().__init__(id)
        self._domain_events: List[DomainEvent] = []
        self._version: int = 0

    @property
    def domain_events(self) -> List[DomainEvent]:
        return self._domain_events.copy()

    def add_event(self, event: DomainEvent) -> None:
        self._domain_events.append(event)

    def clear_events(self) -> None:
        self._domain_events.clear()

    @property
    def version(self) -> int:
        return self._version

    def increment_version(self) -> None:
        self._version += 1
```

#### TypeScript Implementation
```typescript
// TypeScript uses properties and camelCase
export abstract class AggregateRoot<TId> extends Entity<TId> {
    private _events: IDomainEvent[] = [];
    private _version: number = 0;

    get events(): readonly IDomainEvent[] {
        return Object.freeze([...this._events]);
    }

    protected addEvent(event: IDomainEvent): void {
        this._events.push(event);
    }

    clearEvents(): void {
        this._events.length = 0;
    }

    get version(): number {
        return this._version;
    }

    incrementVersion(): void {
        this._version++;
    }
}
```

### Repository<TAggregate, TId> Interface
**Purpose**: Consistent data access patterns with Result-based error handling

**Standardized Operations**:
- GetById: Retrieve aggregate by identifier
- Add: Create new aggregate
- Update: Modify existing aggregate
- Delete: Remove aggregate
- Exists: Check aggregate existence

**Language-Specific Implementations**:

#### C# Implementation
```csharp
public interface IRepository<TAggregate, TId>
    where TAggregate : AggregateRoot<TId>
    where TId : notnull
{
    Task<Maybe<TAggregate>> GetByIdAsync(TId id, CancellationToken cancellationToken = default);
    Task<Result> AddAsync(TAggregate aggregate, CancellationToken cancellationToken = default);
    Task<Result> UpdateAsync(TAggregate aggregate, CancellationToken cancellationToken = default);
    Task<Result> DeleteAsync(TId id, CancellationToken cancellationToken = default);
    Task<Result<bool>> ExistsAsync(TId id, CancellationToken cancellationToken = default);
}
```

#### Go Implementation
```go
// Go uses context for cancellation and explicit error handling
type Repository[TAggregate AggregateRoot[TId], TId EntityId] interface {
    GetByID(ctx context.Context, id TId) (Maybe[TAggregate], error)
    Add(ctx context.Context, aggregate TAggregate) error
    Update(ctx context.Context, aggregate TAggregate) error
    Delete(ctx context.Context, id TId) error
    Exists(ctx context.Context, id TId) (bool, error)
}
```

#### Java Implementation
```java
// Java uses CompletableFuture for async operations
public interface Repository<TAggregate extends AggregateRoot<TId>, TId> {
    CompletableFuture<Maybe<TAggregate>> getByIdAsync(TId id);
    CompletableFuture<Result<Void>> addAsync(TAggregate aggregate);
    CompletableFuture<Result<Void>> updateAsync(TAggregate aggregate);
    CompletableFuture<Result<Void>> deleteAsync(TId id);
    CompletableFuture<Result<Boolean>> existsAsync(TId id);
}
```

#### Python Implementation
```python
# Python uses async/await with proper Result types
class Repository(ABC, Generic[TAggregate, TId]):
    @abstractmethod
    async def get_by_id_async(self, id: TId) -> Maybe[TAggregate]:
        pass

    @abstractmethod
    async def add_async(self, aggregate: TAggregate) -> Result[None]:
        pass

    @abstractmethod
    async def update_async(self, aggregate: TAggregate) -> Result[None]:
        pass

    @abstractmethod
    async def delete_async(self, id: TId) -> Result[None]:
        pass

    @abstractmethod
    async def exists_async(self, id: TId) -> Result[bool]:
        pass
```

#### TypeScript Implementation
```typescript
// TypeScript uses Promise-based async
export interface Repository<TAggregate extends AggregateRoot<TId>, TId> {
    getByIdAsync(id: TId): Promise<Maybe<TAggregate>>;
    addAsync(aggregate: TAggregate): Promise<Result<void>>;
    updateAsync(aggregate: TAggregate): Promise<Result<void>>;
    deleteAsync(id: TId): Promise<Result<void>>;
    existsAsync(id: TId): Promise<ResultOf<boolean>>;
}
```

### Result<T> Monad
**Purpose**: Consistent functional error handling across all languages

**Standard Operations**:
- Success creation: Language-appropriate static methods
- Failure creation: Error-based failure construction
- Monadic operations: map, bind, match
- Value access: Safe extraction patterns

**Language-Specific Implementations**:

#### C# Implementation
```csharp
public class Result<T>
{
    // Creation methods
    public static Result<T> Ok(T value) => new(value);
    public static Result<T> Fail(Error error) => new(error);

    // Monadic operations
    public Result<TNew> Map<TNew>(Func<T, TNew> mapper)
    public Result<TNew> Bind<TNew>(Func<T, Result<TNew>> binder)
    public TResult Match<TResult>(Func<T, TResult> onSuccess, Func<Error, TResult> onFailure)

    // Properties
    public bool IsSuccess { get; }
    public T Value { get; } // Throws on failure
    public Error Error { get; }
}
```

#### Go Implementation
```go
// Go uses value types and functions for monadic operations
type Result[T any] struct {
    value T
    error error
    isSuccess bool
}

// Creation functions
func Ok[T any](value T) Result[T]
func Fail[T any](err error) Result[T]

// Monadic operations as functions (Go idiom)
func Map[T, U any](result Result[T], mapper func(T) U) Result[U]
func Bind[T, U any](result Result[T], binder func(T) Result[U]) Result[U]
func Match[T, U any](result Result[T], onSuccess func(T) U, onFailure func(error) U) U
```

#### Java Implementation
```java
// Java uses static factory methods and method chaining
public final class Result<T> {
    // Creation methods
    public static <T> Result<T> success(T value)
    public static <T> Result<T> failure(Error error)

    // Monadic operations
    public <U> Result<U> map(Function<T, U> mapper)
    public <U> Result<U> bind(Function<T, Result<U>> binder)
    public <U> U match(Function<T, U> onSuccess, Function<Error, U> onFailure)

    // Accessors
    public boolean isSuccess()
    public T getValue() // Throws on failure
    public Error getError()
}
```

#### Python Implementation
```python
# Python uses properties and method chaining
class Result(Generic[T]):
    @staticmethod
    def success(value: T) -> Result[T]:
        return Result(value, None, True)

    @staticmethod
    def failure(error: Error) -> Result[T]:
        return Result(None, error, False)

    def map(self, mapper: Callable[[T], U]) -> Result[U]:
        # Implementation

    def bind(self, binder: Callable[[T], Result[U]]) -> Result[U]:
        # Implementation

    def match(self, on_success: Callable[[T], U], on_failure: Callable[[Error], U]) -> U:
        # Implementation

    @property
    def is_success(self) -> bool:
        return self._is_success

    @property
    def value(self) -> T:  # Raises exception on failure
        if not self._is_success:
            raise ValueError("Cannot access value of failed result")
        return self._value
```

#### TypeScript Implementation
```typescript
// TypeScript uses static methods and method chaining
export class Result<T> {
    // Creation methods
    static ok<T>(value: T): Result<T>
    static fail<T>(error: Error): Result<T>

    // Monadic operations
    map<U>(mapper: (value: T) => U): Result<U>
    bind<U>(binder: (value: T) => Result<U>): Result<U>
    match<U>(onSuccess: (value: T) => U, onFailure: (error: Error) => U): U

    // Properties
    get isSuccess(): boolean
    get value(): T // Throws on failure
    get error(): Error
}
```

## Package Architecture Model

### Core Package Structure
Each language maintains the same conceptual structure:

```
core/
├── domain/
│   ├── entities/
│   │   ├── Entity<TId>
│   │   └── AggregateRoot<TId>
│   ├── value-objects/
│   │   └── ValueObject
│   ├── events/
│   │   ├── IDomainEvent
│   │   └── DomainEventBase
│   └── repositories/
│       └── IRepository<TAggregate, TId>
├── functional/
│   ├── Result<T>
│   ├── Maybe<T>
│   └── Error
└── infrastructure/
    └── [Language-specific implementations]
```

### Integration Package Structure
Framework-specific extensions:

```
integration-{framework}/
├── repositories/
│   ├── EntityFrameworkRepository (C#)
│   ├── SpringDataRepository (Java)
│   ├── DjangoRepository (Python)
│   ├── GormRepository (Go)
│   └── TypeOrmRepository (TypeScript)
├── configuration/
│   └── [Framework-specific DI setup]
└── converters/
    └── [Framework-specific type conversions]
```

## Cross-Language Contract Validation

### Contract Test Entities
Each implementation must provide identical behavior for these test scenarios:

#### Customer Aggregate (Test Entity)
```
Customer:
  - Id: CustomerId (value object)
  - Email: EmailAddress (value object)
  - Name: CustomerName (value object)
  - Version: long/int64
  - Events: Domain events collection

Behaviors:
  - ChangeEmail(newEmail) -> raises CustomerEmailChanged
  - IncrementVersion() -> version++
  - AddEvent/ClearEvents -> event management
```

#### Order Aggregate (Test Entity)
```
Order:
  - Id: OrderId (value object)
  - CustomerId: CustomerId (reference)
  - Items: OrderItem[] (value objects)
  - Status: OrderStatus (enum)
  - Total: Money (value object)

Behaviors:
  - AddItem(product, quantity) -> raises ItemAdded
  - RemoveItem(productId) -> raises ItemRemoved
  - ConfirmOrder() -> status = Confirmed, raises OrderConfirmed
```

## Validation Rules

### Entity Validation
- Identity equality: Two entities with same ID are equal
- Reference equality: Different for value objects vs entities
- Null/undefined handling: Consistent across languages

### Value Object Validation
- Structural equality: Based on all component values
- Immutability: No setter methods, only constructor assignment
- Validation: Constructor validates invariants

### Result Monad Laws
All implementations must satisfy:
1. **Left Identity**: `Result.Ok(a).bind(f) == f(a)`
2. **Right Identity**: `m.bind(Result.Ok) == m`
3. **Associativity**: `m.bind(f).bind(g) == m.bind(x => f(x).bind(g))`

### Repository Contract Tests
- GetById with existing ID returns Some/value
- GetById with non-existing ID returns None/empty
- Add with valid aggregate succeeds
- Add with duplicate ID fails
- Update with existing aggregate succeeds
- Update with non-existing aggregate fails
- Delete with existing ID succeeds
- Delete with non-existing ID succeeds (idempotent)
- Exists returns correct boolean values

## Migration Strategy

### Backward Compatibility
Each language provides deprecated shims for v1 APIs:

```
[Obsolete("Use IncrementVersion() instead", false)]
public void UpdateVersion() => IncrementVersion();

@Deprecated(since = "2.0", forRemoval = true)
public void updateVersion() { incrementVersion(); }

@deprecated("Use increment_version() instead")
def update_version(self) -> None:
    self.increment_version()
```

### Version Coordination
All packages use semantic versioning with coordinated releases:
- Major: Breaking changes across all languages
- Minor: New features with backward compatibility
- Patch: Bug fixes and performance improvements

Release coordination ensures cross-language compatibility within same major.minor versions.