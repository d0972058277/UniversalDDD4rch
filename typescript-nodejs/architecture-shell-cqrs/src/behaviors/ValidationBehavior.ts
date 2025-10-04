import { BaseRequest } from '../BaseRequest';
import {
  IPipelineBehavior,
  RequestHandlerDelegate,
} from '../IPipelineBehavior';

/**
 * IValidator - Validation abstraction for request payloads
 *
 * Integrate with validation libraries like class-validator, joi, zod, etc.
 */
export interface IValidator<TRequest extends BaseRequest<TResponse>, TResponse> {
  /**
   * Validates the request payload
   *
   * @param request - The request to validate
   * @returns Validation result with errors if invalid
   */
  validate(request: TRequest): Promise<ValidationResult>;
}

/**
 * ValidationResult - Result of validation operation
 */
export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: ValidationError[];
}

/**
 * ValidationError - Individual validation failure
 */
export interface ValidationError {
  readonly propertyName: string;
  readonly errorMessage: string;
  readonly attemptedValue?: any;
}

/**
 * ValidationException - Thrown when validation fails
 *
 * Signals that request payload is invalid and pipeline should short-circuit.
 */
export class ValidationException extends Error {
  constructor(public readonly validationErrors: ValidationError[]) {
    super(
      `Validation failed: ${validationErrors.map((e) => `${e.propertyName}: ${e.errorMessage}`).join(', ')}`
    );
    this.name = 'ValidationException';
  }
}

/**
 * ValidationBehavior - Pipeline behavior that validates request payloads
 *
 * Executes before handler to ensure request data is valid.
 * Short-circuits pipeline by throwing ValidationException on validation failure.
 *
 * @typeParam TRequest - The request type
 * @typeParam TResponse - The response type
 *
 * @remarks
 * Recommended order: 10 (execute first to fail fast on invalid data)
 *
 * @example
 * ```typescript
 * const behavior = new ValidationBehavior(validator);
 * mediator.addBehavior(behavior, new AllRequestsMatcher());
 * ```
 */
export class ValidationBehavior<
  TRequest extends BaseRequest<TResponse>,
  TResponse
> implements IPipelineBehavior<TRequest, TResponse>
{
  readonly order = 10;

  constructor(private readonly validator: IValidator<TRequest, TResponse>) {}

  async handle(
    request: TRequest,
    next: RequestHandlerDelegate<TResponse>,
    _signal: AbortSignal
  ): Promise<TResponse> {
    // Pre-handler validation
    const validationResult = await this.validator.validate(request);

    if (!validationResult.isValid) {
      throw new ValidationException(validationResult.errors);
    }

    // Continue pipeline
    return await next();
  }
}
