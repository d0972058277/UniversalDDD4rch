import { Maybe, Result, Error } from '../../src/functional';

/**
 * Integration tests for Maybe operations and conversions
 * Tests complete workflows using Maybe monadic operations and Result interoperability
 */
describe('Maybe Integration Tests', () => {
    describe('Should_ChainOperationsSuccessfully_When_AllValuesArePresent', () => {
        it('should chain map operations on Some values', () => {
            // Given
            const initialValue = 5;

            // When
            const result = Maybe.some(initialValue)
                .map(x => x * 2)      // 10
                .map(x => x + 3)      // 13
                .map(x => x.toString()); // "13"

            // Then
            expect(result.hasValue).toBe(true);
            expect(result.value).toBe("13");
        });

        it('should chain bind operations on Some values', () => {
            // Given
            const safeDivide = (a: number, b: number): Maybe<number> => {
                return b === 0 ? Maybe.none() : Maybe.some(a / b);
            };

            const safeSquareRoot = (x: number): Maybe<number> => {
                return x < 0 ? Maybe.none() : Maybe.some(Math.sqrt(x));
            };

            // When
            const result = Maybe.some(16)
                .bind(x => safeDivide(x, 4))     // Some(4)
                .bind(x => safeSquareRoot(x));   // Some(2)

            // Then
            expect(result.hasValue).toBe(true);
            expect(result.value).toBe(2);
        });

        it('should use match to handle both Some and None cases', () => {
            // Given
            const someValue = Maybe.some(42);
            const noneValue = Maybe.none<number>();

            // When
            const someMessage = someValue.match(
                value => `Found: ${value}`,
                () => 'Not found'
            );

            const noneMessage = noneValue.match(
                value => `Found: ${value}`,
                () => 'Not found'
            );

            // Then
            expect(someMessage).toBe('Found: 42');
            expect(noneMessage).toBe('Not found');
        });
    });

    describe('Should_ShortCircuitOnNone_When_AnyOperationReturnsNone', () => {
        it('should stop chain execution on first None', () => {
            // Given
            let operationsExecuted = 0;

            const trackingOperation = (x: number): number => {
                operationsExecuted++;
                return x + 1;
            };

            const failingOperation = (x: number): Maybe<number> => {
                operationsExecuted++;
                return Maybe.none();
            };

            // When
            const result = Maybe.some(10)
                .map(trackingOperation)         // Should execute (operationsExecuted = 1)
                .bind(failingOperation)         // Should execute and return None (operationsExecuted = 2)
                .map(trackingOperation);        // Should NOT execute

            // Then
            expect(result.hasValue).toBe(false);
            expect(operationsExecuted).toBe(2);
        });

        it('should propagate None through entire chain', () => {
            // Given
            const initialNone = Maybe.none<number>();

            // When
            const result = initialNone
                .map(x => x * 2)
                .bind(x => Maybe.some(x + 1))
                .map(x => x.toString());

            // Then
            expect(result.hasValue).toBe(false);
        });
    });

    describe('Should_HandleComplexWorkflows_When_CombiningMaybeOperations', () => {
        interface User {
            id: string;
            name: string;
            email?: string;
            age?: number;
        }

        interface UserProfile {
            user: User;
            displayName: string;
            contactEmail: string;
            ageGroup: string;
        }

        const findUser = (id: string): Maybe<User> => {
            const users = new Map([
                ['1', { id: '1', name: 'John Doe', email: 'john@example.com', age: 30 }],
                ['2', { id: '2', name: 'Jane Smith', age: 25 }],
                ['3', { id: '3', name: 'Bob Wilson', email: 'bob@example.com' }]
            ]);

            return users.has(id) ? Maybe.some(users.get(id)!) : Maybe.none();
        };

        const getDisplayName = (user: User): Maybe<string> => {
            return user.name ? Maybe.some(user.name) : Maybe.none();
        };

        const getContactEmail = (user: User): Maybe<string> => {
            return user.email ? Maybe.some(user.email) : Maybe.none();
        };

        const getAgeGroup = (user: User): Maybe<string> => {
            if (!user.age) return Maybe.none();

            if (user.age < 18) return Maybe.some('Minor');
            if (user.age < 65) return Maybe.some('Adult');
            return Maybe.some('Senior');
        };

        it('should create complete profile when all data is available', () => {
            // Given
            const userId = '1';

            // When
            const profileResult = findUser(userId)
                .bind(user => {
                    const displayName = getDisplayName(user);
                    const contactEmail = getContactEmail(user);
                    const ageGroup = getAgeGroup(user);

                    return displayName.bind(name =>
                        contactEmail.bind(email =>
                            ageGroup.map(group => ({
                                user,
                                displayName: name,
                                contactEmail: email,
                                ageGroup: group
                            } as UserProfile))
                        )
                    );
                });

            // Then
            expect(profileResult.hasValue).toBe(true);
            expect(profileResult.value.displayName).toBe('John Doe');
            expect(profileResult.value.contactEmail).toBe('john@example.com');
            expect(profileResult.value.ageGroup).toBe('Adult');
        });

        it('should fail when user is not found', () => {
            // Given
            const userId = 'nonexistent';

            // When
            const profileResult = findUser(userId)
                .bind(user => {
                    const displayName = getDisplayName(user);
                    const contactEmail = getContactEmail(user);
                    const ageGroup = getAgeGroup(user);

                    return displayName.bind(name =>
                        contactEmail.bind(email =>
                            ageGroup.map(group => ({
                                user,
                                displayName: name,
                                contactEmail: email,
                                ageGroup: group
                            } as UserProfile))
                        )
                    );
                });

            // Then
            expect(profileResult.hasValue).toBe(false);
        });

        it('should fail when required data is missing', () => {
            // Given
            const userId = '2'; // User without email

            // When
            const profileResult = findUser(userId)
                .bind(user => {
                    const displayName = getDisplayName(user);
                    const contactEmail = getContactEmail(user);
                    const ageGroup = getAgeGroup(user);

                    return displayName.bind(name =>
                        contactEmail.bind(email =>
                            ageGroup.map(group => ({
                                user,
                                displayName: name,
                                contactEmail: email,
                                ageGroup: group
                            } as UserProfile))
                        )
                    );
                });

            // Then
            expect(profileResult.hasValue).toBe(false);
        });
    });

    describe('Should_HandleMaybeToResultConversions_When_IntegratingWithResultTypes', () => {
        it('should convert Some to successful Result', () => {
            // Given
            const maybeValue = Maybe.some(42);
            const errorForNone = Error.domain('VALUE_NOT_FOUND', 'Value was not found');

            // When
            const result = maybeValue.toResult(errorForNone);

            // Then
            expect(result.isSuccess).toBe(true);
            expect(result.value).toBe(42);
        });

        it('should convert None to failed Result with provided error', () => {
            // Given
            const maybeValue = Maybe.none<number>();
            const errorForNone = Error.domain('VALUE_NOT_FOUND', 'Value was not found');

            // When
            const result = maybeValue.toResult(errorForNone);

            // Then
            expect(result.isFailure).toBe(true);
            expect(result.error.code).toBe('VALUE_NOT_FOUND');
            expect(result.error.message).toBe('Value was not found');
        });

        it('should create Maybe from successful Result', () => {
            // Given
            const successResult = Result.ok(100);
            const failureResult = Result.fail(Error.domain('SOME_ERROR', 'Error occurred'));

            // When
            const maybeFromSuccess = Result.toMaybe(successResult);
            const maybeFromFailure = Result.toMaybe(failureResult);

            // Then
            expect(maybeFromSuccess.hasValue).toBe(true);
            expect(maybeFromSuccess.value).toBe(100);

            expect(maybeFromFailure.hasValue).toBe(false);
        });
    });

    describe('Should_HandleConditionalOperations_When_UsingOrElseMethods', () => {
        it('should return original value when Maybe has value', () => {
            // Given
            const maybeValue = Maybe.some(42);

            // When
            const resultWithDefault = maybeValue.orElse(0);
            const resultWithFactory = maybeValue.orElse(() => 0);

            // Then
            expect(resultWithDefault).toBe(42);
            expect(resultWithFactory).toBe(42);
        });

        it('should return default value when Maybe is None', () => {
            // Given
            const maybeValue = Maybe.none<number>();

            // When
            const resultWithDefault = maybeValue.orElse(100);
            const resultWithFactory = maybeValue.orElse(() => 200);

            // Then
            expect(resultWithDefault).toBe(100);
            expect(resultWithFactory).toBe(200);
        });

        it('should chain orElse operations', () => {
            // Given
            const primarySource = (): Maybe<string> => Maybe.none();
            const secondarySource = (): Maybe<string> => Maybe.none();
            const tertiarySource = (): Maybe<string> => Maybe.some('fallback value');

            // When
            const result = primarySource()
                .orElse(() => secondarySource().orElse(''))
                .orElse('default');

            // Then
            expect(result).toBe('');
        });
    });

    describe('Should_HandleCollectionOperations_When_WorkingWithMaybeArrays', () => {
        const safeParseInt = (str: string): Maybe<number> => {
            const parsed = parseInt(str, 10);
            return isNaN(parsed) ? Maybe.none() : Maybe.some(parsed);
        };

        it('should filter and transform array elements', () => {
            // Given
            const stringNumbers = ['1', '2', 'invalid', '4', 'also-invalid', '6'];

            // When
            const validNumbers: number[] = [];
            for (const str of stringNumbers) {
                const maybeNumber = safeParseInt(str);
                if (maybeNumber.hasValue) {
                    validNumbers.push(maybeNumber.value);
                }
            }

            // Then
            expect(validNumbers).toEqual([1, 2, 4, 6]);
        });

        it('should find first valid element in array', () => {
            // Given
            const candidates = ['invalid', 'also-invalid', '42', '100'];

            // When
            let firstValid = Maybe.none<number>();
            for (const candidate of candidates) {
                const parsed = safeParseInt(candidate);
                if (parsed.hasValue) {
                    firstValid = parsed;
                    break;
                }
            }

            // Then
            expect(firstValid.hasValue).toBe(true);
            expect(firstValid.value).toBe(42);
        });

        it('should combine multiple Maybe values', () => {
            // Given
            const maybeA = Maybe.some(10);
            const maybeB = Maybe.some(20);
            const maybeC = Maybe.some(30);

            // When
            const sum = maybeA.bind(a =>
                maybeB.bind(b =>
                    maybeC.map(c => a + b + c)
                )
            );

            // Then
            expect(sum.hasValue).toBe(true);
            expect(sum.value).toBe(60);
        });

        it('should fail combination if any Maybe is None', () => {
            // Given
            const maybeA = Maybe.some(10);
            const maybeB = Maybe.none<number>();
            const maybeC = Maybe.some(30);

            // When
            const sum = maybeA.bind(a =>
                maybeB.bind(b =>
                    maybeC.map(c => a + b + c)
                )
            );

            // Then
            expect(sum.hasValue).toBe(false);
        });
    });

    describe('Should_HandleAsyncOperations_When_UsingMaybeWithPromises', () => {
        const asyncFindUser = async (id: string): Promise<Maybe<{ id: string; name: string }>> => {
            // Simulate async database lookup
            await new Promise(resolve => setTimeout(resolve, 10));

            const users = {
                '1': { id: '1', name: 'Alice' },
                '2': { id: '2', name: 'Bob' }
            };

            return id in users ? Maybe.some(users[id as keyof typeof users]) : Maybe.none();
        };

        const asyncGetUserPreferences = async (userId: string): Promise<Maybe<{ theme: string }>> => {
            await new Promise(resolve => setTimeout(resolve, 10));

            if (userId === '1') {
                return Maybe.some({ theme: 'dark' });
            }
            return Maybe.none();
        };

        it('should handle successful async Maybe operations', async () => {
            // Given
            const userId = '1';

            // When
            const userMaybe = await asyncFindUser(userId);

            let finalResult: Maybe<{ user: { id: string; name: string }; preferences: { theme: string } }>;
            if (userMaybe.hasValue) {
                const preferencesMaybe = await asyncGetUserPreferences(userId);
                finalResult = preferencesMaybe.map(preferences => ({
                    user: userMaybe.value,
                    preferences
                }));
            } else {
                finalResult = Maybe.none();
            }

            // Then
            expect(finalResult.hasValue).toBe(true);
            expect(finalResult.value.user.name).toBe('Alice');
            expect(finalResult.value.preferences.theme).toBe('dark');
        });

        it('should handle async Maybe operations with None results', async () => {
            // Given
            const userId = 'nonexistent';

            // When
            const userMaybe = await asyncFindUser(userId);

            let finalResult: Maybe<{ user: { id: string; name: string }; preferences: { theme: string } }>;
            if (userMaybe.hasValue) {
                const preferencesMaybe = await asyncGetUserPreferences(userId);
                finalResult = preferencesMaybe.map(preferences => ({
                    user: userMaybe.value,
                    preferences
                }));
            } else {
                finalResult = Maybe.none();
            }

            // Then
            expect(finalResult.hasValue).toBe(false);
        });
    });

    describe('Should_HandleTypeTransformations_When_WorkingWithDifferentTypes', () => {
        it('should transform between different types correctly', () => {
            // Given
            const maybeNumber = Maybe.some(42);

            // When
            const maybeString = maybeNumber.map(n => n.toString());
            const maybeBool = maybeNumber.map(n => n > 0);
            const maybeObject = maybeNumber.map(n => ({ value: n, squared: n * n }));

            // Then
            expect(maybeString.hasValue).toBe(true);
            expect(maybeString.value).toBe('42');

            expect(maybeBool.hasValue).toBe(true);
            expect(maybeBool.value).toBe(true);

            expect(maybeObject.hasValue).toBe(true);
            expect(maybeObject.value.value).toBe(42);
            expect(maybeObject.value.squared).toBe(1764);
        });

        it('should handle nested Maybe structures', () => {
            // Given
            const nestedMaybe = Maybe.some(Maybe.some(42));

            // When
            const flattenedMaybe = nestedMaybe.bind(innerMaybe => innerMaybe);

            // Then
            expect(flattenedMaybe.hasValue).toBe(true);
            expect(flattenedMaybe.value).toBe(42);
        });

        it('should handle undefined and null values appropriately', () => {
            // Given
            const maybeUndefined = Maybe.some(undefined);
            const maybeNull = Maybe.some(null);
            const maybeZero = Maybe.some(0);
            const maybeEmptyString = Maybe.some('');

            // When & Then
            expect(maybeUndefined.hasValue).toBe(true);
            expect(maybeUndefined.value).toBeUndefined();

            expect(maybeNull.hasValue).toBe(true);
            expect(maybeNull.value).toBeNull();

            expect(maybeZero.hasValue).toBe(true);
            expect(maybeZero.value).toBe(0);

            expect(maybeEmptyString.hasValue).toBe(true);
            expect(maybeEmptyString.value).toBe('');
        });
    });
});

// Extension methods for Result to work with Maybe (would be in the actual Result implementation)
declare global {
    namespace Result {
        function toMaybe<T>(result: Result<T>): Maybe<T>;
    }
}

// Implementation would be in the actual Result class
Result.toMaybe = function<T>(result: Result<T>): Maybe<T> {
    return result.isSuccess ? Maybe.some(result.value) : Maybe.none();
};