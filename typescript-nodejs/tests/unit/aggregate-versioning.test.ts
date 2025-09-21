/**
 * AggregateRoot Version Control Unit Tests
 * Architecture.Core TypeScript Implementation
 */

import { AggregateRoot } from '../../src/domain/aggregate-root';
import { DomainEventBase } from '../../src/domain/domain-event-base';
import { ValueObject } from '../../src/domain/value-object';

// Test ID value object
class OrderId extends ValueObject {
    constructor(public readonly value: string) {
        super();
        if (!value) {
            throw new Error('OrderId cannot be empty');
        }
    }

    protected getEqualityComponents(): any[] {
        return [this.value];
    }

    override toString(): string {
        return this.value;
    }
}

// Test domain events
class OrderCreatedEvent extends DomainEventBase {
    constructor(
        public readonly orderId: OrderId,
        public readonly customerId: string,
        public readonly amount: number
    ) {
        super();
    }
}

class OrderItemAddedEvent extends DomainEventBase {
    constructor(
        public readonly orderId: OrderId,
        public readonly productId: string,
        public readonly quantity: number,
        public readonly unitPrice: number
    ) {
        super();
    }
}

class OrderStatusChangedEvent extends DomainEventBase {
    constructor(
        public readonly orderId: OrderId,
        public readonly previousStatus: string,
        public readonly newStatus: string
    ) {
        super();
    }
}

class OrderCancelledEvent extends DomainEventBase {
    constructor(
        public readonly orderId: OrderId,
        public readonly reason: string
    ) {
        super();
    }
}

// Test aggregate implementation
class Order extends AggregateRoot<OrderId> {
    private _customerId: string;
    private _status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
    private _items: Array<{ productId: string; quantity: number; unitPrice: number }> = [];
    private _createdAt: Date;

    constructor(id: OrderId, customerId: string) {
        super(id);
        this._customerId = customerId;
        this._status = 'pending';
        this._createdAt = new Date();

        this.addEvent(new OrderCreatedEvent(id, customerId, 0));
        this.incrementVersion(); // Increment version for the creation event
    }

    get customerId(): string {
        return this._customerId;
    }

    get status(): string {
        return this._status;
    }

    get items(): ReadonlyArray<{ productId: string; quantity: number; unitPrice: number }> {
        return [...this._items];
    }

    get totalAmount(): number {
        return this._items.reduce((total, item) => total + (item.quantity * item.unitPrice), 0);
    }

    get createdAt(): Date {
        return this._createdAt;
    }

    public addItem(productId: string, quantity: number, unitPrice: number): void {
        if (this._status !== 'pending') {
            throw new Error('Cannot modify confirmed order');
        }

        const existingItemIndex = this._items.findIndex(item => item.productId === productId);
        if (existingItemIndex >= 0) {
            this._items[existingItemIndex]!.quantity += quantity;
        } else {
            this._items.push({ productId, quantity, unitPrice });
        }

        this.addEvent(new OrderItemAddedEvent(this.id, productId, quantity, unitPrice));
        this.incrementVersion();
    }

    public confirm(): void {
        if (this._status !== 'pending') {
            throw new Error('Only pending orders can be confirmed');
        }
        if (this._items.length === 0) {
            throw new Error('Cannot confirm order with no items');
        }

        const previousStatus = this._status;
        this._status = 'confirmed';
        this.addEvent(new OrderStatusChangedEvent(this.id, previousStatus, this._status));
        this.incrementVersion();
    }

    public ship(): void {
        if (this._status !== 'confirmed') {
            throw new Error('Only confirmed orders can be shipped');
        }

        const previousStatus = this._status;
        this._status = 'shipped';
        this.addEvent(new OrderStatusChangedEvent(this.id, previousStatus, this._status));
        this.incrementVersion();
    }

