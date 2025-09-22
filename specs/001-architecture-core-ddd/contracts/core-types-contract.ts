/**
 * Architecture.Core TypeScript Contracts
 *
 * This file defines the public API contracts for the Architecture.Core library
 * implemented in TypeScript with Node.js. These contracts ensure consistency
 * across implementations and provide compile-time guarantees for consumers.
 *
 * @version 1.0.0
 * @language TypeScript 5.9+
 * @runtime Node.js 22 LTS
 */

// ====================
// FUNCTIONAL TYPES
// ====================

/**
 * Error categories for structured error handling
 */
export enum ErrorCategory {
  Domain = "Domain",
  Validation = "Validation",
  Infrastructure = "Infrastructure",
  Concurrency = "Concurrency",
  Security = "Security"
}

/**
 * Structured error information with categorization and metadata
 */
export interface IError {
  readonly code: string;
  readonly message: string;
  readonly category: ErrorCategory;
  readonly metadata: ReadonlyMap<string, any>;
  readonly innerError?: IError;
}

/**
 * Result type for operations that can succeed or fail
 */
export interface IResult {
  readonly isSuccess: boolean;
  readonly isFailure: boolean;
  readonly error?: IError;
}

/**
 * Result type with value for operations that return data
 */
export interface IResult<T> extends IResult {
  readonly value?: T;
}

/**
 * Optional value type for safe null handling
 */
export interface IMaybe<T> {
  readonly hasValue: boolean;
  readonly value?: T;
}

// ====================
// DDD ABSTRACTIONS
// ====================

/**
 * Entity with identity-based equality
 */
export interface IEntity<TId> {
  readonly id: TId;
}

/**
 * Aggregate root with version control and domain events
 */
export interface IAggregateRoot<TId> extends IEntity<TId> {
  readonly version: number;
  readonly domainEvents: ReadonlyArray<IDomainEvent>;
}

/**
 * Domain event with correlation metadata
 */
export interface IDomainEvent {
  readonly id: string;
  readonly occurredAt: Date;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly metadata: ReadonlyMap<string, any>;
}

/**
 * Repository interface for aggregate persistence
 */
export interface IRepository<TAggregate extends IAggregateRoot<TId>, TId> {
  getByIdAsync(id: TId, signal?: AbortSignal): Promise<IMaybe<TAggregate>>;
  addAsync(aggregate: TAggregate, signal?: AbortSignal): Promise<IResult<void>>;
  updateAsync(aggregate: TAggregate, signal?: AbortSignal): Promise<IResult<void>>;
  deleteAsync(id: TId, signal?: AbortSignal): Promise<IResult<void>>;
  existsAsync(id: TId, signal?: AbortSignal): Promise<boolean>;
}

// ====================
// ABSTRACT BASE CLASSES
// ====================

/**
 * Base class for value objects with structural equality
 */
export abstract class ValueObject {
  /**
   * Returns the components used for equality comparison
   * Must be implemented by derived classes
   */
  protected abstract getEqualityComponents(): any[];

  /**
   * Compares this value object with another for equality
   */
  public equals(other: ValueObject): boolean;

  /**
   * Returns a hash code for this value object
   */
  public getHashCode(): number;

  /**
   * Returns a string representation of this value object
   */
  public toString(): string;
}

/**
 * Base class for entities with identity-based equality
 */
export abstract class Entity<TId> implements IEntity<TId> {
  public readonly id: TId;

  constructor(id: TId);

  /**
   * Compares this entity with another based on identity
   */
  public equals(other: Entity<TId>): boolean;

  /**
   * Returns a hash code based on the entity's identity
   */
  public getHashCode(): number;

  /**
   * Validates domain invariants (throws on violation)
   */
  protected checkInvariant(condition: boolean, message: string): void;
}

/**
 * Base class for aggregate roots with event collection
 */
export abstract class AggregateRoot<TId> extends Entity<TId> implements IAggregateRoot<TId> {
  public readonly version: number;
  public readonly domainEvents: ReadonlyArray<IDomainEvent>;

  constructor(id: TId);

  /**
   * Increments the aggregate version
   */
  protected incrementVersion(): void;

  /**
   * Adds a domain event to the aggregate's event collection
   */
  protected addDomainEvent(domainEvent: IDomainEvent): void;

  /**
   * Clears all domain events from the aggregate
   */
  public clearDomainEvents(): void;

  /**
   * Marks events as committed (for optimistic concurrency)
   */
  public markEventsAsCommitted(): void;
}

/**
 * Base class for domain events with standard metadata
 */
export abstract class DomainEventBase implements IDomainEvent {
  public readonly id: string;
  public readonly occurredAt: Date;
  public readonly correlationId?: string;
  public readonly causationId?: string;
  public readonly metadata: ReadonlyMap<string, any>;

  constructor(
    correlationId?: string,
    causationId?: string,
    metadata?: Map<string, any>
  );

  /**
   * Converts the domain event to a JSON object
   */
  public toJSON(): object;
}

// ====================
// FUNCTIONAL TYPE IMPLEMENTATIONS
// ====================

/**
 * Error implementation with categorization and metadata
 */
export class Error implements IError {
  public readonly code: string;
  public readonly message: string;
  public readonly category: ErrorCategory;
  public readonly metadata: ReadonlyMap<string, any>;
  public readonly innerError?: IError;

  constructor(
    code: string,
    message: string,
    category: ErrorCategory,
    metadata?: Map<string, any>,
    innerError?: IError
  );

  // Factory methods for different error categories
  public static domain(code: string, message: string, metadata?: Map<string, any>): Error;
  public static validation(code: string, message: string, metadata?: Map<string, any>): Error;
  public static infrastructure(code: string, message: string, metadata?: Map<string, any>): Error;
  public static concurrency(code: string, message: string, metadata?: Map<string, any>): Error;
  public static security(code: string, message: string, metadata?: Map<string, any>): Error;
}

