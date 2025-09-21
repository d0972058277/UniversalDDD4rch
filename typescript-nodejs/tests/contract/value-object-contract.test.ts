// ValueObject Contract Tests
// These tests define the behavioral contracts for ValueObject abstract class
// Following TDD: These tests MUST FAIL initially before implementation

import { ValueObject } from '@/domain/value-object';

// Test implementation for contract validation
class TestMoney extends ValueObject {
  constructor(
    public readonly amount: number,
    public readonly currency: string
  ) {
    super();
  }

  protected getEqualityComponents(): readonly unknown[] {
    return [this.amount, this.currency] as const;
  }
}

class TestPersonName extends ValueObject {
  constructor(
    public readonly firstName: string,
    public readonly lastName: string
  ) {
    super();
  }

  protected getEqualityComponents(): readonly unknown[] {
    return [this.firstName, this.lastName] as const;
  }
}

class TestAddressWithNulls extends ValueObject {
  constructor(
    public readonly street: string,
    public readonly city: string,
    public readonly zipCode: string | null
  ) {
    super();
  }

  protected getEqualityComponents(): readonly unknown[] {
    return [this.street, this.city, this.zipCode] as const;
  }
}

describe('ValueObject Contract Tests', () => {
  describe('ValueObject Equality', () => {
    test('Should_BeEqual_When_AllComponentsAreEqual', () => {
      // Given
      const money1 = new TestMoney(100.50, 'USD');
      const money2 = new TestMoney(100.50, 'USD');

      // When/Then
      expect(money1.equals(money2)).toBe(true);
      expect(money1 == money2).toBe(true); // Operator overload
      expect(money1 === money2).toBe(false); // Reference equality should be false
    });

    test('Should_NotBeEqual_When_AnyComponentDiffers', () => {
      // Given
      const money1 = new TestMoney(100.50, 'USD');
      const money2 = new TestMoney(100.50, 'EUR');
      const money3 = new TestMoney(200.50, 'USD');

      // When/Then
      expect(money1.equals(money2)).toBe(false);
      expect(money1.equals(money3)).toBe(false);
      expect(money1 == money2).toBe(false);
      expect(money1 == money3).toBe(false);
    });

    test('Should_NotBeEqual_When_ComparedWithNull', () => {
      // Given
      const money = new TestMoney(100, 'USD');

      // When/Then
      expect(money.equals(null)).toBe(false);
      expect(money == null).toBe(false);
    });

    test('Should_NotBeEqual_When_ComparedWithUndefined', () => {
      // Given
      const money = new TestMoney(100, 'USD');

      // When/Then
      expect(money.equals(undefined)).toBe(false);
      expect(money == undefined).toBe(false);
    });

    test('Should_NotBeEqual_When_ComparedWithDifferentType', () => {
      // Given
      const money = new TestMoney(100, 'USD');
      const name = new TestPersonName('John', 'Doe');

      // When/Then
      expect(money.equals(name)).toBe(false);
      expect((money as any) == (name as any)).toBe(false);
    });

    test('Should_BeEqual_When_ComponentsIncludeNullValues', () => {
      // Given
      const address1 = new TestAddressWithNulls('123 Main St', 'Anytown', null);
      const address2 = new TestAddressWithNulls('123 Main St', 'Anytown', null);

      // When/Then
      expect(address1.equals(address2)).toBe(true);
      expect(address1 == address2).toBe(true);
    });

    test('Should_NotBeEqual_When_OneNullOneNotNull', () => {
      // Given
      const address1 = new TestAddressWithNulls('123 Main St', 'Anytown', null);
      const address2 = new TestAddressWithNulls('123 Main St', 'Anytown', '12345');

      // When/Then
      expect(address1.equals(address2)).toBe(false);
      expect(address1 == address2).toBe(false);
    });
  });

  describe('ValueObject HashCode', () => {
    test('Should_HaveSameHashCode_When_ObjectsAreEqual', () => {
      // Given
      const money1 = new TestMoney(100.50, 'USD');
      const money2 = new TestMoney(100.50, 'USD');

      // When/Then
      expect(money1.getHashCode()).toBe(money2.getHashCode());
    });

    test('Should_HaveDifferentHashCode_When_ObjectsAreNotEqual', () => {
      // Given
      const money1 = new TestMoney(100.50, 'USD');
      const money2 = new TestMoney(100.50, 'EUR');

      // When/Then
      expect(money1.getHashCode()).not.toBe(money2.getHashCode());
    });

    test('Should_HaveConsistentHashCode_When_CalledMultipleTimes', () => {
      // Given
      const money = new TestMoney(100.50, 'USD');

      // When
      const hash1 = money.getHashCode();
      const hash2 = money.getHashCode();

      // Then
      expect(hash1).toBe(hash2);
    });

    test('Should_HandleNullComponents_When_ComputingHashCode', () => {
      // Given
      const address = new TestAddressWithNulls('123 Main St', 'Anytown', null);

      // When/Then
      expect(() => address.getHashCode()).not.toThrow();
      expect(typeof address.getHashCode()).toBe('number');
    });
  });

  describe('ValueObject Inequality Operators', () => {
    test('Should_ReturnFalse_When_UsingNotEqualOperatorOnEqualObjects', () => {
      // Given
      const money1 = new TestMoney(100, 'USD');
      const money2 = new TestMoney(100, 'USD');

      // When/Then
      expect(money1 != money2).toBe(false);
    });

    test('Should_ReturnTrue_When_UsingNotEqualOperatorOnDifferentObjects', () => {
      // Given
      const money1 = new TestMoney(100, 'USD');
      const money2 = new TestMoney(200, 'USD');

      // When/Then
      expect(money1 != money2).toBe(true);
    });
  });

  describe('ValueObject Immutability', () => {
    test('Should_BeImmutable_When_CreatingValueObject', () => {
      // Given
      const money = new TestMoney(100, 'USD');

      // When/Then
      expect(() => {
        // @ts-expect-error - Testing immutability
        money.amount = 200;
      }).toThrow();

      expect(() => {
        // @ts-expect-error - Testing immutability
        money.currency = 'EUR';
      }).toThrow();
    });

    test('Should_PreventMutationOfComponents_When_ValueObjectCreated', () => {
      // Given
      const money = new TestMoney(100, 'USD');

      // When
      const components = (money as any).getEqualityComponents();

      // Then
      expect(() => {
        // Testing immutability - components should be readonly
        (components as any)[0] = 200;
      }).toThrow();
    });
  });

  describe('ValueObject toString', () => {
    test('Should_ProvideStringRepresentation_When_CallingToString', () => {
      // Given
      const money = new TestMoney(100.50, 'USD');

      // When
      const stringValue = money.toString();

      // Then
      expect(typeof stringValue).toBe('string');
      expect(stringValue.length).toBeGreaterThan(0);
      expect(stringValue).toContain('TestMoney');
    });

    test('Should_BeDifferent_When_ToStringOnDifferentObjects', () => {
      // Given
      const money1 = new TestMoney(100, 'USD');
      const money2 = new TestMoney(200, 'EUR');

      // When
      const string1 = money1.toString();
      const string2 = money2.toString();

      // Then
      expect(string1).not.toBe(string2);
    });
  });

  describe('ValueObject Performance', () => {
    test('Should_CacheHashCode_When_ComputedOnce', () => {
      // Given
      const money = new TestMoney(100, 'USD');

      // When
      const startTime = performance.now();
      money.getHashCode(); // First call
      const firstCallTime = performance.now() - startTime;

      const startTime2 = performance.now();
      money.getHashCode(); // Second call (should be cached)
      const secondCallTime = performance.now() - startTime2;

      // Then
      expect(secondCallTime).toBeLessThan(firstCallTime);
    });

    test('Should_PerformEqualityCheckEfficiently_When_ComparingManyObjects', () => {
      // Given
      const money1 = new TestMoney(100, 'USD');
      const money2 = new TestMoney(100, 'USD');
      const iterations = 10000;

      // When
      const startTime = performance.now();
      for (let i = 0; i < iterations; i++) {
        money1.equals(money2);
      }
      const endTime = performance.now();

      // Then
      const averageTime = (endTime - startTime) / iterations;
      expect(averageTime).toBeLessThan(0.1); // Should be very fast (< 0.1ms per comparison)
    });
  });

  describe('ValueObject Complex Scenarios', () => {
    test('Should_HandleComplexNestedStructures_When_ComparingEquality', () => {
      // Given
      class TestComplexValue extends ValueObject {
        constructor(
          public readonly id: number,
          public readonly data: { name: string; values: number[] },
          public readonly timestamp: Date
        ) {
          super();
        }

        protected getEqualityComponents(): readonly unknown[] {
          return [
            this.id,
            this.data.name,
            JSON.stringify(this.data.values),
            this.timestamp.getTime()
          ] as const;
        }
      }

      const complex1 = new TestComplexValue(
        1,
        { name: 'test', values: [1, 2, 3] },
        new Date('2023-01-01')
      );
      const complex2 = new TestComplexValue(
        1,
        { name: 'test', values: [1, 2, 3] },
        new Date('2023-01-01')
      );

      // When/Then
      expect(complex1.equals(complex2)).toBe(true);
    });

    test('Should_HandleCollectionsInComponents_When_ComparingEquality', () => {
      // Given
      class TestCollectionValue extends ValueObject {
        constructor(
          public readonly tags: readonly string[],
          public readonly scores: readonly number[]
        ) {
          super();
        }

        protected getEqualityComponents(): readonly unknown[] {
          return [
            JSON.stringify(this.tags),
            JSON.stringify(this.scores)
          ] as const;
        }
      }

      const collection1 = new TestCollectionValue(['a', 'b', 'c'], [1, 2, 3]);
      const collection2 = new TestCollectionValue(['a', 'b', 'c'], [1, 2, 3]);
      const collection3 = new TestCollectionValue(['a', 'b'], [1, 2, 3]);

      // When/Then
      expect(collection1.equals(collection2)).toBe(true);
      expect(collection1.equals(collection3)).toBe(false);
    });
  });
});