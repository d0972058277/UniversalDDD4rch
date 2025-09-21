import { Result, ResultOf } from './result';
import { Maybe } from './maybe';

/**
 * Type guard functions for functional types.
 * These functions provide runtime type checking and TypeScript type narrowing.
 */

/**
 * Type guard to check if a Result is successful.
 * @param result The Result to check
 * @returns True if the Result represents success
 */
export function isSuccess(result: Result): boolean;
export function isSuccess<T>(result: ResultOf<T>): boolean;
export function isSuccess<T>(result: Result | ResultOf<T>): boolean {
  return result.isSuccess;
}

/**
 * Type guard to check if a Result is a failure.
 * @param result The Result to check
 * @returns True if the Result represents failure
 */
export function isFailure(result: Result): boolean;
export function isFailure<T>(result: ResultOf<T>): boolean;
export function isFailure<T>(result: Result | ResultOf<T>): boolean {
  return result.isFailure;
}

/**
 * Type guard to check if a Maybe contains a value.
 * @param maybe The Maybe to check
 * @returns True if the Maybe contains a value
 */
export function isSome<T>(maybe: Maybe<T>): maybe is Maybe<T> & { readonly value: T } {
  return maybe.hasValue;
}

/**
 * Type guard to check if a Maybe is None.
 * @param maybe The Maybe to check
 * @returns True if the Maybe is None
 */
export function isNone<T>(maybe: Maybe<T>): boolean {
  return !maybe.hasValue;
}

/**
 * Type guard to check if a value is a Result.
 * @param value The value to check
 * @returns True if the value is a Result
 */
export function isResult(value: unknown): value is Result {
  return (
    typeof value === 'object' &&
    value !== null &&
    'isSuccess' in value &&
    'isFailure' in value &&
    typeof (value as any).isSuccess === 'boolean' &&
    typeof (value as any).isFailure === 'boolean'
  );
}

/**
 * Type guard to check if a value is a Result<T>.
 * @param value The value to check
 * @returns True if the value is a Result<T>
 */
export function isResultOf<T>(value: unknown): value is ResultOf<T> {
  return (
    isResult(value) &&
    ('value' in value || 'error' in value)
  );
}

/**
 * Type guard to check if a value is a Maybe<T>.
 * @param value The value to check
 * @returns True if the value is a Maybe<T>
 */
export function isMaybe<T>(value: unknown): value is Maybe<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'hasValue' in value &&
    typeof (value as any).hasValue === 'boolean'
  );
}

/**
 * Utility function to safely access value from Maybe with type narrowing.
 * @param maybe The Maybe to extract value from
 * @returns The value if present, undefined otherwise
 */
export function getValue<T>(maybe: Maybe<T>): T | undefined {
  return isSome(maybe) ? maybe.value : undefined;
}

/**
 * Utility function to safely access value from Result with type narrowing.
 * @param result The Result to extract value from
 * @returns The value if successful, undefined otherwise
 */
export function getResultValue<T>(result: ResultOf<T>): T | undefined {
  return isSuccess(result) ? result.value : undefined;
}