package com.architecture.core.domain;

import com.architecture.core.functional.Maybe;
import com.architecture.core.functional.Result;
import com.architecture.core.infrastructure.CancellationToken;

import java.util.concurrent.CompletableFuture;

/**
 * Generic repository interface for aggregate persistence with async operations.
 * Defines the contract for persisting and retrieving domain aggregates.
 * Follows the repository pattern with async operations and functional error handling.
 *
 * @param <TAggregate> The type of aggregate this repository manages
 * @param <TId> The type of the aggregate identifier
 */
public interface Repository<TAggregate extends AggregateRoot<TId>, TId extends EntityId<TId>> {

    /**
     * Retrieves an aggregate by its identifier asynchronously.
     *
     * @param id The aggregate identifier
     * @param cancellationToken Token for cancelling the operation
     * @return A CompletableFuture containing Maybe.some(aggregate) if found, Maybe.none() otherwise
     */
    CompletableFuture<Maybe<TAggregate>> getByIdAsync(TId id, CancellationToken cancellationToken);

    /**
     * Adds a new aggregate to the repository asynchronously.
     * The aggregate should not already exist in the repository.
     *
     * @param aggregate The aggregate to add
     * @param cancellationToken Token for cancelling the operation
     * @return A CompletableFuture containing Result.success() if successful, Result.failure() otherwise
     */
    CompletableFuture<Result<Void>> addAsync(TAggregate aggregate, CancellationToken cancellationToken);

    /**
     * Updates an existing aggregate in the repository asynchronously.
     * The aggregate should already exist in the repository.
     *
     * @param aggregate The aggregate to update
     * @param cancellationToken Token for cancelling the operation
     * @return A CompletableFuture containing Result.success() if successful, Result.failure() otherwise
     */
    CompletableFuture<Result<Void>> updateAsync(TAggregate aggregate, CancellationToken cancellationToken);

    /**
     * Deletes an aggregate from the repository asynchronously.
     *
     * @param id The identifier of the aggregate to delete
     * @param cancellationToken Token for cancelling the operation
     * @return A CompletableFuture containing Result.success() if successful, Result.failure() otherwise
     */
    CompletableFuture<Result<Void>> deleteAsync(TId id, CancellationToken cancellationToken);

    /**
     * Checks if an aggregate with the specified identifier exists asynchronously.
     *
     * @param id The aggregate identifier to check
     * @param cancellationToken Token for cancelling the operation
     * @return A CompletableFuture containing Result<Boolean> with true if the aggregate exists, false otherwise
     */
    CompletableFuture<Result<Boolean>> existsAsync(TId id, CancellationToken cancellationToken);
}