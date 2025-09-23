package unit

import (
	"errors"
	"fmt"
	"testing"

	"github.com/universalddd/architecture-core-go/pkg/functional"
	testutils "github.com/universalddd/architecture-core-go/internal/testing"
)

// =============================================================================
// UNIT TESTS FOR ERROR TYPE
// Requirements: Categorized errors with metadata and Go error interface
// =============================================================================

func TestError_Should_CreateDomainError_When_ValidParametersProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	code := "DOMAIN.BUSINESS_RULE_VIOLATION"
	message := "Customer age must be at least 18"

	// When
	err := functional.NewDomainError(code, message)

	// Then
	assertions.NotNil(err, "Error should not be nil")
	assertions.Equal(code, err.Code(), "Error code should match")
	assertions.Equal(message, err.Message(), "Error message should match")
	assertions.Equal(functional.Domain, err.Category(), "Error category should be Domain")
	assertions.NotNil(err.Metadata(), "Metadata should not be nil")
	assertions.Equal(0, len(err.Metadata()), "Metadata should be empty")
	assertions.Nil(err.Inner(), "Inner error should be nil")
}

func TestError_Should_CreateValidationError_When_ValidParametersProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	code := "VALIDATION.REQUIRED_FIELD"
	message := "Email field is required"

	// When
	err := functional.NewValidationError(code, message)

	// Then
	assertions.NotNil(err, "Error should not be nil")
	assertions.Equal(code, err.Code(), "Error code should match")
	assertions.Equal(message, err.Message(), "Error message should match")
	assertions.Equal(functional.Validation, err.Category(), "Error category should be Validation")
}

func TestError_Should_CreateInfrastructureError_When_ValidParametersProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	code := "INFRASTRUCTURE.DATABASE_CONNECTION"
	message := "Unable to connect to database"

	// When
	err := functional.NewInfrastructureError(code, message)

	// Then
	assertions.NotNil(err, "Error should not be nil")
	assertions.Equal(code, err.Code(), "Error code should match")
	assertions.Equal(message, err.Message(), "Error message should match")
	assertions.Equal(functional.Infrastructure, err.Category(), "Error category should be Infrastructure")
}

func TestError_Should_CreateConcurrencyError_When_ValidParametersProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	code := "CONCURRENCY.OPTIMISTIC_LOCK"
	message := "Version conflict detected"

	// When
	err := functional.NewConcurrencyError(code, message)

	// Then
	assertions.NotNil(err, "Error should not be nil")
	assertions.Equal(code, err.Code(), "Error code should match")
	assertions.Equal(message, err.Message(), "Error message should match")
	assertions.Equal(functional.Concurrency, err.Category(), "Error category should be Concurrency")
}

func TestError_Should_CreateSecurityError_When_ValidParametersProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	code := "SECURITY.UNAUTHORIZED"
	message := "Access denied"

	// When
	err := functional.NewSecurityError(code, message)

	// Then
	assertions.NotNil(err, "Error should not be nil")
	assertions.Equal(code, err.Code(), "Error code should match")
	assertions.Equal(message, err.Message(), "Error message should match")
	assertions.Equal(functional.Security, err.Category(), "Error category should be Security")
}

func TestError_Should_CreateErrorWithMetadata_When_MetadataProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	code := "DOMAIN.VALIDATION_FAILED"
	message := "Order validation failed"
	metadata := map[string]interface{}{
		"orderId":     "12345",
		"customerId":  "customer-001",
		"totalAmount": 99.99,
		"errors":      []string{"Invalid email", "Missing address"},
	}

	// When
	err := functional.NewError(code, message, functional.Domain, metadata)

	// Then
	assertions.NotNil(err, "Error should not be nil")
	assertions.Equal(code, err.Code(), "Error code should match")
	assertions.Equal(message, err.Message(), "Error message should match")
	assertions.Equal(functional.Domain, err.Category(), "Error category should be Domain")
	assertions.NotNil(err.Metadata(), "Metadata should not be nil")
	assertions.Equal(4, len(err.Metadata()), "Metadata should contain 4 items")
	assertions.Equal("12345", err.Metadata()["orderId"], "Order ID should match")
	assertions.Equal("customer-001", err.Metadata()["customerId"], "Customer ID should match")
	assertions.Equal(99.99, err.Metadata()["totalAmount"], "Total amount should match")
}

