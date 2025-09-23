# Java Research: DDD Abstractions and Functional Types

**Date**: 2025-09-22
**Context**: Architecture.Core implementation for Java Spring
**Status**: Complete

## 1. Java Generics Best Practices for DDD Types

### Decision: Bounded Type Parameters with Comparable Interface
Use Java generics with bounded type parameters, leveraging `Comparable` interface and custom type constraints for entity IDs and aggregate types.

```java
// Base interface for entity identifiers
public interface EntityId<T extends EntityId<T>> extends Comparable<T>, Serializable {
    String getValue();
}

// Generic aggregate root with type-safe ID
public abstract class AggregateRoot<TId extends EntityId<TId>> {
    private final TId id;
    private long version;
    private final List<DomainEvent> domainEvents = new ArrayList<>();

    protected AggregateRoot(TId id) {
        this.id = Objects.requireNonNull(id);
        this.version = 0;
    }

    public TId getId() { return id; }
    public long getVersion() { return version; }
    public List<DomainEvent> getDomainEvents() { return Collections.unmodifiableList(domainEvents); }
}

// Generic entity with identity-based equality
public abstract class Entity<TId extends EntityId<TId>> {
    private final TId id;

    protected Entity(TId id) {
        this.id = Objects.requireNonNull(id);
    }

    public TId getId() { return id; }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        Entity<?> entity = (Entity<?>) obj;
        return Objects.equals(id, entity.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
```

### Rationale
- **Type Safety**: Compile-time verification of ID types across the domain
- **Java Generics**: Leverages mature Java generics system with bounded wildcards
- **Serialization**: Built-in support for persistence and distributed systems
- **Multi-language Consistency**: Maintains same type safety as C# and TypeScript implementations

### Alternatives Considered
- **Raw types**: Rejected due to loss of type safety and compiler warnings
- **Object-based identifiers**: Rejected due to runtime type checking overhead
- **Reflection-based approaches**: Rejected due to performance overhead and runtime errors

## 2. Java Interface Design Patterns for Repository Abstraction

### Decision: Generic Repository Interface with CompletableFuture
Place repository interfaces in the domain package, implement in infrastructure, following dependency inversion principle with async support.

```java
// Domain package defines the interface
public interface Repository<TAggregate extends AggregateRoot<TId>, TId extends EntityId<TId>> {
    CompletableFuture<Maybe<TAggregate>> getByIdAsync(TId id, CancellationToken cancellationToken);
    CompletableFuture<Result<Void>> addAsync(TAggregate aggregate, CancellationToken cancellationToken);
    CompletableFuture<Result<Void>> updateAsync(TAggregate aggregate, CancellationToken cancellationToken);
    CompletableFuture<Result<Void>> deleteAsync(TId id, CancellationToken cancellationToken);
    CompletableFuture<Boolean> existsAsync(TId id, CancellationToken cancellationToken);
}

// Infrastructure package implements
@Component
public class JpaOrderRepository implements Repository<Order, OrderId> {
    private final OrderJpaRepository jpaRepository;

    public JpaOrderRepository(OrderJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public CompletableFuture<Maybe<Order>> getByIdAsync(OrderId id, CancellationToken cancellationToken) {
        return CompletableFuture.supplyAsync(() -> {
            Optional<OrderEntity> entity = jpaRepository.findById(id.getValue());
            return entity.map(this::mapToDomain)
                         .map(Maybe::some)
                         .orElse(Maybe.none());
        }, getAsyncExecutor());
    }
}
```

### Rationale
- **Dependency Inversion**: Domain defines contracts, infrastructure implements
- **Testability**: Easy to create test doubles and mocks using Mockito
- **Async Operations**: CompletableFuture provides cancellation and timeout support
- **Spring Integration**: Natural integration with Spring Data repositories

### Alternatives Considered
- **Synchronous repository pattern**: Rejected due to blocking I/O concerns
- **Single large interface**: Rejected due to Interface Segregation Principle violations
- **Concrete types in domain**: Rejected due to tight coupling to infrastructure

## 3. Memory Allocation Optimization for Functional Types

