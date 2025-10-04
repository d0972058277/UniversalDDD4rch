import { BaseRequest } from '../BaseRequest';
import { Command } from '../Command';
import {
  IPipelineBehavior,
  RequestHandlerDelegate,
} from '../IPipelineBehavior';
import { IUnitOfWork } from '../IUnitOfWork';

/**
 * Result interface for detecting business failures vs infrastructure failures
 *
 * This is a minimal interface compatible with Architecture.Core Result<T> monad.
 * Implementations should use the full Result<T> from Architecture.Core.
 */
export interface IResult {
  readonly isFailure: boolean;
}

/**
 * UnitOfWorkBehavior - Pipeline behavior that manages transaction lifecycle
 *
 * Opens transaction for commands, commits on success (including Result.Failure business errors),
 * rolls back on exceptions. Skips transaction management for queries.
 * Reuses active transaction for nested commands.
 *
 * @typeParam TRequest - The request type
 * @typeParam TResponse - The response type
 *
 * @remarks
 * Recommended order: 30 (after validation and authorization)
 *
 * Transaction semantics per BR-006, BR-007, BR-008:
 * - BeginTransaction(): Opens new transaction if none active; throws if transaction provider unavailable (fail fast)
 * - Nested commands reuse active transaction (HasActiveTransaction check)
 * - Result.Failure() commits transaction (business rejection is valid state per BR-008)
 * - Exceptions rollback transaction (infrastructure errors)
 * - Logs TransactionId before rollback for correlation (per BR-002)
 *
 * @example
 * ```typescript
 * const behavior = new UnitOfWorkBehavior(unitOfWork, logger);
 * mediator.addBehavior(behavior, new CommandOnlyMatcher());
 * ```
 */
export class UnitOfWorkBehavior<
  TRequest extends BaseRequest<TResponse>,
  TResponse
> implements IPipelineBehavior<TRequest, TResponse>
{
  readonly order = 30;

  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly logger?: ILogger
  ) {}

  async handle(
    request: TRequest,
    next: RequestHandlerDelegate<TResponse>,
    signal: AbortSignal
  ): Promise<TResponse> {
    // Skip transaction management for queries (BR-003)
    if (!this.isCommand(request)) {
      return await next();
    }

    // Reuse active transaction for nested commands (BR-005)
    if (this.unitOfWork.hasActiveTransaction) {
      return await next();
    }

    // Begin transaction for commands
    const startTime = Date.now();
    try {
      await this.unitOfWork.beginTransaction(signal);

      // Execute handler
      const response = await next();

      // Commit transaction on success or business failure (BR-008)
      // Result.Failure() indicates business validation failure, not infrastructure error
      await this.unitOfWork.commit(signal);

      return response;
    } catch (error) {
      // Log error with TransactionId before rollback per BR-002
      // This ensures correlation even if rollback itself fails
      const duration = Date.now() - startTime;
      this.logger?.error(
        {
          requestType: request.constructor.name,
          transactionId: this.unitOfWork.transactionId,
          duration,
          error,
        },
        'Request failed - rolling back transaction'
      );

      // Rollback transaction on exception (infrastructure error)
      await this.unitOfWork.rollback(signal);

      // Re-throw to propagate exception
      throw error;
    }
  }

  /**
   * Type guard to detect command requests
   */
  private isCommand(request: any): request is Command {
    return (
      '_isCommand' in request ||
      request.constructor.name.endsWith('Command') ||
      Object.getPrototypeOf(request).constructor.name.endsWith('Command')
    );
  }
}

/**
 * Minimal logger interface
 *
 * Compatible with winston, pino, or console.log wrappers.
 */
export interface ILogger {
  error(context: any, message: string): void;
  warn(context: any, message: string): void;
  info(context: any, message: string): void;
  debug(context: any, message: string): void;
}
