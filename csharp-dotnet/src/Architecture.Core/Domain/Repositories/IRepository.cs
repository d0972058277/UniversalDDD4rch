using System.Threading;
using System.Threading.Tasks;
using Architecture.Core.Domain.Aggregates;
using Architecture.Core.Functional;

namespace Architecture.Core.Domain.Repositories;

/// <summary>
/// Defines the contract for repositories that provide data access operations for aggregate roots.
/// Repositories encapsulate the logic needed to access data sources and maintain the separation
/// between the domain and data mapping layers.
/// </summary>
/// <typeparam name="TAggregate">The type of aggregate root managed by this repository.</typeparam>
/// <typeparam name="TId">The type of the aggregate's identifier, constrained to reference types.</typeparam>
public interface IRepository<TAggregate, TId>
    where TAggregate : class, IAggregateRoot<TId>
    where TId : class
{
    /// <summary>
    /// Retrieves an aggregate by its identifier.
    /// Returns None if no aggregate with the specified identifier exists.
    /// </summary>
    /// <param name="id">The identifier of the aggregate to retrieve.</param>
    /// <param name="cancellationToken">A token to cancel the operation if needed.</param>
    /// <returns>A Maybe containing the aggregate if found, or None if not found.</returns>
    Task<Maybe<TAggregate>> GetByIdAsync(TId id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Adds a new aggregate to the repository.
    /// The aggregate should not already exist in the repository.
    /// </summary>
    /// <param name="aggregate">The aggregate to add.</param>
    /// <param name="cancellationToken">A token to cancel the operation if needed.</param>
    /// <returns>A Result indicating success or failure of the operation.</returns>
    Task<Result> AddAsync(TAggregate aggregate, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates an existing aggregate in the repository.
    /// The aggregate should already exist in the repository and version conflicts should be handled.
    /// </summary>
    /// <param name="aggregate">The aggregate to update.</param>
    /// <param name="cancellationToken">A token to cancel the operation if needed.</param>
    /// <returns>A Result indicating success or failure of the operation.</returns>
    Task<Result> UpdateAsync(TAggregate aggregate, CancellationToken cancellationToken = default);

    /// <summary>
    /// Removes an aggregate from the repository by its identifier.
    /// </summary>
    /// <param name="id">The identifier of the aggregate to remove.</param>
    /// <param name="cancellationToken">A token to cancel the operation if needed.</param>
    /// <returns>A Result indicating success or failure of the operation.</returns>
    Task<Result> DeleteAsync(TId id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks whether an aggregate with the specified identifier exists in the repository.
    /// </summary>
    /// <param name="id">The identifier to check for existence.</param>
    /// <param name="cancellationToken">A token to cancel the operation if needed.</param>
    /// <returns>A Result containing a boolean indicating whether the aggregate exists.</returns>
    Task<Result<bool>> ExistsAsync(TId id, CancellationToken cancellationToken = default);
}