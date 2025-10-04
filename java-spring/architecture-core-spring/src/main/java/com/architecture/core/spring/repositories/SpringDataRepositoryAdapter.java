package com.architecture.core.spring.repositories;

import com.architecture.core.domain.AggregateRoot;
import com.architecture.core.domain.EntityId;
import com.architecture.core.domain.Repository;
import com.architecture.core.functional.Error;
import com.architecture.core.functional.Maybe;
import com.architecture.core.functional.Result;
import com.architecture.core.functional.ResultException;
import com.architecture.core.infrastructure.CancellationToken;
import com.architecture.core.infrastructure.OperationCancelledException;

import org.springframework.dao.DataAccessException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.scheduling.annotation.Async;

import jakarta.persistence.EntityNotFoundException;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.function.Function;
import java.util.function.Supplier;

/**
 * Generic adapter that bridges Architecture.Core Repository interface with Spring Data JPA repositories.
 * Provides async operations, error handling, and cancellation support for domain aggregates.
 *
 * @param <TAggregate> The aggregate root type
 * @param <TId> The entity identifier type
 * @param <TEntity> The JPA entity type
 * @param <TKey> The JPA entity key type
 */
public abstract class SpringDataRepositoryAdapter<
    TAggregate extends AggregateRoot<TId>,
    TId extends EntityId<TId>,
    TEntity,
    TKey
