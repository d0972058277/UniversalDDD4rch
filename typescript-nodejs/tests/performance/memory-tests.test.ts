/**
 * Memory Leak Detection Tests
 * Architecture.Core TypeScript Implementation
 */

import { Result } from '../../src/functional/result';
import { Maybe } from '../../src/functional/maybe';
import { Error } from '../../src/functional/error';
import { ValueObject } from '../../src/domain/value-object';
import { AggregateRoot } from '../../src/domain/aggregate-root';
import { DomainEventBase } from '../../src/domain/domain-event-base';

// Test ValueObject for memory testing
class TestValueObject extends ValueObject {
    constructor(
        private readonly id: string,
        private readonly data: string,
        private readonly metadata: Record<string, unknown>
    ) {
        super();
    }

    protected getEqualityComponents(): readonly unknown[] {
        return [this.id, this.data, this.metadata];
    }
}

// Test Event for memory testing
class TestEvent extends DomainEventBase {
    constructor(
        public readonly aggregateId: string,
        public readonly eventType: string,
        public readonly payload: Record<string, unknown>
    ) {
        super();
    }
}

// Test Aggregate for memory testing
class TestAggregate extends AggregateRoot<string> {
    private _data: string[] = [];

    constructor(id: string) {
        super(id);
    }

    addData(data: string): void {
        this._data.push(data);
        this.addEvent(new TestEvent(this.id, 'data-added', { data, timestamp: Date.now() }));
    }

    get dataCount(): number {
        return this._data.length;
    }
}

// Memory measurement utilities
interface MemorySnapshot {
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
    timestamp: number;
}

function takeMemorySnapshot(): MemorySnapshot {
    if (global.gc) {
        global.gc();
    }

    const usage = process.memoryUsage();
    return {
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
        arrayBuffers: usage.arrayBuffers,
        timestamp: Date.now()
    };
}

function calculateMemoryDiff(before: MemorySnapshot, after: MemorySnapshot): {
    heapUsedDiff: number;
    heapTotalDiff: number;
    externalDiff: number;
    arrayBuffersDiff: number;
} {
    return {
        heapUsedDiff: after.heapUsed - before.heapUsed,
        heapTotalDiff: after.heapTotal - before.heapTotal,
        externalDiff: after.external - before.external,
        arrayBuffersDiff: after.arrayBuffers - before.arrayBuffers
    };
}

