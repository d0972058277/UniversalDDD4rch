# Architecture.Core Java Library Contracts

**Version**: 1.0
**Date**: 2025-09-22
**Language**: Java 21+ LTS

## Package Structure

```
com.architecture.core
├── domain/
│   ├── AggregateRoot.java
│   ├── Entity.java
│   ├── EntityId.java
│   ├── ValueObject.java
│   ├── DomainEvent.java
│   ├── DomainEventBase.java
│   └── Repository.java
├── functional/
│   ├── Result.java
│   ├── Maybe.java
│   ├── Error.java
│   ├── ErrorCategory.java
│   └── ResultException.java
└── infrastructure/
    ├── CancellationToken.java
    └── OperationCancelledException.java
```

## Domain Contracts

### EntityId<T> Interface Contract
```java
package com.architecture.core.domain;

import java.io.Serializable;
import com.architecture.core.functional.Result;

/**
 * Base interface for all entity identifiers with type safety.
 * MUST be implemented by all entity ID types.
 */
public interface EntityId<T extends EntityId<T>> extends Comparable<T>, Serializable {

    /**
     * Gets the string representation of the identifier value.
     * MUST NOT return null.
     * MUST be consistent across calls for the same instance.
     */
    String getValue();

    /**
     * Validates the identifier format and constraints.
     * MUST return Result.success() for valid identifiers.
     * MUST return Result.failure() with descriptive error for invalid identifiers.
     */
    Result<Void> validate();

    /**
     * Compares this identifier with another for ordering.
     * MUST provide consistent ordering based on getValue().
     * MUST handle null comparison gracefully.
     */
    @Override
    int compareTo(T other);

    /**
     * Determines equality based on value comparison.
     * MUST be consistent with compareTo() and hashCode().
     */
    @Override
    boolean equals(Object obj);

    /**
     * Generates hash code based on value.
     * MUST be consistent with equals().
     */
    @Override
    int hashCode();
}
```

### AggregateRoot<TId> Contract
```java
package com.architecture.core.domain;

import java.util.List;
import java.util.Objects;

/**
 * Base class for domain aggregates with event sourcing and version control.
 * MUST be extended by all aggregate root entities.
 */
public abstract class AggregateRoot<TId extends EntityId<TId>> extends Entity<TId> {

    /**
     * Constructs a new aggregate with version 0.
     * MUST NOT accept null id.
     * MUST initialize empty event collection.
     */
    protected AggregateRoot(TId id);

    /**
     * Constructs an aggregate with specified version (for rehydration).
     * MUST NOT accept null id.
     * MUST NOT accept negative version.
     */
    protected AggregateRoot(TId id, long version);

    /**
     * Gets the current version for optimistic concurrency control.
     * MUST return non-negative value.
     * MUST increment only through incrementVersion().
     */
    public final long getVersion();

    /**
     * Gets immutable view of domain events.
     * MUST return thread-safe collection.
     * MUST preserve event order.
     * MUST NOT expose internal collection directly.
     */
    public final List<DomainEvent> getDomainEvents();

    /**
     * Adds a domain event to the collection.
     * MUST NOT accept null events.
     * MUST be thread-safe.
     * MUST preserve chronological order.
     */
    protected final void addDomainEvent(DomainEvent event);

    /**
     * Clears all domain events from the collection.
     * MUST be thread-safe.
     * MUST be idempotent.
     */
    public final void clearDomainEvents();

    /**
     * Increments the version by 1.
     * MUST be called after successful persistence.
     * MUST be atomic operation.
     */
    public final void incrementVersion();
}
```

