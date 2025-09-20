# Research Findings: Architecture.Core .NET 8 Implementation

## 1. .NET 8 LTS BCL Best Practices for Generic Constraints and Performance

**Decision**: Use strict generic constraints with `where T : class` for identity types, leverage `IEqualityComparer<T>` for performance, and utilize .NET 8 performance improvements.

**Rationale**:
- .NET 8 LTS provides improved JIT optimizations for generics
- Strong constraints prevent misuse and enable compile-time safety
- Built-in equality comparers are highly optimized
- LTS ensures 3-year support lifecycle

**Alternatives Considered**:
- Weak constraints with runtime checks (rejected: performance overhead)
- Third-party constraint libraries (rejected: external dependency)
- Custom constraint implementations (rejected: BCL provides better optimizations)

**Performance Considerations**:
- Use `EqualityComparer<T>.Default` for optimal performance
- Leverage `RuntimeHelpers.GetHashCode()` for reference equality
- Utilize span-based operations where applicable in .NET 8

## 2. Monadic Patterns Implementation in C# Without External Dependencies

**Decision**: Implement Result<T> and Maybe<T> using readonly struct with discriminated union pattern, leveraging C# 12 features.

**Rationale**:
- Readonly structs minimize allocations
- Pattern matching provides clean syntax
- No heap allocations for success cases
- Full monadic laws support with Map/Bind/Match

**Alternatives Considered**:
- Class-based approach (rejected: heap allocation overhead)
- Using System.ValueTuple (rejected: unclear semantics)
- OneOf library pattern (rejected: external dependency)

**Performance Considerations**:
- Struct implementation avoids GC pressure
- Method inlining for hot paths
- Avoid boxing through generic constraints

**BCL-Only Implementation**:
```csharp
public readonly struct Result<T>
{
    private readonly T? _value;
    private readonly Error? _error;
    private readonly bool _isSuccess;

    public bool IsSuccess => _isSuccess;
    public bool IsFailure => !_isSuccess;

    public Result<TResult> Map<TResult>(Func<T, TResult> func) { /* */ }
    public Result<TResult> Bind<TResult>(Func<T, Result<TResult>> func) { /* */ }
    public TResult Match<TResult>(Func<T, TResult> onSuccess, Func<Error, TResult> onFailure) { /* */ }
}
```

## 3. Reflection-Based ValueObject Equality Optimization

**Decision**: Use component-based equality with reflection caching and optional C# records integration for simple value objects.

**Rationale**:
- Abstract `GetEqualityComponents()` method provides flexibility
- Reflection caching eliminates performance penalties
- Records provide built-in structural equality for simple cases
- Maintains immutability guarantees

**Alternatives Considered**:
- Pure reflection approach (rejected: runtime performance cost)
- Source generators (rejected: build-time complexity)
- Manual equality implementation (rejected: boilerplate and error-prone)

**Performance Considerations**:
- Cache PropertyInfo/FieldInfo using static ConcurrentDictionary
- Use GetEqualityComponents() enumeration for complex equality
- Leverage C# records for simple value objects

**BCL-Only Implementation**:
```csharp
public abstract class ValueObject
{
    protected abstract IEnumerable<object?> GetEqualityComponents();

    public override bool Equals(object? obj) =>
        obj is ValueObject other && GetEqualityComponents().SequenceEqual(other.GetEqualityComponents());

    public override int GetHashCode() =>
        GetEqualityComponents().Aggregate(0, (hash, component) =>
            HashCode.Combine(hash, component?.GetHashCode() ?? 0));
}
```

## 4. Domain Event Correlation/Causation ID Patterns

**Decision**: Implement hierarchical correlation chain with structured metadata using IDictionary<string, object>.

**Rationale**:
- Correlation ID tracks request flow across boundaries
- Causation ID tracks direct event relationships
- Metadata dictionary provides extensibility
- DateTimeOffset ensures timezone handling

**Alternatives Considered**:
- Simple string properties (rejected: lacks structure)
- Custom metadata class (rejected: over-engineering)
- JSON serialization approach (rejected: serialization dependency)

**Performance Considerations**:
- Use guid-based IDs for uniqueness and performance
- Lazy initialization of metadata dictionary
- Immutable event instances

**BCL-Only Implementation**:
```csharp
public interface IDomainEvent
{
    Guid Id { get; }
    DateTimeOffset OccurredAt { get; }
    string? CorrelationId { get; }
    string? CausationId { get; }
    IReadOnlyDictionary<string, object> Metadata { get; }
}

public abstract class DomainEventBase : IDomainEvent
{
    public Guid Id { get; } = Guid.NewGuid();
    public DateTimeOffset OccurredAt { get; } = DateTimeOffset.UtcNow;
    public string? CorrelationId { get; init; }
    public string? CausationId { get; init; }
    public IReadOnlyDictionary<string, object> Metadata { get; init; } =
        new Dictionary<string, object>();
}
```

## 5. Repository Interface Design for Async/Cancellation Best Practices

**Decision**: Aggregate-focused repository pattern with comprehensive async/cancellation support and Maybe/Result return types.

**Rationale**:
- Aggregate-centric aligns with DDD principles
- Consistent CancellationToken usage prevents hanging operations
- Maybe<T> for not-found scenarios eliminates null reference issues
- Result<T> for operations that can fail gracefully

**Alternatives Considered**:
- Generic repository (rejected: violates DDD aggregate boundaries)
- Synchronous methods (rejected: blocking I/O concerns)
- Nullable return types (rejected: unclear null semantics)

**Performance Considerations**:
- ConfigureAwait(false) for library code
- ValueTask for high-frequency operations
- Async enumerable for large result sets

**BCL-Only Implementation**:
```csharp
public interface IRepository<TAggregate, TId>
    where TAggregate : class, IAggregateRoot<TId>
    where TId : class
{
    Task<Maybe<TAggregate>> GetByIdAsync(TId id, CancellationToken cancellationToken = default);
    Task<Result> AddAsync(TAggregate aggregate, CancellationToken cancellationToken = default);
    Task<Result> UpdateAsync(TAggregate aggregate, CancellationToken cancellationToken = default);
    Task<Result> DeleteAsync(TId id, CancellationToken cancellationToken = default);
    Task<Result<bool>> ExistsAsync(TId id, CancellationToken cancellationToken = default);
}
```

## Summary

All research findings support a pure BCL implementation targeting .NET 8 LTS with:
- Zero external runtime dependencies
- Optimal performance through modern .NET features
- Strong type safety with generic constraints
- Comprehensive async/cancellation support
- Monadic error handling patterns
- Enterprise-grade reliability and maintainability

The implementation will follow TDD principles with comprehensive test coverage for all monadic laws and edge cases.