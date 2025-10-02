// Copyright (c) 2025 Universal DDD Architecture. All rights reserved.

using System;
using System.Threading;
using System.Threading.Tasks;
using Architecture.Shell.Cqrs.Behaviors;
using Architecture.Shell.Cqrs.Tests.TestHelpers;
using Xunit;

namespace Architecture.Shell.Cqrs.Tests.Integration;

/// <summary>
/// Integration tests for UnitOfWork behavior edge cases.
/// Validates transaction provider failure handling.
/// </summary>
public sealed class UnitOfWorkBehaviorIntegrationTests
{
    /// <summary>
    /// IT-009: Should_ThrowException_When_TransactionProviderFails.
    /// Validates BR-006: Fail-fast when BeginTransactionAsync() throws.
    /// </summary>
    [Fact]
    public async Task Should_ThrowException_When_TransactionProviderFails()
    {
        // Given: UnitOfWork configured to fail on BeginTransaction
        var unitOfWork = new InMemoryUnitOfWork
        {
            ShouldFailOnBegin = true
        };
        var handlers = new IRequestHandler[]
        {
            new TestCommandHandler()
        };
        var behaviors = new IPipelineBehavior[]
        {
            new UnitOfWorkBehavior<IBaseRequest, object>(unitOfWork, new CommandOnlyMatcher())
        };
        var mediator = new Mediator(handlers, behaviors);
        var command = new TestCommand("provider failure test");

        // When: Transaction provider fails
        // Then: Exception propagates (fail-fast)
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => mediator.SendAsync(command, CancellationToken.None));

        Assert.False(unitOfWork.HasActiveTransaction);
        Assert.False(unitOfWork.IsCommitted);
        Assert.False(unitOfWork.IsRolledBack);
    }
}
