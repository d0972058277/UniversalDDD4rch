package com.architecture.core.functional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.Optional;
import java.util.function.Function;
import java.util.function.Supplier;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.*;

@DisplayName("Maybe Unit Tests")
@Execution(ExecutionMode.CONCURRENT)
class MaybeTest {

    @Nested
    @DisplayName("Factory Methods")
    class FactoryMethodTests {

        @Test
        @DisplayName("Should create Some with non-null value")
        void Should_CreateSome_When_ProvidingNonNullValue() {
            // Given
            String value = "test";

            // When
            Maybe<String> maybe = Maybe.some(value);

            // Then
            assertThat(maybe.hasValue()).isTrue();
            assertThat(maybe.isEmpty()).isFalse();
            assertThat(maybe.getValue()).isEqualTo(value);
        }

        @Test
        @DisplayName("Should reject null value in some()")
        void Should_RejectNullValue_When_CreatingSome() {
            // Given & When & Then
            assertThatThrownBy(() -> Maybe.some(null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Value cannot be null");
        }

        @Test
        @DisplayName("Should create None successfully")
        void Should_CreateNone_When_CallingNone() {
            // Given & When
            Maybe<String> maybe = Maybe.none();

            // Then
            assertThat(maybe.hasValue()).isFalse();
            assertThat(maybe.isEmpty()).isTrue();
        }

        @Test
        @DisplayName("Should create from non-null value")
        void Should_CreateFromNonNullValue_When_UsingFromNullable() {
            // Given
            String value = "test";

            // When
            Maybe<String> maybe = Maybe.fromNullable(value);

            // Then
            assertThat(maybe.hasValue()).isTrue();
            assertThat(maybe.getValue()).isEqualTo(value);
        }

        @Test
        @DisplayName("Should create None from null value")
        void Should_CreateNoneFromNullValue_When_UsingFromNullable() {
            // Given
            String value = null;

            // When
            Maybe<String> maybe = Maybe.fromNullable(value);

            // Then
            assertThat(maybe.hasValue()).isFalse();
        }

        @Test
        @DisplayName("Should reuse None instance for efficiency")
        void Should_ReuseNoneInstance_When_CreatingMultipleNones() {
            // Given & When
            Maybe<String> none1 = Maybe.none();
            Maybe<Integer> none2 = Maybe.none();
            Maybe<Object> none3 = Maybe.none();

            // Then - Should be same instance for memory efficiency
            assertThat(none1).isSameAs(none2);
            assertThat(none1).isSameAs(none3);
        }
    }

    @Nested
    @DisplayName("Value Access")
    class ValueAccessTests {

        @Test
        @DisplayName("Should get value when present")
        void Should_GetValue_When_ValueIsPresent() {
            // Given
            String expectedValue = "test";
            Maybe<String> maybe = Maybe.some(expectedValue);

            // When
            String actualValue = maybe.getValue();

            // Then
            assertThat(actualValue).isEqualTo(expectedValue);
        }

        @Test
        @DisplayName("Should throw when getting value from None")
        void Should_Throw_When_GettingValueFromNone() {
            // Given
            Maybe<String> maybe = Maybe.none();

            // When & Then
            assertThatThrownBy(maybe::getValue)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Maybe has no value");
        }

        @Test
        @DisplayName("Should return value when using orElse with Some")
        void Should_ReturnValue_When_UsingOrElseWithSome() {
            // Given
            String value = "test";
            String defaultValue = "default";
            Maybe<String> maybe = Maybe.some(value);

            // When
            String result = maybe.orElse(defaultValue);

            // Then
            assertThat(result).isEqualTo(value);
        }

        @Test
        @DisplayName("Should return default when using orElse with None")
        void Should_ReturnDefault_When_UsingOrElseWithNone() {
            // Given
            String defaultValue = "default";
            Maybe<String> maybe = Maybe.none();

            // When
            String result = maybe.orElse(defaultValue);

            // Then
            assertThat(result).isEqualTo(defaultValue);
        }

        @Test
        @DisplayName("Should call supplier when None and using orElseGet")
        void Should_CallSupplier_When_NoneAndUsingOrElseGet() {
            // Given
            Maybe<String> maybe = Maybe.none();
            String suppliedValue = "supplied";
            Supplier<String> supplier = () -> suppliedValue;

            // When
            String result = maybe.orElseGet(supplier);

            // Then
            assertThat(result).isEqualTo(suppliedValue);
        }

        @Test
        @DisplayName("Should not call supplier when Some and using orElseGet")
        void Should_NotCallSupplier_When_SomeAndUsingOrElseGet() {
            // Given
            String value = "test";
            Maybe<String> maybe = Maybe.some(value);
            Supplier<String> supplier = () -> {
                throw new RuntimeException("Supplier should not be called");
            };

            // When
            String result = maybe.orElseGet(supplier);

            // Then
            assertThat(result).isEqualTo(value);
        }

        @Test
        @DisplayName("Should throw exception when None and using orElseThrow")
        void Should_ThrowException_When_NoneAndUsingOrElseThrow() {
            // Given
            Maybe<String> maybe = Maybe.none();
            RuntimeException exception = new RuntimeException("No value present");

            // When & Then
            assertThatThrownBy(() -> maybe.orElseThrow(() -> exception))
                .isSameAs(exception);
        }

        @Test
        @DisplayName("Should return value when Some and using orElseThrow")
        void Should_ReturnValue_When_SomeAndUsingOrElseThrow() {
            // Given
            String value = "test";
            Maybe<String> maybe = Maybe.some(value);

            // When
            String result = maybe.orElseThrow(() -> new RuntimeException("Should not throw"));

            // Then
            assertThat(result).isEqualTo(value);
        }

        @Test
        @DisplayName("Should reject null supplier in orElseGet")
        void Should_RejectNullSupplier_When_UsingOrElseGet() {
            // Given
            Maybe<String> maybe = Maybe.none();

            // When & Then
            assertThatThrownBy(() -> maybe.orElseGet(null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Default supplier cannot be null");
        }

        @Test
        @DisplayName("Should reject null supplier in orElseThrow")
        void Should_RejectNullSupplier_When_UsingOrElseThrow() {
            // Given
            Maybe<String> maybe = Maybe.none();

            // When & Then
            assertThatThrownBy(() -> maybe.orElseThrow(null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Exception supplier cannot be null");
        }
    }

    @Nested
    @DisplayName("Mapping Operations")
    class MappingTests {

        @Test
        @DisplayName("Should map value when Some")
        void Should_MapValue_When_Some() {
            // Given
            Integer value = 42;
            Maybe<Integer> maybe = Maybe.some(value);
            Function<Integer, String> mapper = x -> "Value: " + x;

            // When
            Maybe<String> mapped = maybe.map(mapper);

            // Then
            assertThat(mapped.hasValue()).isTrue();
            assertThat(mapped.getValue()).isEqualTo("Value: 42");
        }

        @Test
        @DisplayName("Should remain None when mapping None")
        void Should_RemainNone_When_MappingNone() {
            // Given
            Maybe<Integer> maybe = Maybe.none();
            Function<Integer, String> mapper = x -> "Value: " + x;

            // When
            Maybe<String> mapped = maybe.map(mapper);

            // Then
            assertThat(mapped.hasValue()).isFalse();
        }

        @Test
        @DisplayName("Should return None when mapper returns null")
        void Should_ReturnNone_When_MapperReturnsNull() {
            // Given
            Integer value = 42;
            Maybe<Integer> maybe = Maybe.some(value);
            Function<Integer, String> mapper = x -> null;

            // When
            Maybe<String> mapped = maybe.map(mapper);

            // Then
            assertThat(mapped.hasValue()).isFalse();
        }

        @Test
        @DisplayName("Should return None when mapper throws exception")
        void Should_ReturnNone_When_MapperThrowsException() {
            // Given
            Integer value = 42;
            Maybe<Integer> maybe = Maybe.some(value);
            Function<Integer, String> mapper = x -> {
                throw new RuntimeException("Mapper failed");
            };

            // When
            Maybe<String> mapped = maybe.map(mapper);

            // Then
            assertThat(mapped.hasValue()).isFalse();
        }

        @Test
        @DisplayName("Should reject null mapper")
        void Should_RejectNullMapper_When_Mapping() {
            // Given
            Maybe<Integer> maybe = Maybe.some(42);

            // When & Then
            assertThatThrownBy(() -> maybe.map(null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Mapper function cannot be null");
        }

        @Test
        @DisplayName("Should chain multiple map operations")
        void Should_ChainMultipleMapOperations_When_AllSucceed() {
            // Given
            Maybe<Integer> maybe = Maybe.some(10);

            // When
            Maybe<String> mapped = maybe
                .map(x -> x * 2)
                .map(x -> x + 5)
                .map(x -> "Result: " + x);

            // Then
            assertThat(mapped.hasValue()).isTrue();
            assertThat(mapped.getValue()).isEqualTo("Result: 25");
        }

        @Test
        @DisplayName("Should stop at first failure in chain")
        void Should_StopAtFirstFailure_When_ChainingMapOperations() {
            // Given
            Maybe<Integer> maybe = Maybe.some(10);

            // When
            Maybe<String> mapped = maybe
                .map(x -> x * 2)
                .map(x -> (String) null) // Return null to trigger None
                .map(x -> "Result: " + x); // This should not execute

            // Then
            assertThat(mapped.hasValue()).isFalse();
        }
    }

    @Nested
    @DisplayName("Binding Operations")
    class BindingTests {

        @Test
        @DisplayName("Should bind value when Some")
        void Should_BindValue_When_Some() {
            // Given
            Integer value = 42;
            Maybe<Integer> maybe = Maybe.some(value);
            Function<Integer, Maybe<String>> binder = x -> Maybe.some("Value: " + x);

            // When
            Maybe<String> bound = maybe.bind(binder);

            // Then
            assertThat(bound.hasValue()).isTrue();
            assertThat(bound.getValue()).isEqualTo("Value: 42");
        }

        @Test
        @DisplayName("Should remain None when binding None")
        void Should_RemainNone_When_BindingNone() {
            // Given
            Maybe<Integer> maybe = Maybe.none();
            Function<Integer, Maybe<String>> binder = x -> Maybe.some("Value: " + x);

            // When
            Maybe<String> bound = maybe.bind(binder);

            // Then
            assertThat(bound.hasValue()).isFalse();
        }

        @Test
        @DisplayName("Should flatten nested Maybe")
        void Should_FlattenNestedMaybe_When_BindingToMaybe() {
            // Given
            Integer value = 42;
            Maybe<Integer> maybe = Maybe.some(value);
            Function<Integer, Maybe<String>> binder = x -> x > 0 ? Maybe.some("Positive") : Maybe.none();

            // When
            Maybe<String> bound = maybe.bind(binder);

            // Then
            assertThat(bound.hasValue()).isTrue();
            assertThat(bound.getValue()).isEqualTo("Positive");
        }

        @Test
        @DisplayName("Should return None when binder returns None")
        void Should_ReturnNone_When_BinderReturnsNone() {
            // Given
            Integer value = -42;
            Maybe<Integer> maybe = Maybe.some(value);
            Function<Integer, Maybe<String>> binder = x -> x > 0 ? Maybe.some("Positive") : Maybe.none();

            // When
            Maybe<String> bound = maybe.bind(binder);

            // Then
            assertThat(bound.hasValue()).isFalse();
        }

        @Test
        @DisplayName("Should return None when binder throws exception")
        void Should_ReturnNone_When_BinderThrowsException() {
            // Given
            Integer value = 42;
            Maybe<Integer> maybe = Maybe.some(value);
            Function<Integer, Maybe<String>> binder = x -> {
                throw new RuntimeException("Binder failed");
            };

            // When
            Maybe<String> bound = maybe.bind(binder);

            // Then
            assertThat(bound.hasValue()).isFalse();
        }

        @Test
        @DisplayName("Should reject null binder")
        void Should_RejectNullBinder_When_Binding() {
            // Given
            Maybe<Integer> maybe = Maybe.some(42);

            // When & Then
            assertThatThrownBy(() -> maybe.bind(null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Binder function cannot be null");
        }

        @Test
        @DisplayName("Should chain multiple bind operations")
        void Should_ChainMultipleBindOperations_When_AllSucceed() {
            // Given
            Maybe<Integer> maybe = Maybe.some(10);

            // When
            Maybe<String> bound = maybe
                .bind(x -> Maybe.some(x * 2))
                .bind(x -> Maybe.some(x + 5))
                .bind(x -> Maybe.some("Result: " + x));

            // Then
            assertThat(bound.hasValue()).isTrue();
            assertThat(bound.getValue()).isEqualTo("Result: 25");
        }

        @Test
        @DisplayName("Should stop at first None in bind chain")
        void Should_StopAtFirstNone_When_ChainingBindOperations() {
            // Given
            Maybe<Integer> maybe = Maybe.some(10);

            // When
            Maybe<String> bound = maybe
                .bind(x -> Maybe.some(x * 2))
                .bind(x -> Maybe.<Integer>none()) // Return None
                .bind(x -> Maybe.some("Result: " + x)); // This should not execute

            // Then
            assertThat(bound.hasValue()).isFalse();
        }
    }

    @Nested
    @DisplayName("Conversion Methods")
    class ConversionTests {

        @Test
        @DisplayName("Should convert Some to Optional with value")
        void Should_ConvertSomeToOptionalWithValue_When_HasValue() {
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
        void Should_ConvertNoneToEmptyOptional_When_NoValue() {
            // Given
            Maybe<String> maybe = Maybe.none();

            // When
            Optional<String> optional = maybe.toOptional();

            // Then
            assertThat(optional.isEmpty()).isTrue();
        }

        @Test
        @DisplayName("Should convert Some to successful Result")
        void Should_ConvertSomeToSuccessfulResult_When_HasValue() {
            // Given
            String value = "test";
            Maybe<String> maybe = Maybe.some(value);
            Error errorForEmpty = Error.domain("Test.Empty", "No value");

            // When
            Result<String> result = maybe.toResult(errorForEmpty);

            // Then
            assertThat(result.isSuccess()).isTrue();
            assertThat(result.getValue()).isEqualTo(value);
        }

        @Test
        @DisplayName("Should convert None to failed Result")
        void Should_ConvertNoneToFailedResult_When_NoValue() {
            // Given
            Maybe<String> maybe = Maybe.none();
            Error errorForEmpty = Error.domain("Test.Empty", "No value");

            // When
            Result<String> result = maybe.toResult(errorForEmpty);

            // Then
            assertThat(result.isFailure()).isTrue();
            assertThat(result.getError()).isEqualTo(errorForEmpty);
        }
    }

    @Nested
    @DisplayName("Equality and HashCode")
    class EqualityTests {

        @Test
        @DisplayName("Should be equal when both are None")
        void Should_BeEqual_When_BothAreNone() {
            // Given
            Maybe<String> none1 = Maybe.none();
            Maybe<String> none2 = Maybe.none();

            // When & Then
            assertThat(none1).isEqualTo(none2);
            assertThat(none1.hashCode()).isEqualTo(none2.hashCode());
        }

        @Test
        @DisplayName("Should be equal when both have same value")
        void Should_BeEqual_When_BothHaveSameValue() {
            // Given
            String value = "test";
            Maybe<String> some1 = Maybe.some(value);
            Maybe<String> some2 = Maybe.some(value);

            // When & Then
            assertThat(some1).isEqualTo(some2);
            assertThat(some1.hashCode()).isEqualTo(some2.hashCode());
        }

        @Test
        @DisplayName("Should not be equal when different values")
        void Should_NotBeEqual_When_DifferentValues() {
            // Given
            Maybe<String> some1 = Maybe.some("test1");
            Maybe<String> some2 = Maybe.some("test2");

            // When & Then
            assertThat(some1).isNotEqualTo(some2);
        }

        @Test
        @DisplayName("Should not be equal when one is None and other is Some")
        void Should_NotBeEqual_When_OneIsNoneAndOtherIsSome() {
            // Given
            Maybe<String> none = Maybe.none();
            Maybe<String> some = Maybe.some("test");

            // When & Then
            assertThat(none).isNotEqualTo(some);
            assertThat(some).isNotEqualTo(none);
        }

        @Test
        @DisplayName("Should have consistent hashCode")
        void Should_HaveConsistentHashCode_When_CalledMultipleTimes() {
            // Given
            Maybe<String> some = Maybe.some("test");
            Maybe<String> none = Maybe.none();

            // When
            int someHash1 = some.hashCode();
            int someHash2 = some.hashCode();
            int noneHash1 = none.hashCode();
            int noneHash2 = none.hashCode();

            // Then
            assertThat(someHash1).isEqualTo(someHash2);
            assertThat(noneHash1).isEqualTo(noneHash2);
        }

        @Test
        @DisplayName("Should have None hashCode as zero")
        void Should_HaveNoneHashCodeAsZero_When_CheckingNoneHashCode() {
            // Given
            Maybe<String> none = Maybe.none();

            // When
            int hashCode = none.hashCode();

            // Then
            assertThat(hashCode).isEqualTo(0);
        }
    }

    @Nested
    @DisplayName("String Representation")
    class StringRepresentationTests {

        @Test
        @DisplayName("Should provide meaningful string for Some")
        void Should_ProvideMeaningfulString_When_Some() {
            // Given
            String value = "test";
            Maybe<String> maybe = Maybe.some(value);

            // When
            String stringRepresentation = maybe.toString();

            // Then
            assertThat(stringRepresentation).contains("Some");
            assertThat(stringRepresentation).contains(value);
        }

        @Test
        @DisplayName("Should provide meaningful string for None")
        void Should_ProvideMeaningfulString_When_None() {
            // Given
            Maybe<String> maybe = Maybe.none();

            // When
            String stringRepresentation = maybe.toString();

            // Then
            assertThat(stringRepresentation).isEqualTo("None");
        }
    }

    @Nested
    @DisplayName("Null Handling")
    class NullHandlingTests {

        @Test
        @DisplayName("Should handle null gracefully in orElse")
        void Should_HandleNullGracefully_When_UsingOrElseWithNull() {
            // Given
            Maybe<String> maybe = Maybe.none();
            String nullDefault = null;

            // When
            String result = maybe.orElse(nullDefault);

            // Then
            assertThat(result).isNull();
        }

        @Test
        @DisplayName("Should handle null in equality comparison")
        void Should_HandleNullInEqualityComparison_When_ComparingWithNull() {
            // Given
            Maybe<String> maybe = Maybe.some("test");

            // When & Then
            assertThat(maybe).isNotEqualTo(null);
            assertThat(maybe.equals(null)).isFalse();
        }

        @Test
        @DisplayName("Should handle different types in equality")
        void Should_HandleDifferentTypesInEquality_When_ComparingWithDifferentType() {
            // Given
            Maybe<String> maybe = Maybe.some("test");
            String notMaybe = "test";

            // When & Then
            assertThat(maybe).isNotEqualTo(notMaybe);
        }
    }

    @Nested
    @DisplayName("Edge Cases")
    class EdgeCaseTests {

        @ParameterizedTest(name = "Edge case {0}")
        @MethodSource("edgeCaseValues")
        @DisplayName("Should handle edge case values correctly")
        void Should_HandleEdgeCaseValuesCorrectly_When_UsingVariousValues(String description, Object value) {
            // Given & When
            Maybe<Object> maybe = Maybe.some(value);

            // Then
            assertThat(maybe.hasValue()).isTrue();
            assertThat(maybe.getValue()).isEqualTo(value);
            assertThat(maybe.toString()).contains(String.valueOf(value));
        }

        static Stream<Arguments> edgeCaseValues() {
            return Stream.of(
                Arguments.of("empty string", ""),
                Arguments.of("zero integer", 0),
                Arguments.of("false boolean", false),
                Arguments.of("negative number", -1),
                Arguments.of("large number", Long.MAX_VALUE),
                Arguments.of("special characters", "!@#$%^&*()"),
                Arguments.of("unicode", "🚀🌟"),
                Arguments.of("newline", "\n"),
                Arguments.of("tab", "\t")
            );
        }

        @Test
        @DisplayName("Should work with complex objects")
        void Should_WorkWithComplexObjects_When_UsingCustomObjects() {
            // Given
            ComplexObject obj = new ComplexObject("test", 42);
            Maybe<ComplexObject> maybe = Maybe.some(obj);

            // When
            Maybe<String> mapped = maybe.map(ComplexObject::getName);

            // Then
            assertThat(mapped.hasValue()).isTrue();
            assertThat(mapped.getValue()).isEqualTo("test");
        }

        @Test
        @DisplayName("Should handle recursive operations")
        void Should_HandleRecursiveOperations_When_ChainingManyOperations() {
            // Given
            Maybe<Integer> maybe = Maybe.some(1);

            // When - Chain 100 operations
            for (int i = 0; i < 100; i++) {
                maybe = maybe.map(x -> x + 1);
            }

            // Then
            assertThat(maybe.hasValue()).isTrue();
            assertThat(maybe.getValue()).isEqualTo(101);
        }
    }

    // Helper class for complex object testing
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