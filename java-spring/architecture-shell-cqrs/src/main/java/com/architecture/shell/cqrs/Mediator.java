package com.architecture.shell.cqrs;

/**
 * Central mediator for routing commands and queries to their handlers.
 * Single entry point for all application-layer request processing.
 *
 * Requirements:
 * - FR-001: Mediator routes all requests (commands, queries) to appropriate handlers
 * - FR-003: Exactly one handler per request type (enforced at construction/DI registration)
 * - FR-004: Pipeline behaviors wrap handler execution in configured order
 * - FR-008: Zero or multiple handlers registered → fail at startup (constructor validation)
 *
 * Execution Flow:
 * 1. Resolve handler for request type (fail if zero or multiple handlers)
 * 2. Resolve applicable behaviors via BehaviorMatcher type guards
 * 3. Build behavior pipeline in configured order
 * 4. Execute pipeline: behaviors wrap handler
 * 5. Return result or propagate exception
 *
 * Usage:
 * <pre>
 * // Inject mediator into controller/service
 * {@literal @}Inject
 * private Mediator mediator;
 *
 * // Send command
 * var command = new CreateOrderCommand(customerId, items);
 * Result<UUID> result = mediator.send(command);
 *
 * // Send query
 * var query = new GetOrderDetailsQuery(orderId);
 * OrderDetailsDto dto = mediator.send(query);
 * </pre>
 *
 * Error Handling:
 * - Business errors: Returned as Result.failure() from handlers
 * - Infrastructure errors: Propagated as exceptions
 * - Missing handlers: Thrown at mediator construction time (FR-008)
 *
 * DDD Layer: Application Layer Infrastructure
 *
 * @see MediatorImpl
 * @see PipelineBehavior
 */
public interface Mediator {

    /**
     * Sends a request through the pipeline and returns the response.
     *
     * @param request The command or query to process
     * @param <TResponse> The response type
     * @return The response from the handler (may be Result<T>)
     * @throws IllegalArgumentException if no handler registered for request type
     * @throws RuntimeException if handler or behavior throws infrastructure error
     */
    <TResponse> TResponse send(BaseRequest request);
}
