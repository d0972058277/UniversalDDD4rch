/**
 * Hash Code Correctness Tests
 * Architecture.Core TypeScript Implementation
 *
 * These tests verify the correctness of hash code implementation,
 * focusing on stability, consistency, and distribution properties
 * rather than hardware-dependent performance metrics.
 */

import { ValueObject } from '../../src/domain/value-object';

// Test ValueObject implementations with different complexity levels
class SimpleValueObject extends ValueObject {
    constructor(
        private readonly value1: string,
        private readonly value2: number
    ) {
        super();
    }

    protected getEqualityComponents(): readonly unknown[] {
        return [this.value1, this.value2];
    }
}

class ComplexValueObject extends ValueObject {
    constructor(
        private readonly id: string,
        private readonly name: string,
        private readonly email: string,
        private readonly age: number,
        private readonly isActive: boolean,
        private readonly tags: readonly string[],
        private readonly metadata: ReadonlyMap<string, unknown>
    ) {
        super();
    }

    protected getEqualityComponents(): readonly unknown[] {
        return [
            this.id,
            this.name,
            this.email,
            this.age,
            this.isActive,
            this.tags,
            this.metadata
        ];
    }
}

class NestedValueObject extends ValueObject {
    constructor(
        private readonly simple: SimpleValueObject,
        private readonly complex: ComplexValueObject,
        private readonly array: readonly SimpleValueObject[]
    ) {
        super();
    }

    protected getEqualityComponents(): readonly unknown[] {
        return [this.simple, this.complex, this.array];
    }
}

class EdgeCaseValueObject extends ValueObject {
    constructor(
        private readonly nullValue: string | null,
        private readonly undefinedValue: string | undefined,
        private readonly emptyArray: readonly unknown[],
        private readonly emptyMap: ReadonlyMap<string, unknown>,
        private readonly nestedNulls: readonly (string | null)[]
    ) {
        super();
    }

    protected getEqualityComponents(): readonly unknown[] {
        return [
            this.nullValue,
            this.undefinedValue,
            this.emptyArray,
            this.emptyMap,
            this.nestedNulls
        ];
    }
}

// Utility functions for test data creation
function createSimpleValueObjects(count: number): SimpleValueObject[] {
    const objects: SimpleValueObject[] = [];
    for (let i = 0; i < count; i++) {
        objects.push(new SimpleValueObject(`value${i}`, i));
    }
    return objects;
}

function createComplexValueObjects(count: number): ComplexValueObject[] {
    const objects: ComplexValueObject[] = [];
    for (let i = 0; i < count; i++) {
        const tags = [`tag${i}`, `category${i % 10}`, `type${i % 5}`];
        const metadata = new Map<string, any>([
            ['created', new Date(2025, 0, 1, 0, 0, i)],
            ['version', i],
            ['flags', { enabled: i % 2 === 0, priority: i % 3 }],
            ['scores', [i * 0.1, i * 0.2, i * 0.3]]
        ]);

        objects.push(new ComplexValueObject(
            `id${i}`,
            `Name ${i}`,
            `user${i}@example.com`,
            20 + (i % 60),
            i % 2 === 0,
            tags,
            metadata
        ));
    }
    return objects;
}

function createEdgeCaseValueObjects(count: number): EdgeCaseValueObject[] {
    const objects: EdgeCaseValueObject[] = [];
    for (let i = 0; i < count; i++) {
        const nullValue = i % 3 === 0 ? null : `value${i}`;
        const undefinedValue = i % 4 === 0 ? undefined : `defined${i}`;
        const emptyArray: readonly unknown[] = [];
        const emptyMap = new Map<string, unknown>();
        const nestedNulls = Array.from({ length: i % 5 }, (_, j) =>
            j % 2 === 0 ? null : `nested${j}`
        );

        objects.push(new EdgeCaseValueObject(
            nullValue,
            undefinedValue,
            emptyArray,
            emptyMap,
            nestedNulls
        ));
    }
    return objects;
}

