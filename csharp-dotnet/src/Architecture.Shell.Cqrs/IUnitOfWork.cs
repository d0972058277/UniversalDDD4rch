namespace Architecture.Shell.Cqrs;

/// <summary>
/// Transaction boundary abstraction for commands.
/// Provides transaction lifecycle management with support for nested command detection.
/// </summary>
/// <remarks>
/// <para><strong>Behavioral Requirements:</strong></para>
/// <list type="bullet">
/// <item>Commands MUST execute within transaction boundaries (enforced by UnitOfWorkBehavior)</item>
/// <item>Queries MUST NOT open transactions (no-op in UnitOfWorkBehavior)</item>
/// <item>Nested commands MUST reuse active transaction (check <see cref="HasActiveTransaction"/>)</item>
/// <item>Transaction commit occurs on successful handler completion (including Result.Failure business errors)</item>
/// <item>Transaction rollback occurs on exception (infrastructure errors only)</item>
/// <item>BeginTransactionAsync MUST fail fast when transaction provider unavailable (per BR-006)</item>
/// </list>
///
/// <para><strong>Usage Pattern:</strong></para>
/// <code>
/// // In UnitOfWorkBehavior
/// if (request is ICommand &amp;&amp; !_unitOfWork.HasActiveTransaction)
/// {
///     await _unitOfWork.BeginTransactionAsync(ct);
///     try
///     {
///         var response = await next();
///         await _unitOfWork.CommitAsync(ct); // Even if response is Result.Failure
///         return response;
///     }
///     catch (Exception)
///     {
///         await _unitOfWork.RollbackAsync(ct);
///         throw;
///     }
/// }
/// </code>
/// </remarks>
public interface IUnitOfWork
{
    /// <summary>
    /// Gets the transaction ID for correlation with telemetry logs.
    /// Populated after <see cref="BeginTransactionAsync"/> is called.
    /// </summary>
    /// <remarks>
    /// REQUIRED for all command executions per NFR-002 and BR-002.
    /// Used by TelemetryBehavior to log transaction context.
    /// </remarks>
    Guid TransactionId { get; }

    /// <summary>
    /// Indicates whether a transaction is currently active.
    /// Used by UnitOfWorkBehavior to detect nested commands and prevent nested transactions.
    /// </summary>
    bool HasActiveTransaction { get; }

    /// <summary>
    /// Opens a new database transaction.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token for early termination.</param>
    /// <exception cref="InvalidOperationException">
    /// When transaction provider is unavailable (connection pool exhausted, database offline).
    /// Per BR-006, this MUST fail fast without retry.
    /// </exception>
    /// <remarks>
    /// MUST generate new <see cref="TransactionId"/> and set <see cref="HasActiveTransaction"/> to true.
    /// </remarks>
    Task BeginTransactionAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Commits the active transaction, persisting all changes.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token for early termination.</param>
    /// <remarks>
    /// Called by UnitOfWorkBehavior when handler completes successfully.
    /// This includes scenarios where handler returns Result.Failure (business errors are valid state).
    /// </remarks>
    Task CommitAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Rolls back the active transaction, discarding all changes.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token for early termination.</param>
    /// <remarks>
    /// Called by UnitOfWorkBehavior when handler or behavior throws exception (infrastructure errors only).
    /// MUST be logged BEFORE rollback execution per BR-002 to ensure TransactionId correlation if rollback itself fails.
    /// </remarks>
    Task RollbackAsync(CancellationToken cancellationToken);
}