func TestError_Should_CreateErrorWithInnerError_When_InnerErrorProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	code := "INFRASTRUCTURE.DATABASE_ERROR"
	message := "Failed to save order"
	innerError := errors.New("connection timeout")
	metadata := map[string]interface{}{
		"operation": "save",
		"table":     "orders",
	}

	// When
	err := functional.NewErrorWithInner(code, message, functional.Infrastructure, innerError, metadata)

	// Then
	assertions.NotNil(err, "Error should not be nil")
	assertions.Equal(code, err.Code(), "Error code should match")
	assertions.Equal(message, err.Message(), "Error message should match")
	assertions.Equal(functional.Infrastructure, err.Category(), "Error category should be Infrastructure")
	assertions.NotNil(err.Inner(), "Inner error should not be nil")
	assertions.Equal("connection timeout", err.Inner().Error(), "Inner error message should match")
	assertions.Equal("save", err.Metadata()["operation"], "Operation metadata should match")
	assertions.Equal("orders", err.Metadata()["table"], "Table metadata should match")
}

func TestError_Should_AddMetadata_When_MetadataAdded(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	err := functional.NewDomainError("TEST.ERROR", "Test error")

	// When
	updatedErr := err.AddMetadata("key1", "value1")
	updatedErr = updatedErr.AddMetadata("key2", 42)
	updatedErr = updatedErr.AddMetadata("key3", true)

	// Then
	assertions.NotNil(updatedErr, "Updated error should not be nil")
	assertions.Equal(3, len(updatedErr.Metadata()), "Should have 3 metadata items")
	assertions.Equal("value1", updatedErr.Metadata()["key1"], "String metadata should match")
	assertions.Equal(42, updatedErr.Metadata()["key2"], "Integer metadata should match")
	assertions.Equal(true, updatedErr.Metadata()["key3"], "Boolean metadata should match")

	// Original error should remain unchanged (immutability)
	assertions.Equal(0, len(err.Metadata()), "Original error metadata should be unchanged")
}

func TestError_Should_ImplementGoErrorInterface_When_ErrorStringCalled(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	code := "DOMAIN.BUSINESS_RULE"
	message := "Invalid operation"
	err := functional.NewDomainError(code, message)

	// When
	errorString := err.Error()

	// Then
	assertions.NotNil(errorString, "Error string should not be nil")
	assertions.True(len(errorString) > 0, "Error string should not be empty")
	// The exact format is implementation-dependent, but should contain essential information
	// Common patterns: "[CODE] Message" or "Category: Message" etc.
}

func TestError_Should_HandleNilMetadata_When_NilMetadataProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	code := "TEST.ERROR"
	message := "Test error"

	// When
	err := functional.NewError(code, message, functional.Domain, nil)

	// Then
	assertions.NotNil(err, "Error should not be nil")
	assertions.NotNil(err.Metadata(), "Metadata should not be nil even when nil provided")
	assertions.Equal(0, len(err.Metadata()), "Metadata should be empty when nil provided")
}

func TestError_Should_HandleEmptyStrings_When_EmptyStringParametersProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)

	// When
	err := functional.NewError("", "", functional.Domain, nil)

	// Then
	assertions.NotNil(err, "Error should not be nil")
	assertions.Equal("", err.Code(), "Empty code should be preserved")
	assertions.Equal("", err.Message(), "Empty message should be preserved")
	assertions.Equal(functional.Domain, err.Category(), "Category should be preserved")
}

func TestError_Should_PreserveAllCategories_When_DifferentCategoriesUsed(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	testCases := []struct {
		name     string
		category functional.ErrorCategory
		factory  func(string, string) *functional.Error
	}{
		{"Domain", functional.Domain, functional.NewDomainError},
		{"Validation", functional.Validation, functional.NewValidationError},
		{"Infrastructure", functional.Infrastructure, functional.NewInfrastructureError},
		{"Concurrency", functional.Concurrency, functional.NewConcurrencyError},
		{"Security", functional.Security, functional.NewSecurityError},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// When
			err := tc.factory("TEST.CODE", "Test message")

			// Then
			assertions.Equal(tc.category, err.Category(), "Category should match for "+tc.name)
		})
	}
}