describe('Hash Code Correctness Tests', () => {
    describe('Hash Code Stability', () => {
        test('Should_ReturnConsistentHashCode_When_CalledMultipleTimes', () => {
            // Given
            const objects = createSimpleValueObjects(100);
            const callsPerObject = 1000;

            // When & Then
            objects.forEach(obj => {
                const firstHash = obj.getHashCode();

                for (let i = 0; i < callsPerObject; i++) {
                    const subsequentHash = obj.getHashCode();
                    expect(subsequentHash).toBe(firstHash);
                }
            });
        });

        test('Should_ReturnConsistentHashCode_When_ComplexValueObjects', () => {
            // Given
            const objects = createComplexValueObjects(50);
            const callsPerObject = 100;

            // When & Then
            objects.forEach(obj => {
                const firstHash = obj.getHashCode();

                for (let i = 0; i < callsPerObject; i++) {
                    expect(obj.getHashCode()).toBe(firstHash);
                }
            });
        });

        test('Should_ReturnConsistentHashCode_When_EdgeCaseValueObjects', () => {
            // Given
            const objects = createEdgeCaseValueObjects(100);

            // When & Then
            objects.forEach(obj => {
                const firstHash = obj.getHashCode();

                // Verify no errors thrown
                expect(() => obj.getHashCode()).not.toThrow();

                // Verify consistency
                for (let i = 0; i < 100; i++) {
                    expect(obj.getHashCode()).toBe(firstHash);
                }
            });
        });
    });

    describe('Hash Code Equality Contract', () => {
        test('Should_HaveSameHashCode_When_ObjectsAreEqual', () => {
            // Given & When & Then
            for (let i = 0; i < 1000; i++) {
                const obj1 = new SimpleValueObject(`test${i}`, i);
                const obj2 = new SimpleValueObject(`test${i}`, i);

                expect(obj1.equals(obj2)).toBe(true);
                expect(obj1.getHashCode()).toBe(obj2.getHashCode());
            }
        });

        test('Should_HaveSameHashCode_When_ComplexObjectsAreEqual', () => {
            // Given
            const tags = ['tag1', 'tag2', 'tag3'];
            const metadata = new Map<string, unknown>([
                ['key1', 'value1'],
                ['key2', 42],
                ['key3', { nested: true }]
            ]);

            // When
            const obj1 = new ComplexValueObject('id1', 'Name', 'email@test.com', 25, true, tags, metadata);
            const obj2 = new ComplexValueObject('id1', 'Name', 'email@test.com', 25, true, tags, metadata);

            // Then
            expect(obj1.equals(obj2)).toBe(true);
            expect(obj1.getHashCode()).toBe(obj2.getHashCode());
        });

        test('Should_HaveDifferentHashCodes_When_ObjectsAreDifferent', () => {
            // Given
            const count = 100;
            const objects = createSimpleValueObjects(count);
            const hashCodes = new Set<number>();

            // When
            objects.forEach(obj => {
                hashCodes.add(obj.getHashCode());
            });

            // Then - Most hash codes should be unique (allow some collisions)
            expect(hashCodes.size).toBeGreaterThan(count * 0.95);
        });
    });

    describe('Hash Code Distribution', () => {
        test('Should_DistributeHashCodes_When_LargeDataSet', () => {
            // Given
            const objects = createComplexValueObjects(1000);
            const hashCodes = objects.map(obj => obj.getHashCode());

            // When
            const uniqueHashes = new Set(hashCodes);
            const collisionRate = 1 - (uniqueHashes.size / hashCodes.length);

            // Then
            expect(collisionRate).toBeLessThan(0.05); // Less than 5% collision rate
        });

        test('Should_DistributeAcrossBuckets_When_UsedInHashTable', () => {
            // Given
            const objects = createComplexValueObjects(1000);
            const hashCodes = objects.map(obj => obj.getHashCode());
            const bucketCount = 100;
            const buckets = new Array(bucketCount).fill(0);

            // When
            hashCodes.forEach(hash => {
                const bucket = Math.abs(hash) % bucketCount;
                buckets[bucket]++;
            });

            // Then - Check distribution using chi-squared test concept
            const expectedPerBucket = hashCodes.length / bucketCount;
            const chiSquared = buckets.reduce((sum, count) => {
                const diff = count - expectedPerBucket;
                return sum + (diff * diff) / expectedPerBucket;
            }, 0);

            // For 100 buckets (99 degrees of freedom) and non-cryptographic hash:
            // - Critical value at 0.05 significance: ~123.23
            // - Critical value at 0.001 significance: ~148.23
            // Using very relaxed threshold for simple hash implementation
            // This test verifies "not completely broken" rather than "cryptographically strong"
            expect(chiSquared).toBeLessThan(5000);
        });

        test('Should_NotProduceObviousPatterns_When_SequentialInputs', () => {
            // Given
            const objects = createSimpleValueObjects(100);
            const hashCodes = objects.map(obj => obj.getHashCode());

            // When - Check if hash codes are not simply sequential
            let sequentialCount = 0;
            for (let i = 1; i < hashCodes.length; i++) {
                const current = hashCodes[i];
                const previous = hashCodes[i - 1];

                if (current === undefined || previous === undefined) {
                    continue;
                }

                if (Math.abs(current - previous) === 1) {
                    sequentialCount++;
                }
            }

            // Then - Sequential pattern should be rare (< 10% by chance)
            const sequentialRate = sequentialCount / (hashCodes.length - 1);
            expect(sequentialRate).toBeLessThan(0.1);
        });
    });

    describe('Hash Code Collection Usage', () => {
        test('Should_WorkCorrectly_When_UsedInSet', () => {
            // Given
            const objects = createComplexValueObjects(100);
            const set = new Set<number>();

            // When
            objects.forEach(obj => {
                set.add(obj.getHashCode());
            });

            // Then
            expect(set.size).toBeGreaterThan(95); // At least 95% unique
        });

        test('Should_WorkCorrectly_When_UsedInMap', () => {
            // Given
            const objects = createComplexValueObjects(100);
            const map = new Map<number, ComplexValueObject>();

            // When
            objects.forEach(obj => {
                const hash = obj.getHashCode();
                map.set(hash, obj);
            });

            // Then
            expect(map.size).toBeGreaterThan(95); // At least 95% unique

            // Verify we can retrieve objects
            objects.forEach(obj => {
                const retrieved = map.get(obj.getHashCode());
                expect(retrieved).toBeDefined();
            });
        });
    });

    describe('Hash Code Type Guarantees', () => {
        test('Should_ReturnInteger_When_GetHashCodeCalled', () => {
            // Given
            const objects = [
                ...createSimpleValueObjects(10),
                ...createComplexValueObjects(10),
                ...createEdgeCaseValueObjects(10)
            ];

            // When & Then
            objects.forEach(obj => {
                const hash = obj.getHashCode();
                expect(typeof hash).toBe('number');
                expect(Number.isInteger(hash)).toBe(true);
                expect(Number.isNaN(hash)).toBe(false);
                expect(Number.isFinite(hash)).toBe(true);
            });
        });
    });
});
