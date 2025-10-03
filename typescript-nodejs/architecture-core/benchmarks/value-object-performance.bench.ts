/**
 * ValueObject Equality Performance Benchmarks
 * Architecture.Core TypeScript Implementation
 */

import { performance } from 'perf_hooks';
import { ValueObject } from '../src/domain/value-object';

// Test ValueObject implementations
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

// Benchmark utilities
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
        const metadata = new Map([
            ['created', new Date()],
            ['version', i],
            ['flags', { enabled: i % 2 === 0, priority: i % 3 }]
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

function measurePerformance(name: string, fn: () => void, iterations: number = 1000): void {
    // Warm up
    for (let i = 0; i < 100; i++) {
        fn();
    }

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        fn();
    }
    const end = performance.now();

    const totalTime = end - start;
    const avgTime = totalTime / iterations;

    console.log(`${name}:`);
    console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`  Average time per operation: ${avgTime.toFixed(4)}ms`);
    console.log(`  Operations per second: ${(1000 / avgTime).toFixed(0)}`);
    console.log();
}

// Benchmark tests
function benchmarkSimpleEquality(): void {
    console.log('=== Simple ValueObject Equality Benchmarks ===\n');

    const objects1 = createSimpleValueObjects(1000);
    const objects2 = createSimpleValueObjects(1000);

    // Same object equality (reference)
    measurePerformance('Same object equality', () => {
        for (let i = 0; i < objects1.length; i++) {
            objects1[i].equals(objects1[i]);
        }
    });

    // Equal objects equality (structural)
    measurePerformance('Equal objects equality', () => {
        for (let i = 0; i < objects1.length; i++) {
            objects1[i].equals(objects2[i]);
        }
    });

    // Different objects equality
    measurePerformance('Different objects equality', () => {
        for (let i = 0; i < objects1.length - 1; i++) {
            objects1[i].equals(objects1[i + 1]);
        }
    });
}

function benchmarkComplexEquality(): void {
    console.log('=== Complex ValueObject Equality Benchmarks ===\n');

    const objects1 = createComplexValueObjects(500);
    const objects2 = createComplexValueObjects(500);

    // Same object equality
    measurePerformance('Complex same object equality', () => {
        for (let i = 0; i < objects1.length; i++) {
            objects1[i].equals(objects1[i]);
        }
    });

    // Equal objects equality
    measurePerformance('Complex equal objects equality', () => {
        for (let i = 0; i < objects1.length; i++) {
            objects1[i].equals(objects2[i]);
        }
    });

    // Different objects equality
    measurePerformance('Complex different objects equality', () => {
        for (let i = 0; i < objects1.length - 1; i++) {
            objects1[i].equals(objects1[i + 1]);
        }
    });
}

function benchmarkHashCodeGeneration(): void {
    console.log('=== Hash Code Generation Benchmarks ===\n');

    const simpleObjects = createSimpleValueObjects(1000);
    const complexObjects = createComplexValueObjects(500);

    measurePerformance('Simple hash code generation', () => {
        for (const obj of simpleObjects) {
            obj.getHashCode();
        }
    });

    measurePerformance('Complex hash code generation', () => {
        for (const obj of complexObjects) {
            obj.getHashCode();
        }
    });

    // Hash code stability test
    measurePerformance('Hash code stability', () => {
        const obj = simpleObjects[0];
        for (let i = 0; i < 1000; i++) {
            obj.getHashCode();
        }
    });
}

function benchmarkHashCodeCaching(): void {
    console.log('=== Hash Code Caching Performance ===\n');

    const objects = createComplexValueObjects(100);

    // First call (no cache)
    measurePerformance('First hash code call (no cache)', () => {
        // Create new objects to avoid cache
        const freshObjects = createComplexValueObjects(100);
        for (const obj of freshObjects) {
            obj.getHashCode();
        }
    });

    // Subsequent calls (cached)
    measurePerformance('Subsequent hash code calls (cached)', () => {
        for (const obj of objects) {
            obj.getHashCode();
        }
    });
}

