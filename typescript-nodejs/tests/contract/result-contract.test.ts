// Result Contract Tests
// These tests define the behavioral contracts for Result and ResultOf<T> types
// Following TDD: These tests MUST FAIL initially before implementation

import { Result, ResultOf, Error, ErrorCategory, Maybe } from '../../src/functional';

describe('Result Contract Tests', () => {
  describe('Result (non-generic) Construction', () => {
    test('Should_CreateSuccessResult_When_CallingOk', () => {
      // Given/When
      const result = Result.ok();

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.isFailure).toBe(false);
    });

    test('Should_CreateFailureResult_When_CallingFail', () => {
      // Given
      const error = Error.domain('TEST', 'Test error');

      // When
      const result = Result.fail(error);

      // Then
      expect(result.isSuccess).toBe(false);
      expect(result.isFailure).toBe(true);
      expect(result.error).toEqual(error);
    });

    test('Should_CreateFailureResult_When_ImplicitlyConvertingFromError', () => {
      // Given
      const error = Error.validation('INVALID', 'Invalid input');

      // When
      const result: Result = error;

      // Then
      expect(result.isSuccess).toBe(false);
      expect(result.isFailure).toBe(true);
      expect(result.error).toEqual(error);
    });
  });

  describe('ResultOf<T> Construction', () => {
    test('Should_CreateSuccessResult_When_CallingOkWithValue', () => {
      // Given
      const value = 'test value';

      // When
      const result = ResultOf.ok(value);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.isFailure).toBe(false);
      expect(result.value).toBe(value);
    });

    test('Should_CreateFailureResult_When_CallingFailWithError', () => {
      // Given
      const error = Error.domain('TEST', 'Test error');

      // When
      const result = ResultOf.fail<string>(error);

      // Then
      expect(result.isSuccess).toBe(false);
      expect(result.isFailure).toBe(true);
      expect(result.error).toEqual(error);
    });
  });

  describe('Result (non-generic) Functional Operations', () => {
    test('Should_MapToResultOf_When_ResultIsSuccess', () => {
      // Given
      const result = Result.ok();
      const transform = () => 'mapped value';

      // When
      const mapped = result.map(transform);

      // Then
      expect(mapped.isSuccess).toBe(true);
      expect(mapped.value).toBe('mapped value');
    });

    test('Should_PropagateError_When_MappingFailedResult', () => {
      // Given
      const error = Error.validation('INVALID', 'Invalid value');
      const result = Result.fail(error);
      const transform = () => 'mapped value';

      // When
      const mapped = result.map(transform);

      // Then
      expect(mapped.isSuccess).toBe(false);
      expect(mapped.error).toEqual(error);
    });

    test('Should_ChainOperations_When_BindingSuccessfulResults', () => {
      // Given
      const result = Result.ok();
      const operation = () => Result.ok();

      // When
      const bound = result.bind(operation);

      // Then
      expect(bound.isSuccess).toBe(true);
    });

    test('Should_PropagateError_When_BindingFailedResult', () => {
      // Given
      const error = Error.domain('FAILED', 'Operation failed');
      const result = Result.fail(error);
      const operation = () => Result.ok();

      // When
      const bound = result.bind(operation);

      // Then
      expect(bound.isSuccess).toBe(false);
      expect(bound.error).toEqual(error);
    });
  });

  describe('ResultOf<T> Functional Operations', () => {
    test('Should_MapValue_When_ResultIsSuccess', () => {
      // Given
      const result = ResultOf.ok('hello');
      const transform = (s: string) => s.toUpperCase();

      // When
      const mapped = result.map(transform);

      // Then
      expect(mapped.isSuccess).toBe(true);
      expect(mapped.value).toBe('HELLO');
    });

    test('Should_PropagateError_When_MappingFailedResult', () => {
      // Given
      const error = Error.validation('INVALID', 'Invalid value');
      const result = ResultOf.fail<string>(error);
      const transform = (s: string) => s.toUpperCase();

      // When
      const mapped = result.map(transform);

      // Then
      expect(mapped.isSuccess).toBe(false);
      expect(mapped.error).toEqual(error);
    });

    test('Should_ChainOperations_When_BindingSuccessfulResults', () => {
      // Given
      const result = ResultOf.ok('test');
      const operation = (s: string) =>
        s.length > 0 ? ResultOf.ok(s.length) : ResultOf.fail<number>(Error.validation('EMPTY', 'Empty string'));

      // When
      const bound = result.bind(operation);

      // Then
      expect(bound.isSuccess).toBe(true);
      expect(bound.value).toBe(4);
    });

    test('Should_PropagateError_When_BindingFailedResult', () => {
      // Given
      const error = Error.domain('FAILED', 'Operation failed');
      const result = ResultOf.fail<string>(error);
      const operation = (s: string) => ResultOf.ok(s.length);

      // When
      const bound = result.bind(operation);

      // Then
      expect(bound.isSuccess).toBe(false);
      expect(bound.error).toEqual(error);
    });
  });

  describe('Result Pattern Matching', () => {
    test('Should_ExecuteSuccessCallback_When_ResultIsSuccess', () => {
      // Given
      const result = Result.ok();
      const onSuccess = () => 'success';
      const onFailure = (error: Error) => `Error: ${error.message}`;

      // When
      const matched = result.match(onSuccess, onFailure);

      // Then
      expect(matched).toBe('success');
    });

    test('Should_ExecuteFailureCallback_When_ResultIsFailure', () => {
      // Given
      const error = Error.infrastructure('NETWORK', 'Network error');
      const result = Result.fail(error);
      const onSuccess = () => 'success';
      const onFailure = (error: Error) => `Error: ${error.message}`;

      // When
      const matched = result.match(onSuccess, onFailure);

      // Then
      expect(matched).toBe('Error: Network error');
    });
  });

  describe('ResultOf<T> Pattern Matching', () => {
    test('Should_ExecuteSuccessCallback_When_ResultIsSuccess', () => {
      // Given
      const result = ResultOf.ok('success value');
      const onSuccess = (value: string) => `Processed: ${value}`;
      const onFailure = (error: Error) => `Error: ${error.message}`;

      // When
      const matched = result.match(onSuccess, onFailure);

      // Then
      expect(matched).toBe('Processed: success value');
    });

    test('Should_ExecuteFailureCallback_When_ResultIsFailure', () => {
      // Given
      const error = Error.infrastructure('NETWORK', 'Network error');
      const result = ResultOf.fail<string>(error);
      const onSuccess = (value: string) => `Processed: ${value}`;
      const onFailure = (error: Error) => `Error: ${error.message}`;

      // When
      const matched = result.match(onSuccess, onFailure);

      // Then
      expect(matched).toBe('Error: Network error');
    });
  });

  describe('ResultOf<T> Error Handling', () => {
    test('Should_ThrowError_When_AccessingValueOnFailedResult', () => {
      // Given
      const error = Error.validation('INVALID', 'Invalid input');
      const result = ResultOf.fail<string>(error);

      // When/Then
      expect(() => result.value).toThrow();
    });

    test('Should_ThrowError_When_AccessingErrorOnSuccessfulResult', () => {
      // Given
      const result = ResultOf.ok('success');

      // When/Then
      expect(() => result.error).toThrow();
    });
  });

  describe('ResultOf<T> Maybe Integration', () => {
    test('Should_ConvertFromSome_When_MaybeHasValue', () => {
      // Given
      const maybe = { hasValue: true, value: 'test' };
      const errorWhenNone = Error.domain('NO_VALUE', 'No value provided');

      // When
      const result = ResultOf.fromMaybe(maybe, errorWhenNone);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe('test');
    });

    test('Should_ConvertFromNone_When_MaybeHasNoValue', () => {
      // Given
      const maybe = { hasValue: false, value: undefined as any };
      const errorWhenNone = Error.domain('NO_VALUE', 'No value provided');

      // When
      const result = ResultOf.fromMaybe(maybe, errorWhenNone);

      // Then
      expect(result.isSuccess).toBe(false);
      expect(result.error).toEqual(errorWhenNone);
    });
  });
});