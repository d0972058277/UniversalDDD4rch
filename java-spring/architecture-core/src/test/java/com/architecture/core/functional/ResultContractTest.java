package com.architecture.core.functional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.Map;
import java.util.function.Function;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.*;

/**
 * Contract tests for Result monadic laws compliance.
 * Tests that Result<T> implementations must satisfy mathematical monadic laws.
 *
 * Requirements: FR-008, FR-011, FR-013 - Result with monadic operations
 * Test naming: Should_ExpectedBehavior_When_StateUnderTest
 */
@DisplayName("Result Contract Tests")
class ResultContractTest {

    @Nested
    @DisplayName("Result Monadic Laws")
    class ResultMonadicLaws {

        @Test
        @DisplayName("Should_SatisfyLeftIdentityLaw_When_BindingFunction")
        void Should_SatisfyLeftIdentityLaw_When_BindingFunction() {
            // Given - Left Identity Law: return(a).bind(f) == f(a)
            Integer value = 42;
            Function<Integer, Result<String>> f = x -> Result.success(String.valueOf(x * 2));

            // When
            Result<String> leftSide = Result.success(value).bind(f);
            Result<String> rightSide = f.apply(value);

            // Then
            assertThat(leftSide.isSuccess()).isEqualTo(rightSide.isSuccess());
            if (leftSide.isSuccess()) {
                assertThat(leftSide.getValue()).isEqualTo(rightSide.getValue());
            } else {
                assertThat(leftSide.getError()).isEqualTo(rightSide.getError());
            }
        }

        @Test
        @DisplayName("Should_SatisfyRightIdentityLaw_When_BindingReturn")
        void Should_SatisfyRightIdentityLaw_When_BindingReturn() {
            // Given - Right Identity Law: m.bind(return) == m
            Result<Integer> originalResult = Result.success(42);

            // When
            Result<Integer> boundResult = originalResult.bind(Result::success);

            // Then
            assertThat(boundResult.isSuccess()).isEqualTo(originalResult.isSuccess());
            if (boundResult.isSuccess()) {
                assertThat(boundResult.getValue()).isEqualTo(originalResult.getValue());
            }
        }

        @Test
        @DisplayName("Should_SatisfyAssociativityLaw_When_ChiningBinds")
        void Should_SatisfyAssociativityLaw_When_ChiningBinds() {
            // Given - Associativity Law: m.bind(f).bind(g) == m.bind(x -> f(x).bind(g))
            Result<Integer> m = Result.success(42);
            Function<Integer, Result<String>> f = x -> Result.success("Value: " + x);
            Function<String, Result<Integer>> g = s -> Result.success(s.length());

            // When
            Result<Integer> leftSide = m.bind(f).bind(g);
            Result<Integer> rightSide = m.bind(x -> f.apply(x).bind(g));

            // Then
            assertThat(leftSide.isSuccess()).isEqualTo(rightSide.isSuccess());
            if (leftSide.isSuccess()) {
                assertThat(leftSide.getValue()).isEqualTo(rightSide.getValue());
            } else {
                assertThat(leftSide.getError()).isEqualTo(rightSide.getError());
            }
        }

        @ParameterizedTest(name = "Monadic laws should hold for value: {0}")
        @MethodSource("monadicLawTestValues")
        @DisplayName("Should_SatisfyMonadicLaws_When_VariousValuesProvided")
        void Should_SatisfyMonadicLaws_When_VariousValuesProvided(Integer value) {
            // Given
            Function<Integer, Result<String>> f = x -> Result.success("F(" + x + ")");
            Function<String, Result<Integer>> g = s -> Result.success(s.length());

            // When - Test all three laws
            Result<String> leftIdentity = Result.success(value).bind(f);
            Result<String> rightIdentity = f.apply(value);

            Result<Integer> originalResult = Result.success(value);
            Result<Integer> boundWithIdentity = originalResult.bind(Result::success);

            Result<Integer> associativityLeft = Result.success(value).bind(f).bind(g);
            Result<Integer> associativityRight = Result.success(value).bind(x -> f.apply(x).bind(g));

            // Then
            assertThat(leftIdentity.getValue()).isEqualTo(rightIdentity.getValue());
            assertThat(boundWithIdentity.getValue()).isEqualTo(originalResult.getValue());
            assertThat(associativityLeft.getValue()).isEqualTo(associativityRight.getValue());
        }