### Entity<TId> Contract
```java
package com.architecture.core.domain;

import java.util.Objects;

/**
 * Base class for domain entities with identity-based equality.
 * MUST be extended by all entity types.
 */
public abstract class Entity<TId extends EntityId<TId>> {

    /**
     * Constructs entity with immutable identifier.
     * MUST NOT accept null id.
     * MUST validate id during construction.
     */
    protected Entity(TId id);

    /**
     * Gets the immutable entity identifier.
     * MUST NOT return null.
     * MUST be consistent across calls.
     */
    public final TId getId();

    /**
     * Determines equality based solely on identifier.
     * MUST return true only if ids are equal and types match exactly.
     * MUST handle null gracefully.
     * MUST be reflexive, symmetric, and transitive.
     */
    @Override
    public final boolean equals(Object obj);

    /**
     * Generates hash code based on identifier.
     * MUST be consistent with equals().
     * MUST use id.hashCode() as basis.
     */
    @Override
    public final int hashCode();

    /**
     * Provides string representation including type and id.
     * MUST include class name and id value.
     * MUST NOT return null.
     */
    @Override
    public String toString();
}
```

### ValueObject Contract
```java
package com.architecture.core.domain;

import java.util.List;
import java.util.Objects;

/**
 * Base class for value objects with structural equality.
 * MUST be extended by all value object types.
 */
public abstract class ValueObject {

    /**
     * Returns components that define equality for this value object.
     * MUST return all fields that participate in equality comparison.
     * MUST handle null components appropriately.
     * MUST return deterministic order.
     */
    protected abstract Iterable<Object> getEqualityComponents();

    /**
     * Determines equality based on component comparison.
     * MUST compare all equality components.
     * MUST handle null values correctly.
     * MUST be reflexive, symmetric, and transitive.
     */
    @Override
    public final boolean equals(Object obj);

    /**
     * Generates hash code based on all equality components.
     * MUST be consistent with equals().
     * MUST use Objects.hash() for computation.
     */
    @Override
    public final int hashCode();

    /**
     * Provides string representation of value object.
     * MUST include type name and component values.
     * MUST be useful for debugging.
     */
    @Override
    public String toString();
}
```

### Repository<TAggregate, TId> Contract
```java
package com.architecture.core.domain;

import java.util.concurrent.CompletableFuture;
import com.architecture.core.functional.Maybe;
import com.architecture.core.functional.Result;
import com.architecture.core.infrastructure.CancellationToken;

/**
 * Generic repository interface for aggregate persistence.
 * MUST be implemented for each aggregate type.
 */
public interface Repository<TAggregate extends AggregateRoot<TId>, TId extends EntityId<TId>> {

    /**
     * Retrieves aggregate by identifier asynchronously.
     * MUST return Maybe.some() if found, Maybe.none() if not found.
     * MUST NOT return null CompletableFuture.
     * MUST respect cancellation token.
     * MUST handle infrastructure exceptions gracefully.
     */
    CompletableFuture<Maybe<TAggregate>> getByIdAsync(TId id, CancellationToken cancellationToken);

    /**
     * Adds new aggregate to repository.
     * MUST return Result.success() on successful addition.
     * MUST return Result.failure() with error details on failure.
     * MUST detect duplicate id conflicts.
     * MUST respect cancellation token.
     */
    CompletableFuture<Result<Void>> addAsync(TAggregate aggregate, CancellationToken cancellationToken);

    /**
     * Updates existing aggregate in repository.
     * MUST return Result.success() on successful update.
     * MUST return Result.failure() with error details on failure.
     * MUST detect concurrency conflicts using version.
     * MUST respect cancellation token.
     */
    CompletableFuture<Result<Void>> updateAsync(TAggregate aggregate, CancellationToken cancellationToken);

    /**
     * Removes aggregate from repository.
     * MUST return Result.success() on successful deletion.
     * MUST return Result.failure() if aggregate not found.
     * MUST be idempotent (success if already deleted).
     * MUST respect cancellation token.
     */
    CompletableFuture<Result<Void>> deleteAsync(TId id, CancellationToken cancellationToken);

    /**
     * Checks if aggregate exists with given identifier.
     * MUST return true if exists, false otherwise.
     * MUST NOT throw exceptions for missing aggregates.
     * MUST respect cancellation token.
     */
    CompletableFuture<Boolean> existsAsync(TId id, CancellationToken cancellationToken);
}
```

