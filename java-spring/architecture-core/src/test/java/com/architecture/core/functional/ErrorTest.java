package com.architecture.core.functional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.*;

@DisplayName("Error Unit Tests")
@Execution(ExecutionMode.CONCURRENT)
class ErrorTest {

    @Nested
    @DisplayName("Error Construction")
    class ErrorConstructionTests {

        @Test
        @DisplayName("Should create error with all parameters")
        void Should_CreateError_When_AllParametersProvided() {
            // Given
            String code = "TEST.001";
            String message = "Test error message";
            ErrorCategory category = ErrorCategory.DOMAIN;
            Map<String, Object> metadata = Map.of("field", "value", "count", 42);
            RuntimeException cause = new RuntimeException("Root cause");

            // When
            Error error = new Error(code, message, category, metadata, cause);

            // Then
            assertThat(error.getCode()).isEqualTo(code);
            assertThat(error.getMessage()).isEqualTo(message);
            assertThat(error.getCategory()).isEqualTo(category);
            assertThat(error.getMetadata()).containsExactlyInAnyOrderEntriesOf(metadata);
            assertThat(error.getCause()).isPresent().contains(cause);
        }

        @Test
        @DisplayName("Should create error with null metadata")
        void Should_CreateError_When_MetadataIsNull() {
            // Given
            String code = "TEST.001";
            String message = "Test error message";
            ErrorCategory category = ErrorCategory.DOMAIN;

            // When
            Error error = new Error(code, message, category, null, null);

            // Then
            assertThat(error.getCode()).isEqualTo(code);
            assertThat(error.getMessage()).isEqualTo(message);
            assertThat(error.getCategory()).isEqualTo(category);
            assertThat(error.getMetadata()).isEmpty();
            assertThat(error.getCause()).isEmpty();
        }

        @Test
        @DisplayName("Should create error with empty metadata")
        void Should_CreateError_When_MetadataIsEmpty() {
            // Given
            String code = "TEST.001";
            String message = "Test error message";
            ErrorCategory category = ErrorCategory.DOMAIN;
            Map<String, Object> metadata = Map.of();

            // When
            Error error = new Error(code, message, category, metadata, null);

            // Then
            assertThat(error.getMetadata()).isEmpty();
        }

