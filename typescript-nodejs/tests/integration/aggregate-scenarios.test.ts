import { Order, OrderId, CustomerId } from '../../examples/domain/entities/order';
import { OrderItem } from '../../examples/domain/entities/order-item';
import { Money } from '../../examples/domain/value-objects/money';
import { OrderStatus } from '../../examples/domain/value-objects/order-status';
import {
    OrderCreatedEvent,
    OrderStatusChangedEvent,
    OrderItemAddedEvent,
    OrderItemRemovedEvent,
    OrderItemUpdatedEvent
} from '../../examples/domain/events/order-events';

/**
 * Integration tests for AggregateRoot event collection and business rules
 * Tests complete aggregate behavior including event sourcing, version control, and complex workflows
 */
describe('AggregateRoot Event Collection Integration Tests', () => {
    describe('Should_CollectEventsCorrectly_When_PerformingBusinessOperations', () => {
        it('should raise OrderCreatedEvent when order is created', () => {
            // Given
            const customerId = new CustomerId('customer-123');
            const correlationId = 'correlation-456';

            // When
            const order = new Order(OrderId.generate(), customerId, correlationId);

            // Then
            expect(order.events).toHaveLength(1);
            expect(order.events[0]).toBeInstanceOf(OrderCreatedEvent);

            const createdEvent = order.events[0] as OrderCreatedEvent;
            expect(createdEvent.orderId).toBe(order.id.value);
            expect(createdEvent.customerId).toBe(customerId.value);
            expect(createdEvent.totalAmount).toBe(0); // Empty order initially
            expect(createdEvent.correlationId).toBe(correlationId);
        });

        it('should raise OrderItemAddedEvent when item is added', () => {
            // Given
            const customerId = new CustomerId('customer-123');
            const order = Order.create(customerId);
            order.clearEvents(); // Clear creation event for clean testing

            const money = new Money(10.99, 'USD');
            const item = OrderItem.create('Product A', money, 2);

            // When
            const result = order.addItem(item);

            // Then
            expect(result.isSuccess).toBe(true);
            expect(order.events).toHaveLength(1);
            expect(order.events[0]).toBeInstanceOf(OrderItemAddedEvent);

            const addedEvent = order.events[0] as OrderItemAddedEvent;
            expect(addedEvent.orderId).toBe(order.id.value);
            expect(addedEvent.itemId).toBe(item.id.value);
            expect(addedEvent.productName).toBe('Product A');
            expect(addedEvent.quantity).toBe(2);
            expect(addedEvent.unitPrice).toBe(10.99);
            expect(addedEvent.currency).toBe('USD');
        });

        it('should raise OrderStatusChangedEvent when order is confirmed', () => {
            // Given
            const customerId = new CustomerId('customer-123');
            const order = Order.create(customerId);
            const money = new Money(10.99, 'USD');
            const item = OrderItem.create('Product A', money, 1);
            order.addItem(item);
            order.clearEvents(); // Clear previous events

            // When
            const result = order.confirm();

            // Then
            expect(result.isSuccess).toBe(true);
            expect(order.events).toHaveLength(1);
            expect(order.events[0]).toBeInstanceOf(OrderStatusChangedEvent);

            const statusEvent = order.events[0] as OrderStatusChangedEvent;
            expect(statusEvent.orderId).toBe(order.id.value);
            expect(statusEvent.previousStatus).toBe('Pending');
            expect(statusEvent.newStatus).toBe('Confirmed');
        });

        it('should collect multiple events in correct order', () => {
            // Given
            const customerId = new CustomerId('customer-123');
            const order = Order.create(customerId);

            // When - Perform multiple operations
            const money1 = new Money(10.99, 'USD');
            const item1 = OrderItem.create('Product A', money1, 1);
            order.addItem(item1);

            const money2 = new Money(15.50, 'USD');
            const item2 = OrderItem.create('Product B', money2, 2);
            order.addItem(item2);

            order.confirm();

            // Then - Events collected in chronological order
            expect(order.events).toHaveLength(4); // Created + 2 Items Added + Confirmed

            expect(order.events[0]).toBeInstanceOf(OrderCreatedEvent);
            expect(order.events[1]).toBeInstanceOf(OrderItemAddedEvent);
            expect(order.events[2]).toBeInstanceOf(OrderItemAddedEvent);
            expect(order.events[3]).toBeInstanceOf(OrderStatusChangedEvent);

            // Verify event details
            const itemEvent1 = order.events[1] as OrderItemAddedEvent;
            const itemEvent2 = order.events[2] as OrderItemAddedEvent;
            const statusEvent = order.events[3] as OrderStatusChangedEvent;

            expect(itemEvent1.productName).toBe('Product A');
            expect(itemEvent2.productName).toBe('Product B');
            expect(statusEvent.newStatus).toBe('Confirmed');
        });
    });

    describe('Should_ManageVersionControl_When_ModifyingAggregate', () => {
        it('should increment version with each business operation', () => {
            // Given
            const customerId = new CustomerId('customer-123');
            const order = Order.create(customerId);

            // Then - Initial version
            expect(order.version).toBe(0);

            // When - Add item
            const money = new Money(10.99, 'USD');
            const item = OrderItem.create('Product A', money, 1);
            order.addItem(item);

            // Then - Version incremented
            expect(order.version).toBe(1);

            // When - Confirm order
            order.confirm();

            // Then - Version incremented again
            expect(order.version).toBe(2);

            // When - Ship order
            order.ship();

            // Then - Version incremented again
            expect(order.version).toBe(3);
        });

        it('should maintain version consistency across operations', () => {
            // Given
            const customerId = new CustomerId('customer-123');
            const order = Order.create(customerId);
            const money = new Money(10.99, 'USD');

            // When - Perform sequence of operations
            order.addItem(OrderItem.create('Product A', money, 1)); // Version 1
            order.addItem(OrderItem.create('Product B', money, 2)); // Version 2
            order.confirm(); // Version 3

            const beforeShipVersion = order.version;
            order.ship(); // Version 4
            const afterShipVersion = order.version;

            // Then
            expect(beforeShipVersion).toBe(3);
            expect(afterShipVersion).toBe(4);
            expect(afterShipVersion).toBe(beforeShipVersion + 1);
        });

        it('should handle version for failed operations', () => {
            // Given
            const customerId = new CustomerId('customer-123');
            const order = Order.create(customerId);
            const initialVersion = order.version;

            // When - Try to confirm empty order (should fail)
            const result = order.confirm();

            // Then - Version should not change on failed operation
            expect(result.isFailure).toBe(true);
            expect(order.version).toBe(initialVersion);
        });
    });

    describe('Should_EnforceBusinessRules_When_ModifyingAggregate', () => {
        it('should prevent operations on finalized orders', () => {
            // Given
            const customerId = new CustomerId('customer-123');
            const order = Order.create(customerId);
            const money = new Money(10.99, 'USD');
            const item = OrderItem.create('Product A', money, 1);

            order.addItem(item);
            order.confirm();
            order.ship();
            order.deliver(); // Order is now delivered (final state)

            const newItem = OrderItem.create('Product B', money, 1);

            // When & Then - Cannot add items to delivered order
            const addResult = order.addItem(newItem);
            expect(addResult.isFailure).toBe(true);
            expect(addResult.error.code).toBe('Order.CannotModifyFinalOrder');

            // When & Then - Cannot remove items from delivered order
            const removeResult = order.removeItem(item.id);
            expect(removeResult.isFailure).toBe(true);
            expect(removeResult.error.code).toBe('Order.CannotModifyFinalOrder');

            // When & Then - Cannot update items in delivered order
            const updateResult = order.updateItemQuantity(item.id, 5);
            expect(updateResult.isFailure).toBe(true);
            expect(updateResult.error.code).toBe('Order.CannotModifyFinalOrder');
        });

        it('should prevent invalid status transitions', () => {
            // Given
            const customerId = new CustomerId('customer-123');
            const order = Order.create(customerId);
            const money = new Money(10.99, 'USD');
            const item = OrderItem.create('Product A', money, 1);

            order.addItem(item);
            order.confirm();
            order.ship();

            // When & Then - Cannot confirm already shipped order
            const confirmResult = order.confirm();
            expect(confirmResult.isFailure).toBe(true);
            expect(confirmResult.error.code).toBe('Order.InvalidStatusTransition');

            // When & Then - Cannot ship already shipped order
            const shipResult = order.ship();
            expect(shipResult.isFailure).toBe(true);
            expect(shipResult.error.code).toBe('Order.InvalidStatusTransition');
        });

        it('should enforce business constraints on order contents', () => {
            // Given
            const customerId = new CustomerId('customer-123');
            const order = Order.create(customerId);

            // When & Then - Cannot confirm empty order
            const confirmResult = order.confirm();
            expect(confirmResult.isFailure).toBe(true);
            expect(confirmResult.error.code).toBe('Order.EmptyOrder');

            // When & Then - Cannot add items exceeding maximum amount
            const expensiveItem = OrderItem.create('Expensive Product', new Money(50000, 'USD'), 3);
            const addResult = order.addItem(expensiveItem);
            expect(addResult.isFailure).toBe(true);
            expect(addResult.error.code).toBe('Order.ExceedsMaxAmount');
        });

        it('should enforce currency consistency', () => {
            // Given
            const customerId = new CustomerId('customer-123');
            const order = Order.create(customerId);

            const usdItem = OrderItem.create('USD Product', new Money(10, 'USD'), 1);
            const eurItem = OrderItem.create('EUR Product', new Money(10, 'EUR'), 1);

            order.addItem(usdItem);

            // When & Then - Cannot mix currencies
            const addResult = order.addItem(eurItem);
            expect(addResult.isFailure).toBe(true);
            expect(addResult.error.code).toBe('Order.MixedCurrencies');
        });
    });

    describe('Should_HandleComplexWorkflows_When_PerformingBusinessOperations', () => {
        it('should handle complete order lifecycle with events', () => {
            // Given
            const customerId = new CustomerId('customer-123');
            const order = Order.create(customerId);

            // When - Complete workflow
            const item1 = OrderItem.create('Product A', new Money(10, 'USD'), 2);
            const item2 = OrderItem.create('Product B', new Money(15, 'USD'), 1);

            order.addItem(item1);
            order.addItem(item2);
            order.updateItemQuantity(item1.id, 3); // Change quantity
            order.removeItem(item2.id); // Remove item
            order.addItem(OrderItem.create('Product C', new Money(20, 'USD'), 1)); // Add different item
            order.confirm();
            order.ship();
            order.deliver();

            // Then - Verify final state
            expect(order.status).toBe(OrderStatus.DELIVERED);
            expect(order.itemCount).toBe(2); // item1 (updated) + Product C
            expect(order.totalAmount.amount).toBe(50); // (10*3) + (20*1)

            // Then - Verify event count
            const expectedEvents = 8; // Created + Add1 + Add2 + Update1 + Remove2 + Add3 + Confirm + Ship + Deliver
            expect(order.events).toHaveLength(expectedEvents);

            // Then - Verify version
            expect(order.version).toBe(expectedEvents - 1); // Version starts at 0
        });

        it('should handle cancellation workflow', () => {
            // Given
            const customerId = new CustomerId('customer-123');
            const order = Order.create(customerId);

            // When - Build order and then cancel
            const item = OrderItem.create('Product A', new Money(10, 'USD'), 1);
            order.addItem(item);
            order.confirm();

            const initialEventCount = order.events.length;
            const cancelResult = order.cancel();

            // Then - Cancellation succeeded
            expect(cancelResult.isSuccess).toBe(true);
            expect(order.status).toBe(OrderStatus.CANCELLED);
            expect(order.events).toHaveLength(initialEventCount + 1);

            const cancelEvent = order.events[order.events.length - 1] as OrderStatusChangedEvent;
            expect(cancelEvent.previousStatus).toBe('Confirmed');
            expect(cancelEvent.newStatus).toBe('Cancelled');

            // Then - Cannot perform further operations
            const addResult = order.addItem(OrderItem.create('Another Product', new Money(5, 'USD'), 1));
            expect(addResult.isFailure).toBe(true);
        });

        it('should handle item management operations', () => {
            // Given
            const customerId = new CustomerId('customer-123');
            const order = Order.create(customerId);

            const item1 = OrderItem.create('Product A', new Money(10, 'USD'), 1);
            const item2 = OrderItem.create('Product B', new Money(15, 'USD'), 2);

            // When - Add items
            order.addItem(item1);
            order.addItem(item2);

            const afterAddEvents = order.events.length;

            // When - Update quantity
            order.updateItemQuantity(item1.id, 5);

            // Then - Update event raised
            expect(order.events).toHaveLength(afterAddEvents + 1);
            expect(order.events[afterAddEvents]).toBeInstanceOf(OrderItemUpdatedEvent);

            const updateEvent = order.events[afterAddEvents] as OrderItemUpdatedEvent;
            expect(updateEvent.itemId).toBe(item1.id.value);
            expect(updateEvent.previousQuantity).toBe(1);
            expect(updateEvent.newQuantity).toBe(5);

            // When - Remove item
            const afterUpdateEvents = order.events.length;
            order.removeItem(item2.id);

            // Then - Remove event raised
            expect(order.events).toHaveLength(afterUpdateEvents + 1);
            expect(order.events[afterUpdateEvents]).toBeInstanceOf(OrderItemRemovedEvent);

            const removeEvent = order.events[afterUpdateEvents] as OrderItemRemovedEvent;
            expect(removeEvent.itemId).toBe(item2.id.value);
            expect(removeEvent.productName).toBe('Product B');
        });
    });

    describe('Should_HandleEventClearing_When_PersistingAggregate', () => {
        it('should clear events after successful persistence simulation', () => {
            // Given
            const customerId = new CustomerId('customer-123');
            const order = Order.create(customerId);

            const item = OrderItem.create('Product A', new Money(10, 'USD'), 1);
            order.addItem(item);
            order.confirm();

            const eventCountBeforeClear = order.events.length;

            // When - Simulate persistence (clear events)
            order.clearEvents();

            // Then - Events cleared
            expect(order.events).toHaveLength(0);
            expect(eventCountBeforeClear).toBeGreaterThan(0); // Verify there were events before
        });

        it('should maintain state after clearing events', () => {
            // Given
            const customerId = new CustomerId('customer-123');
            const order = Order.create(customerId);

            const item = OrderItem.create('Product A', new Money(10, 'USD'), 2);
            order.addItem(item);
            order.confirm();

            const stateBeforeClear = {
                status: order.status,
                itemCount: order.itemCount,
                totalAmount: order.totalAmount.amount,
                version: order.version
            };

            // When - Clear events
            order.clearEvents();

            // Then - State preserved
            expect(order.status).toBe(stateBeforeClear.status);
            expect(order.itemCount).toBe(stateBeforeClear.itemCount);
            expect(order.totalAmount.amount).toBe(stateBeforeClear.totalAmount);
            expect(order.version).toBe(stateBeforeClear.version);
        });
    });

    describe('Should_HandlePerformance_When_CollectingManyEvents', () => {
        it('should handle large number of events efficiently', () => {
            // Given
            const customerId = new CustomerId('customer-123');
            const order = Order.create(customerId);

            // When - Generate many events
            const startTime = performance.now();

            for (let i = 0; i < 1000; i++) {
                const item = OrderItem.create(`Product ${i}`, new Money(1, 'USD'), 1);
                order.addItem(item);
            }

            const endTime = performance.now();
            const duration = endTime - startTime;

            // Then - Should complete efficiently
            expect(order.events).toHaveLength(1001); // 1000 add events + 1 creation event
            expect(duration).toBeLessThan(500); // Should complete within 500ms
        });

        it('should provide efficient event access', () => {
            // Given
            const customerId = new CustomerId('customer-123');
            const order = Order.create(customerId);

            // Add several events
            for (let i = 0; i < 100; i++) {
                const item = OrderItem.create(`Product ${i}`, new Money(1, 'USD'), 1);
                order.addItem(item);
            }

            // When - Access events multiple times
            const startTime = performance.now();

            for (let i = 0; i < 1000; i++) {
                const events = order.events;
                const eventCount = events.length;
                const firstEvent = events[0];
                const lastEvent = events[events.length - 1];
            }

            const endTime = performance.now();
            const duration = endTime - startTime;

            // Then - Access should be efficient
            expect(duration).toBeLessThan(50); // Should complete within 50ms
        });
    });
});