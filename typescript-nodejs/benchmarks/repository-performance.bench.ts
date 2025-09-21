/**
 * Repository Async Operations Performance Benchmarks
 * Architecture.Core TypeScript Implementation
 */

import { performance } from 'perf_hooks';
import { Result } from '../src/functional/result';
import { Maybe } from '../src/functional/maybe';
import { Error } from '../src/functional/error';
import { IRepository } from '../src/domain/interfaces/i-repository';
import { AggregateRoot } from '../src/domain/aggregate-root';
import { DomainEventBase } from '../src/domain/domain-event-base';

// Test domain models
class TestId {
    constructor(public readonly value: string) {}

    toString(): string {
        return this.value;
    }
}

class TestEvent extends DomainEventBase {
    constructor(
        public readonly aggregateId: string,
        public readonly action: string
    ) {
        super();
    }
}

class TestAggregate extends AggregateRoot<TestId> {
    private _data: string;
    private _lastModified: Date;

    constructor(id: TestId, data: string = 'initial') {
        super(id);
        this._data = data;
        this._lastModified = new Date();
        this.addEvent(new TestEvent(id.value, 'created'));
    }

    get data(): string {
        return this._data;
    }

    get lastModified(): Date {
        return this._lastModified;
    }

    public updateData(newData: string): void {
        this._data = newData;
        this._lastModified = new Date();
        this.addEvent(new TestEvent(this.id.value, 'updated'));
    }
}

// Mock repository implementations for performance testing
class InMemoryRepository implements IRepository<TestAggregate, TestId> {
    private readonly _storage = new Map<string, TestAggregate>();
    private readonly _delayMs: number;

    constructor(delayMs: number = 0) {
        this._delayMs = delayMs;
    }

    private async delay(): Promise<void> {
        if (this._delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, this._delayMs));
        }
    }

    async getByIdAsync(id: TestId, cancellationToken?: AbortSignal): Promise<Maybe<TestAggregate>> {
        await this.delay();

        if (cancellationToken?.aborted) {
            throw new Error('Operation was cancelled');
        }

        const aggregate = this._storage.get(id.value);
        return aggregate ? Maybe.some(aggregate) : Maybe.none<TestAggregate>();
    }

    async addAsync(aggregate: TestAggregate, cancellationToken?: AbortSignal): Promise<Result> {
        await this.delay();

        if (cancellationToken?.aborted) {
            return Result.fail(Error.infrastructure('CANCELLED', 'Operation was cancelled'));
        }

        if (this._storage.has(aggregate.id.value)) {
            return Result.fail(Error.domain('DUPLICATE_ID', 'Aggregate with this ID already exists'));
        }

        this._storage.set(aggregate.id.value, aggregate);
        return Result.ok();
    }

    async updateAsync(aggregate: TestAggregate, cancellationToken?: AbortSignal): Promise<Result> {
        await this.delay();

        if (cancellationToken?.aborted) {
            return Result.fail(Error.infrastructure('CANCELLED', 'Operation was cancelled'));
        }

        if (!this._storage.has(aggregate.id.value)) {
            return Result.fail(Error.domain('NOT_FOUND', 'Aggregate not found'));
        }

        this._storage.set(aggregate.id.value, aggregate);
        return Result.ok();
    }

    async deleteAsync(id: TestId, cancellationToken?: AbortSignal): Promise<Result> {
        await this.delay();

        if (cancellationToken?.aborted) {
            return Result.fail(Error.infrastructure('CANCELLED', 'Operation was cancelled'));
        }

        if (!this._storage.has(id.value)) {
            return Result.fail(Error.domain('NOT_FOUND', 'Aggregate not found'));
        }

        this._storage.delete(id.value);
        return Result.ok();
    }

    async existsAsync(id: TestId, cancellationToken?: AbortSignal): Promise<Result<boolean>> {
        await this.delay();

        if (cancellationToken?.aborted) {
            return Result.fail(Error.infrastructure('CANCELLED', 'Operation was cancelled'));
        }

        return Result.ok(this._storage.has(id.value));
    }

    // Additional methods for testing
    get size(): number {
        return this._storage.size;
    }

    clear(): void {
        this._storage.clear();
    }

    getAllAsync(): Promise<TestAggregate[]> {
        return Promise.resolve(Array.from(this._storage.values()));
    }
}

// Benchmark utilities
function measureAsyncPerformance(
    name: string,
    fn: () => Promise<void>,
    iterations: number = 100
): Promise<void> {
    return new Promise(async (resolve) => {
        // Warm up
        for (let i = 0; i < 10; i++) {
            await fn();
        }

        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }

        const memBefore = process.memoryUsage();
        const start = performance.now();

        for (let i = 0; i < iterations; i++) {
            await fn();
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

        resolve();
    });
}

