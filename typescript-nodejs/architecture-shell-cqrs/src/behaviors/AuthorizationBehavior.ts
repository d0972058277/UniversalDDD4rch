import { BaseRequest } from '../BaseRequest';
import {
  IPipelineBehavior,
  RequestHandlerDelegate,
} from '../IPipelineBehavior';

/**
 * IAuthorizationService - Authorization abstraction for request permissions
 *
 * Integrate with authentication/authorization frameworks like Passport.js, Auth0, etc.
 */
export interface IAuthorizationService<
  TRequest extends BaseRequest<TResponse>,
  TResponse
> {
  /**
   * Checks if current user is authorized to execute the request
   *
   * @param request - The request to authorize
   * @returns Authorization result
   */
  isAuthorized(request: TRequest): Promise<AuthorizationResult>;
}

/**
 * AuthorizationResult - Result of authorization check
 */
export interface AuthorizationResult {
  readonly isAuthorized: boolean;
  readonly failureReason?: string;
}

/**
 * UnauthorizedAccessException - Thrown when authorization fails
 *
 * Signals that current user lacks permission to execute request.
 */
export class UnauthorizedAccessException extends Error {
  constructor(requestType: string, reason?: string) {
    super(
      `Unauthorized access to ${requestType}${reason ? `: ${reason}` : ''}`
    );
    this.name = 'UnauthorizedAccessException';
  }
}

/**
 * AuthorizationBehavior - Pipeline behavior that checks request permissions
 *
 * Executes after validation, before expensive operations (transaction opening, handler execution).
 * Short-circuits pipeline by throwing UnauthorizedAccessException on authorization failure.
 *
 * @typeParam TRequest - The request type
 * @typeParam TResponse - The response type
 *
 * @remarks
 * Recommended order: 20 (after validation, before transaction)
 *
 * @example
 * ```typescript
 * const behavior = new AuthorizationBehavior(authService);
 * mediator.addBehavior(behavior, new AllRequestsMatcher());
 * ```
 */
export class AuthorizationBehavior<
  TRequest extends BaseRequest<TResponse>,
  TResponse
> implements IPipelineBehavior<TRequest, TResponse>
{
  readonly order = 20;

  constructor(
    private readonly authorizationService: IAuthorizationService<
      TRequest,
      TResponse
    >
  ) {}

  async handle(
    request: TRequest,
    next: RequestHandlerDelegate<TResponse>,
    _signal: AbortSignal
  ): Promise<TResponse> {
    // Pre-handler authorization check
    const authResult = await this.authorizationService.isAuthorized(request);

    if (!authResult.isAuthorized) {
      throw new UnauthorizedAccessException(
        request.constructor.name,
        authResult.failureReason
      );
    }

    // Continue pipeline
    return await next();
  }
}
