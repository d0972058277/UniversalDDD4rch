/**
 * AggregateRoot Event Collection Performance Benchmarks
 * Architecture.Core TypeScript Implementation
 */

import { performance } from 'perf_hooks';
import { AggregateRoot } from '../src/domain/aggregate-root';
import { DomainEventBase } from '../src/domain/domain-event-base';

// Test domain events
class TestEvent extends DomainEventBase {
    constructor(
        public readonly aggregateId: string,
        public readonly eventData: string,
        correlationId?: string,
        causationId?: string
    ) {
        super(correlationId, causationId);
    }
}

class LargeEvent extends DomainEventBase {
    constructor(
        public readonly aggregateId: string,
        public readonly payload: Record<string, unknown>,
        correlationId?: string,
        causationId?: string
    ) {
        super(correlationId, causationId);
    }
}

// Test aggregate implementation
class TestAggregate extends AggregateRoot<string> {
    private _counter: number = 0;

    constructor(id: string) {
        super(id);
    }

    get counter(): number {
        return this._counter;
    }

    public incrementCounter(): void {
        this._counter++;
        this.addEvent(new TestEvent(this.id, `Counter incremented to ${this._counter}`));
    }

    public addLargeEvent(data: Record<string, unknown>): void {
        this.addEvent(new LargeEvent(this.id, data));
    }

    public performComplexOperation(iterations: number): void {
        for (let i = 0; i < iterations; i++) {
            this._counter += i;
            if (i % 10 === 0) {
                this.addEvent(new TestEvent(this.id, `Batch operation: ${i}`));
            }
        }
        this.addEvent(new TestEvent(this.id, `Complex operation completed: ${iterations} iterations`));
    }

    public addBulkEvents(count: number): void {
        for (let i = 0; i < count; i++) {
            this.addEvent(new TestEvent(this.id, `Bulk event ${i}`));
        }
    }
}

// Benchmark utilities
function measurePerformance(name: string, fn: () => void, iterations: number = 1000): void {
    // Warm up
    for (let i = 0; i < 10; i++) {
        fn();
    }

    // Force garbage collection if available
    if (global.gc) {
        global.gc();
    }

    const memBefore = process.memoryUsage();
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
        fn();
    }

    const end = performance.now();

    // Force garbage collection if available
    if (global.gc) {
        global.gc();
    }

    const memAfter = process.memoryUsage();

    const totalTime = end - start;
    const avgTime = totalTime / iterations;
    const memDiff = memAfter.heapUsed - memBefore.heapUsed;

    console.log(`${name}:`);
    console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`  Average time per operation: ${avgTime.toFixed(4)}ms`);
    console.log(`  Operations per second: ${(1000 / avgTime).toFixed(0)}`);
    console.log(`  Memory difference: ${(memDiff / 1024).toFixed(2)} KB`);
    console.log(`  Memory per operation: ${(memDiff / iterations).toFixed(2)} bytes`);
    console.log();
}

// Event addition benchmarks
function benchmarkEventAddition(): void {
    console.log('=== Event Addition Benchmarks ===\n');

    // Single event addition
    measurePerformance('Single event addition', () => {
        const aggregate = new TestAggregate('test-id');
        aggregate.incrementCounter();
    });

    // Multiple events on same aggregate
    measurePerformance('Multiple events (10) on same aggregate', () => {
        const aggregate = new TestAggregate('test-id');
        for (let i = 0; i < 10; i++) {
            aggregate.incrementCounter();
        }
    });

    // Bulk event addition
    measurePerformance('Bulk event addition (100)', () => {
        const aggregate = new TestAggregate('test-id');
        aggregate.addBulkEvents(100);
    });

    // Large event addition
    measurePerformance('Large event addition', () => {
        const aggregate = new TestAggregate('test-id');
        const largeData = {
            id: 'large-event',
            timestamp: new Date(),
            data: Array.from({ length: 100 }, (_, i) => ({ index: i, value: `item-${i}` })),
            metadata: {
                source: 'benchmark',
                version: '1.0',
                flags: { processed: false, priority: 'high' }
            }
        };
        aggregate.addLargeEvent(largeData);
    });
}

