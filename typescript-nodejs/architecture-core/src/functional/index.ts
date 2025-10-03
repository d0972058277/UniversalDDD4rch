/**
 * Functional Programming Types for Architecture.Core
 *
 * This module provides functional programming abstractions for error handling
 * and optional value management without relying on exceptions or null values.
 */

// Error types and categories
export { ErrorCategory } from './error-category';
export { IError } from './interfaces/i-error';
export { Error } from './error';

// Result types for operation outcomes
export { IResult, IResultOf } from './interfaces/i-result';
export { Result, ResultOf } from './result';

// Maybe types for optional values
export { IMaybe } from './interfaces/i-maybe';
export { Maybe } from './maybe';

// Type guards and utilities
export {
  isSuccess,
  isFailure,
  isSome,
  isNone,
  isResult,
  isResultOf,
  isMaybe,
  getValue,
  getResultValue,
} from './type-guards';