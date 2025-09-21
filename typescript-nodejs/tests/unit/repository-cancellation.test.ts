/**
 * Repository Cancellation Handling Unit Tests
 * Architecture.Core TypeScript Implementation
 */

import { Result } from '../../src/functional/result';
import { Maybe } from '../../src/functional/maybe';
import { Error } from '../../src/functional/error';
import { IRepository } from '../../src/domain/interfaces/i-repository';
import { AggregateRoot } from '../../src/domain/aggregate-root';
import { DomainEventBase } from '../../src/domain/domain-event-base';

// Test domain models
class TestId {
    constructor(public readonly value: string) {}

    toString(): string {
        return this.value;
    }

    equals(other: TestId): boolean {
        return this.value === other.value;
    }
}

class TestCreatedEvent extends DomainEventBase {
    constructor(public readonly aggregateId: string) {
        super();
    }
}

class TestAggregate extends AggregateRoot<TestId> {
    private _data: string;

    constructor(id: TestId, data: string = 'default') {
        super(id);
        this._data = data;
        this.addEvent(new TestCreatedEvent(id.value));
    }

    get data(): string {
        return this._data;
    }

    updateData(newData: string): void {
        this._data = newData;
    }
}

// Mock repository with cancellation support
class MockRepository implements IRepository<TestAggregate, TestId> {
    private readonly storage = new Map<string, TestAggregate>();
    private readonly delayMs: number;
    private readonly shouldThrowOnCancel: boolean;

    constructor(delayMs: number = 100, shouldThrowOnCancel: boolean = false) {
        this.delayMs = delayMs;
        this.shouldThrowOnCancel = shouldThrowOnCancel;
    }

    private async delay(cancellationToken?: AbortSignal): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (cancellationToken?.aborted) {
                if (this.shouldThrowOnCancel) {
                    reject(new Error('Operation was cancelled'));
                } else {
                    resolve();
                }
                return;
            }

            const timeoutId = setTimeout(() => {
                resolve();
            }, this.delayMs);

            if (cancellationToken) {
                const abortHandler = () => {
                    clearTimeout(timeoutId);
                    if (this.shouldThrowOnCancel) {
                        reject(new Error('Operation was cancelled'));
                    } else {
                        resolve();
                    }
                };

                cancellationToken.addEventListener('abort', abortHandler, { once: true });
            }
        });
    }

    async getByIdAsync(id: TestId, cancellationToken?: AbortSignal): Promise<Maybe<TestAggregate>> {
        await this.delay(cancellationToken);

        if (cancellationToken?.aborted) {
            return Maybe.none<TestAggregate>();
        }

        const aggregate = this.storage.get(id.value);
        return aggregate ? Maybe.some(aggregate) : Maybe.none<TestAggregate>();
    }

    async addAsync(aggregate: TestAggregate, cancellationToken?: AbortSignal): Promise<Result> {
        await this.delay(cancellationToken);

        if (cancellationToken?.aborted) {
            return Result.fail(Error.infrastructure('CANCELLED', 'Add operation was cancelled'));
        }

        if (this.storage.has(aggregate.id.value)) {
            return Result.fail(Error.domain('DUPLICATE_ID', 'Aggregate already exists'));
        }

        this.storage.set(aggregate.id.value, aggregate);
        return Result.ok();
    }

    async updateAsync(aggregate: TestAggregate, cancellationToken?: AbortSignal): Promise<Result> {
        await this.delay(cancellationToken);

        if (cancellationToken?.aborted) {
            return Result.fail(Error.infrastructure('CANCELLED', 'Update operation was cancelled'));
        }

        if (!this.storage.has(aggregate.id.value)) {
            return Result.fail(Error.domain('NOT_FOUND', 'Aggregate not found'));
        }

        this.storage.set(aggregate.id.value, aggregate);
        return Result.ok();
    }

    async deleteAsync(id: TestId, cancellationToken?: AbortSignal): Promise<Result> {
        await this.delay(cancellationToken);

        if (cancellationToken?.aborted) {
            return Result.fail(Error.infrastructure('CANCELLED', 'Delete operation was cancelled'));
        }

        if (!this.storage.has(id.value)) {
            return Result.fail(Error.domain('NOT_FOUND', 'Aggregate not found'));
        }

        this.storage.delete(id.value);
        return Result.ok();
    }

    async existsAsync(id: TestId, cancellationToken?: AbortSignal): Promise<Result<boolean>> {
        await this.delay(cancellationToken);

        if (cancellationToken?.aborted) {
            return Result.fail(Error.infrastructure('CANCELLED', 'Exists check was cancelled'));
        }

        return Result.ok(this.storage.has(id.value));
    }

    // Utility methods for testing
    get size(): number {
        return this.storage.size;
    }

    clear(): void {
        this.storage.clear();
    }
}

