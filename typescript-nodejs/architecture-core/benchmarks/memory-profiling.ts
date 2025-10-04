/**
 * Memory Profiling Utility
 * Architecture.Core TypeScript Implementation
 *
 * This is NOT an automated test suite. It's a manual profiling tool
 * for developers to analyze memory usage patterns.
 *
 * Usage:
 *   node --expose-gc --require ts-node/register benchmarks/memory-profiling.ts
 *
 * Requirements:
 *   - Must run with --expose-gc flag to enable garbage collection
 *   - Results will vary based on Node.js version, hardware, and system load
 *   - Use for development analysis only, not for CI/CD assertions
 */

import { Result } from '../src/functional/result';
import { Maybe } from '../src/functional/maybe';
import { Error } from '../src/functional/error';
import { ValueObject } from '../src/domain/value-object';
import { AggregateRoot } from '../src/domain/aggregate-root';
import { DomainEventBase } from '../src/domain/domain-event-base';

// Test ValueObject for memory profiling
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

// Test ID wrapper
class TestAggregateId {
    constructor(public readonly value: string) {}

    toString(): string {
        return this.value;
    }
}

// Test Event
class TestEvent extends DomainEventBase {
    constructor(
        public readonly aggregateId: TestAggregateId,
        public readonly eventType: string,
        public readonly payload: Record<string, unknown>
    ) {
        super();
    }
}

// Test Aggregate
class TestAggregate extends AggregateRoot<TestAggregateId> {
    private _data: string[] = [];

