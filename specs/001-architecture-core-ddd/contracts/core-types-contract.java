// Core Types Contract Specification for Java Spring Implementation
// This file defines the public API contracts for Architecture.Core types
// Package: com.architecture.core

package com.architecture.core.contracts;

import java.io.Serializable;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.function.Function;
import java.util.function.Supplier;

// =============================================================================
// ENTITY ID ABSTRACTION
// =============================================================================

/**
 * Base interface for all entity identifiers with type safety and comparability.
 * Requirements: Type-safe entity identification, validation, serialization
 */
public interface EntityId<T extends EntityId<T>> extends Comparable<T>, Serializable {
    /**
     * Gets the string representation of the identifier value.
     * MUST NOT return null.
     */
    String getValue();

    /**
     * Validates the identifier format and constraints.
     * MUST return Result.success() for valid identifiers.
     */
    Result<Void> validate();

    @Override
    int compareTo(T other);

    @Override
    boolean equals(Object obj);

    @Override
    int hashCode();
}

// =============================================================================
// DDD ABSTRACTIONS
// =============================================================================

/**
 * Entity with identity-based equality
 * Requirements: FR-003 - Identity-based equality
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

/**
 * Aggregate root with version control and domain events
 * Requirements: FR-001, FR-002 - Version control and event collection
 */
public abstract class AggregateRoot<TId extends EntityId<TId>> extends Entity<TId> {
    private long version;
    private final List<DomainEvent> domainEvents;
    private final Object eventLock = new Object();

    protected AggregateRoot(TId id) {
        super(id);
        this.version = 0;
        this.domainEvents = new ArrayList<>();
    }

    protected AggregateRoot(TId id, long version) {
        super(id);
        this.version = version;
        this.domainEvents = new ArrayList<>();
    }

    public final long getVersion() { return version; }

    public final List<DomainEvent> getDomainEvents() {
        synchronized (eventLock) {
            return Collections.unmodifiableList(new ArrayList<>(domainEvents));
        }
    }

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

/**
 * Base class for value objects with structural equality
 * Requirements: FR-004, FR-012 - Structural equality and immutability
 */
public abstract class ValueObject {
    /**
     * Returns the components that define equality for this value object.
     * MUST return all fields that participate in equality comparison.
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

    @Override
    public String toString() {
        return String.format("%s{%s}",
            getClass().getSimpleName(),
            getEqualityComponentsList().stream()
                .map(String::valueOf)
                .collect(Collectors.joining(", "))
        );
    }

    private List<Object> getEqualityComponentsList() {
        List<Object> components = new ArrayList<>();
        getEqualityComponents().forEach(components::add);
        return components;
    }
}

/**
 * Domain event interface with correlation metadata
 * Requirements: FR-005 - Domain event with metadata
 */
public interface DomainEvent {
    UUID getEventId();
    Instant getOccurredAt();
    Optional<String> getCorrelationId();
    Optional<String> getCausationId();
    int getEventVersion();
}

/**
 * Base implementation for domain events
 * Requirements: FR-005 - Standard event metadata
 */
public abstract class DomainEventBase implements DomainEvent {
    private final UUID eventId;
    private final Instant occurredAt;
    private final String correlationId;
    private final String causationId;
    private final int eventVersion;

    protected DomainEventBase() {
        this(null, null, 1);
    }

    protected DomainEventBase(String correlationId, String causationId) {
        this(correlationId, causationId, 1);
    }

    protected DomainEventBase(String correlationId, String causationId, int eventVersion) {
        this.eventId = UUID.randomUUID();
        this.occurredAt = Instant.now();
        this.correlationId = correlationId;
        this.causationId = causationId;
        this.eventVersion = eventVersion;
    }

    @Override
    public final UUID getEventId() { return eventId; }

    @Override
    public final Instant getOccurredAt() { return occurredAt; }

    @Override
    public final Optional<String> getCorrelationId() {
        return Optional.ofNullable(correlationId);
    }

    @Override
    public final Optional<String> getCausationId() {
        return Optional.ofNullable(causationId);
    }