function benchmarkEventCollectionAccess(): void {
    console.log('=== Event Collection Access Benchmarks ===\n');

    // Create aggregate with various event counts
    const aggregateWith10 = new TestAggregate('test-10');
    aggregateWith10.addBulkEvents(10);

    const aggregateWith100 = new TestAggregate('test-100');
    aggregateWith100.addBulkEvents(100);

    const aggregateWith1000 = new TestAggregate('test-1000');
    aggregateWith1000.addBulkEvents(1000);

    // Event collection access
    measurePerformance('Events collection access (10 events)', () => {
        const events = aggregateWith10.events;
        const count = events.length;
    });

    measurePerformance('Events collection access (100 events)', () => {
        const events = aggregateWith100.events;
        const count = events.length;
    });

    measurePerformance('Events collection access (1000 events)', () => {
        const events = aggregateWith1000.events;
        const count = events.length;
    });

    // Event enumeration
    measurePerformance('Event enumeration (100 events)', () => {
        let count = 0;
        for (const event of aggregateWith100.events) {
            count++;
        }
    });

    measurePerformance('Event filtering (100 events)', () => {
        const filtered = Array.from(aggregateWith100.events).filter(e =>
            e instanceof TestEvent && e.eventData.includes('Bulk')
        );
    });

    // Event serialization (JSON)
    measurePerformance('Event collection serialization (100 events)', () => {
        const events = Array.from(aggregateWith100.events);
        const serialized = JSON.stringify(events);
    });
}

function benchmarkEventClearOperation(): void {
    console.log('=== Event Clear Operation Benchmarks ===\n');

    // Clear small collection
    measurePerformance('Clear events (10 events)', () => {
        const aggregate = new TestAggregate('test-clear-10');
        aggregate.addBulkEvents(10);
        aggregate.clearEvents();
    });

    // Clear medium collection
    measurePerformance('Clear events (100 events)', () => {
        const aggregate = new TestAggregate('test-clear-100');
        aggregate.addBulkEvents(100);
        aggregate.clearEvents();
    });

    // Clear large collection
    measurePerformance('Clear events (1000 events)', () => {
        const aggregate = new TestAggregate('test-clear-1000');
        aggregate.addBulkEvents(1000);
        aggregate.clearEvents();
    });

    // Multiple clear operations
    measurePerformance('Multiple clear operations', () => {
        const aggregate = new TestAggregate('test-multi-clear');
        for (let i = 0; i < 10; i++) {
            aggregate.addBulkEvents(10);
            aggregate.clearEvents();
        }
    });
}

function benchmarkVersionManagement(): void {
    console.log('=== Version Management Benchmarks ===\n');

    // Version access
    measurePerformance('Version property access', () => {
        const aggregate = new TestAggregate('test-version');
        const version = aggregate.version;
    });

    // Operations with version tracking
    measurePerformance('Operations with version tracking', () => {
        const aggregate = new TestAggregate('test-version-ops');
        const initialVersion = aggregate.version;
        aggregate.incrementCounter();
        const newVersion = aggregate.version;
    });

    // Concurrent version checks (simulation)
    measurePerformance('Simulated concurrent version checks', () => {
        const aggregate1 = new TestAggregate('test-concurrent-1');
        const aggregate2 = new TestAggregate('test-concurrent-2');

        const version1 = aggregate1.version;
        const version2 = aggregate2.version;

        aggregate1.incrementCounter();
        aggregate2.incrementCounter();

        const newVersion1 = aggregate1.version;
        const newVersion2 = aggregate2.version;
    });
}

