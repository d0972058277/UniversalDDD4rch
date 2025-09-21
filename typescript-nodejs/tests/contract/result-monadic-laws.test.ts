// Result Monadic Laws Contract Tests
// These tests verify that Result<T> satisfies the monadic laws:
// 1. Left Identity: M.of(a).flatMap(f) === f(a)
// 2. Right Identity: m.flatMap(M.of) === m
// 3. Associativity: m.flatMap(f).flatMap(g) === m.flatMap(x => f(x).flatMap(g))
// Following TDD: These tests MUST FAIL initially before implementation

import { Result, ResultOf } from '@/functional/result';
import { Error } from '@/functional/error';

describe('Result Monadic Laws Contract Tests', () => {
  // Test functions for monadic law verification
  const double = (x: number): ResultOf<number> => ResultOf.ok(x * 2);
  const addTen = (x: number): ResultOf<number> => ResultOf.ok(x + 10);
  const toString = (x: number): ResultOf<string> => ResultOf.ok(x.toString());
  const safeDivide = (x: number): ResultOf<number> =>
    x !== 0 ? ResultOf.ok(100 / x) : ResultOf.fail(Error.validation('DIVISION_BY_ZERO', 'Cannot divide by zero'));

  describe('Result Left Identity Law', () => {
    test('Should_SatisfyLeftIdentity_When_BindingSuccessValue', () => {
      // Given
      const value = 5;
      const f = double;

      // When
      const leftSide = ResultOf.ok(value).bind(f);
      const rightSide = f(value);

      // Then
      expect(leftSide.isSuccess).toBe(rightSide.isSuccess);
      if (leftSide.isSuccess && rightSide.isSuccess) {
        expect(leftSide.value).toBe(rightSide.value);
      }
    });

    test('Should_SatisfyLeftIdentity_When_BindingWithFailingFunction', () => {
      // Given
      const value = 0; // Will cause safeDivide to fail
      const f = safeDivide;

      // When
      const leftSide = ResultOf.ok(value).bind(f);
      const rightSide = f(value);

      // Then
      expect(leftSide.isSuccess).toBe(rightSide.isSuccess);
      expect(leftSide.isFailure).toBe(rightSide.isFailure);
      if (leftSide.isFailure && rightSide.isFailure) {
        expect(leftSide.error.code).toBe(rightSide.error.code);
        expect(leftSide.error.message).toBe(rightSide.error.message);
      }
    });

    test('Should_SatisfyLeftIdentity_When_BindingStringTransformation', () => {
      // Given
      const value = 42;
      const f = toString;

      // When
      const leftSide = ResultOf.ok(value).bind(f);
      const rightSide = f(value);

      // Then
      expect(leftSide.isSuccess).toBe(rightSide.isSuccess);
      if (leftSide.isSuccess && rightSide.isSuccess) {
        expect(leftSide.value).toBe(rightSide.value);
        expect(typeof leftSide.value).toBe('string');
      }
    });

    test('Should_SatisfyLeftIdentity_When_BindingComplexFunction', () => {
      // Given
      const value = 'hello';
      const complexF = (s: string): ResultOf<{ length: number; upper: string }> =>
        ResultOf.ok({ length: s.length, upper: s.toUpperCase() });

      // When
      const leftSide = ResultOf.ok(value).bind(complexF);
      const rightSide = complexF(value);

      // Then
      expect(leftSide.isSuccess).toBe(rightSide.isSuccess);
      if (leftSide.isSuccess && rightSide.isSuccess) {
        expect(leftSide.value).toEqual(rightSide.value);
      }
    });
  });

  describe('Result Right Identity Law', () => {
    test('Should_SatisfyRightIdentity_When_BindingWithResultOk', () => {
      // Given
      const successResult = ResultOf.ok(42);

      // When
      const leftSide = successResult.bind(Result.ok);
      const rightSide = successResult;

      // Then
      expect(leftSide.isSuccess).toBe(rightSide.isSuccess);
      if (leftSide.isSuccess && rightSide.isSuccess) {
        expect(leftSide.value).toBe(rightSide.value);
      }
    });

    test('Should_SatisfyRightIdentity_When_BindingFailureResult', () => {
      // Given
      const error = Error.domain('TEST_ERROR', 'Test error message');
      const failureResult = Result.fail<number>(error);

      // When
      const leftSide = failureResult.bind(Result.ok);
      const rightSide = failureResult;

      // Then
      expect(leftSide.isSuccess).toBe(rightSide.isSuccess);
      expect(leftSide.isFailure).toBe(rightSide.isFailure);
      if (leftSide.isFailure && rightSide.isFailure) {
        expect(leftSide.error).toEqual(rightSide.error);
      }
    });

    test('Should_SatisfyRightIdentity_When_BindingStringResult', () => {
      // Given
      const stringResult = ResultOf.ok('test string');

      // When
      const leftSide = stringResult.bind(Result.ok);
      const rightSide = stringResult;

      // Then
      expect(leftSide.isSuccess).toBe(rightSide.isSuccess);
      if (leftSide.isSuccess && rightSide.isSuccess) {
        expect(leftSide.value).toBe(rightSide.value);
      }
    });

    test('Should_SatisfyRightIdentity_When_BindingComplexObjectResult', () => {
      // Given
      const complexObject = { id: 1, data: [1, 2, 3], nested: { prop: 'value' } };
      const complexResult = ResultOf.ok(complexObject);

      // When
      const leftSide = complexResult.bind(Result.ok);
      const rightSide = complexResult;

      // Then
      expect(leftSide.isSuccess).toBe(rightSide.isSuccess);
      if (leftSide.isSuccess && rightSide.isSuccess) {
        expect(leftSide.value).toEqual(rightSide.value);
      }
    });
  });

  describe('Result Associativity Law', () => {
    test('Should_SatisfyAssociativity_When_ChainingSuccessfulOperations', () => {
      // Given
      const result = ResultOf.ok(5);
      const f = double;  // x => ResultOf.ok(x * 2)
      const g = addTen;  // x => ResultOf.ok(x + 10)

      // When
      const leftSide = result.bind(f).bind(g);
      const rightSide = result.bind(x => f(x).bind(g));

      // Then
      expect(leftSide.isSuccess).toBe(rightSide.isSuccess);
      if (leftSide.isSuccess && rightSide.isSuccess) {
        expect(leftSide.value).toBe(rightSide.value);
        expect(leftSide.value).toBe(20); // (5 * 2) + 10 = 20
      }
    });

    test('Should_SatisfyAssociativity_When_FirstOperationFails', () => {
      // Given
      const result = ResultOf.ok(0); // Will cause safeDivide to fail
      const f = safeDivide; // Will fail with division by zero
      const g = addTen;

      // When
      const leftSide = result.bind(f).bind(g);
      const rightSide = result.bind(x => f(x).bind(g));

      // Then
      expect(leftSide.isSuccess).toBe(rightSide.isSuccess);
      expect(leftSide.isFailure).toBe(rightSide.isFailure);
      if (leftSide.isFailure && rightSide.isFailure) {
        expect(leftSide.error.code).toBe(rightSide.error.code);
        expect(leftSide.error.message).toBe(rightSide.error.message);
      }
    });

    test('Should_SatisfyAssociativity_When_SecondOperationFails', () => {
      // Given
      const result = ResultOf.ok(5);
      const f = double; // x => ResultOf.ok(x * 2) = ResultOf.ok(10)
      const g = (x: number): ResultOf<number> =>
        x > 15 ? ResultOf.ok(x) : Error.validation('TOO_SMALL', 'Value too small');

      // When
      const leftSide = result.bind(f).bind(g);
      const rightSide = result.bind(x => f(x).bind(g));

      // Then
      expect(leftSide.isSuccess).toBe(rightSide.isSuccess);
      expect(leftSide.isFailure).toBe(rightSide.isFailure);
      if (leftSide.isFailure && rightSide.isFailure) {
        expect(leftSide.error.code).toBe(rightSide.error.code);
        expect(leftSide.error.message).toBe(rightSide.error.message);
      }
    });

    test('Should_SatisfyAssociativity_When_InitialResultIsFailure', () => {
      // Given
      const error = Error.infrastructure('INITIAL_ERROR', 'Initial failure');
      const result = Result.fail<number>(error);
      const f = double;
      const g = addTen;

      // When
      const leftSide = result.bind(f).bind(g);
      const rightSide = result.bind(x => f(x).bind(g));

      // Then
      expect(leftSide.isSuccess).toBe(rightSide.isSuccess);
      expect(leftSide.isFailure).toBe(rightSide.isFailure);
      if (leftSide.isFailure && rightSide.isFailure) {
        expect(leftSide.error).toEqual(rightSide.error);
      }
    });

    test('Should_SatisfyAssociativity_When_ChainingTypeTransformations', () => {
      // Given
      const result = ResultOf.ok(42);
      const f = toString;     // number => Result<string>
      const g = (s: string): ResultOf<number> => ResultOf.ok(s.length); // string => Result<number>

      // When
      const leftSide = result.bind(f).bind(g);
      const rightSide = result.bind(x => f(x).bind(g));

      // Then
      expect(leftSide.isSuccess).toBe(rightSide.isSuccess);
      if (leftSide.isSuccess && rightSide.isSuccess) {
        expect(leftSide.value).toBe(rightSide.value);
        expect(leftSide.value).toBe(2); // "42".length = 2
      }
    });

    test('Should_SatisfyAssociativity_When_ChainingComplexOperations', () => {
      // Given
      const result = ResultOf.ok({ count: 5, multiplier: 2 });
      const f = (obj: { count: number; multiplier: number }): ResultOf<number> =>
        ResultOf.ok(obj.count * obj.multiplier);
      const g = (n: number): ResultOf<string> =>
        n > 0 ? ResultOf.ok(`Count: ${n}`) : Error.validation('INVALID_COUNT', 'Count must be positive');

      // When
      const leftSide = result.bind(f).bind(g);
      const rightSide = result.bind(x => f(x).bind(g));

      // Then
      expect(leftSide.isSuccess).toBe(rightSide.isSuccess);
      if (leftSide.isSuccess && rightSide.isSuccess) {
        expect(leftSide.value).toBe(rightSide.value);
        expect(leftSide.value).toBe('Count: 10');
      }
    });
  });

  describe('Result Monadic Laws Integration', () => {
    test('Should_SatisfyAllLaws_When_CombiningWithRealWorldScenarios', () => {
      // Given - Simulate a real-world scenario with user data processing
      interface User {
        id: number;
        email: string;
        age: number;
      }

      const validateUser = (user: User): ResultOf<User> => {
        if (!user.email.includes('@')) {
          return Error.validation('INVALID_EMAIL', 'Email must contain @');
        }
        if (user.age < 0 || user.age > 120) {
          return Error.validation('INVALID_AGE', 'Age must be between 0 and 120');
        }
        return ResultOf.ok(user);
      };

      const normalizeEmail = (user: User): ResultOf<User> =>
        ResultOf.ok({ ...user, email: user.email.toLowerCase() });

      const calculateCategory = (user: User): ResultOf<string> => {
        if (user.age < 18) return ResultOf.ok('Minor');
        if (user.age < 65) return ResultOf.ok('Adult');
        return ResultOf.ok('Senior');
      };

      const validUser: User = { id: 1, email: 'John@Example.COM', age: 30 };

      // When - Apply all three laws in a realistic chain
      const result1 = ResultOf.ok(validUser);
      const result2 = result1.bind(validateUser).bind(normalizeEmail).bind(calculateCategory);
      const result3 = result1.bind(u => validateUser(u).bind(nu => normalizeEmail(nu).bind(calculateCategory)));

      // Then - Associativity should hold
      expect(result2.isSuccess).toBe(result3.isSuccess);
      if (result2.isSuccess && result3.isSuccess) {
        expect(result2.value).toBe(result3.value);
        expect(result2.value).toBe('Adult');
      }

      // Left Identity
      const leftIdentityResult1 = ResultOf.ok(validUser).bind(validateUser);
      const leftIdentityResult2 = validateUser(validUser);
      expect(leftIdentityResult1.isSuccess).toBe(leftIdentityResult2.isSuccess);

      // Right Identity
      const rightIdentityResult1 = result1.bind(Result.ok);
      expect(rightIdentityResult1.isSuccess).toBe(result1.isSuccess);
      if (rightIdentityResult1.isSuccess && result1.isSuccess) {
        expect(rightIdentityResult1.value).toEqual(result1.value);
      }
    });

    test('Should_SatisfyAllLaws_When_HandlingErrorScenarios', () => {
      // Given - Error scenarios that should still follow monadic laws
      const parseNumber = (s: string): ResultOf<number> => {
        const parsed = parseInt(s, 10);
        return isNaN(parsed)
          ? Error.validation('INVALID_NUMBER', 'Cannot parse number')
          : ResultOf.ok(parsed);
      };

      const makePositive = (n: number): ResultOf<number> =>
        n >= 0 ? ResultOf.ok(n) : Error.validation('NEGATIVE_NUMBER', 'Number must be positive');

      const doubleIt = (n: number): ResultOf<number> => ResultOf.ok(n * 2);

      const invalidInput = 'not-a-number';

      // When - Chain operations with error
      const chainResult1 = ResultOf.ok(invalidInput).bind(parseNumber).bind(makePositive).bind(doubleIt);
      const chainResult2 = ResultOf.ok(invalidInput).bind(s =>
        parseNumber(s).bind(n =>
          makePositive(n).bind(doubleIt)
        )
      );

      // Then - Should maintain associativity even with errors
      expect(chainResult1.isSuccess).toBe(chainResult2.isSuccess);
      expect(chainResult1.isFailure).toBe(chainResult2.isFailure);
      if (chainResult1.isFailure && chainResult2.isFailure) {
        expect(chainResult1.error.code).toBe(chainResult2.error.code);
      }
    });
  });

  describe('Result Performance in Monadic Chains', () => {
    test('Should_MaintainPerformance_When_ChainingManyOperations', () => {
      // Given
      const operations = Array.from({ length: 100 }, (_, i) =>
        (x: number): ResultOf<number> => ResultOf.ok(x + i)
      );

      // When
      const startTime = performance.now();
      let result = ResultOf.ok(0);
      for (const op of operations) {
        result = result.bind(op);
      }
      const endTime = performance.now();

      // Then
      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value).toBe(4950); // Sum of 0 to 99
      }
      expect(endTime - startTime).toBeLessThan(10); // Should be fast
    });
  });
});