    @Override
    public final int getEventVersion() { return eventVersion; }
}

/**
 * Repository interface for aggregate persistence
 * Requirements: FR-006, FR-007 - Repository with async operations and cancellation
 */
public interface Repository<TAggregate extends AggregateRoot<TId>, TId extends EntityId<TId>> {
    CompletableFuture<Maybe<TAggregate>> getByIdAsync(TId id, CancellationToken cancellationToken);
    CompletableFuture<Result<Void>> addAsync(TAggregate aggregate, CancellationToken cancellationToken);
    CompletableFuture<Result<Void>> updateAsync(TAggregate aggregate, CancellationToken cancellationToken);
    CompletableFuture<Result<Void>> deleteAsync(TId id, CancellationToken cancellationToken);
    CompletableFuture<Boolean> existsAsync(TId id, CancellationToken cancellationToken);
}

// =============================================================================
// FUNCTIONAL TYPES
// =============================================================================

/**
 * Error categories for structured error handling
 * Requirements: FR-010, FR-014 - Error categorization
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

    @Override
    public String toString() { return displayName; }
}

/**
 * Structured error with categorization and metadata
 * Requirements: FR-010 - Error type with categorization
 */
public final class Error {
    private final String code;
    private final String message;
    private final ErrorCategory category;
    private final Map<String, Object> metadata;
    private final Throwable cause;

    public Error(String code, String message, ErrorCategory category,
                 Map<String, Object> metadata, Throwable cause) {
        this.code = Objects.requireNonNull(code, "Error code cannot be null");
        this.message = Objects.requireNonNull(message, "Error message cannot be null");
        this.category = Objects.requireNonNull(category, "Error category cannot be null");
        this.metadata = Map.copyOf(metadata != null ? metadata : Map.of());
        this.cause = cause;
    }

    // Factory methods for different error categories
    public static Error domain(String code, String message) {
        return new Error(code, message, ErrorCategory.DOMAIN, Map.of(), null);
    }

    public static Error validation(String code, String message, Map<String, Object> metadata) {
        return new Error(code, message, ErrorCategory.VALIDATION, metadata, null);
    }

    public static Error infrastructure(String code, String message, Throwable cause) {
        return new Error(code, message, ErrorCategory.INFRASTRUCTURE, Map.of(), cause);
    }

    public static Error concurrency(String code, String message) {
        return new Error(code, message, ErrorCategory.CONCURRENCY, Map.of(), null);
    }

    public static Error security(String code, String message) {
        return new Error(code, message, ErrorCategory.SECURITY, Map.of(), null);
    }

    // Accessors
    public String getCode() { return code; }
    public String getMessage() { return message; }
    public ErrorCategory getCategory() { return category; }
    public Map<String, Object> getMetadata() { return metadata; }
    public Optional<Throwable> getCause() { return Optional.ofNullable(cause); }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        Error error = (Error) obj;
        return Objects.equals(code, error.code) &&
               Objects.equals(message, error.message) &&
               category == error.category &&
               Objects.equals(metadata, error.metadata) &&
               Objects.equals(cause, error.cause);
    }

    @Override
    public int hashCode() {
        return Objects.hash(code, message, category, metadata, cause);
    }

