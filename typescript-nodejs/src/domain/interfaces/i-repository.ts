import { Maybe } from '../../functional/maybe';
import { Result, ResultOf } from '../../functional/result';
import { IAggregateRoot } from './i-aggregate-root';

/**
 * Interface for repositories that provide aggregate persistence.
 * Repositories encapsulate the logic needed to access data sources and provide
 * a more object-oriented view of the persistence layer.
 *
 * @template TAggregate The type of aggregate this repository manages
 * @template TId The type of the aggregate's identifier
 */
export interface IRepository<
  TAggregate extends IAggregateRoot<TId>,
  TId extends object
> {
  /**
   * Retrieves an aggregate by its identifier.
   * @param id The identifier of the aggregate to retrieve
   * @param cancellationToken Optional cancellation token for async operations
   * @returns Maybe containing the aggregate if found, or None if not found
   */
  getByIdAsync(id: TId, cancellationToken?: AbortSignal): Promise<Maybe<TAggregate>>;

  /**
   * Adds a new aggregate to the repository.
   * @param aggregate The aggregate to add
   * @param cancellationToken Optional cancellation token for async operations
   * @returns Result indicating success or failure
   */
  addAsync(aggregate: TAggregate, cancellationToken?: AbortSignal): Promise<Result>;

  /**
   * Updates an existing aggregate in the repository.
   * @param aggregate The aggregate to update
   * @param cancellationToken Optional cancellation token for async operations
   * @returns Result indicating success or failure
   */
  updateAsync(aggregate: TAggregate, cancellationToken?: AbortSignal): Promise<Result>;

  /**
   * Removes an aggregate from the repository.
   * @param id The identifier of the aggregate to remove
   * @param cancellationToken Optional cancellation token for async operations
   * @returns Result indicating success or failure
   */
  deleteAsync(id: TId, cancellationToken?: AbortSignal): Promise<Result>;

  /**
   * Checks if an aggregate with the specified identifier exists.
   * @param id The identifier to check
   * @param cancellationToken Optional cancellation token for async operations
   * @returns Result containing true if the aggregate exists, false otherwise
   */
  existsAsync(id: TId, cancellationToken?: AbortSignal): Promise<ResultOf<boolean>>;
}