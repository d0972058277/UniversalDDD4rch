package com.architecture.shell.cqrs;

/**
 * Interface for determining which behaviors apply to which request types.
 * Enables selective behavior application via type guards.
 *
 * Requirements:
 * - FR-007: BehaviorMatcher provides type guards (isCommand, isQuery) to filter behavior application
 * - UnitOfWorkBehavior uses CommandOnlyMatcher (transactions only for commands)
 * - CachingBehavior uses QueryOnlyMatcher (caching only for queries)
 *
 * Common Matchers:
 * - CommandOnlyMatcher: Matches all commands (state-changing operations)
 * - QueryOnlyMatcher: Matches all queries (read-only operations)
 * - AllRequestsMatcher: Matches all requests (telemetry, resilience)
 *
 * Example Usage:
 * <pre>
 * behaviorRegistry.register(new UnitOfWorkBehavior(), 30, new CommandOnlyMatcher());
 * behaviorRegistry.register(new CachingBehavior(), 50, new QueryOnlyMatcher());
 * behaviorRegistry.register(new TelemetryBehavior(), 40, new AllRequestsMatcher());
 * </pre>
 *
 * Custom Matchers:
 * <pre>
 * public class AuditableCommandMatcher implements BehaviorMatcher {
 *     public boolean matches(BaseRequest request) {
 *         return request instanceof Command && request instanceof IAuditable;
 *     }
 * }
 * </pre>
 *
 * DDD Layer: Application Layer Infrastructure
 *
 * @see CommandOnlyMatcher
 * @see QueryOnlyMatcher
 * @see PipelineBehavior
 */
@FunctionalInterface
public interface BehaviorMatcher {

    /**
     * Determines if a behavior should be applied to the given request.
     *
     * @param request The request being evaluated
     * @return true if the behavior should apply to this request type
     */
    boolean matches(BaseRequest request);

    /**
     * Matcher that matches all Command types.
     */
    class CommandOnlyMatcher implements BehaviorMatcher {
        @Override
        public boolean matches(BaseRequest request) {
            return request instanceof Command;
        }
    }

    /**
     * Matcher that matches all Query types.
     */
    class QueryOnlyMatcher implements BehaviorMatcher {
        @Override
        public boolean matches(BaseRequest request) {
            return request instanceof Query;
        }
    }

    /**
     * Matcher that matches all request types.
     */
    class AllRequestsMatcher implements BehaviorMatcher {
        @Override
        public boolean matches(BaseRequest request) {
            return true;
        }
    }
}