    @Override
    public String toString() {
        return String.format("Error{code='%s', message='%s', category=%s}",
            code, message, category);
    }
}

/**
 * Result type for operations that can succeed or fail
 * Requirements: FR-008, FR-011, FR-013 - Result with monadic operations
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

    // Factory methods
    public static <T> Result<T> success(T value) {
        Objects.requireNonNull(value, "Success value cannot be null");
        return new Result<>(value, null, true);
    }

    public static <T> Result<T> failure(Error error) {
        Objects.requireNonNull(error, "Error cannot be null");
        return new Result<>(null, error, false);
    }

    public static <T> Result<T> failure(String code, String message) {
        return failure(Error.domain(code, message));
    }

    // State queries
    public boolean isSuccess() { return isSuccess; }
    public boolean isFailure() { return !isSuccess; }

    public T getValue() {
        if (!isSuccess) {
            throw new IllegalStateException("Cannot get value from failed result");
        }
        return value;
    }

    public Error getError() {
        if (isSuccess) {
            throw new IllegalStateException("Cannot get error from successful result");
        }
        return error;
    }

    // Monadic operations (Requirements: FR-011 - Monadic laws)
    public <U> Result<U> map(Function<? super T, ? extends U> mapper) {
        Objects.requireNonNull(mapper, "Mapper function cannot be null");
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
        Objects.requireNonNull(binder, "Binder function cannot be null");
        if (isSuccess()) {
            try {
                return binder.apply(getValue());
            } catch (Exception e) {
                return Result.failure(Error.infrastructure("Binding.Failed", e.getMessage(), e));
            }
        }
        return Result.failure(getError());
    }

    public <U> U match(Function<? super T, ? extends U> onSuccess, Function<Error, ? extends U> onFailure) {
        Objects.requireNonNull(onSuccess, "Success handler cannot be null");
        Objects.requireNonNull(onFailure, "Failure handler cannot be null");
        return isSuccess() ? onSuccess.apply(getValue()) : onFailure.apply(getError());
    }

    // Utility methods
    public T getValueOrDefault(T defaultValue) {
        return isSuccess() ? getValue() : defaultValue;
    }

    public T getValueOrThrow() {
        if (isSuccess()) {
            return getValue();
        }
        throw new ResultException(getError());
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        Result<?> result = (Result<?>) obj;
        return isSuccess == result.isSuccess &&
               Objects.equals(value, result.value) &&
               Objects.equals(error, result.error);
    }

    @Override
    public int hashCode() {
        return Objects.hash(value, error, isSuccess);
    }

    @Override
    public String toString() {
        return isSuccess()
            ? String.format("Success{value=%s}", value)
            : String.format("Failure{error=%s}", error);
    }
}

/**
 * Maybe type for optional values
 * Requirements: FR-009, FR-011 - Optional values with monadic operations
 */
public final class Maybe<T> {
    private static final Maybe<?> NONE = new Maybe<>(null, false);

    private final T value;
    private final boolean hasValue;

    private Maybe(T value, boolean hasValue) {
        this.value = value;
        this.hasValue = hasValue;
    }

    // Factory methods
    public static <T> Maybe<T> some(T value) {
        Objects.requireNonNull(value, "Value cannot be null");
        return new Maybe<>(value, true);
    }

    @SuppressWarnings("unchecked")
    public static <T> Maybe<T> none() {
        return (Maybe<T>) NONE;
    }

    public static <T> Maybe<T> fromNullable(T value) {
        return value != null ? some(value) : none();
    }

    // State queries
    public boolean hasValue() { return hasValue; }
    public boolean isEmpty() { return !hasValue; }

    public T getValue() {
        if (!hasValue) {
            throw new IllegalStateException("Maybe has no value");
        }
        return value;
    }

    // Monadic operations (Requirements: FR-011 - Monadic laws)
    public <U> Maybe<U> map(Function<? super T, ? extends U> mapper) {
        Objects.requireNonNull(mapper, "Mapper function cannot be null");
        if (hasValue()) {
            try {
                U result = mapper.apply(getValue());
                return result != null ? Maybe.some(result) : Maybe.none();
            } catch (Exception e) {
                return Maybe.none();
            }
        }
        return Maybe.none();
    }

    public <U> Maybe<U> bind(Function<? super T, Maybe<U>> binder) {
        Objects.requireNonNull(binder, "Binder function cannot be null");
        if (hasValue()) {
            try {
                return binder.apply(getValue());
            } catch (Exception e) {
                return Maybe.none();
            }
        }
        return Maybe.none();
    }

    // Value extraction
    public T orElse(T defaultValue) {
        return hasValue() ? getValue() : defaultValue;
    }

    public T orElseGet(Supplier<? extends T> defaultSupplier) {
        Objects.requireNonNull(defaultSupplier, "Default supplier cannot be null");
        return hasValue() ? getValue() : defaultSupplier.get();
    }

    public <X extends Throwable> T orElseThrow(Supplier<? extends X> exceptionSupplier) throws X {
        Objects.requireNonNull(exceptionSupplier, "Exception supplier cannot be null");
        if (hasValue()) {
            return getValue();
        }
        throw exceptionSupplier.get();
    }

