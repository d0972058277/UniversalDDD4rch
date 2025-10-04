import { BaseRequest } from './BaseRequest';

/**
 * Query<TResult> - Read-only operation that returns data without modifying state
 *
 * Queries represent application-layer read operations that return DTOs/projections.
 *
 * @typeParam TResult - The type of data returned (typically DTO/projection)
 *
 * @remarks
 * Constraints:
 * - MUST NOT modify state (enforced semantically; architecture tests verify no repository writes)
 * - MUST NOT open transactions (enforced by UnitOfWork behavior)
 * - TResult typically DTO/projection, not domain entities
 * - MAY return Result<TResult> if business-level query failures possible (e.g., authorization within handler)
 * - Infrastructure errors (DB timeout) should throw exceptions
 *
 * @example
 * ```typescript
 * export class GetOrderDetailsQuery implements Query<OrderDetailsDto> {
 *   _isQuery = true;
 *   constructor(
 *     public readonly orderId: string,
 *     public readonly includeLineItems: boolean
 *   ) {}
 * }
 * ```
 *
 * @see {@link Command} for state-changing operations
 */
export interface Query<TResult> extends BaseRequest<TResult> {
  _isQuery?: true;
}