        @Test
        @DisplayName("Should reject null code")
        void Should_RejectNullCode_When_CreatingError() {
            // Given
            String message = "Test error message";
            ErrorCategory category = ErrorCategory.DOMAIN;

            // When & Then
            assertThatThrownBy(() -> new Error(null, message, category, null, null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Error code cannot be null");
        }

        @Test
        @DisplayName("Should reject null message")
        void Should_RejectNullMessage_When_CreatingError() {
            // Given
            String code = "TEST.001";
            ErrorCategory category = ErrorCategory.DOMAIN;

            // When & Then
            assertThatThrownBy(() -> new Error(code, null, category, null, null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Error message cannot be null");
        }

        @Test
        @DisplayName("Should reject null category")
        void Should_RejectNullCategory_When_CreatingError() {
            // Given
            String code = "TEST.001";
            String message = "Test error message";

            // When & Then
            assertThatThrownBy(() -> new Error(code, message, null, null, null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Error category cannot be null");
        }

        @Test
        @DisplayName("Should create immutable metadata copy")
        void Should_CreateImmutableMetadataCopy_When_CreatingError() {
            // Given
            String code = "TEST.001";
            String message = "Test error message";
            ErrorCategory category = ErrorCategory.DOMAIN;
            Map<String, Object> originalMetadata = new HashMap<>();
            originalMetadata.put("field", "value");

            // When
            Error error = new Error(code, message, category, originalMetadata, null);
            originalMetadata.put("newField", "newValue"); // Modify original

            // Then
            assertThat(error.getMetadata()).hasSize(1);
            assertThat(error.getMetadata()).containsEntry("field", "value");
            assertThat(error.getMetadata()).doesNotContainKey("newField");

            // Verify returned metadata is immutable
            assertThatThrownBy(() -> error.getMetadata().put("another", "value"))
                .isInstanceOf(UnsupportedOperationException.class);
        }
    }

    @Nested
    @DisplayName("Factory Methods")
    class FactoryMethodTests {

        @Test
        @DisplayName("Should create domain error")
        void Should_CreateDomainError_When_UsingDomainFactory() {
            // Given
            String code = "ORDER.INVALID_STATUS";
            String message = "Cannot transition order from CANCELLED to SHIPPED";

            // When
            Error error = Error.domain(code, message);

            // Then
            assertThat(error.getCode()).isEqualTo(code);
            assertThat(error.getMessage()).isEqualTo(message);
            assertThat(error.getCategory()).isEqualTo(ErrorCategory.DOMAIN);
            assertThat(error.getMetadata()).isEmpty();
            assertThat(error.getCause()).isEmpty();
        }

        @Test
        @DisplayName("Should create validation error with metadata")
        void Should_CreateValidationError_When_UsingValidationFactory() {
            // Given
            String code = "VALIDATION.REQUIRED_FIELD";
            String message = "Field 'email' is required";
            Map<String, Object> metadata = Map.of(
                "field", "email",
                "value", "",
                "constraint", "required"
            );

            // When
            Error error = Error.validation(code, message, metadata);

            // Then
            assertThat(error.getCode()).isEqualTo(code);
            assertThat(error.getMessage()).isEqualTo(message);
            assertThat(error.getCategory()).isEqualTo(ErrorCategory.VALIDATION);
            assertThat(error.getMetadata()).containsExactlyInAnyOrderEntriesOf(metadata);
            assertThat(error.getCause()).isEmpty();
        }

        @Test
        @DisplayName("Should create infrastructure error with cause")
        void Should_CreateInfrastructureError_When_UsingInfrastructureFactory() {
            // Given
            String code = "DATABASE.CONNECTION_FAILED";
            String message = "Unable to connect to database";
            RuntimeException cause = new RuntimeException("Connection timeout");

            // When
            Error error = Error.infrastructure(code, message, cause);

            // Then
            assertThat(error.getCode()).isEqualTo(code);
            assertThat(error.getMessage()).isEqualTo(message);
            assertThat(error.getCategory()).isEqualTo(ErrorCategory.INFRASTRUCTURE);
            assertThat(error.getMetadata()).isEmpty();
            assertThat(error.getCause()).isPresent().contains(cause);
        }

        @Test
        @DisplayName("Should create concurrency error")
        void Should_CreateConcurrencyError_When_UsingConcurrencyFactory() {
            // Given
            String code = "CONCURRENCY.OPTIMISTIC_LOCK_FAILED";
            String message = "Entity was modified by another transaction";

            // When
            Error error = Error.concurrency(code, message);

            // Then
            assertThat(error.getCode()).isEqualTo(code);
            assertThat(error.getMessage()).isEqualTo(message);
            assertThat(error.getCategory()).isEqualTo(ErrorCategory.CONCURRENCY);
            assertThat(error.getMetadata()).isEmpty();
            assertThat(error.getCause()).isEmpty();
        }

        @Test
        @DisplayName("Should create security error")
        void Should_CreateSecurityError_When_UsingSecurityFactory() {
            // Given
            String code = "SECURITY.UNAUTHORIZED_ACCESS";
            String message = "User does not have permission to access this resource";

            // When
            Error error = Error.security(code, message);

            // Then
            assertThat(error.getCode()).isEqualTo(code);
            assertThat(error.getMessage()).isEqualTo(message);
            assertThat(error.getCategory()).isEqualTo(ErrorCategory.SECURITY);
            assertThat(error.getMetadata()).isEmpty();
            assertThat(error.getCause()).isEmpty();
        }

        @ParameterizedTest(name = "Factory method for {0} category")
        @MethodSource("factoryMethodTestCases")
        @DisplayName("Should create errors with correct categories using factory methods")
        void Should_CreateErrorsWithCorrectCategories_When_UsingFactoryMethods(
            ErrorCategory expectedCategory, ErrorFactory factory) {
            // Given
            String code = "TEST.CODE";
            String message = "Test message";

            // When
            Error error = factory.create(code, message);

            // Then
            assertThat(error.getCategory()).isEqualTo(expectedCategory);
            assertThat(error.getCode()).isEqualTo(code);
            assertThat(error.getMessage()).isEqualTo(message);
        }

        static Stream<Arguments> factoryMethodTestCases() {
            return Stream.of(
                Arguments.of(ErrorCategory.DOMAIN, (ErrorFactory) Error::domain),
                Arguments.of(ErrorCategory.CONCURRENCY, (ErrorFactory) Error::concurrency),
                Arguments.of(ErrorCategory.SECURITY, (ErrorFactory) Error::security)
            );
        }

        @FunctionalInterface
        interface ErrorFactory {
            Error create(String code, String message);
        }
    }

    @Nested
    @DisplayName("Error Categories")
    class ErrorCategoryTests {

        @ParameterizedTest(name = "Category {0} should have correct display name")
        @EnumSource(ErrorCategory.class)
        @DisplayName("Should have correct display names for all categories")
        void Should_HaveCorrectDisplayNames_When_CheckingAllCategories(ErrorCategory category) {
            // Given & When
            String displayName = category.getDisplayName();
            String toStringResult = category.toString();

            // Then
            assertThat(displayName).isNotNull();
            assertThat(displayName).isNotEmpty();
            assertThat(toStringResult).isEqualTo(displayName);

            // Verify specific expected display names
            switch (category) {
                case DOMAIN:
                    assertThat(displayName).isEqualTo("Domain");
                    break;
                case VALIDATION:
                    assertThat(displayName).isEqualTo("Validation");
                    break;
                case INFRASTRUCTURE:
                    assertThat(displayName).isEqualTo("Infrastructure");
                    break;
                case CONCURRENCY:
                    assertThat(displayName).isEqualTo("Concurrency");
                    break;
                case SECURITY:
                    assertThat(displayName).isEqualTo("Security");
                    break;
            }
        }

        @Test
        @DisplayName("Should have all expected categories")
        void Should_HaveAllExpectedCategories_When_CheckingEnumValues() {
            // Given
            ErrorCategory[] categories = ErrorCategory.values();

            // When & Then
            assertThat(categories).hasSize(5);
            assertThat(categories).containsExactlyInAnyOrder(
                ErrorCategory.DOMAIN,
                ErrorCategory.VALIDATION,
                ErrorCategory.INFRASTRUCTURE,
                ErrorCategory.CONCURRENCY,
                ErrorCategory.SECURITY
            );
        }
    }

    @Nested
    @DisplayName("Error Metadata")
    class ErrorMetadataTests {

        @Test
        @DisplayName("Should support various metadata types")
        void Should_SupportVariousMetadataTypes_When_AddingMetadata() {
            // Given
            Map<String, Object> metadata = Map.of(
                "stringValue", "test",
                "intValue", 42,
                "boolValue", true,
                "doubleValue", 3.14,
                "nullValue", "notNull" // Can't have actual null in Map.of()
            );

            // When
            Error error = Error.validation("TEST.001", "Test message", metadata);

            // Then
            assertThat(error.getMetadata()).containsExactlyInAnyOrderEntriesOf(metadata);
            assertThat(error.getMetadata().get("stringValue")).isInstanceOf(String.class);
            assertThat(error.getMetadata().get("intValue")).isInstanceOf(Integer.class);
            assertThat(error.getMetadata().get("boolValue")).isInstanceOf(Boolean.class);
            assertThat(error.getMetadata().get("doubleValue")).isInstanceOf(Double.class);
        }

        @Test
        @DisplayName("Should handle large metadata maps")
        void Should_HandleLargeMetadataMaps_When_AddingManyEntries() {
            // Given
            Map<String, Object> metadata = new HashMap<>();
            for (int i = 0; i < 100; i++) {
                metadata.put("key" + i, "value" + i);
            }

            // When
            Error error = Error.validation("TEST.001", "Test message", metadata);

            // Then
            assertThat(error.getMetadata()).hasSize(100);
            assertThat(error.getMetadata()).containsExactlyInAnyOrderEntriesOf(metadata);
        }

        @Test
        @DisplayName("Should handle metadata with special characters")
        void Should_HandleMetadataWithSpecialCharacters_When_UsingSpecialKeys() {
            // Given
            Map<String, Object> metadata = Map.of(
                "key with spaces", "value",
                "key.with.dots", "value",
                "key-with-dashes", "value",
                "key_with_underscores", "value",
                "keyWith🚀Emoji", "value"
            );

            // When
            Error error = Error.validation("TEST.001", "Test message", metadata);

            // Then
            assertThat(error.getMetadata()).containsExactlyInAnyOrderEntriesOf(metadata);
        }
    }

    @Nested
    @DisplayName("Error Equality and HashCode")
    class EqualityTests {

        @Test
        @DisplayName("Should be equal when all fields match")
        void Should_BeEqual_When_AllFieldsMatch() {
            // Given
            String code = "TEST.001";
            String message = "Test message";
            ErrorCategory category = ErrorCategory.DOMAIN;
            Map<String, Object> metadata = Map.of("field", "value");
            RuntimeException cause = new RuntimeException("cause");

            Error error1 = new Error(code, message, category, metadata, cause);
            Error error2 = new Error(code, message, category, metadata, cause);

            // When & Then
            assertThat(error1).isEqualTo(error2);
            assertThat(error1.hashCode()).isEqualTo(error2.hashCode());
        }

        @Test
        @DisplayName("Should not be equal when codes differ")
        void Should_NotBeEqual_When_CodesDiffer() {
            // Given
            Error error1 = Error.domain("TEST.001", "Test message");
            Error error2 = Error.domain("TEST.002", "Test message");

            // When & Then
            assertThat(error1).isNotEqualTo(error2);
        }

        @Test
        @DisplayName("Should not be equal when messages differ")
        void Should_NotBeEqual_When_MessagesDiffer() {
            // Given
            Error error1 = Error.domain("TEST.001", "Message 1");
            Error error2 = Error.domain("TEST.001", "Message 2");

            // When & Then
            assertThat(error1).isNotEqualTo(error2);
        }

        @Test
        @DisplayName("Should not be equal when categories differ")
        void Should_NotBeEqual_When_CategoriesDiffer() {
            // Given
            Error error1 = Error.domain("TEST.001", "Test message");
            Error error2 = Error.validation("TEST.001", "Test message", Map.of());

            // When & Then
            assertThat(error1).isNotEqualTo(error2);
        }

        @Test
        @DisplayName("Should not be equal when metadata differs")
        void Should_NotBeEqual_When_MetadataDiffers() {
            // Given
            Error error1 = Error.validation("TEST.001", "Test message", Map.of("field", "value1"));
            Error error2 = Error.validation("TEST.001", "Test message", Map.of("field", "value2"));

            // When & Then
            assertThat(error1).isNotEqualTo(error2);
        }

        @Test
        @DisplayName("Should not be equal when causes differ")
        void Should_NotBeEqual_When_CausesDiffer() {
            // Given
            Error error1 = Error.infrastructure("TEST.001", "Test message", new RuntimeException("cause1"));
            Error error2 = Error.infrastructure("TEST.001", "Test message", new RuntimeException("cause2"));

            // When & Then
            assertThat(error1).isNotEqualTo(error2);
        }

        @Test
        @DisplayName("Should have consistent hashCode")
        void Should_HaveConsistentHashCode_When_CalledMultipleTimes() {
            // Given
            Error error = Error.domain("TEST.001", "Test message");

            // When
            int hashCode1 = error.hashCode();
            int hashCode2 = error.hashCode();

            // Then
            assertThat(hashCode1).isEqualTo(hashCode2);
        }

        @Test
        @DisplayName("Should handle null cause in equality")
        void Should_HandleNullCauseInEquality_When_ComparingErrors() {
            // Given
            Error error1 = Error.domain("TEST.001", "Test message");
            Error error2 = new Error("TEST.001", "Test message", ErrorCategory.DOMAIN, Map.of(), null);

            // When & Then
            assertThat(error1).isEqualTo(error2);
            assertThat(error1.hashCode()).isEqualTo(error2.hashCode());
        }
    }

    @Nested
    @DisplayName("String Representation")
    class StringRepresentationTests {

        @Test
        @DisplayName("Should provide meaningful string representation")
        void Should_ProvideMeaningfulStringRepresentation_When_CallingToString() {
            // Given
            String code = "TEST.001";
            String message = "Test error message";
            ErrorCategory category = ErrorCategory.DOMAIN;
            Error error = Error.domain(code, message);

            // When
            String stringRepresentation = error.toString();

            // Then
            assertThat(stringRepresentation).contains(code);
            assertThat(stringRepresentation).contains(message);
            assertThat(stringRepresentation).contains(category.getDisplayName());
            assertThat(stringRepresentation).startsWith("Error{");
        }

        @Test
        @DisplayName("Should include all key information in string")
        void Should_IncludeAllKeyInformation_When_ConvertingToString() {
            // Given
            Error error = Error.validation("VALIDATION.EMAIL", "Invalid email format",
                Map.of("field", "email", "value", "invalid-email"));

            // When
            String stringRepresentation = error.toString();

            // Then
            assertThat(stringRepresentation).contains("VALIDATION.EMAIL");
            assertThat(stringRepresentation).contains("Invalid email format");
            assertThat(stringRepresentation).contains("Validation");
        }
    }
}