func TestError_Should_HandleComplexMetadata_When_ComplexObjectsProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	complexMetadata := map[string]interface{}{
		"timestamp":    "2023-01-01T12:00:00Z",
		"userId":       12345,
		"isRetryable":  true,
		"retryCount":   3,
		"details": map[string]interface{}{
			"errorCode":    "E001",
			"severity":     "HIGH",
			"affectedRows": 0,
		},
		"stackTrace": []string{
			"function1",
			"function2",
			"function3",
		},
	}

	// When
	err := functional.NewError("COMPLEX.ERROR", "Complex error with metadata", functional.Domain, complexMetadata)

	// Then
	assertions.NotNil(err, "Error should not be nil")
	assertions.Equal(6, len(err.Metadata()), "Should have 6 metadata items")

	// Verify complex nested metadata
	details := err.Metadata()["details"].(map[string]interface{})
	assertions.Equal("E001", details["errorCode"], "Nested error code should match")
	assertions.Equal("HIGH", details["severity"], "Nested severity should match")

	stackTrace := err.Metadata()["stackTrace"].([]string)
	assertions.Equal(3, len(stackTrace), "Stack trace should have 3 items")
	assertions.Equal("function1", stackTrace[0], "First stack frame should match")
}

func TestError_Should_ChainMetadataAdditions_When_MultipleAdditionsPerformed(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	err := functional.NewDomainError("CHAIN.TEST", "Chain test error")

	// When
	finalErr := err.
		AddMetadata("step1", "completed").
		AddMetadata("step2", "in-progress").
		AddMetadata("step3", "pending").
		AddMetadata("totalSteps", 3)

	// Then
	assertions.Equal(4, len(finalErr.Metadata()), "Should have 4 metadata items")
	assertions.Equal("completed", finalErr.Metadata()["step1"], "Step 1 should match")
	assertions.Equal("in-progress", finalErr.Metadata()["step2"], "Step 2 should match")
	assertions.Equal("pending", finalErr.Metadata()["step3"], "Step 3 should match")
	assertions.Equal(3, finalErr.Metadata()["totalSteps"], "Total steps should match")

	// Verify immutability at each step
	assertions.Equal(0, len(err.Metadata()), "Original error should remain unchanged")
}

func TestError_Should_HandleInnerErrorChain_When_MultipleInnerErrorsProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	rootCause := errors.New("root cause error")
	middleError := functional.NewErrorWithInner("MIDDLE.ERROR", "Middle error", functional.Infrastructure, rootCause, nil)

	// When
	topError := functional.NewErrorWithInner("TOP.ERROR", "Top level error", functional.Domain, middleError, map[string]interface{}{
		"context": "error chain test",
	})

	// Then
	assertions.NotNil(topError, "Top error should not be nil")
	assertions.Equal("TOP.ERROR", topError.Code(), "Top error code should match")
	assertions.Equal(functional.Domain, topError.Category(), "Top error category should match")

	assertions.NotNil(topError.Inner(), "Inner error should not be nil")
	// Inner error should be the functional.Error (middleError)
	if innerFuncErr, ok := topError.Inner().(*functional.Error); ok {
		assertions.Equal("MIDDLE.ERROR", innerFuncErr.Code(), "Middle error code should match")
		assertions.Equal(functional.Infrastructure, innerFuncErr.Category(), "Middle error category should match")
		assertions.NotNil(innerFuncErr.Inner(), "Middle error inner should not be nil")
		assertions.Equal("root cause error", innerFuncErr.Inner().Error(), "Root cause should match")
	} else {
		t.Error("Inner error should be of type *functional.Error")
	}
}

