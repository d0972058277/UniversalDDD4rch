import { ErrorCategory } from '../error-category';

/**
 * Interface for structured error information in functional programming patterns.
 * Provides categorized error details with optional metadata for context.
 */
export interface IError {
  /** Unique error code for identification and handling */
  readonly code: string;

  /** Human-readable error message */
  readonly message: string;

  /** Category classification of the error */
  readonly category: ErrorCategory;

  /** Additional contextual metadata about the error */
  readonly metadata: Readonly<Record<string, unknown>>;
}