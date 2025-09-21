import { Order, OrderId, CustomerId } from '../../examples/domain/entities/order';
import { OrderItem } from '../../examples/domain/entities/order-item';
import { Money } from '../../examples/domain/value-objects/money';
import { OrderStatus } from '../../examples/domain/value-objects/order-status';
import { OrderService, StandardPricingStrategy } from '../../examples/domain/services/order-service';
import { OrderCommandHandler } from '../../examples/application/handlers/order-command-handler';
import { InMemoryOrderRepository } from '../../examples/infrastructure/repositories/in-memory-order-repository';
import {
    CreateOrderCommand,
    ConfirmOrderCommand,
    CancelOrderCommand,
    AddOrderItemCommand
} from '../../examples/application/commands/create-order-command';

/**
 * Complete order lifecycle workflow integration test
 * Tests end-to-end scenarios from order creation to completion using all layers
 */
describe('Complete Order Lifecycle Workflow Integration Tests', () => {
    let repository: InMemoryOrderRepository;
    let orderService: OrderService;
    let commandHandler: OrderCommandHandler;

    beforeEach(() => {
        repository = new InMemoryOrderRepository();
        orderService = new OrderService(new StandardPricingStrategy());
        commandHandler = new OrderCommandHandler(repository, orderService);
    });

    afterEach(() => {
        repository.clear();
    });

    describe('Should_CompleteSuccessfulOrderWorkflow_When_AllOperationsSucceed', () => {
        it('should handle complete order creation and fulfillment workflow', async () => {
            // Given
            const customerId = 'customer-123';
            const correlationId = 'workflow-456';

            // Phase 1: Create Order
            const createCommand: CreateOrderCommand = {
                customerId,
                items: [
                    {
                        productName: 'Laptop Computer',
                        unitPrice: 999.99,
                        currency: 'USD',
                        quantity: 1
                    },
                    {
                        productName: 'Wireless Mouse',
                        unitPrice: 29.99,
                        currency: 'USD',
                        quantity: 2
                    }
                ],
                correlationId,
                metadata: {
                    source: 'web-app',
                    userAgent: 'test-browser'
                }
            };

            // When - Create order
            const createResult = await commandHandler.handleCreateOrderAsync(createCommand);

            // Then - Order created successfully
            expect(createResult.success).toBe(true);
            expect(createResult.data).toBeDefined();

            const orderId = createResult.data!;

            // Verify order state
            const orderResult = await repository.getByIdAsync(OrderId.fromString(orderId));
            expect(orderResult.isSuccess).toBe(true);

            const order = orderResult.value.value;
            expect(order.customerId.value).toBe(customerId);
            expect(order.status).toBe(OrderStatus.PENDING);
            expect(order.itemCount).toBe(2);
            expect(order.totalAmount.amount).toBe(1059.97); // 999.99 + (29.99 * 2)
            expect(order.totalAmount.currency).toBe('USD');

            // Phase 2: Add Additional Item
            const addItemCommand: AddOrderItemCommand = {
                orderId,
                expectedVersion: order.version,
                productName: 'USB Cable',
                unitPrice: 19.99,
                currency: 'USD',
                quantity: 1,
                correlationId,
                metadata: {
                    addedBy: 'customer',
                    timestamp: new Date().toISOString()
                }
            };

            // When - Add item
            const addItemResult = await commandHandler.handleAddOrderItemAsync(addItemCommand);

            // Then - Item added successfully
            expect(addItemResult.success).toBe(true);

            const updatedOrderResult = await repository.getByIdAsync(OrderId.fromString(orderId));
            const updatedOrder = updatedOrderResult.value.value;
            expect(updatedOrder.itemCount).toBe(3);
            expect(updatedOrder.totalAmount.amount).toBe(1079.96); // Previous + 19.99

            // Phase 3: Validate Order
            const validation = orderService.validateOrder(updatedOrder);
            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);

            // Phase 4: Calculate Order Totals
            const calculationResult = orderService.calculateOrderTotals(updatedOrder);
            expect(calculationResult.isSuccess).toBe(true);

            const totals = calculationResult.value;
            expect(totals.subtotal.amount).toBe(1079.96);
            expect(totals.discount.amount).toBe(107.996); // 10% discount for orders over 1000
            expect(totals.shipping.amount).toBe(0); // Free shipping for orders over 100
            expect(totals.tax.amount).toBeGreaterThan(0);
            expect(totals.total.amount).toBeGreaterThan(0);

            // Phase 5: Confirm Order
            const confirmCommand: ConfirmOrderCommand = {
                orderId,
                expectedVersion: updatedOrder.version,
                correlationId,
                metadata: {
                    confirmedBy: 'system',
                    paymentMethod: 'credit-card'
                }
            };

            // When - Confirm order
            const confirmResult = await commandHandler.handleConfirmOrderAsync(confirmCommand);

            // Then - Order confirmed successfully
            expect(confirmResult.success).toBe(true);

            const confirmedOrderResult = await repository.getByIdAsync(OrderId.fromString(orderId));
            const confirmedOrder = confirmedOrderResult.value.value;
            expect(confirmedOrder.status).toBe(OrderStatus.CONFIRMED);

            // Phase 6: Ship Order
            const shipResult = confirmedOrder.ship();
            expect(shipResult.isSuccess).toBe(true);
            await repository.updateAsync(confirmedOrder);

            // Phase 7: Deliver Order
            const deliverResult = confirmedOrder.deliver();
            expect(deliverResult.isSuccess).toBe(true);
            await repository.updateAsync(confirmedOrder);

            // Final Verification
            const finalOrderResult = await repository.getByIdAsync(OrderId.fromString(orderId));
            const finalOrder = finalOrderResult.value.value;

            expect(finalOrder.status).toBe(OrderStatus.DELIVERED);
            expect(finalOrder.itemCount).toBe(3);
            expect(finalOrder.events.length).toBeGreaterThan(0);
            expect(finalOrder.version).toBeGreaterThan(0);

            // Verify customer statistics
            const statsResult = await repository.getCustomerStatisticsAsync(new CustomerId(customerId));
            expect(statsResult.isSuccess).toBe(true);

            const stats = statsResult.value;
            expect(stats.totalOrders).toBe(1);
            expect(stats.totalAmount).toBe(finalOrder.totalAmount.amount);
            expect(stats.averageOrderValue).toBe(finalOrder.totalAmount.amount);
            expect(stats.ordersByStatus['Delivered']).toBe(1);
        });

        it('should handle order workflow with item modifications', async () => {
            // Given
            const customerId = 'customer-modifications';

            // Phase 1: Create order with items
            const createCommand: CreateOrderCommand = {
                customerId,
                items: [
                    {
                        productName: 'Book',
                        unitPrice: 25.00,
                        currency: 'USD',
                        quantity: 2
                    },
                    {
                        productName: 'Bookmark',
                        unitPrice: 5.00,
                        currency: 'USD',
                        quantity: 3
                    }
                ]
            };

            const createResult = await commandHandler.handleCreateOrderAsync(createCommand);
            const orderId = createResult.data!;

            let order = (await repository.getByIdAsync(OrderId.fromString(orderId))).value.value;
            expect(order.totalAmount.amount).toBe(65.00); // (25*2) + (5*3)

            // Phase 2: Update item quantity
            const bookItem = order.items.find((item: any) => item.productName === 'Book')!;
            const updateResult = await commandHandler.handleUpdateOrderItemQuantityAsync({
                orderId,
                itemId: bookItem.id.value,
                newQuantity: 1, // Reduce from 2 to 1
                expectedVersion: order.version
            });

            expect(updateResult.success).toBe(true);

            order = (await repository.getByIdAsync(OrderId.fromString(orderId))).value.value;
            expect(order.totalAmount.amount).toBe(40.00); // (25*1) + (5*3)

            // Phase 3: Remove item
            const bookmarkItem = order.items.find((item: any) => item.productName === 'Bookmark')!;
            const removeResult = await commandHandler.handleRemoveOrderItemAsync({
                orderId,
                itemId: bookmarkItem.id.value,
                expectedVersion: order.version
            });

            expect(removeResult.success).toBe(true);

            order = (await repository.getByIdAsync(OrderId.fromString(orderId))).value.value;
            expect(order.totalAmount.amount).toBe(25.00); // (25*1) only
            expect(order.itemCount).toBe(1);

            // Phase 4: Add new item
            const addResult = await commandHandler.handleAddOrderItemAsync({
                orderId,
                expectedVersion: order.version,
                productName: 'Magazine',
                unitPrice: 12.50,
                currency: 'USD',
                quantity: 2
            });

            expect(addResult.success).toBe(true);

            order = (await repository.getByIdAsync(OrderId.fromString(orderId))).value.value;
            expect(order.totalAmount.amount).toBe(50.00); // 25 + (12.50*2)
            expect(order.itemCount).toBe(2);

            // Phase 5: Complete order
            const confirmResult = await commandHandler.handleConfirmOrderAsync({
                orderId,
                expectedVersion: order.version
            });

            expect(confirmResult.success).toBe(true);

            // Verify final state
            order = (await repository.getByIdAsync(OrderId.fromString(orderId))).value.value;
            expect(order.status).toBe(OrderStatus.CONFIRMED);
            expect(order.hasProduct('Book')).toBe(true);
            expect(order.hasProduct('Magazine')).toBe(true);
            expect(order.hasProduct('Bookmark')).toBe(false);
        });
    });

    describe('Should_HandleFailureScenarios_When_WorkflowEncountersErrors', () => {
        it('should handle order creation failures gracefully', async () => {
            // Given - Invalid order creation command
            const createCommand: CreateOrderCommand = {
                customerId: '', // Invalid customer ID
                items: [
                    {
                        productName: 'Product A',
                        unitPrice: -10, // Invalid price
                        currency: 'USD',
                        quantity: 0 // Invalid quantity
                    }
                ]
            };

            // When
            const createResult = await commandHandler.handleCreateOrderAsync(createCommand);

            // Then - Creation should fail
            expect(createResult.success).toBe(false);
            expect(createResult.error).toBeDefined();
        });

        it('should handle business rule violations during workflow', async () => {
            // Given - Valid order
            const customerId = 'customer-business-rules';
            const createCommand: CreateOrderCommand = {
                customerId,
                items: [
                    {
                        productName: 'Expensive Item',
                        unitPrice: 75000, // Exceeds order limit
                        currency: 'USD',
                        quantity: 2
                    }
                ]
            };

            // When - Try to create order that exceeds maximum
            const createResult = await commandHandler.handleCreateOrderAsync(createCommand);

            // Then - Should fail due to business rules
            expect(createResult.success).toBe(false);
            expect(createResult.error).toContain('maximum');
        });

        it('should handle concurrency conflicts during workflow', async () => {
            // Given - Order created successfully
            const customerId = 'customer-concurrency';
            const createCommand: CreateOrderCommand = {
                customerId,
                items: [
                    {
                        productName: 'Product A',
                        unitPrice: 50.00,
                        currency: 'USD',
                        quantity: 1
                    }
                ]
            };

            const createResult = await commandHandler.handleCreateOrderAsync(createCommand);
            const orderId = createResult.data!;

            const order = (await repository.getByIdAsync(OrderId.fromString(orderId))).value.value;

            // When - Try to confirm with old version (simulate concurrent modification)
            const confirmCommand: ConfirmOrderCommand = {
                orderId,
                expectedVersion: order.version - 1 // Wrong version
            };

            const confirmResult = await commandHandler.handleConfirmOrderAsync(confirmCommand);

            // Then - Should fail due to concurrency conflict
            expect(confirmResult.success).toBe(false);
            expect(confirmResult.error).toContain('Concurrency conflict');
        });

        it('should handle cancellation workflow', async () => {
            // Given - Confirmed order
            const customerId = 'customer-cancellation';
            const createCommand: CreateOrderCommand = {
                customerId,
                items: [
                    {
                        productName: 'Product A',
                        unitPrice: 100.00,
                        currency: 'USD',
                        quantity: 1
                    }
                ]
            };

            const createResult = await commandHandler.handleCreateOrderAsync(createCommand);
            const orderId = createResult.data!;

            let order = (await repository.getByIdAsync(OrderId.fromString(orderId))).value.value;

            const confirmResult = await commandHandler.handleConfirmOrderAsync({
                orderId,
                expectedVersion: order.version
            });

            expect(confirmResult.success).toBe(true);

            // When - Cancel order
            order = (await repository.getByIdAsync(OrderId.fromString(orderId))).value.value;

            const cancelCommand: CancelOrderCommand = {
                orderId,
                expectedVersion: order.version,
                reason: 'Customer requested cancellation',
                refundAmount: 100.00,
                refundMethod: 'credit_card'
            };

            const cancelResult = await commandHandler.handleCancelOrderAsync(cancelCommand);

            // Then - Cancellation successful
            expect(cancelResult.success).toBe(true);

            order = (await repository.getByIdAsync(OrderId.fromString(orderId))).value.value;
            expect(order.status).toBe(OrderStatus.CANCELLED);

            // When - Try to add item to cancelled order
            const addItemResult = await commandHandler.handleAddOrderItemAsync({
                orderId,
                expectedVersion: order.version,
                productName: 'Another Product',
                unitPrice: 50.00,
                currency: 'USD',
                quantity: 1
            });

            // Then - Should fail
            expect(addItemResult.success).toBe(false);
            expect(addItemResult.error).toContain('Cannot add items');
        });
    });

    describe('Should_HandleComplexBusinessScenarios_When_ProcessingRealWorldWorkflows', () => {
        it('should handle bulk order processing', async () => {
            // Given - Multiple orders for processing
            const customerIds = ['customer-1', 'customer-2', 'customer-3'];
            const orderIds: string[] = [];

            // Create multiple orders
            for (const customerId of customerIds) {
                const createCommand: CreateOrderCommand = {
                    customerId,
                    items: [
                        {
                            productName: 'Standard Product',
                            unitPrice: 25.00,
                            currency: 'USD',
                            quantity: 2
                        }
                    ]
                };

                const createResult = await commandHandler.handleCreateOrderAsync(createCommand);
                orderIds.push(createResult.data!);
            }

            // Confirm all orders
            for (const orderId of orderIds) {
                const order = (await repository.getByIdAsync(OrderId.fromString(orderId))).value.value;

                const confirmResult = await commandHandler.handleConfirmOrderAsync({
                    orderId,
                    expectedVersion: order.version
                });

                expect(confirmResult.success).toBe(true);
            }

            // When - Bulk process confirmed orders
            const confirmedOrders = await repository.findByStatusAsync(OrderStatus.CONFIRMED);
            expect(confirmedOrders.isSuccess).toBe(true);
            expect(confirmedOrders.value.length).toBe(3);

            // Process shipping for all confirmed orders
            for (const order of confirmedOrders.value) {
                const shipResult = order.ship();
                expect(shipResult.isSuccess).toBe(true);
                await repository.updateAsync(order);
            }

            // Then - All orders should be shipped
            const shippedOrders = await repository.findByStatusAsync(OrderStatus.SHIPPED);
            expect(shippedOrders.isSuccess).toBe(true);
            expect(shippedOrders.value.length).toBe(3);
        });

        it('should handle order merging workflow', async () => {
            // Given - Two orders from same customer
            const customerId = 'customer-merge';

            const order1Command: CreateOrderCommand = {
                customerId,
                items: [
                    {
                        productName: 'Product A',
                        unitPrice: 30.00,
                        currency: 'USD',
                        quantity: 1
                    }
                ]
            };

            const order2Command: CreateOrderCommand = {
                customerId,
                items: [
                    {
                        productName: 'Product B',
                        unitPrice: 40.00,
                        currency: 'USD',
                        quantity: 2
                    }
                ]
            };

            const result1 = await commandHandler.handleCreateOrderAsync(order1Command);
            const result2 = await commandHandler.handleCreateOrderAsync(order2Command);

            const order1 = (await repository.getByIdAsync(OrderId.fromString(result1.data!))).value.value;
            const order2 = (await repository.getByIdAsync(OrderId.fromString(result2.data!))).value.value;

            // When - Check if orders can be merged
            const canMergeResult = orderService.canMergeOrders(order1, order2);
            expect(canMergeResult.isSuccess).toBe(true);
            expect(canMergeResult.value).toBe(true);

            // When - Merge orders
            const mergeResult = orderService.mergeOrders(order1, order2);
            expect(mergeResult.isSuccess).toBe(true);

            const mergedOrder = mergeResult.value;

            // Then - Merged order contains all items
            expect(mergedOrder.itemCount).toBe(3); // 1 + 2 items
            expect(mergedOrder.totalAmount.amount).toBe(110.00); // 30 + (40*2)
            expect(mergedOrder.customerId.equals(order1.customerId)).toBe(true);
            expect(mergedOrder.hasProduct('Product A')).toBe(true);
            expect(mergedOrder.hasProduct('Product B')).toBe(true);
        });

        it('should handle order splitting workflow', async () => {
            // Given - Large order with many items
            const customerId = 'customer-split';
            const items = [];

            for (let i = 1; i <= 12; i++) {
                items.push({
                    productName: `Product ${i}`,
                    unitPrice: 10.00,
                    currency: 'USD',
                    quantity: 1
                });
            }

            const createCommand: CreateOrderCommand = {
                customerId,
                items
            };

            const createResult = await commandHandler.handleCreateOrderAsync(createCommand);
            const order = (await repository.getByIdAsync(OrderId.fromString(createResult.data!))).value.value;

            expect(order.itemCount).toBe(12);

            // When - Split order into smaller orders (max 5 items per order)
            const splitResult = orderService.splitOrderByQuantity(order, 5);
            expect(splitResult.isSuccess).toBe(true);

            const splitOrders = splitResult.value;

            // Then - Should have 3 orders (5 + 5 + 2 items)
            expect(splitOrders.length).toBe(3);
            expect(splitOrders[0].itemCount).toBe(5);
            expect(splitOrders[1].itemCount).toBe(5);
            expect(splitOrders[2].itemCount).toBe(2);

            // Verify total amount is preserved
            const totalAmount = splitOrders.reduce(
                (sum: number, order: any) => sum + order.totalAmount.amount,
                0
            );
            expect(totalAmount).toBe(120.00); // 12 * 10.00

            // All orders should be for the same customer
            for (const splitOrder of splitOrders) {
                expect(splitOrder.customerId.equals(order.customerId)).toBe(true);
            }
        });
    });
});