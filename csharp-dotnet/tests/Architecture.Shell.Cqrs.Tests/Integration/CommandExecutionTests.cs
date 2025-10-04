// Copyright (c) 2025 Universal DDD Architecture. All rights reserved.

using System;
using System.Threading;
using System.Threading.Tasks;
using Architecture.Core.Functional;
using Architecture.Shell.Cqrs.Behaviors;
using Architecture.Shell.Cqrs.Tests.TestHelpers;
using Xunit;

namespace Architecture.Shell.Cqrs.Tests.Integration;

/// <summary>
/// Integration tests for command execution lifecycle.
/// Validates transaction management, commit, and rollback behavior.
/// </summary>
public sealed class CommandExecutionTests
{
    /// <summary>
    /// IT-001: Should_CommitTransaction_When_CommandSucceeds.
    /// Validates that successful command execution commits the transaction.
    /// </summary>
    [Fact]
    public async Task Should_CommitTransaction_When_CommandSucceeds()
    {
        // Given: Mediator with UnitOfWork behavior
        var unitOfWork = new InMemoryUnitOfWork();
        var handler = new TestCommandHandler();
        var behavior = new UnitOfWorkBehavior<TestCommand, Result<string>>(unitOfWork);

        var serviceProvider = TestServiceProvider.CreateBuilder()
            .AddHandler<TestCommand, Result<string>>(handler)
            .AddBehavior<TestCommand, Result<string>>(behavior)
            .Build();

        var logger = new TestLogger<IMediator>();
        var mediator = new Mediator(serviceProvider, logger);
        var command = new TestCommand("test data");

        // When: Command is executed successfully
        var result = await mediator.SendAsync<Result<string>>(command, CancellationToken.None);

        // Then: Transaction is committed
        Assert.True(result.IsSuccess);
        Assert.True(unitOfWork.IsCommitted);
        Assert.False(unitOfWork.IsRolledBack);
        Assert.False(unitOfWork.HasActiveTransaction);
    }

    /// <summary>
    /// IT-002: Should_RollbackTransaction_When_CommandThrowsException.
    /// Validates that exceptions trigger transaction rollback.
    /// </summary>
    [Fact]
    public async Task Should_RollbackTransaction_When_CommandThrowsException()
    {
        // Given: Mediator with UnitOfWork behavior and handler that throws
        var unitOfWork = new InMemoryUnitOfWork();
        var handler = new FailingCommandHandler();
        var behavior = new UnitOfWorkBehavior<FailingCommand, Result<string>>(unitOfWork);

        var serviceProvider = TestServiceProvider.CreateBuilder()
            .AddHandler<FailingCommand, Result<string>>(handler)
            .AddBehavior<FailingCommand, Result<string>>(behavior)
            .Build();

        var logger = new TestLogger<IMediator>();
        var mediator = new Mediator(serviceProvider, logger);
        var command = new FailingCommand(ShouldThrow: true);

        // When: Command throws exception
        // Then: Transaction is rolled back
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => mediator.SendAsync<Result<string>>(command, CancellationToken.None));

