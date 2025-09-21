import { ErrorCategory } from './error-category';
import { IError } from './interfaces/i-error';

// Re-export ErrorCategory for convenience
export { ErrorCategory };

/**
 * Immutable error representation for functional programming patterns.
 * Provides structured error information with categorization and metadata.
 */
export class Error implements IError {
  public readonly code: string;
  public readonly message: string;
  public readonly category: ErrorCategory;
  public readonly metadata: Readonly<Record<string, unknown>>;

  private constructor(
    code: string,
    message: string,
    category: ErrorCategory,
    metadata?: Record<string, unknown> | null
  ) {
    this.code = code;
    this.message = message;
    this.category = category;
    this.metadata = Object.freeze({ ...(metadata || {}) });

    // Make the instance immutable
    Object.freeze(this);
  }

  /**
   * Creates a domain logic error.
   * @param code Unique error code
   * @param message Human-readable error message
   * @param metadata Optional contextual metadata
   */
  public static domain(
    code: string,
    message: string,
    metadata?: Record<string, unknown> | null
  ): Error {
    return new Error(code, message, ErrorCategory.Domain, metadata);
  }

  /**
   * Creates a validation error.
   * @param code Unique error code
   * @param message Human-readable error message
   * @param metadata Optional contextual metadata
   */
  public static validation(
    code: string,
    message: string,
    metadata?: Record<string, unknown> | null
  ): Error {
    return new Error(code, message, ErrorCategory.Validation, metadata);
  }

  /**
   * Creates an infrastructure error.
   * @param code Unique error code
   * @param message Human-readable error message
   * @param metadata Optional contextual metadata
   */
  public static infrastructure(
    code: string,
    message: string,
    metadata?: Record<string, unknown> | null
  ): Error {
    return new Error(code, message, ErrorCategory.Infrastructure, metadata);
  }

  /**
   * Creates a concurrency error.
   * @param code Unique error code
   * @param message Human-readable error message
   * @param metadata Optional contextual metadata
   */
  public static concurrency(
    code: string,
    message: string,
    metadata?: Record<string, unknown> | null
  ): Error {
    return new Error(code, message, ErrorCategory.Concurrency, metadata);
  }

  /**
   * Creates a security error.
   * @param code Unique error code
   * @param message Human-readable error message
   * @param metadata Optional contextual metadata
   */
  public static security(
    code: string,
    message: string,
    metadata?: Record<string, unknown> | null
  ): Error {
    return new Error(code, message, ErrorCategory.Security, metadata);
  }

  /**
   * String representation of the error.
   */
  public toString(): string {
    return `${this.category}Error: ${this.code} - ${this.message}`;
  }
}