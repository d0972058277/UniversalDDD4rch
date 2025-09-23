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
import java.util.Optional;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.*;

@DisplayName("Result-Maybe Conversion Tests")
@Execution(ExecutionMode.CONCURRENT)
class ConversionTest {

    @Nested
    @DisplayName("Maybe to Result Conversions")
    class MaybeToResultTests {

        @Test
        @DisplayName("Should convert Some to successful Result")
        void Should_ConvertSomeToSuccessfulResult_When_MaybeHasValue() {
            // Given
            String value = "test";
            Maybe<String> maybe = Maybe.some(value);
            Error errorForEmpty = Error.domain("Test.Empty", "No value present");

            // When
            Result<String> result = maybe.toResult(errorForEmpty);

            // Then
            assertThat(result.isSuccess()).isTrue();
            assertThat(result.getValue()).isEqualTo(value);
        }

        @Test
        @DisplayName("Should convert None to failed Result")
        void Should_ConvertNoneToFailedResult_When_MaybeIsEmpty() {
            // Given
            Maybe<String> maybe = Maybe.none();
            Error errorForEmpty = Error.domain("Test.Empty", "No value present");

            // When
            Result<String> result = maybe.toResult(errorForEmpty);

            // Then
            assertThat(result.isFailure()).isTrue();
            assertThat(result.getError()).isEqualTo(errorForEmpty);
        }

        @Test
        @DisplayName("Should preserve original value type in conversion")
        void Should_PreserveOriginalValueType_When_ConvertingMaybeToResult() {
            // Given
            Integer value = 42;
            Maybe<Integer> maybe = Maybe.some(value);
            Error errorForEmpty = Error.domain("Test.Empty", "No value present");

            // When
            Result<Integer> result = maybe.toResult(errorForEmpty);

            // Then
            assertThat(result.isSuccess()).isTrue();
            assertThat(result.getValue()).isEqualTo(value);
            assertThat(result.getValue()).isInstanceOf(Integer.class);
        }

        @ParameterizedTest(name = "Converting {0} to Result")
        @MethodSource("maybeToResultTestCases")
        @DisplayName("Should convert various Maybe values to Results correctly")
        void Should_ConvertVariousMaybeValuesToResults_When_Converting(
            String description, Maybe<Object> maybe, boolean expectedSuccess) {
            // Given
            Error errorForEmpty = Error.validation("Test.Empty", "No value present", Map.of());

            // When
            Result<Object> result = maybe.toResult(errorForEmpty);

            // Then
            assertThat(result.isSuccess()).isEqualTo(expectedSuccess);
            if (expectedSuccess) {
                assertThat(result.getValue()).isEqualTo(maybe.getValue());
            } else {
                assertThat(result.getError()).isEqualTo(errorForEmpty);
            }
        }

        static Stream<Arguments> maybeToResultTestCases() {
            return Stream.of(
                Arguments.of("Some with string", Maybe.some("test"), true),
                Arguments.of("Some with integer", Maybe.some(42), true),
                Arguments.of("Some with boolean", Maybe.some(true), true),
                Arguments.of("Some with empty string", Maybe.some(""), true),
                Arguments.of("Some with zero", Maybe.some(0), true),
                Arguments.of("None", Maybe.none(), false)
            );
        }
    }

    @Nested
    @DisplayName("Maybe to Optional Conversions")
    class MaybeToOptionalTests {

        @Test
        @DisplayName("Should convert Some to present Optional")
        void Should_ConvertSomeToPresentOptional_When_MaybeHasValue() {
            // Given
            String value = "test";
            Maybe<String> maybe = Maybe.some(value);

            // When
            Optional<String> optional = maybe.toOptional();

            // Then
            assertThat(optional.isPresent()).isTrue();
            assertThat(optional.get()).isEqualTo(value);
        }

        @Test
        @DisplayName("Should convert None to empty Optional")
        void Should_ConvertNoneToEmptyOptional_When_MaybeIsEmpty() {
            // Given
            Maybe<String> maybe = Maybe.none();

            // When
            Optional<String> optional = maybe.toOptional();

            // Then
            assertThat(optional.isEmpty()).isTrue();
        }

        @Test
        @DisplayName("Should preserve value type in Optional conversion")
        void Should_PreserveValueType_When_ConvertingMaybeToOptional() {
            // Given
            Integer value = 42;
            Maybe<Integer> maybe = Maybe.some(value);

            // When
            Optional<Integer> optional = maybe.toOptional();

            // Then
            assertThat(optional.isPresent()).isTrue();
            assertThat(optional.get()).isEqualTo(value);
            assertThat(optional.get()).isInstanceOf(Integer.class);
        }