// Repository operation benchmarks
async function benchmarkBasicOperations(): Promise<void> {
    console.log('=== Basic Repository Operations ===\n');

    const repository = new InMemoryRepository(0);

    // Add operation
    await measureAsyncPerformance('Add operation', async () => {
        const id = new TestId(`test-${Math.random()}`);
        const aggregate = new TestAggregate(id, 'test data');
        await repository.addAsync(aggregate);
        repository.clear(); // Clean up for next iteration
    });

    // Get operation (not found)
    await measureAsyncPerformance('Get operation (not found)', async () => {
        const id = new TestId(`nonexistent-${Math.random()}`);
        await repository.getByIdAsync(id);
    });

    // Setup data for found operations
    const testAggregates: TestAggregate[] = [];
    for (let i = 0; i < 1000; i++) {
        const id = new TestId(`existing-${i}`);
        const aggregate = new TestAggregate(id, `data-${i}`);
        testAggregates.push(aggregate);
        await repository.addAsync(aggregate);
    }

    // Get operation (found)
    await measureAsyncPerformance('Get operation (found)', async () => {
        const randomIndex = Math.floor(Math.random() * testAggregates.length);
        const id = testAggregates[randomIndex].id;
        await repository.getByIdAsync(id);
    });

    // Update operation
    await measureAsyncPerformance('Update operation', async () => {
        const randomIndex = Math.floor(Math.random() * testAggregates.length);
        const aggregate = testAggregates[randomIndex];
        aggregate.updateData(`updated-${Date.now()}`);
        await repository.updateAsync(aggregate);
    });

    // Exists operation (found)
    await measureAsyncPerformance('Exists operation (found)', async () => {
        const randomIndex = Math.floor(Math.random() * testAggregates.length);
        const id = testAggregates[randomIndex].id;
        await repository.existsAsync(id);
    });

    // Exists operation (not found)
    await measureAsyncPerformance('Exists operation (not found)', async () => {
        const id = new TestId(`nonexistent-${Math.random()}`);
        await repository.existsAsync(id);
    });

    // Delete operation
    const aggregatesToDelete = testAggregates.slice(0, 100);
    let deleteIndex = 0;
    await measureAsyncPerformance('Delete operation', async () => {
        if (deleteIndex < aggregatesToDelete.length) {
            await repository.deleteAsync(aggregatesToDelete[deleteIndex].id);
            deleteIndex++;
        }
    }, 100);
}

async function benchmarkConcurrentOperations(): Promise<void> {
    console.log('=== Concurrent Repository Operations ===\n');

    const repository = new InMemoryRepository(1); // 1ms delay to simulate I/O

    // Concurrent reads
    await measureAsyncPerformance('Concurrent reads (10 parallel)', async () => {
        const promises: Promise<Maybe<TestAggregate>>[] = [];
        for (let i = 0; i < 10; i++) {
            const id = new TestId(`concurrent-read-${i}`);
            promises.push(repository.getByIdAsync(id));
        }
        await Promise.all(promises);
    }, 10);

    // Concurrent writes
    await measureAsyncPerformance('Concurrent writes (10 parallel)', async () => {
        const promises: Promise<Result>[] = [];
        for (let i = 0; i < 10; i++) {
            const id = new TestId(`concurrent-write-${Math.random()}`);
            const aggregate = new TestAggregate(id, `concurrent-data-${i}`);
            promises.push(repository.addAsync(aggregate));
        }
        await Promise.all(promises);
        repository.clear(); // Clean up
    }, 10);

    // Mixed operations
    await measureAsyncPerformance('Mixed concurrent operations (read/write/exists)', async () => {
        const promises: Promise<any>[] = [];

        // Add some reads
        for (let i = 0; i < 3; i++) {
            const id = new TestId(`mixed-read-${i}`);
            promises.push(repository.getByIdAsync(id));
        }

        // Add some writes
        for (let i = 0; i < 3; i++) {
            const id = new TestId(`mixed-write-${Math.random()}`);
            const aggregate = new TestAggregate(id, `mixed-data-${i}`);
            promises.push(repository.addAsync(aggregate));
        }

        // Add some exists checks
        for (let i = 0; i < 4; i++) {
            const id = new TestId(`mixed-exists-${i}`);
            promises.push(repository.existsAsync(id));
        }

        await Promise.all(promises);
        repository.clear(); // Clean up
    }, 10);
}