## Functional Type Contracts

### Result<T> Contract
```java
package com.architecture.core.functional;

import java.util.Objects;
import java.util.function.Function;

/**
 * Represents result of operation that can succeed or fail.
 * MUST follow monadic laws: Left Identity, Right Identity, Associativity.
 */
public final class Result<T> {

    /**
     * Creates successful result with value.
     * MUST NOT accept null value.
     * MUST return Result with isSuccess() == true.
     */
    public static <T> Result<T> success(T value);

    /**
     * Creates failed result with error.
     * MUST NOT accept null error.
     * MUST return Result with isFailure() == true.
     */
    public static <T> Result<T> failure(Error error);

    /**
     * Indicates if operation succeeded.
     * MUST be inverse of isFailure().
     */
    public boolean isSuccess();

    /**
     * Indicates if operation failed.
     * MUST be inverse of isSuccess().
     */
    public boolean isFailure();

    /**
     * Gets success value.
     * MUST throw IllegalStateException if called on failure.
     * MUST NOT return null for success cases.
     */
    public T getValue();

    /**
     * Gets error information.
     * MUST throw IllegalStateException if called on success.
     * MUST NOT return null for failure cases.
     */
    public Error getError();

    /**
     * Maps success value to new type.
     * MUST satisfy Left Identity Law: Result.success(a).map(f) ≡ Result.success(f(a))
     * MUST satisfy Right Identity Law: result.map(x -> x) ≡ result
     * MUST return failure unchanged if this is failure.
     * MUST handle mapper exceptions by returning failure.
     */
    public <U> Result<U> map(Function<? super T, ? extends U> mapper);

    /**
     * Binds (flatMap) result to function returning Result.
     * MUST satisfy Associativity Law: m.bind(f).bind(g) ≡ m.bind(x -> f(x).bind(g))
     * MUST return failure unchanged if this is failure.
     * MUST handle binder exceptions by returning failure.
     */
    public <U> Result<U> bind(Function<? super T, Result<U>> binder);

    /**
     * Pattern matches on success/failure.
     * MUST call onSuccess for success cases.
     * MUST call onFailure for failure cases.
     * MUST NOT return null.
     */
    public <U> U match(Function<? super T, ? extends U> onSuccess, Function<Error, ? extends U> onFailure);

    /**
     * Gets value or default if failure.
     * MUST return actual value for success.
     * MUST return defaultValue for failure.
     */
    public T getValueOrDefault(T defaultValue);

    /**
     * Standard equality comparison.
     * MUST compare success state, value, and error.
     * MUST be consistent with hashCode().
     */
    @Override
    public boolean equals(Object obj);

    /**
     * Standard hash code generation.
     * MUST be consistent with equals().
     */
    @Override
    public int hashCode();

    /**
     * String representation for debugging.
     * MUST include success state and value/error.
     */
    @Override
    public String toString();
}
```

