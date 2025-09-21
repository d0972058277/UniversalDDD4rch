package contract

import (
	"testing"

	"github.com/universalddd/architecture-core-go/pkg/functional"
)

// TestError_Should_ProvideCategorizedErrorHandling_When_Used
func TestError_Should_ProvideCategorizedErrorHandling_When_Used(t *testing.T) {
	t.Run("Should_CreateDomainError_When_DomainFactoryCalled", func(t *testing.T) {
		// Given: Creating a domain error
		code := "INVALID_BUSINESS_RULE"
		message := "Customer cannot have negative balance"
		err := functional.DomainError(code, message)

		// When: Checking error properties
		// Then: Should have correct category and details
		if err.Category() != functional.Domain {
			t.Error("Domain error should have Domain category")
		}
		if err.Code() != code {
			t.Errorf("Expected code '%s', got '%s'", code, err.Code())
		}
		if err.Message() != message {
			t.Errorf("Expected message '%s', got '%s'", message, err.Message())
		}
	})

	t.Run("Should_CreateValidationError_When_ValidationFactoryCalled", func(t *testing.T) {
		// Given: Creating a validation error
		code := "REQUIRED_FIELD"
		message := "Email address is required"
		err := functional.ValidationError(code, message)

		// When: Checking error properties
		// Then: Should have correct category
		if err.Category() != functional.Validation {
			t.Error("Validation error should have Validation category")
		}
		if err.Code() != code || err.Message() != message {
			t.Error("Validation error should preserve code and message")
		}
	})

	t.Run("Should_CreateInfrastructureError_When_InfrastructureFactoryCalled", func(t *testing.T) {
		// Given: Creating an infrastructure error
		code := "DATABASE_CONNECTION"
		message := "Unable to connect to database"
		err := functional.InfrastructureError(code, message)

		// When: Checking error properties
		// Then: Should have correct category
		if err.Category() != functional.Infrastructure {
			t.Error("Infrastructure error should have Infrastructure category")
		}
	})

	t.Run("Should_CreateConcurrencyError_When_ConcurrencyFactoryCalled", func(t *testing.T) {
		// Given: Creating a concurrency error
		code := "OPTIMISTIC_LOCK"
		message := "Entity was modified by another process"
		err := functional.ConcurrencyError(code, message)

		// When: Checking error properties
		// Then: Should have correct category
		if err.Category() != functional.Concurrency {
			t.Error("Concurrency error should have Concurrency category")
		}
	})

	t.Run("Should_CreateSecurityError_When_SecurityFactoryCalled", func(t *testing.T) {
		// Given: Creating a security error
		code := "UNAUTHORIZED_ACCESS"
		message := "User does not have permission to perform this action"
		err := functional.SecurityError(code, message)

		// When: Checking error properties
		// Then: Should have correct category
		if err.Category() != functional.Security {
			t.Error("Security error should have Security category")
		}
	})

	t.Run("Should_StoreMetadata_When_MetadataProvided", func(t *testing.T) {
		// Given: Creating error with metadata
		metadata := map[string]interface{}{
			"userId":       "user-123",
			"attemptCount": 3,
			"timestamp":    "2023-12-01T10:00:00Z",
		}
		err := functional.DomainErrorWithMetadata("BUSINESS_RULE", "Rule violation", metadata)

		// When: Getting metadata
		storedMetadata := err.Metadata()

		// Then: Should preserve metadata
		if len(storedMetadata) != len(metadata) {
			t.Error("Metadata should be stored completely")
		}

		for key, value := range metadata {
			if storedMetadata[key] != value {
				t.Errorf("Metadata key '%s' expected '%v', got '%v'", key, value, storedMetadata[key])
			}
		}
	})

	t.Run("Should_HandleEmptyMetadata_When_NoMetadataProvided", func(t *testing.T) {
		// Given: Creating error without metadata
		err := functional.DomainError("SIMPLE_ERROR", "Simple error message")

		// When: Getting metadata
		metadata := err.Metadata()

		// Then: Should return empty metadata (not nil)
		if metadata == nil {
			t.Error("Metadata should not be nil")
		}
		if len(metadata) != 0 {
			t.Error("Metadata should be empty when not provided")
		}
	})

	t.Run("Should_SupportErrorComparison_When_SameError", func(t *testing.T) {
		// Given: Two identical errors
		err1 := functional.DomainError("SAME_ERROR", "Same message")
		err2 := functional.DomainError("SAME_ERROR", "Same message")

		// When: Comparing errors
		// Then: Should be considered equal (implementation dependent)
		if err1.Code() != err2.Code() || err1.Message() != err2.Message() {
			t.Error("Identical errors should have same code and message")
		}
	})

	t.Run("Should_ProvideStringRepresentation_When_ErrorConverted", func(t *testing.T) {
		// Given: An error
		err := functional.DomainError("TEST_ERROR", "Test error message")

		// When: Getting string representation
		str := err.String()

		// Then: Should include relevant information
		if str == "" {
			t.Error("Error string representation should not be empty")
		}
		// Implementation specific - could check for code/message inclusion
	})

	t.Run("Should_CategorizeCorrectly_When_DifferentErrorTypes", func(t *testing.T) {
		// Given: Different error categories
		domain := functional.DomainError("DOMAIN", "Domain error")
		validation := functional.ValidationError("VALIDATION", "Validation error")
		infrastructure := functional.InfrastructureError("INFRA", "Infrastructure error")
		concurrency := functional.ConcurrencyError("CONCURRENCY", "Concurrency error")
		security := functional.SecurityError("SECURITY", "Security error")

		// When: Getting categories
		// Then: Should have correct categories
		categories := []functional.ErrorCategory{
			domain.Category(),
			validation.Category(),
			infrastructure.Category(),
			concurrency.Category(),
			security.Category(),
		}

		expected := []functional.ErrorCategory{
			functional.Domain,
			functional.Validation,
			functional.Infrastructure,
			functional.Concurrency,
			functional.Security,
		}

		for i, category := range categories {
			if category != expected[i] {
				t.Errorf("Category %d: expected %v, got %v", i, expected[i], category)
			}
		}
	})
}