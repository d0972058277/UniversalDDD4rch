import { Error } from '../error';

// Forward declaration to avoid circular dependency
export interface ResultOf<T> {
  readonly isSuccess: boolean;
  readonly isFailure: boolean;
  readonly value: T;
  readonly error: Error;
}

/**
 * Interface for Maybe<T> type representing optional values.
 * Provides type-safe handling of nullable values without null reference exceptions.
 */
export interface IMaybe<T> {
  /** True if the Maybe contains a value */
  readonly hasValue: boolean;

  /** The contained value (only accessible if hasValue is true) */
  readonly value: T;

  /**
   * Transforms the value inside Maybe<T> to Maybe<TResult> using the provided mapping function.
   * Returns None if the current Maybe is None.
   * @param func Function to transform the value
   */
  map<TResult>(func: (value: T) => TResult): IMaybe<TResult>;

  /**
   * Chains Maybe operations, executing the next operation only if current Maybe has a value.
   * @param func Function that takes the current value and returns another Maybe
   */
  bind<TResult>(func: (value: T) => IMaybe<TResult>): IMaybe<TResult>;

  /**
   * Returns the contained value or the provided default value if None.
   * @param defaultValue Value to return if Maybe is None
   */
  orElse(defaultValue: T): T;

  /**
   * Returns the contained value or the result of the provided factory function if None.
   * @param defaultFactory Function to create default value if Maybe is None
   */
  orElse(defaultFactory: () => T): T;

  /**
   * Pattern matching for Maybe<T> - executes one of two functions based on Some/None state.
   * @param onSome Function to execute when Maybe has a value
   * @param onNone Function to execute when Maybe is None
   */
  match<TOut>(onSome: (value: T) => TOut, onNone: () => TOut): TOut;

  /**
   * Converts Maybe<T> to Result<T>, using the provided error when Maybe is None.
   * @param errorWhenNone Error to use when Maybe is None
   */
  toResult(errorWhenNone: Error): ResultOf<T>;
}