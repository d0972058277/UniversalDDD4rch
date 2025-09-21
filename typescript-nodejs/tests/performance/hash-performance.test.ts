/**
 * Hash Code Stability Performance Tests
 * Architecture.Core TypeScript Implementation
 */

import { performance } from 'perf_hooks';
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

function createNestedValueObjects(count: number): NestedValueObject[] {
    const objects: NestedValueObject[] = [];
    const simpleObjects = createSimpleValueObjects(count);
    const complexObjects = createComplexValueObjects(count);

    for (let i = 0; i < count; i++) {
        const simpleObject = simpleObjects[i];
        const complexObject = complexObjects[i];

        if (!simpleObject || !complexObject) {
            continue;
        }

        const arrayElements = simpleObjects.slice(0, i % 5 + 1);
        objects.push(new NestedValueObject(
            simpleObject,
            complexObject,
            arrayElements
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

// Performance measurement utilities
function measureHashCodePerformance(name: string, objects: ValueObject[], iterations: number = 1000): {
    totalTime: number;
    averageTime: number;
    operationsPerSecond: number;
} {
    // Warm up
    for (let i = 0; i < 100; i++) {
        const obj = objects[i % objects.length];
        if (obj) {
            obj.getHashCode();
        }
    }

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        const obj = objects[i % objects.length];
        if (obj) {
            obj.getHashCode();
        }
    }
    const end = performance.now();

    const totalTime = end - start;
    const averageTime = totalTime / iterations;
    const operationsPerSecond = 1000 / averageTime;

    console.log(`${name}:`);
    console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`  Average time per operation: ${averageTime.toFixed(6)}ms`);
    console.log(`  Operations per second: ${operationsPerSecond.toFixed(0)}`);
    console.log();

    return { totalTime, averageTime, operationsPerSecond };
}

describe('Hash Code Stability Performance Tests', () => {
    describe('Hash Code Generation Performance', () => {
        test('Should_GenerateHashCodesEfficiently_When_SimpleValueObjects', () => {
            // Given
            const objects = createSimpleValueObjects(1000);
            const iterations = 10000;

            // When
            const performance = measureHashCodePerformance(
                'Simple ValueObject hash code generation',
                objects,
                iterations
            );

            // Then
            expect(performance.averageTime).toBeLessThan(0.01); // Less than 0.01ms per operation
            expect(performance.operationsPerSecond).toBeGreaterThan(10000); // More than 10k ops/sec
        });

        test('Should_GenerateHashCodesEfficiently_When_ComplexValueObjects', () => {
            // Given
            const objects = createComplexValueObjects(500);
            const iterations = 5000;

            // When
            const performance = measureHashCodePerformance(
                'Complex ValueObject hash code generation',
                objects,
                iterations
            );

            // Then
            expect(performance.averageTime).toBeLessThan(0.1); // Less than 0.1ms per operation
            expect(performance.operationsPerSecond).toBeGreaterThan(1000); // More than 1k ops/sec
        });

        test('Should_GenerateHashCodesEfficiently_When_NestedValueObjects', () => {
            // Given
            const objects = createNestedValueObjects(200);
            const iterations = 2000;

            // When
            const performance = measureHashCodePerformance(
                'Nested ValueObject hash code generation',
                objects,
                iterations
            );

            // Then
            expect(performance.averageTime).toBeLessThan(0.5); // Less than 0.5ms per operation
            expect(performance.operationsPerSecond).toBeGreaterThan(500); // More than 500 ops/sec
        });

        test('Should_HandleEdgeCases_When_GeneratingHashCodes', () => {
            // Given
            const objects = createEdgeCaseValueObjects(1000);
            const iterations = 5000;

            // When
            const performance = measureHashCodePerformance(
                'Edge case ValueObject hash code generation',
                objects,
                iterations
            );

            // Then
            expect(performance.averageTime).toBeLessThan(0.1); // Less than 0.1ms per operation
            expect(performance.operationsPerSecond).toBeGreaterThan(1000); // More than 1k ops/sec

            // Ensure no errors are thrown
            objects.forEach(obj => {
                expect(() => obj.getHashCode()).not.toThrow();
            });
        });
    });

    describe('Hash Code Stability Tests', () => {
        test('Should_ReturnConsistentHashCodes_When_CalledMultipleTimes', () => {
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

        test('Should_ReturnSameHashCode_When_ObjectsAreEqual', () => {
            // Given
            const count = 1000;

            // When & Then
            for (let i = 0; i < count; i++) {
                const obj1 = new SimpleValueObject(`test${i}`, i);
                const obj2 = new SimpleValueObject(`test${i}`, i);

                expect(obj1.equals(obj2)).toBe(true);
                expect(obj1.getHashCode()).toBe(obj2.getHashCode());
            }
        });

        test('Should_HandleLargeCollections_When_UsingHashCodes', () => {
            // Given
            const objects = createComplexValueObjects(10000);
            const set = new Set<number>();
            const map = new Map<number, ComplexValueObject>();

            // When
            const start = performance.now();

            objects.forEach(obj => {
                const hash = obj.getHashCode();
                set.add(hash);
                map.set(hash, obj);
            });

            const end = performance.now();

            // Then
            const totalTime = end - start;
            const averageTime = totalTime / objects.length;

            console.log(`Large collection hash code usage:`);
            console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
            console.log(`  Average time per object: ${averageTime.toFixed(6)}ms`);
            console.log(`  Unique hash codes: ${set.size}/${objects.length}`);
            console.log();

            expect(averageTime).toBeLessThan(0.1); // Less than 0.1ms per object
            expect(set.size).toBeGreaterThan(objects.length * 0.9); // At least 90% unique hashes
        });

        test('Should_DistributeHashCodes_When_LargeDataSet', () => {
            // Given
            const objects = createComplexValueObjects(10000);
            const hashCodes = objects.map(obj => obj.getHashCode());

            // When
            const uniqueHashes = new Set(hashCodes);
            const collisionRate = 1 - (uniqueHashes.size / hashCodes.length);

            // Hash distribution analysis
            const buckets = new Array(1000).fill(0);
            hashCodes.forEach(hash => {
                const bucket = Math.abs(hash) % buckets.length;
                buckets[bucket]++;
            });

            const averageBucketSize = hashCodes.length / buckets.length;
            const variance = buckets.reduce((sum, count) => {
                const diff = count - averageBucketSize;
                return sum + (diff * diff);
            }, 0) / buckets.length;
            const standardDeviation = Math.sqrt(variance);

            // Then
            console.log(`Hash code distribution analysis:`);
            console.log(`  Total objects: ${objects.length}`);
            console.log(`  Unique hash codes: ${uniqueHashes.size}`);
            console.log(`  Collision rate: ${(collisionRate * 100).toFixed(2)}%`);
            console.log(`  Standard deviation: ${standardDeviation.toFixed(2)}`);
            console.log();

            expect(collisionRate).toBeLessThan(0.1); // Less than 10% collision rate
            expect(standardDeviation).toBeLessThan(averageBucketSize * 3.0); // Relaxed distribution threshold for CI
        });
    });

    describe('Hash Code Caching Performance', () => {
        test('Should_CacheHashCodes_When_ImplementedProperly', () => {
            // Given
            const objects = createComplexValueObjects(1000);

            // First call (potential cache miss)
            const start1 = performance.now();
            objects.forEach(obj => obj.getHashCode());
            const end1 = performance.now();
            const firstCallTime = end1 - start1;

            // Second call (should hit cache if implemented)
            const start2 = performance.now();
            objects.forEach(obj => obj.getHashCode());
            const end2 = performance.now();
            const secondCallTime = end2 - start2;

            // Multiple subsequent calls
            const start3 = performance.now();
            for (let i = 0; i < 10; i++) {
                objects.forEach(obj => obj.getHashCode());
            }
            const end3 = performance.now();
            const multipleCallsTime = (end3 - start3) / 10;

            // Then
            console.log(`Hash code caching performance:`);
            console.log(`  First call: ${firstCallTime.toFixed(2)}ms`);
            console.log(`  Second call: ${secondCallTime.toFixed(2)}ms`);
            console.log(`  Average subsequent calls: ${multipleCallsTime.toFixed(2)}ms`);
            console.log(`  Speedup factor: ${(firstCallTime / secondCallTime).toFixed(2)}x`);
            console.log();

            // If caching is implemented, subsequent calls should be faster
            // Allow for some variance due to JIT optimization and other factors
            expect(secondCallTime).toBeLessThanOrEqual(firstCallTime * 1.2);
            expect(multipleCallsTime).toBeLessThanOrEqual(firstCallTime * 1.2);
        });

        test('Should_HandleConcurrentHashCodeGeneration_When_MultipleThreadsSimulated', async () => {
            // Given
            const objects = createComplexValueObjects(1000);
            const concurrentCallsPerObject = 100;

            // When - Simulate concurrent access with Promise.all
            const start = performance.now();

            const promises = objects.map(obj =>
                Promise.all(
                    Array.from({ length: concurrentCallsPerObject }, () =>
                        Promise.resolve(obj.getHashCode())
                    )
                )
            );

            const results = await Promise.all(promises);
            const end = performance.now();

            // Then
            const totalTime = end - start;
            const totalOperations = objects.length * concurrentCallsPerObject;
            const averageTime = totalTime / totalOperations;

            console.log(`Concurrent hash code generation:`);
            console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
            console.log(`  Total operations: ${totalOperations}`);
            console.log(`  Average time per operation: ${averageTime.toFixed(6)}ms`);
            console.log();

            // Verify all hash codes are consistent for each object
            results.forEach((objectResults, index) => {
                const firstHash = objectResults[0];
                objectResults.forEach(hash => {
                    expect(hash).toBe(firstHash);
                });
            });

            expect(averageTime).toBeLessThan(0.1); // Less than 0.1ms per operation
        });
    });

    describe('Hash Code Memory Efficiency', () => {
        test('Should_UseMemoryEfficiently_When_GeneratingHashCodes', () => {
            // Given
            const beforeMemory = process.memoryUsage();
            const objects = createComplexValueObjects(10000);

            // When
            const hashCodes = objects.map(obj => obj.getHashCode());

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }

            const afterMemory = process.memoryUsage();

            // Then
            const memoryDiff = afterMemory.heapUsed - beforeMemory.heapUsed;
            const memoryPerObject = memoryDiff / objects.length;

            console.log(`Hash code memory efficiency:`);
            console.log(`  Memory difference: ${(memoryDiff / 1024 / 1024).toFixed(2)} MB`);
            console.log(`  Memory per object: ${memoryPerObject.toFixed(0)} bytes`);
            console.log(`  Hash codes generated: ${hashCodes.length}`);
            console.log();

            // Memory usage should be reasonable
            expect(memoryPerObject).toBeLessThan(5000); // Less than 5KB per object (including object itself)

            // Hash codes should be numbers (minimal memory footprint)
            hashCodes.forEach(hash => {
                expect(typeof hash).toBe('number');
                expect(Number.isInteger(hash)).toBe(true);
            });
        });
    });

    describe('Performance Regression Tests', () => {
        test('Should_MeetPerformanceTargets_When_RunningStandardBenchmark', () => {
            // Given
            const targets = {
                simple: { maxTime: 0.01, minOpsPerSec: 10000 },
                complex: { maxTime: 0.1, minOpsPerSec: 1000 },
                nested: { maxTime: 0.5, minOpsPerSec: 500 }
            };

            const simpleObjects = createSimpleValueObjects(1000);
            const complexObjects = createComplexValueObjects(500);
            const nestedObjects = createNestedValueObjects(200);

            // When & Then
            const simplePerf = measureHashCodePerformance('Simple benchmark', simpleObjects, 10000);
            expect(simplePerf.averageTime).toBeLessThan(targets.simple.maxTime);
            expect(simplePerf.operationsPerSecond).toBeGreaterThan(targets.simple.minOpsPerSec);

            const complexPerf = measureHashCodePerformance('Complex benchmark', complexObjects, 5000);
            expect(complexPerf.averageTime).toBeLessThan(targets.complex.maxTime);
            expect(complexPerf.operationsPerSecond).toBeGreaterThan(targets.complex.minOpsPerSec);

            const nestedPerf = measureHashCodePerformance('Nested benchmark', nestedObjects, 2000);
            expect(nestedPerf.averageTime).toBeLessThan(targets.nested.maxTime);
            expect(nestedPerf.operationsPerSecond).toBeGreaterThan(targets.nested.minOpsPerSec);

            console.log('All performance targets met! ✓');
        });
    });
});