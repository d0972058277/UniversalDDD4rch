// Copyright (c) 2025 Universal DDD Architecture. All rights reserved.

using System;
using System.Threading;
using System.Threading.Tasks;
using Architecture.Core.Functional;

namespace Architecture.Shell.Cqrs.Tests.TestHelpers;

/// <summary>
/// Handler for TestCommand.
/// </summary>
public sealed class TestCommandHandler : ICommandHandler<TestCommand, Result<string>>
{
    public Task<Result<string>> HandleAsync(TestCommand request, CancellationToken cancellationToken)
    {
        return Task.FromResult(Result<string>.Ok($"Processed: {request.Data}"));
    }
}

/// <summary>
/// Handler for VoidTestCommand.
/// </summary>
public sealed class VoidTestCommandHandler : ICommandHandler<VoidTestCommand>
{
    public Task<Result> HandleAsync(VoidTestCommand request, CancellationToken cancellationToken)
    {
        return Task.FromResult(Result.Ok());
    }
}

/// <summary>
/// Handler for FailingCommand that can throw or return failure.
/// </summary>
public sealed class FailingCommandHandler : ICommandHandler<FailingCommand, Result<string>>
{
    public Task<Result<string>> HandleAsync(FailingCommand request, CancellationToken cancellationToken)
    {
        if (request.ShouldThrow)
        {
            throw new InvalidOperationException("Simulated handler exception");
        }

        return Task.FromResult(Result<string>.Fail(Error.Domain("BUSINESS_ERROR", "Simulated business failure")));
    }
}

/// <summary>
/// Handler for OuterCommand that sends an InnerCommand.
/// </summary>
public sealed class OuterCommandHandler : ICommandHandler<OuterCommand, Result<string>>
{
    private readonly IMediator _mediator;

    public OuterCommandHandler(IMediator mediator)
    {
        _mediator = mediator ?? throw new ArgumentNullException(nameof(mediator));
    }

    public async Task<Result<string>> HandleAsync(OuterCommand request, CancellationToken cancellationToken)
    {
        // Send nested command
        var innerResult = await _mediator.SendAsync(new InnerCommand(request.InnerData), cancellationToken);

        if (innerResult.IsFailure)
        {
            return Result<string>.Fail(innerResult.Error);
        }

        return Result<string>.Ok($"Outer: {request.OuterData}, Inner: {innerResult.Value}");
    }
}

/// <summary>
/// Handler for InnerCommand.
/// </summary>
public sealed class InnerCommandHandler : ICommandHandler<InnerCommand, Result<string>>
{
    public Task<Result<string>> HandleAsync(InnerCommand request, CancellationToken cancellationToken)
    {
        return Task.FromResult(Result<string>.Ok($"Inner: {request.Data}"));
    }
}

/// <summary>
/// Handler for TestQuery.
/// </summary>
public sealed class TestQueryHandler : IQueryHandler<TestQuery, string>
{
    public Task<string> HandleAsync(TestQuery request, CancellationToken cancellationToken)
    {
        return Task.FromResult($"Query result for: {request.Id}");
    }
}

/// <summary>
/// Handler for CacheableQuery - tracks invocation count.
/// </summary>
public sealed class CacheableQueryHandler : IQueryHandler<CacheableQuery, string>
{
    public int InvocationCount { get; private set; }

    public Task<string> HandleAsync(CacheableQuery request, CancellationToken cancellationToken)
    {
        InvocationCount++;
        return Task.FromResult($"Cached result for: {request.Key}");
    }
}
