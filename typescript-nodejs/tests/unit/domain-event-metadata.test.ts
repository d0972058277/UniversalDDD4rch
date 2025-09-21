/**
 * DomainEvent Metadata Handling Unit Tests
 * Architecture.Core TypeScript Implementation
 */

import { DomainEventBase } from '../../src/domain/domain-event-base';
import { IDomainEvent } from '../../src/domain/interfaces/i-domain-event';

// Test domain event implementations
class UserRegisteredEvent extends DomainEventBase {
    constructor(
        public readonly userId: string,
        public readonly email: string,
        public readonly registrationSource: string,
        correlationId?: string,
        causationId?: string,
        metadata?: Record<string, unknown>
    ) {
        super(correlationId, causationId, metadata);
    }
}

class UserEmailChangedEvent extends DomainEventBase {
    constructor(
        public readonly userId: string,
        public readonly oldEmail: string,
        public readonly newEmail: string,
        correlationId?: string,
        causationId?: string,
        metadata?: Record<string, unknown>
    ) {
        super(correlationId, causationId, metadata);
    }
}

class OrderProcessedEvent extends DomainEventBase {
    constructor(
        public readonly orderId: string,
        public readonly customerId: string,
        public readonly amount: number,
        public readonly processingResult: string,
        correlationId?: string,
        causationId?: string,
        metadata?: Record<string, unknown>
    ) {
        super(correlationId, causationId, metadata);
    }
}

class PaymentProcessedEvent extends DomainEventBase {
    constructor(
        public readonly paymentId: string,
        public readonly orderId: string,
        public readonly amount: number,
        public readonly success: boolean,
        correlationId?: string,
        causationId?: string,
        metadata?: Record<string, unknown>
    ) {
        super(correlationId, causationId, metadata);
    }
}

class ComplexEvent extends DomainEventBase {
    constructor(
        public readonly aggregateId: string,
        public readonly eventData: Record<string, unknown>,
        correlationId?: string,
        causationId?: string,
        metadata?: Record<string, unknown>
    ) {
        super(correlationId, causationId, metadata);
    }
}