        private static Stream<Arguments> monadicLawTestValues() {
            return Stream.of(
                Arguments.of(0),
                Arguments.of(1),
                Arguments.of(-1),
                Arguments.of(42),
                Arguments.of(Integer.MAX_VALUE),
                Arguments.of(Integer.MIN_VALUE)
            );
        }
    }

    @Nested
    @DisplayName("Result Error Handling")
    class ResultErrorHandling {

        @Test
        @DisplayName("Should_PropagateError_When_BindingOnFailure")
        void Should_PropagateError_When_BindingOnFailure() {
            // Given
            Error originalError = Error.domain("TEST.ERROR", "Test error");
            Result<String> failureResult = Result.failure(originalError);
            Function<String, Result<Integer>> mapper = s -> Result.success(s.length());

            // When
            Result<Integer> boundResult = failureResult.bind(mapper);

            // Then
            assertThat(boundResult.isFailure()).isTrue();
            assertThat(boundResult.getError()).isEqualTo(originalError);
        }

        @Test
        @DisplayName("Should_PropagateError_When_MappingOnFailure")
        void Should_PropagateError_When_MappingOnFailure() {
            // Given
            Error originalError = Error.validation("VALIDATION.ERROR", "Validation failed", Map.of());
            Result<String> failureResult = Result.failure(originalError);
            Function<String, Integer> mapper = String::length;

            // When
            Result<Integer> mappedResult = failureResult.map(mapper);

            // Then
            assertThat(mappedResult.isFailure()).isTrue();
            assertThat(mappedResult.getError()).isEqualTo(originalError);
        }

        @Test
        @DisplayName("Should_HandleException_When_MapperThrows")
        void Should_HandleException_When_MapperThrows() {
            // Given
            Result<String> successResult = Result.success("test");
            Function<String, Integer> throwingMapper = s -> {
                throw new RuntimeException("Mapper error");
            };

            // When
            Result<Integer> result = successResult.map(throwingMapper);

            // Then
            assertThat(result.isFailure()).isTrue();
            assertThat(result.getError().getCategory()).isEqualTo(ErrorCategory.INFRASTRUCTURE);
            assertThat(result.getError().getCode()).isEqualTo("Mapping.Failed");
        }

        @Test
        @DisplayName("Should_HandleException_When_BinderThrows")
        void Should_HandleException_When_BinderThrows() {
            // Given
            Result<String> successResult = Result.success("test");
            Function<String, Result<Integer>> throwingBinder = s -> {
                throw new RuntimeException("Binder error");
            };

            // When
            Result<Integer> result = successResult.bind(throwingBinder);

            // Then
            assertThat(result.isFailure()).isTrue();
            assertThat(result.getError().getCategory()).isEqualTo(ErrorCategory.INFRASTRUCTURE);
            assertThat(result.getError().getCode()).isEqualTo("Binding.Failed");
        }
    }

    @Nested
    @DisplayName("Result Type Conversions")
    class ResultTypeConversions {

        @Test
        @DisplayName("Should_ConvertToOptional_When_Success")
        void Should_ConvertToOptional_When_Success() {
            // Given
            Result<String> successResult = Result.success("test");

            // When
            java.util.Optional<String> optional = successResult.match(
                value -> java.util.Optional.of(value),
                error -> java.util.Optional.empty()
            );

            // Then
            assertThat(optional).isPresent();
            assertThat(optional.get()).isEqualTo("test");
        }

        @Test
        @DisplayName("Should_ConvertToOptional_When_Failure")
        void Should_ConvertToOptional_When_Failure() {
            // Given
            Result<String> failureResult = Result.failure("ERROR", "Error message");

            // When
            java.util.Optional<String> optional = failureResult.match(
                value -> java.util.Optional.of(value),
                error -> java.util.Optional.empty()
            );

            // Then
            assertThat(optional).isEmpty();
        }

        @Test
        @DisplayName("Should_GetValueOrDefault_When_Success")
        void Should_GetValueOrDefault_When_Success() {
            // Given
            Result<String> successResult = Result.success("actual");
            String defaultValue = "default";

            // When
            String result = successResult.getValueOrDefault(defaultValue);

            // Then
            assertThat(result).isEqualTo("actual");
        }

