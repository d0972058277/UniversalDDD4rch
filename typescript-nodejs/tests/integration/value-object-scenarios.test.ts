import { Money } from '../../examples/domain/value-objects/money';
import { OrderStatus } from '../../examples/domain/value-objects/order-status';

/**
 * Integration tests for ValueObject equality scenarios
 * Tests complex equality scenarios across different value object types
 */
describe('ValueObject Equality Scenarios Integration Tests', () => {
    describe('Should_HandleEquality_When_ComparingMoneyObjects', () => {
        it('should consider identical money objects equal', () => {
            // Given
            const money1 = new Money(100.50, 'USD');
            const money2 = new Money(100.50, 'USD');

            // When & Then
            expect(money1.equals(money2)).toBe(true);
            expect(money2.equals(money1)).toBe(true);
            expect(money1).toEqual(money2);
        });

        it('should consider money objects with different amounts unequal', () => {
            // Given
            const money1 = new Money(100.50, 'USD');
            const money2 = new Money(100.51, 'USD');

            // When & Then
            expect(money1.equals(money2)).toBe(false);
            expect(money2.equals(money1)).toBe(false);
            expect(money1).not.toEqual(money2);
        });

        it('should consider money objects with different currencies unequal', () => {
            // Given
            const money1 = new Money(100.50, 'USD');
            const money2 = new Money(100.50, 'EUR');

            // When & Then
            expect(money1.equals(money2)).toBe(false);
            expect(money2.equals(money1)).toBe(false);
            expect(money1).not.toEqual(money2);
        });

        it('should handle zero amounts correctly', () => {
            // Given
            const zeroUSD1 = new Money(0, 'USD');
            const zeroUSD2 = new Money(0, 'USD');
            const zeroEUR = new Money(0, 'EUR');

            // When & Then
            expect(zeroUSD1.equals(zeroUSD2)).toBe(true);
            expect(zeroUSD1.equals(zeroEUR)).toBe(false);
        });

        it('should handle floating point precision correctly', () => {
            // Given
            const money1 = new Money(0.1 + 0.2, 'USD'); // 0.30000000000000004
            const money2 = new Money(0.3, 'USD');

            // When & Then
            // This test verifies that floating point precision issues are handled consistently
            expect(money1.equals(money2)).toBe(false); // Should be false due to precision differences
            expect(money1.amount).not.toBe(money2.amount);
        });
    });

    describe('Should_HandleEquality_When_ComparingOrderStatusObjects', () => {
        it('should consider identical order status objects equal', () => {
            // Given
            const status1 = OrderStatus.PENDING;
            const status2 = OrderStatus.fromString('Pending');

            // When & Then
            expect(status1.equals(status2)).toBe(true);
            expect(status2.equals(status1)).toBe(true);
            expect(status1).toEqual(status2);
        });

        it('should consider different order status objects unequal', () => {
            // Given
            const pending = OrderStatus.PENDING;
            const confirmed = OrderStatus.CONFIRMED;

            // When & Then
            expect(pending.equals(confirmed)).toBe(false);
            expect(confirmed.equals(pending)).toBe(false);
            expect(pending).not.toEqual(confirmed);
        });

        it('should handle all status transitions correctly', () => {
            // Given
            const statuses = OrderStatus.getAllStatuses();

            // When & Then
            for (let i = 0; i < statuses.length; i++) {
                for (let j = 0; j < statuses.length; j++) {
                    if (i === j) {
                        expect(statuses[i].equals(statuses[j])).toBe(true);
                    } else {
                        expect(statuses[i].equals(statuses[j])).toBe(false);
                    }
                }
            }
        });
    });

    describe('Should_HandleComplexEquality_When_ComparingNestedValueObjects', () => {
        class Address {
            constructor(
                public readonly street: string,
                public readonly city: string,
                public readonly postalCode: string,
                public readonly country: string
            ) {}

            public equals(other: Address): boolean {
                return this.street === other.street &&
                       this.city === other.city &&
                       this.postalCode === other.postalCode &&
                       this.country === other.country;
            }
        }

        class CustomerInfo {
            constructor(
                public readonly name: string,
                public readonly email: string,
                public readonly address: Address
            ) {}

            public equals(other: CustomerInfo): boolean {
                return this.name === other.name &&
                       this.email === other.email &&
                       this.address.equals(other.address);
            }
        }

        it('should handle nested value object equality', () => {
            // Given
            const address1 = new Address('123 Main St', 'New York', '10001', 'USA');
            const address2 = new Address('123 Main St', 'New York', '10001', 'USA');
            const address3 = new Address('456 Oak Ave', 'New York', '10001', 'USA');

            const customer1 = new CustomerInfo('John Doe', 'john@example.com', address1);
            const customer2 = new CustomerInfo('John Doe', 'john@example.com', address2);
            const customer3 = new CustomerInfo('John Doe', 'john@example.com', address3);

            // When & Then
            expect(address1.equals(address2)).toBe(true);
            expect(address1.equals(address3)).toBe(false);

            expect(customer1.equals(customer2)).toBe(true);
            expect(customer1.equals(customer3)).toBe(false);
        });

        it('should handle null and undefined values in nested structures', () => {
            // Given
            class OptionalAddress {
                constructor(
                    public readonly street: string,
                    public readonly city: string,
                    public readonly postalCode?: string,
                    public readonly country?: string
                ) {}

                public equals(other: OptionalAddress): boolean {
                    return this.street === other.street &&
                           this.city === other.city &&
                           this.postalCode === other.postalCode &&
                           this.country === other.country;
                }
            }

            const address1 = new OptionalAddress('123 Main St', 'New York');
            const address2 = new OptionalAddress('123 Main St', 'New York', undefined, undefined);
            const address3 = new OptionalAddress('123 Main St', 'New York', '10001');

            // When & Then
            expect(address1.equals(address2)).toBe(true);
            expect(address1.equals(address3)).toBe(false);
        });
    });

    describe('Should_HandleCollectionEquality_When_ComparingValueObjectsWithArrays', () => {
        class OrderItems {
            constructor(public readonly items: string[]) {}

            public equals(other: OrderItems): boolean {
                if (this.items.length !== other.items.length) {
                    return false;
                }

                for (let i = 0; i < this.items.length; i++) {
                    if (this.items[i] !== other.items[i]) {
                        return false;
                    }
                }

                return true;
            }
        }

        it('should handle array equality correctly', () => {
            // Given
            const items1 = new OrderItems(['item1', 'item2', 'item3']);
            const items2 = new OrderItems(['item1', 'item2', 'item3']);
            const items3 = new OrderItems(['item1', 'item3', 'item2']); // Different order
            const items4 = new OrderItems(['item1', 'item2']); // Different length

            // When & Then
            expect(items1.equals(items2)).toBe(true);
            expect(items1.equals(items3)).toBe(false); // Order matters
            expect(items1.equals(items4)).toBe(false); // Length matters
        });

        it('should handle empty arrays correctly', () => {
            // Given
            const emptyItems1 = new OrderItems([]);
            const emptyItems2 = new OrderItems([]);
            const nonEmptyItems = new OrderItems(['item1']);

            // When & Then
            expect(emptyItems1.equals(emptyItems2)).toBe(true);
            expect(emptyItems1.equals(nonEmptyItems)).toBe(false);
        });

        class TaggedValue {
            constructor(public readonly tags: Set<string>) {}

            public equals(other: TaggedValue): boolean {
                if (this.tags.size !== other.tags.size) {
                    return false;
                }

                for (const tag of this.tags) {
                    if (!other.tags.has(tag)) {
                        return false;
                    }
                }

                return true;
            }
        }

        it('should handle Set equality correctly', () => {
            // Given
            const tagged1 = new TaggedValue(new Set(['tag1', 'tag2', 'tag3']));
            const tagged2 = new TaggedValue(new Set(['tag3', 'tag1', 'tag2'])); // Different order
            const tagged3 = new TaggedValue(new Set(['tag1', 'tag2'])); // Different size

            // When & Then
            expect(tagged1.equals(tagged2)).toBe(true); // Order doesn't matter in Sets
            expect(tagged1.equals(tagged3)).toBe(false);
        });
    });

    describe('Should_HandleHashCodeConsistency_When_UsingValueObjectsInCollections', () => {
        it('should maintain hash code consistency for Money objects', () => {
            // Given
            const money1 = new Money(100.50, 'USD');
            const money2 = new Money(100.50, 'USD');
            const money3 = new Money(200.75, 'EUR');

            // When
            const hash1 = money1.getHashCode();
            const hash2 = money2.getHashCode();
            const hash3 = money3.getHashCode();

            // Then
            expect(hash1).toBe(hash2); // Equal objects should have equal hash codes
            expect(hash1).not.toBe(hash3); // Different objects should likely have different hash codes
        });

        it('should work correctly in Map collections', () => {
            // Given
            const moneyMap = new Map<Money, string>();
            const usd100 = new Money(100, 'USD');
            const usd100_duplicate = new Money(100, 'USD');
            const eur100 = new Money(100, 'EUR');

            // When
            moneyMap.set(usd100, 'US Dollar 100');
            moneyMap.set(eur100, 'Euro 100');

            // Then
            // Note: JavaScript Map uses reference equality, not value equality
            // This test shows the limitation - in a real implementation, you'd need a custom Map
            expect(moneyMap.get(usd100)).toBe('US Dollar 100');
            expect(moneyMap.get(usd100_duplicate)).toBeUndefined(); // Different reference
            expect(moneyMap.get(eur100)).toBe('Euro 100');

            // But they are logically equal
            expect(usd100.equals(usd100_duplicate)).toBe(true);
        });

        it('should work correctly in Set collections', () => {
            // Given
            const moneySet = new Set<Money>();
            const usd100_1 = new Money(100, 'USD');
            const usd100_2 = new Money(100, 'USD');
            const eur100 = new Money(100, 'EUR');

            // When
            moneySet.add(usd100_1);
            moneySet.add(usd100_2); // Logically same, but different reference
            moneySet.add(eur100);

            // Then
            // JavaScript Set uses reference equality
            expect(moneySet.size).toBe(3); // All three are added as different references
            expect(moneySet.has(usd100_1)).toBe(true);
            expect(moneySet.has(usd100_2)).toBe(true);
            expect(moneySet.has(eur100)).toBe(true);

            // But they are logically equal
            expect(usd100_1.equals(usd100_2)).toBe(true);
        });
    });

    describe('Should_HandlePerformance_When_ComparingLargeValueObjects', () => {
        class LargeValueObject {
            constructor(public readonly data: number[]) {}

            public equals(other: LargeValueObject): boolean {
                if (this.data.length !== other.data.length) {
                    return false;
                }

                for (let i = 0; i < this.data.length; i++) {
                    if (this.data[i] !== other.data[i]) {
                        return false;
                    }
                }

                return true;
            }
        }

        it('should handle large arrays efficiently', () => {
            // Given
            const largeArray = Array.from({ length: 10000 }, (_, i) => i);
            const obj1 = new LargeValueObject([...largeArray]);
            const obj2 = new LargeValueObject([...largeArray]);
            const obj3 = new LargeValueObject([...largeArray, 10000]); // One extra element

            // When
            const startTime = performance.now();

            const result1 = obj1.equals(obj2);
            const result2 = obj1.equals(obj3);

            const endTime = performance.now();
            const duration = endTime - startTime;

            // Then
            expect(result1).toBe(true);
            expect(result2).toBe(false);
            expect(duration).toBeLessThan(100); // Should complete within 100ms
        });

        it('should short-circuit on first difference', () => {
            // Given
            const baseArray = Array.from({ length: 10000 }, (_, i) => i);
            const modifiedArray = [...baseArray];
            modifiedArray[0] = -1; // First element different

            const obj1 = new LargeValueObject(baseArray);
            const obj2 = new LargeValueObject(modifiedArray);

            // When
            const startTime = performance.now();
            const result = obj1.equals(obj2);
            const endTime = performance.now();
            const duration = endTime - startTime;

            // Then
            expect(result).toBe(false);
            expect(duration).toBeLessThan(10); // Should short-circuit very quickly
        });
    });

    describe('Should_HandleEdgeCases_When_ComparingValueObjects', () => {
        it('should handle comparison with null and undefined', () => {
            // Given
            const money = new Money(100, 'USD');

            // When & Then
            expect(money.equals(null as any)).toBe(false);
            expect(money.equals(undefined as any)).toBe(false);
        });

        it('should handle comparison with different types', () => {
            // Given
            const money = new Money(100, 'USD');
            const status = OrderStatus.PENDING;

            // When & Then
            expect(money.equals(status as any)).toBe(false);
            expect(status.equals(money as any)).toBe(false);
        });

        it('should handle self-comparison', () => {
            // Given
            const money = new Money(100, 'USD');
            const status = OrderStatus.PENDING;

            // When & Then
            expect(money.equals(money)).toBe(true);
            expect(status.equals(status)).toBe(true);
        });

        it('should handle extreme values', () => {
            // Given
            const maxMoney = new Money(Number.MAX_SAFE_INTEGER, 'USD');
            const minMoney = new Money(Number.MIN_SAFE_INTEGER, 'USD');
            const infinityMoney = new Money(Number.POSITIVE_INFINITY, 'USD');

            // When & Then
            expect(maxMoney.equals(new Money(Number.MAX_SAFE_INTEGER, 'USD'))).toBe(true);
            expect(minMoney.equals(new Money(Number.MIN_SAFE_INTEGER, 'USD'))).toBe(true);
            expect(infinityMoney.equals(new Money(Number.POSITIVE_INFINITY, 'USD'))).toBe(true);

            expect(maxMoney.equals(minMoney)).toBe(false);
            expect(maxMoney.equals(infinityMoney)).toBe(false);
        });
    });
});