import { BaseRequest } from './BaseRequest';

/**
 * RequestHandlerDelegate<TResponse> - Continuation delegate for pipeline chain
 *
 * Represents the next step in the pipeline (either another behavior or the handler itself).
 */
export type RequestHandlerDelegate<TResponse> = () => Promise<TResponse>;

/**
 * IPipelineBehavior<TRequest, TResponse> - Interceptor for cross-cutting concerns
 *
 * Wraps handler execution to apply cross-cutting concerns like validation,
 * authorization, transaction management, telemetry, and caching.
 *
 * @typeParam TRequest - The request type (must extend BaseRequest)
 * @typeParam TResponse - The response type
 *
 * @remarks
 * Behaviors execute in configured order (default: Validation → Authorization → Transaction → Telemetry → Resilience).
 * Behaviors MAY short-circuit pipeline by throwing exception or returning early.
 * Behaviors MUST call next() to continue pipeline unless explicitly short-circuiting.
 *
 * @example
 * ```typescript
 * export class ValidationBehavior<TRequest extends BaseRequest<TResponse>, TResponse>
 *   implements IPipelineBehavior<TRequest, TResponse> {
 *
 *   async handle(
 *     request: TRequest,
 *     next: RequestHandlerDelegate<TResponse>,
 *     signal: AbortSignal
 *   ): Promise<TResponse> {
 *     // Pre-handler logic
 *     const validationResult = await this.validator.validate(request);
 *     if (!validationResult.isValid) {
 *       throw new ValidationException(validationResult.errors);
 *     }
 *
 *     // Call next behavior or handler
 *     const response = await next();
 *
 *     // Post-handler logic (if needed)
 *     return response;
 *   }
 * }
 * ```
 *
 * @see {@link IBehaviorMatcher} - For filtering behaviors by request type
 */
export interface IPipelineBehavior<
  TRequest extends BaseRequest<TResponse>,
  TResponse
> {
  /**
   * Handles the request by wrapping the next behavior/handler in the pipeline
   *
   * @param request - The request being processed
   * @param next - Continuation delegate for the next step in pipeline
   * @param signal - Cancellation signal for early termination
   * @returns Promise resolving to the response
   * @throws May throw to short-circuit pipeline (e.g., validation/authorization failures)
   */
  handle(
    request: TRequest,
    next: RequestHandlerDelegate<TResponse>,
    signal: AbortSignal
  ): Promise<TResponse>;

  /**
   * Order determines behavior execution sequence
   * Lower numbers execute first (recommended: Validation=10, Authorization=20, Transaction=30, Telemetry=40, Caching=50)
   */
  order?: number;
}
