import { Order, OrderId, CustomerId } from '../../examples/domain/entities/order';
import { OrderItem } from '../../examples/domain/entities/order-item';
import { Money } from '../../examples/domain/value-objects/money';
import { OrderStatus } from '../../examples/domain/value-objects/order-status';
import { OrderService, StandardPricingStrategy } from '../../examples/domain/services/order-service';
import { InMemoryOrderRepository } from '../../examples/infrastructure/repositories/in-memory-order-repository';
import { Result, Maybe, Error } from '../../src/functional';

/**
 * Quickstart example validation integration tests
 * Validates that all code examples from quickstart documentation work correctly
 */
describe('Quickstart Example Validation Integration Tests', () => {
    let repository: InMemoryOrderRepository;
    let orderService: OrderService;

    beforeEach(() => {
        repository = new InMemoryOrderRepository();
        orderService = new OrderService(new StandardPricingStrategy());
    });

    afterEach(() => {
        repository.clear();
    });

    describe('Should_ValidateValueObjectExamples_When_FollowingQuickstartGuide', () => {
        it('should demonstrate Money value object usage', () => {
            // Example 1: Creating and working with value objects
            console.log('=== Value Objects Example ===');

            const money1 = new Money(100.50, 'USD');
            const money2 = new Money(100.50, 'USD');
            const money3 = new Money(100.50, 'EUR');

            console.log(`money1 == money2: ${money1.equals(money2)}`); // True
            console.log(`money1 == money3: ${money1.equals(money3)}`); // False

            expect(money1.equals(money2)).toBe(true);
            expect(money1.equals(money3)).toBe(false);

            // Test money operations
            const sum = money1.add(money2);
            expect(sum.amount).toBe(201.00);
            expect(sum.currency).toBe('USD');

            const product = money1.multiply(2);
            expect(product.amount).toBe(201.00);
            expect(product.currency).toBe('USD');

            // Test error handling
            expect(() => money1.add(money3)).toThrow('Cannot add different currencies');
        });

        it('should demonstrate Money creation from string', () => {
            // Test Money.fromString as shown in quickstart
            const money = Money.fromString('150.75 USD');
            expect(money.amount).toBe(150.75);
            expect(money.currency).toBe('USD');

            const zeroMoney = Money.zero('EUR');
            expect(zeroMoney.amount).toBe(0);
            expect(zeroMoney.currency).toBe('EUR');

            expect(() => Money.fromString('invalid format')).toThrow('Invalid money format');
        });

        it('should demonstrate OrderStatus value object usage', () => {
            // Test OrderStatus examples
            const pending = OrderStatus.PENDING;
            const confirmed = OrderStatus.CONFIRMED;
            const shipped = OrderStatus.SHIPPED;

            expect(pending.canTransitionTo(confirmed)).toBe(true);
            expect(pending.canTransitionTo(shipped)).toBe(false);
            expect(confirmed.canTransitionTo(shipped)).toBe(true);

            expect(pending.isActive()).toBe(true);
            expect(OrderStatus.DELIVERED.isFinal()).toBe(true);
            expect(pending.canBeCancelled()).toBe(true);
            expect(shipped.canBeCancelled()).toBe(false);

            const statusFromString = OrderStatus.fromString('Pending');
            expect(statusFromString.equals(pending)).toBe(true);
        });
    });

    describe('Should_ValidateAggregateExamples_When_FollowingQuickstartGuide', () => {
        it('should demonstrate complete order creation and management', () => {
            // Example 2: Creating aggregates and handling events
            console.log('\n=== Aggregate and Events Example ===');

            const customerId = new CustomerId('CUST-001');
            const totalAmount = new Money(150.75, 'USD');
            const order = Order.create(customerId, 'correlation-123');

            console.log(`Order created: ${order.id.value}`);
            console.log(`Events count: ${order.events.length}`);

            expect(order.id).toBeDefined();
            expect(order.events.length).toBe(1); // OrderCreatedEvent
            expect(order.customerId.equals(customerId)).toBe(true);
            expect(order.status).toBe(OrderStatus.PENDING);

            // Add items as shown in quickstart
            const item1 = OrderItem.create('Laptop', new Money(999.99, 'USD'), 1);
            const item2 = OrderItem.create('Mouse', new Money(29.99, 'USD'), 2);

            const addResult1 = order.addItem(item1);
            const addResult2 = order.addItem(item2);

            expect(addResult1.isSuccess).toBe(true);
            expect(addResult2.isSuccess).toBe(true);
            expect(order.itemCount).toBe(2);
            expect(order.totalAmount.amount).toBe(1059.97);
        });

        it('should demonstrate order status transitions', () => {
            // Example 3: Functional error handling
            console.log('\n=== Functional Error Handling ===');

            const customerId = new CustomerId('CUST-001');
            const order = Order.create(customerId);
            const item = OrderItem.create('Product A', new Money(50.00, 'USD'), 1);
            order.addItem(item);

            const confirmResult = order.confirm();
            confirmResult.match(
                () => console.log('Order confirmed successfully'),
                (error: any) => console.log(`Failed to confirm: ${error.message}`)
            );

            expect(confirmResult.isSuccess).toBe(true);
            expect(order.status).toBe(OrderStatus.CONFIRMED);

            const cancelResult = order.cancel();
            cancelResult.match(
                () => console.log('Order cancelled successfully'),
                (error: any) => console.log(`Failed to cancel: ${error.message}`)
            );

            expect(cancelResult.isFailure).toBe(true);
            expect(cancelResult.error.code).toBe('Order.CannotCancel');
        });
    });

    describe('Should_ValidateFunctionalTypeExamples_When_FollowingQuickstartGuide', () => {
        it('should demonstrate Maybe type usage', () => {
            // Example 4: Maybe type example
            console.log('\n=== Maybe Type Example ===');

            const findOrderById = (orderId: string): Maybe<Order> => {
                // Simulate database lookup that might not find the order
                if (orderId === 'existing-order') {
                    const order = Order.create(new CustomerId('customer-123'));
                    return Maybe.some(order);
                }
                return Maybe.none();
            };

            const maybeOrder = findOrderById('ORDER-123');

            const result = maybeOrder
                .map(o => o.totalAmount)
                .map(amount => `Order total: ${amount.amount} ${amount.currency}`)
                .orElse('Order not found');

            console.log(result);
            expect(result).toBe('Order not found');

            // Test with existing order
            const existingOrder = findOrderById('existing-order');
            const existingResult = existingOrder
                .map(o => o.totalAmount)
                .map(amount => `Order total: ${amount.amount} ${amount.currency}`)
                .orElse('Order not found');

            expect(existingResult).toBe('Order total: 0 USD');
        });

        it('should demonstrate operation chaining', async () => {
            // Example 5: Operation chaining example
            console.log('\n=== Operation Chaining Example ===');

            const processOrderAsync = async (order: Order): Promise<Result<string>> => {
                try {
                    // Simulate async processing
                    await new Promise(resolve => setTimeout(resolve, 10));

                    const validateResult = validateOrder(order);
                    if (validateResult.isFailure) {
                        return validateResult.error;
                    }

                    const confirmResult = order.confirm();
                    if (confirmResult.isFailure) {
                        return confirmResult.error;
                    }

                    return Result.ok(order.id.value);
                } catch (ex) {
                    return Result.fail(Error.infrastructure('Order.ProcessingFailed',
                        ex instanceof Error ? ex.message : 'Unknown error'));
                }
            };

            const validateOrder = (order: Order): Result => {
                if (order.totalAmount.amount <= 0) {
                    return Result.fail(Error.validation('Order.InvalidAmount', 'Order amount must be positive'));
                }

                if (!order.customerId.value) {
                    return Result.fail(Error.validation('Order.MissingCustomer', 'Order must have a customer'));
                }

                return Result.ok();
            };

            const order = Order.create(new CustomerId('customer-123'));
            const item = OrderItem.create('Product A', new Money(100.00, 'USD'), 1);
            order.addItem(item);

            const processResult = await processOrderAsync(order);
            processResult.match(
                orderId => console.log(`Order ${orderId} processed successfully`),
                (error: any) => console.log(`Processing failed: ${error.message}`)
            );

            expect(processResult.isSuccess).toBe(true);
            expect(processResult.value).toBe(order.id.value);
        });
    });

    describe('Should_ValidateRepositoryExamples_When_FollowingQuickstartGuide', () => {
        it('should demonstrate repository usage patterns', async () => {
            // Create sample orders for repository testing
            const customer1 = new CustomerId('customer-1');
            const customer2 = new CustomerId('customer-2');

            const order1 = Order.create(customer1);
            order1.addItem(OrderItem.create('Product A', new Money(50.00, 'USD'), 1));
            order1.confirm();

            const order2 = Order.create(customer2);
            order2.addItem(OrderItem.create('Product B', new Money(75.00, 'USD'), 2));

            const order3 = Order.create(customer1);
            order3.addItem(OrderItem.create('Product C', new Money(100.00, 'USD'), 1));
            order3.confirm();
            order3.ship();

            // Add orders to repository
            await repository.addAsync(order1);
            await repository.addAsync(order2);
            await repository.addAsync(order3);

            // Test repository queries as shown in quickstart
            const customer1OrdersResult = await repository.findByCustomerIdAsync(customer1);
            expect(customer1OrdersResult.isSuccess).toBe(true);
            expect(customer1OrdersResult.value.length).toBe(2);

            const confirmedOrdersResult = await repository.findByStatusAsync(OrderStatus.CONFIRMED);
            expect(confirmedOrdersResult.isSuccess).toBe(true);
            expect(confirmedOrdersResult.value.length).toBe(1);

            const customer1StatsResult = await repository.getCustomerStatisticsAsync(customer1);
            expect(customer1StatsResult.isSuccess).toBe(true);
            expect(customer1StatsResult.value.totalOrders).toBe(2);
            expect(customer1StatsResult.value.totalAmount).toBe(150.00);

            const recentOrdersResult = await repository.findRecentOrdersAsync(5);
            expect(recentOrdersResult.isSuccess).toBe(true);
            expect(recentOrdersResult.value.length).toBe(3);
        });

        it('should demonstrate error handling in repository operations', async () => {
            // Test not found scenarios
            const nonExistentId = OrderId.generate();
            const getResult = await repository.getByIdAsync(nonExistentId);

            expect(getResult.isSuccess).toBe(true);
            expect(getResult.value.hasValue).toBe(false);

            // Test delete non-existent
            const deleteResult = await repository.deleteAsync(nonExistentId);
            expect(deleteResult.isFailure).toBe(true);
            expect(deleteResult.error.code).toBe('Repository.NotFound');

            // Test duplicate add
            const order = Order.create(new CustomerId('customer-123'));
            await repository.addAsync(order);

            const duplicateResult = await repository.addAsync(order);
            expect(duplicateResult.isFailure).toBe(true);
            expect(duplicateResult.error.code).toBe('Repository.DuplicateId');
        });
    });

    describe('Should_ValidateServiceExamples_When_FollowingQuickstartGuide', () => {
        it('should demonstrate order service usage', () => {
            // Create order for service testing
            const customerId = new CustomerId('customer-service');
            const order = Order.create(customerId);

            // Add items to qualify for discounts
            order.addItem(OrderItem.create('Expensive Item', new Money(800.00, 'USD'), 1));
            order.addItem(OrderItem.create('Additional Item', new Money(300.00, 'USD'), 1));

            // Test order validation
            const validation = orderService.validateOrder(order);
            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);

            // Test order calculations
            const calculationResult = orderService.calculateOrderTotals(order);
            expect(calculationResult.isSuccess).toBe(true);

            const totals = calculationResult.value;
            expect(totals.subtotal.amount).toBe(1100.00);
            expect(totals.discount.amount).toBe(110.00); // 10% discount for orders over 1000
            expect(totals.shipping.amount).toBe(0); // Free shipping for orders over 100
            expect(totals.tax.amount).toBeGreaterThan(0);

            // Test optimization suggestions
            const suggestions = orderService.suggestOptimizations(order);
            expect(suggestions).toBeInstanceOf(Array);
        });

        it('should demonstrate order merging capabilities', () => {
            const customerId = new CustomerId('merge-customer');

            const order1 = Order.create(customerId);
            order1.addItem(OrderItem.create('Product A', new Money(25.00, 'USD'), 1));

            const order2 = Order.create(customerId);
            order2.addItem(OrderItem.create('Product B', new Money(35.00, 'USD'), 2));

            // Test merge capability check
            const canMergeResult = orderService.canMergeOrders(order1, order2);
            expect(canMergeResult.isSuccess).toBe(true);
            expect(canMergeResult.value).toBe(true);

            // Test actual merge
            const mergeResult = orderService.mergeOrders(order1, order2);
            expect(mergeResult.isSuccess).toBe(true);

            const mergedOrder = mergeResult.value;
            expect(mergedOrder.itemCount).toBe(3);
            expect(mergedOrder.totalAmount.amount).toBe(95.00); // 25 + (35*2)
        });

        it('should demonstrate order splitting capabilities', () => {
            const customerId = new CustomerId('split-customer');
            const order = Order.create(customerId);

            // Add many items
            for (let i = 1; i <= 8; i++) {
                order.addItem(OrderItem.create(`Product ${i}`, new Money(10.00, 'USD'), 1));
            }

            expect(order.itemCount).toBe(8);

            // Test splitting
            const splitResult = orderService.splitOrderByQuantity(order, 3);
            expect(splitResult.isSuccess).toBe(true);

            const splitOrders = splitResult.value;
            expect(splitOrders.length).toBe(3); // 3 + 3 + 2 items
            expect(splitOrders[0].itemCount).toBe(3);
            expect(splitOrders[1].itemCount).toBe(3);
            expect(splitOrders[2].itemCount).toBe(2);

            // Verify total amount preserved
            const totalAmount = splitOrders.reduce(
                (sum: number, order: any) => sum + order.totalAmount.amount,
                0
            );
            expect(totalAmount).toBe(80.00); // 8 * 10.00
        });
    });

    describe('Should_ValidatePerformanceExamples_When_FollowingQuickstartGuide', () => {
        it('should demonstrate performance with many orders', async () => {
            const startTime = performance.now();

            // Create multiple orders quickly
            const orders: Order[] = [];
            for (let i = 0; i < 100; i++) {
                const customerId = new CustomerId(`customer-${i % 10}`);
                const order = Order.create(customerId);
                order.addItem(OrderItem.create(`Product ${i}`, new Money(10 + i, 'USD'), 1));
                orders.push(order);
            }

            // Add to repository
            for (const order of orders) {
                await repository.addAsync(order);
            }

            const endTime = performance.now();
            const duration = endTime - startTime;

            console.log(`Created and stored 100 orders in ${duration.toFixed(2)}ms`);

            expect(orders.length).toBe(100);
            expect(duration).toBeLessThan(1000); // Should complete within 1 second

            // Test query performance
            const queryStartTime = performance.now();
            const customer1Orders = await repository.findByCustomerIdAsync(new CustomerId('customer-1'));
            const queryEndTime = performance.now();
            const queryDuration = queryEndTime - queryStartTime;

            console.log(`Queried customer orders in ${queryDuration.toFixed(2)}ms`);

            expect(customer1Orders.isSuccess).toBe(true);
            expect(customer1Orders.value.length).toBe(10); // customer-1 has 10 orders (0, 10, 20, ..., 90)
            expect(queryDuration).toBeLessThan(100);
        });

        it('should demonstrate memory efficiency', () => {
            // Test memory usage with value objects
            const moneyObjects: Money[] = [];
            const startMemory = process.memoryUsage().heapUsed;

            for (let i = 0; i < 10000; i++) {
                moneyObjects.push(new Money(Math.random() * 1000, 'USD'));
            }

            const endMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = endMemory - startMemory;

            console.log(`Memory increase for 10,000 Money objects: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);

            expect(moneyObjects.length).toBe(10000);
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
        });
    });

    describe('Should_ValidateErrorHandlingExamples_When_FollowingQuickstartGuide', () => {
        it('should demonstrate comprehensive error handling patterns', () => {
            const customerId = new CustomerId('error-demo');
            const order = Order.create(customerId);

            // Test validation errors
            expect(() => {
                new Money(-10, 'USD');
            }).toThrow('Amount cannot be negative');

            expect(() => {
                OrderStatus.fromString('InvalidStatus');
            }).toThrow('Invalid order status');

            // Test business rule errors
            const confirmResult = order.confirm(); // Empty order
            expect(confirmResult.isFailure).toBe(true);
            expect(confirmResult.error.category).toBe('Domain');

            // Test currency mixing
            order.addItem(OrderItem.create('USD Item', new Money(10, 'USD'), 1));

            const eurItem = OrderItem.create('EUR Item', new Money(10, 'EUR'), 1);
            const addResult = order.addItem(eurItem);

            expect(addResult.isFailure).toBe(true);
            expect(addResult.error.code).toBe('Order.MixedCurrencies');

            // Test status transition errors
            order.confirm(); // Now confirmed
            order.ship(); // Now shipped

            const confirmAgainResult = order.confirm();
            expect(confirmAgainResult.isFailure).toBe(true);
            expect(confirmAgainResult.error.code).toBe('Order.InvalidStatusTransition');
        });

        it('should demonstrate async error handling', async () => {
            // Test repository error scenarios
            const nonExistentId = OrderId.generate();

            const getResult = await repository.getByIdAsync(nonExistentId);
            expect(getResult.isSuccess).toBe(true);
            expect(getResult.value.hasValue).toBe(false);

            const updateResult = await repository.updateAsync(Order.create(new CustomerId('test')));
            expect(updateResult.isFailure).toBe(true);
            expect(updateResult.error.category).toBe('Infrastructure');

            // Test cancellation handling
            const abortController = new AbortController();
            abortController.abort();

            const cancelledResult = await repository.addAsync(
                Order.create(new CustomerId('test')),
                abortController.signal
            );

            expect(cancelledResult.isFailure).toBe(true);
            expect(cancelledResult.error.code).toBe('Repository.OperationCancelled');
        });
    });
});