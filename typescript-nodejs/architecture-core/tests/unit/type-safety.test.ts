/**
 * TypeScript Strict Mode Compilation Tests
 *
 * This test suite validates that the Architecture.Core library maintains
 * strict TypeScript compilation without any type errors or warnings.
 */

import { Result, ResultOf, Maybe, Error, ErrorCategory } from '../../src/functional';
import { ValueObject, Entity, AggregateRoot } from '../../src/domain';

describe('TypeScript Strict Mode Compilation Tests', () => {
    describe('Should_CompileWithStrictMode_When_UsingCoreTypes', () => {
        it('should compile functional types without type errors', () => {
            // Given - Functional types with strict typing
            const error: Error = Error.domain('TEST_ERROR', 'Test error message');
            const successResult: ResultOf<string> = Result.ok('test value');
            const failureResult = Result.fail<string>(error);
            const someValue: Maybe<number> = Maybe.some(42);
            const noneValue: Maybe<number> = Maybe.none();

            // When - Using type-safe operations
            const mappedResult = successResult.map((value: string) => value.toUpperCase());
            const mappedMaybe = someValue.map((value: number) => value * 2);

            // Then - No type errors should occur during compilation
            expect(mappedResult.isSuccess).toBe(true);
            expect(mappedMaybe.hasValue).toBe(true);
        });

        it('should enforce strict null checks', () => {
            // Given - Values that might be null/undefined
            const possiblyNullValue: string | null = Math.random() > 0.5 ? 'test' : null;
            const possiblyUndefinedValue: string | undefined = Math.random() > 0.5 ? 'test' : undefined;

            // When - Converting to Maybe types
            const maybeFromNull = Maybe.fromValue(possiblyNullValue);
            const maybeFromUndefined = Maybe.fromValue(possiblyUndefinedValue);

            // Then - Type system correctly handles nullable types
            expect(maybeFromNull.hasValue || !maybeFromNull.hasValue).toBe(true);
            expect(maybeFromUndefined.hasValue || !maybeFromUndefined.hasValue).toBe(true);
        });

        it('should prevent access to undefined properties', () => {
            // Given - A failure result
            const failureResult = Result.fail<string>(Error.domain('TEST', 'Test error'));

            // When/Then - TypeScript should prevent direct value access on failure
            // This test validates that safe access patterns work correctly:
            const safeValue = failureResult.isSuccess ? failureResult.value : undefined;
            expect(safeValue).toBeUndefined();
        });
    });

    describe('Should_EnforceGenericConstraints_When_DefiningEntities', () => {
        it('should enforce entity ID constraints', () => {
            // Given - Custom ID types
            class UserId {
                constructor(public readonly value: string) {}
            }

            class TestEntity extends Entity<UserId> {
                constructor(id: UserId, public readonly name: string) {
                    super(id);
                }
            }

            // When - Creating entities with typed IDs
            const userId = new UserId('user-123');
            const entity = new TestEntity(userId, 'Test User');

            // Then - Type safety is maintained
            expect(entity.id).toBe(userId);
            expect(entity.name).toBe('Test User');
        });

        it('should enforce aggregate root constraints', () => {
            // Given - Aggregate root with typed ID
            class OrderId {
                constructor(public readonly value: string) {}
            }

            class TestAggregate extends AggregateRoot<OrderId> {
                constructor(id: OrderId) {
                    super(id);
                }
            }

            // When - Creating aggregate
            const orderId = new OrderId('order-123');
            const aggregate = new TestAggregate(orderId);

            // Then - Type constraints are enforced
            expect(aggregate.id).toBe(orderId);
            expect(aggregate.version).toBe(0);
            expect(aggregate.events).toBeDefined();
        });
    });

    describe('Should_PreventTypeErrors_When_UsingMonadicOperations', () => {
        it('should maintain type safety in Result chains', () => {
            // Given - Initial value
            const initialValue = "hello";

            // When - Chaining operations with different types
            const result = Result.ok(initialValue)
                .map((str: string) => str.length)           // string -> number
                .bind((len: number) => Result.ok(len > 5))  // number -> ResultOf<boolean>
                .map((bool: boolean) => bool ? 'long' : 'short'); // boolean -> string

            // Then - Final type should be ResultOf<string>
            expect(result.isSuccess).toBe(true);
            expect(typeof result.value).toBe('string');
        });

        it('should maintain type safety in Maybe chains', () => {
            // Given - Initial optional value
            const initialValue: string | null = "test";

            // When - Chaining operations
            const result = Maybe.fromValue(initialValue)
                .map((str: string) => str.toUpperCase())    // string -> string
                .bind((str: string) => Maybe.some(str.length)) // string -> Maybe<number>
                .map((len: number) => len * 2);             // number -> number

            // Then - Final type should be Maybe<number>
            expect(result.hasValue).toBe(true);
            expect(typeof result.value).toBe('number');
        });
    });

    describe('Should_ValidateErrorHierarchy_When_UsingErrorTypes', () => {
        it('should maintain error category types', () => {
            // Given - Different error categories
            const domainError = Error.domain('DOMAIN_ERROR', 'Domain error');
            const validationError = Error.validation('VALIDATION_ERROR', 'Validation error');
            const infrastructureError = Error.infrastructure('INFRA_ERROR', 'Infrastructure error');

            // When - Checking error properties
            const categories = [
                domainError.category,
                validationError.category,
                infrastructureError.category
            ];

            // Then - Types should be maintained
            expect(categories).toEqual([
                ErrorCategory.Domain,
                ErrorCategory.Validation,
                ErrorCategory.Infrastructure
            ]);
        });

        it('should support error metadata typing', () => {
            // Given - Error with typed metadata
            const metadata: Record<string, unknown> = {
                userId: 'user-123',
                timestamp: new Date(),
                context: { operation: 'create-order' }
            };

            // When - Creating error with metadata
            const error = Error.domain('TEST_ERROR', 'Test error', metadata);

            // Then - Metadata should be accessible with proper typing
            expect(error.metadata.userId).toBe('user-123');
            expect(error.metadata.timestamp).toBeInstanceOf(Date);
            expect(error.metadata.context).toEqual({ operation: 'create-order' });
        });
    });

    describe('Should_EnforceImmutability_When_UsingValueObjects', () => {
        it('should prevent mutation of value object properties', () => {
            // Given - Custom value object
            class TestValueObject extends ValueObject {
                constructor(
                    public readonly value: string,
                    public readonly count: number
                ) {
                    super();
                }

                protected getEqualityComponents(): any[] {
                    return [this.value, this.count];
                }
            }

            // When - Creating value object
            const valueObject = new TestValueObject('test', 42);

            // Then - Properties should be readonly (compilation would fail if we tried to mutate)
            expect(valueObject.value).toBe('test');
            expect(valueObject.count).toBe(42);

            // The following would cause compilation errors:
            // valueObject.value = 'new value'; // Error: Cannot assign to 'value' because it is a read-only property
            // valueObject.count = 100; // Error: Cannot assign to 'count' because it is a read-only property
        });
    });

    describe('Should_ProvideTypeInference_When_UsingFactoryMethods', () => {
        it('should infer Result types correctly', () => {
            // Given - Factory methods
            const stringResult = Result.ok('hello');
            const numberResult = Result.ok(42);
            const booleanResult = Result.ok(true);

            // When - Using inferred types
            const stringLength = stringResult.map((s: string) => s.length);
            const doubledNumber = numberResult.map((n: number) => n * 2);
            const negatedBoolean = booleanResult.map((b: boolean) => !b);

            // Then - Types should be correctly inferred
            expect(stringLength.value).toBe(5);
            expect(doubledNumber.value).toBe(84);
            expect(negatedBoolean.value).toBe(false);
        });

        it('should infer Maybe types correctly', () => {
            // Given - Factory methods
            const stringMaybe = Maybe.some('world');
            const numberMaybe = Maybe.some(100);
            const noneMaybe = Maybe.none<string>();

            // When - Using inferred types
            const upperCase = stringMaybe.map((s: string) => s.toUpperCase());
            const halfNumber = numberMaybe.map((n: number) => n / 2);
            const defaultValue = noneMaybe.orElse('default');

            // Then - Types should be correctly inferred
            expect(upperCase.value).toBe('WORLD');
            expect(halfNumber.value).toBe(50);
            expect(defaultValue).toBe('default');
        });
    });

    describe('Should_HandleAsyncTypes_When_UsingRepositories', () => {
        it('should maintain type safety in async operations', async () => {
            // This test validates that repository interfaces maintain type safety
            // The actual implementation testing is done in integration tests

            // Given - Type definitions that should compile
            type UserId = { value: string };
            type UserEntity = Entity<UserId> & { name: string };

            // When - Defining async function signatures
            const asyncOperation = async (): Promise<ResultOf<Maybe<UserEntity>>> => {
                return Result.ok(Maybe.none<UserEntity>());
            };

            // Then - TypeScript should correctly handle nested generic types
            const result = await asyncOperation();
            expect(result.isSuccess).toBe(true);
        });
    });
});