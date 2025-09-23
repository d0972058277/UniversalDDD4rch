# Migration Guide: C# Universal DDD Architecture v1.x to v2.0

## Overview

This guide helps you migrate your C# Universal DDD Architecture implementation from v1.x to v2.0. The new version provides enhanced multi-language consistency, improved API alignment, and better integration patterns.

## Breaking Changes Summary

### 1. Repository Interface Changes

**v1.x:**
```csharp
public interface IRepository<TAggregate, TId>
{
    Task<Result> SaveAsync(TAggregate aggregate, CancellationToken cancellationToken = default);
    // ... other methods
}
```

**v2.0:**
```csharp
public interface IRepository<TAggregate, TId>
{
    Task<Result> AddAsync(TAggregate aggregate, CancellationToken cancellationToken = default);
    Task<Result> UpdateAsync(TAggregate aggregate, CancellationToken cancellationToken = default);
    // ... other methods
}
```

**Migration Action:**
- Replace `SaveAsync()` calls with appropriate `AddAsync()` or `UpdateAsync()` calls
- For new aggregates: Use `AddAsync()`
- For existing aggregates: Use `UpdateAsync()`

### 2. AggregateRoot API Standardization

**v1.x:**
```csharp
public abstract class AggregateRoot<TId>
{
    public void UpdateVersion() { Version++; } // Old method name
}
```

**v2.0:**
```csharp
public abstract class AggregateRoot<TId>
{
    public void IncrementVersion() { Version++; } // Standardized across languages
}
```

**Migration Action:**
- Replace `UpdateVersion()` calls with `IncrementVersion()`
- Deprecated shim available during transition period

### 3. Result Monad Consistency

**v1.x:**
```csharp
// Mixed naming patterns
Result.Success(value)  // Sometimes used
Result.Ok(value)       // Sometimes used
```

**v2.0:**
```csharp
// Standardized naming
Result.Ok(value)       // Always use this
Result.Fail(error)     // Always use this
```

**Migration Action:**
- Replace `Result.Success()` with `Result.Ok()`
- Ensure consistent use of `Result.Fail()` for failures

### 4. Package Structure Changes

**v1.x:**
```
Architecture.Core (monolithic)
├── All functionality combined
└── External dependencies included
```

**v2.0:**
```
Architecture.Core (pure core)
├── Core DDD abstractions only
├── No external dependencies
└── Integration packages separate:
    ├── Architecture.Core.EntityFramework
    ├── Architecture.Core.MediatR
    └── Architecture.Core.FluentValidation
```

**Migration Action:**
- Update package references to separate core and integration packages
- Install only required integration packages
- Update using statements if needed

## Step-by-Step Migration

### Step 1: Update Package References

```xml
<!-- Remove old monolithic package -->
<PackageReference Include="Architecture.Core" Version="1.x" />

<!-- Add new separated packages -->
<PackageReference Include="Architecture.Core" Version="2.0.0" />
<!-- Add only needed integrations -->
<PackageReference Include="Architecture.Core.EntityFramework" Version="2.0.0" />
<PackageReference Include="Architecture.Core.MediatR" Version="2.0.0" />
```

### Step 2: Update Repository Implementations

**Before:**
```csharp
public class CustomerService
{
    public async Task<Result<CustomerId>> CreateCustomerAsync(Customer customer)
    {
        var saveResult = await _repository.SaveAsync(customer);
        if (!saveResult.IsSuccess)
            return Result.Fail<CustomerId>(saveResult.Error);

        return Result.Ok(customer.Id);
    }
}
```

**After:**
```csharp
public class CustomerService
{
    public async Task<Result<CustomerId>> CreateCustomerAsync(Customer customer)
    {
        var addResult = await _repository.AddAsync(customer);
        if (!addResult.IsSuccess)
            return Result.Fail<CustomerId>(addResult.Error);

        return Result.Ok(customer.Id);
    }

    public async Task<Result> UpdateCustomerAsync(Customer customer)
    {
        return await _repository.UpdateAsync(customer);
    }
}
```

### Step 3: Update AggregateRoot Usage

**Before:**
```csharp
public class Order : AggregateRoot<OrderId>
{
    public Result ConfirmOrder()
    {
        Status = OrderStatus.Confirmed;
        AddEvent(new OrderConfirmed(Id, DateTime.UtcNow));
        UpdateVersion(); // Old method
        return Result.Ok();
    }
}
```

**After:**
```csharp
public class Order : AggregateRoot<OrderId>
{
    public Result ConfirmOrder()
    {
        Status = OrderStatus.Confirmed;
        AddEvent(new OrderConfirmed(Id, DateTime.UtcNow));
        IncrementVersion(); // New standardized method
        return Result.Ok();
    }
}
```

