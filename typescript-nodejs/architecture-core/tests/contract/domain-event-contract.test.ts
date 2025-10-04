// DomainEventBase Contract Tests
// These tests define the behavioral contracts for DomainEventBase abstract class and IDomainEvent interface
// Following TDD: These tests MUST FAIL initially before implementation

import { DomainEventBase } from '@/domain/domain-event-base';
import { IDomainEvent } from '@/domain/interfaces/i-domain-event';

// Test implementations for contract validation
class TestOrderCreatedEvent extends DomainEventBase {
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    correlationId?: string,
    causationId?: string,
    metadata?: Record<string, unknown>
  ) {
    super(correlationId, causationId, metadata);
    this.freezeEvent();
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
    this.freezeEvent();
  }
}

class TestComplexEvent extends DomainEventBase {
  constructor(
    public readonly data: {
      id: string;
      values: number[];
      nested: { prop: string };
    },
    correlationId?: string,
    causationId?: string,
    metadata?: Record<string, unknown>
  ) {
    super(correlationId, causationId, metadata);
    this.freezeEvent();
  }
}

describe('DomainEventBase Contract Tests', () => {
  describe('DomainEvent Basic Properties', () => {
    test('Should_GenerateUniqueId_When_EventCreated', () => {
      // Given/When
      const event1 = new TestOrderCreatedEvent('ORDER-001', 'CUST-001');
      const event2 = new TestOrderCreatedEvent('ORDER-002', 'CUST-002');

      // Then
      expect(event1.id).toBeDefined();
      expect(event2.id).toBeDefined();
      expect(event1.id).not.toBe(event2.id);
      expect(typeof event1.id).toBe('string');
      expect(event1.id.length).toBeGreaterThan(0);
    });

    test('Should_SetOccurredAtToCurrentTime_When_EventCreated', () => {
      // Given
      const beforeCreation = new Date();

      // When
      const event = new TestOrderCreatedEvent('ORDER-001', 'CUST-001');

      // Then
      const afterCreation = new Date();
      expect(event.occurredAt).toBeInstanceOf(Date);
      expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(event.occurredAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });

    test('Should_SetProvidedCorrelationId_When_Specified', () => {
      // Given
      const correlationId = 'correlation-123';

      // When
      const event = new TestOrderCreatedEvent('ORDER-001', 'CUST-001', correlationId);

      // Then
      expect(event.correlationId).toBe(correlationId);
    });

    test('Should_SetUndefinedCorrelationId_When_NotSpecified', () => {
      // Given/When
      const event = new TestOrderCreatedEvent('ORDER-001', 'CUST-001');

      // Then
      expect(event.correlationId).toBeUndefined();
    });

    test('Should_SetProvidedCausationId_When_Specified', () => {
      // Given
      const causationId = 'event-456';

      // When
      const event = new TestOrderCreatedEvent('ORDER-001', 'CUST-001', undefined, causationId);

      // Then
      expect(event.causationId).toBe(causationId);
    });

    test('Should_SetUndefinedCausationId_When_NotSpecified', () => {
      // Given/When
      const event = new TestOrderCreatedEvent('ORDER-001', 'CUST-001');

      // Then
      expect(event.causationId).toBeUndefined();
    });
  });

  describe('DomainEvent Metadata', () => {
    test('Should_SetEmptyMetadata_When_NotProvided', () => {
      // Given/When
      const event = new TestOrderCreatedEvent('ORDER-001', 'CUST-001');

      // Then
      expect(event.metadata).toBeDefined();
      expect(Object.keys(event.metadata)).toHaveLength(0);
    });

    test('Should_SetProvidedMetadata_When_Specified', () => {
      // Given
      const metadata = {
        source: 'OrderService',
        version: '1.0',
        userId: 'user-123',
        requestId: 'req-456'
      };

      // When
      const event = new TestOrderCreatedEvent('ORDER-001', 'CUST-001', undefined, undefined, metadata);

      // Then
      expect(event.metadata).toEqual(metadata);
      expect(event.metadata.source).toBe('OrderService');
      expect(event.metadata.version).toBe('1.0');
      expect(event.metadata.userId).toBe('user-123');
      expect(event.metadata.requestId).toBe('req-456');
    });

    test('Should_PreventMetadataMutation_When_EventCreated', () => {
      // Given
      const metadata = { count: 1, flag: true };
      const event = new TestOrderCreatedEvent('ORDER-001', 'CUST-001', undefined, undefined, metadata);

      // When
      metadata.count = 999; // Mutate original
      metadata.flag = false;

      // Then
      expect(event.metadata.count).toBe(1);
      expect(event.metadata.flag).toBe(true);
    });

    test('Should_HandleComplexMetadata_When_NestedObjectsProvided', () => {
      // Given
      const metadata = {
        context: {
          user: { id: 'user-123', role: 'admin' },
          session: { id: 'session-456', timeout: 3600 }
        },
        tags: ['urgent', 'financial'],
        counters: { attempts: 1, retries: 0 }
      };

      // When
      const event = new TestOrderCreatedEvent('ORDER-001', 'CUST-001', undefined, undefined, metadata);

      // Then
      expect(event.metadata.context).toEqual(metadata.context);
      expect(event.metadata.tags).toEqual(metadata.tags);
      expect(event.metadata.counters).toEqual(metadata.counters);
    });
  });

  describe('DomainEvent Immutability', () => {
    test('Should_PreventIdModification_When_EventCreated', () => {
      // Given
      const event = new TestOrderCreatedEvent('ORDER-001', 'CUST-001');

      // When/Then
      expect(() => {
        // @ts-expect-error - Testing immutability
        event.id = 'new-id';
      }).toThrow();
    });

    test('Should_PreventOccurredAtModification_When_EventCreated', () => {
      // Given
      const event = new TestOrderCreatedEvent('ORDER-001', 'CUST-001');

      // When/Then
      expect(() => {
        // @ts-expect-error - Testing immutability
        event.occurredAt = new Date();
      }).toThrow();
    });

    test('Should_PreventCorrelationIdModification_When_EventCreated', () => {
      // Given
      const event = new TestOrderCreatedEvent('ORDER-001', 'CUST-001', 'correlation-123');

      // When/Then
      expect(() => {
        // @ts-expect-error - Testing immutability
        event.correlationId = 'new-correlation';
      }).toThrow();
    });

    test('Should_PreventCausationIdModification_When_EventCreated', () => {
      // Given
      const event = new TestOrderCreatedEvent('ORDER-001', 'CUST-001', undefined, 'causation-123');

      // When/Then
      expect(() => {
        // @ts-expect-error - Testing immutability
        event.causationId = 'new-causation';
      }).toThrow();
    });

    test('Should_PreventMetadataModification_When_EventCreated', () => {
      // Given
      const event = new TestOrderCreatedEvent('ORDER-001', 'CUST-001', undefined, undefined, { key: 'value' });

      // When/Then
      expect(() => {
        // @ts-expect-error - Testing immutability
        event.metadata.key = 'new-value';
      }).toThrow();

      expect(() => {
        // @ts-expect-error - Testing immutability
        event.metadata.newKey = 'new-value';
      }).toThrow();
    });
  });

  describe('DomainEvent Event Chaining', () => {
    test('Should_SupportEventChaining_When_CausationIdSetToParentEventId', () => {
      // Given
      const parentEvent = new TestOrderCreatedEvent('ORDER-001', 'CUST-001', 'correlation-123');

      // When
      const childEvent = new TestOrderStatusChangedEvent(
        'ORDER-001',
        'Pending',
        'Confirmed',
        parentEvent.correlationId,
        parentEvent.id
      );

      // Then
      expect(childEvent.correlationId).toBe(parentEvent.correlationId);
      expect(childEvent.causationId).toBe(parentEvent.id);
    });

    test('Should_MaintainCorrelationId_When_EventChainSpansMultipleEvents', () => {
      // Given
      const correlationId = 'correlation-123';
      const event1 = new TestOrderCreatedEvent('ORDER-001', 'CUST-001', correlationId);

      // When
      const event2 = new TestOrderStatusChangedEvent(
        'ORDER-001',
        'Pending',
        'Confirmed',
        correlationId,
        event1.id
      );

      const event3 = new TestOrderStatusChangedEvent(
        'ORDER-001',
        'Confirmed',
        'Shipped',
        correlationId,
        event2.id
      );

      // Then
      expect(event1.correlationId).toBe(correlationId);
      expect(event2.correlationId).toBe(correlationId);
      expect(event3.correlationId).toBe(correlationId);
      expect(event2.causationId).toBe(event1.id);
      expect(event3.causationId).toBe(event2.id);
    });
  });

  describe('DomainEvent Type Safety', () => {
    test('Should_ImplementIDomainEventInterface_When_CreatingEvent', () => {
      // Given/When
      const event = new TestOrderCreatedEvent('ORDER-001', 'CUST-001');

      // Then
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('occurredAt');
      expect(event).toHaveProperty('correlationId');
      expect(event).toHaveProperty('causationId');
      expect(event).toHaveProperty('metadata');

      // Should be assignable to IDomainEvent
      const domainEvent: IDomainEvent = event;
      expect(domainEvent).toBe(event);
    });

    test('Should_AllowCustomEventProperties_When_ExtendingDomainEventBase', () => {
      // Given/When
      const event = new TestOrderCreatedEvent('ORDER-001', 'CUST-001');

      // Then
      expect(event.orderId).toBe('ORDER-001');
      expect(event.customerId).toBe('CUST-001');
    });

    test('Should_HandleComplexEventData_When_EventContainsNestedObjects', () => {
      // Given
      const complexData = {
        id: 'complex-001',
        values: [1, 2, 3, 4, 5],
        nested: { prop: 'nested-value' }
      };

      // When
      const event = new TestComplexEvent(complexData);

      // Then
      expect(event.data).toEqual(complexData);
      expect(event.data.id).toBe('complex-001');
      expect(event.data.values).toEqual([1, 2, 3, 4, 5]);
      expect(event.data.nested.prop).toBe('nested-value');
    });
  });

  describe('DomainEvent Serialization', () => {
    test('Should_BeSerializableToJSON_When_EventContainsStandardTypes', () => {
      // Given
      const event = new TestOrderCreatedEvent(
        'ORDER-001',
        'CUST-001',
        'correlation-123',
        'causation-456',
        { source: 'test', timestamp: new Date().toISOString() }
      );

      // When
      const plainObject = event.toPlainObject();
      const json = JSON.stringify(plainObject);
      const parsed = JSON.parse(json);

      // Then
      expect(json).toBeDefined();
      expect(parsed.orderId).toBe('ORDER-001');
      expect(parsed.customerId).toBe('CUST-001');
      expect(parsed.correlationId).toBe('correlation-123');
      expect(parsed.causationId).toBe('causation-456');
      expect(parsed.metadata.source).toBe('test');
    });

    test('Should_HandleDateSerialization_When_SerializingEvent', () => {
      // Given
      const event = new TestOrderCreatedEvent('ORDER-001', 'CUST-001');
      const originalOccurredAt = event.occurredAt;

      // When
      const plainObject = event.toPlainObject();
      const json = JSON.stringify(plainObject);
      const parsed = JSON.parse(json);

      // Then
      expect(parsed.occurredAt).toBe(originalOccurredAt.toISOString());
    });
  });

  describe('DomainEvent Performance', () => {
    test('Should_CreateEventsEfficiently_When_CreatingManyEvents', () => {
      // Given
      const iterations = 10000;

      // When
      const startTime = performance.now();
      const events = [];
      for (let i = 0; i < iterations; i++) {
        events.push(new TestOrderCreatedEvent(`ORDER-${i}`, `CUST-${i}`));
      }
      const endTime = performance.now();

      // Then
      expect(events).toHaveLength(iterations);
      const totalTime = endTime - startTime;
      const averageTime = totalTime / iterations;
      expect(averageTime).toBeLessThan(0.01); // Should be very fast (< 0.01ms per event)
    });

    test('Should_HandleLargeMetadata_When_EventContainsBulkData', () => {
      // Given
      const largeMetadata = {
        data: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item-${i}` })),
        text: 'x'.repeat(10000), // 10KB string
        numbers: Array.from({ length: 1000 }, (_, i) => i)
      };

      // When
      const startTime = performance.now();
      const event = new TestOrderCreatedEvent('ORDER-001', 'CUST-001', undefined, undefined, largeMetadata);
      const endTime = performance.now();

      // Then
      expect(event.metadata).toBeDefined();
      expect(event.metadata.data).toHaveLength(1000);
      expect(event.metadata.text).toHaveLength(10000);
      expect(endTime - startTime).toBeLessThan(10); // Should handle large metadata quickly
    });
  });
});