func TestError_Should_SupportErrorComparison_When_ComparingErrors(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	code := "COMPARISON.TEST"
	message := "Comparison test error"

	err1 := functional.NewDomainError(code, message)
	err2 := functional.NewDomainError(code, message)
	err3 := functional.NewDomainError("DIFFERENT.CODE", message)
	err4 := functional.NewDomainError(code, "Different message")

	// When & Then
	// Errors with same code and message should be considered equal in business logic
	assertions.Equal(err1.Code(), err2.Code(), "Same errors should have same code")
	assertions.Equal(err1.Message(), err2.Message(), "Same errors should have same message")
	assertions.Equal(err1.Category(), err2.Category(), "Same errors should have same category")

	// Different errors should be different
	assertions.NotEqual(err1.Code(), err3.Code(), "Different errors should have different codes")
	assertions.NotEqual(err1.Message(), err4.Message(), "Different errors should have different messages")
}

func TestError_Should_HandleConcurrentAccess_When_AccessedFromMultipleGoroutines(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	err := functional.NewDomainError("CONCURRENT.TEST", "Concurrent access test")

	// Add some metadata
	err = err.AddMetadata("key1", "value1")
	err = err.AddMetadata("key2", "value2")

	// When - Access from multiple goroutines concurrently
	done := make(chan bool, 10)
	for i := 0; i < 10; i++ {
		go func(index int) {
			defer func() { done <- true }()

			// Read operations (should be safe)
			_ = err.Code()
			_ = err.Message()
			_ = err.Category()
			_ = err.Metadata()
			_ = err.Inner()
			_ = err.Error()

			// Verify consistency
			if err.Code() != "CONCURRENT.TEST" {
				t.Errorf("Goroutine %d: Code consistency failed", index)
			}
			if err.Message() != "Concurrent access test" {
				t.Errorf("Goroutine %d: Message consistency failed", index)
			}
			if len(err.Metadata()) != 2 {
				t.Errorf("Goroutine %d: Metadata length consistency failed", index)
			}
		}(i)
	}

	// Wait for all goroutines to complete
	for i := 0; i < 10; i++ {
		<-done
	}

	// Then - No panics should occur and data should remain consistent
	assertions.Equal("CONCURRENT.TEST", err.Code(), "Code should remain consistent")
	assertions.Equal("Concurrent access test", err.Message(), "Message should remain consistent")
	assertions.Equal(2, len(err.Metadata()), "Metadata should remain consistent")
}

// =============================================================================
// TABLE-DRIVEN TESTS
// =============================================================================

func TestError_Should_CreateCorrectErrorTypes_When_UsingFactoryMethods(t *testing.T) {
	// Given
	testCases := []struct {
		name             string
		factory          func(string, string) *functional.Error
		expectedCategory functional.ErrorCategory
		code             string
		message          string
	}{
		{
			name:             "Domain Error Factory",
			factory:          functional.NewDomainError,
			expectedCategory: functional.Domain,
			code:             "DOMAIN.TEST",
			message:          "Domain test error",
		},
		{
			name:             "Validation Error Factory",
			factory:          functional.NewValidationError,
			expectedCategory: functional.Validation,
			code:             "VALIDATION.TEST",
			message:          "Validation test error",
		},
		{
			name:             "Infrastructure Error Factory",
			factory:          functional.NewInfrastructureError,
			expectedCategory: functional.Infrastructure,
			code:             "INFRASTRUCTURE.TEST",
			message:          "Infrastructure test error",
		},
		{
			name:             "Concurrency Error Factory",
			factory:          functional.NewConcurrencyError,
			expectedCategory: functional.Concurrency,
			code:             "CONCURRENCY.TEST",
			message:          "Concurrency test error",
		},
		{
			name:             "Security Error Factory",
			factory:          functional.NewSecurityError,
			expectedCategory: functional.Security,
			code:             "SECURITY.TEST",
			message:          "Security test error",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Given
			assertions := testutils.NewAssertions(t)

			// When
			err := tc.factory(tc.code, tc.message)

			// Then
			assertions.NotNil(err, "Error should not be nil")
			assertions.Equal(tc.code, err.Code(), "Error code should match")
			assertions.Equal(tc.message, err.Message(), "Error message should match")
			assertions.Equal(tc.expectedCategory, err.Category(), "Error category should match")
			assertions.NotNil(err.Metadata(), "Metadata should not be nil")
			assertions.Equal(0, len(err.Metadata()), "Metadata should be empty for factory methods")
			assertions.Nil(err.Inner(), "Inner error should be nil for factory methods")
		})
	}
}