    // Conversion methods (Requirements: FR-013 - Conversions)
    public Optional<T> toOptional() {
        return hasValue() ? Optional.of(getValue()) : Optional.empty();
    }

    public Result<T> toResult(Error errorIfEmpty) {
        return hasValue() ? Result.success(getValue()) : Result.failure(errorIfEmpty);
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        Maybe<?> maybe = (Maybe<?>) obj;
        return hasValue == maybe.hasValue && Objects.equals(value, maybe.value);
    }

    @Override
    public int hashCode() {
        return hasValue ? Objects.hash(value) : 0;
    }

    @Override
    public String toString() {
        return hasValue ? String.format("Some{value=%s}", value) : "None";
    }
}

// =============================================================================
// SUPPORT TYPES
// =============================================================================

/**
 * Exception that wraps a structured Error for integration with exception-based APIs
 */
public class ResultException extends RuntimeException {
    private final Error error;

    public ResultException(Error error) {
        super(error.getMessage(), error.getCause().orElse(null));
        this.error = Objects.requireNonNull(error, "Error cannot be null");
    }

    public Error getError() {
        return error;
    }

    @Override
    public String toString() {
        return String.format("ResultException{error=%s}", error);
    }
}

/**
 * Token for cancelling asynchronous operations
 */
public interface CancellationToken {
    boolean isCancellationRequested();
    void throwIfCancellationRequested() throws OperationCancelledException;

    static CancellationToken none() {
        return NonCancellationToken.INSTANCE;
    }
}

/**
 * Exception thrown when an operation is cancelled
 */
public class OperationCancelledException extends RuntimeException {
    public OperationCancelledException() {
        super("Operation was cancelled");
    }

    public OperationCancelledException(String message) {
        super(message);
    }
}

/**
 * Non-cancelling token implementation
 */
final class NonCancellationToken implements CancellationToken {
    static final CancellationToken INSTANCE = new NonCancellationToken();

    private NonCancellationToken() {}

    @Override
    public boolean isCancellationRequested() {
        return false;
    }

    @Override
    public void throwIfCancellationRequested() {
        // No-op
    }
}

// =============================================================================
// CONTRACT VERIFICATION INTERFACES
// =============================================================================

/**
 * Contract test interfaces that must be implemented to verify API compliance
 * Requirements: All functional requirements (FR-001 through FR-017)
 */
public interface ContractTests {
    // Entity ID contracts
    void testEntityIdValidation();
    void testEntityIdComparison();
    void testEntityIdSerialization();

    // Entity contracts (FR-003)
    void testEntityIdentityEquality();
    void testEntityHashCodeStability();

    // Value Object contracts (FR-004, FR-012)
    void testValueObjectStructuralEquality();
    void testValueObjectHashCodeStability();
    void testValueObjectImmutability();
    void testValueObjectNullHandling();

    // Aggregate Root contracts (FR-001, FR-002)
    void testAggregateVersionIncrement();
    void testAggregateEventCollection();
    void testAggregateEventClearing();
    void testAggregateThreadSafety();

    // Domain Event contracts (FR-005)
    void testDomainEventMetadata();
    void testDomainEventEquality();

    // Repository contracts (FR-006, FR-007)
    void testRepositoryAsyncOperations();
    void testRepositoryCancellation();
    void testRepositoryResultHandling();

    // Result contracts (FR-008, FR-011, FR-013)
    void testResultMonadicLaws();
    void testResultErrorHandling();
    void testResultTypeConversions();

    // Maybe contracts (FR-009, FR-011)
    void testMaybeMonadicLaws();
    void testMaybeNullHandling();
    void testMaybeConversions();

    // Error contracts (FR-010, FR-014)
    void testErrorCategorization();
    void testErrorMetadata();
    void testErrorSerialization();
}

/**
 * Performance contract requirements
 * Requirements: Performance goals from technical context
 */
public interface PerformanceContracts {
    // Memory efficiency requirements
    void testResultMemoryUsage();
    void testMaybeMemoryUsage();
    void testValueObjectMemoryUsage();

    // Execution time requirements
    void testValueObjectEqualityPerformance();
    void testAggregateEventPerformance();
    void testResultMonadicOperationsPerformance();
}