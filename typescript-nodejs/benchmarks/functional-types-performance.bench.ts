/**
 * Result/Maybe Memory Allocation Performance Benchmarks
 * Architecture.Core TypeScript Implementation
 */

import { performance } from 'perf_hooks';
import { Result } from '../src/functional/result';
import { Maybe } from '../src/functional/maybe';
import { Error, ErrorCategory } from '../src/functional/error';

// Test data types
interface TestData {
    id: string;
    value: number;
    metadata: Record<string, unknown>;
}

function createTestData(id: string, value: number): TestData {
    return {
        id,
        value,
        metadata: {
            created: new Date(),
            tags: [`tag${value}`, `category${value % 10}`],
            flags: { enabled: value % 2 === 0, priority: value % 3 }
        }
    };
}

// Benchmark utilities
function measurePerformance(name: string, fn: () => void, iterations: number = 10000): void {
    // Warm up
    for (let i = 0; i < 100; i++) {
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
    console.log(`  Average time per operation: ${avgTime.toFixed(6)}ms`);
    console.log(`  Operations per second: ${(1000 / avgTime).toFixed(0)}`);
    console.log(`  Memory difference: ${(memDiff / 1024).toFixed(2)} KB`);
    console.log(`  Memory per operation: ${(memDiff / iterations).toFixed(2)} bytes`);
    console.log();
}

// Result benchmarks
function benchmarkResultCreation(): void {
    console.log('=== Result Creation Benchmarks ===\n');

    const testData = createTestData('test', 42);
    const error = Error.domain('TEST_ERROR', 'Test error message');

    measurePerformance('Result.ok() creation', () => {
        Result.ok();
    });

    measurePerformance('Result.ok(value) creation', () => {
        Result.ok(testData);
    });

    measurePerformance('Result.fail() creation', () => {
        Result.fail(error);
    });

    measurePerformance('Result<T>.ok() creation', () => {
        Result.ok(testData);
    });

    measurePerformance('Result<T>.fail() creation', () => {
        Result.fail<TestData>(error);
    });
}

function benchmarkResultOperations(): void {
    console.log('=== Result Operations Benchmarks ===\n');

    const successResult = Result.ok(createTestData('success', 100));
    const failureResult = Result.fail<TestData>(Error.domain('FAILURE', 'Operation failed'));

    measurePerformance('Result.map() on success', () => {
        successResult.map(data => data.value * 2);
    });

    measurePerformance('Result.map() on failure', () => {
        failureResult.map(data => data.value * 2);
    });

    measurePerformance('Result.bind() on success', () => {
        successResult.bind(data =>
            data.value > 50
                ? Result.ok(data.value.toString())
                : Result.fail(Error.validation('INVALID_VALUE', 'Value too small'))
        );
    });

    measurePerformance('Result.bind() on failure', () => {
        failureResult.bind(data => Result.ok(data.value.toString()));
    });

    measurePerformance('Result.match() on success', () => {
        successResult.match(
            data => `Success: ${data.value}`,
            error => `Error: ${error.message}`
        );
    });

    measurePerformance('Result.match() on failure', () => {
        failureResult.match(
            data => `Success: ${data.value}`,
            error => `Error: ${error.message}`
        );
    });
}

function benchmarkResultChaining(): void {
    console.log('=== Result Chaining Benchmarks ===\n');

    const initialResult = Result.ok(10);

    // Simple chain
    measurePerformance('Simple Result chain', () => {
        initialResult
            .map(x => x * 2)
            .map(x => x + 1)
            .map(x => x.toString());
    });

    // Complex chain with bind
    measurePerformance('Complex Result chain with bind', () => {
        initialResult
            .bind(x => x > 0 ? Result.ok(x * 2) : Result.fail(Error.validation('NEGATIVE', 'Negative value')))
            .map(x => x + 10)
            .bind(x => x < 100 ? Result.ok(x.toString()) : Result.fail(Error.validation('TOO_LARGE', 'Value too large')))
            .map(s => s.length);
    });

    // Long chain
    measurePerformance('Long Result chain (10 operations)', () => {
        let result = initialResult;
        for (let i = 0; i < 10; i++) {
            result = result.map(x => x + 1);
        }
        return result;
    });
}

// Maybe benchmarks
function benchmarkMaybeCreation(): void {
    console.log('=== Maybe Creation Benchmarks ===\n');

    const testData = createTestData('test', 42);

    measurePerformance('Maybe.some() creation', () => {
        Maybe.some(testData);
    });

    measurePerformance('Maybe.none() creation', () => {
        Maybe.none<TestData>();
    });

    measurePerformance('Maybe.fromNullable() with value', () => {
        Maybe.fromNullable(testData);
    });

    measurePerformance('Maybe.fromNullable() with null', () => {
        Maybe.fromNullable(null);
    });
}

function benchmarkMaybeOperations(): void {
    console.log('=== Maybe Operations Benchmarks ===\n');

    const someValue = Maybe.some(createTestData('some', 100));
    const noneValue = Maybe.none<TestData>();

    measurePerformance('Maybe.map() on some', () => {
        someValue.map(data => data.value * 2);
    });

    measurePerformance('Maybe.map() on none', () => {
        noneValue.map(data => data.value * 2);
    });

    measurePerformance('Maybe.bind() on some', () => {
        someValue.bind(data =>
            data.value > 50
                ? Maybe.some(data.value.toString())
                : Maybe.none<string>()
        );
    });

    measurePerformance('Maybe.bind() on none', () => {
        noneValue.bind(data => Maybe.some(data.value.toString()));
    });

    measurePerformance('Maybe.orElse() on some', () => {
        someValue.orElse(createTestData('default', 0));
    });

    measurePerformance('Maybe.orElse() on none', () => {
        noneValue.orElse(createTestData('default', 0));
    });

    measurePerformance('Maybe.match() on some', () => {
        someValue.match(
            data => `Some: ${data.value}`,
            () => 'None'
        );
    });

    measurePerformance('Maybe.match() on none', () => {
        noneValue.match(
            data => `Some: ${data.value}`,
            () => 'None'
        );
    });
}

function benchmarkMaybeChaining(): void {
    console.log('=== Maybe Chaining Benchmarks ===\n');

    const initialMaybe = Maybe.some(10);

    // Simple chain
    measurePerformance('Simple Maybe chain', () => {
        initialMaybe
            .map(x => x * 2)
            .map(x => x + 1)
            .map(x => x.toString());
    });

    // Complex chain with bind
    measurePerformance('Complex Maybe chain with bind', () => {
        initialMaybe
            .bind(x => x > 0 ? Maybe.some(x * 2) : Maybe.none<number>())
            .map(x => x + 10)
            .bind(x => x < 100 ? Maybe.some(x.toString()) : Maybe.none<string>())
            .map(s => s.length);
    });

    // Long chain
    measurePerformance('Long Maybe chain (10 operations)', () => {
        let result = initialMaybe;
        for (let i = 0; i < 10; i++) {
            result = result.map(x => x + 1);
        }
        return result;
    });
}

// Error creation benchmarks
function benchmarkErrorCreation(): void {
    console.log('=== Error Creation Benchmarks ===\n');

    const metadata = { field: 'test', value: 42 };

    measurePerformance('Error.domain() creation', () => {
        Error.domain('DOMAIN_ERROR', 'Domain error message');
    });

    measurePerformance('Error.validation() creation', () => {
        Error.validation('VALIDATION_ERROR', 'Validation error message');
    });

    measurePerformance('Error.infrastructure() creation', () => {
        Error.infrastructure('INFRA_ERROR', 'Infrastructure error message');
    });

    measurePerformance('Error with metadata creation', () => {
        Error.domain('DOMAIN_ERROR', 'Domain error message', metadata);
    });
}

// Comparative benchmarks
function benchmarkComparativePerformance(): void {
    console.log('=== Comparative Performance ===\n');

    const value = createTestData('test', 42);

    // Direct value access vs Maybe
    measurePerformance('Direct value access', () => {
        const result = value.value * 2;
    });

    measurePerformance('Maybe value access', () => {
        const maybe = Maybe.some(value);
        const result = maybe.map(v => v.value * 2);
    });

    // Exception handling vs Result
    measurePerformance('Exception handling (try/catch)', () => {
        try {
            if (value.value < 0) {
                throw new Error('Negative value');
            }
            const result = value.value * 2;
        } catch (error) {
            const errorMsg = 'Error occurred';
        }
    });

    measurePerformance('Result error handling', () => {
        const result = value.value < 0
            ? Result.fail<number>(Error.validation('NEGATIVE', 'Negative value'))
            : Result.ok(value.value * 2);
    });
}

// Memory pressure tests
function benchmarkMemoryPressure(): void {
    console.log('=== Memory Pressure Tests ===\n');

    const iterations = 100000;

    // Result allocations
    measurePerformance('Mass Result creation (100k)', () => {
        const results: Result<number>[] = [];
        for (let i = 0; i < iterations / 10000; i++) {
            results.push(Result.ok(i));
        }
    }, 10000);

    // Maybe allocations
    measurePerformance('Mass Maybe creation (100k)', () => {
        const maybes: Maybe<number>[] = [];
        for (let i = 0; i < iterations / 10000; i++) {
            maybes.push(Maybe.some(i));
        }
    }, 10000);

    // Error allocations
    measurePerformance('Mass Error creation (100k)', () => {
        const errors: Error[] = [];
        for (let i = 0; i < iterations / 10000; i++) {
            errors.push(Error.domain(`ERROR_${i}`, `Error message ${i}`));
        }
    }, 10000);
}

// Performance targets validation
function validatePerformanceTargets(): void {
    console.log('=== Performance Target Validation ===\n');

    const testData = createTestData('test', 42);

    // Target: Result creation < 0.001ms
    const start1 = performance.now();
    for (let i = 0; i < 10000; i++) {
        Result.ok(testData);
    }
    const end1 = performance.now();
    const resultCreationTime = (end1 - start1) / 10000;

    // Target: Maybe creation < 0.001ms
    const start2 = performance.now();
    for (let i = 0; i < 10000; i++) {
        Maybe.some(testData);
    }
    const end2 = performance.now();
    const maybeCreationTime = (end2 - start2) / 10000;

    // Target: Monadic operations < 0.01ms
    const result = Result.ok(10);
    const start3 = performance.now();
    for (let i = 0; i < 1000; i++) {
        result.map(x => x * 2).bind(x => Result.ok(x + 1));
    }
    const end3 = performance.now();
    const monadicOperationTime = (end3 - start3) / 1000;

    console.log('Performance Targets:');
    console.log(`✓ Result creation: ${resultCreationTime.toFixed(6)}ms (target: < 0.001ms)`);
    console.log(`${resultCreationTime < 0.001 ? '✓' : '✗'} Target met: ${resultCreationTime < 0.001}`);

    console.log(`✓ Maybe creation: ${maybeCreationTime.toFixed(6)}ms (target: < 0.001ms)`);
    console.log(`${maybeCreationTime < 0.001 ? '✓' : '✗'} Target met: ${maybeCreationTime < 0.001}`);

    console.log(`✓ Monadic operations: ${monadicOperationTime.toFixed(6)}ms (target: < 0.01ms)`);
    console.log(`${monadicOperationTime < 0.01 ? '✓' : '✗'} Target met: ${monadicOperationTime < 0.01}`);
    console.log();
}

// Main benchmark runner
function runBenchmarks(): void {
    console.log('Functional Types Performance Benchmarks');
    console.log('=======================================\n');
    console.log(`Node.js version: ${process.version}`);
    console.log(`Platform: ${process.platform} ${process.arch}`);
    console.log(`Memory: ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB available\n`);

    benchmarkResultCreation();
    benchmarkResultOperations();
    benchmarkResultChaining();
    benchmarkMaybeCreation();
    benchmarkMaybeOperations();
    benchmarkMaybeChaining();
    benchmarkErrorCreation();
    benchmarkComparativePerformance();
    benchmarkMemoryPressure();
    validatePerformanceTargets();

    console.log('Benchmark complete!');
}

// Export for testing
export {
    createTestData,
    measurePerformance,
    runBenchmarks
};

// Run benchmarks if called directly
if (require.main === module) {
    runBenchmarks();
}