package com.architecture.core.functional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.Map;
import java.util.function.Function;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.*;

@DisplayName("Result Unit Tests")
@Execution(ExecutionMode.CONCURRENT)
class ResultTest {

    @Nested
    @DisplayName("Factory Methods")
    class FactoryMethodTests {

        @Test
        @DisplayName("Should create success result with value")
        void Should_CreateSuccessResult_When_ProvidingValue() {
            // Given
            String value = "test";

            // When
            Result<String> result = Result.success(value);

            // Then
            assertThat(result.isSuccess()).isTrue();
            assertThat(result.isFailure()).isFalse();
            assertThat(result.getValue()).isEqualTo(value);
        }

        @Test
        @DisplayName("Should reject null value in success")
        void Should_RejectNullValue_When_CreatingSuccess() {
            // Given & When & Then
            assertThatThrownBy(() -> Result.success(null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Success value cannot be null");
        }

        @Test
        @DisplayName("Should create failure result with error")
        void Should_CreateFailureResult_When_ProvidingError() {
            // Given
            Error error = Error.domain("TEST.001", "Test error");

            // When
            Result<String> result = Result.failure(error);

            // Then
            assertThat(result.isSuccess()).isFalse();
            assertThat(result.isFailure()).isTrue();
            assertThat(result.getError()).isEqualTo(error);
        }

        @Test
        @DisplayName("Should create failure result with code and message")
        void Should_CreateFailureResult_When_ProvidingCodeAndMessage() {
            // Given
            String code = "TEST.001";
            String message = "Test error";

            // When
            Result<String> result = Result.failure(code, message);

            // Then
            assertThat(result.isFailure()).isTrue();
            assertThat(result.getError().getCode()).isEqualTo(code);
            assertThat(result.getError().getMessage()).isEqualTo(message);
            assertThat(result.getError().getCategory()).isEqualTo(ErrorCategory.DOMAIN);
        }

        @Test
        @DisplayName("Should reject null error in failure")
        void Should_RejectNullError_When_CreatingFailure() {
            // Given & When & Then
            assertThatThrownBy(() -> Result.failure((Error) null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Error cannot be null");
        }
    }

    @Nested
    @DisplayName("Value Access")
    class ValueAccessTests {

        @Test
        @DisplayName("Should get value when success")
        void Should_GetValue_When_Success() {
            // Given
            String expectedValue = "test";
            Result<String> result = Result.success(expectedValue);

            // When
            String actualValue = result.getValue();

            // Then
            assertThat(actualValue).isEqualTo(expectedValue);
        }

        @Test
        @DisplayName("Should throw when getting value from failure")
        void Should_Throw_When_GettingValueFromFailure() {
            // Given
            Result<String> result = Result.failure(Error.domain("TEST.001", "Test error"));

            // When & Then
            assertThatThrownBy(result::getValue)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot get value from failed result");
        }

        @Test
        @DisplayName("Should get error when failure")
        void Should_GetError_When_Failure() {
            // Given
            Error expectedError = Error.domain("TEST.001", "Test error");
            Result<String> result = Result.failure(expectedError);

            // When
            Error actualError = result.getError();

            // Then
            assertThat(actualError).isEqualTo(expectedError);
        }

        @Test
        @DisplayName("Should throw when getting error from success")
        void Should_Throw_When_GettingErrorFromSuccess() {
            // Given
            Result<String> result = Result.success("test");

            // When & Then
            assertThatThrownBy(result::getError)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot get error from successful result");
        }

        @Test
        @DisplayName("Should get value or default when success")
        void Should_GetValue_When_SuccessAndUsingGetValueOrDefault() {
            // Given
            String value = "test";
            String defaultValue = "default";
            Result<String> result = Result.success(value);

            // When
            String actualValue = result.getValueOrDefault(defaultValue);

            // Then
            assertThat(actualValue).isEqualTo(value);
        }

        @Test
        @DisplayName("Should get default when failure")
        void Should_GetDefault_When_FailureAndUsingGetValueOrDefault() {
            // Given
            String defaultValue = "default";
            Result<String> result = Result.failure(Error.domain("TEST.001", "Test error"));

            // When
            String actualValue = result.getValueOrDefault(defaultValue);

            // Then
            assertThat(actualValue).isEqualTo(defaultValue);
        }

        @Test
        @DisplayName("Should get value when success and using getValueOrThrow")
        void Should_GetValue_When_SuccessAndUsingGetValueOrThrow() {
            // Given
            String value = "test";
            Result<String> result = Result.success(value);

            // When
            String actualValue = result.getValueOrThrow();

            // Then
            assertThat(actualValue).isEqualTo(value);
        }

        @Test
        @DisplayName("Should throw ResultException when failure and using getValueOrThrow")
        void Should_ThrowResultException_When_FailureAndUsingGetValueOrThrow() {
            // Given
            Error error = Error.domain("TEST.001", "Test error");
            Result<String> result = Result.failure(error);

            // When & Then
            assertThatThrownBy(result::getValueOrThrow)
                .isInstanceOf(ResultException.class)
                .extracting(ex -> ((ResultException) ex).getError())
                .isEqualTo(error);
        }
    }

    @Nested
    @DisplayName("Mapping Operations")
    class MappingTests {

        @Test
        @DisplayName("Should map value when success")
        void Should_MapValue_When_Success() {
            // Given
            Integer value = 42;
            Result<Integer> result = Result.success(value);
            Function<Integer, String> mapper = x -> "Value: " + x;

            // When
            Result<String> mapped = result.map(mapper);

            // Then
            assertThat(mapped.isSuccess()).isTrue();
            assertThat(mapped.getValue()).isEqualTo("Value: 42");
        }

        @Test
        @DisplayName("Should preserve failure when mapping failure")
        void Should_PreserveFailure_When_MappingFailure() {
            // Given
            Error error = Error.domain("TEST.001", "Test error");
            Result<Integer> result = Result.failure(error);
            Function<Integer, String> mapper = x -> "Value: " + x;

            // When
            Result<String> mapped = result.map(mapper);

            // Then
            assertThat(mapped.isFailure()).isTrue();
            assertThat(mapped.getError()).isEqualTo(error);
        }

        @Test
        @DisplayName("Should handle mapper exception")
        void Should_HandleMapperException_When_MapperThrows() {
            // Given
            Integer value = 42;
            Result<Integer> result = Result.success(value);
            Function<Integer, String> mapper = x -> {
                throw new RuntimeException("Mapper failed");
            };

            // When
            Result<String> mapped = result.map(mapper);

            // Then
            assertThat(mapped.isFailure()).isTrue();
            assertThat(mapped.getError().getCode()).isEqualTo("Mapping.Failed");
            assertThat(mapped.getError().getCategory()).isEqualTo(ErrorCategory.INFRASTRUCTURE);
        }

        @Test
        @DisplayName("Should reject null mapper")
        void Should_RejectNullMapper_When_Mapping() {
            // Given
            Result<Integer> result = Result.success(42);

            // When & Then
            assertThatThrownBy(() -> result.map(null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Mapper function cannot be null");
        }

        @Test
        @DisplayName("Should chain multiple map operations")
        void Should_ChainMultipleMapOperations_When_AllSucceed() {
            // Given
            Result<Integer> result = Result.success(10);

            // When
            Result<String> mapped = result
                .map(x -> x * 2)
                .map(x -> x + 5)
                .map(x -> "Result: " + x);

            // Then
            assertThat(mapped.isSuccess()).isTrue();
            assertThat(mapped.getValue()).isEqualTo("Result: 25");
        }

        @Test
        @DisplayName("Should stop at first failure in chain")
        void Should_StopAtFirstFailure_When_ChainingMapOperations() {
            // Given
            Result<Integer> result = Result.success(10);

            // When
            Result<String> mapped = result
                .map(x -> x * 2)
                .map(x -> {
                    throw new RuntimeException("Second operation failed");
                })
                .map(x -> "Result: " + x); // This should not execute

            // Then
            assertThat(mapped.isFailure()).isTrue();
            assertThat(mapped.getError().getMessage()).contains("Second operation failed");
        }
    }

    @Nested
    @DisplayName("Binding Operations")
    class BindingTests {

        @Test
        @DisplayName("Should bind value when success")
        void Should_BindValue_When_Success() {
            // Given
            Integer value = 42;
            Result<Integer> result = Result.success(value);
            Function<Integer, Result<String>> binder = x -> Result.success("Value: " + x);

            // When
            Result<String> bound = result.bind(binder);

            // Then
            assertThat(bound.isSuccess()).isTrue();
            assertThat(bound.getValue()).isEqualTo("Value: 42");
        }

        @Test
        @DisplayName("Should preserve failure when binding failure")
        void Should_PreserveFailure_When_BindingFailure() {
            // Given
            Error error = Error.domain("TEST.001", "Test error");
            Result<Integer> result = Result.failure(error);
            Function<Integer, Result<String>> binder = x -> Result.success("Value: " + x);

            // When
            Result<String> bound = result.bind(binder);

            // Then
            assertThat(bound.isFailure()).isTrue();
            assertThat(bound.getError()).isEqualTo(error);
        }

        @Test
        @DisplayName("Should flatten nested failure")
        void Should_FlattenNestedFailure_When_BinderReturnsFailure() {
            // Given
            Integer value = 42;
            Result<Integer> result = Result.success(value);
            Error binderError = Error.domain("BINDER.001", "Binder failed");
            Function<Integer, Result<String>> binder = x -> Result.failure(binderError);

            // When
            Result<String> bound = result.bind(binder);

            // Then
            assertThat(bound.isFailure()).isTrue();
            assertThat(bound.getError()).isEqualTo(binderError);
        }

        @Test
        @DisplayName("Should handle binder exception")
        void Should_HandleBinderException_When_BinderThrows() {
            // Given
            Integer value = 42;
            Result<Integer> result = Result.success(value);
            Function<Integer, Result<String>> binder = x -> {
                throw new RuntimeException("Binder failed");
            };

            // When
            Result<String> bound = result.bind(binder);

            // Then
            assertThat(bound.isFailure()).isTrue();
            assertThat(bound.getError().getCode()).isEqualTo("Binding.Failed");
            assertThat(bound.getError().getCategory()).isEqualTo(ErrorCategory.INFRASTRUCTURE);
        }

        @Test
        @DisplayName("Should reject null binder")
        void Should_RejectNullBinder_When_Binding() {
            // Given
            Result<Integer> result = Result.success(42);

            // When & Then
            assertThatThrownBy(() -> result.bind(null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Binder function cannot be null");
        }

        @Test
        @DisplayName("Should chain multiple bind operations")
        void Should_ChainMultipleBindOperations_When_AllSucceed() {
            // Given
            Result<Integer> result = Result.success(10);

            // When
            Result<String> bound = result
                .bind(x -> Result.success(x * 2))
                .bind(x -> Result.success(x + 5))
                .bind(x -> Result.success("Result: " + x));

            // Then
            assertThat(bound.isSuccess()).isTrue();
            assertThat(bound.getValue()).isEqualTo("Result: 25");
        }

        @Test
        @DisplayName("Should stop at first failure in bind chain")
        void Should_StopAtFirstFailure_When_ChainingBindOperations() {
            // Given
            Result<Integer> result = Result.success(10);
            Error secondError = Error.domain("SECOND.001", "Second operation failed");

            // When
            Result<String> bound = result
                .bind(x -> Result.success(x * 2))
                .bind(x -> Result.failure(secondError))
                .bind(x -> Result.success("Result: " + x)); // This should not execute

            // Then
            assertThat(bound.isFailure()).isTrue();
            assertThat(bound.getError()).isEqualTo(secondError);
        }
    }

    @Nested
    @DisplayName("Match Operations")
    class MatchTests {

        @Test
        @DisplayName("Should call success handler when success")
        void Should_CallSuccessHandler_When_Success() {
            // Given
            String value = "test";
            Result<String> result = Result.success(value);
            Function<String, Integer> onSuccess = String::length;
            Function<Error, Integer> onFailure = error -> -1;

            // When
            Integer matchResult = result.match(onSuccess, onFailure);

            // Then
            assertThat(matchResult).isEqualTo(4); // "test".length()
        }

        @Test
        @DisplayName("Should call failure handler when failure")
        void Should_CallFailureHandler_When_Failure() {
            // Given
            Error error = Error.domain("TEST.001", "Test error");
            Result<String> result = Result.failure(error);
            Function<String, Integer> onSuccess = String::length;
            Function<Error, Integer> onFailure = e -> e.getCode().length();

            // When
            Integer matchResult = result.match(onSuccess, onFailure);

            // Then
            assertThat(matchResult).isEqualTo(8); // "TEST.001".length()
        }

        @Test
        @DisplayName("Should reject null success handler")
        void Should_RejectNullSuccessHandler_When_Matching() {
            // Given
            Result<String> result = Result.success("test");
            Function<Error, Integer> onFailure = error -> -1;

            // When & Then
            assertThatThrownBy(() -> result.match(null, onFailure))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Success handler cannot be null");
        }

        @Test
        @DisplayName("Should reject null failure handler")
        void Should_RejectNullFailureHandler_When_Matching() {
            // Given
            Result<String> result = Result.success("test");
            Function<String, Integer> onSuccess = String::length;

            // When & Then
            assertThatThrownBy(() -> result.match(onSuccess, null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Failure handler cannot be null");
        }
    }

    @Nested
    @DisplayName("Monadic Laws")
    class MonadicLawsTests {

        @Test
        @DisplayName("Left Identity Law: Result.success(a).bind(f) == f(a)")
        void Should_SatisfyLeftIdentityLaw_When_BindingFunction() {
            // Given
            Integer value = 42;
            Function<Integer, Result<String>> f = x -> Result.success(String.valueOf(x * 2));

            // When
            Result<String> leftSide = Result.success(value).bind(f);
            Result<String> rightSide = f.apply(value);

            // Then
            assertThat(leftSide).isEqualTo(rightSide);
            assertThat(leftSide.isSuccess()).isEqualTo(rightSide.isSuccess());
            if (leftSide.isSuccess()) {
                assertThat(leftSide.getValue()).isEqualTo(rightSide.getValue());
            }
        }

        @Test
        @DisplayName("Right Identity Law: m.bind(Result::success) == m")
        void Should_SatisfyRightIdentityLaw_When_BindingToSuccess() {
            // Given
            Result<Integer> resultSuccess = Result.success(42);
            Result<Integer> resultFailure = Result.failure(Error.domain("TEST.001", "Test error"));

            // When
            Result<Integer> boundSuccess = resultSuccess.bind(Result::success);
            Result<Integer> boundFailure = resultFailure.bind(Result::success);

            // Then
            assertThat(boundSuccess).isEqualTo(resultSuccess);
            assertThat(boundFailure).isEqualTo(resultFailure);
        }

        @Test
        @DisplayName("Associativity Law: m.bind(f).bind(g) == m.bind(x -> f(x).bind(g))")
        void Should_SatisfyAssociativityLaw_When_ChainBinding() {
            // Given
            Result<Integer> result = Result.success(10);
            Function<Integer, Result<Integer>> f = x -> Result.success(x * 2);
            Function<Integer, Result<String>> g = x -> Result.success("Value: " + x);

            // When
            Result<String> leftSide = result.bind(f).bind(g);
            Result<String> rightSide = result.bind(x -> f.apply(x).bind(g));

            // Then
            assertThat(leftSide).isEqualTo(rightSide);
            assertThat(leftSide.isSuccess()).isEqualTo(rightSide.isSuccess());
            if (leftSide.isSuccess()) {
                assertThat(leftSide.getValue()).isEqualTo(rightSide.getValue());
            }
        }

        @ParameterizedTest(name = "Monadic laws with {0}")
        @MethodSource("monadicLawTestCases")
        @DisplayName("Should satisfy all monadic laws with various scenarios")
        void Should_SatisfyAllMonadicLaws_When_UsingVariousScenarios(
            String description, Result<Integer> result, Integer testValue) {

            Function<Integer, Result<String>> f = x -> Result.success("f(" + x + ")");
            Function<String, Result<Integer>> g = s -> Result.success(s.length());

            // Left Identity
            Result<String> leftIdentityLeft = Result.success(testValue).bind(f);
            Result<String> leftIdentityRight = f.apply(testValue);
            assertThat(leftIdentityLeft).isEqualTo(leftIdentityRight);

            // Right Identity
            Result<Integer> rightIdentityResult = result.bind(Result::success);
            assertThat(rightIdentityResult).isEqualTo(result);

            // Associativity
            Result<Integer> associativityLeft = result.bind(x -> Result.success(x.toString())).bind(g);
            Result<Integer> associativityRight = result.bind(x -> Result.success(x.toString()).bind(g));
            assertThat(associativityLeft).isEqualTo(associativityRight);
        }

        static Stream<Arguments> monadicLawTestCases() {
            return Stream.of(
                Arguments.of("success with positive integer", Result.success(42), 42),
                Arguments.of("success with zero", Result.success(0), 0),
                Arguments.of("success with negative integer", Result.success(-10), -10),
                Arguments.of("failure case", Result.<Integer>failure(Error.domain("TEST.001", "Test error")), 99)
            );
        }
    }

    @Nested
    @DisplayName("Equality and HashCode")
    class EqualityTests {

        @Test
        @DisplayName("Should be equal when both are success with same value")
        void Should_BeEqual_When_BothAreSuccessWithSameValue() {
            // Given
            String value = "test";
            Result<String> result1 = Result.success(value);
            Result<String> result2 = Result.success(value);

            // When & Then
            assertThat(result1).isEqualTo(result2);
            assertThat(result1.hashCode()).isEqualTo(result2.hashCode());
        }

        @Test
        @DisplayName("Should be equal when both are failure with same error")
        void Should_BeEqual_When_BothAreFailureWithSameError() {
            // Given
            Error error = Error.domain("TEST.001", "Test error");
            Result<String> result1 = Result.failure(error);
            Result<String> result2 = Result.failure(error);

            // When & Then
            assertThat(result1).isEqualTo(result2);
            assertThat(result1.hashCode()).isEqualTo(result2.hashCode());
        }

        @Test
        @DisplayName("Should not be equal when different values")
        void Should_NotBeEqual_When_DifferentValues() {
            // Given
            Result<String> result1 = Result.success("test1");
            Result<String> result2 = Result.success("test2");

            // When & Then
            assertThat(result1).isNotEqualTo(result2);
        }

        @Test
        @DisplayName("Should not be equal when different errors")
        void Should_NotBeEqual_When_DifferentErrors() {
            // Given
            Result<String> result1 = Result.failure(Error.domain("TEST.001", "Error 1"));
            Result<String> result2 = Result.failure(Error.domain("TEST.002", "Error 2"));

            // When & Then
            assertThat(result1).isNotEqualTo(result2);
        }

        @Test
        @DisplayName("Should not be equal when one success and one failure")
        void Should_NotBeEqual_When_OneSuccessAndOneFailure() {
            // Given
            Result<String> success = Result.success("test");
            Result<String> failure = Result.failure(Error.domain("TEST.001", "Test error"));

            // When & Then
            assertThat(success).isNotEqualTo(failure);
            assertThat(failure).isNotEqualTo(success);
        }

        @Test
        @DisplayName("Should have consistent hashCode")
        void Should_HaveConsistentHashCode_When_CalledMultipleTimes() {
            // Given
            Result<String> success = Result.success("test");
            Result<String> failure = Result.failure(Error.domain("TEST.001", "Test error"));

            // When
            int successHash1 = success.hashCode();
            int successHash2 = success.hashCode();
            int failureHash1 = failure.hashCode();
            int failureHash2 = failure.hashCode();

            // Then
            assertThat(successHash1).isEqualTo(successHash2);
            assertThat(failureHash1).isEqualTo(failureHash2);
        }
    }

    @Nested
    @DisplayName("String Representation")
    class StringRepresentationTests {

        @Test
        @DisplayName("Should provide meaningful string for success")
        void Should_ProvideMeaningfulString_When_Success() {
            // Given
            String value = "test";
            Result<String> result = Result.success(value);

            // When
            String stringRepresentation = result.toString();

            // Then
            assertThat(stringRepresentation).contains("Success");
            assertThat(stringRepresentation).contains(value);
        }

        @Test
        @DisplayName("Should provide meaningful string for failure")
        void Should_ProvideMeaningfulString_When_Failure() {
            // Given
            Error error = Error.domain("TEST.001", "Test error");
            Result<String> result = Result.failure(error);

            // When
            String stringRepresentation = result.toString();

            // Then
            assertThat(stringRepresentation).contains("Failure");
            assertThat(stringRepresentation).contains(error.toString());
        }
    }
}