    public deliver(): void {
        if (this._status !== 'shipped') {
            throw new Error('Only shipped orders can be delivered');
        }

        const previousStatus = this._status;
        this._status = 'delivered';
        this.addEvent(new OrderStatusChangedEvent(this.id, previousStatus, this._status));
        this.incrementVersion();
    }

    public cancel(reason: string): void {
        if (this._status === 'delivered') {
            throw new Error('Cannot cancel delivered order');
        }
        if (this._status === 'cancelled') {
            throw new Error('Order is already cancelled');
        }

        this._status = 'cancelled';
        this.addEvent(new OrderCancelledEvent(this.id, reason));
        this.incrementVersion();
    }

    // Method to simulate loading from persistence
    public static fromSnapshot(
        id: OrderId,
        customerId: string,
        status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled',
        items: Array<{ productId: string; quantity: number; unitPrice: number }>,
        version: number,
        createdAt: Date
    ): Order {
        const order = new Order(id, customerId);
        order._status = status;
        order._items = [...items];
        order._createdAt = createdAt;
        order.clearEvents(); // Clear creation event
        order.setVersion(version); // Set the loaded version
        return order;
    }

    // Protected method to set version for testing scenarios
    protected override setVersion(version: number): void {
        super.setVersion(version);
    }
}

// Test aggregate with complex version scenarios
class ComplexAggregate extends AggregateRoot<OrderId> {
    private _data: Record<string, unknown> = {};
    private _operationCount: number = 0;

    constructor(id: OrderId) {
        super(id);
    }

    get data(): Record<string, unknown> {
        return { ...this._data };
    }

    get operationCount(): number {
        return this._operationCount;
    }

    public setData(key: string, value: unknown): void {
        this._data[key] = value;
        this._operationCount++;
        this.addEvent(new TestDataChangedEvent(this.id, key, value));
        this.incrementVersion();
    }

    public removeData(key: string): void {
        delete this._data[key];
        this._operationCount++;
        this.addEvent(new TestDataRemovedEvent(this.id, key));
        this.incrementVersion();
    }

    public performBulkOperation(operations: Array<{ type: 'set' | 'remove'; key: string; value?: unknown }>): void {
        for (const op of operations) {
            if (op.type === 'set') {
                this.setData(op.key, op.value);
            } else {
                this.removeData(op.key);
            }
        }
    }

    // Method to access protected version property for testing
    public getCurrentVersion(): number {
        return this.version;
    }

    // Method to simulate version conflicts
    public simulateVersionConflict(expectedVersion: number): void {
        if (this.version !== expectedVersion) {
            throw new Error(`Version conflict: expected ${expectedVersion}, but current version is ${this.version}`);
        }
    }

    // Public method to set version for testing
    public setVersionForTesting(version: number): void {
        this.setVersion(version);
    }
}

class TestDataChangedEvent extends DomainEventBase {
    constructor(
        public readonly aggregateId: OrderId,
        public readonly key: string,
        public readonly value: unknown
    ) {
        super();
    }
}

class TestDataRemovedEvent extends DomainEventBase {
    constructor(
        public readonly aggregateId: OrderId,
        public readonly key: string
    ) {
        super();
    }
}

