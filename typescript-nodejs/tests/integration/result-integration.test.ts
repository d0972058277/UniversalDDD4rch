import { Result, Error } from '../../src/functional';

/**
 * Integration tests for Result chaining and combinators
 * Tests complete workflows using Result monadic operations
 */
describe('Result Integration Tests', () => {
    describe('Should_ChainOperationsSuccessfully_When_AllOperationsSucceed', () => {
        it('should chain map operations on successful results', () => {
            // Given
            const initialValue = 10;
            const expectedFinalValue = 32; // ((10 * 2) + 5) + 7

            // When
            const result = Result.ok(initialValue)
                .map(x => x * 2)       // 20
                .map(x => x + 5)       // 25
                .map(x => x + 7);      // 32

            // Then
            expect(result.isSuccess).toBe(true);
            expect(result.value).toBe(expectedFinalValue);
        });

        it('should chain bind operations on successful results', () => {
            // Given
            const parseNumber = (str: string): Result<number> => {
                const parsed = parseInt(str, 10);
                return isNaN(parsed)
                    ? Result.fail(Error.validation('INVALID_NUMBER', `'${str}' is not a valid number`))
                    : Result.ok(parsed);
            };

            const validatePositive = (num: number): Result<number> => {
                return num > 0
                    ? Result.ok(num)
                    : Result.fail(Error.validation('NOT_POSITIVE', 'Number must be positive'));
            };

            const square = (num: number): Result<number> => {
                return Result.ok(num * num);
            };

            // When
            const result = parseNumber('5')
                .bind(validatePositive)
                .bind(square);

            // Then
            expect(result.isSuccess).toBe(true);
            expect(result.value).toBe(25);
        });

        it('should use match to handle both success and failure cases', () => {
            // Given
            const successResult = Result.ok(42);
            const failureResult = Result.fail(Error.domain('TEST_ERROR', 'Test error'));

            // When
            const successMessage = successResult.match(
                value => `Success: ${value}`,
                error => `Error: ${error.message}`
            );

            const failureMessage = failureResult.match(
                value => `Success: ${value}`,
                error => `Error: ${error.message}`
            );

            // Then
            expect(successMessage).toBe('Success: 42');
            expect(failureMessage).toBe('Error: Test error');
        });
    });

    describe('Should_ShortCircuitOnFailure_When_AnyOperationFails', () => {
        it('should stop chain execution on first map failure', () => {
            // Given
            let operationsExecuted = 0;

            const faultyOperation = (x: number): number => {
                operationsExecuted++;
                throw new Error('Operation failed');
            };

            const normalOperation = (x: number): number => {
                operationsExecuted++;
                return x + 1;
            };

            // When
            const result = Result.ok(10)
                .map(normalOperation)      // Should execute (operationsExecuted = 1)
                .map(faultyOperation)      // Should execute and fail (operationsExecuted = 2)
                .map(normalOperation);     // Should NOT execute

            // Then
            expect(result.isFailure).toBe(true);
            expect(operationsExecuted).toBe(2); // Only first two operations executed
            expect(result.error.category).toBe('Infrastructure');
            expect(result.error.message).toBe('Operation failed');
        });

        it('should stop chain execution on first bind failure', () => {
            // Given
            let operationsExecuted = 0;

            const successOperation = (x: number): Result<number> => {
                operationsExecuted++;
                return Result.ok(x * 2);
            };

            const failureOperation = (x: number): Result<number> => {
                operationsExecuted++;
                return Result.fail(Error.domain('BIND_FAILURE', 'Bind operation failed'));
            };

            // When
            const result = Result.ok(5)
                .bind(successOperation)    // Should execute (operationsExecuted = 1)
                .bind(failureOperation)    // Should execute and fail (operationsExecuted = 2)
                .bind(successOperation);   // Should NOT execute

            // Then
            expect(result.isFailure).toBe(true);
            expect(operationsExecuted).toBe(2);
            expect(result.error.code).toBe('BIND_FAILURE');
            expect(result.error.message).toBe('Bind operation failed');
        });

        it('should propagate the first error encountered', () => {
            // Given
            const firstError = Error.validation('FIRST_ERROR', 'First error message');
            const secondError = Error.domain('SECOND_ERROR', 'Second error message');

            // When
            const result = Result.fail(firstError)
                .bind(() => Result.fail(secondError))  // Should not execute
                .map(x => x + 1);                       // Should not execute

            // Then
            expect(result.isFailure).toBe(true);
            expect(result.error.code).toBe('FIRST_ERROR');
            expect(result.error.message).toBe('First error message');
        });
    });

    describe('Should_HandleComplexWorkflows_When_CombiningMultipleOperations', () => {
        interface User {
            id: string;
            email: string;
            age: number;
        }

        interface Order {
            id: string;
            userId: string;
            amount: number;
            currency: string;
        }

        const validateUser = (user: User): Result<User> => {
            if (!user.email || !user.email.includes('@')) {
                return Result.fail(Error.validation('INVALID_EMAIL', 'Invalid email address'));
            }
            if (user.age < 18) {
                return Result.fail(Error.validation('UNDERAGE', 'User must be 18 or older'));
            }
            return Result.ok(user);
        };

        const createOrder = (user: User, amount: number): Result<Order> => {
            if (amount <= 0) {
                return Result.fail(Error.validation('INVALID_AMOUNT', 'Amount must be positive'));
            }
            if (amount > 10000) {
                return Result.fail(Error.domain('AMOUNT_TOO_HIGH', 'Amount exceeds maximum limit'));
            }

            return Result.ok({
                id: `order-${Date.now()}`,
                userId: user.id,
                amount,
                currency: 'USD'
            });
        };

        const processPayment = (order: Order): Result<string> => {
            // Simulate payment processing
            if (order.amount > 5000) {
                return Result.fail(Error.infrastructure('PAYMENT_FAILED', 'Payment processing failed'));
            }
            return Result.ok(`payment-${order.id}`);
        };

        it('should handle successful complete workflow', () => {
            // Given
            const user: User = {
                id: 'user-123',
                email: 'john@example.com',
                age: 25
            };
            const orderAmount = 100;

            // When
            const result = validateUser(user)
                .bind(validUser => createOrder(validUser, orderAmount))
                .bind(order => processPayment(order))
                .map(paymentId => ({ success: true, paymentId }));

            // Then
            expect(result.isSuccess).toBe(true);
            expect(result.value.success).toBe(true);
            expect(result.value.paymentId).toMatch(/^payment-order-/);
        });

        it('should fail on user validation error', () => {
            // Given
            const invalidUser: User = {
                id: 'user-123',
                email: 'invalid-email',
                age: 25
            };
            const orderAmount = 100;

            // When
            const result = validateUser(invalidUser)
                .bind(validUser => createOrder(validUser, orderAmount))
                .bind(order => processPayment(order));

            // Then
            expect(result.isFailure).toBe(true);
            expect(result.error.code).toBe('INVALID_EMAIL');
            expect(result.error.category).toBe('Validation');
        });

        it('should fail on order creation error', () => {
            // Given
            const validUser: User = {
                id: 'user-123',
                email: 'john@example.com',
                age: 25
            };
            const invalidAmount = -50;

            // When
            const result = validateUser(validUser)
                .bind(user => createOrder(user, invalidAmount))
                .bind(order => processPayment(order));

            // Then
            expect(result.isFailure).toBe(true);
            expect(result.error.code).toBe('INVALID_AMOUNT');
            expect(result.error.category).toBe('Validation');
        });

        it('should fail on payment processing error', () => {
            // Given
            const validUser: User = {
                id: 'user-123',
                email: 'john@example.com',
                age: 25
            };
            const highAmount = 6000; // Exceeds payment processing limit

            // When
            const result = validateUser(validUser)
                .bind(user => createOrder(user, highAmount))
                .bind(order => processPayment(order));

            // Then
            expect(result.isFailure).toBe(true);
            expect(result.error.code).toBe('PAYMENT_FAILED');
            expect(result.error.category).toBe('Infrastructure');
        });
    });

    describe('Should_HandleParallelOperations_When_CombiningIndependentResults', () => {
        const fetchUserById = (id: string): Result<{ id: string; name: string }> => {
            if (id === 'invalid') {
                return Result.fail(Error.domain('USER_NOT_FOUND', 'User not found'));
            }
            return Result.ok({ id, name: `User ${id}` });
        };

        const fetchUserPreferences = (userId: string): Result<{ theme: string; language: string }> => {
            if (userId === 'no-prefs') {
                return Result.fail(Error.domain('PREFERENCES_NOT_FOUND', 'User preferences not found'));
            }
            return Result.ok({ theme: 'dark', language: 'en' });
        };

        const fetchUserOrders = (userId: string): Result<string[]> => {
            if (userId === 'no-orders') {
                return Result.fail(Error.domain('ORDERS_NOT_FOUND', 'User orders not found'));
            }
            return Result.ok([`order-1-${userId}`, `order-2-${userId}`]);
        };

        it('should combine multiple successful operations', () => {
            // Given
            const userId = 'user-123';

            // When
            const userResult = fetchUserById(userId);
            const preferencesResult = fetchUserPreferences(userId);
            const ordersResult = fetchUserOrders(userId);

            // Combine results manually (in a real scenario, you might use Result.combine)
            const combinedResult = userResult.bind(user =>
                preferencesResult.bind(preferences =>
                    ordersResult.map(orders => ({
                        user,
                        preferences,
                        orders
                    }))
                )
            );

            // Then
            expect(combinedResult.isSuccess).toBe(true);
            expect(combinedResult.value.user.name).toBe('User user-123');
            expect(combinedResult.value.preferences.theme).toBe('dark');
            expect(combinedResult.value.orders).toHaveLength(2);
        });

        it('should fail if any parallel operation fails', () => {
            // Given
            const userId = 'invalid';

            // When
            const userResult = fetchUserById(userId);
            const preferencesResult = fetchUserPreferences(userId);
            const ordersResult = fetchUserOrders(userId);

            const combinedResult = userResult.bind(user =>
                preferencesResult.bind(preferences =>
                    ordersResult.map(orders => ({
                        user,
                        preferences,
                        orders
                    }))
                )
            );

            // Then
            expect(combinedResult.isFailure).toBe(true);
            expect(combinedResult.error.code).toBe('USER_NOT_FOUND');
        });
    });

    describe('Should_HandleAsyncOperations_When_UsingPromiseBasedWorkflows', () => {
        const asyncValidateEmail = async (email: string): Promise<Result<string>> => {
            // Simulate async validation
            await new Promise(resolve => setTimeout(resolve, 10));

            if (!email.includes('@')) {
                return Result.fail(Error.validation('INVALID_EMAIL_FORMAT', 'Email must contain @'));
            }
            if (email.endsWith('@blocked.com')) {
                return Result.fail(Error.security('BLOCKED_DOMAIN', 'Email domain is blocked'));
            }
            return Result.ok(email);
        };

        const asyncCreateUser = async (email: string): Promise<Result<{ id: string; email: string }>> => {
            // Simulate async user creation
            await new Promise(resolve => setTimeout(resolve, 10));

            if (email === 'duplicate@example.com') {
                return Result.fail(Error.domain('USER_ALREADY_EXISTS', 'User with this email already exists'));
            }

            return Result.ok({
                id: `user-${Date.now()}`,
                email
            });
        };

        const asyncSendWelcomeEmail = async (user: { id: string; email: string }): Promise<Result<void>> => {
            // Simulate async email sending
            await new Promise(resolve => setTimeout(resolve, 10));

            if (user.email.includes('no-email')) {
                return Result.fail(Error.infrastructure('EMAIL_SERVICE_UNAVAILABLE', 'Email service is unavailable'));
            }

            return Result.ok();
        };

        it('should handle successful async workflow', async () => {
            // Given
            const email = 'user@example.com';

            // When
            const emailResult = await asyncValidateEmail(email);

            let finalResult: Result<void>;
            if (emailResult.isSuccess) {
                const userResult = await asyncCreateUser(emailResult.value);
                if (userResult.isSuccess) {
                    finalResult = await asyncSendWelcomeEmail(userResult.value);
                } else {
                    finalResult = userResult.error;
                }
            } else {
                finalResult = emailResult.error;
            }

            // Then
            expect(finalResult.isSuccess).toBe(true);
        });

        it('should handle async workflow with validation failure', async () => {
            // Given
            const email = 'invalid-email';

            // When
            const emailResult = await asyncValidateEmail(email);

            let finalResult: Result<void>;
            if (emailResult.isSuccess) {
                const userResult = await asyncCreateUser(emailResult.value);
                if (userResult.isSuccess) {
                    finalResult = await asyncSendWelcomeEmail(userResult.value);
                } else {
                    finalResult = userResult.error;
                }
            } else {
                finalResult = emailResult.error;
            }

            // Then
            expect(finalResult.isFailure).toBe(true);
            expect(finalResult.error.code).toBe('INVALID_EMAIL_FORMAT');
            expect(finalResult.error.category).toBe('Validation');
        });

        it('should handle async workflow with infrastructure failure', async () => {
            // Given
            const email = 'no-email@example.com';

            // When
            const emailResult = await asyncValidateEmail(email);

            let finalResult: Result<void>;
            if (emailResult.isSuccess) {
                const userResult = await asyncCreateUser(emailResult.value);
                if (userResult.isSuccess) {
                    finalResult = await asyncSendWelcomeEmail(userResult.value);
                } else {
                    finalResult = userResult.error;
                }
            } else {
                finalResult = emailResult.error;
            }

            // Then
            expect(finalResult.isFailure).toBe(true);
            expect(finalResult.error.code).toBe('EMAIL_SERVICE_UNAVAILABLE');
            expect(finalResult.error.category).toBe('Infrastructure');
        });
    });

    describe('Should_HandleEdgeCases_When_UsingResultInComplexScenarios', () => {
        it('should handle nested Result structures', () => {
            // Given
            const nestedResult = Result.ok(Result.ok(42));

            // When
            const flattenedResult = nestedResult.bind(innerResult => innerResult);

            // Then
            expect(flattenedResult.isSuccess).toBe(true);
            expect(flattenedResult.value).toBe(42);
        });

        it('should handle Result with undefined/null values', () => {
            // Given
            const undefinedResult = Result.ok(undefined);
            const nullResult = Result.ok(null);

            // When & Then
            expect(undefinedResult.isSuccess).toBe(true);
            expect(undefinedResult.value).toBeUndefined();

            expect(nullResult.isSuccess).toBe(true);
            expect(nullResult.value).toBeNull();
        });

        it('should handle Result transformations with different types', () => {
            // Given
            const numberResult = Result.ok(42);

            // When
            const stringResult = numberResult.map(n => n.toString());
            const booleanResult = numberResult.map(n => n > 0);
            const objectResult = numberResult.map(n => ({ value: n, doubled: n * 2 }));

            // Then
            expect(stringResult.isSuccess).toBe(true);
            expect(stringResult.value).toBe('42');

            expect(booleanResult.isSuccess).toBe(true);
            expect(booleanResult.value).toBe(true);

            expect(objectResult.isSuccess).toBe(true);
            expect(objectResult.value.value).toBe(42);
            expect(objectResult.value.doubled).toBe(84);
        });
    });
});