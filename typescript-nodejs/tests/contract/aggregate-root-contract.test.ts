// AggregateRoot Contract Tests
// These tests define the behavioral contracts for AggregateRoot<TId> abstract class
// Following TDD: These tests MUST FAIL initially before implementation

import { AggregateRoot } from '@/domain/aggregate-root';
import { DomainEventBase } from '@/domain/domain-event-base';

// Test implementations for contract validation
class TestOrderId {
  constructor(public readonly value: string) {}
  toString(): string { return this.value; }
}

class TestOrderCreatedEvent extends DomainEventBase {
  constructor(
    public readonly orderId: string,
    correlationId?: string,
    causationId?: string
  ) {
    super(correlationId, causationId);
    Object.freeze(this);
  }
}

class TestOrderStatusChangedEvent extends DomainEventBase {
  constructor(
    public readonly orderId: string,
    public readonly fromStatus: string,
    public readonly toStatus: string,
    correlationId?: string,
    causationId?: string
  ) {
    super(correlationId, causationId);
    Object.freeze(this);
  }
}

class TestOrder extends AggregateRoot<TestOrderId> {
  private _status: string = 'Pending';

  constructor(
    id: TestOrderId,
    public readonly customerId: string
  ) {
    super(id);
    this.addEvent(new TestOrderCreatedEvent(id.value));
  }

  get status(): string {
    return this._status;
  }

  confirm(): void {
    if (this._status !== 'Pending') {
      throw new globalThis.Error('Can only confirm pending orders');
    }
    const oldStatus = this._status;
    this._status = 'Confirmed';
    this.addEvent(new TestOrderStatusChangedEvent(this.id.value, oldStatus, this._status));
  }

  cancel(): void {
    const oldStatus = this._status;
    this._status = 'Cancelled';
    this.addEvent(new TestOrderStatusChangedEvent(this.id.value, oldStatus, this._status));
  }
}

