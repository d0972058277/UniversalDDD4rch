import { Error } from '../error';

/**
 * Interface for non-generic Result type (success/failure without value).
 */
export interface IResult {
  /** True if the operation succeeded */
  readonly isSuccess: boolean;

  /** True if the operation failed */
  readonly isFailure: boolean;

  /** Error information (only accessible if isFailure is true) */
  readonly error: Error;

  /**
   * Transforms a successful Result into Result<T> using the provided factory function.
   * @param func Factory function to create the value for success case
   */
  map<T>(func: () => T): IResultOf<T>;

  /**
   * Chains Result operations, executing the next operation only if current Result is successful.
   * @param func Function that returns another Result
   */
  bind(func: () => IResult): IResult;

  /**
   * Pattern matching for Result - executes one of two functions based on success/failure state.
   * @param onSuccess Function to execute for success case
   * @param onFailure Function to execute for failure case
   */
  match<T>(onSuccess: () => T, onFailure: (error: Error) => T): T;
}

/**
 * Interface for generic Result<T> type (success with value or failure).
 */
export interface IResultOf<T> {
  /** True if the operation succeeded */
  readonly isSuccess: boolean;

  /** True if the operation failed */
  readonly isFailure: boolean;

  /** The success value (only accessible if isSuccess is true) */
  readonly value: T;

  /** Error information (only accessible if isFailure is true) */
  readonly error: Error;

  /**
   * Transforms a successful Result<T> into Result<TResult> using the provided mapping function.
   * @param func Function to transform the value
   */
  map<TResult>(func: (value: T) => TResult): IResultOf<TResult>;

  /**
   * Chains Result operations, executing the next operation only if current Result is successful.
   * @param func Function that takes the current value and returns another Result
   */
  bind<TResult>(func: (value: T) => IResultOf<TResult>): IResultOf<TResult>;

  /**
   * Pattern matching for Result<T> - executes one of two functions based on success/failure state.
   * @param onSuccess Function to execute for success case
   * @param onFailure Function to execute for failure case
   */
  match<TOut>(onSuccess: (value: T) => TOut, onFailure: (error: Error) => TOut): TOut;
}