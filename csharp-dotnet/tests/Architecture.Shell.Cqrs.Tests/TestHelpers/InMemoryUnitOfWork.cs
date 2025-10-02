// Copyright (c) 2025 Universal DDD Architecture. All rights reserved.

using System;
using System.Threading;
using System.Threading.Tasks;

namespace Architecture.Shell.Cqrs.Tests.TestHelpers;

/// <summary>
/// In-memory implementation of IUnitOfWork for testing purposes.
/// Simulates transaction lifecycle without actual database operations.
/// </summary>
public sealed class InMemoryUnitOfWork : IUnitOfWork
{
    private Guid? _transactionId;
    private bool _isCommitted;
    private bool _isRolledBack;

    /// <summary>
    /// Gets the transaction ID if a transaction is active.
    /// </summary>
    public Guid TransactionId => _transactionId ?? throw new InvalidOperationException("No active transaction");

    /// <summary>
    /// Gets a value indicating whether a transaction is currently active.
    /// </summary>
    public bool HasActiveTransaction => _transactionId.HasValue;

    /// <summary>
    /// Gets a value indicating whether the transaction was committed.
    /// </summary>
    public bool IsCommitted => _isCommitted;

    /// <summary>
    /// Gets a value indicating whether the transaction was rolled back.
    /// </summary>
    public bool IsRolledBack => _isRolledBack;

    /// <summary>
    /// Gets a value indicating whether BeginTransactionAsync should throw an exception.
    /// </summary>
    public bool ShouldFailOnBegin { get; set; }

    /// <summary>
    /// Begins a new transaction.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <exception cref="InvalidOperationException">Thrown when a transaction is already active or when ShouldFailOnBegin is true.</exception>
    public Task BeginTransactionAsync(CancellationToken cancellationToken = default)
    {
        if (ShouldFailOnBegin)
        {
            throw new InvalidOperationException("Simulated transaction provider failure");
        }

        if (_transactionId.HasValue)
        {
            throw new InvalidOperationException("Transaction already active");
        }

        _transactionId = Guid.NewGuid();
        _isCommitted = false;
        _isRolledBack = false;

        return Task.CompletedTask;
    }

    /// <summary>
    /// Commits the active transaction.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <exception cref="InvalidOperationException">Thrown when no transaction is active.</exception>
    public Task CommitAsync(CancellationToken cancellationToken = default)
    {
        if (!_transactionId.HasValue)
        {
            throw new InvalidOperationException("No active transaction to commit");
        }

        _isCommitted = true;
        _transactionId = null;

        return Task.CompletedTask;
    }

    /// <summary>
    /// Rolls back the active transaction.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <exception cref="InvalidOperationException">Thrown when no transaction is active.</exception>
    public Task RollbackAsync(CancellationToken cancellationToken = default)
    {
        if (!_transactionId.HasValue)
        {
            throw new InvalidOperationException("No active transaction to rollback");
        }

        _isRolledBack = true;
        _transactionId = null;

        return Task.CompletedTask;
    }

    /// <summary>
    /// Resets the unit of work state for reuse in tests.
    /// </summary>
    public void Reset()
    {
        _transactionId = null;
        _isCommitted = false;
        _isRolledBack = false;
        ShouldFailOnBegin = false;
    }
}
