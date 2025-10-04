import { Command } from './Command';
import { IRequestHandler } from './IRequestHandler';
import { BaseRequest } from './BaseRequest';

/**
 * ICommandHandler - Processes commands without return values
 *
 * Handles state-changing operations that return void (Unit equivalent).
 *
 * @typeParam TCommand - The command type (must extend Command)
 *
 * @remarks
 * - May return Result<void> if business validation errors expected
 * - Infrastructure errors always throw exceptions
 * - Executes within transaction boundary (managed by UnitOfWork behavior)
 *
 * @example
 * ```typescript
 * export class PublishBlogPostHandler implements ICommandHandler<PublishBlogPostCommand> {
 *   async handle(
 *     command: PublishBlogPostCommand,
 *     signal: AbortSignal
 *   ): Promise<void> {
 *     // Publish blog post logic
 *   }
 * }
 * ```
 *
 * @see {@link IQueryHandler} - For read-only operations
 */
export interface ICommandHandler<TCommand extends Command>
  extends IRequestHandler<TCommand, void> {}

/**
 * ICommandHandlerWithResult - Processes commands with return values
 *
 * Handles state-changing operations that return data
 * (e.g., created entity ID, updated version number).
 *
 * @typeParam TCommand - The command type (extends BaseRequest)
 * @typeParam TResult - The return type (typically Result<TValue>)
 *
 * @example
 * ```typescript
 * export class CreateOrderHandler implements ICommandHandlerWithResult<CreateOrderCommand, Result<string>> {
 *   async handle(
 *     command: CreateOrderCommand,
 *     signal: AbortSignal
 *   ): Promise<Result<string>> {
 *     // Create order logic
 *     return Result.success(order.id);
 *   }
 * }
 * ```
 */
export interface ICommandHandlerWithResult<TCommand extends BaseRequest<TResult>, TResult>
  extends IRequestHandler<TCommand, TResult> {}