> implements Repository<TAggregate, TId> {

    private final JpaRepository<TEntity, TKey> jpaRepository;
    private final Executor asyncExecutor;
    private final Function<TAggregate, TEntity> aggregateToEntity;
    private final Function<TEntity, TAggregate> entityToAggregate;
    private final Function<TId, TKey> idToKey;

    /**
     * Creates a new Spring Data repository adapter.
     *
     * @param jpaRepository Spring Data JPA repository
     * @param asyncExecutor Executor for async operations
     * @param aggregateToEntity Function to convert aggregate to JPA entity
     * @param entityToAggregate Function to convert JPA entity to aggregate
     * @param idToKey Function to convert domain ID to JPA key
     */
    protected SpringDataRepositoryAdapter(
        JpaRepository<TEntity, TKey> jpaRepository,
        Executor asyncExecutor,
        Function<TAggregate, TEntity> aggregateToEntity,
        Function<TEntity, TAggregate> entityToAggregate,
        Function<TId, TKey> idToKey
    ) {
        this.jpaRepository = Objects.requireNonNull(jpaRepository, "JPA repository cannot be null");
        this.asyncExecutor = Objects.requireNonNull(asyncExecutor, "Async executor cannot be null");
        this.aggregateToEntity = Objects.requireNonNull(aggregateToEntity, "Aggregate to entity mapper cannot be null");
        this.entityToAggregate = Objects.requireNonNull(entityToAggregate, "Entity to aggregate mapper cannot be null");
        this.idToKey = Objects.requireNonNull(idToKey, "ID to key mapper cannot be null");
    }

    @Override
    @Async
    public CompletableFuture<Maybe<TAggregate>> getByIdAsync(TId id, CancellationToken cancellationToken) {
        Objects.requireNonNull(id, "ID cannot be null");
        Objects.requireNonNull(cancellationToken, "Cancellation token cannot be null");

        return CompletableFuture.supplyAsync(() -> {
            try {
                cancellationToken.throwIfCancellationRequested();

                TKey key = idToKey.apply(id);
                Optional<TEntity> entity = jpaRepository.findById(key);

                cancellationToken.throwIfCancellationRequested();

                return entity.map(entityToAggregate)
                           .map(Maybe::some)
                           .orElse(Maybe.none());

            } catch (OperationCancelledException e) {
                return Maybe.none(); // Cancelled operations return empty results
            } catch (DataAccessException e) {
                throw new ResultException(
                    createInfrastructureError("Repository.GetById.Failed",
                        "Failed to retrieve aggregate by ID", e)
                );
            } catch (Exception e) {
                throw new ResultException(
                    createInfrastructureError("Repository.GetById.UnexpectedError",
                        "Unexpected error during aggregate retrieval", e)
                );
            }
        }, asyncExecutor);
    }

    @Override
    @Async
    public CompletableFuture<Result<Void>> addAsync(TAggregate aggregate, CancellationToken cancellationToken) {
        Objects.requireNonNull(aggregate, "Aggregate cannot be null");
        Objects.requireNonNull(cancellationToken, "Cancellation token cannot be null");

        return CompletableFuture.supplyAsync(() -> {
            try {
                cancellationToken.throwIfCancellationRequested();

                TEntity entity = aggregateToEntity.apply(aggregate);
                jpaRepository.save(entity);

                cancellationToken.throwIfCancellationRequested();

                return Result.success(null);

            } catch (OperationCancelledException e) {
                return Result.failure(createInfrastructureError("Repository.Add.Cancelled",
                    "Add operation was cancelled", e));
            } catch (DataAccessException e) {
                return Result.failure(createInfrastructureError("Repository.Add.Failed",
                    "Failed to add aggregate", e));
            } catch (Exception e) {
                return Result.failure(createInfrastructureError("Repository.Add.UnexpectedError",
                    "Unexpected error during aggregate addition", e));
            }
        }, asyncExecutor);
    }

    @Override
    @Async
    public CompletableFuture<Result<Void>> updateAsync(TAggregate aggregate, CancellationToken cancellationToken) {
        Objects.requireNonNull(aggregate, "Aggregate cannot be null");
        Objects.requireNonNull(cancellationToken, "Cancellation token cannot be null");

        return CompletableFuture.supplyAsync(() -> {
            try {
                cancellationToken.throwIfCancellationRequested();

                // Check if aggregate exists
                TKey key = idToKey.apply(aggregate.getId());
                if (!jpaRepository.existsById(key)) {
                    return Result.failure(createDomainError("Repository.Update.NotFound",
                        "Aggregate not found for update"));
                }

                cancellationToken.throwIfCancellationRequested();

                TEntity entity = aggregateToEntity.apply(aggregate);
                jpaRepository.save(entity);

                return Result.success(null);

            } catch (OperationCancelledException e) {
                return Result.failure(createInfrastructureError("Repository.Update.Cancelled",
                    "Update operation was cancelled", e));
            } catch (OptimisticLockingFailureException e) {
                return Result.failure(createConcurrencyError("Repository.Update.VersionConflict",
                    "Aggregate has been modified by another user"));
            } catch (DataAccessException e) {
                return Result.failure(createInfrastructureError("Repository.Update.Failed",
                    "Failed to update aggregate", e));
            } catch (Exception e) {
                return Result.failure(createInfrastructureError("Repository.Update.UnexpectedError",
                    "Unexpected error during aggregate update", e));
            }
        }, asyncExecutor);
    }

    @Override
    @Async
    public CompletableFuture<Result<Void>> deleteAsync(TId id, CancellationToken cancellationToken) {
        Objects.requireNonNull(id, "ID cannot be null");
        Objects.requireNonNull(cancellationToken, "Cancellation token cannot be null");

        return CompletableFuture.supplyAsync(() -> {
            try {
                cancellationToken.throwIfCancellationRequested();

                TKey key = idToKey.apply(id);
                if (!jpaRepository.existsById(key)) {
                    return Result.failure(createDomainError("Repository.Delete.NotFound",
                        "Aggregate not found for deletion"));
                }

                cancellationToken.throwIfCancellationRequested();

                jpaRepository.deleteById(key);

                return Result.success(null);

            } catch (OperationCancelledException e) {
                return Result.failure(createInfrastructureError("Repository.Delete.Cancelled",
                    "Delete operation was cancelled", e));
            } catch (DataAccessException e) {
                return Result.failure(createInfrastructureError("Repository.Delete.Failed",
                    "Failed to delete aggregate", e));
            } catch (Exception e) {
                return Result.failure(createInfrastructureError("Repository.Delete.UnexpectedError",
                    "Unexpected error during aggregate deletion", e));
            }
        }, asyncExecutor);
    }

    @Override
    @Async
    public CompletableFuture<Result<Boolean>> existsAsync(TId id, CancellationToken cancellationToken) {
        Objects.requireNonNull(id, "ID cannot be null");
        Objects.requireNonNull(cancellationToken, "Cancellation token cannot be null");

        return CompletableFuture.supplyAsync(() -> {
            try {
                cancellationToken.throwIfCancellationRequested();

                TKey key = idToKey.apply(id);
                boolean exists = jpaRepository.existsById(key);

                cancellationToken.throwIfCancellationRequested();

                return Result.success(exists);

            } catch (OperationCancelledException e) {
                return Result.success(false); // Cancelled operations return false
            } catch (DataAccessException e) {
                throw new ResultException(
                    createInfrastructureError("Repository.Exists.Failed",
                        "Failed to check aggregate existence", e)
                );
            } catch (Exception e) {
                throw new ResultException(
                    createInfrastructureError("Repository.Exists.UnexpectedError",
                        "Unexpected error during existence check", e)
                );
            }
        }, asyncExecutor);
    }

    /**
     * Performs a safe operation with exception handling and cancellation support.
     *
     * @param operation The operation to perform
     * @param cancellationToken Cancellation token
     * @param operationName Name of the operation for error reporting
     * @return Result of the operation
     */
    protected <T> Result<T> performSafeOperation(
        Supplier<T> operation,
        CancellationToken cancellationToken,
        String operationName
    ) {
        try {
            cancellationToken.throwIfCancellationRequested();
            T result = operation.get();
            cancellationToken.throwIfCancellationRequested();
            return Result.success(result);
        } catch (OperationCancelledException e) {
            return Result.failure(createInfrastructureError(
                "Repository." + operationName + ".Cancelled",
                operationName + " operation was cancelled", e));
        } catch (OptimisticLockingFailureException e) {
            return Result.failure(createConcurrencyError(
                "Repository." + operationName + ".VersionConflict",
                "Version conflict during " + operationName.toLowerCase()));
        } catch (EntityNotFoundException e) {
            return Result.failure(createDomainError(
                "Repository." + operationName + ".NotFound",
                "Entity not found during " + operationName.toLowerCase()));
        } catch (DataAccessException e) {
            return Result.failure(createInfrastructureError(
                "Repository." + operationName + ".Failed",
                operationName + " operation failed", e));
        } catch (Exception e) {
            return Result.failure(createInfrastructureError(
                "Repository." + operationName + ".UnexpectedError",
                "Unexpected error during " + operationName.toLowerCase(), e));
        }
    }

    /**
     * Creates a domain error with the specified code and message.
     */
    private Error createDomainError(String code, String message) {
        return Error.domain(code, message);
    }

    /**
     * Creates an infrastructure error with the specified code, message, and cause.
     */
    private Error createInfrastructureError(String code, String message, Throwable cause) {
        return Error.infrastructure(code, message, cause);
    }

    /**
     * Creates a concurrency error with the specified code and message.
     */
    private Error createConcurrencyError(String code, String message) {
        return Error.concurrency(code, message);
    }

    /**
     * Creates a validation error with the specified code, message, and metadata.
     */
    protected Error createValidationError(String code, String message, Map<String, Object> metadata) {
        return Error.validation(code, message, metadata);
    }

    /**
     * Gets the underlying JPA repository for advanced operations.
     */
    protected JpaRepository<TEntity, TKey> getJpaRepository() {
        return jpaRepository;
    }

    /**
     * Gets the async executor used for async operations.
     */
    protected Executor getAsyncExecutor() {
        return asyncExecutor;
    }
}