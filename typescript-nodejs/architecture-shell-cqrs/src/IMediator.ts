import { BaseRequest } from './BaseRequest';

/**
 * IMediator - Single entry point for sending commands and queries
 *
 * Routes requests to handlers via configured pipeline behaviors.
 * Provides centralized dispatcher for all application-layer operations.
 *
 * @remarks
 * Behavior:
 * 1. Resolve handler for request type (fail if zero or multiple handlers registered)
 * 2. Resolve applicable pipeline behaviors (filtered by type guards)
 * 3. Build behavior chain in configured order
 * 4. Execute pipeline → behaviors wrap handler execution
 * 5. Return result or propagate exception
 *
 * Constraints:
 * - Handler resolution MUST occur at DI container build time (not runtime reflection)
 * - Pipeline construction MUST happen per-request (behaviors may be stateful per request)
 *
 * @example
 * ```typescript
 * // Sending a command
 * const command = new CreateOrderCommand(customerId, items);
 * const result = await mediator.send(command, signal);
 * if (result.isSuccess) {
 *   console.log(`Order created: ${result.value}`);
 * }
 *
 * // Sending a query
 * const query = new GetOrderDetailsQuery(orderId);
 * const dto = await mediator.send(query, signal);
 * ```
 *
 * @see {@link IPipelineBehavior} - For implementing cross-cutting concerns
 * @see {@link IRequestHandler} - For implementing request handlers
 */
export interface IMediator {
  /**
   * Sends a request with return value through the mediator pipeline
   *
   * @typeParam TResponse - The response type
   * @param request - The request to send (must extend BaseRequest<TResponse>)
   * @param signal - Cancellation signal for early termination
   * @returns Promise resolving to the response
   * @throws If no handler registered or handler/behavior throws exception
   */
  send<TResponse>(
    request: BaseRequest<TResponse>,
    signal: AbortSignal
  ): Promise<TResponse>;

  /**
   * Sends a request without return value (void) through the mediator pipeline
   *
   * @param request - The request to send (must extend BaseRequest)
   * @param signal - Cancellation signal for early termination
   * @returns Promise resolving when request is processed
   * @throws If no handler registered or handler/behavior throws exception
   */
  send(request: BaseRequest, signal: AbortSignal): Promise<void>;
}
