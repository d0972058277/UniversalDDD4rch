import { InMemoryOrderRepository } from '../../examples/infrastructure/repositories/in-memory-order-repository';
import { Order, OrderId, CustomerId } from '../../examples/domain/entities/order';
import { OrderItem } from '../../examples/domain/entities/order-item';
import { Money } from '../../examples/domain/value-objects/money';
import { OrderStatus } from '../../examples/domain/value-objects/order-status';
import { Result, Error } from '../../src/functional';

/**
 * Integration tests for Repository async patterns and operations
 * Tests complete repository workflows including CRUD operations, querying, and error handling
 */
describe('Repository Async Patterns Integration Tests', () => {
    let repository: InMemoryOrderRepository;

    beforeEach(() => {
        repository = new InMemoryOrderRepository();
    });

    afterEach(() => {
        repository.clear();
    });

    describe('Should_HandleBasicCRUDOperations_When_ManagingAggregates', () => {
        it('should add and retrieve order successfully', async () => {
            // Given
            const customerId = new CustomerId('customer-123');
            const order = Order.create(customerId);
            const item = OrderItem.create('Product A', new Money(10.99, 'USD'), 2);
            order.addItem(item);

            // When - Add order
            const addResult = await repository.addAsync(order);

            // Then - Add succeeded
            expect(addResult.isSuccess).toBe(true);

            // When - Retrieve order
            const getResult = await repository.getByIdAsync(order.id);

            // Then - Retrieve succeeded
            expect(getResult.isSuccess).toBe(true);
            expect(getResult.value.hasValue).toBe(true);

            const retrievedOrder = getResult.value.value;
            expect(retrievedOrder.id.equals(order.id)).toBe(true);
            expect(retrievedOrder.customerId.equals(customerId)).toBe(true);
            expect(retrievedOrder.itemCount).toBe(1);
            expect(retrievedOrder.totalAmount.amount).toBe(21.98);
        });

        it('should update order with optimistic concurrency control', async () => {
            // Given
            const customerId = new CustomerId('customer-123');
            const order = Order.create(customerId);
            const item = OrderItem.create('Product A', new Money(10.99, 'USD'), 1);
            order.addItem(item);

            await repository.addAsync(order);
            const initialVersion = order.version;

            // When - Update order
            order.confirm();
            const updateResult = await repository.updateAsync(order);

            // Then - Update succeeded
            expect(updateResult.isSuccess).toBe(true);
            expect(order.version).toBe(initialVersion + 1);

            // When - Retrieve updated order
            const getResult = await repository.getByIdAsync(order.id);
            const retrievedOrder = getResult.value.value;

            // Then - Changes persisted
            expect(retrievedOrder.status).toBe(OrderStatus.CONFIRMED);
            expect(retrievedOrder.version).toBe(order.version);
        });

        it('should handle optimistic concurrency conflicts', async () => {
            // Given
            const customerId = new CustomerId('customer-123');
            const order = Order.create(customerId);
            const item = OrderItem.create('Product A', new Money(10.99, 'USD'), 1);
            order.addItem(item);

            await repository.addAsync(order);

            // When - Simulate concurrent modification
            const order1 = (await repository.getByIdAsync(order.id)).value.value;
            const order2 = (await repository.getByIdAsync(order.id)).value.value;

            order1.confirm();
            await repository.updateAsync(order1); // First update succeeds

            order2.confirm();
            const conflictResult = await repository.updateAsync(order2); // Second update should fail

            // Then - Concurrency conflict detected
            expect(conflictResult.isFailure).toBe(true);
            expect(conflictResult.error.category).toBe('Concurrency');
            expect(conflictResult.error.code).toBe('Repository.ConcurrencyConflict');
        });

        it('should delete order successfully', async () => {
            // Given
            const customerId = new CustomerId('customer-123');
            const order = Order.create(customerId);
            await repository.addAsync(order);

            // When - Delete order
            const deleteResult = await repository.deleteAsync(order.id);

            // Then - Delete succeeded
            expect(deleteResult.isSuccess).toBe(true);

            // When - Try to retrieve deleted order
            const getResult = await repository.getByIdAsync(order.id);

            // Then - Order not found
            expect(getResult.isSuccess).toBe(true);
            expect(getResult.value.hasValue).toBe(false);
        });

        it('should check if order exists', async () => {
            // Given
            const customerId = new CustomerId('customer-123');
            const order = Order.create(customerId);

            // When - Check before adding
            const existsBeforeResult = await repository.existsAsync(order.id);

            // Then - Should not exist
            expect(existsBeforeResult.isSuccess).toBe(true);
            expect(existsBeforeResult.value).toBe(false);

            // When - Add order and check again
            await repository.addAsync(order);
            const existsAfterResult = await repository.existsAsync(order.id);

            // Then - Should exist
            expect(existsAfterResult.isSuccess).toBe(true);
            expect(existsAfterResult.value).toBe(true);
        });
    });

    describe('Should_HandleQueryOperations_When_SearchingOrders', () => {
        beforeEach(async () => {
            // Set up test data
            const customers = ['customer-1', 'customer-2', 'customer-3'];
            const statuses = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.SHIPPED];

            for (let i = 0; i < 10; i++) {
                const customerId = new CustomerId(customers[i % customers.length]!);
                const order = Order.create(customerId);

                const item = OrderItem.create(
                    `Product ${i}`,
                    new Money(10 + i, 'USD'),
                    1 + (i % 3)
                );
                order.addItem(item);

                // Set different statuses
                if (i % 3 === 1) {
                    order.confirm();
                } else if (i % 3 === 2) {
                    order.confirm();
                    order.ship();
                }

                await repository.addAsync(order);
            }
        });

        it('should find orders by customer ID', async () => {
            // Given
            const customerId = new CustomerId('customer-1');

            // When
            const result = await repository.findByCustomerIdAsync(customerId);

            // Then
            expect(result.isSuccess).toBe(true);
            expect(result.value.length).toBeGreaterThan(0);

            for (const order of result.value) {
                expect(order.customerId.equals(customerId)).toBe(true);
            }
        });

        it('should find orders by status', async () => {
            // Given
            const status = OrderStatus.CONFIRMED;

            // When
            const result = await repository.findByStatusAsync(status);

            // Then
            expect(result.isSuccess).toBe(true);
            expect(result.value.length).toBeGreaterThan(0);

            for (const order of result.value) {
                expect(order.status).toBe(status);
            }
        });

        it('should find orders by customer and status', async () => {
            // Given
            const customerId = new CustomerId('customer-1');
            const status = OrderStatus.PENDING;

            // When
            const result = await repository.findByCustomerAndStatusAsync(customerId, status);

            // Then
            expect(result.isSuccess).toBe(true);

            for (const order of result.value) {
                expect(order.customerId.equals(customerId)).toBe(true);
                expect(order.status).toBe(status);
            }
        });

        it('should find orders by date range', async () => {
            // Given
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

            // When
            const result = await repository.findByDateRangeAsync(oneHourAgo, oneHourFromNow);

            // Then
            expect(result.isSuccess).toBe(true);
            expect(result.value.length).toBe(10); // All orders should be in this range

            for (const order of result.value) {
                expect(order.createdAt.getTime()).toBeGreaterThanOrEqual(oneHourAgo.getTime());
                expect(order.createdAt.getTime()).toBeLessThanOrEqual(oneHourFromNow.getTime());
            }
        });

        it('should find orders by amount range', async () => {
            // Given
            const minAmount = 15;
            const maxAmount = 25;
            const currency = 'USD';

            // When
            const result = await repository.findByAmountRangeAsync(minAmount, maxAmount, currency);

            // Then
            expect(result.isSuccess).toBe(true);

            for (const order of result.value) {
                expect(order.totalAmount.amount).toBeGreaterThanOrEqual(minAmount);
                expect(order.totalAmount.amount).toBeLessThanOrEqual(maxAmount);
                expect(order.totalAmount.currency).toBe(currency);
            }
        });

        it('should get recent orders with limit', async () => {
            // Given
            const limit = 5;

            // When
            const result = await repository.findRecentOrdersAsync(limit);

            // Then
            expect(result.isSuccess).toBe(true);
            expect(result.value.length).toBeLessThanOrEqual(limit);

            // Verify orders are sorted by creation date (most recent first)
            for (let i = 1; i < result.value.length; i++) {
                expect(result.value[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
                    result.value[i].createdAt.getTime()
                );
            }
        });

        it('should count orders by status', async () => {
            // Given
            const status = OrderStatus.PENDING;

            // When
            const result = await repository.countByStatusAsync(status);

            // Then
            expect(result.isSuccess).toBe(true);
            expect(result.value).toBeGreaterThan(0);
            expect(typeof result.value).toBe('number');
        });
    });

    describe('Should_HandleAdvancedOperations_When_PerformingComplexQueries', () => {
        beforeEach(async () => {
            // Set up more complex test data
            const customers = ['customer-A', 'customer-B'];

            for (let i = 0; i < 6; i++) {
                const customerId = new CustomerId(customers[i % 2]!);
                const order = Order.create(customerId);

                // Add different products
                const products = ['Laptop', 'Mouse', 'Keyboard'];
                const product = products[i % 3]!;
                const item = OrderItem.create(product, new Money(100 + i * 50, 'USD'), 1);
                order.addItem(item);

                if (i >= 3) {
                    order.confirm();
                }

                await repository.addAsync(order);
            }
        });

        it('should get customer statistics', async () => {
            // Given
            const customerId = new CustomerId('customer-A');

            // When
            const result = await repository.getCustomerStatisticsAsync(customerId);

            // Then
            expect(result.isSuccess).toBe(true);

            const stats = result.value;
            expect(stats.customerId).toBe('customer-A');
            expect(stats.totalOrders).toBe(3); // customer-A has 3 orders
            expect(stats.totalAmount).toBeGreaterThan(0);
            expect(stats.averageOrderValue).toBe(stats.totalAmount / stats.totalOrders);
            expect(stats.currency).toBe('USD');
            expect(stats.ordersByStatus).toBeDefined();
            expect(stats.mostOrderedProducts).toBeDefined();
        });

        it('should find orders with specific product', async () => {
            // Given
            const productName = 'Laptop';

            // When
            const result = await repository.findOrdersWithProductAsync(productName);

            // Then
            expect(result.isSuccess).toBe(true);

            for (const order of result.value) {
                expect(order.hasProduct(productName)).toBe(true);
            }
        });

        it('should get total sales for date range', async () => {
            // Given
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
            const currency = 'USD';

            // When
            const result = await repository.getTotalSalesAsync(oneHourAgo, oneHourFromNow, currency);

            // Then
            expect(result.isSuccess).toBe(true);
            expect(result.value).toBeGreaterThan(0);
            expect(typeof result.value).toBe('number');
        });

        it('should find stale orders', async () => {
            // Given
            const daysOld = 0; // Look for orders older than 0 days (none should exist)

            // When
            const result = await repository.findStaleOrdersAsync(daysOld);

            // Then
            expect(result.isSuccess).toBe(true);
            expect(result.value).toHaveLength(0); // No stale orders in fresh test data
        });

        it('should perform bulk operations', async () => {
            // Given
            const allOrders = repository.getAllOrders();
            const pendingOrders = allOrders.filter(o => o.status === OrderStatus.PENDING);
            const orderIds = pendingOrders.map(o => o.id);

            // When
            const result = await repository.bulkUpdateStatusAsync(orderIds, OrderStatus.CANCELLED);

            // Then
            expect(result.isSuccess).toBe(true);
            expect(result.value).toBe(orderIds.length);

            // Verify orders were updated
            for (const orderId of orderIds) {
                const orderResult = await repository.getByIdAsync(orderId);
                const order = orderResult.value.value;
                expect(order.status).toBe(OrderStatus.CANCELLED);
            }
        });

        it('should save multiple orders in transaction', async () => {
            // Given
            const customerId = new CustomerId('customer-batch');
            const orders: Order[] = [];

            for (let i = 0; i < 3; i++) {
                const order = Order.create(customerId);
                const item = OrderItem.create(`Product ${i}`, new Money(10 + i, 'USD'), 1);
                order.addItem(item);
                orders.push(order);
            }

            // When
            const result = await repository.saveAllAsync(orders);

            // Then
            expect(result.isSuccess).toBe(true);

            // Verify all orders were saved
            for (const order of orders) {
                const getResult = await repository.getByIdAsync(order.id);
                expect(getResult.isSuccess).toBe(true);
                expect(getResult.value.hasValue).toBe(true);
            }
        });
    });

    describe('Should_HandleErrorScenarios_When_OperationsFail', () => {
        it('should handle attempts to add duplicate orders', async () => {
            // Given
            const customerId = new CustomerId('customer-123');
            const order = Order.create(customerId);
            await repository.addAsync(order);

            // When - Try to add same order again
            const duplicateResult = await repository.addAsync(order);

            // Then
            expect(duplicateResult.isFailure).toBe(true);
            expect(duplicateResult.error.code).toBe('Repository.DuplicateId');
        });

        it('should handle attempts to update non-existent orders', async () => {
            // Given
            const customerId = new CustomerId('customer-123');
            const order = Order.create(customerId);

            // When - Try to update order that was never added
            const updateResult = await repository.updateAsync(order);

            // Then
            expect(updateResult.isFailure).toBe(true);
            expect(updateResult.error.code).toBe('Repository.NotFound');
        });

        it('should handle attempts to delete non-existent orders', async () => {
            // Given
            const nonExistentId = OrderId.generate();

            // When
            const deleteResult = await repository.deleteAsync(nonExistentId);

            // Then
            expect(deleteResult.isFailure).toBe(true);
            expect(deleteResult.error.code).toBe('Repository.NotFound');
        });

        it('should return empty results for queries with no matches', async () => {
            // Given
            const nonExistentCustomerId = new CustomerId('non-existent-customer');

            // When
            const result = await repository.findByCustomerIdAsync(nonExistentCustomerId);

            // Then
            expect(result.isSuccess).toBe(true);
            expect(result.value).toHaveLength(0);
        });
    });

    describe('Should_HandleCancellation_When_UsingAbortSignal', () => {
        it('should respect cancellation tokens in async operations', async () => {
            // Given
            const customerId = new CustomerId('customer-123');
            const order = Order.create(customerId);
            const abortController = new AbortController();

            // When - Cancel immediately
            abortController.abort();

            const addResult = await repository.addAsync(order, abortController.signal);

            // Then
            expect(addResult.isFailure).toBe(true);
            expect(addResult.error.code).toBe('Repository.OperationCancelled');
        });

        it('should handle cancellation during query operations', async () => {
            // Given
            const customerId = new CustomerId('customer-123');
            const abortController = new AbortController();

            // When - Cancel immediately
            abortController.abort();

            const findResult = await repository.findByCustomerIdAsync(customerId, abortController.signal);

            // Then
            expect(findResult.isFailure).toBe(true);
            expect(findResult.error.code).toBe('Repository.OperationCancelled');
        });
    });

    describe('Should_HandlePerformance_When_ProcessingManyOrders', () => {
        it('should handle large number of orders efficiently', async () => {
            // Given
            const customerId = new CustomerId('performance-customer');
            const orderCount = 1000;

            // When - Add many orders
            const startTime = performance.now();

            const addPromises: Promise<Result>[] = [];
            for (let i = 0; i < orderCount; i++) {
                const order = Order.create(customerId);
                const item = OrderItem.create(`Product ${i}`, new Money(10, 'USD'), 1);
                order.addItem(item);
                addPromises.push(repository.addAsync(order));
            }

            await Promise.all(addPromises);

            const addTime = performance.now() - startTime;

            // Then - Should complete within reasonable time
            expect(addTime).toBeLessThan(5000); // 5 seconds for 1000 orders

            // When - Query all orders for customer
            const queryStartTime = performance.now();
            const findResult = await repository.findByCustomerIdAsync(customerId);
            const queryTime = performance.now() - queryStartTime;

            // Then - Query should be fast
            expect(findResult.isSuccess).toBe(true);
            expect(findResult.value.length).toBe(orderCount);
            expect(queryTime).toBeLessThan(100); // Should complete within 100ms
        });

        it('should handle concurrent operations efficiently', async () => {
            // Given
            const customerIds = Array.from({ length: 10 }, (_, i) => new CustomerId(`customer-${i}`));

            // When - Perform concurrent operations
            const startTime = performance.now();

            const operations = customerIds.map(async (customerId) => {
                const order = Order.create(customerId);
                const item = OrderItem.create('Product', new Money(10, 'USD'), 1);
                order.addItem(item);

                await repository.addAsync(order);
                const getResult = await repository.getByIdAsync(order.id);
                return getResult;
            });

            const results = await Promise.all(operations);

            const endTime = performance.now();
            const duration = endTime - startTime;

            // Then - All operations should succeed
            for (const result of results) {
                expect(result.isSuccess).toBe(true);
                expect(result.value.hasValue).toBe(true);
            }

            expect(duration).toBeLessThan(1000); // Should complete within 1 second
        });
    });
});