### Decision: Value-Based Classes with JVM Optimizations
Implement Result<T> and Maybe<T> as value-based classes leveraging JVM optimizations for small immutable objects.

```java
// Value-based Result type optimized for JVM
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
        return new Result<>(Objects.requireNonNull(value), null, true);
    }

    public static <T> Result<T> failure(Error error) {
        return new Result<>(null, Objects.requireNonNull(error), false);
    }

    // Maybe type with JVM escape analysis optimization
    public static final class Maybe<T> {
        private static final Maybe<?> NONE = new Maybe<>(null, false);

        private final T value;
        private final boolean hasValue;

        private Maybe(T value, boolean hasValue) {
            this.value = value;
            this.hasValue = hasValue;
        }

        public static <T> Maybe<T> some(T value) {
            return new Maybe<>(Objects.requireNonNull(value), true);
        }

        @SuppressWarnings("unchecked")
        public static <T> Maybe<T> none() {
            return (Maybe<T>) NONE;
        }
    }
}
```

### Rationale
- **Performance**: JVM escape analysis enables stack allocation for short-lived objects
- **Memory Efficiency**: Value-based classes minimize heap allocations
- **GC Optimization**: Small immutable objects are handled efficiently by modern GCs
- **Java Patterns**: Follows value-based class conventions (Optional, LocalDateTime)

### Alternatives Considered
- **Interface-based design**: Rejected due to virtual method call overhead
- **Mutable state pattern**: Rejected due to thread safety concerns
- **Primitive specializations**: Rejected due to code complexity without significant benefit

## 4. Java Error Handling with Result Pattern

### Decision: Result Pattern with Structured Errors and Exception Integration
Combine Result pattern for business logic with strategic exception handling for system errors.

```java
// Structured error with business context
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

// Domain-specific error patterns
@Repository
public class JpaOrderRepository implements OrderRepository {

    @Override
    public CompletableFuture<Maybe<Order>> getByIdAsync(OrderId id, CancellationToken cancellationToken) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Optional<OrderEntity> entity = jpaRepository.findById(id.getValue());
                return entity.map(this::mapToDomain)
                             .map(Maybe::some)
                             .orElse(Maybe.none());
            } catch (DataAccessException ex) {
                // Convert infrastructure exceptions to errors when needed
                throw new InfrastructureException(
                    Error.infrastructure("Infrastructure.Database.QueryFailed",
                                       "Failed to retrieve order", ex));
            }
        }, getAsyncExecutor());
    }
}
```

### Rationale
- **Predictability**: Result pattern forces consideration of business failure cases
- **Business Context**: Structured errors preserve domain knowledge
- **Exception Integration**: Strategic use of exceptions for system errors
- **Spring Compatibility**: Works naturally with Spring's transaction and error handling

### Alternatives Considered
- **Exceptions for all errors**: Rejected due to loss of functional composition
- **Result-only pattern (no exceptions)**: Rejected due to poor integration with Java ecosystem
- **Optional-based approach**: Rejected due to loss of error information

## 5. Java Testing Patterns with JUnit 5

### Decision: Parameterized Tests with Given-When-Then Structure
Use JUnit 5 with parameterized tests, explicit Given-When-Then comments, and comprehensive benchmarking.

```java
@DisplayName("Result should chain operations when all succeed")
@ParameterizedTest(name = "{0}")
@MethodSource("chainOperationTestCases")
void Should_ChainOperations_When_AllSucceed(String testName, int input, String expected) {
    // Given
    Result<Integer> result = Result.success(input);

    // When
    Result<String> mapped = result
        .map(x -> x * 2)
        .map(String::valueOf);

    // Then
    assertThat(mapped.isSuccess()).isTrue();
    assertThat(mapped.getValue()).isEqualTo(expected);
}

private static Stream<Arguments> chainOperationTestCases() {
    return Stream.of(
        Arguments.of("positive number", 5, "10"),
        Arguments.of("zero", 0, "0"),
        Arguments.of("negative number", -3, "-6")
    );
}

@Nested
@DisplayName("Monadic Laws Verification")
class MonadicLawsTest {

    @Test
    @DisplayName("Left Identity Law: return(a).bind(f) == f(a)")
    void Should_SatisfyLeftIdentityLaw_When_BindingFunction() {
        // Given
        Integer value = 42;
        Function<Integer, Result<String>> f = x -> Result.success(String.valueOf(x * 2));

        // When
        Result<String> leftSide = Result.success(value).bind(f);
        Result<String> rightSide = f.apply(value);

        // Then
        assertThat(leftSide).isEqualTo(rightSide);
    }
}

@ExtendWith(BenchmarkExtension.class)
class ResultPerformanceTest {

    @Benchmark
    @BenchmarkMode(Mode.AverageTime)
    @OutputTimeUnit(TimeUnit.NANOSECONDS)
    void benchmarkResultMapChain() {
        Result<Integer> result = Result.success(42);

        Result<String> mapped = result
            .map(x -> x * 2)
            .map(x -> x + 1)
            .map(String::valueOf);

        // Result consumed to prevent JVM optimizations
        Blackhole.consumeInt(mapped.hashCode());
    }
}
```

