package com.architecture.shell.cqrs;

/**
 * Delegate representing the next step in the pipeline execution chain.
 * Pipeline behaviors call this delegate to continue pipeline execution.
 *
 * Requirements:
 * - FR-004: Pipeline behaviors wrap handler execution
 * - Enables decorator pattern for cross-cutting concerns
 *
 * Usage in behaviors:
 * <pre>
 * public class ValidationBehavior implements PipelineBehavior {
 *     public TResponse handle(TRequest request, RequestHandlerDelegate<TResponse> next) {
 *         // Pre-handler logic
 *         validate(request);
 *
 *         // Continue pipeline
 *         var response = next.handle();
 *
 *         // Post-handler logic (if needed)
 *         return response;
 *     }
 * }
 * </pre>
 *
 * DDD Layer: Application Layer Infrastructure
 *
 * @param <TResponse> The response type
 */
@FunctionalInterface
public interface RequestHandlerDelegate<TResponse> {

    /**
     * Invokes the next behavior in the pipeline or the final handler.
     *
     * @return The response from the next pipeline step
     * @throws RuntimeException if next behavior or handler throws
     */
    TResponse handle();
}
