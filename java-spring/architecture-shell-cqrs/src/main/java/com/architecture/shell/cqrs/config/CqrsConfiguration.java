package com.architecture.shell.cqrs.config;

import com.architecture.shell.cqrs.*;
import com.architecture.shell.cqrs.behaviors.*;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;

/**
 * Spring configuration for CQRS module dependency injection.
 *
 * <p>This configuration class automatically discovers and registers:
 * <ul>
 *   <li>All CommandHandler and QueryHandler implementations</li>
 *   <li>Pipeline behaviors in recommended order (Validation → Authorization → Transaction → Telemetry → Caching)</li>
 *   <li>Mediator with handler and behavior registries</li>
 * </ul>
 *
 * <p>Usage:
 * <pre>{@code
 * @Configuration
 * @Import(CqrsConfiguration.class)
 * public class MyApplicationConfig {
 *     // Your configuration
 * }
 * }</pre>
 *
 * <p>Or enable with component scanning:
 * <pre>{@code
 * @SpringBootApplication(scanBasePackages = "com.architecture.shell.cqrs")
 * public class MyApplication {
 *     public static void main(String[] args) {
 *         SpringApplication.run(MyApplication.class, args);
 *     }
 * }
 * }</pre>
 *
 * @see Mediator
 * @see HandlerRegistry
 * @see BehaviorRegistry
 * @since 1.0.0
 */
@Configuration
public class CqrsConfiguration {

    /**
     * Creates the handler registry by discovering all CommandHandler and QueryHandler beans.
     *
     * <p>Validates that exactly one handler exists per request type at startup.
     * Throws IllegalStateException if zero or multiple handlers found for same request type.
     *
     * @param context Spring application context for bean discovery
     * @return configured HandlerRegistry with all discovered handlers
     * @throws IllegalStateException if handler registration is invalid (zero or multiple handlers per request type)
     */
    @Bean
    public HandlerRegistry handlerRegistry(ApplicationContext context) {
        var registry = new HandlerRegistry();

        // Discover and register all CommandHandler implementations
        var commandHandlers = context.getBeansOfType(CommandHandler.class);
        for (var handler : commandHandlers.values()) {
            registry.register(handler);
        }

        // Discover and register all QueryHandler implementations
        var queryHandlers = context.getBeansOfType(QueryHandler.class);
        for (var handler : queryHandlers.values()) {
            registry.register(handler);
        }

        // Validate registration (will throw if ambiguous handlers detected)
        // This validation happens at startup, not runtime
        return registry;
    }

    /**
     * Creates the behavior registry with pipeline behaviors in recommended order.
     *
     * <p>Default order (lower numbers execute first):
     * <ol>
     *   <li>ValidationBehavior (order=10) - Fast-fail on invalid requests</li>
     *   <li>AuthorizationBehavior (order=20) - Security checks before resource acquisition</li>
     *   <li>UnitOfWorkBehavior (order=30) - Transaction management for commands</li>
     *   <li>TelemetryBehavior (order=40) - Observability and logging</li>
     *   <li>CachingBehavior (order=50) - Query result caching</li>
     * </ol>
     *
     * <p>Custom ordering can be achieved by creating custom BehaviorRegistry bean
     * that overrides this default configuration.
     *
     * @param context Spring application context for UnitOfWork dependency injection
     * @return configured BehaviorRegistry with all pipeline behaviors
     */
    @Bean
    public BehaviorRegistry behaviorRegistry(ApplicationContext context) {
        var registry = new BehaviorRegistry();

        // Validation behavior (order=10) - applies to all requests
        registry.register(new ValidationBehavior<>(), 10, new BehaviorMatcher.AllRequestsMatcher());

        // Authorization behavior (order=20) - applies to all requests
        registry.register(new AuthorizationBehavior<>(), 20, new BehaviorMatcher.AllRequestsMatcher());

        // UnitOfWork behavior (order=30) - applies to commands only
        // Requires UnitOfWork bean to be provided by application (e.g., JPA implementation)
        if (context.getBeanNamesForType(UnitOfWork.class).length > 0) {
            var unitOfWork = context.getBean(UnitOfWork.class);
            registry.register(new UnitOfWorkBehavior<>(unitOfWork), 30, new BehaviorMatcher.CommandOnlyMatcher());
        }

        // Telemetry behavior (order=40) - applies to all requests
        registry.register(new TelemetryBehavior<>(), 40, new BehaviorMatcher.AllRequestsMatcher());

        // Caching behavior (order=50) - applies to queries only
        registry.register(new CachingBehavior<>(), 50, new BehaviorMatcher.QueryOnlyMatcher());

        return registry;
    }

    /**
     * Creates the Mediator instance with handler and behavior registries.
     *
     * <p>Mediator validates handler registration at construction time.
     * Will throw IllegalStateException if ambiguous handler registration detected.
     *
     * @param handlerRegistry registry containing all command and query handlers
     * @param behaviorRegistry registry containing all pipeline behaviors
     * @return configured Mediator ready for request processing
     * @throws IllegalStateException if handler registration is invalid
     */
    @Bean
    public Mediator mediator(HandlerRegistry handlerRegistry, BehaviorRegistry behaviorRegistry) {
        return new MediatorImpl(handlerRegistry, behaviorRegistry);
    }
}