### Step 4: Update Result Monad Usage

**Before:**
```csharp
// Inconsistent creation methods
var result1 = Result.Success(value);
var result2 = Result.Ok(value);
var result3 = Result.Failure(error);
```

**After:**
```csharp
// Consistent creation methods
var result1 = Result.Ok(value);
var result2 = Result.Ok(value);
var result3 = Result.Fail(error);
```

### Step 5: Update Entity Framework Integration

**Before:**
```csharp
// Direct EF usage in domain
public class CustomerRepository
{
    private readonly DbContext _context;
    // Implementation mixed with EF concerns
}
```

**After:**
```csharp
// Use dedicated EF integration package
using Architecture.Core.EntityFramework.Repositories;

public class CustomerRepository : EntityFrameworkRepository<Customer, CustomerId>
{
    public CustomerRepository(DbContext context) : base(context) { }

    // Additional custom methods if needed
    public async Task<Maybe<Customer>> GetByEmailAsync(EmailAddress email)
    {
        // Implementation using EF integration helpers
    }
}
```

## Testing Updates

### Update Contract Tests

**Before:**
```csharp
[Test]
public async Task SaveAsync_ShouldPersistAggregate()
{
    var result = await _repository.SaveAsync(customer);
    Assert.IsTrue(result.IsSuccess);
}
```

**After:**
```csharp
[Test]
public async Task AddAsync_ShouldPersistNewAggregate()
{
    var result = await _repository.AddAsync(customer);
    Assert.IsTrue(result.IsSuccess);
}

[Test]
public async Task UpdateAsync_ShouldModifyExistingAggregate()
{
    var result = await _repository.UpdateAsync(customer);
    Assert.IsTrue(result.IsSuccess);
}
```

### Add Cross-Language Contract Tests

```csharp
[TestFixture]
public class AggregateRootContractTests
{
    [Test]
    public void Should_IncrementVersion_When_IncrementVersionCalled()
    {
        // GIVEN
        var customer = Customer.Create(email, name).Value;
        var initialVersion = customer.Version;

        // WHEN
        customer.IncrementVersion();

        // THEN
        Assert.AreEqual(initialVersion + 1, customer.Version);
    }
}
```

## Performance Considerations

### v2.0 Performance Improvements

- **Zero allocations** for Result/Maybe operations in hot paths
- **Reduced memory footprint** through separation of concerns
- **Better GC pressure** with optimized event collections
- **Faster serialization** with streamlined object graphs

### Benchmark Your Migration

```csharp
[MemoryDiagnoser]
[SimpleJob(RuntimeMoniker.Net80)]
public class MigrationBenchmarks
{
    [Benchmark]
    public void CustomerCreation_V2()
    {
        var customer = Customer.Create(email, name);
        // Measure performance
    }

    [Benchmark]
    public async Task RepositoryAdd_V2()
    {
        await _repository.AddAsync(customer);
        // Measure performance
    }
}
```

## Troubleshooting

### Common Migration Issues

1. **Compilation Errors with Repository.SaveAsync()**
   - **Cause:** Method no longer exists
   - **Solution:** Use `AddAsync()` for new aggregates, `UpdateAsync()` for existing

2. **Missing IncrementVersion() Method**
   - **Cause:** Using old `UpdateVersion()` method
   - **Solution:** Replace with `IncrementVersion()`

3. **Package Reference Conflicts**
   - **Cause:** Mixed v1.x and v2.0 package references
   - **Solution:** Ensure all Architecture.Core packages are v2.0

4. **Entity Framework Integration Issues**
   - **Cause:** Using old direct EF integration
   - **Solution:** Install `Architecture.Core.EntityFramework` and use provided base classes

### Verification Steps

After migration, verify your implementation:

1. **Run all unit tests** - Ensure business logic still works
2. **Run contract tests** - Validate cross-language consistency
3. **Run integration tests** - Ensure database/messaging still works
4. **Run performance tests** - Verify performance improvements
5. **Check deprecation warnings** - Address any remaining v1.x API usage

## Support and Resources

- **Documentation:** [Architecture Documentation](../docs)
- **Examples:** [Quickstart Examples](../examples)
- **Issues:** [GitHub Issues](https://github.com/architecture/core/issues)
- **Community:** [Discussion Forum](https://github.com/architecture/core/discussions)

## Conclusion

Universal DDD Architecture v2.0 provides significant improvements in consistency, performance, and maintainability. While there are breaking changes, the migration path is straightforward and the benefits include better cross-language alignment and cleaner separation of concerns.

The temporary deprecation shims provide a smooth transition period, but we recommend completing the migration as soon as possible to take advantage of the full v2.0 feature set.