function benchmarkMemoryUsage(): void {
    console.log('=== Memory Usage Analysis ===\n');

    const before = process.memoryUsage();

    // Create multiple aggregates with events
    const aggregates: TestAggregate[] = [];
    for (let i = 0; i < 1000; i++) {
        const aggregate = new TestAggregate(`test-${i}`);
        aggregate.addBulkEvents(10);
        aggregates.push(aggregate);
    }

    // Force garbage collection if available
    if (global.gc) {
        global.gc();
    }

    const after = process.memoryUsage();

    console.log('Memory usage before aggregate creation:');
    console.log(`  Heap Used: ${(before.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log('Memory usage after aggregate creation:');
    console.log(`  Heap Used: ${(after.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Difference: ${((after.heapUsed - before.heapUsed) / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Per aggregate (with 10 events): ${((after.heapUsed - before.heapUsed) / aggregates.length).toFixed(0)} bytes`);
    console.log();

    // Memory usage with many events
    const largeAggregate = new TestAggregate('large-test');
    const beforeLarge = process.memoryUsage();

    largeAggregate.addBulkEvents(10000);

    if (global.gc) {
        global.gc();
    }

    const afterLarge = process.memoryUsage();

    console.log('Memory usage for large event collection (10,000 events):');
    console.log(`  Difference: ${((afterLarge.heapUsed - beforeLarge.heapUsed) / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Per event: ${((afterLarge.heapUsed - beforeLarge.heapUsed) / 10000).toFixed(0)} bytes`);
    console.log();
}

function benchmarkComplexOperations(): void {
    console.log('=== Complex Operations Benchmarks ===\n');

    // Complex business operations
    measurePerformance('Complex operation (50 iterations)', () => {
        const aggregate = new TestAggregate('complex-test');
        aggregate.performComplexOperation(50);
    });

    // Event-heavy workflow
    measurePerformance('Event-heavy workflow', () => {
        const aggregate = new TestAggregate('workflow-test');

        // Simulate a complex business workflow
        for (let i = 0; i < 20; i++) {
            aggregate.incrementCounter();

            if (i % 5 === 0) {
                const data = { step: i, timestamp: Date.now(), details: `Workflow step ${i}` };
                aggregate.addLargeEvent(data);
            }
        }

        aggregate.performComplexOperation(10);
    });

    // Aggregate reconstruction simulation
    measurePerformance('Aggregate reconstruction simulation', () => {
        const aggregate = new TestAggregate('reconstruction-test');

        // Simulate rebuilding aggregate from events
        for (let i = 0; i < 100; i++) {
            aggregate.incrementCounter();
        }

        const events = Array.from(aggregate.events);
        aggregate.clearEvents();

        // Simulate replaying events (simplified)
        for (const event of events) {
            if (event instanceof TestEvent) {
                aggregate.incrementCounter();
            }
        }
    });
}

// Performance targets validation
function validatePerformanceTargets(): void {
    console.log('=== Performance Target Validation ===\n');

    // Target: Event addition < 0.01ms per event
    const aggregate = new TestAggregate('perf-test');
    const start1 = performance.now();
    for (let i = 0; i < 1000; i++) {
        aggregate.incrementCounter();
    }
    const end1 = performance.now();
    const eventAdditionTime = (end1 - start1) / 1000;

    // Target: Event collection access < 0.001ms
    const aggregateWithEvents = new TestAggregate('access-test');
    aggregateWithEvents.addBulkEvents(100);

    const start2 = performance.now();
    for (let i = 0; i < 1000; i++) {
        const events = aggregateWithEvents.events;
        const count = events.length;
    }
    const end2 = performance.now();
    const collectionAccessTime = (end2 - start2) / 1000;

    // Target: Event clear < 1ms for 1000 events
    const start3 = performance.now();
    for (let i = 0; i < 10; i++) {
        const aggregate = new TestAggregate(`clear-test-${i}`);
        aggregate.addBulkEvents(1000);
        aggregate.clearEvents();
    }
    const end3 = performance.now();
    const clearTime = (end3 - start3) / 10;

    console.log('Performance Targets:');
    console.log(`✓ Event addition: ${eventAdditionTime.toFixed(6)}ms (target: < 0.01ms)`);
    console.log(`${eventAdditionTime < 0.01 ? '✓' : '✗'} Target met: ${eventAdditionTime < 0.01}`);

    console.log(`✓ Collection access: ${collectionAccessTime.toFixed(6)}ms (target: < 0.001ms)`);
    console.log(`${collectionAccessTime < 0.001 ? '✓' : '✗'} Target met: ${collectionAccessTime < 0.001}`);

    console.log(`✓ Event clear (1000 events): ${clearTime.toFixed(4)}ms (target: < 1ms)`);
    console.log(`${clearTime < 1 ? '✓' : '✗'} Target met: ${clearTime < 1}`);
    console.log();
}

// Main benchmark runner
function runBenchmarks(): void {
    console.log('AggregateRoot Event Collection Performance Benchmarks');
    console.log('===================================================\n');
    console.log(`Node.js version: ${process.version}`);
    console.log(`Platform: ${process.platform} ${process.arch}`);
    console.log(`Memory: ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB available\n`);

    benchmarkEventAddition();
    benchmarkEventCollectionAccess();
    benchmarkEventClearOperation();
    benchmarkVersionManagement();
    benchmarkMemoryUsage();
    benchmarkComplexOperations();
    validatePerformanceTargets();

    console.log('Benchmark complete!');
}

// Export for testing
export {
    TestEvent,
    LargeEvent,
    TestAggregate,
    measurePerformance,
    runBenchmarks
};

// Run benchmarks if called directly
if (require.main === module) {
    runBenchmarks();
}