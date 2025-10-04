import { BaseRequest } from './BaseRequest';

/**
 * Command - Marker interface for state-changing operations with no return value
 *
 * Commands represent application-layer operations that modify state.
 * They return void (Unit equivalent) or Result<void> for business validation errors.
 *
 * @remarks
 * Constraints:
 * - MUST modify state (otherwise use Query)
 * - MUST execute within transaction boundary (enforced by UnitOfWork behavior)
 * - MAY return Result<void> for business validation errors
 * - Infrastructure errors (DB down) should throw exceptions
 *
 * @example
 * ```typescript
 * export class PublishBlogPostCommand implements Command {
 *   _isCommand = true;
 *   constructor(
 *     public readonly blogPostId: string,
 *     public readonly publishDate: Date
 *   ) {}
 * }
 * ```
 *
 * @see {@link Query} for read-only operations
 */
export interface Command extends BaseRequest<void> {
  _isCommand?: true;
}