function benchmarkCollectionOperations(): void {
    console.log('=== Collection Operations Benchmarks ===\n');

    const objects = createSimpleValueObjects(1000);
    const set = new Set(objects);
    const map = new Map(objects.map((obj, i) => [obj, i]));

    measurePerformance('Set.has() lookup', () => {
        for (const obj of objects) {
            set.has(obj);
        }
    });

    measurePerformance('Map.get() lookup', () => {
        for (const obj of objects) {
            map.get(obj);
        }
    });

    measurePerformance('Array.includes() lookup', () => {
        for (let i = 0; i < 100; i++) {
            objects.includes(objects[i]);
        }
    });
}

function benchmarkMemoryUsage(): void {
    console.log('=== Memory Usage Analysis ===\n');

    const before = process.memoryUsage();

    // Create objects
    const simpleObjects = createSimpleValueObjects(10000);
    const complexObjects = createComplexValueObjects(5000);

    // Force garbage collection if available
    if (global.gc) {
        global.gc();
    }

    const after = process.memoryUsage();

    console.log('Memory usage before object creation:');
    console.log(`  Heap Used: ${(before.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log('Memory usage after object creation:');
    console.log(`  Heap Used: ${(after.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Difference: ${((after.heapUsed - before.heapUsed) / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Per simple object: ${((after.heapUsed - before.heapUsed) / (simpleObjects.length + complexObjects.length)).toFixed(0)} bytes`);
    console.log();
}

// Performance targets and validation
function validatePerformanceTargets(): void {
    console.log('=== Performance Target Validation ===\n');

    const simpleObjects = createSimpleValueObjects(1000);
    const complexObjects = createComplexValueObjects(100);

    // Target: Simple equality < 0.1ms per operation
    const start1 = performance.now();
    for (let i = 0; i < 1000; i++) {
        simpleObjects[0].equals(simpleObjects[1]);
    }
    const end1 = performance.now();
    const simpleEqualityTime = (end1 - start1) / 1000;

    // Target: Complex equality < 1ms per operation
    const start2 = performance.now();
    for (let i = 0; i < 100; i++) {
        complexObjects[0].equals(complexObjects[1]);
    }
    const end2 = performance.now();
    const complexEqualityTime = (end2 - start2) / 100;

    // Target: Hash code generation < 0.05ms per operation
    const start3 = performance.now();
    for (let i = 0; i < 1000; i++) {
        simpleObjects[i % simpleObjects.length].getHashCode();
    }
    const end3 = performance.now();
    const hashCodeTime = (end3 - start3) / 1000;

    console.log('Performance Targets:');
    console.log(`✓ Simple equality: ${simpleEqualityTime.toFixed(4)}ms (target: < 0.1ms)`);
    console.log(`${simpleEqualityTime < 0.1 ? '✓' : '✗'} Target met: ${simpleEqualityTime < 0.1}`);

    console.log(`✓ Complex equality: ${complexEqualityTime.toFixed(4)}ms (target: < 1ms)`);
    console.log(`${complexEqualityTime < 1 ? '✓' : '✗'} Target met: ${complexEqualityTime < 1}`);

    console.log(`✓ Hash code generation: ${hashCodeTime.toFixed(4)}ms (target: < 0.05ms)`);
    console.log(`${hashCodeTime < 0.05 ? '✓' : '✗'} Target met: ${hashCodeTime < 0.05}`);
    console.log();
}

// Main benchmark runner
function runBenchmarks(): void {
    console.log('ValueObject Performance Benchmarks');
    console.log('==================================\n');
    console.log(`Node.js version: ${process.version}`);
    console.log(`Platform: ${process.platform} ${process.arch}`);
    console.log(`Memory: ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB available\n`);

    benchmarkSimpleEquality();
    benchmarkComplexEquality();
    benchmarkHashCodeGeneration();
    benchmarkHashCodeCaching();
    benchmarkCollectionOperations();
    benchmarkMemoryUsage();
    validatePerformanceTargets();

    console.log('Benchmark complete!');
}

// Export for testing
export {
    SimpleValueObject,
    ComplexValueObject,
    NestedValueObject,
    createSimpleValueObjects,
    createComplexValueObjects,
    measurePerformance,
    runBenchmarks
};

// Run benchmarks if called directly
if (require.main === module) {
    runBenchmarks();
}