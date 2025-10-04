// Architecture.Shell.Cqrs - TypeScript Interface Contracts
// Language: TypeScript 5.9+ (Node.js 22 LTS)
// Purpose: Core CQRS abstractions for mediator pattern implementation
// Dependencies: reflect-metadata (for decorators)

/**
 * Common ancestor for all application-layer requests.
 * Enables uniform pipeline processing for commands, queries, and future request types.
 */
export interface BaseRequest {}

/**
 * Requests that return a value.
 * Used by queries and commands with return values.
 */
export interface BaseRequest<TResult> extends BaseRequest {
  readonly _resultType?: TResult; // Phantom type for type inference
}

/**
 * Marker interface for state-changing operations with no return value.
 * Executes within transaction boundary.
 */
export interface Command extends BaseRequest {}

/**
 * Marker interface for state-changing operations with return value.
 * Executes within transaction boundary.
 */
export interface Command<TResult> extends BaseRequest<TResult> {}

/**
 * Marker interface for read-only operations with return value.
 * Executes WITHOUT transaction; may use caching.
 */
export interface Query<TResult> extends BaseRequest<TResult> {}

/**
 * Base handler interface for processing requests.
 * Business errors return Result.failure(); infrastructure errors throw exceptions.
 */
export interface IRequestHandler<TRequest extends BaseRequest, TResponse> {
  /**
   * Handles the request.
   * @param request The request to handle
   * @param signal Cancellation signal for aborting long-running operations
   */
  handle(request: TRequest, signal?: AbortSignal): Promise<TResponse>;
}

/**
 * Handler for commands with no return value.
 */
export interface ICommandHandler<TCommand extends Command>
  extends IRequestHandler<TCommand, void> {}

/**
 * Handler for commands with return value.
 */
export interface ICommandHandler<TCommand extends Command<TResult>, TResult>
  extends IRequestHandler<TCommand, TResult> {}

/**
 * Handler for read-only queries.
 */
export interface IQueryHandler<TQuery extends Query<TResult>, TResult>
  extends IRequestHandler<TQuery, TResult> {}

/**
 * Single entry point for sending commands and queries.
 * Routes requests to registered handlers via pipeline behaviors.
 */
export interface IMediator {
  /**
   * Sends a request with return value through the pipeline.
   */
  send<TResponse>(
    request: BaseRequest<TResponse>,
    signal?: AbortSignal
  ): Promise<TResponse>;

  /**
   * Sends a request with no return value through the pipeline.
   */
  send(request: BaseRequest, signal?: AbortSignal): Promise<void>;
}

/**
 * Delegate representing the next step in the pipeline (next behavior or handler).
 */
export type RequestHandlerDelegate<TResponse> = () => Promise<TResponse>;

/**
 * Pipeline behavior for cross-cutting concerns.
 * Wraps handler execution with pre/post logic.
 */
export interface IPipelineBehavior<
  TRequest extends BaseRequest,
  TResponse
> {
  /**
   * Handles the request by executing cross-cutting logic before/after calling next().
   */
  handle(
    request: TRequest,
    next: RequestHandlerDelegate<TResponse>,
    signal?: AbortSignal
  ): Promise<TResponse>;

  /**
   * Execution order (lower values execute first).
   * Default: 100. Recommended: Validation=10, Authorization=20, Transaction=30, Telemetry=40, Resilience=50
   */
  readonly order?: number;
}

/**
 * Transaction boundary abstraction for commands.
 */
export interface IUnitOfWork {
  /**
   * Unique identifier for the current transaction.
   */
  readonly transactionId: string;

  /**
   * Indicates whether a transaction is currently active.
   */
  readonly hasActiveTransaction: boolean;

  /**
   * Begins a new transaction.
   * Throws if transaction provider unavailable (fail fast).
   */
  beginTransaction(signal?: AbortSignal): Promise<void>;

  /**
   * Commits the current transaction.
   * Called on successful handler completion (including Result.failure business errors).
   */
  commit(signal?: AbortSignal): Promise<void>;

  /**
   * Rolls back the current transaction.
   * Called on exception (infrastructure errors).
   */
  rollback(signal?: AbortSignal): Promise<void>;
}

/**
 * Configuration interface for determining which behaviors apply to which request types.
 */
export interface IBehaviorMatcher {
  /**
   * Determines if this behavior should execute for the given request type.
   */
  matches<TRequest extends BaseRequest>(request: TRequest): boolean;
}

/**
 * Type guard for checking if request is a command.
 */
export function isCommand(request: BaseRequest): request is Command {
  return 'constructor' in request &&
         (request.constructor.name.endsWith('Command') ||
          Reflect.getMetadata('cqrs:type', request.constructor) === 'command');
}

/**
 * Type guard for checking if request is a query.
 */
export function isQuery<TResult>(
  request: BaseRequest
): request is Query<TResult> {
  return 'constructor' in request &&
         (request.constructor.name.endsWith('Query') ||
          Reflect.getMetadata('cqrs:type', request.constructor) === 'query');
}

/**
 * Decorator for marking classes as commands.
 */
export function CommandMarker(): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata('cqrs:type', 'command', target);
  };
}

/**
 * Decorator for marking classes as queries.
 */
export function QueryMarker(): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata('cqrs:type', 'query', target);
  };
}