// Entity Contract Tests
// These tests define the behavioral contracts for Entity<TId> abstract class
// Following TDD: These tests MUST FAIL initially before implementation

import { Entity } from '@/domain/entity';

// Test implementations for contract validation
class TestOrderId {
  constructor(public readonly value: string) {}

  toString(): string {
    return this.value;
  }
}

class TestOrder extends Entity<TestOrderId> {
  constructor(
    id: TestOrderId,
    public readonly customerId: string,
    public readonly amount: number
  ) {
    super(id);
  }
}

class TestCustomerId {
  constructor(public readonly value: string) {}

  toString(): string {
    return this.value;
  }
}

class TestCustomer extends Entity<TestCustomerId> {
  constructor(
    id: TestCustomerId,
    public readonly name: string
  ) {
    super(id);
  }
}

describe('Entity Contract Tests', () => {
  describe('Entity Construction', () => {
    test('Should_SetId_When_CreatingEntity', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');

      // When
      const order = new TestOrder(orderId, 'CUST-001', 100.50);

      // Then
      expect(order.id).toBe(orderId);
      expect(order.id.value).toBe('ORDER-001');
    });

    test('Should_ThrowError_When_CreatingEntityWithNullId', () => {
      // Given/When/Then
      expect(() => new TestOrder(null as any, 'CUST-001', 100)).toThrow();
    });

    test('Should_ThrowError_When_CreatingEntityWithUndefinedId', () => {
      // Given/When/Then
      expect(() => new TestOrder(undefined as any, 'CUST-001', 100)).toThrow();
    });

    test('Should_PreventIdMutation_When_EntityCreated', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');
      const order = new TestOrder(orderId, 'CUST-001', 100);

      // When/Then
      expect(() => {
        // @ts-expect-error - Testing immutability
        order.id = new TestOrderId('ORDER-002');
      }).toThrow();
    });
  });

  describe('Entity Equality', () => {
    test('Should_BeEqual_When_SameIdAndType', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');
      const order1 = new TestOrder(orderId, 'CUST-001', 100);
      const order2 = new TestOrder(orderId, 'CUST-002', 200); // Different properties, same ID

      // When/Then
      expect(order1.equals(order2)).toBe(true);
      expect(order1 == order2).toBe(true);
    });

    test('Should_BeEqual_When_SameIdValueButDifferentInstances', () => {
      // Given
      const orderId1 = new TestOrderId('ORDER-001');
      const orderId2 = new TestOrderId('ORDER-001');
      const order1 = new TestOrder(orderId1, 'CUST-001', 100);
      const order2 = new TestOrder(orderId2, 'CUST-001', 100);

      // When/Then
      expect(order1.equals(order2)).toBe(true);
      expect(order1 == order2).toBe(true);
    });

    test('Should_NotBeEqual_When_DifferentIds', () => {
      // Given
      const orderId1 = new TestOrderId('ORDER-001');
      const orderId2 = new TestOrderId('ORDER-002');
      const order1 = new TestOrder(orderId1, 'CUST-001', 100);
      const order2 = new TestOrder(orderId2, 'CUST-001', 100);

      // When/Then
      expect(order1.equals(order2)).toBe(false);
      expect(order1 == order2).toBe(false);
    });

    test('Should_NotBeEqual_When_DifferentEntityTypes', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');
      const customerId = new TestCustomerId('ORDER-001'); // Same string value, different type
      const order = new TestOrder(orderId, 'CUST-001', 100);
      const customer = new TestCustomer(customerId, 'John Doe');

      // When/Then
      expect(order.equals(customer as any)).toBe(false);
      expect(order == (customer as any)).toBe(false);
    });

    test('Should_NotBeEqual_When_ComparedWithNull', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');
      const order = new TestOrder(orderId, 'CUST-001', 100);

      // When/Then
      expect(order.equals(null)).toBe(false);
      expect(order == null).toBe(false);
    });

    test('Should_NotBeEqual_When_ComparedWithUndefined', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');
      const order = new TestOrder(orderId, 'CUST-001', 100);

      // When/Then
      expect(order.equals(undefined)).toBe(false);
      expect(order == undefined).toBe(false);
    });

    test('Should_BeReflexive_When_ComparingEntityWithItself', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');
      const order = new TestOrder(orderId, 'CUST-001', 100);

      // When/Then
      expect(order.equals(order)).toBe(true);
      expect(order == order).toBe(true);
    });
  });

  describe('Entity HashCode', () => {
    test('Should_HaveSameHashCode_When_EntitiesAreEqual', () => {
      // Given
      const orderId1 = new TestOrderId('ORDER-001');
      const orderId2 = new TestOrderId('ORDER-001');
      const order1 = new TestOrder(orderId1, 'CUST-001', 100);
      const order2 = new TestOrder(orderId2, 'CUST-002', 200);

      // When/Then
      expect(order1.getHashCode()).toBe(order2.getHashCode());
    });

    test('Should_HaveDifferentHashCode_When_EntitiesHaveDifferentIds', () => {
      // Given
      const orderId1 = new TestOrderId('ORDER-001');
      const orderId2 = new TestOrderId('ORDER-002');
      const order1 = new TestOrder(orderId1, 'CUST-001', 100);
      const order2 = new TestOrder(orderId2, 'CUST-001', 100);

      // When/Then
      expect(order1.getHashCode()).not.toBe(order2.getHashCode());
    });

    test('Should_BeConsistent_When_HashCodeCalledMultipleTimes', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');
      const order = new TestOrder(orderId, 'CUST-001', 100);

      // When
      const hash1 = order.getHashCode();
      const hash2 = order.getHashCode();

      // Then
      expect(hash1).toBe(hash2);
    });

    test('Should_BaseHashCodeOnId_When_OtherPropertiesChange', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');
      const order = new TestOrder(orderId, 'CUST-001', 100);
      const initialHash = order.getHashCode();

      // When - Change other properties (if they were mutable)
      // Note: In this design, properties should be immutable, but testing the principle
      const sameIdOrder = new TestOrder(orderId, 'CUST-999', 999.99);

      // Then
      expect(sameIdOrder.getHashCode()).toBe(initialHash);
    });
  });

  describe('Entity Inequality Operators', () => {
    test('Should_ReturnFalse_When_UsingNotEqualOperatorOnEqualEntities', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');
      const order1 = new TestOrder(orderId, 'CUST-001', 100);
      const order2 = new TestOrder(orderId, 'CUST-002', 200);

      // When/Then
      expect(order1 != order2).toBe(false);
    });

    test('Should_ReturnTrue_When_UsingNotEqualOperatorOnDifferentEntities', () => {
      // Given
      const orderId1 = new TestOrderId('ORDER-001');
      const orderId2 = new TestOrderId('ORDER-002');
      const order1 = new TestOrder(orderId1, 'CUST-001', 100);
      const order2 = new TestOrder(orderId2, 'CUST-001', 100);

      // When/Then
      expect(order1 != order2).toBe(true);
    });
  });

  describe('Entity Type Safety', () => {
    test('Should_EnforceIdTypeConstraint_When_CreatingEntity', () => {
      // Given/When/Then
      // This test verifies TypeScript compile-time type safety
      const orderId = new TestOrderId('ORDER-001');
      const order = new TestOrder(orderId, 'CUST-001', 100);

      // Should not allow assignment of wrong ID type
      // const wrongId: TestCustomerId = order.id; // This should cause TypeScript error
      expect(order.id).toBeInstanceOf(TestOrderId);
    });

    test('Should_MaintainGenericTypeInheritance_When_DefiningEntitySubclass', () => {
      // Given
      class SpecialOrderId extends TestOrderId {
        constructor(value: string, public readonly prefix: string) {
          super(`${prefix}-${value}`);
        }
      }

      class SpecialOrder extends Entity<SpecialOrderId> {
        constructor(id: SpecialOrderId) {
          super(id);
        }
      }

      // When
      const specialId = new SpecialOrderId('001', 'SPECIAL');
      const specialOrder = new SpecialOrder(specialId);

      // Then
      expect(specialOrder.id).toBeInstanceOf(SpecialOrderId);
      expect(specialOrder.id.prefix).toBe('SPECIAL');
    });
  });

  describe('Entity Immutability', () => {
    test('Should_PreventDirectIdModification_When_EntityCreated', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');
      const order = new TestOrder(orderId, 'CUST-001', 100);

      // When/Then
      expect(() => {
        // @ts-expect-error - Testing immutability
        order.id = new TestOrderId('ORDER-002');
      }).toThrow();
    });

    test('Should_AllowIdAccessButNotModification_When_EntityExists', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');
      const order = new TestOrder(orderId, 'CUST-001', 100);

      // When
      const retrievedId = order.id;

      // Then
      expect(retrievedId).toBe(orderId);
      expect(retrievedId.value).toBe('ORDER-001');
    });
  });

  describe('Entity Performance', () => {
    test('Should_PerformEqualityCheckEfficiently_When_ComparingManyEntities', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');
      const order1 = new TestOrder(orderId, 'CUST-001', 100);
      const order2 = new TestOrder(orderId, 'CUST-002', 200);
      const iterations = 10000;

      // When
      const startTime = performance.now();
      for (let i = 0; i < iterations; i++) {
        order1.equals(order2);
      }
      const endTime = performance.now();

      // Then
      const averageTime = (endTime - startTime) / iterations;
      expect(averageTime).toBeLessThan(0.05); // Should be very fast (< 0.05ms per comparison)
    });

    test('Should_CacheHashCode_When_ComputedOnce', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');
      const order = new TestOrder(orderId, 'CUST-001', 100);

      // When
      const startTime = performance.now();
      order.getHashCode(); // First call
      const firstCallTime = performance.now() - startTime;

      const startTime2 = performance.now();
      order.getHashCode(); // Second call (should be cached)
      const secondCallTime = performance.now() - startTime2;

      // Then
      expect(secondCallTime).toBeLessThan(firstCallTime);
    });
  });

  describe('Entity toString', () => {
    test('Should_ProvideStringRepresentation_When_CallingToString', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');
      const order = new TestOrder(orderId, 'CUST-001', 100);

      // When
      const stringValue = order.toString();

      // Then
      expect(typeof stringValue).toBe('string');
      expect(stringValue).toContain('TestOrder');
      expect(stringValue).toContain('ORDER-001');
    });
  });
});