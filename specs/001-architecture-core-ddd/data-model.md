# Data Model: Architecture.Core Java Implementation

**Date**: 2025-09-22
**Feature**: Architecture.Core DDD Abstractions and Functional Types
**Language**: Java 21 LTS

## Core Entity Hierarchy

### EntityId<T> Interface
```java
/**
 * Base interface for all entity identifiers with type safety and comparability.
 *
 * @param <T> The concrete entity ID type for recursive type bounds
 */
public interface EntityId<T extends EntityId<T>> extends Comparable<T>, Serializable {
    /**
     * Gets the string representation of the identifier value.
     * @return The identifier value as a string
     */
    String getValue();

    /**
     * Validates the identifier format and constraints.
     * @return Result indicating validation success or failure with details
     */
    Result<Void> validate();
}
```

### AggregateRoot<TId>
```java
/**
 * Base class for domain aggregates with event sourcing and version control.
 *
 * @param <TId> The type of the aggregate identifier
 */
public abstract class AggregateRoot<TId extends EntityId<TId>> {
    private final TId id;
    private long version;
    private final List<DomainEvent> domainEvents;
    private final Object eventLock = new Object();

    protected AggregateRoot(TId id) {
        this.id = Objects.requireNonNull(id, "Aggregate ID cannot be null");
        this.version = 0;
        this.domainEvents = new ArrayList<>();
    }

    protected AggregateRoot(TId id, long version) {
        this.id = Objects.requireNonNull(id, "Aggregate ID cannot be null");
        this.version = version;
        this.domainEvents = new ArrayList<>();
    }

    // Public accessors
    public final TId getId() { return id; }
    public final long getVersion() { return version; }

    public final List<DomainEvent> getDomainEvents() {
        synchronized (eventLock) {
            return Collections.unmodifiableList(new ArrayList<>(domainEvents));
        }
    }

    // Event management
    protected final void addDomainEvent(DomainEvent event) {
        Objects.requireNonNull(event, "Domain event cannot be null");
        synchronized (eventLock) {
            domainEvents.add(event);
        }
    }

    public final void clearDomainEvents() {
        synchronized (eventLock) {
            domainEvents.clear();
        }
    }

    public final void incrementVersion() {
        this.version++;
    }
}
```

**Fields**:
- `id`: Immutable identifier extending EntityId<T>
- `version`: Optimistic concurrency control version
- `domainEvents`: Thread-safe append-only domain event collection

**Validation Rules**:
- Id must not be null
- Version must be non-negative
- Events collection is append-only (no removal)
- Thread-safe event management with synchronized access

**State Transitions**:
- New → Persisted (Version: 0 → 1)
- Modified → Updated (Version increments)
- Event addition triggers state change

### Entity<TId>
```java
/**
 * Base class for domain entities with identity-based equality.
 *
 * @param <TId> The type of the entity identifier
 */
public abstract class Entity<TId extends EntityId<TId>> {
    private final TId id;

    protected Entity(TId id) {
        this.id = Objects.requireNonNull(id, "Entity ID cannot be null");
    }

    public final TId getId() { return id; }

    @Override
    public final boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        Entity<?> entity = (Entity<?>) obj;
        return Objects.equals(id, entity.id);
    }

    @Override
    public final int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return String.format("%s{id=%s}", getClass().getSimpleName(), id);
    }
}
```

**Fields**:
- `id`: Immutable identity value extending EntityId<T>

**Validation Rules**:
- Id must not be null
- Id must be immutable after construction
- Equality based solely on Id with type safety

### ValueObject Abstract Class
```java
/**
 * Base class for value objects with structural equality.
 */
public abstract class ValueObject {
    /**
     * Returns the components that define equality for this value object.
     */
    protected abstract Iterable<Object> getEqualityComponents();

    @Override
    public final boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        ValueObject other = (ValueObject) obj;
        return Objects.equals(getEqualityComponentsList(), other.getEqualityComponentsList());
    }

    @Override
    public final int hashCode() {
        return Objects.hash(getEqualityComponentsList().toArray());
    }

    private List<Object> getEqualityComponentsList() {
        List<Object> components = new ArrayList<>();
        getEqualityComponents().forEach(components::add);
        return components;
    }
}
```

### DomainEvent Interface
```java
/**
 * Marker interface for all domain events.
 */
public interface DomainEvent {
    UUID getEventId();
    Instant getOccurredAt();
    Optional<String> getCorrelationId();
    Optional<String> getCausationId();
    int getEventVersion();
}
```

### Repository<TAggregate, TId> Interface
```java
/**
 * Generic repository interface for aggregate persistence with async operations.
 */
public interface Repository<TAggregate extends AggregateRoot<TId>, TId extends EntityId<TId>> {
    CompletableFuture<Maybe<TAggregate>> getByIdAsync(TId id, CancellationToken cancellationToken);
    CompletableFuture<Result<Void>> addAsync(TAggregate aggregate, CancellationToken cancellationToken);
    CompletableFuture<Result<Void>> updateAsync(TAggregate aggregate, CancellationToken cancellationToken);
    CompletableFuture<Result<Void>> deleteAsync(TId id, CancellationToken cancellationToken);
    CompletableFuture<Boolean> existsAsync(TId id, CancellationToken cancellationToken);
}
```

