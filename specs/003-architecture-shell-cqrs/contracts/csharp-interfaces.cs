// Architecture.Shell.Cqrs - C# Interface Contracts
// Language: C# 12 (.NET 8 LTS)
// Purpose: Core CQRS abstractions for mediator pattern implementation
// Dependencies: Microsoft.Extensions.DependencyInjection.Abstractions (minimal)

namespace Architecture.Shell.Cqrs;

/// <summary>
/// Common ancestor for all application-layer requests.
/// Enables uniform pipeline processing for commands, queries, and future request types.
/// </summary>
public interface IBaseRequest { }

/// <summary>
/// Requests that return a value.
/// Used by queries and commands with return values.
/// </summary>
/// <typeparam name="TResult">The return type</typeparam>
public interface IBaseRequest<out TResult> : IBaseRequest { }

/// <summary>
/// Marker interface for state-changing operations with no return value.
/// Executes within transaction boundary.
/// </summary>
public interface ICommand : IBaseRequest { }

/// <summary>
/// Marker interface for state-changing operations with return value.
/// Executes within transaction boundary.
/// </summary>
/// <typeparam name="TResult">The return type (typically Result&lt;TValue&gt;)</typeparam>
public interface ICommand<out TResult> : IBaseRequest<TResult> { }

/// <summary>
/// Marker interface for read-only operations with return value.
/// Executes WITHOUT transaction; may use caching.
/// </summary>
/// <typeparam name="TResult">The return type (DTO/projection)</typeparam>
public interface IQuery<out TResult> : IBaseRequest<TResult> { }

/// <summary>
/// Base handler interface for processing requests.
/// </summary>
/// <typeparam name="TRequest">The request type</typeparam>
/// <typeparam name="TResponse">The response type</typeparam>
public interface IRequestHandler<in TRequest, TResponse>
    where TRequest : IBaseRequest
{
    /// <summary>
    /// Handles the request.
    /// Business errors return Result.Failure; infrastructure errors throw exceptions.
    /// </summary>
    Task<TResponse> HandleAsync(TRequest request, CancellationToken cancellationToken);
}

/// <summary>
/// Handler for commands with no return value.
/// </summary>
/// <typeparam name="TCommand">The command type</typeparam>
public interface ICommandHandler<in TCommand> : IRequestHandler<TCommand, Unit>
    where TCommand : ICommand
{
}

/// <summary>
/// Handler for commands with return value.
/// </summary>
/// <typeparam name="TCommand">The command type</typeparam>
/// <typeparam name="TResult">The return type</typeparam>
public interface ICommandHandler<in TCommand, TResult> : IRequestHandler<TCommand, TResult>
    where TCommand : ICommand<TResult>
{
}

/// <summary>
/// Handler for read-only queries.
/// </summary>
/// <typeparam name="TQuery">The query type</typeparam>
/// <typeparam name="TResult">The return type</typeparam>
public interface IQueryHandler<in TQuery, TResult> : IRequestHandler<TQuery, TResult>
    where TQuery : IQuery<TResult>
{
}

/// <summary>
/// Single entry point for sending commands and queries.
/// Routes requests to registered handlers via pipeline behaviors.
/// </summary>
public interface IMediator
{
    /// <summary>
    /// Sends a request with return value through the pipeline.
    /// </summary>
    Task<TResponse> SendAsync<TResponse>(
        IBaseRequest<TResponse> request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Sends a request with no return value through the pipeline.
    /// </summary>
    Task SendAsync(
        IBaseRequest request,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Delegate representing the next step in the pipeline (next behavior or handler).
/// </summary>
public delegate Task<TResponse> RequestHandlerDelegate<TResponse>();

/// <summary>
/// Pipeline behavior for cross-cutting concerns.
/// Wraps handler execution with pre/post logic.
/// </summary>
/// <typeparam name="TRequest">The request type</typeparam>
/// <typeparam name="TResponse">The response type</typeparam>
public interface IPipelineBehavior<in TRequest, TResponse>
    where TRequest : IBaseRequest
{
    /// <summary>
    /// Handles the request by executing cross-cutting logic before/after calling next().
    /// </summary>
    Task<TResponse> HandleAsync(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken);

    /// <summary>
    /// Execution order (lower values execute first).
    /// Default: 100. Recommended: Validation=10, Authorization=20, Transaction=30, Telemetry=40, Resilience=50
    /// </summary>
    int Order => 100;
}

/// <summary>
/// Transaction boundary abstraction for commands.
/// </summary>
public interface IUnitOfWork
{
    /// <summary>
    /// Unique identifier for the current transaction.
    /// </summary>
    Guid TransactionId { get; }

    /// <summary>
    /// Indicates whether a transaction is currently active.
    /// </summary>
    bool HasActiveTransaction { get; }

    /// <summary>
    /// Begins a new transaction.
    /// Throws if transaction provider unavailable (fail fast).
    /// </summary>
    Task BeginTransactionAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Commits the current transaction.
    /// Called on successful handler completion (including Result.Failure business errors).
    /// </summary>
    Task CommitAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Rolls back the current transaction.
    /// Called on exception (infrastructure errors).
    /// </summary>
    Task RollbackAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Configuration interface for determining which behaviors apply to which request types.
/// </summary>
public interface IBehaviorMatcher
{
    /// <summary>
    /// Determines if this behavior should execute for the given request type.
    /// </summary>
    bool Matches<TRequest>(TRequest request) where TRequest : IBaseRequest;
}

/// <summary>
/// Unit type for commands with no return value.
/// </summary>
public readonly struct Unit
{
    public static Unit Value => default;
}