        @Test
        @DisplayName("Should handle complex objects in conversion")
        void Should_HandleComplexObjects_When_ConvertingMaybeToOptional() {
            // Given
            ComplexObject obj = new ComplexObject("test", 42);
            Maybe<ComplexObject> maybe = Maybe.some(obj);

            // When
            Optional<ComplexObject> optional = maybe.toOptional();

            // Then
            assertThat(optional.isPresent()).isTrue();
            assertThat(optional.get()).isEqualTo(obj);
            assertThat(optional.get().getName()).isEqualTo("test");
            assertThat(optional.get().getValue()).isEqualTo(42);
        }
    }

    @Nested
    @DisplayName("Optional to Maybe Conversions")
    class OptionalToMaybeTests {

        @Test
        @DisplayName("Should convert present Optional to Some")
        void Should_ConvertPresentOptionalToSome_When_OptionalHasValue() {
            // Given
            String value = "test";
            Optional<String> optional = Optional.of(value);

            // When
            Maybe<String> maybe = Maybe.fromNullable(optional.orElse(null));

            // Then
            assertThat(maybe.hasValue()).isTrue();
            assertThat(maybe.getValue()).isEqualTo(value);
        }

        @Test
        @DisplayName("Should convert empty Optional to None")
        void Should_ConvertEmptyOptionalToNone_When_OptionalIsEmpty() {
            // Given
            Optional<String> optional = Optional.empty();

            // When
            Maybe<String> maybe = Maybe.fromNullable(optional.orElse(null));

            // Then
            assertThat(maybe.hasValue()).isFalse();
        }

        @Test
        @DisplayName("Should handle nullable conversion pattern")
        void Should_HandleNullableConversionPattern_When_ConvertingOptional() {
            // Given
            Optional<String> presentOptional = Optional.of("test");
            Optional<String> emptyOptional = Optional.empty();

            // When
            Maybe<String> maybeFromPresent = Maybe.fromNullable(
                presentOptional.orElse(null));
            Maybe<String> maybeFromEmpty = Maybe.fromNullable(
                emptyOptional.orElse(null));

            // Then
            assertThat(maybeFromPresent.hasValue()).isTrue();
            assertThat(maybeFromPresent.getValue()).isEqualTo("test");
            assertThat(maybeFromEmpty.hasValue()).isFalse();
        }
    }

    @Nested
    @DisplayName("Round-trip Conversions")
    class RoundTripTests {

        @Test
        @DisplayName("Should preserve value in Maybe-Optional-Maybe round trip")
        void Should_PreserveValue_When_MaybeOptionalMaybeRoundTrip() {
            // Given
            String originalValue = "test";
            Maybe<String> originalMaybe = Maybe.some(originalValue);

            // When
            Optional<String> optional = originalMaybe.toOptional();
            Maybe<String> roundTripMaybe = Maybe.fromNullable(optional.orElse(null));

            // Then
            assertThat(roundTripMaybe).isEqualTo(originalMaybe);
            assertThat(roundTripMaybe.hasValue()).isTrue();
            assertThat(roundTripMaybe.getValue()).isEqualTo(originalValue);
        }

        @Test
        @DisplayName("Should preserve None in Maybe-Optional-Maybe round trip")
        void Should_PreserveNone_When_MaybeOptionalMaybeRoundTripWithNone() {
            // Given
            Maybe<String> originalMaybe = Maybe.none();

            // When
            Optional<String> optional = originalMaybe.toOptional();
            Maybe<String> roundTripMaybe = Maybe.fromNullable(optional.orElse(null));

            // Then
            assertThat(roundTripMaybe).isEqualTo(originalMaybe);
            assertThat(roundTripMaybe.hasValue()).isFalse();
        }

        @Test
        @DisplayName("Should preserve value in Maybe-Result-Maybe round trip")
        void Should_PreserveValue_When_MaybeResultMaybeRoundTrip() {
            // Given
            String originalValue = "test";
            Maybe<String> originalMaybe = Maybe.some(originalValue);
            Error errorForEmpty = Error.domain("Test.Empty", "No value present");

            // When
            Result<String> result = originalMaybe.toResult(errorForEmpty);
            Maybe<String> roundTripMaybe = result.isSuccess()
                ? Maybe.some(result.getValue())
                : Maybe.none();

            // Then
            assertThat(roundTripMaybe).isEqualTo(originalMaybe);
            assertThat(roundTripMaybe.hasValue()).isTrue();
            assertThat(roundTripMaybe.getValue()).isEqualTo(originalValue);
        }

        @Test
        @DisplayName("Should preserve None in Maybe-Result-Maybe round trip")
        void Should_PreserveNone_When_MaybeResultMaybeRoundTripWithNone() {
            // Given
            Maybe<String> originalMaybe = Maybe.none();
            Error errorForEmpty = Error.domain("Test.Empty", "No value present");

            // When
            Result<String> result = originalMaybe.toResult(errorForEmpty);
            Maybe<String> roundTripMaybe = result.isSuccess()
                ? Maybe.some(result.getValue())
                : Maybe.none();

            // Then
            assertThat(roundTripMaybe).isEqualTo(originalMaybe);
            assertThat(roundTripMaybe.hasValue()).isFalse();
        }
    }