    constructor(id: TestAggregateId) {
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
    if (!global.gc) {
        throw new Error('Must run with --expose-gc flag');
    }

    global.gc();

    const usage = process.memoryUsage();
    return {
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
        arrayBuffers: usage.arrayBuffers,
        timestamp: Date.now()
    };
}

function formatBytes(bytes: number): string {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// Profiling functions
function profileResultMemory() {
    console.log('\n=== Result Type Memory Profile ===');
    const initialSnapshot = takeMemorySnapshot();
    const iterations = 100000;

    for (let i = 0; i < iterations; i++) {
        const successResult = Result.ok(`value-${i}`);
        const failureResult = Result.fail<string>(Error.domain('TEST_ERROR', `Error ${i}`));

        successResult.match(
            (value: string) => value.length,
            error => error.message.length
        );

        failureResult.match(
            (value: string) => value.length,
            error => error.message.length
        );
    }

    const finalSnapshot = takeMemorySnapshot();
    const memoryGrowth = finalSnapshot.heapUsed - initialSnapshot.heapUsed;

    console.log(`Iterations: ${iterations}`);
    console.log(`Memory growth: ${formatBytes(memoryGrowth)}`);
    console.log(`Per operation: ${(memoryGrowth / iterations).toFixed(0)} bytes`);
}

function profileMaybeMemory() {
    console.log('\n=== Maybe Type Memory Profile ===');
    const initialSnapshot = takeMemorySnapshot();
    const iterations = 100000;

    for (let i = 0; i < iterations; i++) {
        const someValue = Maybe.some(`value-${i}`);
        const noneValue = Maybe.none<string>();
        const nullableValue = Maybe.fromNullable(i % 2 === 0 ? `nullable-${i}` : null);

        someValue.match(value => value.length, () => 0);
        noneValue.match(value => value.length, () => 0);
        nullableValue.match((value: string) => value ? value.length : 0, () => 0);
    }

    const finalSnapshot = takeMemorySnapshot();
    const memoryGrowth = finalSnapshot.heapUsed - initialSnapshot.heapUsed;

    console.log(`Iterations: ${iterations}`);
    console.log(`Memory growth: ${formatBytes(memoryGrowth)}`);
    console.log(`Per operation: ${(memoryGrowth / iterations).toFixed(0)} bytes`);
}

function profileValueObjectMemory() {
    console.log('\n=== ValueObject Memory Profile ===');
    const initialSnapshot = takeMemorySnapshot();
    const iterations = 50000;

    for (let i = 0; i < iterations; i++) {
        const metadata = {
            created: new Date(),
            index: i,
            tags: [`tag-${i}`, `category-${i % 10}`],
            flags: { active: i % 2 === 0, priority: i % 3 }
        };

        const valueObject = new TestValueObject(`id-${i}`, `data-${i}`, metadata);
        valueObject.equals(valueObject);
        valueObject.getHashCode();
    }

    const finalSnapshot = takeMemorySnapshot();
    const memoryGrowth = finalSnapshot.heapUsed - initialSnapshot.heapUsed;

    console.log(`Iterations: ${iterations}`);
    console.log(`Memory growth: ${formatBytes(memoryGrowth)}`);
    console.log(`Per operation: ${(memoryGrowth / iterations).toFixed(0)} bytes`);
}

function profileAggregateMemory() {
    console.log('\n=== AggregateRoot Memory Profile ===');
    const initialSnapshot = takeMemorySnapshot();
    const iterations = 10000;

    for (let i = 0; i < iterations; i++) {
        const aggregate = new TestAggregate(new TestAggregateId(`aggregate-${i}`));

        for (let j = 0; j < 10; j++) {
            aggregate.addData(`data-${i}-${j}`);
        }

        aggregate.events.length;
        aggregate.dataCount;
        aggregate.version;
    }

    const finalSnapshot = takeMemorySnapshot();
    const memoryGrowth = finalSnapshot.heapUsed - initialSnapshot.heapUsed;

    console.log(`Iterations: ${iterations}`);
    console.log(`Memory growth: ${formatBytes(memoryGrowth)}`);
    console.log(`Per operation: ${(memoryGrowth / iterations).toFixed(0)} bytes`);
}

function profileLongRunning() {
    console.log('\n=== Long-Running Memory Profile (10 seconds) ===');
    const snapshots: MemorySnapshot[] = [];
    const duration = 10000;
    const intervalMs = 1000;

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

    setTimeout(() => {
        clearInterval(interval);

        const initialSnapshot = snapshots[0];
        const finalSnapshot = snapshots[snapshots.length - 1];

        if (!initialSnapshot || !finalSnapshot) {
            console.log('Failed to capture snapshots');
            return;
        }

        const memoryGrowth = finalSnapshot.heapUsed - initialSnapshot.heapUsed;

        console.log(`Duration: ${duration}ms`);
        console.log(`Total memory growth: ${formatBytes(memoryGrowth)}`);
        console.log(`Snapshots taken: ${snapshots.length}`);

        // Calculate growth rates
        const growthRates: number[] = [];
        for (let i = 1; i < snapshots.length; i++) {
            const current = snapshots[i];
            const previous = snapshots[i - 1];

            if (!current || !previous) {
                continue;
            }

            const growth = current.heapUsed - previous.heapUsed;
            growthRates.push(growth);
        }

        const averageGrowthRate = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
        const maxGrowthRate = Math.max(...growthRates);
        const minGrowthRate = Math.min(...growthRates);

        console.log(`Average growth rate: ${(averageGrowthRate / 1024).toFixed(2)} KB/interval`);
        console.log(`Max growth rate: ${(maxGrowthRate / 1024).toFixed(2)} KB/interval`);
        console.log(`Min growth rate: ${(minGrowthRate / 1024).toFixed(2)} KB/interval`);

        console.log('\n=== Profiling Complete ===\n');
        console.log('Note: These results are for development analysis only.');
        console.log('Memory usage will vary based on Node.js version, hardware, and system load.');
    }, duration);
}

// Main execution
function main() {
    if (!global.gc) {
        console.error('ERROR: Must run with --expose-gc flag');
        console.error('Usage: node --expose-gc --require ts-node/register benchmarks/memory-profiling.ts');
        process.exit(1);
    }

    console.log('Starting memory profiling...');
    console.log(`Node.js version: ${process.version}`);
    console.log(`Platform: ${process.platform}`);

    profileResultMemory();
    profileMaybeMemory();
    profileValueObjectMemory();
    profileAggregateMemory();
    profileLongRunning();
}

main();
