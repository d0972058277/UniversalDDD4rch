import { Query } from './Query';
import { IRequestHandler } from './IRequestHandler';

/**
 * IQueryHandler<TQuery, TResult> - Processes read-only queries
 *
 * Handles read operations that return DTOs/projections without modifying state.
 *
 * @typeParam TQuery - The query type (must extend Query<TResult>)
 * @typeParam TResult - The return type (typically DTO/projection)
 *
 * @remarks
 * Constraints:
 * - MUST NOT call repository.add/update/delete methods (enforced by architecture tests)
 * - Infrastructure errors (DB timeout, network failure) throw exceptions
 * - Business errors (data not found) may return Result.failure or throw domain-specific exception
 * - Does NOT execute within transaction boundary (read-only)
 *
 * @example
 * ```typescript
 * export class GetOrderDetailsHandler implements IQueryHandler<GetOrderDetailsQuery, OrderDetailsDto> {
 *   async handle(
 *     query: GetOrderDetailsQuery,
 *     signal: AbortSignal
 *   ): Promise<OrderDetailsDto> {
 *     // Read-only query logic
 *     return await this.readModel.getOrderDetails(query.orderId);
 *   }
 * }
 * ```
 *
 * @see {@link ICommandHandler} - For state-changing operations
 */
export interface IQueryHandler<TQuery extends Query<TResult>, TResult>
  extends IRequestHandler<TQuery, TResult> {}
