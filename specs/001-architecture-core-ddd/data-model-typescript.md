# Data Model: TypeScript Node.js Implementation

**Date**: 2025-09-21
**Language**: TypeScript 5.9+ with Node.js 22 LTS
**Scope**: Core types, relationships, and validation rules for DDD abstractions and functional types

## Core Type Hierarchy

### Functional Types Foundation

#### Error Type
```typescript
enum ErrorCategory {
  Domain = "Domain",
  Validation = "Validation",
  Infrastructure = "Infrastructure",
  Concurrency = "Concurrency",
  Security = "Security"
}

interface IError {
  readonly code: string;
  readonly message: string;
  readonly category: ErrorCategory;
  readonly metadata: ReadonlyMap<string, any>;
  readonly innerError?: IError;
}

class Error implements IError {
  readonly code: string;
  readonly message: string;
  readonly category: ErrorCategory;
  readonly metadata: ReadonlyMap<string, any>;
  readonly innerError?: IError;

  constructor(
    code: string,
    message: string,
    category: ErrorCategory,
    metadata?: Map<string, any>,
    innerError?: IError
  );

  static domain(code: string, message: string, metadata?: Map<string, any>): Error;
  static validation(code: string, message: string, metadata?: Map<string, any>): Error;
  static infrastructure(code: string, message: string, metadata?: Map<string, any>): Error;
  static concurrency(code: string, message: string, metadata?: Map<string, any>): Error;
  static security(code: string, message: string, metadata?: Map<string, any>): Error;
}
```

**Validation Rules**:
- Code must be non-empty string in namespace format (e.g., "Domain.OrderNotFound")
- Message must be non-empty string
- Category must be valid ErrorCategory enum value
- Metadata can be empty but not null
- InnerError creates error chain for root cause analysis

#### Result Types
```typescript
interface IResult {
  readonly isSuccess: boolean;
  readonly isFailure: boolean;
  readonly error?: Error;
}

interface IResult<T> extends IResult {
  readonly value?: T;
}

abstract class Result implements IResult {
  abstract readonly isSuccess: boolean;
  abstract readonly isFailure: boolean;
  abstract readonly error?: Error;

  // Static factory methods
  static ok(): Result;
  static fail(error: Error): Result;

  // Monadic operations
  map(fn: () => void): Result;
  bind(fn: () => Result): Result;
  match<U>(onSuccess: () => U, onFailure: (error: Error) => U): U;
  ensure(predicate: () => boolean, error: Error): Result;

  // Combinators
  static combine(...results: Result[]): Result;
  static combineWithValue<T>(...results: Result<T>[]): Result<T[]>;
}

abstract class Result<T> implements IResult<T> {
  abstract readonly isSuccess: boolean;
  abstract readonly isFailure: boolean;
  abstract readonly value?: T;
  abstract readonly error?: Error;

  // Static factory methods
  static ok<T>(value: T): Result<T>;
  static fail<T>(error: Error): Result<T>;
  static from<T>(maybe: Maybe<T>, error: Error): Result<T>;

  // Monadic operations
  map<U>(fn: (value: T) => U): Result<U>;
  bind<U>(fn: (value: T) => Result<U>): Result<U>;
  match<U>(onSuccess: (value: T) => U, onFailure: (error: Error) => U): U;
  ensure(predicate: (value: T) => boolean, error: Error): Result<T>;

  // Value extraction (unsafe)
  getValueOrThrow(): T;
  getValueOrDefault(defaultValue: T): T;
}
```

**Validation Rules**:
- Result can be Success or Failure, never both
- Success Result must not have error
- Failure Result must have error
- Result<T> Success must have value of type T
- Result<T> Failure must not have value
- Monadic operations maintain type safety

#### Maybe Type
```typescript
interface IMaybe<T> {
  readonly hasValue: boolean;
  readonly value?: T;
}

abstract class Maybe<T> implements IMaybe<T> {
  abstract readonly hasValue: boolean;
  abstract readonly value?: T;

  // Static factory methods
  static some<T>(value: T): Maybe<T>;
  static none<T>(): Maybe<T>;
  static from<T>(value: T | null | undefined): Maybe<T>;

  // Monadic operations
  map<U>(fn: (value: T) => U): Maybe<U>;
  bind<U>(fn: (value: T) => Maybe<U>): Maybe<U>;
  match<U>(onSome: (value: T) => U, onNone: () => U): U;

  // Value extraction
  orElse(defaultValue: T): T;
  orElseGet(supplier: () => T): T;
  orElseThrow(error?: Error): T;

  // Filtering and testing
  filter(predicate: (value: T) => boolean): Maybe<T>;
  exists(predicate: (value: T) => boolean): boolean;

  // Conversion
  toResult(error: Error): Result<T>;
  toArray(): T[];
}
```