/**
 * Result implementation for operations without return values
 */
export abstract class Result implements IResult {
  public abstract readonly isSuccess: boolean;
  public abstract readonly isFailure: boolean;
  public abstract readonly error?: Error;

  // Factory methods
  public static ok(): Result;
  public static fail(error: Error): Result;

  // Monadic operations
  public map(fn: () => void): Result;
  public bind(fn: () => Result): Result;
  public match<U>(onSuccess: () => U, onFailure: (error: Error) => U): U;
  public ensure(predicate: () => boolean, error: Error): Result;

  // Combinators
  public static combine(...results: Result[]): Result;
}

/**
 * Result implementation for operations with return values
 */
export abstract class Result<T> implements IResult<T> {
  public abstract readonly isSuccess: boolean;
  public abstract readonly isFailure: boolean;
  public abstract readonly value?: T;
  public abstract readonly error?: Error;

  // Factory methods
  public static ok<T>(value: T): Result<T>;
  public static fail<T>(error: Error): Result<T>;
  public static from<T>(maybe: Maybe<T>, error: Error): Result<T>;

  // Monadic operations
  public map<U>(fn: (value: T) => U): Result<U>;
  public bind<U>(fn: (value: T) => Result<U>): Result<U>;
  public match<U>(onSuccess: (value: T) => U, onFailure: (error: Error) => U): U;
  public ensure(predicate: (value: T) => boolean, error: Error): Result<T>;

  // Value extraction
  public getValueOrThrow(): T;
  public getValueOrDefault(defaultValue: T): T;

  // Combinators
  public static combineWithValue<T>(...results: Result<T>[]): Result<T[]>;
}

/**
 * Maybe implementation for optional values
 */
export abstract class Maybe<T> implements IMaybe<T> {
  public abstract readonly hasValue: boolean;
  public abstract readonly value?: T;

  // Factory methods
  public static some<T>(value: T): Maybe<T>;
  public static none<T>(): Maybe<T>;
  public static from<T>(value: T | null | undefined): Maybe<T>;

  // Monadic operations
  public map<U>(fn: (value: T) => U): Maybe<U>;
  public bind<U>(fn: (value: T) => Maybe<U>): Maybe<U>;
  public match<U>(onSome: (value: T) => U, onNone: () => U): U;

  // Value extraction
  public orElse(defaultValue: T): T;
  public orElseGet(supplier: () => T): T;
  public orElseThrow(error?: Error): T;

  // Filtering and testing
  public filter(predicate: (value: T) => boolean): Maybe<T>;
  public exists(predicate: (value: T) => boolean): boolean;

  // Conversion
  public toResult(error: Error): Result<T>;
  public toArray(): T[];
}

// ====================
// TYPE GUARDS AND UTILITIES
// ====================

/**
 * Type guard for Result success
 */
export function isSuccess<T>(result: Result<T>): result is Result<T> & { value: T };

/**
 * Type guard for Result failure
 */
export function isFailure<T>(result: Result<T>): result is Result<T> & { error: Error };

/**
 * Type guard for Maybe some
 */
export function isSome<T>(maybe: Maybe<T>): maybe is Maybe<T> & { value: T };

/**
 * Type guard for Maybe none
 */
export function isNone<T>(maybe: Maybe<T>): maybe is Maybe<T>;

// ====================
// MODULE EXPORTS
// ====================

export {
  // Interfaces
  IError,
  IResult,
  IMaybe,
  IEntity,
  IAggregateRoot,
  IDomainEvent,
  IRepository,

  // Classes
  ValueObject,
  Entity,
  AggregateRoot,
  DomainEventBase,
  Error,
  Result,
  Maybe,

  // Enums
  ErrorCategory,

  // Type guards
  isSuccess,
  isFailure,
  isSome,
  isNone
};

// ====================
// CONTRACT TESTS
// ====================

/**
 * Contract test interfaces - these must be implemented
 * in the actual test suite to verify API compliance
 */
export interface IContractTests {
  // Value Object contracts
  testValueObjectStructuralEquality(): Promise<void>;
  testValueObjectHashCodeStability(): Promise<void>;
  testValueObjectImmutability(): Promise<void>;

  // Entity contracts
  testEntityIdentityEquality(): Promise<void>;
  testEntityInvariantValidation(): Promise<void>;

  // Aggregate Root contracts
  testAggregateVersionIncrement(): Promise<void>;
  testAggregateEventCollection(): Promise<void>;
  testAggregateEventClearing(): Promise<void>;

  // Domain Event contracts
  testDomainEventMetadata(): Promise<void>;
  testDomainEventSerialization(): Promise<void>;

  // Result contracts
  testResultMonadicLaws(): Promise<void>;
  testResultCombinators(): Promise<void>;
  testResultTypeGuards(): Promise<void>;

  // Maybe contracts
  testMaybeMonadicLaws(): Promise<void>;
  testMaybeNullHandling(): Promise<void>;

  // Repository contracts
  testRepositoryCancellation(): Promise<void>;
  testRepositoryErrorHandling(): Promise<void>;
  testRepositoryOptionalResults(): Promise<void>;
}

/**
 * Performance contract requirements
 */
export interface IPerformanceContracts {
  // Memory efficiency requirements
  testValueObjectMemoryUsage(): Promise<void>;
  testResultMemoryUsage(): Promise<void>;
  testMaybeMemoryUsage(): Promise<void>;

  // Execution time requirements
  testValueObjectEqualityPerformance(): Promise<void>;
  testAggregateEventPerformance(): Promise<void>;
  testRepositoryAsyncPerformance(): Promise<void>;
}