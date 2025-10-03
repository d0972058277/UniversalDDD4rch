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
                        "Multiple handlers registered for request type '%s': [%s]. Each request type must have exactly one handler.",
                        entry.getKey().getSimpleName(),
                        handlerNames
                    )
                );
            }
        }
    }

    /**
     * Resolves the request type handled by a given handler.
     * Uses reflection on handler's implemented interfaces to extract TRequest generic parameter.
     */
    private Class<?> resolveRequestType(RequestHandler<?, ?> handler) {
        // Search for RequestHandler/CommandHandler/QueryHandler interface in handler's type hierarchy
        Class<?> handlerClass = handler.getClass();

        // Try to find the generic interface from the handler's interfaces
        java.lang.reflect.Type[] genericInterfaces = handlerClass.getGenericInterfaces();

        for (java.lang.reflect.Type genericInterface : genericInterfaces) {
            if (genericInterface instanceof java.lang.reflect.ParameterizedType paramType) {
                Class<?> rawType = (Class<?>) paramType.getRawType();

                // Check if this is RequestHandler, CommandHandler, or QueryHandler
                if (RequestHandler.class.isAssignableFrom(rawType) ||
                    CommandHandler.class.isAssignableFrom(rawType) ||
                    QueryHandler.class.isAssignableFrom(rawType)) {

                    // Get the first type argument (TRequest)
                    java.lang.reflect.Type[] typeArgs = paramType.getActualTypeArguments();
                    if (typeArgs.length > 0 && typeArgs[0] instanceof Class<?>) {
                        return (Class<?>) typeArgs[0];
                    }
                }
            }
        }

        throw new IllegalArgumentException(
            "Handler " + handlerClass.getSimpleName() +
            " does not implement RequestHandler/CommandHandler/QueryHandler with concrete type parameters"
        );
    }

    /**
     * Gets all registered handlers (for testing/debugging).
     */
    Map<Class<?>, List<RequestHandler<?, ?>>> getAllHandlers() {
        return Collections.unmodifiableMap(handlers);
    }
}
