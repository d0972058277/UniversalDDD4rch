package com.architecture.shell.cqrs;

import java.util.*;

/**
 * Registry for request handlers used during mediator construction.
 * Validates handler uniqueness per FR-008.
 *
 * Requirements:
 * - FR-008: Exactly one handler per request type (validates at registration/build time)
 * - Zero handlers → IllegalStateException
 * - Multiple handlers → IllegalStateException with handler names
 *
 * DDD Layer: Application Layer Infrastructure
 */
public class HandlerRegistry {

    private final Map<Class<?>, List<RequestHandler<?, ?>>> handlers = new HashMap<>();

    /**
     * Registers a handler for its request type.
     *
     * @param handler The handler to register
     * @param <TRequest> The request type
     * @param <TResponse> The response type
     */
    public <TRequest extends BaseRequest, TResponse> void register(
        RequestHandler<TRequest, TResponse> handler
    ) {
        Class<?> requestType = resolveRequestType(handler);
        handlers.computeIfAbsent(requestType, k -> new ArrayList<>()).add(handler);
    }

    /**
     * Gets the unique handler for a request type.
     *
     * @param requestType The request class
     * @param <TRequest> The request type
     * @param <TResponse> The response type
     * @return The handler
     * @throws IllegalStateException if zero or multiple handlers registered
     */
    @SuppressWarnings("unchecked")
    public <TRequest extends BaseRequest, TResponse> RequestHandler<TRequest, TResponse> getHandler(
        Class<? extends TRequest> requestType
    ) {
        List<RequestHandler<?, ?>> matchingHandlers = handlers.get(requestType);

        if (matchingHandlers == null || matchingHandlers.isEmpty()) {
            throw new IllegalStateException(
                String.format("No handler registered for request type '%s'", requestType.getSimpleName())
            );
        }

        if (matchingHandlers.size() > 1) {
            String handlerNames = matchingHandlers.stream()
                .map(h -> h.getClass().getSimpleName())
                .reduce((a, b) -> a + ", " + b)
                .orElse("");

            throw new IllegalStateException(
                String.format(
                    "Multiple handlers registered for request type '%s': [%s]. Each request type must have exactly one handler.",
                    requestType.getSimpleName(),
                    handlerNames
                )
            );
        }

        return (RequestHandler<TRequest, TResponse>) matchingHandlers.get(0);
    }

    /**
     * Validates all registered handlers at mediator construction.
     * Checks for ambiguous registrations.
     *
     * @throws IllegalStateException if any request type has multiple handlers
     */
    public void validate() {
        for (Map.Entry<Class<?>, List<RequestHandler<?, ?>>> entry : handlers.entrySet()) {
            if (entry.getValue().size() > 1) {
                String handlerNames = entry.getValue().stream()
                    .map(h -> h.getClass().getSimpleName())
                    .reduce((a, b) -> a + ", " + b)
                    .orElse("");

                throw new IllegalStateException(
                    String.format(
                        "Ambiguous handler registration detected for '%s': [%s]. Constructor-time validation per FR-008.",
                        entry.getKey().getSimpleName(),
                        handlerNames
                    )
                );
            }
        }
    }

    /**
     * Resolves the request type handled by a given handler.
     * Uses reflection on handler's implemented interfaces.
     */
    private Class<?> resolveRequestType(RequestHandler<?, ?> handler) {
        // In a real implementation, this would use reflection to find TRequest generic parameter
        // For this implementation, we'll use a simple approach
        for (Class<?> iface : handler.getClass().getInterfaces()) {
            if (RequestHandler.class.isAssignableFrom(iface) ||
                CommandHandler.class.isAssignableFrom(iface) ||
                QueryHandler.class.isAssignableFrom(iface)) {
                // Extract generic type parameter (simplified - full reflection needed for production)
                // This is a placeholder - real implementation would use TypeToken or similar
                return BaseRequest.class; // Placeholder
            }
        }
        throw new IllegalArgumentException("Handler does not implement RequestHandler interface");
    }

    /**
     * Gets all registered handlers (for testing/debugging).
     */
    Map<Class<?>, List<RequestHandler<?, ?>>> getAllHandlers() {
        return Collections.unmodifiableMap(handlers);
    }
}
