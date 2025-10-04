package com.architecture.shell.cqrs;

/**
 * Base handler interface for processing requests.
 * All command and query handlers extend this interface.
 *
 * Requirements:
 * - FR-003: Each request type maps to exactly ONE handler (enforced at DI registration)
 * - FR-005: Handlers MUST support cancellation/timeout semantics
 * - BR-007: Handlers use Result<T> for business errors, throw exceptions for infrastructure errors
 *
 * Handler Lifecycle:
 * 1. Mediator resolves handler for request type
 * 2. Pipeline behaviors wrap handler execution
 * 3. Handler processes request
 * 4. Result returned or exception propagated
 *
 * Error Handling:
 * - Business errors (validation failures, domain rules): Return Result.failure()
 * - Infrastructure errors (DB down, network timeout): Throw exception
 *
 * DDD Layer: Application Layer
 *
 * @param <TRequest>  The request type
 * @param <TResponse> The response type
 * @see CommandHandler
 * @see QueryHandler
 */
@FunctionalInterface
public interface RequestHandler<TRequest extends BaseRequest, TResponse> {

    /**
     * Handles the request and returns a response.
     *
     * @param request The request to process
     * @return The response (may be Result<T> for business error handling)
     * @throws RuntimeException for infrastructure errors (DB connectivity, network failures)
     */
    TResponse handle(TRequest request);
}
