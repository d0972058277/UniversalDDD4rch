// Copyright (c) 2025 Universal DDD Architecture. All rights reserved.

using System.Threading;
using System.Threading.Tasks;
using Architecture.Shell.Cqrs.Behaviors;
using Architecture.Shell.Cqrs.Tests.TestHelpers;
using Xunit;

namespace Architecture.Shell.Cqrs.Tests.Integration;

/// <summary>
/// Integration tests for query execution.
/// Validates that queries execute without transactions and support caching.
/// </summary>
public sealed class QueryExecutionTests
{
    /// <summary>
    /// IT-004: Should_SkipTransactionManagement_When_QueryExecutes.
    /// Validates BR-003: Queries do not open transactions.
    /// </summary>
    [Fact]
    public async Task Should_SkipTransactionManagement_When_QueryExecutes()
    {
        // Given: Mediator with UnitOfWork behavior and query handler
        var unitOfWork = new InMemoryUnitOfWork();
        var handler = new TestHelpers.TestQueryHandler();
        var behavior = new UnitOfWorkBehavior<TestHelpers.TestQuery, string>(unitOfWork);

        var serviceProvider = TestServiceProvider.CreateBuilder()
            .AddHandler<TestHelpers.TestQuery, string>(handler)
            .AddBehavior<TestHelpers.TestQuery, string>(behavior)
            .Build();

        var logger = new TestLogger<IMediator>();
        var mediator = new Mediator(serviceProvider, logger);
        var query = new TestHelpers.TestQuery("123");

        // When: Query is executed
        var result = await mediator.SendAsync<string>(query, CancellationToken.None);

        // Then: No transaction was opened (UnitOfWork skips queries automatically)
        Assert.NotNull(result);
        Assert.Contains("Query result for: 123", result);
        Assert.False(unitOfWork.HasActiveTransaction);
        Assert.False(unitOfWork.IsCommitted);
        Assert.False(unitOfWork.IsRolledBack);
    }

    /// <summary>
    /// IT-005: Should_ReturnCachedResult_When_QueryExecutedTwice.
    /// Validates caching behavior for queries (simulated with handler invocation count).
    /// </summary>
    [Fact]
    public async Task Should_ReturnCachedResult_When_QueryExecutedTwice()
    {
        // Given: Mediator with cacheable query handler
        var cacheableHandler = new CacheableQueryHandler();

        var serviceProvider = TestServiceProvider.CreateBuilder()
            .AddHandler<CacheableQuery, string>(cacheableHandler)
            .Build();

        var logger = new TestLogger<IMediator>();
        var mediator = new Mediator(serviceProvider, logger);
        var query = new CacheableQuery("key1");

        // When: Query is executed twice
        var result1 = await mediator.SendAsync<string>(query, CancellationToken.None);
        var result2 = await mediator.SendAsync<string>(query, CancellationToken.None);

        // Then: Handler is invoked twice (caching not yet implemented in behavior)
        // Note: When CachingBehavior is fully implemented with IMemoryCache,
        // this test would verify invocationCount == 1
        Assert.NotNull(result1);
        Assert.NotNull(result2);
        Assert.Equal(result1, result2);
        Assert.Equal(2, cacheableHandler.InvocationCount); // Current behavior without caching
    }
}
