// Error Contract Tests
// These tests define the behavioral contracts for the Error type
// Following TDD: These tests MUST FAIL initially before implementation

import { Error, ErrorCategory } from '../../src/functional';

describe('Error Contract Tests', () => {
  describe('Error Construction', () => {
    test('Should_CreateDomainError_When_ValidCodeAndMessage', () => {
      // Given
      const code = 'ORDER.INVALID_STATUS';
      const message = 'Order cannot be confirmed in this status';

      // When
      const error = Error.domain(code, message);

      // Then
      expect(error.code).toBe(code);
      expect(error.message).toBe(message);
      expect(error.category).toBe(ErrorCategory.Domain);
      expect(error.metadata).toEqual({});
    });

    test('Should_CreateValidationError_When_ValidCodeAndMessage', () => {
      // Given
      const code = 'VALIDATION.REQUIRED_FIELD';
      const message = 'Field is required';

      // When
      const error = Error.validation(code, message);

      // Then
      expect(error.code).toBe(code);
      expect(error.message).toBe(message);
      expect(error.category).toBe(ErrorCategory.Validation);
      expect(error.metadata).toEqual({});
    });

    test('Should_CreateInfrastructureError_When_ValidCodeAndMessage', () => {
      // Given
      const code = 'DATABASE.CONNECTION_FAILED';
      const message = 'Cannot connect to database';

      // When
      const error = Error.infrastructure(code, message);

      // Then
      expect(error.code).toBe(code);
      expect(error.message).toBe(message);
      expect(error.category).toBe(ErrorCategory.Infrastructure);
    });

    test('Should_CreateConcurrencyError_When_ValidCodeAndMessage', () => {
      // Given
      const code = 'CONCURRENCY.VERSION_CONFLICT';
      const message = 'Entity version conflict';

      // When
      const error = Error.concurrency(code, message);

      // Then
      expect(error.code).toBe(code);
      expect(error.message).toBe(message);
      expect(error.category).toBe(ErrorCategory.Concurrency);
    });

    test('Should_CreateSecurityError_When_ValidCodeAndMessage', () => {
      // Given
      const code = 'SECURITY.UNAUTHORIZED';
      const message = 'Access denied';

      // When
      const error = Error.security(code, message);

      // Then
      expect(error.code).toBe(code);
      expect(error.message).toBe(message);
      expect(error.category).toBe(ErrorCategory.Security);
    });
  });

  describe('Error with Metadata', () => {
    test('Should_IncludeMetadata_When_ProvidedInConstruction', () => {
      // Given
      const code = 'VALIDATION.RANGE_ERROR';
      const message = 'Value is out of range';
      const metadata = { min: 0, max: 100, actual: 150 };

      // When
      const error = Error.validation(code, message, metadata);

      // Then
      expect(error.metadata).toEqual(metadata);
      expect(error.metadata.min).toBe(0);
      expect(error.metadata.max).toBe(100);
      expect(error.metadata.actual).toBe(150);
    });

    test('Should_UseEmptyMetadata_When_NullMetadataProvided', () => {
      // Given
      const code = 'DOMAIN.BUSINESS_RULE';
      const message = 'Business rule violation';

      // When
      const error = Error.domain(code, message, null);

      // Then
      expect(error.metadata).toEqual({});
    });

    test('Should_UseEmptyMetadata_When_UndefinedMetadataProvided', () => {
      // Given
      const code = 'DOMAIN.BUSINESS_RULE';
      const message = 'Business rule violation';

      // When
      const error = Error.domain(code, message, undefined);

      // Then
      expect(error.metadata).toEqual({});
    });
  });

  describe('Error Immutability', () => {
    test('Should_BeImmutable_When_Created', () => {
      // Given
      const error = Error.domain('CODE', 'Message');

      // When/Then
      expect(() => {
        // @ts-expect-error - Testing immutability
        error.code = 'NEW_CODE';
      }).toThrow();

      expect(() => {
        // @ts-expect-error - Testing immutability
        error.message = 'New Message';
      }).toThrow();

      expect(() => {
        // @ts-expect-error - Testing immutability
        error.category = ErrorCategory.Validation;
      }).toThrow();
    });

    test('Should_PreventMetadataMutation_When_ErrorCreated', () => {
      // Given
      const metadata = { count: 1 };
      const error = Error.domain('CODE', 'Message', metadata);

      // When
      metadata.count = 2; // Mutate original

      // Then - Error should not be affected
      expect(error.metadata.count).toBe(1);
    });
  });

  describe('Error Type Guards', () => {
    test('Should_IdentifyErrorCategory_When_CheckingType', () => {
      // Given
      const domainError = Error.domain('CODE', 'Message');
      const validationError = Error.validation('CODE', 'Message');
      const infrastructureError = Error.infrastructure('CODE', 'Message');
      const concurrencyError = Error.concurrency('CODE', 'Message');
      const securityError = Error.security('CODE', 'Message');

      // When/Then
      expect(domainError.category).toBe(ErrorCategory.Domain);
      expect(validationError.category).toBe(ErrorCategory.Validation);
      expect(infrastructureError.category).toBe(ErrorCategory.Infrastructure);
      expect(concurrencyError.category).toBe(ErrorCategory.Concurrency);
      expect(securityError.category).toBe(ErrorCategory.Security);
    });
  });

  describe('Error Equality', () => {
    test('Should_BeEqual_When_SameCodeMessageAndCategory', () => {
      // Given
      const error1 = Error.domain('CODE', 'Message');
      const error2 = Error.domain('CODE', 'Message');

      // When/Then
      expect(error1).toEqual(error2);
    });

    test('Should_NotBeEqual_When_DifferentCode', () => {
      // Given
      const error1 = Error.domain('CODE1', 'Message');
      const error2 = Error.domain('CODE2', 'Message');

      // When/Then
      expect(error1).not.toEqual(error2);
    });

    test('Should_NotBeEqual_When_DifferentCategory', () => {
      // Given
      const error1 = Error.domain('CODE', 'Message');
      const error2 = Error.validation('CODE', 'Message');

      // When/Then
      expect(error1).not.toEqual(error2);
    });
  });
});