        Assert.True(unitOfWork.IsRolledBack);
        Assert.False(unitOfWork.IsCommitted);
        Assert.False(unitOfWork.HasActiveTransaction);
    }

    /// <summary>
    /// IT-003: Should_ShareTransaction_When_NestedCommandCalled.
    /// Validates that nested commands reuse the active transaction.
    /// </summary>
    [Fact]
    public async Task Should_ShareTransaction_When_NestedCommandCalled()
    {
        // Given: Mediator with UnitOfWork behavior and nested command handler
        var unitOfWork = new InMemoryUnitOfWork();

        // Create handlers
        var innerHandler = new InnerCommandHandler();

        // Create two separate mediators for proper dependency injection
        var innerServiceProvider = TestServiceProvider.CreateBuilder()
            .AddHandler<InnerCommand, Result<string>>(innerHandler)
            .AddBehavior<InnerCommand, Result<string>>(new UnitOfWorkBehavior<InnerCommand, Result<string>>(unitOfWork))
            .Build();

        var innerLogger = new TestLogger<IMediator>();
        var innerMediator = new Mediator(innerServiceProvider, innerLogger);

        // Outer handler needs the mediator
        var outerHandler = new OuterCommandHandler(innerMediator);

        var outerServiceProvider = TestServiceProvider.CreateBuilder()
            .AddHandler<OuterCommand, Result<string>>(outerHandler)
            .AddBehavior<OuterCommand, Result<string>>(new UnitOfWorkBehavior<OuterCommand, Result<string>>(unitOfWork))
            .Build();

        var outerLogger = new TestLogger<IMediator>();
        var outerMediator = new Mediator(outerServiceProvider, outerLogger);

        var command = new OuterCommand("outer", "inner");

        // When: Outer command executes and sends inner command
        var result = await outerMediator.SendAsync<Result<string>>(command, CancellationToken.None);

        // Then: Transaction is committed once (shared across both commands)
        Assert.True(result.IsSuccess);
        Assert.True(unitOfWork.IsCommitted);
        Assert.False(unitOfWork.HasActiveTransaction);
        Assert.Contains("Outer:", result.Value);
        Assert.Contains("Inner:", result.Value);
    }

    /// <summary>
    /// IT-008: Should_CommitTransaction_When_HandlerReturnsResultFailure.
    /// Validates BR-007/BR-008: Business failures (Result.Failure) commit transaction.
    /// </summary>
    [Fact]
    public async Task Should_CommitTransaction_When_HandlerReturnsResultFailure()
    {
        // Given: Mediator with UnitOfWork behavior and handler that returns Result.Failure
        var unitOfWork = new InMemoryUnitOfWork();
        var handler = new FailingCommandHandler();
        var behavior = new UnitOfWorkBehavior<FailingCommand, Result<string>>(unitOfWork);

        var serviceProvider = TestServiceProvider.CreateBuilder()
            .AddHandler<FailingCommand, Result<string>>(handler)
            .AddBehavior<FailingCommand, Result<string>>(behavior)
            .Build();

        var logger = new TestLogger<IMediator>();
        var mediator = new Mediator(serviceProvider, logger);
        var command = new FailingCommand(ShouldThrow: false);

        // When: Handler returns Result.Failure (business error)
        var result = await mediator.SendAsync<Result<string>>(command, CancellationToken.None);

        // Then: Transaction is committed (business failure is valid state)
        Assert.True(result.IsFailure);
        Assert.True(unitOfWork.IsCommitted);
        Assert.False(unitOfWork.IsRolledBack);
        Assert.False(unitOfWork.HasActiveTransaction);
    }

    /// <summary>
    /// IT-008b: Should_CommitTransaction_When_VoidCommandHandlerReturnsResultFailure.
    /// Validates BR-007/BR-008 for void commands returning Result.Failure.
    /// </summary>
    [Fact]
    public async Task Should_CommitTransaction_When_VoidCommandHandlerReturnsResultFailure()
    {
        // Given: Mediator with void command handler that returns failure
        var unitOfWork = new InMemoryUnitOfWork();
        var handler = new VoidCommandHandlerWithFailure();
        var behavior = new UnitOfWorkBehavior<VoidTestCommand, Result>(unitOfWork);

        var serviceProvider = TestServiceProvider.CreateBuilder()
            .AddHandler<VoidTestCommand, Result>(handler)
            .AddBehavior<VoidTestCommand, Result>(behavior)
            .Build();

        var logger = new TestLogger<IMediator>();
        var mediator = new Mediator(serviceProvider, logger);
        var command = new VoidTestCommand("test");

        // When: Handler returns Result.Failure
        var result = await mediator.SendAsync(command, CancellationToken.None);

        // Then: Transaction is committed
        Assert.True(result.IsFailure);
        Assert.True(unitOfWork.IsCommitted);
        Assert.False(unitOfWork.IsRolledBack);
    }

    /// <summary>
    /// IT-010: Should_RollbackTransaction_When_BehaviorThrowsException.
    /// Validates spec.md:L68-69 edge case - behavior exceptions trigger rollback.
    /// </summary>
    [Fact]
    public async Task Should_RollbackTransaction_When_BehaviorThrowsException()
    {
        // Given: Mediator with behavior that throws
        var unitOfWork = new InMemoryUnitOfWork();
        var handler = new TestCommandHandler();
        var unitOfWorkBehavior = new UnitOfWorkBehavior<TestCommand, Result<string>>(unitOfWork, order: 10);
        var throwingBehavior = new ThrowingBehavior<TestCommand, Result<string>>(order: 20);

        var serviceProvider = TestServiceProvider.CreateBuilder()
            .AddHandler<TestCommand, Result<string>>(handler)
            .AddBehavior<TestCommand, Result<string>>(unitOfWorkBehavior)
            .AddBehavior<TestCommand, Result<string>>(throwingBehavior)
            .Build();

        var logger = new TestLogger<IMediator>();
        var mediator = new Mediator(serviceProvider, logger);
        var command = new TestCommand("test");

        // When: Behavior throws exception
        // Then: Transaction is rolled back
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => mediator.SendAsync<Result<string>>(command, CancellationToken.None));

        Assert.True(unitOfWork.IsRolledBack);
        Assert.False(unitOfWork.IsCommitted);
    }

    /// <summary>
    /// Helper handler that returns Result.Fail for void commands.
    /// </summary>
    private sealed class VoidCommandHandlerWithFailure : ICommandHandler<VoidTestCommand>
    {
        public Task<Result> HandleAsync(VoidTestCommand request, CancellationToken cancellationToken)
        {
            return Task.FromResult(Result.Fail(Error.Domain("VOID_ERROR", "Void command business failure")));
        }
    }

    /// <summary>
    /// Helper behavior that throws exception.
    /// </summary>
    private sealed class ThrowingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
        where TRequest : IBaseRequest
    {
        public ThrowingBehavior(int order = 50)
        {
            Order = order;
        }

        public int Order { get; }

        public Task<TResponse> HandleAsync(TRequest request, RequestHandlerDelegate<TResponse> continuation, CancellationToken cancellationToken)
        {
            throw new InvalidOperationException("Simulated behavior exception");
        }
    }
}
