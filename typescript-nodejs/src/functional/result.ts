import { Error } from './error';

/**
 * Represents the result of an operation that can either succeed or fail.
 * Supports both void operations (Result) and value-returning operations (Result<T>).
 */

// Non-generic Result for operations without return value
export class Result {
  private readonly _isSuccess: boolean;
  private readonly _error: Error | undefined;

  private constructor(isSuccess: boolean, error?: Error) {
    this._isSuccess = isSuccess;
    this._error = error;
    Object.freeze(this);
  }

  /** True if the operation succeeded */
  public get isSuccess(): boolean {
    return this._isSuccess;
  }

  /** True if the operation failed */
  public get isFailure(): boolean {
    return !this._isSuccess;
  }

  /** Error information (only accessible if isFailure is true) */
  public get error(): Error {
    if (this._isSuccess) {
      throw new globalThis.Error('Cannot access error on successful Result');
    }
    return this._error!;
  }

  /**
   * Creates a successful Result.
   */
  public static ok(): Result;
  /**
   * Creates a successful Result<T> with a value.
   */
  public static ok<T>(value: T): ResultOf<T>;
  public static ok<T>(value?: T): Result | ResultOf<T> {
    if (arguments.length === 0) {
      return new Result(true);
    } else {
      return new ResultOf<T>(true, value);
    }
  }

  /**
   * Creates a failed Result with an error.
   */
  public static fail(error: Error): Result;
  /**
   * Creates a failed Result<T> with an error.
   */
  public static fail<T>(error: Error): ResultOf<T>;
  public static fail<T>(error: Error): Result | ResultOf<T> {
    // TypeScript can't determine the type at runtime, so we need a way to distinguish
    // For now, we'll always return ResultOf<T> and let type inference handle it
    return new ResultOf<T>(false, undefined, error);
  }

  /**
   * Transforms a successful Result into Result<T> using the provided factory function.
   */
  public map<T>(func: () => T): ResultOf<T> {
    if (this._isSuccess) {
      try {
        return new ResultOf<T>(true, func());
      } catch (err) {
        return new ResultOf<T>(false, undefined, Error.infrastructure('MAP_ERROR', `Map operation failed: ${err}`));
      }
    }
    return new ResultOf<T>(false, undefined, this._error!);
  }

  /**
   * Chains Result operations, executing the next operation only if current Result is successful.
   */
  public bind(func: () => Result): Result {
    if (this._isSuccess) {
      try {
        return func();
      } catch (err) {
        return new Result(false, Error.infrastructure('BIND_ERROR', `Bind operation failed: ${err}`));
      }
    }
    return this;
  }

  /**
   * Pattern matching for Result - executes one of two functions based on success/failure state.
   */
  public match<T>(onSuccess: () => T, onFailure: (error: Error) => T): T {
    return this._isSuccess ? onSuccess() : onFailure(this._error!);
  }

  /**
   * Implicit conversion from Error to Result (failed).
   */
  public static fromError(error: Error): Result {
    return new Result(false, error);
  }
}

/**
 * Generic Result<T> for operations that return a value.
 */
export class ResultOf<T> {
  private readonly _isSuccess: boolean;
  private readonly _value: T | undefined;
  private readonly _error: Error | undefined;

  constructor(isSuccess: boolean, value?: T, error?: Error) {
    this._isSuccess = isSuccess;
    this._value = value;
    this._error = error;
    Object.freeze(this);
  }

  /** True if the operation succeeded */
  public get isSuccess(): boolean {
    return this._isSuccess;
  }

  /** True if the operation failed */
  public get isFailure(): boolean {
    return !this._isSuccess;
  }

  /** The success value (only accessible if isSuccess is true) */
  public get value(): T {
    if (!this._isSuccess) {
      throw new globalThis.Error('Cannot access value on failed Result');
    }
    return this._value!;
  }

  /** Error information (only accessible if isFailure is true) */
  public get error(): Error {
    if (this._isSuccess) {
      throw new globalThis.Error('Cannot access error on successful Result');
    }
    return this._error!;
  }

  /**
   * Transforms a successful Result<T> into Result<TResult> using the provided mapping function.
   */
  public map<TResult>(func: (value: T) => TResult): ResultOf<TResult> {
    if (this._isSuccess) {
      try {
        return new ResultOf<TResult>(true, func(this._value!));
      } catch (err) {
        return new ResultOf<TResult>(false, undefined, Error.infrastructure('MAP_ERROR', `Map operation failed: ${err}`));
      }
    }
    return new ResultOf<TResult>(false, undefined, this._error!);
  }

  /**
   * Chains Result operations, executing the next operation only if current Result is successful.
   */
  public bind<TResult>(func: (value: T) => ResultOf<TResult>): ResultOf<TResult> {
    if (this._isSuccess) {
      try {
        return func(this._value!);
      } catch (err) {
        return new ResultOf<TResult>(false, undefined, Error.infrastructure('BIND_ERROR', `Bind operation failed: ${err}`));
      }
    }
    return new ResultOf<TResult>(false, undefined, this._error!);
  }

  /**
   * Pattern matching for Result<T> - executes one of two functions based on success/failure state.
   */
  public match<TOut>(onSuccess: (value: T) => TOut, onFailure: (error: Error) => TOut): TOut {
    return this._isSuccess ? onSuccess(this._value!) : onFailure(this._error!);
  }

  /**
   * Creates a Result<T> from a Maybe<T>, using the provided error when Maybe is None.
   */
  public static fromMaybe<T>(maybe: { hasValue: boolean; value: T }, errorWhenNone: Error): ResultOf<T> {
    return maybe.hasValue
      ? new ResultOf<T>(true, maybe.value)
      : new ResultOf<T>(false, undefined, errorWhenNone);
  }
}