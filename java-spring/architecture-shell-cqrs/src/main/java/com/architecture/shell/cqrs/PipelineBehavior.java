package com.architecture.shell.cqrs;

/**
 * Interface for pipeline behaviors that wrap handler execution.
 * Behaviors implement cross-cutting concerns like validation, authorization, transactions, telemetry, caching.
 *
 * Requirements:
 * - FR-004: Pipeline behaviors execute in configured order
 * - FR-007: Behaviors apply selectively via BehaviorMatcher type guards
 * - BR-004: Recommended order: Validation → Authorization → Transaction → Telemetry → Resilience
 *
 * Execution Pattern:
 * 1. Behavior pre-processing (validation, transaction begin, start timer)
 * 2. Call next() to continue pipeline
 * 3. Behavior post-processing (transaction commit, log duration)
 *
 * Behavior Order:
 * - Configured via BehaviorRegistry.register(behavior, order)
 * - Lower order numbers execute first (outer decorators)
 * - Non-recommended orders log warning per BR-004
 *
 * Example:
 * <pre>
 * public class ValidationBehavior<TRequest, TResponse> implements PipelineBehavior<TRequest, TResponse> {
 *     private final IValidator<TRequest> validator;
 *
 *     public TResponse handle(TRequest request, RequestHandlerDelegate<TResponse> next) {
 *         var validationResult = validator.validate(request);
 *         if (validationResult.isFailure()) {
 *             throw new ValidationException(validationResult.errors());
 *         }
 *         return next.handle();
 *     }
 * }
 * </pre>
 *
 * Short-Circuiting:
 * - Behaviors may throw exceptions to abort pipeline
 * - Behaviors may return early without calling next() (e.g., cache hit)
 *
 * DDD Layer: Application Layer Infrastructure
 *
 * @param <TRequest>  The request type
 * @param <TResponse> The response type
 * @see BehaviorMatcher
 * @see UnitOfWorkBehavior
 * @see ValidationBehavior
 */
@FunctionalInterface
public interface PipelineBehavior<TRequest extends BaseRequest, TResponse> {

    /**
     * Handles the request by executing behavior logic and optionally calling the next delegate.
     *
     * @param request The request being processed
     * @param next    The delegate for the next behavior or handler in the pipeline
     * @return The response from this behavior or downstream pipeline
     * @throws RuntimeException to abort pipeline execution
     */
    TResponse handle(TRequest request, RequestHandlerDelegate<TResponse> next);
}
