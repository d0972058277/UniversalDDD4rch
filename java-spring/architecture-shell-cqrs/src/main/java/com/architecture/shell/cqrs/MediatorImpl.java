package com.architecture.shell.cqrs;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

/**
 * Default implementation of the Mediator pattern for CQRS.
 * Routes requests to handlers through a configurable pipeline of behaviors.
 *
 * Requirements:
 * - FR-001: Routes all commands/queries to appropriate handlers
 * - FR-003: Exactly one handler per request type (validated at construction)
 * - FR-004: Executes pipeline behaviors in configured order
 * - FR-008: Throws at construction if zero or multiple handlers registered
 *
 * Construction Validation (per FR-008 and spec.md:L64-67):
 * - Validates handler uniqueness at construction time (not runtime)
 * - Validates behavior order and logs warnings for non-recommended sequences (BR-004)
 *
 * Pipeline Execution:
 * 1. Resolve handler for request type
 * 2. Resolve applicable behaviors via BehaviorMatcher
 * 3. Build pipeline: behaviors wrap handler
 * 4. Execute pipeline and return result
 *
 * DDD Layer: Application Layer Infrastructure
 */
public class MediatorImpl implements Mediator {

    private static final Logger logger = LoggerFactory.getLogger(MediatorImpl.class);

    private final HandlerRegistry handlerRegistry;
    private final BehaviorRegistry behaviorRegistry;

    /**
     * Constructs a mediator with handler and behavior registries.
     * Performs constructor-time validation per FR-008.
     *
     * @param handlerRegistry Registry of request handlers
     * @param behaviorRegistry Registry of pipeline behaviors
     * @throws IllegalStateException if zero or multiple handlers for any request type
     */
    public MediatorImpl(HandlerRegistry handlerRegistry, BehaviorRegistry behaviorRegistry) {
        this.handlerRegistry = handlerRegistry;
        this.behaviorRegistry = behaviorRegistry;

        // FR-008: Validate handler uniqueness at construction time
        handlerRegistry.validate();

        // BR-004: Validate behavior order and log warnings
        behaviorRegistry.validateOrder();

        logger.info("Mediator initialized with handler and behavior registries");
    }

    /**
     * Constructs a mediator with only handler registry (no behaviors).
     *
     * @param handlerRegistry Registry of request handlers
     * @throws IllegalStateException if zero or multiple handlers for any request type
     */
    public MediatorImpl(HandlerRegistry handlerRegistry) {
        this(handlerRegistry, new BehaviorRegistry());
    }

    /**
     * Sends a request through the pipeline.
     *
     * @param request The command or query to process
     * @param <TResponse> The response type
     * @return The response from the handler
     * @throws IllegalArgumentException if no handler registered
     * @throws RuntimeException if handler or behavior throws
     */
    @Override
    @SuppressWarnings("unchecked")
    public <TResponse> TResponse send(BaseRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request cannot be null");
        }

        logger.debug("Processing request: {}", request.getClass().getSimpleName());

        // Resolve handler (throws if zero or multiple registered)
        RequestHandler<BaseRequest, TResponse> handler =
            (RequestHandler<BaseRequest, TResponse>) handlerRegistry.getHandler(request.getClass());

        // Resolve applicable behaviors
        List<PipelineBehavior<BaseRequest, TResponse>> behaviors =
            behaviorRegistry.getBehaviors(request);

        // Build pipeline
        RequestHandlerDelegate<TResponse> pipeline = () -> handler.handle(request);

        // Wrap handler with behaviors in reverse order (last registered = outermost)
        for (int i = behaviors.size() - 1; i >= 0; i--) {
            final PipelineBehavior<BaseRequest, TResponse> behavior = behaviors.get(i);
            final RequestHandlerDelegate<TResponse> next = pipeline;
            pipeline = () -> behavior.handle(request, next);
        }

        // Execute pipeline
        return pipeline.handle();
    }
}