async function benchmarkCancellationHandling(): Promise<void> {
    console.log('=== Cancellation Handling Benchmarks ===\n');

    const repository = new InMemoryRepository(50); // Longer delay for cancellation testing

    // Normal operation (no cancellation)
    await measureAsyncPerformance('Normal operation (no cancellation)', async () => {
        const id = new TestId(`normal-${Math.random()}`);
        const aggregate = new TestAggregate(id, 'normal data');
        await repository.addAsync(aggregate);
        repository.clear();
    }, 20);

    // Immediate cancellation
    await measureAsyncPerformance('Immediate cancellation', async () => {
        const controller = new AbortController();
        controller.abort(); // Cancel immediately

        const id = new TestId(`cancelled-${Math.random()}`);
        const aggregate = new TestAggregate(id, 'cancelled data');

        try {
            const result = await repository.addAsync(aggregate, controller.signal);
            // Should return error result due to cancellation
        } catch (error) {
            // Expected for cancelled operations
        }
    }, 50);

    // Delayed cancellation
    await measureAsyncPerformance('Delayed cancellation (25ms)', async () => {
        const controller = new AbortController();

        setTimeout(() => controller.abort(), 25); // Cancel after 25ms

        const id = new TestId(`delayed-cancel-${Math.random()}`);
        const aggregate = new TestAggregate(id, 'delayed cancel data');

        try {
            const result = await repository.addAsync(aggregate, controller.signal);
        } catch (error) {
            // Expected for cancelled operations
        }
    }, 20);
}

async function benchmarkBulkOperations(): Promise<void> {
    console.log('=== Bulk Operations Benchmarks ===\n');

    const repository = new InMemoryRepository(0);

    // Bulk add operations
    await measureAsyncPerformance('Bulk add (100 items)', async () => {
        const promises: Promise<Result>[] = [];
        for (let i = 0; i < 100; i++) {
            const id = new TestId(`bulk-add-${Math.random()}`);
            const aggregate = new TestAggregate(id, `bulk-data-${i}`);
            promises.push(repository.addAsync(aggregate));
        }
        await Promise.all(promises);
        repository.clear();
    }, 10);

    // Setup data for bulk operations
    const bulkTestData: TestAggregate[] = [];
    for (let i = 0; i < 1000; i++) {
        const id = new TestId(`bulk-test-${i}`);
        const aggregate = new TestAggregate(id, `bulk-test-data-${i}`);
        bulkTestData.push(aggregate);
        await repository.addAsync(aggregate);
    }

    // Bulk read operations
    await measureAsyncPerformance('Bulk read (100 items)', async () => {
        const promises: Promise<Maybe<TestAggregate>>[] = [];
        for (let i = 0; i < 100; i++) {
            const randomIndex = Math.floor(Math.random() * bulkTestData.length);
            const id = bulkTestData[randomIndex].id;
            promises.push(repository.getByIdAsync(id));
        }
        await Promise.all(promises);
    }, 10);

    // Bulk update operations
    await measureAsyncPerformance('Bulk update (100 items)', async () => {
        const promises: Promise<Result>[] = [];
        for (let i = 0; i < 100; i++) {
            const randomIndex = Math.floor(Math.random() * bulkTestData.length);
            const aggregate = bulkTestData[randomIndex];
            aggregate.updateData(`bulk-updated-${Date.now()}-${i}`);
            promises.push(repository.updateAsync(aggregate));
        }
        await Promise.all(promises);
    }, 10);

    // Bulk exists operations
    await measureAsyncPerformance('Bulk exists check (100 items)', async () => {
        const promises: Promise<Result<boolean>>[] = [];
        for (let i = 0; i < 100; i++) {
            const randomIndex = Math.floor(Math.random() * bulkTestData.length);
            const id = bulkTestData[randomIndex].id;
            promises.push(repository.existsAsync(id));
        }
        await Promise.all(promises);
    }, 10);
}

async function benchmarkErrorHandling(): Promise<void> {
    console.log('=== Error Handling Benchmarks ===\n');

    const repository = new InMemoryRepository(0);

    // Duplicate key errors
    const duplicateId = new TestId('duplicate-test');
    const duplicateAggregate = new TestAggregate(duplicateId, 'duplicate data');
    await repository.addAsync(duplicateAggregate);

    await measureAsyncPerformance('Duplicate key error handling', async () => {
        const aggregate = new TestAggregate(duplicateId, 'another duplicate');
        const result = await repository.addAsync(aggregate);
        // Should return error result
    });

    // Not found errors
    await measureAsyncPerformance('Not found error handling (update)', async () => {
        const id = new TestId(`not-found-${Math.random()}`);
        const aggregate = new TestAggregate(id, 'not found data');
        const result = await repository.updateAsync(aggregate);
        // Should return error result
    });

    await measureAsyncPerformance('Not found error handling (delete)', async () => {
        const id = new TestId(`not-found-delete-${Math.random()}`);
        const result = await repository.deleteAsync(id);
        // Should return error result
    });
}

