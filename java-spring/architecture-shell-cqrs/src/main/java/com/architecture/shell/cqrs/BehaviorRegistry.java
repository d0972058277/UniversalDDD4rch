package com.architecture.shell.cqrs;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Registry for pipeline behaviors with ordering and filtering.
 * Manages behavior execution order and type-based filtering via BehaviorMatcher.
 *
 * Requirements:
 * - FR-004: Behaviors execute in configured order
 * - FR-007: BehaviorMatcher filters behaviors by request type
 * - BR-004: Log warning when order deviates from recommended sequence
 *
 * Recommended Order (per BR-004):
 * - Validation (10)
 * - Authorization (20)
 * - UnitOfWork/Transaction (30)
 * - Telemetry (40)
 * - Caching (50)
 * - Resilience (60)
 *
 * DDD Layer: Application Layer Infrastructure
 */
public class BehaviorRegistry {

    private static final Logger logger = LoggerFactory.getLogger(BehaviorRegistry.class);

    private final List<BehaviorRegistration> behaviors = new ArrayList<>();

    /**
     * Registers a behavior with execution order and optional matcher.
     *
     * @param behavior The pipeline behavior
     * @param order Execution order (lower executes first/outer)
     * @param matcher Optional matcher to filter by request type (null = matches all)
     */
    public void register(PipelineBehavior<?, ?> behavior, int order, BehaviorMatcher matcher) {
        behaviors.add(new BehaviorRegistration(behavior, order, matcher != null ? matcher : new BehaviorMatcher.AllRequestsMatcher()));
    }

    /**
     * Registers a behavior with execution order (matches all requests).
     *
     * @param behavior The pipeline behavior
     * @param order Execution order
     */
    public void register(PipelineBehavior<?, ?> behavior, int order) {
        register(behavior, order, null);
    }

    /**
     * Gets behaviors applicable to a request, sorted by execution order.
     *
     * @param request The request being processed
     * @return List of behaviors in execution order
     */
    @SuppressWarnings("unchecked")
    public <TRequest extends BaseRequest, TResponse> List<PipelineBehavior<TRequest, TResponse>> getBehaviors(
        TRequest request
    ) {
        return behaviors.stream()
            .filter(reg -> reg.matcher.matches(request))
            .sorted(Comparator.comparingInt(reg -> reg.order))
            .map(reg -> (PipelineBehavior<TRequest, TResponse>) reg.behavior)
            .collect(Collectors.toList());
    }

    /**
     * Validates behavior order and logs warning if deviates from recommended sequence.
     * Called at mediator construction per BR-004.
     */
    public void validateOrder() {
        // Check if order deviates from recommended: Validation(10) → Authorization(20) → Transaction(30) → Telemetry(40)
        var orderedBehaviors = behaviors.stream()
            .sorted(Comparator.comparingInt(reg -> reg.order))
            .collect(Collectors.toList());

        for (int i = 1; i < orderedBehaviors.size(); i++) {
            var current = orderedBehaviors.get(i);
            var previous = orderedBehaviors.get(i - 1);

            // Warn if transaction comes before validation (non-recommended)
            if (isTransactionBehavior(current.behavior) && isValidationBehavior(previous.behavior)) {
                logger.warn(
                    "Behavior order deviates from recommended sequence: Transaction behavior (order={}) " +
                    "is configured AFTER Validation behavior (order={}). Recommended: Validation → Authorization → Transaction → Telemetry. " +
                    "This may waste resources by opening transactions for invalid requests.",
                    current.order, previous.order
                );
            }

            // Warn if telemetry comes before authorization (security risk)
            if (isTelemetryBehavior(current.behavior) && isAuthorizationBehavior(previous.behavior)) {
                logger.warn(
                    "Behavior order deviates from recommended sequence: Telemetry behavior (order={}) " +
                    "is configured AFTER Authorization behavior (order={}). This may log sensitive data from unauthorized requests.",
                    current.order, previous.order
                );
            }
        }
    }

    private boolean isValidationBehavior(PipelineBehavior<?, ?> behavior) {
        return behavior.getClass().getSimpleName().contains("Validation");
    }

    private boolean isAuthorizationBehavior(PipelineBehavior<?, ?> behavior) {
        return behavior.getClass().getSimpleName().contains("Authorization");
    }

    private boolean isTransactionBehavior(PipelineBehavior<?, ?> behavior) {
        return behavior.getClass().getSimpleName().contains("UnitOfWork") ||
               behavior.getClass().getSimpleName().contains("Transaction");
    }

    private boolean isTelemetryBehavior(PipelineBehavior<?, ?> behavior) {
        return behavior.getClass().getSimpleName().contains("Telemetry");
    }

    /**
     * Internal registration record.
     */
    private static class BehaviorRegistration {
        final PipelineBehavior<?, ?> behavior;
        final int order;
        final BehaviorMatcher matcher;

        BehaviorRegistration(PipelineBehavior<?, ?> behavior, int order, BehaviorMatcher matcher) {
            this.behavior = behavior;
            this.order = order;
            this.matcher = matcher;
        }
    }
}
