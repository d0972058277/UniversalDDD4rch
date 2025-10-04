import { BaseRequest } from './BaseRequest';
import { IMediator } from './IMediator';
import { IRequestHandler } from './IRequestHandler';
import {
  IPipelineBehavior,
  RequestHandlerDelegate,
} from './IPipelineBehavior';
import { IBehaviorMatcher, AllRequestsMatcher } from './IBehaviorMatcher';

/**
 * Mediator - Central dispatcher for routing requests to handlers via pipeline
 *
 * Implements the Mediator pattern for command/query processing with
 * configurable pipeline behaviors.
 *
 * @remarks
 * Constructor validates handler uniqueness per FR-008:
 * - Throws if zero handlers registered for any request type
 * - Throws if multiple handlers registered for same request type
 *
 * Pipeline execution order:
 * 1. Resolve handler for request type
 * 2. Build behavior chain (ordered by behavior.order property)
 * 3. Execute behaviors in sequence, wrapping handler
 * 4. Return result or propagate exception
 *
 * @example
 * ```typescript
 * const mediator = new Mediator(handlers, behaviors);
 *
 * // Send command
 * const command = new CreateOrderCommand(customerId, items);
 * const result = await mediator.send(command, signal);
 * ```
 */
export class Mediator implements IMediator {
  private readonly handlerMap: Map<string, IRequestHandler<any, any>>;
  private readonly behaviors: Array<{
    behavior: IPipelineBehavior<any, any>;
    matcher: IBehaviorMatcher;
  }>;

  /**
   * Creates a new Mediator instance
   *
   * @param handlers - Array of request handlers (must have exactly one handler per request type)
   * @param behaviors - Array of pipeline behaviors with optional matchers
   * @throws If zero or multiple handlers registered for same request type per FR-008
   */
  constructor(
    handlers: Array<{
      requestType: new (...args: any[]) => BaseRequest<any>;
      handler: IRequestHandler<any, any>;
    }>,
    behaviors: Array<{
      behavior: IPipelineBehavior<any, any>;
      matcher?: IBehaviorMatcher;
    }> = []
  ) {
    // Validate handler uniqueness per FR-008 and spec.md:L64-67
    this.handlerMap = this.buildHandlerMap(handlers);

    // Store behaviors with matchers (default to AllRequestsMatcher)
    this.behaviors = behaviors.map((b) => ({
      behavior: b.behavior,
      matcher: b.matcher ?? new AllRequestsMatcher(),
    }));

    // Sort behaviors by order (lower numbers execute first)
    this.behaviors.sort(
      (a, b) => (a.behavior.order ?? 999) - (b.behavior.order ?? 999)
    );
  }

  /**
   * Builds handler map and validates uniqueness constraints
   *
   * @throws If zero or multiple handlers registered for same request type
   */
  private buildHandlerMap(
    handlers: Array<{
      requestType: new (...args: any[]) => BaseRequest<any>;
      handler: IRequestHandler<any, any>;
    }>
  ): Map<string, IRequestHandler<any, any>> {
    const handlerMap = new Map<string, IRequestHandler<any, any>>();
    const requestTypeCount = new Map<string, number>();

    // Count handlers per request type
    for (const { requestType, handler } of handlers) {
      const typeName = requestType.name;
      const count = requestTypeCount.get(typeName) ?? 0;
      requestTypeCount.set(typeName, count + 1);

      if (count === 0) {
        handlerMap.set(typeName, handler);
      }
    }

    // Validate uniqueness constraints per FR-008
    const ambiguousHandlers: string[] = [];
    for (const [typeName, count] of requestTypeCount.entries()) {
      if (count > 1) {
        ambiguousHandlers.push(typeName);
      }
    }

    if (ambiguousHandlers.length > 0) {
      throw new Error(
        `Multiple handlers registered for request types: ${ambiguousHandlers.join(
          ', '
        )}. Each request type must have exactly one handler per FR-008.`
      );
    }

    return handlerMap;
  }

  /**
   * Sends a request through the mediator pipeline
   *
   * @typeParam TResponse - The response type
   * @param request - The request to send
   * @param signal - Cancellation signal
   * @returns Promise resolving to the response
   * @throws If no handler registered for request type
   * @throws If handler or behavior throws exception
   */
  async send<TResponse>(
    request: BaseRequest<TResponse>,
    signal: AbortSignal
  ): Promise<TResponse>;
  async send(request: BaseRequest, signal: AbortSignal): Promise<void>;
  async send<TResponse>(
    request: BaseRequest<TResponse>,
    signal: AbortSignal
  ): Promise<TResponse> {
    // Resolve handler for request type
    const handler = this.resolveHandler(request);

    // Build behavior pipeline
    const pipeline = this.buildPipeline(request, handler, signal);

    // Execute pipeline
    return await pipeline();
  }

  /**
   * Resolves handler for request type
   *
   * @throws If no handler registered for request type
   */
  private resolveHandler<TResponse>(
    request: BaseRequest<TResponse>
  ): IRequestHandler<any, TResponse> {
    const typeName = request.constructor.name;
    const handler = this.handlerMap.get(typeName);

    if (!handler) {
      throw new Error(
        `No handler registered for request type: ${typeName}. Ensure handler is registered in DI container.`
      );
    }

    return handler;
  }

  /**
   * Builds behavior pipeline that wraps handler execution
   *
   * Behaviors execute in order (sorted by behavior.order property).
   * Each behavior wraps the next, creating a chain of responsibility.
   */
  private buildPipeline<TResponse>(
    request: BaseRequest<TResponse>,
    handler: IRequestHandler<any, TResponse>,
    signal: AbortSignal
  ): RequestHandlerDelegate<TResponse> {
    // Start with handler execution as the innermost delegate
    let pipeline: RequestHandlerDelegate<TResponse> = () =>
      handler.handle(request, signal);

    // Filter behaviors that match this request type
    const applicableBehaviors = this.behaviors.filter((b) =>
      b.matcher.matches(request)
    );

    // Build behavior chain in reverse order (so first behavior wraps all others)
    for (let i = applicableBehaviors.length - 1; i >= 0; i--) {
      const behaviorEntry = applicableBehaviors[i];
      if (!behaviorEntry) continue; // Skip if undefined

      const behavior = behaviorEntry.behavior;
      const next = pipeline;

      // Wrap current pipeline with behavior
      pipeline = () => behavior.handle(request, next, signal);
    }

    return pipeline;
  }
}
