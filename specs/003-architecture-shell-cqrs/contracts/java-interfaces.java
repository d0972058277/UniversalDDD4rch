// Architecture.Shell.Cqrs - Java Interface Contracts
// Language: Java 21 LTS
// Purpose: Core CQRS abstractions for mediator pattern implementation
// Dependencies: JSR-330 (javax.inject), SLF4J

package com.architecture.shell.cqrs;

import java.util.concurrent.CompletableFuture;
import javax.inject.Inject;

/**
 * Common ancestor for all application-layer requests.
 * Enables uniform pipeline processing for commands, queries, and future request types.
 */
public interface BaseRequest {
}

/**
 * Requests that return a value.
 * Used by queries and commands with return values.
 * @param <TResult> The return type
 */
public interface BaseRequest<TResult> extends BaseRequest {
}

/**
 * Marker interface for state-changing operations with no return value.
 * Executes within transaction boundary.
 */
public interface Command extends BaseRequest {
}

/**
 * Marker interface for state-changing operations with return value.
 * Executes within transaction boundary.
 * @param <TResult> The return type (typically Result&lt;TValue&gt;)
 */
public interface Command<TResult> extends BaseRequest<TResult> {
}

/**
 * Marker interface for read-only operations with return value.
 * Executes WITHOUT transaction; may use caching.
 * @param <TResult> The return type (DTO/projection)
 */
public interface Query<TResult> extends BaseRequest<TResult> {
}

/**
 * Base handler interface for processing requests.
 * Business errors return Result.failure(); infrastructure errors throw exceptions.
 * @param <TRequest> The request type
 * @param <TResponse> The response type
 */
public interface RequestHandler<TRequest extends BaseRequest, TResponse> {
    /**
     * Handles the request.
     * @param request The request to handle
     * @param context Context with cancellation support
     * @return CompletableFuture with response
     */
    CompletableFuture<TResponse> handle(TRequest request, Context context);
}

/**
 * Handler for commands with no return value.
 * @param <TCommand> The command type
 */
public interface CommandHandler<TCommand extends Command>
    extends RequestHandler<TCommand, Void> {
}

/**
 * Handler for commands with return value.
 * @param <TCommand> The command type
 * @param <TResult> The return type
 */
public interface CommandHandler<TCommand extends Command<TResult>, TResult>
    extends RequestHandler<TCommand, TResult> {
}

/**
 * Handler for read-only queries.
 * @param <TQuery> The query type
 * @param <TResult> The return type
 */
public interface QueryHandler<TQuery extends Query<TResult>, TResult>
    extends RequestHandler<TQuery, TResult> {
}

/**
 * Single entry point for sending commands and queries.
 * Routes requests to registered handlers via pipeline behaviors.
 */
public interface Mediator {
    /**
     * Sends a request with return value through the pipeline.
     * @param request The request to send
     * @param context Context with cancellation support
     * @return CompletableFuture with response
     */
    <TResponse> CompletableFuture<TResponse> send(
        BaseRequest<TResponse> request,
        Context context
    );

    /**
     * Sends a request with no return value through the pipeline.
     * @param request The request to send
     * @param context Context with cancellation support
     * @return CompletableFuture that completes when done
     */
    CompletableFuture<Void> send(BaseRequest request, Context context);
}

/**
 * Functional interface representing the next step in the pipeline.
 * @param <TResponse> The response type
 */
@FunctionalInterface
public interface RequestHandlerDelegate<TResponse> {
    CompletableFuture<TResponse> handle();
}

/**
 * Pipeline behavior for cross-cutting concerns.
 * Wraps handler execution with pre/post logic.
 * @param <TRequest> The request type
 * @param <TResponse> The response type
 */
public interface PipelineBehavior<TRequest extends BaseRequest, TResponse> {
    /**
     * Handles the request by executing cross-cutting logic before/after calling next.
     * @param request The request
     * @param next The next behavior or handler
     * @param context Context with cancellation support
     * @return CompletableFuture with response
     */
    CompletableFuture<TResponse> handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        Context context
    );

    /**
     * Execution order (lower values execute first).
     * Default: 100. Recommended: Validation=10, Authorization=20, Transaction=30, Telemetry=40, Resilience=50
     */
    default int getOrder() {
        return 100;
    }
}

/**
 * Transaction boundary abstraction for commands.
 */
public interface UnitOfWork {
    /**
     * Unique identifier for the current transaction.
     */
    String getTransactionId();

    /**
     * Indicates whether a transaction is currently active.
     */
    boolean hasActiveTransaction();

    /**
     * Begins a new transaction.
     * Throws if transaction provider unavailable (fail fast).
     * @param context Context with cancellation support
     */
    CompletableFuture<Void> beginTransaction(Context context);

    /**
     * Commits the current transaction.
     * Called on successful handler completion (including Result.failure business errors).
     * @param context Context with cancellation support
     */
    CompletableFuture<Void> commit(Context context);

    /**
     * Rolls back the current transaction.
     * Called on exception (infrastructure errors).
     * @param context Context with cancellation support
     */
    CompletableFuture<Void> rollback(Context context);
}

/**
 * Configuration interface for determining which behaviors apply to which request types.
 */
public interface BehaviorMatcher {
    /**
     * Determines if this behavior should execute for the given request type.
     * @param request The request instance
     * @return true if behavior should execute
     */
    <TRequest extends BaseRequest> boolean matches(TRequest request);
}

/**
 * Context for request execution with cancellation support.
 */
public interface Context {
    /**
     * Checks if cancellation has been requested.
     */
    boolean isCancelled();

    /**
     * Throws OperationCancelledException if cancellation requested.
     */
    void throwIfCancellationRequested();
}

/**
 * Predefined matcher for commands only.
 */
public class CommandOnlyMatcher implements BehaviorMatcher {
    @Override
    public <TRequest extends BaseRequest> boolean matches(TRequest request) {
        return request instanceof Command;
    }
}

/**
 * Predefined matcher for queries only.
 */
public class QueryOnlyMatcher implements BehaviorMatcher {
    @Override
    public <TRequest extends BaseRequest> boolean matches(TRequest request) {
        return request instanceof Query;
    }
}

/**
 * Predefined matcher for all requests.
 */
public class AllRequestsMatcher implements BehaviorMatcher {
    @Override
    public <TRequest extends BaseRequest> boolean matches(TRequest request) {
        return true;
    }
}