### Maybe<T> Contract
```java
package com.architecture.core.functional;

import java.util.function.Function;
import java.util.function.Supplier;
import java.util.Optional;

/**
 * Represents optional value that may or may not be present.
 * MUST follow monadic laws for safe null handling.
 */
public final class Maybe<T> {

    /**
     * Creates Maybe with value present.
     * MUST NOT accept null value.
     * MUST return Maybe with hasValue() == true.
     */
    public static <T> Maybe<T> some(T value);

    /**
     * Creates Maybe with no value.
     * MUST return Maybe with hasValue() == false.
     * MUST use singleton instance for efficiency.
     */
    public static <T> Maybe<T> none();

    /**
     * Creates Maybe from potentially null value.
     * MUST return some(value) if value != null.
     * MUST return none() if value == null.
     */
    public static <T> Maybe<T> fromNullable(T value);

    /**
     * Indicates if value is present.
     * MUST be inverse of isEmpty().
     */
    public boolean hasValue();

    /**
     * Indicates if value is absent.
     * MUST be inverse of hasValue().
     */
    public boolean isEmpty();

    /**
     * Gets the value if present.
     * MUST throw IllegalStateException if no value.
     * MUST NOT return null for present values.
     */
    public T getValue();

    /**
     * Maps value to new type if present.
     * MUST return none() if this is none().
     * MUST return some(mapper(value)) if mapper result is not null.
     * MUST return none() if mapper result is null.
     * MUST handle mapper exceptions by returning none().
     */
    public <U> Maybe<U> map(Function<? super T, ? extends U> mapper);

    /**
     * Binds (flatMap) to function returning Maybe.
     * MUST return none() if this is none().
     * MUST return binder(value) if this has value.
     * MUST handle binder exceptions by returning none().
     */
    public <U> Maybe<U> bind(Function<? super T, Maybe<U>> binder);

    /**
     * Returns value if present, otherwise default.
     * MUST return actual value for some cases.
     * MUST return defaultValue for none cases.
     */
    public T orElse(T defaultValue);

    /**
     * Returns value if present, otherwise supplier result.
     * MUST return actual value for some cases.
     * MUST call supplier and return result for none cases.
     */
    public T orElseGet(Supplier<? extends T> defaultSupplier);

    /**
     * Returns value if present, otherwise throws exception.
     * MUST return actual value for some cases.
     * MUST throw supplier-provided exception for none cases.
     */
    public <X extends Throwable> T orElseThrow(Supplier<? extends X> exceptionSupplier) throws X;

    /**
     * Converts to Java Optional.
     * MUST return Optional.of(value) for some cases.
     * MUST return Optional.empty() for none cases.
     */
    public Optional<T> toOptional();

    /**
     * Converts to Result type.
     * MUST return Result.success(value) for some cases.
     * MUST return Result.failure(errorIfEmpty) for none cases.
     */
    public Result<T> toResult(Error errorIfEmpty);

    /**
     * Standard equality comparison.
     * MUST compare presence state and value if present.
     */
    @Override
    public boolean equals(Object obj);

    /**
     * Standard hash code generation.
     * MUST return 0 for none cases.
     * MUST return value.hashCode() for some cases.
     */
    @Override
    public int hashCode();

    /**
     * String representation for debugging.
     * MUST return "None" for none cases.
     * MUST return "Some{value=...}" for some cases.
     */
    @Override
    public String toString();
}
```

### Error Contract
```java
package com.architecture.core.functional;

import java.util.Map;
import java.util.Optional;

/**
 * Represents structured error with categorization and metadata.
 * MUST be immutable after construction.
 */
public final class Error {

    /**
     * Constructs error with all details.
     * MUST NOT accept null code, message, or category.
     * MUST create defensive copy of metadata.
     * MUST accept null cause (optional).
     */
    public Error(String code, String message, ErrorCategory category,
                 Map<String, Object> metadata, Throwable cause);

    /**
     * Creates domain business rule error.
     * MUST set category to DOMAIN.
     * MUST use empty metadata.
     * MUST NOT include cause.
     */
    public static Error domain(String code, String message);

    /**
     * Creates validation error with metadata.
     * MUST set category to VALIDATION.
     * MUST include provided metadata.
     * MUST NOT include cause.
     */
    public static Error validation(String code, String message, Map<String, Object> metadata);

    /**
     * Creates infrastructure error with cause.
     * MUST set category to INFRASTRUCTURE.
     * MUST include provided cause.
     * MUST use empty metadata.
     */
    public static Error infrastructure(String code, String message, Throwable cause);

    /**
     * Creates concurrency conflict error.
     * MUST set category to CONCURRENCY.
     * MUST use empty metadata.
     * MUST NOT include cause.
     */
    public static Error concurrency(String code, String message);

    /**
     * Creates security violation error.
     * MUST set category to SECURITY.
     * MUST use empty metadata.
     * MUST NOT include cause.
     */
    public static Error security(String code, String message);

    /**
     * Gets error code for categorization.
     * MUST NOT return null.
     * MUST follow namespaced convention (e.g., "Domain.OrderNotFound").
     */
    public String getCode();

    /**
     * Gets human-readable error message.
     * MUST NOT return null.
     * MUST be descriptive and actionable.
     */
    public String getMessage();

    /**
     * Gets error category for handling strategy.
     * MUST NOT return null.
     */
    public ErrorCategory getCategory();

    /**
     * Gets immutable metadata map.
     * MUST NOT return null.
     * MUST return defensive copy.
     */
    public Map<String, Object> getMetadata();

    /**
     * Gets optional underlying cause.
     * MUST return Optional.empty() if no cause.
     * MUST return Optional.of(cause) if cause present.
     */
    public Optional<Throwable> getCause();

    /**
     * Standard equality comparison.
     * MUST compare all fields.
     */
    @Override
    public boolean equals(Object obj);

    /**
     * Standard hash code generation.
     * MUST be consistent with equals().
     */
    @Override
    public int hashCode();

    /**
     * String representation for debugging.
     * MUST include code, message, category, and metadata.
     */
    @Override
    public String toString();
}
```