**Validation Rules**:
- Maybe can be Some or None, never both
- Some Maybe must have value of type T
- None Maybe must not have value
- null and undefined values convert to None
- Monadic operations preserve None state

### DDD Abstractions

#### Value Object Base Class
```typescript
abstract class ValueObject {
  private _cachedHashCode?: number;

  // Abstract method for structural equality
  protected abstract getEqualityComponents(): any[];

  // Equality operations
  equals(other: ValueObject): boolean;
  getHashCode(): number;

  // Utility methods
  toString(): string;

  // Static utility methods
  protected static componentEquals(left: any, right: any): boolean;
  protected static combineHashCodes(...hashCodes: number[]): number;
}
```

**Validation Rules**:
- All properties must be readonly or have private setters
- getEqualityComponents() must return all significant fields
- Equality components must be consistently ordered
- Hash code must be stable across object lifetime
- No mutable state after construction

#### Entity Base Class
```typescript
interface IEntity<TId> {
  readonly id: TId;
}

abstract class Entity<TId> implements IEntity<TId> {
  readonly id: TId;

  constructor(id: TId);

  // Identity-based equality
  equals(other: Entity<TId>): boolean;
  getHashCode(): number;

  // Domain invariant protection
  protected checkInvariant(condition: boolean, message: string): void;
}
```

**Validation Rules**:
- Id must be immutable after construction
- Id cannot be null or undefined
- Equality based solely on Id and type
- Identity must be unique within aggregate boundary
- Invariant violations throw domain exceptions

#### Aggregate Root Interface and Base
```typescript
interface IAggregateRoot<TId> extends IEntity<TId> {
  readonly version: number;
  readonly domainEvents: ReadonlyArray<IDomainEvent>;
}

abstract class AggregateRoot<TId> extends Entity<TId> implements IAggregateRoot<TId> {
  private _version: number;
  private _domainEvents: IDomainEvent[];

  readonly version: number;
  readonly domainEvents: ReadonlyArray<IDomainEvent>;

  constructor(id: TId);

  // Version management
  protected incrementVersion(): void;

  // Event management
  protected addDomainEvent(domainEvent: IDomainEvent): void;
  clearDomainEvents(): void;

  // Optimistic concurrency support
  markEventsAsCommitted(): void;
}
```

**Validation Rules**:
- Version starts at 0 and increments on state changes
- Domain events are append-only during transaction
- Events cleared only after successful persistence
- Version used for optimistic concurrency control
- State changes must trigger appropriate domain events

#### Domain Event Interfaces
```typescript
interface IDomainEvent {
  readonly id: string;
  readonly occurredAt: Date;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly metadata: ReadonlyMap<string, any>;
}

abstract class DomainEventBase implements IDomainEvent {
  readonly id: string;
  readonly occurredAt: Date;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly metadata: ReadonlyMap<string, any>;

  constructor(
    correlationId?: string,
    causationId?: string,
    metadata?: Map<string, any>
  );

  // Serialization support
  toJSON(): object;
  static fromJSON(json: object): DomainEventBase;
}
```

**Validation Rules**:
- Id generated using crypto.randomUUID()
- OccurredAt set to current timestamp
- CorrelationId for request tracking across services
- CausationId for event causation chains
- Metadata immutable after construction
- Events must be serializable for persistence

