import { OrderItem, OrderItemId } from '../../examples/domain/entities/order-item';
import { Money } from '../../examples/domain/value-objects/money';

/**
 * Integration tests for Entity identity and invariants
 * Tests entity behavior across different scenarios including identity, state management, and business rules
 */
describe('Entity Identity and Invariants Integration Tests', () => {
    describe('Should_HandleIdentityCorrectly_When_ComparingEntities', () => {
        it('should consider entities with same ID equal', () => {
            // Given
            const itemId = OrderItemId.generate();
            const money = new Money(10.99, 'USD');

            const item1 = new OrderItem(itemId, 'Product A', money, 2);
            const item2 = new OrderItem(itemId, 'Product B', money, 5); // Different data, same ID

            // When & Then
            expect(item1.equals(item2)).toBe(true); // Identity-based equality
            expect(item1.id.equals(item2.id)).toBe(true);
            expect(item1.productName).not.toBe(item2.productName); // Data can differ
            expect(item1.quantity).not.toBe(item2.quantity);
        });

        it('should consider entities with different IDs unequal', () => {
            // Given
            const itemId1 = OrderItemId.generate();
            const itemId2 = OrderItemId.generate();
            const money = new Money(10.99, 'USD');

            const item1 = new OrderItem(itemId1, 'Product A', money, 2);
            const item2 = new OrderItem(itemId2, 'Product A', money, 2); // Same data, different ID

            // When & Then
            expect(item1.equals(item2)).toBe(false); // Different identity
            expect(item1.id.equals(item2.id)).toBe(false);
            expect(item1.productName).toBe(item2.productName); // Data is same
            expect(item1.quantity).toBe(item2.quantity);
        });

        it('should maintain identity consistency across operations', () => {
            // Given
            const itemId = OrderItemId.generate();
            const money = new Money(10.99, 'USD');
            const item = new OrderItem(itemId, 'Product A', money, 2);

            const originalId = item.id;

            // When
            item.updateQuantity(5);
            item.updateProductName('Updated Product A');
            item.updateUnitPrice(new Money(15.99, 'USD'));

            // Then
            expect(item.id.equals(originalId)).toBe(true); // ID never changes
            expect(item.quantity).toBe(5); // Data can change
            expect(item.productName).toBe('Updated Product A');
            expect(item.unitPrice.amount).toBe(15.99);
        });
    });

    describe('Should_EnforceInvariants_When_ModifyingEntityState', () => {
        it('should enforce business rules during creation', () => {
            // Given
            const itemId = OrderItemId.generate();
            const money = new Money(10.99, 'USD');

            // When & Then - Invalid product name
            expect(() => {
                new OrderItem(itemId, '', money, 2);
            }).toThrow('Product name cannot be empty');

            expect(() => {
                new OrderItem(itemId, '   ', money, 2);
            }).toThrow('Product name cannot be empty');

            // When & Then - Invalid quantity
            expect(() => {
                new OrderItem(itemId, 'Product A', money, 0);
            }).toThrow('Quantity must be positive');

            expect(() => {
                new OrderItem(itemId, 'Product A', money, -1);
            }).toThrow('Quantity must be positive');

            expect(() => {
                new OrderItem(itemId, 'Product A', money, 1.5);
            }).toThrow('Quantity must be a whole number');

            // When & Then - Invalid unit price
            expect(() => {
                new OrderItem(itemId, 'Product A', new Money(0, 'USD'), 2);
            }).toThrow('Unit price must be positive');

            expect(() => {
                new OrderItem(itemId, 'Product A', new Money(-5, 'USD'), 2);
            }).toThrow('Unit price must be positive');
        });

        it('should enforce business rules during updates', () => {
            // Given
            const itemId = OrderItemId.generate();
            const money = new Money(10.99, 'USD');
            const item = new OrderItem(itemId, 'Product A', money, 2);

            // When & Then - Invalid quantity update
            expect(() => {
                item.updateQuantity(0);
            }).toThrow('Quantity must be positive');

            expect(() => {
                item.updateQuantity(-1);
            }).toThrow('Quantity must be positive');

            expect(() => {
                item.updateQuantity(1.5);
            }).toThrow('Quantity must be a whole number');

            expect(() => {
                item.updateQuantity(10001);
            }).toThrow('Quantity cannot exceed 10,000');

            // When & Then - Invalid product name update
            expect(() => {
                item.updateProductName('');
            }).toThrow('Product name cannot be empty');

            expect(() => {
                item.updateProductName('a'.repeat(201));
            }).toThrow('Product name cannot exceed 200 characters');

            // When & Then - Invalid unit price update
            expect(() => {
                item.updateUnitPrice(new Money(0, 'USD'));
            }).toThrow('Unit price must be positive');

            expect(() => {
                item.updateUnitPrice(new Money(-5, 'USD'));
            }).toThrow('Unit price must be positive');

            expect(() => {
                item.updateUnitPrice(new Money(10, 'EUR'));
            }).toThrow('Currency mismatch: existing USD, new EUR');
        });

        it('should maintain calculated properties correctly', () => {
            // Given
            const itemId = OrderItemId.generate();
            const money = new Money(10.50, 'USD');
            const item = new OrderItem(itemId, 'Product A', money, 3);

            // When & Then - Initial calculation
            expect(item.totalPrice.amount).toBe(31.50); // 10.50 * 3
            expect(item.totalPrice.currency).toBe('USD');

            // When - Update quantity
            item.updateQuantity(5);

            // Then - Recalculated total
            expect(item.totalPrice.amount).toBe(52.50); // 10.50 * 5

            // When - Update unit price
            item.updateUnitPrice(new Money(12.00, 'USD'));

            // Then - Recalculated total
            expect(item.totalPrice.amount).toBe(60.00); // 12.00 * 5
        });
    });

    describe('Should_HandleComplexBusinessRules_When_PerformingOperations', () => {
        it('should calculate discounts correctly', () => {
            // Given
            const itemId = OrderItemId.generate();
            const money = new Money(100, 'USD');
            const item = new OrderItem(itemId, 'Product A', money, 2);

            // When & Then - Valid discount
            const discount10 = item.calculateDiscount(10); // 10%
            expect(discount10.amount).toBe(20); // 10% of 200
            expect(discount10.currency).toBe('USD');

            const discount25 = item.calculateDiscount(25); // 25%
            expect(discount25.amount).toBe(50); // 25% of 200

            // When & Then - Invalid discount
            expect(() => {
                item.calculateDiscount(-5);
            }).toThrow('Discount percentage must be between 0 and 100');

            expect(() => {
                item.calculateDiscount(101);
            }).toThrow('Discount percentage must be between 0 and 100');
        });

        it('should apply discounts correctly', () => {
            // Given
            const itemId = OrderItemId.generate();
            const money = new Money(100, 'USD');
            const item = new OrderItem(itemId, 'Product A', money, 2);

            // When
            const discountedItem = item.applyDiscount(20); // 20% discount

            // Then
            expect(discountedItem.id.equals(item.id)).toBe(true); // Same ID
            expect(discountedItem.productName).toBe(item.productName); // Same product
            expect(discountedItem.quantity).toBe(item.quantity); // Same quantity
            expect(discountedItem.unitPrice.amount).toBe(80); // 100 - 20% = 80
            expect(discountedItem.totalPrice.amount).toBe(160); // 80 * 2

            // Original item unchanged
            expect(item.unitPrice.amount).toBe(100);
            expect(item.totalPrice.amount).toBe(200);
        });

        it('should merge items correctly', () => {
            // Given
            const itemId1 = OrderItemId.generate();
            const itemId2 = OrderItemId.generate();
            const money = new Money(10, 'USD');

            const item1 = new OrderItem(itemId1, 'Product A', money, 3);
            const item2 = new OrderItem(itemId2, 'Product A', money, 5);
            const item3 = new OrderItem(itemId2, 'Product B', money, 2); // Different product

            // When & Then - Successful merge
            const mergedItem = item1.mergeWith(item2);
            expect(mergedItem.id.equals(item1.id)).toBe(true); // Keeps first ID
            expect(mergedItem.productName).toBe('Product A');
            expect(mergedItem.quantity).toBe(8); // 3 + 5
            expect(mergedItem.totalPrice.amount).toBe(80); // 10 * 8

            // When & Then - Failed merge (different products)
            expect(() => {
                item1.mergeWith(item3);
            }).toThrow('Cannot merge items with different products or prices');

            // When & Then - Failed merge (different prices)
            const expensiveItem = new OrderItem(itemId2, 'Product A', new Money(15, 'USD'), 2);
            expect(() => {
                item1.mergeWith(expensiveItem);
            }).toThrow('Cannot merge items with different products or prices');
        });

        it('should detect same products correctly', () => {
            // Given
            const itemId1 = OrderItemId.generate();
            const itemId2 = OrderItemId.generate();
            const money1 = new Money(10, 'USD');
            const money2 = new Money(10, 'USD');
            const money3 = new Money(15, 'USD');

            const item1 = new OrderItem(itemId1, 'Product A', money1, 3);
            const item2 = new OrderItem(itemId2, 'Product A', money2, 5); // Same product, same price
            const item3 = new OrderItem(itemId2, 'Product A', money3, 2); // Same product, different price
            const item4 = new OrderItem(itemId2, 'Product B', money1, 2); // Different product, same price

            // When & Then
            expect(item1.hasSameProduct(item2)).toBe(true); // Same product and price
            expect(item1.hasSameProduct(item3)).toBe(false); // Same product, different price
            expect(item1.hasSameProduct(item4)).toBe(false); // Different product, same price
        });
    });

    describe('Should_HandleEntityLifecycle_When_CreatingAndModifying', () => {
        it('should create entity with generated ID', () => {
            // Given
            const money = new Money(25.99, 'USD');

            // When
            const item = OrderItem.create('Product A', money, 2);

            // Then
            expect(item.id).toBeDefined();
            expect(item.id.value).toMatch(/^item-\d+-[a-z0-9]+$/);
            expect(item.productName).toBe('Product A');
            expect(item.unitPrice.equals(money)).toBe(true);
            expect(item.quantity).toBe(2);
            expect(item.totalPrice.amount).toBe(51.98);
        });

        it('should track state changes through updates', () => {
            // Given
            const itemId = OrderItemId.generate();
            const money = new Money(10, 'USD');
            const item = new OrderItem(itemId, 'Product A', money, 1);

            // Track initial state
            const initialProductName = item.productName;
            const initialQuantity = item.quantity;
            const initialUnitPrice = item.unitPrice;
            const initialTotalPrice = item.totalPrice;

            // When - Update product name
            item.updateProductName('Updated Product A');

            // Then - Only product name changed
            expect(item.productName).not.toBe(initialProductName);
            expect(item.productName).toBe('Updated Product A');
            expect(item.quantity).toBe(initialQuantity);
            expect(item.unitPrice.equals(initialUnitPrice)).toBe(true);
            expect(item.totalPrice.equals(initialTotalPrice)).toBe(true);

            // When - Update quantity
            item.updateQuantity(3);

            // Then - Quantity and total changed
            expect(item.quantity).not.toBe(initialQuantity);
            expect(item.quantity).toBe(3);
            expect(item.totalPrice.amount).toBe(30); // 10 * 3
            expect(item.productName).toBe('Updated Product A'); // Previous change preserved

            // When - Update unit price
            item.updateUnitPrice(new Money(15, 'USD'));

            // Then - Unit price and total changed
            expect(item.unitPrice.amount).toBe(15);
            expect(item.totalPrice.amount).toBe(45); // 15 * 3
            expect(item.quantity).toBe(3); // Previous change preserved
            expect(item.productName).toBe('Updated Product A'); // Previous change preserved
        });
    });

    describe('Should_HandleEdgeCases_When_WorkingWithEntities', () => {
        it('should handle boundary values correctly', () => {
            // Given
            const itemId = OrderItemId.generate();
            const money = new Money(0.01, 'USD'); // Minimum price

            // When & Then - Minimum valid quantity
            const item = new OrderItem(itemId, 'Cheap Product', money, 1);
            expect(item.totalPrice.amount).toBe(0.01);

            // When & Then - Maximum valid quantity
            item.updateQuantity(10000);
            expect(item.quantity).toBe(10000);
            expect(item.totalPrice.amount).toBe(100); // 0.01 * 10000

            // When & Then - Very long but valid product name
            const longName = 'a'.repeat(200);
            item.updateProductName(longName);
            expect(item.productName).toBe(longName);
            expect(item.productName.length).toBe(200);
        });

        it('should handle currency consistency', () => {
            // Given
            const itemId = OrderItemId.generate();
            const usdMoney = new Money(10, 'USD');
            const item = new OrderItem(itemId, 'Product A', usdMoney, 2);

            // When & Then - Same currency update should work
            const newUsdMoney = new Money(15, 'USD');
            item.updateUnitPrice(newUsdMoney);
            expect(item.unitPrice.equals(newUsdMoney)).toBe(true);

            // When & Then - Different currency should fail
            const eurMoney = new Money(15, 'EUR');
            expect(() => {
                item.updateUnitPrice(eurMoney);
            }).toThrow('Currency mismatch: existing USD, new EUR');
        });

        it('should handle floating point precision in calculations', () => {
            // Given
            const itemId = OrderItemId.generate();
            const money = new Money(0.1, 'USD');
            const item = new OrderItem(itemId, 'Product A', money, 3);

            // When & Then - Floating point calculation
            expect(item.totalPrice.amount).toBe(0.3); // 0.1 * 3

            // When - Update with precision-sensitive values
            item.updateUnitPrice(new Money(0.33, 'USD'));

            // Then - Precision handled correctly
            expect(item.totalPrice.amount).toBe(0.99); // 0.33 * 3
        });

        it('should handle null and undefined comparisons', () => {
            // Given
            const itemId = OrderItemId.generate();
            const money = new Money(10, 'USD');
            const item = new OrderItem(itemId, 'Product A', money, 2);

            // When & Then
            expect(item.equals(null as any)).toBe(false);
            expect(item.equals(undefined as any)).toBe(false);
        });

        it('should handle self-comparison', () => {
            // Given
            const itemId = OrderItemId.generate();
            const money = new Money(10, 'USD');
            const item = new OrderItem(itemId, 'Product A', money, 2);

            // When & Then
            expect(item.equals(item)).toBe(true);
        });
    });

    describe('Should_MaintainPerformance_When_HandlingManyEntities', () => {
        it('should handle large collections efficiently', () => {
            // Given
            const items: OrderItem[] = [];
            const money = new Money(10, 'USD');

            // When - Create many entities
            const startTime = performance.now();

            for (let i = 0; i < 1000; i++) {
                const item = OrderItem.create(`Product ${i}`, money, i + 1);
                items.push(item);
            }

            const creationTime = performance.now() - startTime;

            // Then - Creation should be fast
            expect(items.length).toBe(1000);
            expect(creationTime).toBeLessThan(100); // Should complete within 100ms

            // When - Find specific entity
            const searchStartTime = performance.now();
            const targetId = items[500].id;
            const foundItem = items.find(item => item.id.equals(targetId));
            const searchTime = performance.now() - searchStartTime;

            // Then - Search should be fast
            expect(foundItem).toBeDefined();
            expect(foundItem!.productName).toBe('Product 500');
            expect(searchTime).toBeLessThan(10);
        });

        it('should handle frequent updates efficiently', () => {
            // Given
            const itemId = OrderItemId.generate();
            const money = new Money(10, 'USD');
            const item = new OrderItem(itemId, 'Product A', money, 1);

            // When - Perform many updates
            const startTime = performance.now();

            for (let i = 1; i <= 1000; i++) {
                item.updateQuantity(i);
            }

            const updateTime = performance.now() - startTime;

            // Then - Updates should be fast
            expect(item.quantity).toBe(1000);
            expect(item.totalPrice.amount).toBe(10000); // 10 * 1000
            expect(updateTime).toBeLessThan(50); // Should complete within 50ms
        });
    });
});