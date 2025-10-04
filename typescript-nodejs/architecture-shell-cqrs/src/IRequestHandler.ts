import { BaseRequest } from './BaseRequest';

/**
 * IRequestHandler<TRequest, TResponse> - Base handler interface for processing requests
 *
 * Handlers are single-responsibility components that process one request type.
 * Each request type maps to exactly one handler (enforced at DI registration).
 *
 * @typeParam TRequest - The request type (must extend BaseRequest)
 * @typeParam TResponse - The response type
 *
 * @remarks
 * Constraints:
 * - Each request type maps to exactly one handler (enforced at DI registration)
 * - Handlers MUST respect AbortSignal and terminate early when requested
 * - Handlers MUST use Result<T> for business errors, throw exceptions for infrastructure errors
 *
 * @example
 * ```typescript
 * export class CreateOrderHandler implements IRequestHandler<CreateOrderCommand, Result<string>> {
 *   async handle(
 *     request: CreateOrderCommand,
 *     signal: AbortSignal
 *   ): Promise<Result<string>> {
 *     // Business logic here
 *     return Result.success(orderId);
 *   }
 * }
 * ```
 *
 * @see {@link ICommandHandler} - For void command handlers
 * @see {@link IQueryHandler} - For query handlers
 */
export interface IRequestHandler<
  TRequest extends BaseRequest<TResponse>,
  TResponse = void
> {
  /**
   * Handles the request and returns a response
   *
   * @param request - The request to handle
   * @param signal - Cancellation signal for early termination
   * @returns Promise resolving to the response
   * @throws Infrastructure errors (DB failures, network timeouts)
   */
  handle(request: TRequest, signal: AbortSignal): Promise<TResponse>;
}