### Rationale
- **Comprehensive Coverage**: Parameterized tests cover edge cases systematically
- **Performance Validation**: JMH benchmarks ensure performance goals are met
- **TDD Support**: Clear test structure supports test-first development
- **Monadic Law Testing**: Explicit verification ensures mathematical correctness

### Alternatives Considered
- **TestNG**: Rejected due to additional dependency and similar capabilities
- **Spock Framework**: Rejected due to Groovy dependency
- **Manual benchmarking**: Rejected due to lack of statistical rigor

## 6. Java Version Compatibility Strategy

### Decision: Java 21 LTS Target with Java 25 LTS Support
Target Java 21 LTS as primary version with conditional support for Java 25 LTS features using Multi-Release JARs.

```java
// Main implementation for Java 21+
public final class Result<T> {
    // Standard implementation using Java 21 features
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
}

// Java 25+ optimized version (if using Multi-Release JAR)
// META-INF/versions/25/com/architecture/core/functional/Result.java
public final class Result<T> {
    // Optimized implementation using pattern matching and other Java 25 features
    public <U> Result<U> map(Function<? super T, ? extends U> mapper) {
        return switch (this) {
            case Success<T> success -> {
                try {
                    yield Result.success(mapper.apply(success.value()));
                } catch (Exception e) {
                    yield Result.failure(Error.infrastructure("Mapping.Failed", e.getMessage(), e));
                }
            }
            case Failure<T> failure -> Result.failure(failure.error());
        };
    }
}
```

### Rationale
- **Long-term Support**: Java 21 LTS provides stability until September 2026
- **Future Compatibility**: Java 25 LTS support ensures longevity
- **Enterprise Adoption**: LTS versions have better enterprise support
- **Performance Benefits**: Leverage JVM improvements in newer versions

### Alternatives Considered
- **Java 17 LTS**: Rejected due to missing pattern matching and records improvements
- **Latest Java versions only**: Rejected due to enterprise adoption lag
- **Version-specific artifacts**: Rejected due to deployment complexity

## Summary of Key Decisions

| Area | Decision | Impact |
|------|----------|---------|
| **Generics** | Bounded type parameters with EntityId interface | Type-safe, performant DDD abstractions |
| **Interfaces** | Generic repository with dependency inversion | Clean architecture, Spring integration |
| **Memory** | Value-based classes with JVM optimizations | High performance, low GC pressure |
| **Errors** | Result pattern with strategic exception integration | Functional composition with Java ecosystem compatibility |
| **Testing** | JUnit 5 with parameterized tests and JMH benchmarks | Comprehensive coverage, performance validation |
| **Versions** | Java 21 LTS with Java 25 LTS support | Long-term stability with future optimization |

## Implementation Readiness

All technical unknowns have been resolved. The research provides sufficient detail to:

1. **Design data models** using Java generics and bounded type parameters
2. **Implement functional types** with value-based class patterns
3. **Create repository contracts** following dependency inversion with Spring integration
4. **Write comprehensive tests** using JUnit 5 parameterized patterns
5. **Optimize performance** through JMH benchmarking and JVM escape analysis
6. **Maintain compatibility** across Java LTS versions

**Status**: ✅ Ready for Phase 1 (Design & Contracts)