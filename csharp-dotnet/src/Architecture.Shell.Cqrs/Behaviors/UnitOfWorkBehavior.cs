using Architecture.Core.Functional;
using Microsoft.Extensions.Logging;

namespace Architecture.Shell.Cqrs.Behaviors;

/// <summary>
/// Pipeline behavior that manages transaction boundaries for commands.
/// Implements BR-003, BR-006, BR-007, BR-008 per spec.md.
/// </summary>
/// <typeparam name="TRequest">The request type</typeparam>
/// <typeparam name="TResponse">The response type</typeparam>
public class UnitOfWorkBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IBaseRequest
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<UnitOfWorkBehavior<TRequest, TResponse>>? _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="UnitOfWorkBehavior{TRequest, TResponse}"/> class.
    /// </summary>
    /// <param name="unitOfWork">The unit of work for transaction management</param>
    /// <param name="logger">Optional logger for transaction telemetry</param>
    /// <param name="order">Execution order (default: 30, after validation/authorization)</param>
    public UnitOfWorkBehavior(
        IUnitOfWork unitOfWork,
        ILogger<UnitOfWorkBehavior<TRequest, TResponse>>? logger = null,
        int order = 30)
    {
        _unitOfWork = unitOfWork ?? throw new ArgumentNullException(nameof(unitOfWork));
        _logger = logger;
        Order = order;
    }

    /// <inheritdoc />
    public int Order { get; }

    /// <summary>
    /// Handles the request by managing transaction boundaries.
    /// </summary>
    public async Task<TResponse> HandleAsync(
        TRequest request,
        RequestHandlerDelegate<TResponse> continuation,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(continuation);

        // Skip transaction management for queries (BR-003)
        // Check both ICommand (void) and ICommand<TResult> (non-void commands)
        var isCommand = request is ICommand ||
                       request.GetType().GetInterfaces().Any(i =>
                           i.IsGenericType && i.GetGenericTypeDefinition() == typeof(ICommand<>));

        if (!isCommand)
        {
            return await continuation().ConfigureAwait(false);
        }

        // Reuse existing transaction for nested commands (BR-005)
        if (_unitOfWork.HasActiveTransaction)
        {
            return await continuation().ConfigureAwait(false);
        }

        // Begin new transaction (BR-006: fail fast if transaction provider fails)
        try
        {
            await _unitOfWork.BeginTransactionAsync(cancellationToken).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex,
                "Failed to begin transaction for {RequestType} - transaction provider failure",
                typeof(TRequest).Name);
            throw; // BR-006: fail fast on infrastructure error
        }

        try
        {
            // Execute handler and behaviors
            var response = await continuation().ConfigureAwait(false);

            // BR-008: Commit transaction even for Result.Failure (business errors)
            // Business failures are valid outcomes that should be persisted
            if (response is Result result && result.IsFailure)
            {
                _logger?.LogInformation(
                    "Committing transaction for {RequestType} with business failure - TransactionId={TransactionId}",
                    typeof(TRequest).Name,
                    _unitOfWork.TransactionId);
            }

            await _unitOfWork.CommitAsync(cancellationToken).ConfigureAwait(false);
            return response;
        }
        catch (Exception ex)
        {
            // BR-002: Log before rollback to preserve TransactionId correlation
            _logger?.LogError(ex,
                "{RequestType} failed - TransactionId={TransactionId}. Rolling back transaction.",
                typeof(TRequest).Name,
                _unitOfWork.TransactionId);

            // BR-007: Rollback on exception (infrastructure errors)
            await _unitOfWork.RollbackAsync(cancellationToken).ConfigureAwait(false);
            throw;
        }
    }
}
