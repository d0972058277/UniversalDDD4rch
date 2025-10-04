import { BaseRequest } from '../BaseRequest';
import { Command } from '../Command';
import {
  IPipelineBehavior,
  RequestHandlerDelegate,
} from '../IPipelineBehavior';
import { IUnitOfWork } from '../IUnitOfWork';
import { ILogger, IResult } from './UnitOfWorkBehavior';

/**
 * TelemetryBehavior - Pipeline behavior that logs request execution metrics
 *
 * Captures request type, duration, status, and exceptions for observability.
 * Logs TransactionId for all command executions per NFR-002 and BR-002.
 *
 * @typeParam TRequest - The request type
 * @typeParam TResponse - The response type
 *
 * @remarks
 * Recommended order: 40 (after transaction management, wraps handler execution)
 *
 * Required telemetry fields per data-model.md:L459-L466:
 * - Timestamp: ISO 8601 datetime
 * - LogLevel: Info/Warning/Error
 * - RequestType: Fully qualified request type name
 * - Duration: Elapsed time in milliseconds
 * - Status: Success|BusinessFailure|InfrastructureError|Cancelled
 * - Exception: Full exception details if thrown
 * - TransactionId: GUID for ALL command executions (REQUIRED per NFR-002)
 *
 * @example
 * ```typescript
 * const behavior = new TelemetryBehavior(logger, unitOfWork);
 * mediator.addBehavior(behavior, new AllRequestsMatcher());
 * ```
 */
export class TelemetryBehavior<
  TRequest extends BaseRequest<TResponse>,
  TResponse
> implements IPipelineBehavior<TRequest, TResponse>
{
  readonly order = 40;

  constructor(
    private readonly logger: ILogger,
    private readonly unitOfWork?: IUnitOfWork
  ) {}

  async handle(
    request: TRequest,
    next: RequestHandlerDelegate<TResponse>,
    signal: AbortSignal
  ): Promise<TResponse> {
    const startTime = Date.now();
    const requestType = request.constructor.name;
    const timestamp = new Date().toISOString();

    // Log request start
    this.logger.info(
      {
        timestamp,
        requestType,
        transactionId: this.getTransactionId(request),
      },
      `${requestType} started`
    );

    try {
      // Execute handler
      const response = await next();
      const duration = Date.now() - startTime;

      // Detect business failure vs success
      const status = this.isBusinessFailure(response)
        ? 'BusinessFailure'
        : 'Success';

      // Log completion
      this.logger.info(
        {
          timestamp: new Date().toISOString(),
          requestType,
          duration,
          status,
          transactionId: this.getTransactionId(request),
        },
        `${requestType} completed in ${duration}ms - ${status}`
      );

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      const status = signal.aborted ? 'Cancelled' : 'InfrastructureError';

      // Log error with full exception details
      this.logger.error(
        {
          timestamp: new Date().toISOString(),
          requestType,
          duration,
          status,
          exception: {
            type: error instanceof Error ? error.constructor.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
          transactionId: this.getTransactionId(request),
        },
        `${requestType} failed after ${duration}ms`
      );

      // Re-throw to propagate exception
      throw error;
    }
  }

  /**
   * Gets TransactionId for command executions (REQUIRED per NFR-002 and BR-002)
   * Returns undefined for queries (no transaction)
   */
  private getTransactionId(request: TRequest): string | undefined {
    if (!this.isCommand(request)) {
      return undefined;
    }

    return this.unitOfWork?.hasActiveTransaction
      ? this.unitOfWork.transactionId
      : undefined;
  }

  /**
   * Detects business failures (Result.Failure) vs successes
   */
  private isBusinessFailure(response: TResponse): boolean {
    if (response === null || response === undefined) {
      return false;
    }

    // Check if response implements IResult with isFailure property
    return (
      typeof response === 'object' &&
      'isFailure' in response &&
      (response as IResult).isFailure === true
    );
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