## Functional Types

### Result<T> Value Class
```java
/**
 * Represents the result of an operation that can either succeed with a value or fail with an error.
 */
public final class Result<T> {
    private final T value;
    private final Error error;
    private final boolean isSuccess;

    private Result(T value, Error error, boolean isSuccess) {
        this.value = value;
        this.error = error;
        this.isSuccess = isSuccess;
    }

    public static <T> Result<T> success(T value) {
        Objects.requireNonNull(value, "Success value cannot be null");
        return new Result<>(value, null, true);
    }

    public static <T> Result<T> failure(Error error) {
        Objects.requireNonNull(error, "Error cannot be null");
        return new Result<>(null, error, false);
    }

    public boolean isSuccess() { return isSuccess; }
    public boolean isFailure() { return !isSuccess; }

    public <U> Result<U> map(Function<? super T, ? extends U> mapper) {
        if (isSuccess()) {
            try {
                return Result.success(mapper.apply(getValue()));
            } catch (Exception e) {
                return Result.failure(Error.infrastructure("Mapping.Failed", e.getMessage(), e));
            }
        }
        return Result.failure(getError());
    }

    public <U> Result<U> bind(Function<? super T, Result<U>> binder) {
        return isSuccess() ? binder.apply(getValue()) : Result.failure(getError());
    }

    public <U> U match(Function<? super T, ? extends U> onSuccess, Function<Error, ? extends U> onFailure) {
        return isSuccess() ? onSuccess.apply(getValue()) : onFailure.apply(getError());
    }
}
```

### Maybe<T> Value Class
```java
/**
 * Represents an optional value that may or may not be present.
 */
public final class Maybe<T> {
    private static final Maybe<?> NONE = new Maybe<>(null, false);

    private final T value;
    private final boolean hasValue;

    private Maybe(T value, boolean hasValue) {
        this.value = value;
        this.hasValue = hasValue;
    }

    public static <T> Maybe<T> some(T value) {
        Objects.requireNonNull(value, "Value cannot be null");
        return new Maybe<>(value, true);
    }

    @SuppressWarnings("unchecked")
    public static <T> Maybe<T> none() {
        return (Maybe<T>) NONE;
    }

    public boolean hasValue() { return hasValue; }

    public <U> Maybe<U> map(Function<? super T, ? extends U> mapper) {
        if (hasValue()) {
            U result = mapper.apply(getValue());
            return result != null ? Maybe.some(result) : Maybe.none();
        }
        return Maybe.none();
    }

    public <U> Maybe<U> bind(Function<? super T, Maybe<U>> binder) {
        return hasValue() ? binder.apply(getValue()) : Maybe.none();
    }

    public T orElse(T defaultValue) {
        return hasValue() ? getValue() : defaultValue;
    }
}
```

### Error Value Class
```java
/**
 * Represents a structured error with categorization and metadata.
 */
public final class Error {
    private final String code;
    private final String message;
    private final ErrorCategory category;
    private final Map<String, Object> metadata;
    private final Throwable cause;

    public Error(String code, String message, ErrorCategory category, Map<String, Object> metadata, Throwable cause) {
        this.code = Objects.requireNonNull(code);
        this.message = Objects.requireNonNull(message);
        this.category = Objects.requireNonNull(category);
        this.metadata = Map.copyOf(metadata != null ? metadata : Map.of());
        this.cause = cause;
    }

    public static Error domain(String code, String message) {
        return new Error(code, message, ErrorCategory.DOMAIN, Map.of(), null);
    }

    public static Error validation(String code, String message, Map<String, Object> metadata) {
        return new Error(code, message, ErrorCategory.VALIDATION, metadata, null);
    }

    public static Error infrastructure(String code, String message, Throwable cause) {
        return new Error(code, message, ErrorCategory.INFRASTRUCTURE, Map.of(), cause);
    }
}

/**
 * Categorizes errors by their domain and handling strategy.
 */
public enum ErrorCategory {
    DOMAIN("Domain"),
    VALIDATION("Validation"),
    INFRASTRUCTURE("Infrastructure"),
    CONCURRENCY("Concurrency"),
    SECURITY("Security");

    private final String displayName;

    ErrorCategory(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() { return displayName; }
}
```

## Relationships

- **AggregateRoot** extends **Entity** and manages **DomainEvent** collection with thread safety
- **Entity** uses identity-based equality with bounded generic **TId extends EntityId<TId>**
- **ValueObject** uses structural equality via component comparison with immutability
- **Repository** operates on **AggregateRoot** instances with CompletableFuture async operations
- **Result/Maybe** provide functional error handling and optional value semantics
- **Error** categorizes failures with contextual metadata and optional cause tracking

## Validation Rules Summary

1. **Identity Constraints**: All Id types must extend EntityId<T> and be non-null
2. **Immutability**: ValueObject and Event properties are immutable with final fields
3. **Event Ordering**: Domain events maintain chronological order with thread-safe access
4. **Concurrency**: Version control prevents lost updates with synchronized event management
5. **Error Handling**: All operations use Result/Maybe instead of exceptions for business logic
6. **Async Operations**: All I/O operations use CompletableFuture with CancellationToken support

---

**Status**: ✅ Complete - Ready for Contract Generation