using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Architecture.Core.Domain.Aggregates;
using Architecture.Core.Domain.Repositories;
using Architecture.Core.Functional;

namespace Architecture.Core.EntityFramework.Repositories;

/// <summary>
/// Entity Framework Core implementation of the Repository pattern for aggregate roots.
/// Provides async operations with optimistic concurrency control and Result-based error handling.
/// </summary>
/// <typeparam name="TAggregate">The aggregate root type</typeparam>
/// <typeparam name="TId">The aggregate identifier type</typeparam>
public class EntityFrameworkRepository<TAggregate, TId> : IRepository<TAggregate, TId>
    where TAggregate : class, IAggregateRoot<TId>
    where TId : class
{
    private readonly DbContext _context;
    private readonly DbSet<TAggregate> _dbSet;

    /// <summary>
    /// Initializes a new instance of the EntityFrameworkRepository class.
    /// </summary>
    /// <param name="context">The Entity Framework DbContext.</param>
    public EntityFrameworkRepository(DbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _dbSet = _context.Set<TAggregate>();
    }

    /// <inheritdoc />
    public async Task<Maybe<TAggregate>> GetByIdAsync(TId id, CancellationToken cancellationToken = default)
    {
        if (id == null)
            return Maybe.None<TAggregate>();

        try
        {
            var aggregate = await _dbSet.FindAsync(new object[] { id }, cancellationToken);
            return aggregate != null ? Maybe.Some(aggregate) : Maybe.None<TAggregate>();
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            // In a production implementation, you might want to log this error
            return Maybe.None<TAggregate>();
        }
    }

    /// <inheritdoc />
    public async Task<Result> AddAsync(TAggregate aggregate, CancellationToken cancellationToken = default)
    {
        if (aggregate == null)
            return Result.Fail(new ValidationError("AGGREGATE_NULL", "Aggregate cannot be null"));

        try
        {
            await _dbSet.AddAsync(aggregate, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            // Clear events after successful persistence
            aggregate.ClearEvents();

            return Result.Ok();
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            return Result.Fail(new DomainError("AGGREGATE_EXISTS", "Aggregate with this ID already exists"));
        }
        catch (DbUpdateException ex)
        {
            return Result.Fail(new InfrastructureError("DATABASE_ERROR", ex.Message));
        }
        catch (Exception ex)
        {
            return Result.Fail(new InfrastructureError("UNKNOWN_ERROR", ex.Message));
        }
    }

    /// <inheritdoc />
    public async Task<Result> UpdateAsync(TAggregate aggregate, CancellationToken cancellationToken = default)
    {
        if (aggregate == null)
            return Result.Fail(new ValidationError("AGGREGATE_NULL", "Aggregate cannot be null"));

        try
        {
            _dbSet.Update(aggregate);
            await _context.SaveChangesAsync(cancellationToken);

            // Clear events after successful persistence
            aggregate.ClearEvents();
            aggregate.IncrementVersion();

            return Result.Ok();
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (DbUpdateConcurrencyException)
        {
            return Result.Fail(new ConcurrencyError("OPTIMISTIC_LOCK", "The aggregate was modified by another user"));
        }
        catch (DbUpdateException ex)
        {
            return Result.Fail(new InfrastructureError("DATABASE_ERROR", ex.Message));
        }
        catch (Exception ex)
        {
            return Result.Fail(new InfrastructureError("UNKNOWN_ERROR", ex.Message));
        }
    }

    /// <inheritdoc />
    public async Task<Result> DeleteAsync(TId id, CancellationToken cancellationToken = default)
    {
        if (id == null)
            return Result.Fail(new ValidationError("ID_NULL", "ID cannot be null"));

        try
        {
            var aggregate = await _dbSet.FindAsync(new object[] { id }, cancellationToken);
            if (aggregate == null)
                return Result.Ok(); // Idempotent delete

            _dbSet.Remove(aggregate);
            await _context.SaveChangesAsync(cancellationToken);

            return Result.Ok();
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (DbUpdateException ex)
        {
            return Result.Fail(new InfrastructureError("DATABASE_ERROR", ex.Message));
        }
        catch (Exception ex)
        {
            return Result.Fail(new InfrastructureError("UNKNOWN_ERROR", ex.Message));
        }
    }

    /// <inheritdoc />
    public async Task<Result<bool>> ExistsAsync(TId id, CancellationToken cancellationToken = default)
    {
        if (id == null)
            return Result.Ok(false);

        try
        {
            var exists = await _dbSet.AnyAsync(e => e.Id.Equals(id), cancellationToken);
            return Result.Ok(exists);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            return Result.Fail<bool>(new InfrastructureError("DATABASE_ERROR", ex.Message));
        }
    }

    /// <summary>
    /// Determines if the exception represents a unique constraint violation.
    /// </summary>
    /// <param name="ex">The database update exception.</param>
    /// <returns>True if it's a unique constraint violation, false otherwise.</returns>
    private static bool IsUniqueConstraintViolation(DbUpdateException ex)
    {
        // This is a simplified check. In production, you'd check the specific
        // database provider error codes for unique constraint violations.
        return ex.InnerException?.Message?.Contains("UNIQUE") == true ||
               ex.InnerException?.Message?.Contains("duplicate") == true;
    }
}