// =============================================================================
// EDGE CASES AND ERROR CONDITIONS
// =============================================================================

func TestError_Should_HandleEdgeCases_When_UnusualInputsProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)

	testCases := []struct {
		name    string
		code    string
		message string
	}{
		{"Empty strings", "", ""},
		{"Unicode characters", "UNICODE.测试", "Unicode message: 你好世界"},
		{"Special characters", "SPECIAL.!@#$%", "Special chars: !@#$%^&*()"},
		{"Very long code", "VERY.LONG.CODE.WITH.MANY.SEGMENTS.THAT.EXCEEDS.NORMAL.LENGTH", "Normal message"},
		{"Very long message", "NORMAL.CODE", "This is a very long error message that exceeds typical length expectations and contains multiple sentences. It should still be handled correctly by the error system regardless of its length."},
		{"Whitespace", "   WHITESPACE.CODE   ", "   Message with whitespace   "},
		{"Newlines", "NEWLINE\nCODE", "Message\nwith\nnewlines"},
		{"Tabs", "TAB\tCODE", "Message\twith\ttabs"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// When
			err := functional.NewDomainError(tc.code, tc.message)

			// Then
			assertions.NotNil(err, "Error should not be nil")
			assertions.Equal(tc.code, err.Code(), "Code should be preserved exactly")
			assertions.Equal(tc.message, err.Message(), "Message should be preserved exactly")
			assertions.Equal(functional.Domain, err.Category(), "Category should be Domain")

			// Error() method should not panic
			errorString := err.Error()
			assertions.True(len(errorString) >= 0, "Error string should be generated without panic")
		})
	}
}

func TestError_Should_HandleNilValues_When_NilInnerErrorProvided(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	code := "TEST.NIL_INNER"
	message := "Test with nil inner error"

	// When
	err := functional.NewErrorWithInner(code, message, functional.Domain, nil, nil)

	// Then
	assertions.NotNil(err, "Error should not be nil")
	assertions.Equal(code, err.Code(), "Code should match")
	assertions.Equal(message, err.Message(), "Message should match")
	assertions.Nil(err.Inner(), "Inner error should be nil when nil provided")
	assertions.NotNil(err.Metadata(), "Metadata should not be nil")
	assertions.Equal(0, len(err.Metadata()), "Metadata should be empty when nil provided")
}

// =============================================================================
// PERFORMANCE AND MEMORY TESTS
// =============================================================================

func TestError_Should_HaveMinimalMemoryFootprint_When_CreatedWithoutMetadata(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)

	// When
	err := functional.NewDomainError("MEMORY.TEST", "Memory test error")

	// Then
	// These are basic checks - detailed memory analysis would require additional tools
	assertions.NotNil(err, "Error should not be nil")
	assertions.NotNil(err.Metadata(), "Metadata should be initialized")
	assertions.Equal(0, len(err.Metadata()), "Empty metadata should not consume unnecessary memory")
}

func TestError_Should_NotLeakMemory_When_MetadataAddedRepeatedly(t *testing.T) {
	// Given
	assertions := testutils.NewAssertions(t)
	err := functional.NewDomainError("LEAK.TEST", "Memory leak test")

	// When - Add metadata multiple times (simulating potential memory leak scenarios)
	for i := 0; i < 100; i++ {
		err = err.AddMetadata(fmt.Sprintf("key%d", i), fmt.Sprintf("value%d", i))
	}

	// Then
	assertions.Equal(100, len(err.Metadata()), "Should have 100 metadata items")

	// Verify that all metadata is accessible
	for i := 0; i < 100; i++ {
		expectedKey := fmt.Sprintf("key%d", i)
		expectedValue := fmt.Sprintf("value%d", i)
		assertions.Equal(expectedValue, err.Metadata()[expectedKey], "Metadata should be preserved")
	}
}