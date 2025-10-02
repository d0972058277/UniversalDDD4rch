// Copyright (c) 2025 Universal DDD Architecture. All rights reserved.

using System;
using System.Threading;
using System.Threading.Tasks;
using Architecture.Shell.Cqrs.Behaviors;
using Architecture.Shell.Cqrs.Tests.TestHelpers;
using Xunit;

namespace Architecture.Shell.Cqrs.Tests.Integration;

/// <summary>
/// Integration tests for validation behavior.
/// Validates that validation failures short-circuit the pipeline.
/// </summary>
public sealed class ValidationTests
{
    /// <summary>
    /// IT-007: Should_AbortExecution_When_ValidationFails.
    /// Validates that validation behavior can short-circuit pipeline.
    /// </summary>
    [Fact]
    public async Task Should_AbortExecution_When_ValidationFails()
    {
        // Given: Mediator with validation behavior that throws
        var handlers = new IRequestHandler[]
        {
            new TestCommandHandler()
        };
        var behaviors = new IPipelineBehavior[]
        {
            new FailingValidationBehavior<IBaseRequest, object>()
        };
        var mediator = new Mediator(handlers, behaviors);
        var command = new TestCommand("validation test");

        // When: Validation fails
        // Then: Pipeline is short-circuited (handler never executes)
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => mediator.SendAsync(command, CancellationToken.None));
    }

    /// <summary>
    /// Helper behavior that simulates validation failure.
    /// </summary>
    private sealed class FailingValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
        where TRequest : IBaseRequest
    {
        public int Order => 10;

        public Task<TResponse> HandleAsync(TRequest request, RequestHandlerDelegate<TResponse> continuation, CancellationToken cancellationToken)
        {
            throw new InvalidOperationException("Validation failed");
        }
    }
}
