import { Error, ErrorCategory } from '../../src/functional/error';

/**
 * Integration tests for Error chaining and categorization
 * Tests the complete error handling workflow across different scenarios
 */
describe('Error Integration Tests', () => {
    describe('Should_CreateAndCategorizeErrors_When_UsingDifferentErrorTypes', () => {
        it('should create domain errors with proper categorization', () => {
            // Given
            const errorCode = 'ORDER_INVALID_STATE';
            const errorMessage = 'Order cannot be modified in shipped state';
            const metadata = { orderId: 'order-123', currentState: 'shipped' };

            // When
            const domainError = Error.domain(errorCode, errorMessage, metadata);

            // Then
            expect(domainError.code).toBe(errorCode);
            expect(domainError.message).toBe(errorMessage);
            expect(domainError.category).toBe(ErrorCategory.Domain);
            expect(domainError.metadata).toEqual(metadata);
        });

        it('should create validation errors with field-specific metadata', () => {
            // Given
            const errorCode = 'VALIDATION_REQUIRED_FIELD';
            const errorMessage = 'Email address is required';
            const metadata = { field: 'email', value: null };

            // When
            const validationError = Error.validation(errorCode, errorMessage, metadata);

            // Then
            expect(validationError.code).toBe(errorCode);
            expect(validationError.message).toBe(errorMessage);
            expect(validationError.category).toBe(ErrorCategory.Validation);
            expect(validationError.metadata).toEqual(metadata);
        });

        it('should create infrastructure errors with system details', () => {
            // Given
            const errorCode = 'DATABASE_CONNECTION_FAILED';
            const errorMessage = 'Unable to connect to database';
            const metadata = { host: 'localhost', port: 5432, timeout: 30000 };

            // When
            const infrastructureError = Error.infrastructure(errorCode, errorMessage, metadata);

            // Then
            expect(infrastructureError.code).toBe(errorCode);
            expect(infrastructureError.message).toBe(errorMessage);
            expect(infrastructureError.category).toBe(ErrorCategory.Infrastructure);
            expect(infrastructureError.metadata).toEqual(metadata);
        });

        it('should create concurrency errors with version information', () => {
            // Given
            const errorCode = 'OPTIMISTIC_LOCK_FAILURE';
            const errorMessage = 'Entity was modified by another process';
            const metadata = { expectedVersion: 5, actualVersion: 7, entityId: 'entity-456' };

            // When
            const concurrencyError = Error.concurrency(errorCode, errorMessage, metadata);

            // Then
            expect(concurrencyError.code).toBe(errorCode);
            expect(concurrencyError.message).toBe(errorMessage);
            expect(concurrencyError.category).toBe(ErrorCategory.Concurrency);
            expect(concurrencyError.metadata).toEqual(metadata);
        });

        it('should create security errors with context information', () => {
            // Given
            const errorCode = 'UNAUTHORIZED_ACCESS';
            const errorMessage = 'User does not have permission to perform this action';
            const metadata = { userId: 'user-789', action: 'DELETE_ORDER', resource: 'orders' };

            // When
            const securityError = Error.security(errorCode, errorMessage, metadata);

            // Then
            expect(securityError.code).toBe(errorCode);
            expect(securityError.message).toBe(errorMessage);
            expect(securityError.category).toBe(ErrorCategory.Security);
            expect(securityError.metadata).toEqual(metadata);
        });
    });

    describe('Should_ChainErrorsCorrectly_When_ErrorsPropagateAcrossLayers', () => {
        it('should chain domain errors from different business operations', () => {
            // Given
            const originalError = Error.domain(
                'CUSTOMER_NOT_FOUND',
                'Customer with ID customer-123 does not exist',
                { customerId: 'customer-123' }
            );

            const chainedError = Error.domain(
                'ORDER_CREATION_FAILED',
                'Cannot create order for non-existent customer',
                {
                    originalError: originalError.code,
                    orderId: 'order-456',
                    customerId: 'customer-123'
                }
            );

            // When & Then
            expect(originalError.category).toBe(ErrorCategory.Domain);
            expect(chainedError.category).toBe(ErrorCategory.Domain);
            expect(chainedError.metadata.originalError).toBe(originalError.code);
        });

        it('should transform infrastructure errors to domain errors', () => {
            // Given
            const infrastructureError = Error.infrastructure(
                'DATABASE_TIMEOUT',
                'Query execution timed out after 30 seconds',
                { query: 'SELECT * FROM orders', timeout: 30000 }
            );

            const domainError = Error.domain(
                'ORDER_LOOKUP_FAILED',
                'Unable to retrieve order information',
                {
                    reason: infrastructureError.message,
                    originalErrorCode: infrastructureError.code,
                    orderId: 'order-789'
                }
            );

            // When & Then
            expect(infrastructureError.category).toBe(ErrorCategory.Infrastructure);
            expect(domainError.category).toBe(ErrorCategory.Domain);
            expect(domainError.metadata.originalErrorCode).toBe(infrastructureError.code);
        });

        it('should preserve error context through validation chains', () => {
            // Given
            const fieldErrors = [
                Error.validation('FIELD_REQUIRED', 'Name is required', { field: 'name' }),
                Error.validation('FIELD_TOO_LONG', 'Description exceeds maximum length', {
                    field: 'description',
                    maxLength: 500,
                    actualLength: 750
                }),
                Error.validation('FIELD_INVALID_FORMAT', 'Email format is invalid', {
                    field: 'email',
                    pattern: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$'
                })
            ];

            const aggregateError = Error.validation(
                'MULTIPLE_VALIDATION_ERRORS',
                'Request contains multiple validation errors',
                {
                    errorCount: fieldErrors.length,
                    fields: fieldErrors.map(e => e.metadata.field),
                    details: fieldErrors.map(e => ({ code: e.code, message: e.message, field: e.metadata.field }))
                }
            );

            // When & Then
            expect(aggregateError.category).toBe(ErrorCategory.Validation);
            expect(aggregateError.metadata.errorCount).toBe(3);
            expect(aggregateError.metadata.fields).toEqual(['name', 'description', 'email']);
            expect(aggregateError.metadata.details).toHaveLength(3);
        });
    });

    describe('Should_HandleErrorMetadata_When_TrackingComplexScenarios', () => {
        it('should maintain correlation IDs across error boundaries', () => {
            // Given
            const correlationId = 'correlation-123';
            const causationId = 'event-456';

            const error = Error.domain(
                'BUSINESS_RULE_VIOLATION',
                'Order total exceeds customer credit limit',
                {
                    correlationId,
                    causationId,
                    customerId: 'customer-789',
                    orderTotal: 5000,
                    creditLimit: 3000,
                    timestamp: new Date().toISOString()
                }
            );

            // When & Then
            expect(error.metadata.correlationId).toBe(correlationId);
            expect(error.metadata.causationId).toBe(causationId);
            expect(error.metadata.customerId).toBe('customer-789');
            expect(error.metadata.orderTotal).toBe(5000);
            expect(error.metadata.creditLimit).toBe(3000);
            expect(error.metadata.timestamp).toBeDefined();
        });

        it('should handle empty metadata gracefully', () => {
            // Given & When
            const errorWithoutMetadata = Error.domain('SIMPLE_ERROR', 'A simple error message');
            const errorWithEmptyMetadata = Error.domain('EMPTY_METADATA_ERROR', 'Error with empty metadata', {});

            // Then
            expect(errorWithoutMetadata.metadata).toEqual({});
            expect(errorWithEmptyMetadata.metadata).toEqual({});
        });

        it('should handle complex nested metadata structures', () => {
            // Given
            const complexMetadata = {
                request: {
                    id: 'req-123',
                    endpoint: '/api/orders',
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                        'user-agent': 'test-client/1.0'
                    }
                },
                user: {
                    id: 'user-456',
                    roles: ['customer', 'premium'],
                    sessionId: 'session-789'
                },
                business: {
                    operation: 'create-order',
                    rules: {
                        maxOrderValue: 10000,
                        allowedPaymentMethods: ['credit-card', 'paypal']
                    }
                },
                technical: {
                    stackTrace: 'Error\n    at OrderService.createOrder\n    at OrderController.handleCreateOrder',
                    performance: {
                        startTime: Date.now(),
                        memoryUsage: process.memoryUsage()
                    }
                }
            };

            // When
            const error = Error.domain(
                'COMPLEX_BUSINESS_ERROR',
                'Order creation failed due to multiple constraint violations',
                complexMetadata
            );

            // Then
            expect((error.metadata['request'] as any).id).toBe('req-123');
            expect((error.metadata['user'] as any).roles).toEqual(['customer', 'premium']);
            expect((error.metadata['business'] as any).operation).toBe('create-order');
            expect((error.metadata['technical'] as any).stackTrace).toContain('OrderService.createOrder');
        });
    });

    describe('Should_SerializeAndDeserialize_When_PersistingErrors', () => {
        it('should serialize error to JSON correctly', () => {
            // Given
            const error = Error.domain(
                'SERIALIZATION_TEST',
                'Test error for serialization',
                { orderId: 'order-123', timestamp: '2023-01-01T00:00:00.000Z' }
            );

            // When
            const serialized = JSON.stringify({
                code: error.code,
                message: error.message,
                category: error.category,
                metadata: error.metadata
            });

            const parsed = JSON.parse(serialized);

            // Then
            expect(parsed.code).toBe(error.code);
            expect(parsed.message).toBe(error.message);
            expect(parsed.category).toBe(error.category);
            expect(parsed.metadata).toEqual(error.metadata);
        });

        it('should reconstruct error from serialized data', () => {
            // Given
            const originalError = Error.validation(
                'RECONSTRUCTION_TEST',
                'Test error for reconstruction',
                { field: 'email', pattern: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$' }
            );

            const serializedData = {
                code: originalError.code,
                message: originalError.message,
                category: originalError.category,
                metadata: originalError.metadata
            };

            // When
            const reconstructedError = Error.validation(
                serializedData.code,
                serializedData.message,
                serializedData.metadata
            );

            // Then
            expect(reconstructedError.code).toBe(originalError.code);
            expect(reconstructedError.message).toBe(originalError.message);
            expect(reconstructedError.category).toBe(originalError.category);
            expect(reconstructedError.metadata).toEqual(originalError.metadata);
        });
    });

    describe('Should_HandleErrorComparison_When_CheckingErrorEquality', () => {
        it('should identify identical errors', () => {
            // Given
            const error1 = Error.domain('SAME_ERROR', 'Same error message', { key: 'value' });
            const error2 = Error.domain('SAME_ERROR', 'Same error message', { key: 'value' });

            // When & Then
            expect(error1.code).toBe(error2.code);
            expect(error1.message).toBe(error2.message);
            expect(error1.category).toBe(error2.category);
            expect(JSON.stringify(error1.metadata)).toBe(JSON.stringify(error2.metadata));
        });

        it('should differentiate errors with different metadata', () => {
            // Given
            const error1 = Error.domain('DIFFERENT_METADATA', 'Same message', { id: 1 });
            const error2 = Error.domain('DIFFERENT_METADATA', 'Same message', { id: 2 });

            // When & Then
            expect(error1.code).toBe(error2.code);
            expect(error1.message).toBe(error2.message);
            expect(error1.category).toBe(error2.category);
            expect(JSON.stringify(error1.metadata)).not.toBe(JSON.stringify(error2.metadata));
        });

        it('should differentiate errors across categories', () => {
            // Given
            const domainError = Error.domain('CROSS_CATEGORY', 'Test message');
            const validationError = Error.validation('CROSS_CATEGORY', 'Test message');
            const infrastructureError = Error.infrastructure('CROSS_CATEGORY', 'Test message');

            // When & Then
            expect(domainError.code).toBe(validationError.code);
            expect(domainError.code).toBe(infrastructureError.code);
            expect(domainError.message).toBe(validationError.message);
            expect(domainError.message).toBe(infrastructureError.message);

            expect(domainError.category).toBe(ErrorCategory.Domain);
            expect(validationError.category).toBe(ErrorCategory.Validation);
            expect(infrastructureError.category).toBe(ErrorCategory.Infrastructure);
        });
    });
});