describe('DomainEvent Metadata Handling Tests', () => {
    describe('Basic Event Creation', () => {
        test('Should_CreateEventWithBasicMetadata_When_NoMetadataProvided', () => {
            // Given & When
            const event = new UserRegisteredEvent('user-123', 'test@example.com', 'website');

            // Then
            expect(event.id).toBeDefined();
            expect(event.occurredAt).toBeDefined();
            expect(event.correlationId).toBeUndefined();
            expect(event.causationId).toBeUndefined();
            expect(event.metadata).toBeDefined();
            expect(event.metadata).toEqual({});
            expect(event.userId).toBe('user-123');
            expect(event.email).toBe('test@example.com');
            expect(event.registrationSource).toBe('website');
        });

        test('Should_GenerateUniqueIds_When_CreatingMultipleEvents', () => {
            // Given & When
            const event1 = new UserRegisteredEvent('user-1', 'user1@example.com', 'mobile');
            const event2 = new UserRegisteredEvent('user-2', 'user2@example.com', 'website');
            const event3 = new UserRegisteredEvent('user-3', 'user3@example.com', 'api');

            // Then
            expect(event1.id).not.toBe(event2.id);
            expect(event2.id).not.toBe(event3.id);
            expect(event1.id).not.toBe(event3.id);

            // IDs should be valid UUIDs
            const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            expect(event1.id).toMatch(uuidPattern);
            expect(event2.id).toMatch(uuidPattern);
            expect(event3.id).toMatch(uuidPattern);
        });

        test('Should_SetOccurredAtToCurrentTime_When_CreatingEvent', () => {
            // Given
            const beforeCreation = new Date();

            // When
            const event = new UserRegisteredEvent('user-123', 'test@example.com', 'website');

            // Then
            const afterCreation = new Date();
            expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
            expect(event.occurredAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
        });
    });

    describe('Correlation and Causation IDs', () => {
        test('Should_SetCorrelationId_When_Provided', () => {
            // Given
            const correlationId = 'correlation-123';

            // When
            const event = new UserRegisteredEvent(
                'user-123',
                'test@example.com',
                'website',
                correlationId
            );

            // Then
            expect(event.correlationId).toBe(correlationId);
            expect(event.causationId).toBeUndefined();
        });

        test('Should_SetCausationId_When_Provided', () => {
            // Given
            const correlationId = 'correlation-123';
            const causationId = 'causation-456';

            // When
            const event = new UserRegisteredEvent(
                'user-123',
                'test@example.com',
                'website',
                correlationId,
                causationId
            );

            // Then
            expect(event.correlationId).toBe(correlationId);
            expect(event.causationId).toBe(causationId);
        });

        test('Should_HandleEventChaining_When_CreatingRelatedEvents', () => {
            // Given
            const correlationId = 'request-correlation-123';

            // When - Create initial event
            const userRegisteredEvent = new UserRegisteredEvent(
                'user-123',
                'test@example.com',
                'website',
                correlationId
            );

            // When - Create follow-up event using first event's ID as causation
            const emailChangedEvent = new UserEmailChangedEvent(
                'user-123',
                'test@example.com',
                'newemail@example.com',
                correlationId,
                userRegisteredEvent.id
            );

            // Then
            expect(userRegisteredEvent.correlationId).toBe(correlationId);
            expect(userRegisteredEvent.causationId).toBeUndefined();

            expect(emailChangedEvent.correlationId).toBe(correlationId);
            expect(emailChangedEvent.causationId).toBe(userRegisteredEvent.id);
        });

        test('Should_PropagateCorrelationId_When_ChainingMultipleEvents', () => {
            // Given
            const correlationId = 'workflow-correlation-789';

            // When - Create event chain
            const orderProcessedEvent = new OrderProcessedEvent(
                'order-123',
                'customer-456',
                100.00,
                'success',
                correlationId
            );

            const paymentProcessedEvent = new PaymentProcessedEvent(
                'payment-789',
                'order-123',
                100.00,
                true,
                correlationId,
                orderProcessedEvent.id
            );

            // Then - Both events should have same correlation ID
            expect(orderProcessedEvent.correlationId).toBe(correlationId);
            expect(paymentProcessedEvent.correlationId).toBe(correlationId);

            // Causation chain should be established
            expect(orderProcessedEvent.causationId).toBeUndefined();
            expect(paymentProcessedEvent.causationId).toBe(orderProcessedEvent.id);
        });
    });

    describe('Custom Metadata', () => {
        test('Should_SetCustomMetadata_When_Provided', () => {
            // Given
            const metadata = {
                source: 'api',
                version: '1.0',
                clientId: 'mobile-app',
                requestId: 'req-123',
                feature: 'user-registration'
            };

            // When
            const event = new UserRegisteredEvent(
                'user-123',
                'test@example.com',
                'website',
                undefined,
                undefined,
                metadata
            );

            // Then
            expect(event.metadata).toEqual(metadata);
            expect(event.metadata.source).toBe('api');
            expect(event.metadata.version).toBe('1.0');
            expect(event.metadata.clientId).toBe('mobile-app');
        });

        test('Should_HandleComplexMetadata_When_NestedObjectsProvided', () => {
            // Given
            const metadata = {
                user: {
                    agent: 'Mozilla/5.0...',
                    ip: '192.168.1.100',
                    location: {
                        country: 'US',
                        state: 'CA',
                        city: 'San Francisco'
                    }
                },
                system: {
                    hostname: 'web-server-01',
                    version: '2.1.0',
                    environment: 'production'
                },
                metrics: {
                    processingTime: 125,
                    memoryUsage: 45.6,
                    cpuUsage: 12.3
                },
                flags: ['feature-a', 'feature-b', 'beta-user']
            };

            // When
            const event = new ComplexEvent(
                'aggregate-123',
                { action: 'complex-operation', result: 'success' },
                'correlation-123',
                undefined,
                metadata
            );

            // Then
            expect(event.metadata).toEqual(metadata);
            expect(event.metadata.user.location.city).toBe('San Francisco');
            expect(event.metadata.system.environment).toBe('production');
            expect(event.metadata.metrics.processingTime).toBe(125);
            expect(event.metadata.flags).toContain('beta-user');
        });

        test('Should_HandleEmptyMetadata_When_EmptyObjectProvided', () => {
            // Given
            const metadata = {};

            // When
            const event = new UserRegisteredEvent(
                'user-123',
                'test@example.com',
                'website',
                'correlation-123',
                undefined,
                metadata
            );

            // Then
            expect(event.metadata).toEqual({});
        });

        test('Should_HandleNullAndUndefinedInMetadata_When_SpecialValuesProvided', () => {
            // Given
            const metadata = {
                nullValue: null,
                undefinedValue: undefined,
                emptyString: '',
                zeroNumber: 0,
                falseBoolean: false,
                emptyArray: [],
                emptyObject: {}
            };

            // When
            const event = new ComplexEvent(
                'aggregate-123',
                { test: true },
                undefined,
                undefined,
                metadata
            );

            // Then
            expect(event.metadata).toEqual(metadata);
            expect(event.metadata.nullValue).toBeNull();
            expect(event.metadata.undefinedValue).toBeUndefined();
            expect(event.metadata.emptyString).toBe('');
            expect(event.metadata.zeroNumber).toBe(0);
            expect(event.metadata.falseBoolean).toBe(false);
        });
    });

    describe('Metadata Immutability', () => {
        test('Should_PreventMetadataModification_When_EventCreated', () => {
            // Given
            const metadata = {
                source: 'api',
                version: '1.0'
            };

            const event = new UserRegisteredEvent(
                'user-123',
                'test@example.com',
                'website',
                undefined,
                undefined,
                metadata
            );

            // When - Attempt to modify metadata
            const eventMetadata = event.metadata as any;

            // Then - Should not be able to modify (ReadonlyDictionary)
            // This test verifies the type system prevents modification
            expect(event.metadata).toEqual(metadata);

            // Verify that changes to original metadata don't affect event
            metadata.source = 'modified';
            expect(event.metadata.source).not.toBe('modified');
        });

        test('Should_MaintainMetadataIntegrity_When_OriginalObjectModified', () => {
            // Given
            const originalMetadata = {
                config: { enabled: true, timeout: 5000 },
                tags: ['important', 'user-action']
            };

            const event = new ComplexEvent(
                'aggregate-123',
                { action: 'test' },
                undefined,
                undefined,
                originalMetadata
            );

            // When - Modify original metadata object
            originalMetadata.config.enabled = false;
            originalMetadata.tags.push('modified');

            // Then - Event metadata should remain unchanged
            expect(event.metadata.config.enabled).toBe(true);
            expect(event.metadata.tags).toEqual(['important', 'user-action']);
        });
    });

    describe('Event Serialization and Metadata', () => {
        test('Should_SerializeCorrectly_When_ConvertingToJSON', () => {
            // Given
            const correlationId = 'correlation-123';
            const causationId = 'causation-456';
            const metadata = {
                source: 'api',
                requestId: 'req-789',
                user: { id: 'user-123', role: 'admin' }
            };

            const event = new UserRegisteredEvent(
                'user-123',
                'test@example.com',
                'website',
                correlationId,
                causationId,
                metadata
            );

            // When
            const serialized = JSON.stringify(event);
            const deserialized = JSON.parse(serialized);

            // Then
            expect(deserialized.id).toBe(event.id);
            expect(deserialized.occurredAt).toBe(event.occurredAt.toISOString());
            expect(deserialized.correlationId).toBe(correlationId);
            expect(deserialized.causationId).toBe(causationId);
            expect(deserialized.metadata).toEqual(metadata);
            expect(deserialized.userId).toBe('user-123');
            expect(deserialized.email).toBe('test@example.com');
        });

        test('Should_HandleSerializationOfComplexMetadata_When_ContainsNestedObjects', () => {
            // Given
            const metadata = {
                timestamp: new Date().toISOString(),
                numbers: [1, 2, 3, 4, 5],
                nested: {
                    level1: {
                        level2: {
                            value: 'deep-value'
                        }
                    }
                },
                map: { key1: 'value1', key2: 'value2' },
                boolean: true
            };

            const event = new ComplexEvent(
                'aggregate-123',
                { test: 'data' },
                'correlation-123',
                undefined,
                metadata
            );

            // When
            const serialized = JSON.stringify(event);
            const deserialized = JSON.parse(serialized);

            // Then
            expect(deserialized.metadata).toEqual(metadata);
            expect(deserialized.metadata.nested.level1.level2.value).toBe('deep-value');
            expect(deserialized.metadata.numbers).toEqual([1, 2, 3, 4, 5]);
        });
    });

    describe('Metadata Querying and Filtering', () => {
        test('Should_QueryMetadataFields_When_FilteringEvents', () => {
            // Given
            const events: IDomainEvent[] = [
                new UserRegisteredEvent('user-1', 'user1@example.com', 'website', 'corr-1', undefined, { source: 'web', priority: 'high' }),
                new UserRegisteredEvent('user-2', 'user2@example.com', 'mobile', 'corr-2', undefined, { source: 'mobile', priority: 'low' }),
                new UserEmailChangedEvent('user-1', 'old@example.com', 'new@example.com', 'corr-3', undefined, { source: 'web', priority: 'medium' }),
                new OrderProcessedEvent('order-1', 'customer-1', 100, 'success', 'corr-4', undefined, { source: 'api', priority: 'high' })
            ];

            // When - Filter by metadata
            const highPriorityEvents = events.filter(e => e.metadata.priority === 'high');
            const webSourceEvents = events.filter(e => e.metadata.source === 'web');
            const correlationEvents = events.filter(e => e.correlationId?.startsWith('corr-'));

            // Then
            expect(highPriorityEvents).toHaveLength(2);
            expect(webSourceEvents).toHaveLength(2);
            expect(correlationEvents).toHaveLength(4);
        });

        test('Should_GroupEventsByMetadata_When_OrganizingEvents', () => {
            // Given
            const events: IDomainEvent[] = [
                new UserRegisteredEvent('user-1', 'u1@example.com', 'web', 'batch-1', undefined, { batch: 'morning', region: 'us-west' }),
                new UserRegisteredEvent('user-2', 'u2@example.com', 'web', 'batch-1', undefined, { batch: 'morning', region: 'us-east' }),
                new UserRegisteredEvent('user-3', 'u3@example.com', 'mobile', 'batch-2', undefined, { batch: 'afternoon', region: 'us-west' }),
                new UserRegisteredEvent('user-4', 'u4@example.com', 'api', 'batch-2', undefined, { batch: 'afternoon', region: 'us-west' })
            ];

            // When - Group by batch
            const groupedByBatch = events.reduce((groups, event) => {
                const batch = event.metadata.batch as string;
                if (!groups[batch]) groups[batch] = [];
                groups[batch].push(event);
                return groups;
            }, {} as Record<string, IDomainEvent[]>);

            // When - Group by region
            const groupedByRegion = events.reduce((groups, event) => {
                const region = event.metadata.region as string;
                if (!groups[region]) groups[region] = [];
                groups[region].push(event);
                return groups;
            }, {} as Record<string, IDomainEvent[]>);

            // Then
            expect(groupedByBatch['morning']).toHaveLength(2);
            expect(groupedByBatch['afternoon']).toHaveLength(2);
            expect(groupedByRegion['us-west']).toHaveLength(3);
            expect(groupedByRegion['us-east']).toHaveLength(1);
        });
    });

    describe('Event Correlation Tracking', () => {
        test('Should_TrackEventCorrelation_When_BuildingEventChain', () => {
            // Given
            const correlationId = 'user-registration-flow-123';

            // When - Build event chain
            const step1 = new UserRegisteredEvent(
                'user-123',
                'test@example.com',
                'website',
                correlationId,
                undefined,
                { step: 1, operation: 'register' }
            );

            const step2 = new UserEmailChangedEvent(
                'user-123',
                'test@example.com',
                'verified@example.com',
                correlationId,
                step1.id,
                { step: 2, operation: 'verify-email' }
            );

            const step3 = new ComplexEvent(
                'user-123',
                { action: 'profile-completed', success: true },
                correlationId,
                step2.id,
                { step: 3, operation: 'complete-profile' }
            );

            // Then - Verify correlation chain
            expect(step1.correlationId).toBe(correlationId);
            expect(step2.correlationId).toBe(correlationId);
            expect(step3.correlationId).toBe(correlationId);

            // Verify causation chain
            expect(step1.causationId).toBeUndefined();
            expect(step2.causationId).toBe(step1.id);
            expect(step3.causationId).toBe(step2.id);

            // Verify operation tracking
            expect(step1.metadata.operation).toBe('register');
            expect(step2.metadata.operation).toBe('verify-email');
            expect(step3.metadata.operation).toBe('complete-profile');
        });

        test('Should_HandleBranchingCorrelation_When_EventTriggersMultipleActions', () => {
            // Given
            const correlationId = 'order-processing-456';

            // When - One event triggers multiple subsequent events
            const orderEvent = new OrderProcessedEvent(
                'order-123',
                'customer-456',
                100.00,
                'success',
                correlationId,
                undefined,
                { step: 1, operation: 'process-order' }
            );

            // Multiple events caused by the order processing
            const paymentEvent = new PaymentProcessedEvent(
                'payment-789',
                'order-123',
                100.00,
                true,
                correlationId,
                orderEvent.id,
                { step: 2, operation: 'process-payment', branch: 'payment' }
            );

            const inventoryEvent = new ComplexEvent(
                'inventory-update',
                { orderId: 'order-123', action: 'reserve-items' },
                correlationId,
                orderEvent.id,
                { step: 2, operation: 'update-inventory', branch: 'inventory' }
            );

            const notificationEvent = new ComplexEvent(
                'notification-sent',
                { orderId: 'order-123', type: 'order-confirmation' },
                correlationId,
                orderEvent.id,
                { step: 2, operation: 'send-notification', branch: 'notification' }
            );

            // Then - All events share same correlation ID
            const allEvents = [orderEvent, paymentEvent, inventoryEvent, notificationEvent];
            allEvents.forEach(event => {
                expect(event.correlationId).toBe(correlationId);
            });

            // Parallel events all have same causation ID
            expect(paymentEvent.causationId).toBe(orderEvent.id);
            expect(inventoryEvent.causationId).toBe(orderEvent.id);
            expect(notificationEvent.causationId).toBe(orderEvent.id);

            // Different branches identified in metadata
            expect(paymentEvent.metadata.branch).toBe('payment');
            expect(inventoryEvent.metadata.branch).toBe('inventory');
            expect(notificationEvent.metadata.branch).toBe('notification');
        });
    });

    describe('Performance and Edge Cases', () => {
        test('Should_HandleLargeMetadata_When_ExtensiveDataProvided', () => {
            // Given
            const largeMetadata: Record<string, unknown> = {};
            for (let i = 0; i < 1000; i++) {
                largeMetadata[`field${i}`] = {
                    id: i,
                    name: `name-${i}`,
                    data: Array.from({ length: 100 }, (_, j) => ({ index: j, value: `value-${i}-${j}` }))
                };
            }

            // When
            const start = performance.now();
            const event = new ComplexEvent(
                'aggregate-123',
                { action: 'large-metadata-test' },
                'correlation-123',
                undefined,
                largeMetadata
            );
            const end = performance.now();

            // Then
            expect(event.metadata).toBeDefined();
            expect(Object.keys(event.metadata)).toHaveLength(1000);
            expect(end - start).toBeLessThan(100); // Should create within 100ms

            console.log(`Large metadata event creation: ${(end - start).toFixed(2)}ms`);
        });

        test('Should_HandleSpecialCharactersInMetadata_When_ContainsUnicodeAndSymbols', () => {
            // Given
            const metadata = {
                unicode: '🎉 Unicode symbols: ñáéíóú 中文 العربية',
                specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
                quotes: 'Single \'quotes\' and "double quotes"',
                json: '{"nested": "json", "array": [1, 2, 3]}',
                html: '<div>HTML content</div>',
                url: 'https://example.com/path?param=value&other=123'
            };

            // When
            const event = new ComplexEvent(
                'aggregate-123',
                { test: 'special-chars' },
                undefined,
                undefined,
                metadata
            );

            // Then
            expect(event.metadata).toEqual(metadata);

            // Should serialize and deserialize correctly
            const serialized = JSON.stringify(event);
            const deserialized = JSON.parse(serialized);
            expect(deserialized.metadata).toEqual(metadata);
        });
    });
});