async function benchmarkMemoryUsage(): Promise<void> {
    console.log('=== Memory Usage Analysis ===\n');

    const repository = new InMemoryRepository(0);

    const before = process.memoryUsage();

    // Create and store many aggregates
    const aggregates: TestAggregate[] = [];
    for (let i = 0; i < 10000; i++) {
        const id = new TestId(`memory-test-${i}`);
        const aggregate = new TestAggregate(id, `memory-test-data-${i}`);
        aggregates.push(aggregate);
        await repository.addAsync(aggregate);
    }

    // Force garbage collection if available
    if (global.gc) {
        global.gc();
    }

    const after = process.memoryUsage();

    console.log('Memory usage before repository operations:');
    console.log(`  Heap Used: ${(before.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log('Memory usage after 10,000 repository operations:');
    console.log(`  Heap Used: ${(after.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Difference: ${((after.heapUsed - before.heapUsed) / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Per operation: ${((after.heapUsed - before.heapUsed) / 10000).toFixed(0)} bytes`);
    console.log(`  Repository size: ${repository.size} items`);
    console.log();
}

// Performance targets validation
async function validatePerformanceTargets(): Promise<void> {
    console.log('=== Performance Target Validation ===\n');

    const repository = new InMemoryRepository(0);

    // Setup test data
    const testData: TestAggregate[] = [];
    for (let i = 0; i < 100; i++) {
        const id = new TestId(`perf-test-${i}`);
        const aggregate = new TestAggregate(id, `perf-data-${i}`);
        testData.push(aggregate);
        await repository.addAsync(aggregate);
    }

    // Target: Repository operations < 1ms each (in-memory)
    const start1 = performance.now();
    for (let i = 0; i < 100; i++) {
        await repository.getByIdAsync(testData[i].id);
    }
    const end1 = performance.now();
    const getOperationTime = (end1 - start1) / 100;

    // Target: Bulk operations scale linearly
    const start2 = performance.now();
    const promises: Promise<Maybe<TestAggregate>>[] = [];
    for (let i = 0; i < 100; i++) {
        promises.push(repository.getByIdAsync(testData[i].id));
    }
    await Promise.all(promises);
    const end2 = performance.now();
    const bulkOperationTime = end2 - start2;

    // Target: Error handling doesn't significantly impact performance
    const start3 = performance.now();
    for (let i = 0; i < 100; i++) {
        const id = new TestId(`error-test-${i}`);
        await repository.getByIdAsync(id); // Will return None
    }
    const end3 = performance.now();
    const errorHandlingTime = (end3 - start3) / 100;

    console.log('Performance Targets:');
    console.log(`✓ Single get operation: ${getOperationTime.toFixed(4)}ms (target: < 1ms)`);
    console.log(`${getOperationTime < 1 ? '✓' : '✗'} Target met: ${getOperationTime < 1}`);

    console.log(`✓ Bulk operations (100 parallel): ${bulkOperationTime.toFixed(4)}ms (target: < 100ms)`);
    console.log(`${bulkOperationTime < 100 ? '✓' : '✗'} Target met: ${bulkOperationTime < 100}`);

    console.log(`✓ Error handling overhead: ${errorHandlingTime.toFixed(4)}ms (target: < 2ms)`);
    console.log(`${errorHandlingTime < 2 ? '✓' : '✗'} Target met: ${errorHandlingTime < 2}`);
    console.log();
}

// Main benchmark runner
async function runBenchmarks(): Promise<void> {
    console.log('Repository Async Operations Performance Benchmarks');
    console.log('================================================\n');
    console.log(`Node.js version: ${process.version}`);
    console.log(`Platform: ${process.platform} ${process.arch}`);
    console.log(`Memory: ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB available\n`);

    await benchmarkBasicOperations();
    await benchmarkConcurrentOperations();
    await benchmarkCancellationHandling();
    await benchmarkBulkOperations();
    await benchmarkErrorHandling();
    await benchmarkMemoryUsage();
    await validatePerformanceTargets();

    console.log('Benchmark complete!');
}

// Export for testing
export {
    TestId,
    TestEvent,
    TestAggregate,
    InMemoryRepository,
    measureAsyncPerformance,
    runBenchmarks
};

// Run benchmarks if called directly
if (require.main === module) {
    runBenchmarks();
}