        @Test
        @DisplayName("Should_GetValueOrDefault_When_Failure")
        void Should_GetValueOrDefault_When_Failure() {
            // Given
            Result<String> failureResult = Result.failure("ERROR", "Error message");
            String defaultValue = "default";

            // When
            String result = failureResult.getValueOrDefault(defaultValue);

            // Then
            assertThat(result).isEqualTo("default");
        }

        @Test
        @DisplayName("Should_ThrowResultException_When_GetValueOrThrowOnFailure")
        void Should_ThrowResultException_When_GetValueOrThrowOnFailure() {
            // Given
            Error error = Error.domain("DOMAIN.ERROR", "Domain error");
            Result<String> failureResult = Result.failure(error);

            // When & Then
            assertThatThrownBy(failureResult::getValueOrThrow)
                .isInstanceOf(ResultException.class)
                .hasMessageContaining("Domain error")
                .extracting("error")
                .isEqualTo(error);
        }
    }

    @Nested
    @DisplayName("Result State Queries")
    class ResultStateQueries {

        @Test
        @DisplayName("Should_ReturnTrue_When_SuccessResultCheckedForSuccess")
        void Should_ReturnTrue_When_SuccessResultCheckedForSuccess() {
            // Given
            Result<String> result = Result.success("test");

            // When & Then
            assertThat(result.isSuccess()).isTrue();
            assertThat(result.isFailure()).isFalse();
        }

        @Test
        @DisplayName("Should_ReturnTrue_When_FailureResultCheckedForFailure")
        void Should_ReturnTrue_When_FailureResultCheckedForFailure() {
            // Given
            Result<String> result = Result.failure("ERROR", "Error message");

            // When & Then
            assertThat(result.isFailure()).isTrue();
            assertThat(result.isSuccess()).isFalse();
        }

        @Test
        @DisplayName("Should_ThrowException_When_GetValueOnFailure")
        void Should_ThrowException_When_GetValueOnFailure() {
            // Given
            Result<String> result = Result.failure("ERROR", "Error message");

            // When & Then
            assertThatThrownBy(result::getValue)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot get value from failed result");
        }

        @Test
        @DisplayName("Should_ThrowException_When_GetErrorOnSuccess")
        void Should_ThrowException_When_GetErrorOnSuccess() {
            // Given
            Result<String> result = Result.success("test");

            // When & Then
            assertThatThrownBy(result::getError)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot get error from successful result");
        }
    }

    @Nested
    @DisplayName("Result Factory Methods")
    class ResultFactoryMethods {

        @Test
        @DisplayName("Should_CreateSuccess_When_ValidValueProvided")
        void Should_CreateSuccess_When_ValidValueProvided() {
            // Given
            String value = "test";

            // When
            Result<String> result = Result.success(value);

            // Then
            assertThat(result.isSuccess()).isTrue();
            assertThat(result.getValue()).isEqualTo(value);
        }

        @Test
        @DisplayName("Should_ThrowException_When_NullValueProvidedToSuccess")
        void Should_ThrowException_When_NullValueProvidedToSuccess() {
            // Given & When & Then
            assertThatThrownBy(() -> Result.success(null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Success value cannot be null");
        }

        @Test
        @DisplayName("Should_CreateFailure_When_ErrorProvided")
        void Should_CreateFailure_When_ErrorProvided() {
            // Given
            Error error = Error.domain("TEST.ERROR", "Test error");

            // When
            Result<String> result = Result.failure(error);

            // Then
            assertThat(result.isFailure()).isTrue();
            assertThat(result.getError()).isEqualTo(error);
        }

        @Test
        @DisplayName("Should_CreateFailure_When_CodeAndMessageProvided")
        void Should_CreateFailure_When_CodeAndMessageProvided() {
            // Given
            String code = "TEST.ERROR";
            String message = "Test error message";

            // When
            Result<String> result = Result.failure(code, message);

            // Then
            assertThat(result.isFailure()).isTrue();
            assertThat(result.getError().getCode()).isEqualTo(code);
            assertThat(result.getError().getMessage()).isEqualTo(message);
            assertThat(result.getError().getCategory()).isEqualTo(ErrorCategory.DOMAIN);
        }
    }
}