describe('Memory Leak Detection Tests', () => {
    // Enable garbage collection in tests
    beforeAll(() => {
        if (global.gc) {
            global.gc();
        }
    });

    afterEach(() => {
        if (global.gc) {
            global.gc();
        }
    });

    describe('Result Type Memory Tests', () => {
        test('Should_NotLeakMemory_When_CreatingManyResults', () => {
            // Given
            const initialSnapshot = takeMemorySnapshot();
            const iterations = 100000;

            // When
            for (let i = 0; i < iterations; i++) {
                const successResult = Result.ok(`value-${i}`);
                const failureResult = Result.fail(Error.domain('TEST_ERROR', `Error ${i}`));

                // Use the results to prevent optimization
                successResult.match(
                    value => value.length,
                    error => error.message.length
                );

                failureResult.match(
                    value => value.length,
                    error => error.message.length
                );
            }

            // Force garbage collection
            if (global.gc) {
                global.gc();
            }

            const finalSnapshot = takeMemorySnapshot();
            const memoryDiff = calculateMemoryDiff(initialSnapshot, finalSnapshot);

            // Then
            // Memory growth should be minimal (less than 10MB for 100k operations)
            const memoryGrowthMB = memoryDiff.heapUsedDiff / 1024 / 1024;
            expect(memoryGrowthMB).toBeLessThan(10);

            console.log(`Result memory test: ${memoryGrowthMB.toFixed(2)}MB growth for ${iterations} operations`);
        });

        test('Should_NotLeakMemory_When_ChainingResultOperations', () => {
            // Given
            const initialSnapshot = takeMemorySnapshot();
            const iterations = 10000;

            // When
            for (let i = 0; i < iterations; i++) {
                const result = Result.ok(i)
                    .map(x => x * 2)
                    .bind(x => x > 1000 ? Result.fail(Error.validation('TOO_LARGE', 'Value too large')) : Result.ok(x))
                    .map(x => x.toString())
                    .bind(s => Result.ok(s.length))
                    .map(len => len > 0);

                // Use the result
                result.match(
                    value => value,
                    error => false
                );
            }

            // Force garbage collection
            if (global.gc) {
                global.gc();
            }

            const finalSnapshot = takeMemorySnapshot();
            const memoryDiff = calculateMemoryDiff(initialSnapshot, finalSnapshot);

            // Then
            const memoryGrowthMB = memoryDiff.heapUsedDiff / 1024 / 1024;
            expect(memoryGrowthMB).toBeLessThan(5);

            console.log(`Result chaining memory test: ${memoryGrowthMB.toFixed(2)}MB growth for ${iterations} operations`);
        });
    });

    describe('Maybe Type Memory Tests', () => {
        test('Should_NotLeakMemory_When_CreatingManyMaybes', () => {
            // Given
            const initialSnapshot = takeMemorySnapshot();
            const iterations = 100000;

            // When
            for (let i = 0; i < iterations; i++) {
                const someValue = Maybe.some(`value-${i}`);
                const noneValue = Maybe.none<string>();
                const nullableValue = Maybe.fromNullable(i % 2 === 0 ? `nullable-${i}` : null);

                // Use the maybes to prevent optimization
                someValue.match(
                    value => value.length,
                    () => 0
                );

                noneValue.match(
                    value => value.length,
                    () => 0
                );

                nullableValue.match(
                    value => value ? value.length : 0,
                    () => 0
                );
            }

            // Force garbage collection
            if (global.gc) {
                global.gc();
            }

            const finalSnapshot = takeMemorySnapshot();
            const memoryDiff = calculateMemoryDiff(initialSnapshot, finalSnapshot);

            // Then
            const memoryGrowthMB = memoryDiff.heapUsedDiff / 1024 / 1024;
            expect(memoryGrowthMB).toBeLessThan(10);

            console.log(`Maybe memory test: ${memoryGrowthMB.toFixed(2)}MB growth for ${iterations} operations`);
        });

        test('Should_NotLeakMemory_When_ChainingMaybeOperations', () => {
            // Given
            const initialSnapshot = takeMemorySnapshot();
            const iterations = 10000;

            // When
            for (let i = 0; i < iterations; i++) {
                const maybe = Maybe.some(i)
                    .map(x => x * 2)
                    .bind(x => x > 1000 ? Maybe.none<number>() : Maybe.some(x))
                    .map(x => x.toString())
                    .bind(s => Maybe.some(s.length))
                    .map(len => len > 0);

                // Use the maybe
                maybe.match(
                    value => value,
                    () => false
                );
            }

            // Force garbage collection
            if (global.gc) {
                global.gc();
            }

            const finalSnapshot = takeMemorySnapshot();
            const memoryDiff = calculateMemoryDiff(initialSnapshot, finalSnapshot);

            // Then
            const memoryGrowthMB = memoryDiff.heapUsedDiff / 1024 / 1024;
            expect(memoryGrowthMB).toBeLessThan(5);

            console.log(`Maybe chaining memory test: ${memoryGrowthMB.toFixed(2)}MB growth for ${iterations} operations`);
        });
    });

    describe('ValueObject Memory Tests', () => {
        test('Should_NotLeakMemory_When_CreatingManyValueObjects', () => {
            // Given
            const initialSnapshot = takeMemorySnapshot();
            const iterations = 50000;

            // When
            for (let i = 0; i < iterations; i++) {
                const metadata = {
                    created: new Date(),
                    index: i,
                    tags: [`tag-${i}`, `category-${i % 10}`],
                    flags: { active: i % 2 === 0, priority: i % 3 }
                };

                const valueObject = new TestValueObject(`id-${i}`, `data-${i}`, metadata);

                // Use the value object
                valueObject.equals(valueObject);
                valueObject.getHashCode();
            }

            // Force garbage collection
            if (global.gc) {
                global.gc();
            }

            const finalSnapshot = takeMemorySnapshot();
            const memoryDiff = calculateMemoryDiff(initialSnapshot, finalSnapshot);

            // Then
            const memoryGrowthMB = memoryDiff.heapUsedDiff / 1024 / 1024;
            expect(memoryGrowthMB).toBeLessThan(20);

            console.log(`ValueObject memory test: ${memoryGrowthMB.toFixed(2)}MB growth for ${iterations} operations`);
        });

        test('Should_NotLeakMemory_When_ComparingManyValueObjects', () => {
            // Given
            const initialSnapshot = takeMemorySnapshot();
            const iterations = 10000;

            // Create base objects for comparison
            const baseObjects: TestValueObject[] = [];
            for (let i = 0; i < 100; i++) {
                const metadata = { base: true, index: i };
                baseObjects.push(new TestValueObject(`base-${i}`, `base-data-${i}`, metadata));
            }

            // When
            for (let i = 0; i < iterations; i++) {
                const metadata = { test: true, index: i };
                const testObject = new TestValueObject(`test-${i}`, `test-data-${i}`, metadata);

                // Compare with multiple base objects
                for (const baseObject of baseObjects) {
                    testObject.equals(baseObject);
                }

                // Generate hash codes
                testObject.getHashCode();
            }

            // Force garbage collection
            if (global.gc) {
                global.gc();
            }

            const finalSnapshot = takeMemorySnapshot();
            const memoryDiff = calculateMemoryDiff(initialSnapshot, finalSnapshot);

            // Then
            const memoryGrowthMB = memoryDiff.heapUsedDiff / 1024 / 1024;
            expect(memoryGrowthMB).toBeLessThan(15);

            console.log(`ValueObject comparison memory test: ${memoryGrowthMB.toFixed(2)}MB growth for ${iterations} operations`);
        });
    });

    describe('AggregateRoot Memory Tests', () => {
        test('Should_NotLeakMemory_When_CreatingManyAggregates', () => {
            // Given
            const initialSnapshot = takeMemorySnapshot();
            const iterations = 10000;

            // When
            for (let i = 0; i < iterations; i++) {
                const aggregate = new TestAggregate(`aggregate-${i}`);

                // Add some data and events
                for (let j = 0; j < 10; j++) {
                    aggregate.addData(`data-${i}-${j}`);
                }

                // Use the aggregate
                aggregate.events.length;
                aggregate.dataCount;
                aggregate.version;
            }

            // Force garbage collection
            if (global.gc) {
                global.gc();
            }

            const finalSnapshot = takeMemorySnapshot();
            const memoryDiff = calculateMemoryDiff(initialSnapshot, finalSnapshot);

            // Then
            const memoryGrowthMB = memoryDiff.heapUsedDiff / 1024 / 1024;
            expect(memoryGrowthMB).toBeLessThan(25);

            console.log(`AggregateRoot memory test: ${memoryGrowthMB.toFixed(2)}MB growth for ${iterations} operations`);
        });

        test('Should_NotLeakMemory_When_AddingManyEvents', () => {
            // Given
            const initialSnapshot = takeMemorySnapshot();
            const eventsPerAggregate = 1000;
            const aggregateCount = 100;

            // When
            for (let i = 0; i < aggregateCount; i++) {
                const aggregate = new TestAggregate(`event-test-${i}`);

                for (let j = 0; j < eventsPerAggregate; j++) {
                    aggregate.addData(`event-data-${i}-${j}`);
                }

                // Clear events periodically to simulate event handling
                if (i % 10 === 0) {
                    aggregate.clearEvents();
                }
            }

            // Force garbage collection
            if (global.gc) {
                global.gc();
            }

            const finalSnapshot = takeMemorySnapshot();
            const memoryDiff = calculateMemoryDiff(initialSnapshot, finalSnapshot);

            // Then
            const memoryGrowthMB = memoryDiff.heapUsedDiff / 1024 / 1024;
            expect(memoryGrowthMB).toBeLessThan(30);

            const totalEvents = aggregateCount * eventsPerAggregate;
            console.log(`Event collection memory test: ${memoryGrowthMB.toFixed(2)}MB growth for ${totalEvents} events`);
        });

        test('Should_ReleaseMemory_When_ClearingEvents', () => {
            // Given
            const aggregate = new TestAggregate('clear-test');

            // Add many events
            for (let i = 0; i < 10000; i++) {
                aggregate.addData(`clear-test-data-${i}`);
            }

            const beforeClear = takeMemorySnapshot();

            // When
            aggregate.clearEvents();

            // Force garbage collection
            if (global.gc) {
                global.gc();
            }

            const afterClear = takeMemorySnapshot();
            const memoryDiff = calculateMemoryDiff(beforeClear, afterClear);

            // Then
            // Events should be empty
            expect(aggregate.events.length).toBe(0);

            // Memory should be released (or at least not grow significantly)
            const memoryGrowthMB = memoryDiff.heapUsedDiff / 1024 / 1024;
            expect(memoryGrowthMB).toBeLessThan(5); // Allow some growth for GC overhead

            console.log(`Event clearing memory test: ${memoryGrowthMB.toFixed(2)}MB change after clearing 10,000 events`);
        });
    });

    describe('Error Memory Tests', () => {
        test('Should_NotLeakMemory_When_CreatingManyErrors', () => {
            // Given
            const initialSnapshot = takeMemorySnapshot();
            const iterations = 50000;

            // When
            for (let i = 0; i < iterations; i++) {
                const metadata = {
                    field: `field-${i}`,
                    value: i,
                    timestamp: Date.now(),
                    context: { operation: 'test', iteration: i }
                };

                const domainError = Error.domain(`DOMAIN_${i}`, `Domain error ${i}`, metadata);
                const validationError = Error.validation(`VALIDATION_${i}`, `Validation error ${i}`);
                const infraError = Error.infrastructure(`INFRA_${i}`, `Infrastructure error ${i}`);

                // Use the errors
                domainError.message.length;
                validationError.code.length;
                infraError.category;
            }

            // Force garbage collection
            if (global.gc) {
                global.gc();
            }

            const finalSnapshot = takeMemorySnapshot();
            const memoryDiff = calculateMemoryDiff(initialSnapshot, finalSnapshot);

            // Then
            const memoryGrowthMB = memoryDiff.heapUsedDiff / 1024 / 1024;
            expect(memoryGrowthMB).toBeLessThan(15);

            console.log(`Error memory test: ${memoryGrowthMB.toFixed(2)}MB growth for ${iterations} operations`);
        });
    });

    describe('Combined Memory Stress Tests', () => {
        test('Should_NotLeakMemory_When_CombiningAllTypes', () => {
            // Given
            const initialSnapshot = takeMemorySnapshot();
            const iterations = 5000;

            // When
            for (let i = 0; i < iterations; i++) {
                // Create aggregate with events
                const aggregate = new TestAggregate(`combined-${i}`);
                aggregate.addData(`combined-data-${i}`);

                // Create value objects
                const metadata = { combined: true, iteration: i };
                const valueObject = new TestValueObject(`combined-${i}`, `combined-data-${i}`, metadata);

                // Create functional types
                const result = Result.ok(valueObject)
                    .bind(vo => Result.ok(vo.getHashCode()))
                    .map(hash => hash.toString());

                const maybe = Maybe.some(aggregate)
                    .map(agg => agg.events.length)
                    .bind(count => count > 0 ? Maybe.some(count) : Maybe.none<number>());

                // Create errors
                const error = Error.domain(`COMBINED_${i}`, `Combined error ${i}`, metadata);

                // Use all types
                result.match(
                    value => value.length,
                    err => err.message.length
                );

                maybe.match(
                    value => value,
                    () => 0
                );

                aggregate.clearEvents();
            }

            // Force garbage collection
            if (global.gc) {
                global.gc();
            }

            const finalSnapshot = takeMemorySnapshot();
            const memoryDiff = calculateMemoryDiff(initialSnapshot, finalSnapshot);

            // Then
            const memoryGrowthMB = memoryDiff.heapUsedDiff / 1024 / 1024;
            expect(memoryGrowthMB).toBeLessThan(30);

            console.log(`Combined memory stress test: ${memoryGrowthMB.toFixed(2)}MB growth for ${iterations} operations`);
        });
    });

    describe('Long-Running Memory Tests', () => {
        test('Should_StabilizeMemory_When_RunningContinuously', async () => {
            // Given
            const snapshots: MemorySnapshot[] = [];
            const duration = 5000; // 5 seconds
            const intervalMs = 500; // Take snapshot every 500ms
            const startTime = Date.now();

            // When - Run operations continuously for duration
            const interval = setInterval(() => {
                // Perform various operations
                for (let i = 0; i < 100; i++) {
                    const result = Result.ok(i).map(x => x * 2);
                    const maybe = Maybe.some(i).bind(x => x > 50 ? Maybe.some(x) : Maybe.none());
                    const error = Error.domain(`LOOP_${i}`, `Loop error ${i}`);

                    result.match(v => v, e => 0);
                    maybe.match(v => v, () => 0);
                }

                snapshots.push(takeMemorySnapshot());
            }, intervalMs);

            // Wait for duration
            await new Promise(resolve => setTimeout(resolve, duration));
            clearInterval(interval);

            // Force final garbage collection
            if (global.gc) {
                global.gc();
            }

            snapshots.push(takeMemorySnapshot());

            // Then
            // Memory should stabilize (not grow continuously)
            const initialSnapshot = snapshots[0];
            const finalSnapshot = snapshots[snapshots.length - 1];

            if (!initialSnapshot || !finalSnapshot) {
                throw new Error('Failed to capture memory snapshots');
            }

            const initialMemory = initialSnapshot.heapUsed;
            const finalMemory = finalSnapshot.heapUsed;
            const memoryGrowthMB = (finalMemory - initialMemory) / 1024 / 1024;

            expect(memoryGrowthMB).toBeLessThan(10); // Should not grow more than 10MB

            // Check for continuous growth (warning sign of memory leak)
            const growthRates: number[] = [];
            for (let i = 1; i < snapshots.length; i++) {
                const currentSnapshot = snapshots[i];
                const previousSnapshot = snapshots[i - 1];

                if (!currentSnapshot || !previousSnapshot) {
                    continue;
                }

                const growth = currentSnapshot.heapUsed - previousSnapshot.heapUsed;
                growthRates.push(growth);
            }

            const averageGrowthRate = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
            const maxGrowthRate = Math.max(...growthRates);

            console.log(`Long-running memory test:`);
            console.log(`  Total growth: ${memoryGrowthMB.toFixed(2)}MB`);
            console.log(`  Average growth rate: ${(averageGrowthRate / 1024).toFixed(2)}KB per interval`);
            console.log(`  Max growth rate: ${(maxGrowthRate / 1024).toFixed(2)}KB per interval`);

            // Average growth rate should be close to zero for stable memory
            expect(Math.abs(averageGrowthRate)).toBeLessThan(100 * 1024); // Less than 100KB average growth per interval
        }, 10000); // 10 second timeout for this test
    });
});