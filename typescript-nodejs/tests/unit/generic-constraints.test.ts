/**
 * Generic Constraints Validation Tests
 *
 * This test suite validates that generic type constraints are properly
 * enforced throughout the Architecture.Core library.
 */

import { Result, ResultOf, Maybe, Error } from '../../src/functional';
import { Entity, AggregateRoot, ValueObject } from '../../src/domain';

describe('Generic Constraints Validation Tests', () => {
    describe('Should_EnforceResultConstraints_When_UsingGenericTypes', () => {
        it('should allow any type in ResultOf<T>', () => {
            // Given - Various types
            const stringResult = Result.ok('test');
            const numberResult = Result.ok(42);
            const objectResult = Result.ok({ key: 'value' });
            const arrayResult = Result.ok([1, 2, 3]);
            const nullResult = Result.ok(null);

            // When/Then - All types should be supported
            expect(stringResult.isSuccess).toBe(true);
            expect(numberResult.isSuccess).toBe(true);
            expect(objectResult.isSuccess).toBe(true);
            expect(arrayResult.isSuccess).toBe(true);
            expect(nullResult.isSuccess).toBe(true);
        });

        it('should maintain type constraints in chained operations', () => {
            // Given - Initial Result with specific type
            const initialResult = Result.ok(10);

            // When - Chaining operations that change types
            const stringResult = initialResult.map((n: number) => n.toString());
            const booleanResult = stringResult.map((s: string) => s.length > 1);

            // Then - Type constraints should be preserved
            expect(stringResult.value).toBe('10');
            expect(booleanResult.value).toBe(true);
        });

        it('should enforce error type constraints', () => {
            // Given - Various error types
            const error1 = Error.domain('CODE1', 'Message 1');
            const error2 = Error.validation('CODE2', 'Message 2');

            // When - Creating failure results
            const failureResult1 = Result.fail<string>(error1);
            const failureResult2 = Result.fail<number>(error2);

            // Then - Error types should be maintained
            expect(failureResult1.error).toBe(error1);
            expect(failureResult2.error).toBe(error2);
        });
    });

    describe('Should_EnforceMaybeConstraints_When_UsingGenericTypes', () => {
        it('should allow any non-undefined type in Maybe<T>', () => {
            // Given - Various valid types for Maybe
            const stringMaybe = Maybe.some('test');
            const numberMaybe = Maybe.some(0); // Zero is valid
            const objectMaybe = Maybe.some({});
            const arrayMaybe = Maybe.some([]);
            const booleanMaybe = Maybe.some(false); // False is valid

            // When/Then - All types should be supported
            expect(stringMaybe.hasValue).toBe(true);
            expect(numberMaybe.hasValue).toBe(true);
            expect(objectMaybe.hasValue).toBe(true);
            expect(arrayMaybe.hasValue).toBe(true);
            expect(booleanMaybe.hasValue).toBe(true);
        });

        it('should handle null and undefined conversion correctly', () => {
            // Given - Nullable values
            const nullValue: string | null = null;
            const undefinedValue: string | undefined = undefined;
            const validValue: string = 'test';

            // When - Converting to Maybe
            const maybeFromNull = Maybe.fromValue(nullValue);
            const maybeFromUndefined = Maybe.fromValue(undefinedValue);
            const maybeFromValid = Maybe.fromValue(validValue);

            // Then - Null and undefined should become None
            expect(maybeFromNull.hasValue).toBe(false);
            expect(maybeFromUndefined.hasValue).toBe(false);
            expect(maybeFromValid.hasValue).toBe(true);
        });

        it('should maintain type constraints in monadic operations', () => {
            // Given - Maybe with specific type
            const numberMaybe: Maybe<number> = Maybe.some(42);

            // When - Applying transformations
            const stringMaybe = numberMaybe.map((n: number) => `Number: ${n}`);
            const booleanMaybe = numberMaybe.bind((n: number) => Maybe.some(n > 40));

            // Then - Type constraints should be preserved
            expect(stringMaybe.value).toBe('Number: 42');
            expect(booleanMaybe.value).toBe(true);
        });
    });

    describe('Should_EnforceEntityConstraints_When_UsingGenericIds', () => {
        it('should enforce ID type constraints in Entity<TId>', () => {
            // Given - Various ID types
            class StringId {
                constructor(public readonly value: string) {}
                toString() { return this.value; }
            }

            class NumberId {
                constructor(public readonly value: number) {}
                toString() { return this.value.toString(); }
            }

            class TestEntityWithStringId extends Entity<StringId> {
                constructor(id: StringId) { super(id); }
            }

            class TestEntityWithNumberId extends Entity<NumberId> {
                constructor(id: NumberId) { super(id); }
            }

            // When - Creating entities with different ID types
            const stringEntity = new TestEntityWithStringId(new StringId('entity-1'));
            const numberEntity = new TestEntityWithNumberId(new NumberId(42));

            // Then - ID types should be enforced
            expect(stringEntity.id).toBeInstanceOf(StringId);
            expect(numberEntity.id).toBeInstanceOf(NumberId);
            expect(stringEntity.id.value).toBe('entity-1');
            expect(numberEntity.id.value).toBe(42);
        });

        it('should maintain ID type safety in equality comparisons', () => {
            // Given - Entities with same ID type
            class UserId {
                constructor(public readonly value: string) {}
            }

            class User extends Entity<UserId> {
                constructor(id: UserId, public readonly name: string) {
                    super(id);
                }
            }

            const user1 = new User(new UserId('user-1'), 'Alice');
            const user2 = new User(new UserId('user-1'), 'Alice Clone');
            const user3 = new User(new UserId('user-2'), 'Bob');

            // When - Comparing entities
            const areEqual12 = user1.equals(user2);
            const areEqual13 = user1.equals(user3);

            // Then - Equality should be based on ID
            expect(areEqual12).toBe(true);  // Same ID
            expect(areEqual13).toBe(false); // Different ID
        });
    });

    describe('Should_EnforceAggregateRootConstraints_When_UsingGenericTypes', () => {
        it('should enforce ID constraints for AggregateRoot<TId>', () => {
            // Given - Custom aggregate with typed ID
            class OrderId {
                constructor(public readonly value: string) {}
            }

            class Order extends AggregateRoot<OrderId> {
                private _status: string = 'PENDING';

                constructor(id: OrderId) {
                    super(id);
                }

                get status(): string {
                    return this._status;
                }

                confirm(): void {
                    this._status = 'CONFIRMED';
                    this.incrementVersion();
                }
            }

            // When - Creating and using aggregate
            const orderId = new OrderId('order-123');
            const order = new Order(orderId);

            // Then - Type constraints should be maintained
            expect(order.id).toBe(orderId);
            expect(order.id.value).toBe('order-123');
            expect(order.version).toBe(0);
        });

        it('should maintain type safety in event handling', () => {
            // Given - Aggregate that handles events
            class ProductId {
                constructor(public readonly value: string) {}
            }

            class Product extends AggregateRoot<ProductId> {
                constructor(id: ProductId, private _name: string) {
                    super(id);
                }

                get name(): string {
                    return this._name;
                }

                rename(newName: string): void {
                    this._name = newName;
                    this.incrementVersion();
                    // In real implementation, would add domain event here
                }
            }

            // When - Working with aggregate
            const productId = new ProductId('product-456');
            const product = new Product(productId, 'Initial Name');
            product.rename('New Name');

            // Then - Type safety should be maintained
            expect(product.id).toBe(productId);
            expect(product.name).toBe('New Name');
            expect(product.version).toBe(1);
        });
    });

    describe('Should_EnforceValueObjectConstraints_When_DefiningCustomTypes', () => {
        it('should allow any component types in getEqualityComponents', () => {
            // Given - Value object with mixed component types
            class ComplexValueObject extends ValueObject {
                constructor(
                    public readonly stringProp: string,
                    public readonly numberProp: number,
                    public readonly booleanProp: boolean,
                    public readonly objectProp: { key: string },
                    public readonly arrayProp: number[]
                ) {
                    super();
                }

                protected getEqualityComponents(): any[] {
                    return [
                        this.stringProp,
                        this.numberProp,
                        this.booleanProp,
                        this.objectProp,
                        this.arrayProp
                    ];
                }
            }

            // When - Creating value objects
            const obj1 = new ComplexValueObject(
                'test',
                42,
                true,
                { key: 'value' },
                [1, 2, 3]
            );

            const obj2 = new ComplexValueObject(
                'test',
                42,
                true,
                { key: 'value' },
                [1, 2, 3]
            );

            // Then - Should handle complex equality
            expect(obj1.equals(obj2)).toBe(true);
        });

        it('should maintain immutability constraints', () => {
            // Given - Immutable value object
            class ImmutableMoney extends ValueObject {
                constructor(
                    public readonly amount: number,
                    public readonly currency: string
                ) {
                    super();
                }

                protected getEqualityComponents(): any[] {
                    return [this.amount, this.currency];
                }

                add(other: ImmutableMoney): ImmutableMoney {
                    if (this.currency !== other.currency) {
                        throw new globalThis.Error('Currency mismatch');
                    }
                    return new ImmutableMoney(this.amount + other.amount, this.currency);
                }
            }

            // When - Performing operations
            const money1 = new ImmutableMoney(100, 'USD');
            const money2 = new ImmutableMoney(50, 'USD');
            const sum = money1.add(money2);

            // Then - Original objects should remain unchanged
            expect(money1.amount).toBe(100);
            expect(money2.amount).toBe(50);
            expect(sum.amount).toBe(150);
            expect(sum).not.toBe(money1);
            expect(sum).not.toBe(money2);
        });
    });

    describe('Should_EnforceConversionConstraints_When_UsingTypeConversions', () => {
        it('should maintain type safety in Result to Maybe conversions', () => {
            // Given - Results with different types
            const stringResult = Result.ok('test');
            const numberResult = Result.ok(42);
            const failureResult = Result.fail<string>(Error.domain('ERROR', 'Test error'));

            // When - Converting via Maybe (manual implementation since toMaybe doesn't exist)
            const stringMaybe = stringResult.isSuccess ?
                Maybe.some(stringResult.value) : Maybe.none<string>();
            const numberMaybe = numberResult.isSuccess ?
                Maybe.some(numberResult.value) : Maybe.none<number>();
            const failureMaybe = failureResult.isSuccess ?
                Maybe.some(failureResult.value) : Maybe.none<string>();

            // Then - Types should be preserved
            expect(stringMaybe.hasValue).toBe(true);
            expect(numberMaybe.hasValue).toBe(true);
            expect(failureMaybe.hasValue).toBe(false);
        });

        it('should maintain type safety in Maybe to Result conversions', () => {
            // Given - Maybe values with different types
            const stringMaybe: Maybe<string> = Maybe.some('test');
            const numberMaybe: Maybe<number> = Maybe.some(42);
            const noneMaybe: Maybe<string> = Maybe.none<string>();

            // When - Converting to Results
            const stringResult = stringMaybe.toResult(Error.domain('ERROR', 'No value'));
            const numberResult = numberMaybe.toResult(Error.domain('ERROR', 'No value'));
            const noneResult = noneMaybe.toResult(Error.domain('ERROR', 'No value'));

            // Then - Types should be preserved
            expect(stringResult.isSuccess).toBe(true);
            expect(numberResult.isSuccess).toBe(true);
            expect(noneResult.isFailure).toBe(true);
            expect(stringResult.value).toBe('test');
            expect(numberResult.value).toBe(42);
        });
    });

    describe('Should_EnforceAsyncConstraints_When_UsingPromises', () => {
        it('should maintain type safety in Promise<ResultOf<T>>', async () => {
            // Given - Async operations returning Results
            const asyncStringOperation = async (): Promise<ResultOf<string>> => {
                return Result.ok('async result');
            };

            const asyncNumberOperation = async (): Promise<ResultOf<number>> => {
                return Result.ok(123);
            };

            // When - Awaiting results
            const stringResult = await asyncStringOperation();
            const numberResult = await asyncNumberOperation();

            // Then - Types should be maintained
            expect(stringResult.isSuccess).toBe(true);
            expect(numberResult.isSuccess).toBe(true);
            expect(typeof stringResult.value).toBe('string');
            expect(typeof numberResult.value).toBe('number');
        });

        it('should maintain type safety in Promise<Maybe<T>>', async () => {
            // Given - Async operations returning Maybe
            const asyncMaybeOperation = async <T>(value: T | null): Promise<Maybe<T>> => {
                return Maybe.fromValue(value);
            };

            // When - Awaiting Maybe results
            const stringMaybe = await asyncMaybeOperation('test');
            const nullMaybe = await asyncMaybeOperation(null);

            // Then - Types should be maintained
            expect(stringMaybe.hasValue).toBe(true);
            expect(nullMaybe.hasValue).toBe(false);
        });
    });
});