// Fast repository for comparison tests
class FastRepository extends MockRepository {
    constructor() {
        super(0); // No delay
    }
}

// Slow repository for timeout tests
class SlowRepository extends MockRepository {
    constructor() {
        super(1000); // 1 second delay
    }
}

// Repository that throws on cancellation
class ThrowingRepository extends MockRepository {
    constructor() {
        super(100, true); // Throws when cancelled
    }
}

describe('Repository Cancellation Handling Tests', () => {
    describe('Basic Cancellation Support', () => {
        test('Should_AcceptCancellationToken_When_CallingRepositoryMethods', () => {
            // Given
            const repository = new MockRepository();
            const controller = new AbortController();
            const id = new TestId('test-1');
            const aggregate = new TestAggregate(id, 'test data');

            // When & Then - Should not throw for providing cancellation token
            expect(() => repository.getByIdAsync(id, controller.signal)).not.toThrow();
            expect(() => repository.addAsync(aggregate, controller.signal)).not.toThrow();
            expect(() => repository.updateAsync(aggregate, controller.signal)).not.toThrow();
            expect(() => repository.deleteAsync(id, controller.signal)).not.toThrow();
            expect(() => repository.existsAsync(id, controller.signal)).not.toThrow();
        });

        test('Should_CompleteNormally_When_NoCancellationRequested', async () => {
            // Given
            const repository = new MockRepository(50);
            const controller = new AbortController();
            const id = new TestId('test-1');
            const aggregate = new TestAggregate(id, 'test data');

            // When
            const addResult = await repository.addAsync(aggregate, controller.signal);
            const getResult = await repository.getByIdAsync(id, controller.signal);
            const existsResult = await repository.existsAsync(id, controller.signal);

            // Then
            expect(addResult.isSuccess).toBe(true);
            expect(getResult.hasValue).toBe(true);
            expect(existsResult.isSuccess).toBe(true);
            expect(existsResult.value).toBe(true);
        });

        test('Should_WorkWithoutCancellationToken_When_TokenNotProvided', async () => {
            // Given
            const repository = new MockRepository(10);
            const id = new TestId('test-1');
            const aggregate = new TestAggregate(id, 'test data');

            // When
            const addResult = await repository.addAsync(aggregate);
            const getResult = await repository.getByIdAsync(id);
            const existsResult = await repository.existsAsync(id);

            // Then
            expect(addResult.isSuccess).toBe(true);
            expect(getResult.hasValue).toBe(true);
            expect(existsResult.isSuccess).toBe(true);
        });
    });

    describe('Immediate Cancellation', () => {
        test('Should_HandleImmediateCancellation_When_TokenAlreadyAborted', async () => {
            // Given
            const repository = new MockRepository(100);
            const controller = new AbortController();
            controller.abort(); // Cancel immediately

            const id = new TestId('test-1');
            const aggregate = new TestAggregate(id, 'test data');

            // When
            const getResult = await repository.getByIdAsync(id, controller.signal);
            const addResult = await repository.addAsync(aggregate, controller.signal);
            const existsResult = await repository.existsAsync(id, controller.signal);

            // Then - Operations should complete quickly and handle cancellation
            expect(getResult.hasValue).toBe(false);
            expect(addResult.isFailure).toBe(true);
            expect(addResult.error.code).toBe('CANCELLED');
            expect(existsResult.isFailure).toBe(true);
            expect(existsResult.error.code).toBe('CANCELLED');
        });

        test('Should_ReturnAppropriateResults_When_CancelledBeforeStart', async () => {
            // Given
            const repository = new MockRepository(0); // No delay
            const controller = new AbortController();
            controller.abort();

            const id = new TestId('test-cancelled');

            // When
            const start = performance.now();
            const result = await repository.getByIdAsync(id, controller.signal);
            const end = performance.now();

            // Then - Should complete very quickly
            expect(end - start).toBeLessThan(50); // Less than 50ms
            expect(result.hasValue).toBe(false);
        });
    });

    describe('Delayed Cancellation', () => {
        test('Should_HandleCancellationDuringOperation_When_TokenAbortedMidway', async () => {
            // Given
            const repository = new SlowRepository(); // 1 second delay
            const controller = new AbortController();
            const id = new TestId('test-delayed');
            const aggregate = new TestAggregate(id, 'test data');

            // When - Start operation and cancel after 200ms
            const operationPromise = repository.addAsync(aggregate, controller.signal);

            setTimeout(() => {
                controller.abort();
            }, 200);

            const start = performance.now();
            const result = await operationPromise;
            const end = performance.now();

            // Then - Should complete faster than the full delay and be cancelled
            expect(end - start).toBeLessThan(800); // Much less than 1000ms
            expect(result.isFailure).toBe(true);
            expect(result.error.code).toBe('CANCELLED');
        });

        test('Should_CompleteSuccessfully_When_CancellationAfterCompletion', async () => {
            // Given
            const repository = new FastRepository(); // No delay
            const controller = new AbortController();
            const id = new TestId('test-fast');
            const aggregate = new TestAggregate(id, 'test data');

            // When - Start operation and try to cancel after it would complete
            const operationPromise = repository.addAsync(aggregate, controller.signal);

            setTimeout(() => {
                controller.abort();
            }, 100); // Cancel after operation should be done

            const result = await operationPromise;

            // Then - Should complete successfully
            expect(result.isSuccess).toBe(true);
        });

        test('Should_HandleMultipleOperationsWithSameToken_When_CancellationRequested', async () => {
            // Given
            const repository = new MockRepository(200);
            const controller = new AbortController();

            const operations = [
                repository.getByIdAsync(new TestId('id-1'), controller.signal),
                repository.getByIdAsync(new TestId('id-2'), controller.signal),
                repository.existsAsync(new TestId('id-3'), controller.signal),
                repository.existsAsync(new TestId('id-4'), controller.signal)
            ];

            // When - Cancel all operations after 100ms
            setTimeout(() => {
                controller.abort();
            }, 100);

            const results = await Promise.all(operations);

            // Then - All operations should be cancelled
            results.forEach(result => {
                if ('hasValue' in result) {
                    expect(result.hasValue).toBe(false);
                } else {
                    expect(result.isFailure).toBe(true);
                    expect(result.error.code).toBe('CANCELLED');
                }
            });
        });
    });

    describe('Exception vs Result Cancellation', () => {
        test('Should_ReturnFailureResult_When_CancellationHandledGracefully', async () => {
            // Given
            const repository = new MockRepository(100, false); // Don't throw on cancel
            const controller = new AbortController();
            const aggregate = new TestAggregate(new TestId('test-graceful'), 'data');

            // When
            controller.abort();
            const result = await repository.addAsync(aggregate, controller.signal);

            // Then
            expect(result.isFailure).toBe(true);
            expect(result.error.code).toBe('CANCELLED');
            expect(result.error.category).toBe('Infrastructure');
        });

        test('Should_ThrowException_When_RepositoryThrowsOnCancellation', async () => {
            // Given
            const repository = new ThrowingRepository();
            const controller = new AbortController();
            const aggregate = new TestAggregate(new TestId('test-throwing'), 'data');

            // When
            controller.abort();

            // Then
            await expect(repository.addAsync(aggregate, controller.signal))
                .rejects.toThrow('Operation was cancelled');
        });

        test('Should_HandleMixedCancellationBehavior_When_SomeThrowSomeReturn', async () => {
            // Given
            const gracefulRepo = new MockRepository(50, false);
            const throwingRepo = new ThrowingRepository();
            const controller = new AbortController();

            const id = new TestId('test-mixed');
            const aggregate = new TestAggregate(id, 'data');

            // When
            controller.abort();

            const gracefulResult = await gracefulRepo.addAsync(aggregate, controller.signal);

            let threwException = false;
            try {
                await throwingRepo.addAsync(aggregate, controller.signal);
            } catch {
                threwException = true;
            }

            // Then
            expect(gracefulResult.isFailure).toBe(true);
            expect(gracefulResult.error.code).toBe('CANCELLED');
            expect(threwException).toBe(true);
        });
    });

    describe('Cancellation Performance', () => {
        test('Should_CancelQuickly_When_LongRunningOperationCancelled', async () => {
            // Given
            const repository = new SlowRepository(); // 1 second operations
            const controller = new AbortController();
            const operations = [
                repository.getByIdAsync(new TestId('perf-1'), controller.signal),
                repository.existsAsync(new TestId('perf-2'), controller.signal),
                repository.addAsync(new TestAggregate(new TestId('perf-3')), controller.signal)
            ];

            // When - Cancel after very short time
            const start = performance.now();
            setTimeout(() => controller.abort(), 50);

            await Promise.all(operations.map(op => op.catch(() => undefined)));
            const end = performance.now();

            // Then - Should complete much faster than normal operation time
            const elapsedTime = end - start;
            expect(elapsedTime).toBeLessThan(500); // Much less than 1000ms per operation

            console.log(`Cancellation performance: ${elapsedTime.toFixed(2)}ms for 3 operations`);
        });

        test('Should_HandleConcurrentCancellations_When_ManyOperationsRunning', async () => {
            // Given
            const repository = new MockRepository(300);
            const controllers = Array.from({ length: 20 }, () => new AbortController());

            const operations = controllers.map((controller, index) =>
                repository.getByIdAsync(new TestId(`concurrent-${index}`), controller.signal)
            );

            // When - Cancel all operations at different times
            const start = performance.now();
            controllers.forEach((controller, index) => {
                setTimeout(() => controller.abort(), index * 10); // Stagger cancellations
            });

            await Promise.all(operations);
            const end = performance.now();

            // Then - Should complete reasonably quickly
            const elapsedTime = end - start;
            expect(elapsedTime).toBeLessThan(1000);

            console.log(`Concurrent cancellation performance: ${elapsedTime.toFixed(2)}ms for 20 operations`);
        });
    });

    describe('Cancellation Edge Cases', () => {
        test('Should_HandleReusedCancelledToken_When_TokenUsedMultipleTimes', async () => {
            // Given
            const repository = new MockRepository(50);
            const controller = new AbortController();
            controller.abort(); // Cancel once

            const id = new TestId('reused-token');

            // When - Use the same cancelled token multiple times
            const result1 = await repository.getByIdAsync(id, controller.signal);
            const result2 = await repository.existsAsync(id, controller.signal);
            const result3 = await repository.addAsync(new TestAggregate(id), controller.signal);

            // Then - All should handle cancellation consistently
            expect(result1.hasValue).toBe(false);
            expect(result2.isFailure).toBe(true);
            expect(result3.isFailure).toBe(true);
        });

        test('Should_HandleNullAndUndefinedTokens_When_InvalidTokensProvided', async () => {
            // Given
            const repository = new MockRepository(10);
            const id = new TestId('null-token-test');
            const aggregate = new TestAggregate(id, 'data');

            // When & Then - Should not throw for null/undefined tokens
            expect(async () => {
                await repository.getByIdAsync(id, undefined);
            }).not.toThrow();

            expect(async () => {
                await repository.addAsync(aggregate, undefined);
            }).not.toThrow();
        });

        test('Should_HandleCancellationRace_When_OperationCompletesAtSameTimeAsCancellation', async () => {
            // Given
            const repository = new MockRepository(100);
            const controller = new AbortController();
            const aggregate = new TestAggregate(new TestId('race-test'), 'data');

            // When - Cancel at approximately the same time operation would complete
            const operationPromise = repository.addAsync(aggregate, controller.signal);
            setTimeout(() => controller.abort(), 95); // Very close to completion time

            const result = await operationPromise;

            // Then - Should handle either success or cancellation gracefully
            // The exact result depends on timing, but should not throw
            expect(result.isSuccess || result.isFailure).toBe(true);
            if (result.isFailure) {
                expect(['CANCELLED', 'DUPLICATE_ID'].includes(result.error.code)).toBe(true);
            }
        });

        test('Should_CleanupProperly_When_OperationsCancelled', async () => {
            // Given
            const repository = new MockRepository(200);
            const initialSize = repository.size;

            // When - Start many operations and cancel them
            const controllers = Array.from({ length: 10 }, () => new AbortController());
            const operations = controllers.map((controller, index) => {
                const aggregate = new TestAggregate(new TestId(`cleanup-${index}`), 'data');
                return repository.addAsync(aggregate, controller.signal);
            });

            // Cancel all operations quickly
            setTimeout(() => {
                controllers.forEach(c => c.abort());
            }, 50);

            await Promise.all(operations);

            // Then - Repository should not have grown significantly (operations were cancelled)
            expect(repository.size).toBeLessThanOrEqual(initialSize + 5); // Allow some to complete
        });

        test('Should_PropagateAbortSignal_When_NestedOperationsCancelled', async () => {
            // Given
            const repository = new MockRepository(100);
            const controller = new AbortController();

            // Simulate nested operation that checks for cancellation
            const nestedOperation = async (token?: AbortSignal) => {
                const result1 = await repository.existsAsync(new TestId('nested-1'), token);
                if (result1.isFailure) return result1;

                const result2 = await repository.existsAsync(new TestId('nested-2'), token);
                if (result2.isFailure) return result2;

                return Result.ok(true);
            };

            // When
            const operationPromise = nestedOperation(controller.signal);
            setTimeout(() => controller.abort(), 50);

            const result = await operationPromise;

            // Then
            expect(result.isFailure).toBe(true);
            expect(result.error.code).toBe('CANCELLED');
        });
    });

    describe('Timeout Simulation', () => {
        test('Should_HandleTimeout_When_OperationTakesTooLong', async () => {
            // Given
            const repository = new SlowRepository(); // 1 second delay
            const controller = new AbortController();
            const timeoutMs = 200;

            const id = new TestId('timeout-test');

            // When - Set timeout that's shorter than operation time
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            const start = performance.now();
            const result = await repository.getByIdAsync(id, controller.signal);
            const end = performance.now();

            clearTimeout(timeoutId);

            // Then
            expect(end - start).toBeLessThan(timeoutMs + 100); // Allow some margin
            expect(result.hasValue).toBe(false);

            console.log(`Timeout simulation: ${(end - start).toFixed(2)}ms (timeout: ${timeoutMs}ms)`);
        });

        test('Should_CompleteWithinTimeout_When_OperationFastEnough', async () => {
            // Given
            const repository = new FastRepository(); // No delay
            const controller = new AbortController();
            const timeoutMs = 1000;

            const aggregate = new TestAggregate(new TestId('fast-test'), 'data');

            // When
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            const result = await repository.addAsync(aggregate, controller.signal);

            clearTimeout(timeoutId);

            // Then - Should complete successfully before timeout
            expect(result.isSuccess).toBe(true);
        });
    });
});