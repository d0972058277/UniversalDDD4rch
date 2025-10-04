import { BaseRequest } from './BaseRequest';
import { Command } from './Command';
import { Query } from './Query';

/**
 * IBehaviorMatcher - Configuration interface for determining which behaviors apply to which request types
 *
 * Provides type guards to selectively apply behaviors to request types.
 * Used to configure behaviors that only apply to commands or queries.
 *
 * @remarks
 * Common implementations:
 * - CommandOnlyMatcher: Matches only Command types
 * - QueryOnlyMatcher: Matches only Query types
 * - AllRequestsMatcher: Matches all request types
 *
 * @example
 * ```typescript
 * // UnitOfWork behavior only applies to commands
 * mediator.addBehavior(
 *   new UnitOfWorkBehavior(unitOfWork),
 *   new CommandOnlyMatcher()
 * );
 *
 * // Caching behavior only applies to queries
 * mediator.addBehavior(
 *   new CachingBehavior(cache),
 *   new QueryOnlyMatcher()
 * );
 *
 * // Telemetry applies to all requests
 * mediator.addBehavior(
 *   new TelemetryBehavior(logger),
 *   new AllRequestsMatcher()
 * );
 * ```
 *
 * @see {@link IPipelineBehavior} - For behavior implementation
 */
export interface IBehaviorMatcher {
  /**
   * Determines if a behavior should be applied to a specific request type
   *
   * @param request - The request instance to check
   * @returns true if behavior should apply, false otherwise
   */
  matches<TRequest extends BaseRequest<any>>(request: TRequest): boolean;
}

/**
 * CommandOnlyMatcher - Matches only Command request types
 *
 * Use this matcher for behaviors that should only apply to state-changing operations
 * (e.g., UnitOfWork, transaction management).
 */
export class CommandOnlyMatcher implements IBehaviorMatcher {
  matches<TRequest extends BaseRequest<any>>(request: TRequest): boolean {
    // Check if request implements Command interface
    // In TypeScript, we use a brand/marker property or constructor check
    return this.isCommand(request);
  }

  private isCommand(request: any): request is Command {
    // Check if the request's constructor or prototype indicates it's a command
    // This is a runtime type guard - implementations may add a brand property
    return (
      '_isCommand' in request ||
      request.constructor.name.endsWith('Command') ||
      Object.getPrototypeOf(request).constructor.name.endsWith('Command')
    );
  }
}

/**
 * QueryOnlyMatcher - Matches only Query request types
 *
 * Use this matcher for behaviors that should only apply to read-only operations
 * (e.g., Caching).
 */
export class QueryOnlyMatcher implements IBehaviorMatcher {
  matches<TRequest extends BaseRequest<any>>(request: TRequest): boolean {
    return this.isQuery(request);
  }

  private isQuery(request: any): request is Query<any> {
    return (
      '_isQuery' in request ||
      request.constructor.name.endsWith('Query') ||
      Object.getPrototypeOf(request).constructor.name.endsWith('Query')
    );
  }
}

/**
 * AllRequestsMatcher - Matches all request types
 *
 * Use this matcher for behaviors that apply universally
 * (e.g., Telemetry, Logging, Resilience).
 */
export class AllRequestsMatcher implements IBehaviorMatcher {
  matches<TRequest extends BaseRequest<any>>(_request: TRequest): boolean {
    return true;
  }
}