    @Nested
    @DisplayName("Chaining Conversions")
    class ChainingConversionsTests {

        @Test
        @DisplayName("Should chain conversions with map operations")
        void Should_ChainConversionsWithMapOperations_When_ProcessingValues() {
            // Given
            Maybe<String> maybe = Maybe.some("42");
            Error errorForEmpty = Error.domain("Test.Empty", "No value present");

            // When
            Result<Integer> result = maybe
                .map(Integer::parseInt)
                .toResult(errorForEmpty);

            // Then
            assertThat(result.isSuccess()).isTrue();
            assertThat(result.getValue()).isEqualTo(42);
        }

        @Test
        @DisplayName("Should handle conversion failures in chain")
        void Should_HandleConversionFailures_When_ChainingOperations() {
            // Given
            Maybe<String> maybe = Maybe.none();
            Error errorForEmpty = Error.domain("Test.Empty", "No value present");

            // When
            Result<Integer> result = maybe
                .map(Integer::parseInt)
                .toResult(errorForEmpty);

            // Then
            assertThat(result.isFailure()).isTrue();
            assertThat(result.getError()).isEqualTo(errorForEmpty);
        }

        @Test
        @DisplayName("Should convert between different container types")
        void Should_ConvertBetweenDifferentContainerTypes_When_Chaining() {
            // Given
            String value = "test";

            // When
            // Maybe -> Optional -> Maybe -> Result
            Maybe<String> finalResult = Maybe.some(value)
                .toOptional()
                .map(String::toUpperCase)
                .map(Maybe::some)
                .orElse(Maybe.none());

            // Then
            assertThat(finalResult.hasValue()).isTrue();
            assertThat(finalResult.getValue()).isEqualTo("TEST");
        }
    }

    @Nested
    @DisplayName("Error Handling in Conversions")
    class ErrorHandlingTests {

        @Test
        @DisplayName("Should preserve error information in conversions")
        void Should_PreserveErrorInformation_When_ConvertingFailedResult() {
            // Given
            Error originalError = Error.validation("Original.Error", "Original error message", Map.of());
            Result<String> failedResult = Result.failure(originalError);

            // When - Converting failed Result back to Maybe
            Maybe<String> maybe = failedResult.isSuccess()
                ? Maybe.some(failedResult.getValue())
                : Maybe.none();

            // Then
            assertThat(maybe.hasValue()).isFalse();
            // Note: Error information is lost in Maybe, as expected
        }

        @Test
        @DisplayName("Should use provided error for Maybe to Result conversion")
        void Should_UseProvidedError_When_ConvertingNoneToResult() {
            // Given
            Maybe<String> maybe = Maybe.none();
            Error customError = Error.concurrency("Custom.Error", "Custom error message");

            // When
            Result<String> result = maybe.toResult(customError);

            // Then
            assertThat(result.isFailure()).isTrue();
            assertThat(result.getError()).isEqualTo(customError);
            assertThat(result.getError().getCode()).isEqualTo("Custom.Error");
            assertThat(result.getError().getMessage()).isEqualTo("Custom error message");
            assertThat(result.getError().getCategory()).isEqualTo(ErrorCategory.CONCURRENCY);
        }

        @Test
        @DisplayName("Should handle different error categories in conversions")
        void Should_HandleDifferentErrorCategories_When_Converting() {
            // Given
            Maybe<String> maybe = Maybe.none();
            Error domainError = Error.domain("Domain.Error", "Domain error");
            Error validationError = Error.validation("Validation.Error", "Validation error", Map.of());
            Error infrastructureError = Error.infrastructure("Infrastructure.Error", "Infrastructure error", null);

            // When
            Result<String> domainResult = maybe.toResult(domainError);
            Result<String> validationResult = maybe.toResult(validationError);
            Result<String> infrastructureResult = maybe.toResult(infrastructureError);

            // Then
            assertThat(domainResult.getError().getCategory()).isEqualTo(ErrorCategory.DOMAIN);
            assertThat(validationResult.getError().getCategory()).isEqualTo(ErrorCategory.VALIDATION);
            assertThat(infrastructureResult.getError().getCategory()).isEqualTo(ErrorCategory.INFRASTRUCTURE);
        }
    }

    // Helper class for testing
    private static class ComplexObject {
        private final String name;
        private final int value;

        public ComplexObject(String name, int value) {
            this.name = name;
            this.value = value;
        }

        public String getName() {
            return name;
        }

        public int getValue() {
            return value;
        }

        @Override
        public boolean equals(Object obj) {
            if (this == obj) return true;
            if (obj == null || getClass() != obj.getClass()) return false;
            ComplexObject that = (ComplexObject) obj;
            return value == that.value && java.util.Objects.equals(name, that.name);
        }

        @Override
        public int hashCode() {
            return java.util.Objects.hash(name, value);
        }

        @Override
        public String toString() {
            return String.format("ComplexObject{name='%s', value=%d}", name, value);
        }
    }
}