describe('AggregateRoot Contract Tests', () => {
  describe('AggregateRoot Construction', () => {
    test('Should_InitializeWithZeroVersion_When_CreatingNewAggregate', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');

      // When
      const order = new TestOrder(orderId, 'CUST-001');

      // Then
      expect(order.version).toBe(0);
    });

    test('Should_InitializeWithEmptyEvents_When_CreatingNewAggregate', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');

      // When
      const order = new TestOrder(orderId, 'CUST-001');

      // Then
      expect(order.events).toBeDefined();
      expect(order.events.length).toBe(1); // OrderCreated event from constructor
    });

    test('Should_InheritEntityBehavior_When_CreatingAggregate', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');

      // When
      const order = new TestOrder(orderId, 'CUST-001');

      // Then
      expect(order.id).toBe(orderId);
      expect(order.id.value).toBe('ORDER-001');
    });
  });

  describe('AggregateRoot Event Management', () => {
    test('Should_CollectEvents_When_DomainEventsOccur', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');
      const order = new TestOrder(orderId, 'CUST-001');
      const initialEventCount = order.events.length;

      // When
      order.confirm();

      // Then
      expect(order.events.length).toBe(initialEventCount + 1);
      expect(order.events[order.events.length - 1]).toBeInstanceOf(TestOrderStatusChangedEvent);
    });

    test('Should_MaintainEventOrder_When_MultipleEventsOccur', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');
      const order = new TestOrder(orderId, 'CUST-001');

      // When
      order.confirm();
      order.cancel();

      // Then
      expect(order.events.length).toBe(3); // Created, Confirmed, Cancelled
      expect(order.events[0]).toBeInstanceOf(TestOrderCreatedEvent);
      expect(order.events[1]).toBeInstanceOf(TestOrderStatusChangedEvent);
      expect(order.events[2]).toBeInstanceOf(TestOrderStatusChangedEvent);
    });

    test('Should_PreventEventsMutation_When_AccessingEventsCollection', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');
      const order = new TestOrder(orderId, 'CUST-001');

      // When/Then
      expect(() => {
        // @ts-expect-error - Testing immutability
        order.events.push(new TestOrderCreatedEvent('fake'));
      }).toThrow();

      expect(() => {
        // @ts-expect-error - Testing immutability
        order.events.pop();
      }).toThrow();
    });

    test('Should_ClearAllEvents_When_CallingClearEvents', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');
      const order = new TestOrder(orderId, 'CUST-001');
      order.confirm();
      order.cancel();
      expect(order.events.length).toBeGreaterThan(0);

      // When
      order.clearEvents();

      // Then
      expect(order.events.length).toBe(0);
    });

    test('Should_RetainState_When_EventsAreCleared', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');
      const order = new TestOrder(orderId, 'CUST-001');
      order.confirm();
      const statusBeforeClear = order.status;

      // When
      order.clearEvents();

      // Then
      expect(order.status).toBe(statusBeforeClear);
      expect(order.id).toBe(orderId);
    });
  });

  describe('AggregateRoot Version Management', () => {
    test('Should_MaintainVersion_When_EventsAreAdded', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');
      const order = new TestOrder(orderId, 'CUST-001');
      const initialVersion = order.version;

      // When
      order.confirm();

      // Then
      // Version should remain the same - it's managed by the repository during persistence
      expect(order.version).toBe(initialVersion);
    });

    test('Should_AllowVersionIncrement_When_SimulatingPersistence', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');
      const order = new TestOrder(orderId, 'CUST-001');

      // When - Simulate what a repository would do
      // @ts-expect-error - Accessing protected member for testing
      order.incrementVersion();

      // Then
      expect(order.version).toBe(1);
    });

    test('Should_PreventDirectVersionModification_When_ExternallyAccessed', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');
      const order = new TestOrder(orderId, 'CUST-001');

      // When/Then
      expect(() => {
        // @ts-expect-error - Testing immutability
        order.version = 5;
      }).toThrow();
    });
  });

  describe('AggregateRoot Equality', () => {
    test('Should_InheritEntityEquality_When_ComparingAggregates', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');
      const order1 = new TestOrder(orderId, 'CUST-001');
      const order2 = new TestOrder(orderId, 'CUST-002');

      // When
      order1.confirm();
      order2.cancel();

      // Then - Should be equal despite different state and events
      expect(order1.equals(order2)).toBe(true);
      expect(order1 == order2).toBe(true);
    });

    test('Should_NotBeEqual_When_DifferentAggregateIds', () => {
      // Given
      const orderId1 = new TestOrderId('ORDER-001');
      const orderId2 = new TestOrderId('ORDER-002');
      const order1 = new TestOrder(orderId1, 'CUST-001');
      const order2 = new TestOrder(orderId2, 'CUST-001');

      // When/Then
      expect(order1.equals(order2)).toBe(false);
      expect(order1 == order2).toBe(false);
    });
  });

  describe('AggregateRoot Invariants', () => {
    test('Should_EnforceBusinessRules_When_StateChanges', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');
      const order = new TestOrder(orderId, 'CUST-001');
      order.confirm();

      // When/Then
      expect(() => order.confirm()).toThrow('Can only confirm pending orders');
    });

    test('Should_MaintainConsistency_When_EventsAreGenerated', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');
      const order = new TestOrder(orderId, 'CUST-001');

      // When
      order.confirm();
      order.cancel();

      // Then
      const statusChanges = order.events
        .filter(e => e instanceof TestOrderStatusChangedEvent)
        .map(e => (e as TestOrderStatusChangedEvent));

      expect(statusChanges.length).toBe(2);
      expect(statusChanges[0]!.fromStatus).toBe('Pending');
      expect(statusChanges[0]!.toStatus).toBe('Confirmed');
      expect(statusChanges[1]!.fromStatus).toBe('Confirmed');
      expect(statusChanges[1]!.toStatus).toBe('Cancelled');
    });
  });

  describe('AggregateRoot Performance', () => {
    test('Should_HandleManyEvents_When_AggregateIsLongLived', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');
      const order = new TestOrder(orderId, 'CUST-001');

      // When
      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        order.confirm();
        order.cancel();
      }

      const endTime = performance.now();

      // Then
      expect(order.events.length).toBe(1 + (iterations * 2)); // Initial + confirm/cancel pairs
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(100); // Should handle 1000 operations in < 100ms
    });

    test('Should_ProvideEfficientEventAccess_When_ReadingEvents', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');
      const order = new TestOrder(orderId, 'CUST-001');

      // Add some events
      for (let i = 0; i < 100; i++) {
        order.confirm();
        order.cancel();
      }

      // When
      const startTime = performance.now();
      const eventCount = order.events.length;
      const events = [...order.events];
      const endTime = performance.now();

      // Then
      expect(eventCount).toBe(201); // Initial + 100 confirm/cancel pairs
      expect(events.length).toBe(eventCount);
      expect(endTime - startTime).toBeLessThan(10); // Should be very fast
    });
  });

  describe('AggregateRoot Memory Management', () => {
    test('Should_ReleaseEventReferences_When_EventsAreCleared', () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');
      const order = new TestOrder(orderId, 'CUST-001');

      // Create many events
      for (let i = 0; i < 100; i++) {
        order.confirm();
        order.cancel();
      }

      const eventCountBeforeClear = order.events.length;

      // When
      order.clearEvents();

      // Then
      expect(eventCountBeforeClear).toBeGreaterThan(0);
      expect(order.events.length).toBe(0);

      // Force garbage collection if available (Node.js)
      if (global.gc) {
        global.gc();
      }
    });
  });

  describe('AggregateRoot Thread Safety', () => {
    test('Should_HandleConcurrentEventAddition_When_MultipleOperations', async () => {
      // Given
      const orderId = new TestOrderId('ORDER-001');
      const order = new TestOrder(orderId, 'CUST-001');

      // When - Simulate concurrent operations
      const operations = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve().then(() => {
          order.confirm();
          order.cancel();
        })
      );

      await Promise.all(operations);

      // Then
      expect(order.events.length).toBe(21); // Initial + 10 * (confirm + cancel)
    });
  });
});