#### Repository Interface
```typescript
interface IRepository<TAggregate extends IAggregateRoot<TId>, TId> {
  // Query operations
  getByIdAsync(id: TId, signal?: AbortSignal): Promise<Maybe<TAggregate>>;
  existsAsync(id: TId, signal?: AbortSignal): Promise<boolean>;

  // Command operations
  addAsync(aggregate: TAggregate, signal?: AbortSignal): Promise<Result<void>>;
  updateAsync(aggregate: TAggregate, signal?: AbortSignal): Promise<Result<void>>;
  deleteAsync(id: TId, signal?: AbortSignal): Promise<Result<void>>;

  // Batch operations
  addRangeAsync(aggregates: TAggregate[], signal?: AbortSignal): Promise<Result<void>>;
  updateRangeAsync(aggregates: TAggregate[], signal?: AbortSignal): Promise<Result<void>>;
}

abstract class RepositoryBase<TAggregate extends IAggregateRoot<TId>, TId>
  implements IRepository<TAggregate, TId> {

  // Abstract methods for derived classes
  protected abstract persistAddAsync(aggregate: TAggregate, signal?: AbortSignal): Promise<Result<void>>;
  protected abstract persistUpdateAsync(aggregate: TAggregate, signal?: AbortSignal): Promise<Result<void>>;
  protected abstract persistDeleteAsync(id: TId, signal?: AbortSignal): Promise<Result<void>>;
  protected abstract loadByIdAsync(id: TId, signal?: AbortSignal): Promise<Maybe<TAggregate>>;

  // Template method implementations
  async addAsync(aggregate: TAggregate, signal?: AbortSignal): Promise<Result<void>>;
  async updateAsync(aggregate: TAggregate, signal?: AbortSignal): Promise<Result<void>>;
  async deleteAsync(id: TId, signal?: AbortSignal): Promise<Result<void>>;
  async getByIdAsync(id: TId, signal?: AbortSignal): Promise<Maybe<TAggregate>>;
  async existsAsync(id: TId, signal?: AbortSignal): Promise<boolean>;
}
```

**Validation Rules**:
- All operations support cancellation via AbortSignal
- Failed operations return Result.fail() with specific error
- Not found scenarios return Maybe.none()
- Aggregate version checked for optimistic concurrency
- Repository responsible for domain event persistence
- Transaction boundaries managed by repository implementation

## Type Relationships

### Inheritance Hierarchy
```
Object
├── ValueObject (abstract)
│   └── [Concrete value objects]
├── Entity<TId> (abstract)
│   └── AggregateRoot<TId> (abstract)
│       └── [Concrete aggregates]
├── DomainEventBase (abstract)
│   └── [Concrete domain events]
├── Error
├── Result/Result<T> (abstract)
│   ├── SuccessResult/SuccessResult<T>
│   └── FailureResult/FailureResult<T>
└── Maybe<T> (abstract)
    ├── SomeMaybe<T>
    └── NoneMaybe<T>
```

### Composition Relationships
- AggregateRoot contains collection of IDomainEvent
- Result<T> contains either value T or Error
- Maybe<T> contains optional value T
- Error contains optional inner Error (chain)
- Repository operates on AggregateRoot entities

### Generic Constraints
```typescript
// Repository aggregate constraint
interface IRepository<TAggregate extends IAggregateRoot<TId>, TId>

// Entity identity constraint
class Entity<TId extends string | number | symbol>

// Result value constraint
class Result<T> // T can be any type

// Maybe value constraint
class Maybe<T> // T can be any type except null/undefined
```

## Validation and Invariants

### Cross-Type Validation
1. **Aggregate Consistency**: All entities within aggregate must have consistent state
2. **Event Ordering**: Domain events must be ordered by occurrence time
3. **Version Consistency**: Aggregate version must increment with each state change
4. **Error Propagation**: Errors must maintain causal chain through inner errors
5. **Cancellation**: All async operations must respect AbortSignal cancellation

### Business Rule Enforcement
1. **Identity Uniqueness**: Entity IDs unique within aggregate boundary
2. **Immutability**: Value objects immutable after construction
3. **Event Immutability**: Domain events immutable after creation
4. **State Transitions**: Only valid state transitions through aggregate methods
5. **Concurrency**: Optimistic concurrency control via version numbers

### Performance Constraints
1. **Memory Efficiency**: Minimal object allocation in hot paths
2. **Hash Code Stability**: Value object hash codes stable across lifetime
3. **Event Collection**: Domain events stored efficiently for batch processing
4. **Async Operations**: Non-blocking operations with proper cancellation
5. **Type Safety**: Compile-time guarantees eliminate runtime type checking

## Integration Points

### Express.js Integration
- Middleware for automatic Result<T> to HTTP response mapping
- Error handling middleware for domain exceptions
- Request correlation ID propagation through domain events

### TypeORM Integration
- Entity mapping for aggregate roots and entities
- Custom types for value objects
- Event store implementation for domain events
- Optimistic concurrency with version columns

### Validation Integration
- class-validator decorators for value object validation
- Custom validators for domain rules
- Async validation support with Result<T> return types

### Testing Integration
- Jest matchers for Result<T> and Maybe<T> assertions
- Test builders for complex aggregate construction
- Property-based testing for monadic law verification
- Performance benchmarks for equality operations

This data model provides the foundation for implementing a comprehensive DDD architecture with functional programming principles in TypeScript, maintaining consistency with the C# implementation while leveraging TypeScript-specific language features and Node.js ecosystem best practices.