## Behavioral Contracts

### Monadic Laws Verification

#### Result<T> Monadic Laws
```java
// Left Identity Law
Result<T> unit = Result.success(value);
Result<U> result1 = unit.bind(function);
Result<U> result2 = function.apply(value);
assert result1.equals(result2) : "Left Identity Law violated";

// Right Identity Law
Result<T> original = // any Result
Result<T> identity = original.bind(Result::success);
assert original.equals(identity) : "Right Identity Law violated";

// Associativity Law
Result<T> m = // any Result
Function<T, Result<U>> f = // any function
Function<U, Result<V>> g = // any function
Result<V> left = m.bind(f).bind(g);
Result<V> right = m.bind(x -> f.apply(x).bind(g));
assert left.equals(right) : "Associativity Law violated";
```

#### Maybe<T> Monadic Laws
```java
// Left Identity Law
Maybe<T> unit = Maybe.some(value);
Maybe<U> result1 = unit.bind(function);
Maybe<U> result2 = function.apply(value);
assert result1.equals(result2) : "Left Identity Law violated";

// Right Identity Law
Maybe<T> original = // any Maybe
Maybe<T> identity = original.bind(Maybe::some);
assert original.equals(identity) : "Right Identity Law violated";

// Associativity Law
Maybe<T> m = // any Maybe
Function<T, Maybe<U>> f = // any function
Function<U, Maybe<V>> g = // any function
Maybe<V> left = m.bind(f).bind(g);
Maybe<V> right = m.bind(x -> f.apply(x).bind(g));
assert left.equals(right) : "Associativity Law violated";
```

### Thread Safety Requirements

- **AggregateRoot event collection**: MUST be thread-safe for concurrent access
- **Repository operations**: MUST handle concurrent access gracefully
- **Result/Maybe operations**: MUST be safe for concurrent use (immutable)
- **Error instances**: MUST be immutable and thread-safe

### Performance Requirements

- **Result/Maybe creation**: SHOULD minimize heap allocations
- **ValueObject equality**: SHOULD cache hash codes where beneficial
- **Repository operations**: SHOULD support async cancellation
- **Domain event collection**: SHOULD use efficient collection types

### Integration Requirements

- **Spring Framework**: Repository implementations SHOULD integrate with Spring Data
- **JPA/Hibernate**: Entity mappings SHOULD support standard annotations
- **JSON Serialization**: Types SHOULD support Jackson serialization
- **Testing**: All contracts SHOULD be verifiable through unit tests

---

**Contract Version**: 1.0
**Compliance**: MANDATORY for all implementations
**Verification**: Automated contract tests MUST pass before release