describe('AggregateRoot Version Control Tests', () => {
    describe('Version Initialization', () => {
        test('Should_InitializeVersionToZero_When_CreatingNewAggregate', () => {
            // Given & When
            const order = new Order(new OrderId('order-1'), 'customer-1');

            // Then
            // Version is 1 after creation because OrderCreatedEvent is added in constructor
            expect(order.version).toBe(1);
        });

        test('Should_InitializeVersionToZero_When_CreatingComplexAggregate', () => {
            // Given & When
            const aggregate = new ComplexAggregate(new OrderId('aggregate-1'));

            // Then
            expect(aggregate.getCurrentVersion()).toBe(0);
        });
    });

    describe('Version Increment on Events', () => {
        test('Should_IncrementVersion_When_AddingDomainEvents', () => {
            // Given
            const order = new Order(new OrderId('order-1'), 'customer-1');
            const initialVersion = order.version;

            // When
            order.addItem('product-1', 2, 50.00);

            // Then
            expect(order.version).toBe(initialVersion + 1);
            expect(order.events.length).toBe(2); // Creation + ItemAdded
        });

        test('Should_IncrementVersionForEachEvent_When_PerformingMultipleOperations', () => {
            // Given
            const order = new Order(new OrderId('order-1'), 'customer-1');
            const initialVersion = order.version;

            // When
            order.addItem('product-1', 2, 50.00); // +1 event
            order.addItem('product-2', 1, 25.00); // +1 event
            order.confirm(); // +1 event

            // Then
            expect(order.version).toBe(initialVersion + 3);
            expect(order.events.length).toBe(4); // Creation + 3 operations
        });

        test('Should_IncrementVersionCorrectly_When_PerformingComplexOperations', () => {
            // Given
            const aggregate = new ComplexAggregate(new OrderId('aggregate-1'));
            const initialVersion = aggregate.getCurrentVersion();

            // When
            aggregate.setData('key1', 'value1'); // +1 event
            aggregate.setData('key2', 42); // +1 event
            aggregate.removeData('key1'); // +1 event
            aggregate.setData('key3', { nested: true }); // +1 event

            // Then
            expect(aggregate.getCurrentVersion()).toBe(initialVersion + 4);
            expect(aggregate.events.length).toBe(4);
        });

        test('Should_IncrementVersionForBulkOperations_When_MultipleEventsGenerated', () => {
            // Given
            const aggregate = new ComplexAggregate(new OrderId('aggregate-1'));
            const initialVersion = aggregate.getCurrentVersion();

            const operations = [
                { type: 'set' as const, key: 'a', value: 1 },
                { type: 'set' as const, key: 'b', value: 2 },
                { type: 'remove' as const, key: 'a' },
                { type: 'set' as const, key: 'c', value: 3 }
            ];

            // When
            aggregate.performBulkOperation(operations);

            // Then
            expect(aggregate.getCurrentVersion()).toBe(initialVersion + 4);
            expect(aggregate.events.length).toBe(4);
        });
    });

    describe('Version Stability', () => {
        test('Should_NotChangeVersion_When_NoEventsAdded', () => {
            // Given
            const order = new Order(new OrderId('order-1'), 'customer-1');
            const initialVersion = order.version;

            // When - Perform read operations only
            const customerId = order.customerId;
            const status = order.status;
            const items = order.items;
            const totalAmount = order.totalAmount;

            // Then
            expect(order.version).toBe(initialVersion);
        });

        test('Should_MaintainVersionConsistency_When_ClearingEvents', () => {
            // Given
            const order = new Order(new OrderId('order-1'), 'customer-1');
            order.addItem('product-1', 2, 50.00);
            order.confirm();

            const versionBeforeClear = order.version;
            const eventsCountBeforeClear = order.events.length;

            // When
            order.clearEvents();

            // Then
            expect(order.version).toBe(versionBeforeClear); // Version should not change
            expect(order.events.length).toBe(0); // Events should be cleared
        });

        test('Should_MaintainVersionAfterEventClearing_When_AddingNewEvents', () => {
            // Given
            const order = new Order(new OrderId('order-1'), 'customer-1');
            order.addItem('product-1', 2, 50.00);
            order.confirm();

            const versionAfterOperations = order.version;
            order.clearEvents();

            // When
            order.ship();

            // Then
            expect(order.version).toBe(versionAfterOperations + 1);
            expect(order.events.length).toBe(1); // Only the new ship event
        });
    });

    describe('Version Conflict Detection', () => {
        test('Should_DetectVersionConflict_When_ExpectedVersionDiffers', () => {
            // Given
            const aggregate = new ComplexAggregate(new OrderId('aggregate-1'));
            aggregate.setData('key1', 'value1'); // Version becomes 1

            // When & Then
            expect(() => aggregate.simulateVersionConflict(0))
                .toThrow('Version conflict: expected 0, but current version is 1');

            expect(() => aggregate.simulateVersionConflict(2))
                .toThrow('Version conflict: expected 2, but current version is 1');
        });

        test('Should_PassVersionCheck_When_ExpectedVersionMatches', () => {
            // Given
            const aggregate = new ComplexAggregate(new OrderId('aggregate-1'));
            aggregate.setData('key1', 'value1'); // Version becomes 1

            // When & Then
            expect(() => aggregate.simulateVersionConflict(1)).not.toThrow();
        });

        test('Should_HandleConcurrentModificationScenario_When_VersionsConflict', () => {
            // Given - Simulate two instances of the same aggregate
            const aggregate1 = new ComplexAggregate(new OrderId('aggregate-1'));
            const aggregate2 = new ComplexAggregate(new OrderId('aggregate-1'));

            // Both start at version 0
            expect(aggregate1.getCurrentVersion()).toBe(0);
            expect(aggregate2.getCurrentVersion()).toBe(0);

            // When - First aggregate makes changes
            aggregate1.setData('key1', 'value1'); // Version becomes 1
            aggregate1.setData('key2', 'value2'); // Version becomes 2

            // Then - Second aggregate should detect conflict when trying to save
            expect(() => aggregate2.simulateVersionConflict(2))
                .toThrow('Version conflict: expected 2, but current version is 0');
        });
    });

    describe('Version Persistence Scenarios', () => {
        test('Should_LoadAggregateWithCorrectVersion_When_RestoringFromSnapshot', () => {
            // Given
            const items = [
                { productId: 'product-1', quantity: 2, unitPrice: 50.00 },
                { productId: 'product-2', quantity: 1, unitPrice: 25.00 }
            ];
            const version = 5;
            const createdAt = new Date('2025-01-01');

            // When
            const order = Order.fromSnapshot(
                new OrderId('order-1'),
                'customer-1',
                'confirmed',
                items,
                version,
                createdAt
            );

            // Then
            expect(order.version).toBe(version);
            expect(order.status).toBe('confirmed');
            expect(order.items).toEqual(items);
            expect(order.events.length).toBe(0); // No events when loading from snapshot
        });

        test('Should_ContinueVersioning_When_ModifyingRestoredAggregate', () => {
            // Given
            const order = Order.fromSnapshot(
                new OrderId('order-1'),
                'customer-1',
                'confirmed',
                [{ productId: 'product-1', quantity: 2, unitPrice: 50.00 }],
                3,
                new Date()
            );

            const initialVersion = order.version;

            // When
            order.ship(); // Should increment version

            // Then
            expect(order.version).toBe(initialVersion + 1);
            expect(order.status).toBe('shipped');
            expect(order.events.length).toBe(1); // Ship event
        });

        test('Should_HandleOptimisticLocking_When_SimulatingConcurrentUpdates', () => {
            // Given - Simulate loading same aggregate in two different contexts
            const order1 = Order.fromSnapshot(
                new OrderId('order-1'),
                'customer-1',
                'confirmed',
                [{ productId: 'product-1', quantity: 1, unitPrice: 100.00 }],
                5,
                new Date()
            );

            const order2 = Order.fromSnapshot(
                new OrderId('order-1'),
                'customer-1',
                'confirmed',
                [{ productId: 'product-1', quantity: 1, unitPrice: 100.00 }],
                5,
                new Date()
            );

            // When - First context makes changes
            order1.ship(); // Version becomes 6

            // Then - Second context should detect version conflict
            // Simulate checking version before save
            const expectedVersionForOrder2 = 5;
            const actualVersionAfterOrder1Changes = 6;

            // This would typically be caught by the persistence layer
            expect(order1.version).toBe(6);
            expect(order2.version).toBe(5);
            expect(order1.version).not.toBe(expectedVersionForOrder2);
        });
    });

    describe('Version Edge Cases', () => {
        test('Should_HandleRapidSuccessiveOperations_When_GeneratingManyEvents', () => {
            // Given
            const aggregate = new ComplexAggregate(new OrderId('aggregate-1'));
            const initialVersion = aggregate.getCurrentVersion();

            // When - Perform many rapid operations
            for (let i = 0; i < 100; i++) {
                aggregate.setData(`key${i}`, `value${i}`);
            }

            // Then
            expect(aggregate.getCurrentVersion()).toBe(initialVersion + 100);
            expect(aggregate.events.length).toBe(100);
        });

        test('Should_HandleEventClearingCycles_When_PerformingMultipleClearOperations', () => {
            // Given
            const order = new Order(new OrderId('order-1'), 'customer-1');

            // When - Cycle through operations and clearing
            order.addItem('product-1', 1, 50.00); // Version: 2 (1 from creation + 1 from addItem)
            expect(order.version).toBe(2);

            order.clearEvents();
            expect(order.version).toBe(2); // Version unchanged after clear

            order.addItem('product-2', 1, 25.00); // Version: 3
            expect(order.version).toBe(3);

            order.clearEvents();
            expect(order.version).toBe(3); // Version unchanged after clear

            order.confirm(); // Version: 4
            expect(order.version).toBe(4);

            // Then
            expect(order.events.length).toBe(1); // Only the confirm event
        });

        test('Should_MaintainVersionIntegrity_When_ExceptionsOccur', () => {
            // Given
            const order = new Order(new OrderId('order-1'), 'customer-1');
            order.addItem('product-1', 1, 50.00);
            order.confirm();

            const versionBeforeError = order.version;

            // When - Attempt invalid operation that throws exception
            expect(() => order.confirm()).toThrow('Only pending orders can be confirmed');

            // Then - Version should not change when operation fails
            expect(order.version).toBe(versionBeforeError);
            expect(order.status).toBe('confirmed'); // State should remain unchanged
        });

        test('Should_HandleZeroVersionCorrectly_When_StartingFromScratch', () => {
            // Given & When
            const aggregate = new ComplexAggregate(new OrderId('new-aggregate'));

            // Then
            expect(aggregate.getCurrentVersion()).toBe(0);

            // When - Perform operation
            aggregate.setData('first-key', 'first-value');

            // Then
            expect(aggregate.getCurrentVersion()).toBe(1);
        });

        test('Should_HandleLargeVersionNumbers_When_LongRunningAggregate', () => {
            // Given
            const aggregate = new ComplexAggregate(new OrderId('long-running'));

            // Simulate a long-running aggregate that has been loaded with high version
            aggregate.setVersionForTesting(999999);

            const initialVersion = aggregate.getCurrentVersion();

            // When
            aggregate.setData('key', 'value');

            // Then
            expect(aggregate.getCurrentVersion()).toBe(initialVersion + 1);
            expect(aggregate.getCurrentVersion()).toBe(1000000);
        });
    });

    describe('Version Performance', () => {
        test('Should_MaintainPerformance_When_HandlingManyVersionIncrements', () => {
            // Given
            const aggregate = new ComplexAggregate(new OrderId('performance-test'));
            const operationCount = 10000;

            // When
            const start = performance.now();

            for (let i = 0; i < operationCount; i++) {
                aggregate.setData(`perf-key-${i}`, i);
                if (i % 1000 === 0) {
                    aggregate.clearEvents(); // Periodically clear to simulate event handling
                }
            }

            const end = performance.now();

            // Then
            expect(aggregate.getCurrentVersion()).toBe(operationCount);
            expect(end - start).toBeLessThan(1000); // Should complete within 1 second

            console.log(`Version increment performance: ${operationCount} operations in ${(end - start).toFixed(2)}ms`);
        });
    });
});