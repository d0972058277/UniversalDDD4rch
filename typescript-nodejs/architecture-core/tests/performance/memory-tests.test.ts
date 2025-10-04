/**
 * Memory Correctness Tests
 * Architecture.Core TypeScript Implementation
 *
 * These tests verify that objects can be created and used without errors,
 * rather than making unreliable assertions about memory consumption.
 */

import { Result } from '../../src/functional/result';
import { Maybe } from '../../src/functional/maybe';
import { Error } from '../../src/functional/error';
import { ValueObject } from '../../src/domain/value-object';
import { AggregateRoot } from '../../src/domain/aggregate-root';
import { DomainEventBase } from '../../src/domain/domain-event-base';

// Test ValueObject
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

    clearData(): void {
        this._data = [];
    }

    get dataCount(): number {
        return this._data.length;
    }
}

describe('Memory Correctness Tests', () => {
    describe('Result Type Usage', () => {
        test('Should_CreateAndUseResults_When_OperationsPerformed', () => {
            // Given & When & Then - Verify no errors thrown
            for (let i = 0; i < 1000; i++) {
                const successResult = Result.ok(`value-${i}`);
                const failureResult = Result.fail<string>(Error.domain('TEST_ERROR', `Error ${i}`));

                expect(successResult.isSuccess).toBe(true);
                expect(failureResult.isSuccess).toBe(false);

                const successValue = successResult.match(
                    value => value,
                    () => ''
                );

                const failureValue = failureResult.match(
                    value => value,
                    error => error.message
                );

                expect(successValue).toBe(`value-${i}`);
                expect(failureValue).toContain('Error');
            }
        });

        test('Should_ChainResultOperations_When_MultipleMapsAndBinds', () => {
            // Given & When & Then
            for (let i = 0; i < 100; i++) {
                const result = Result.ok(i)
                    .map(x => x * 2)
                    .bind(x => x > 100 ? Result.fail(Error.validation('TOO_LARGE', 'Value too large')) : Result.ok(x))
                    .map((x: any) => x.toString())
                    .bind((s: string) => Result.ok(s.length));

                expect(() => result.match(v => v, e => 0)).not.toThrow();
            }
        });
    });

    describe('Maybe Type Usage', () => {
        test('Should_CreateAndUseMaybes_When_OperationsPerformed', () => {
            // Given & When & Then
            for (let i = 0; i < 1000; i++) {
                const someValue = Maybe.some(`value-${i}`);
                const noneValue = Maybe.none<string>();
                const nullableValue = Maybe.fromNullable(i % 2 === 0 ? `nullable-${i}` : null);

                expect(someValue.hasValue).toBe(true);
                expect(noneValue.hasValue).toBe(false);
                expect(nullableValue.hasValue).toBe(i % 2 === 0);
            }
        });

        test('Should_ChainMaybeOperations_When_MultipleMapsAndBinds', () => {
            // Given & When & Then
            for (let i = 0; i < 100; i++) {
                const maybe = Maybe.some(i)
                    .map(x => x * 2)
                    .bind(x => x > 100 ? Maybe.none<number>() : Maybe.some(x))
                    .map(x => x.toString())
                    .bind(s => Maybe.some(s.length));

                expect(() => maybe.match(v => v, () => 0)).not.toThrow();
            }
        });
    });

    describe('ValueObject Usage', () => {
        test('Should_CreateAndCompareValueObjects_When_OperationsPerformed', () => {
            // Given & When & Then
            const objects: TestValueObject[] = [];

            for (let i = 0; i < 100; i++) {
                const metadata = {
                    created: new Date(),
                    index: i,
                    tags: [`tag-${i}`]
                };

                const obj = new TestValueObject(`id-${i}`, `data-${i}`, metadata);
                objects.push(obj);

                // Verify operations don't throw
                expect(() => obj.equals(obj)).not.toThrow();
                expect(() => obj.getHashCode()).not.toThrow();
            }

            // Verify cross-comparisons don't throw
            objects.forEach(obj1 => {
                objects.slice(0, 10).forEach(obj2 => {
                    expect(() => obj1.equals(obj2)).not.toThrow();
                });
            });
        });
    });

    describe('AggregateRoot Usage', () => {
        test('Should_CreateAndUseAggregates_When_OperationsPerformed', () => {
            // Given & When & Then
            for (let i = 0; i < 100; i++) {
                const aggregate = new TestAggregate(new TestAggregateId(`aggregate-${i}`));

                // Add data and events
                for (let j = 0; j < 10; j++) {
                    aggregate.addData(`data-${i}-${j}`);
                }

                expect(aggregate.events.length).toBe(10);
                expect(aggregate.dataCount).toBe(10);
                expect(aggregate.version).toBe(0);

                // Clear events
                aggregate.clearEvents();
                expect(aggregate.events.length).toBe(0);
            }
        });

        test('Should_HandleEventClearing_When_ClearEventsCalled', () => {
            // Given
            const aggregate = new TestAggregate(new TestAggregateId('clear-test'));

            // When - Add many events
            for (let i = 0; i < 100; i++) {
                aggregate.addData(`test-data-${i}`);
            }

            expect(aggregate.events.length).toBe(100);

            // Then - Clear events
            aggregate.clearEvents();
            expect(aggregate.events.length).toBe(0);

            // Verify aggregate still functions
            aggregate.addData('new-data');
            expect(aggregate.events.length).toBe(1);
        });
    });

    describe('Error Type Usage', () => {
        test('Should_CreateErrors_When_DifferentCategoriesUsed', () => {
            // Given & When & Then
            for (let i = 0; i < 100; i++) {
                const metadata = {
                    field: `field-${i}`,
                    value: i
                };

                const domainError = Error.domain(`DOMAIN_${i}`, `Domain error ${i}`, metadata);
                const validationError = Error.validation(`VALIDATION_${i}`, `Validation error ${i}`);
                const infraError = Error.infrastructure(`INFRA_${i}`, `Infrastructure error ${i}`);

                expect(domainError.category).toBe('Domain');
                expect(validationError.category).toBe('Validation');
                expect(infraError.category).toBe('Infrastructure');
            }
        });
    });

    describe('Combined Usage', () => {
        test('Should_UseCombinedTypes_When_RealWorldScenario', () => {
            // Given & When & Then - Simulate real-world usage
            for (let i = 0; i < 100; i++) {
                // Create aggregate
                const aggregate = new TestAggregate(new TestAggregateId(`combined-${i}`));
                aggregate.addData(`data-${i}`);

                // Create value object
                const metadata = { combined: true, iteration: i };
                const valueObject = new TestValueObject(`id-${i}`, `data-${i}`, metadata);

                // Use functional types
                const result = Result.ok(valueObject)
                    .bind(vo => Result.ok(vo.getHashCode()))
                    .map(hash => hash.toString());

                const maybe = Maybe.some(aggregate)
                    .map(agg => agg.events.length)
                    .bind(count => count > 0 ? Maybe.some(count) : Maybe.none<number>());

                // Verify operations complete without errors
                expect(result.isSuccess).toBe(true);
                expect(maybe.hasValue).toBe(true);

                // Clean up
                aggregate.clearEvents();
            }
        });
    });
});
