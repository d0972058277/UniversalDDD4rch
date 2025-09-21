import { Error } from './error';
import { ResultOf } from './result';
import { IMaybe } from './interfaces/i-maybe';

/**
 * Represents an optional value that may or may not exist.
 * Provides type-safe handling of nullable values without null reference exceptions.
 */
export class Maybe<T> implements IMaybe<T> {
  private readonly _hasValue: boolean;
  private readonly _value: T | undefined;

  private constructor(hasValue: boolean, value?: T) {
    this._hasValue = hasValue;
    this._value = value;
    Object.freeze(this);
  }

  /** True if the Maybe contains a value */
  public get hasValue(): boolean {
    return this._hasValue;
  }

  /** The contained value (only accessible if hasValue is true) */
  public get value(): T {
    if (!this._hasValue) {
      throw new globalThis.Error('Cannot access value on None Maybe');
    }
    return this._value!;
  }

  /**
   * Creates a Maybe<T> that contains a value.
   */
  public static some<T>(value: T): Maybe<T> {
    return new Maybe<T>(true, value);
  }

  /**
   * Creates a Maybe<T> that contains no value.
   */
  public static none<T>(): Maybe<T> {
    return new Maybe<T>(false);
  }

  /**
   * Transforms the value inside Maybe<T> to Maybe<TResult> using the provided mapping function.
   * Returns None if the current Maybe is None.
   */
  public map<TResult>(func: (value: T) => TResult): Maybe<TResult> {
    if (this._hasValue) {
      try {
        return Maybe.some(func(this._value!));
      } catch (err) {
        // In strict functional programming, map shouldn't fail, but we handle it gracefully
        return Maybe.none<TResult>();
      }
    }
    return Maybe.none<TResult>();
  }

  /**
   * Chains Maybe operations, executing the next operation only if current Maybe has a value.
   */
  public bind<TResult>(func: (value: T) => Maybe<TResult>): Maybe<TResult> {
    if (this._hasValue) {
      try {
        return func(this._value!);
      } catch (err) {
        return Maybe.none<TResult>();
      }
    }
    return Maybe.none<TResult>();
  }

  /**
   * Returns the contained value or the provided default value if None.
   */
  public orElse(defaultValue: T): T;
  /**
   * Returns the contained value or the result of the provided factory function if None.
   */
  public orElse(defaultFactory: () => T): T;
  public orElse(defaultValueOrFactory: T | (() => T)): T {
    if (this._hasValue) {
      return this._value!;
    }

    if (typeof defaultValueOrFactory === 'function') {
      return (defaultValueOrFactory as () => T)();
    }

    return defaultValueOrFactory as T;
  }

  /**
   * Pattern matching for Maybe<T> - executes one of two functions based on Some/None state.
   */
  public match<TOut>(onSome: (value: T) => TOut, onNone: () => TOut): TOut {
    return this._hasValue ? onSome(this._value!) : onNone();
  }

  /**
   * Converts Maybe<T> to Result<T>, using the provided error when Maybe is None.
   */
  public toResult(errorWhenNone: Error): ResultOf<T> {
    return this._hasValue
      ? new ResultOf<T>(true, this._value!)
      : new ResultOf<T>(false, undefined, errorWhenNone);
  }

  /**
   * Implicit conversion from value to Maybe<T>.
   */
  public static fromValue<T>(value: T | null | undefined): Maybe<T> {
    return value != null ? Maybe.some(value) : Maybe.none<T>();
  }

  /**
   * Equality comparison for Maybe instances.
   */
  public equals(other: Maybe<T>): boolean {
    if (this._hasValue !== other._hasValue) {
      return false;
    }

    if (!this._hasValue) {
      return true; // Both are None
    }

    // Both have values, compare them
    return this._value === other._value;
  }

  /**
   * String representation of the Maybe.
   */
  public toString(): string {
    return this._hasValue ? `Some(${this._value})` : 'None';
  }
}