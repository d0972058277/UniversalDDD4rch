import { Maybe } from '../functional/maybe';
import { Result, ResultOf } from '../functional/result';
import { Error } from '../functional/error';
import { IAggregateRoot } from '../domain/interfaces/i-aggregate-root';
import { IRepository } from '../domain/interfaces/i-repository';

/**
 * Abstract base class for repositories providing common functionality.
 * Implements basic repository patterns and provides hooks for derived classes.
 *
 * @template TAggregate The type of aggregate this repository manages
 * @template TId The type of the aggregate's identifier
 */
export abstract class RepositoryBase<
  TAggregate extends IAggregateRoot<TId>,
  TId extends object
> implements IRepository<TAggregate, TId> {

  /**
   * Retrieves an aggregate by its identifier.
   * @param id The identifier of the aggregate to retrieve
   * @param cancellationToken Optional cancellation token for async operations
   * @returns Maybe containing the aggregate if found, or None if not found
   */
  public async getByIdAsync(id: TId, cancellationToken?: AbortSignal): Promise<Maybe<TAggregate>> {
    try {
      this.checkCancellation(cancellationToken);
      this.validateId(id);

      const aggregate = await this.doGetByIdAsync(id, cancellationToken);
      return aggregate;
    } catch (error) {
      if (this.isCancellationError(error)) {
        throw error; // Re-throw cancellation errors
      }
      return Maybe.none<TAggregate>();
    }
  }

  /**
   * Adds a new aggregate to the repository.
   * @param aggregate The aggregate to add
   * @param cancellationToken Optional cancellation token for async operations
   * @returns Result indicating success or failure
   */
  public async addAsync(aggregate: TAggregate, cancellationToken?: AbortSignal): Promise<Result> {
    try {
      this.checkCancellation(cancellationToken);
      this.validateAggregate(aggregate);

      const result = await this.doAddAsync(aggregate, cancellationToken);
      if (result.isSuccess) {
        this.handleSuccessfulAdd(aggregate);
      }
      return result;
    } catch (error) {
      if (this.isCancellationError(error)) {
        throw error;
      }
      return this.handleError('ADD_FAILED', 'Failed to add aggregate', error);
    }
  }

  /**
   * Updates an existing aggregate in the repository.
   * @param aggregate The aggregate to update
   * @param cancellationToken Optional cancellation token for async operations
   * @returns Result indicating success or failure
   */
  public async updateAsync(aggregate: TAggregate, cancellationToken?: AbortSignal): Promise<Result> {
    try {
      this.checkCancellation(cancellationToken);
      this.validateAggregate(aggregate);

      const result = await this.doUpdateAsync(aggregate, cancellationToken);
      if (result.isSuccess) {
        this.handleSuccessfulUpdate(aggregate);
      }
      return result;
    } catch (error) {
      if (this.isCancellationError(error)) {
        throw error;
      }
      return this.handleError('UPDATE_FAILED', 'Failed to update aggregate', error);
    }
  }

  /**
   * Removes an aggregate from the repository.
   * @param id The identifier of the aggregate to remove
   * @param cancellationToken Optional cancellation token for async operations
   * @returns Result indicating success or failure
   */
  public async deleteAsync(id: TId, cancellationToken?: AbortSignal): Promise<Result> {
    try {
      this.checkCancellation(cancellationToken);
      this.validateId(id);

      const result = await this.doDeleteAsync(id, cancellationToken);
      if (result.isSuccess) {
        this.handleSuccessfulDelete(id);
      }
      return result;
    } catch (error) {
      if (this.isCancellationError(error)) {
        throw error;
      }
      return this.handleError('DELETE_FAILED', 'Failed to delete aggregate', error);
    }
  }

  /**
   * Checks if an aggregate with the specified identifier exists.
   * @param id The identifier to check
   * @param cancellationToken Optional cancellation token for async operations
   * @returns Result containing true if the aggregate exists, false otherwise
   */
  public async existsAsync(id: TId, cancellationToken?: AbortSignal): Promise<ResultOf<boolean>> {
    try {
      this.checkCancellation(cancellationToken);
      this.validateId(id);

      return await this.doExistsAsync(id, cancellationToken);
    } catch (error) {
      if (this.isCancellationError(error)) {
        throw error;
      }
      return new ResultOf<boolean>(false, undefined, this.handleError('EXISTS_FAILED', 'Failed to check existence', error).error);
    }
  }

  // Abstract methods to be implemented by derived classes

  /**
   * Performs the actual retrieval of an aggregate by ID.
   * @param id The identifier of the aggregate to retrieve
   * @param cancellationToken Optional cancellation token
   * @returns Maybe containing the aggregate if found
   */
  protected abstract doGetByIdAsync(id: TId, cancellationToken?: AbortSignal): Promise<Maybe<TAggregate>>;

  /**
   * Performs the actual addition of an aggregate.
   * @param aggregate The aggregate to add
   * @param cancellationToken Optional cancellation token
   * @returns Result indicating success or failure
   */
  protected abstract doAddAsync(aggregate: TAggregate, cancellationToken?: AbortSignal): Promise<Result>;

  /**
   * Performs the actual update of an aggregate.
   * @param aggregate The aggregate to update
   * @param cancellationToken Optional cancellation token
   * @returns Result indicating success or failure
   */
  protected abstract doUpdateAsync(aggregate: TAggregate, cancellationToken?: AbortSignal): Promise<Result>;

  /**
   * Performs the actual deletion of an aggregate.
   * @param id The identifier of the aggregate to delete
   * @param cancellationToken Optional cancellation token
   * @returns Result indicating success or failure
   */
  protected abstract doDeleteAsync(id: TId, cancellationToken?: AbortSignal): Promise<Result>;

  /**
   * Performs the actual existence check for an aggregate.
   * @param id The identifier to check
   * @param cancellationToken Optional cancellation token
   * @returns Result containing true if exists, false otherwise
   */
  protected abstract doExistsAsync(id: TId, cancellationToken?: AbortSignal): Promise<ResultOf<boolean>>;

  // Validation and utility methods

  /**
   * Validates an aggregate before persistence operations.
   * @param aggregate The aggregate to validate
   * @throws Error if the aggregate is invalid
   */
  protected validateAggregate(aggregate: TAggregate): void {
    if (aggregate === null || aggregate === undefined) {
      throw new globalThis.Error('Aggregate cannot be null or undefined');
    }

    if (aggregate.id === null || aggregate.id === undefined) {
      throw new globalThis.Error('Aggregate ID cannot be null or undefined');
    }
  }

  /**
   * Validates an ID before operations.
   * @param id The ID to validate
   * @throws Error if the ID is invalid
   */
  protected validateId(id: TId): void {
    if (id === null || id === undefined) {
      throw new globalThis.Error('ID cannot be null or undefined');
    }
  }

  /**
   * Checks if the operation has been cancelled.
   * @param cancellationToken The cancellation token to check
   * @throws Error if the operation has been cancelled
   */
  protected checkCancellation(cancellationToken?: AbortSignal): void {
    if (cancellationToken?.aborted) {
      throw new globalThis.Error('Operation was cancelled');
    }
  }

  /**
   * Determines if an error is a cancellation error.
   * @param error The error to check
   * @returns True if the error is due to cancellation
   */
  protected isCancellationError(error: unknown): boolean {
    return error instanceof globalThis.Error && error.message === 'Operation was cancelled';
  }

  /**
   * Handles errors and converts them to appropriate Result failures.
   * @param code Error code
   * @param message Error message
   * @param originalError The original error
   * @returns Result failure
   */
  protected handleError(code: string, message: string, originalError: unknown): Result {
    const errorMessage = originalError instanceof globalThis.Error
      ? `${message}: ${originalError.message}`
      : message;

    return Result.fail(Error.infrastructure(code, errorMessage, {
      originalError: originalError?.toString(),
      timestamp: new Date().toISOString()
    }));
  }

  // Event handling hooks

  /**
   * Called after a successful add operation.
   * Override in derived classes to implement post-add logic (e.g., event publishing).
   * @param aggregate The aggregate that was added
   */
  protected handleSuccessfulAdd(aggregate: TAggregate): void {
    // Default implementation does nothing
    // Derived classes can override to publish events, update caches, etc.
  }

  /**
   * Called after a successful update operation.
   * Override in derived classes to implement post-update logic.
   * @param aggregate The aggregate that was updated
   */
  protected handleSuccessfulUpdate(aggregate: TAggregate): void {
    // Default implementation does nothing
  }

  /**
   * Called after a successful delete operation.
   * Override in derived classes to implement post-delete logic.
   * @param id The ID of the aggregate that was deleted
   */
  protected handleSuccessfulDelete(id: TId): void {
    // Default implementation does nothing
  }
}