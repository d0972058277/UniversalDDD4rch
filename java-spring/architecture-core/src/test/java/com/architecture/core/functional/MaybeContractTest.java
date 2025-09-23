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

@DisplayName("Maybe Contract Tests - Monadic Laws Compliance")
@Execution(ExecutionMode.CONCURRENT)
class MaybeContractTest {

    @Nested
    @DisplayName("Monadic Laws Verification")
    class MonadicLawsTests {

        @Test
        @DisplayName("Left Identity Law: Maybe.some(a).bind(f) == f(a)")
        void Should_SatisfyLeftIdentityLaw_When_BindingFunction() {
            // Given
            Integer value = 42;
            Function<Integer, Maybe<String>> f = x -> Maybe.some(String.valueOf(x * 2));

            // When
            Maybe<String> leftSide = Maybe.some(value).bind(f);
            Maybe<String> rightSide = f.apply(value);

            // Then
            assertThat(leftSide).isEqualTo(rightSide);
            assertThat(leftSide.hasValue()).isEqualTo(rightSide.hasValue());
            if (leftSide.hasValue()) {
                assertThat(leftSide.getValue()).isEqualTo(rightSide.getValue());
            }
        }

        @Test
        @DisplayName("Right Identity Law: m.bind(Maybe::some) == m")
        void Should_SatisfyRightIdentityLaw_When_BindingToSome() {
            // Given
            Maybe<Integer> maybeSome = Maybe.some(42);
            Maybe<Integer> maybeNone = Maybe.none();

            // When
            Maybe<Integer> boundSome = maybeSome.bind(Maybe::some);
            Maybe<Integer> boundNone = maybeNone.bind(Maybe::some);

            // Then
            assertThat(boundSome).isEqualTo(maybeSome);
            assertThat(boundNone).isEqualTo(maybeNone);
        }

        @Test
        @DisplayName("Associativity Law: m.bind(f).bind(g) == m.bind(x -> f(x).bind(g))")
        void Should_SatisfyAssociativityLaw_When_ChainBinding() {
            // Given
            Maybe<Integer> maybe = Maybe.some(10);
            Function<Integer, Maybe<Integer>> f = x -> Maybe.some(x * 2);
            Function<Integer, Maybe<String>> g = x -> Maybe.some("Value: " + x);

            // When
            Maybe<String> leftSide = maybe.bind(f).bind(g);
            Maybe<String> rightSide = maybe.bind(x -> f.apply(x).bind(g));

            // Then
            assertThat(leftSide).isEqualTo(rightSide);
            assertThat(leftSide.hasValue()).isEqualTo(rightSide.hasValue());
            if (leftSide.hasValue()) {
                assertThat(leftSide.getValue()).isEqualTo(rightSide.getValue());
            }
        }

        @ParameterizedTest(name = "Monadic laws with {0}")
        @MethodSource("monadicLawTestCases")
        @DisplayName("Should satisfy all monadic laws with various values")
        void Should_SatisfyAllMonadicLaws_When_UsingVariousValues(
            String description, Maybe<Integer> maybe, Integer testValue) {

            Function<Integer, Maybe<String>> f = x -> Maybe.some("f(" + x + ")");
            Function<String, Maybe<Integer>> g = s -> Maybe.some(s.length());

            // Left Identity
            Maybe<String> leftIdentityLeft = Maybe.some(testValue).bind(f);
            Maybe<String> leftIdentityRight = f.apply(testValue);
            assertThat(leftIdentityLeft).isEqualTo(leftIdentityRight);

            // Right Identity
            Maybe<Integer> rightIdentityResult = maybe.bind(Maybe::some);
            assertThat(rightIdentityResult).isEqualTo(maybe);

            // Associativity
            Maybe<Integer> associativityLeft = maybe.bind(x -> Maybe.some(x.toString())).bind(g);
            Maybe<Integer> associativityRight = maybe.bind(x -> Maybe.some(x.toString()).bind(g));
            assertThat(associativityLeft).isEqualTo(associativityRight);
        }

        static Stream<Arguments> monadicLawTestCases() {
            return Stream.of(
                Arguments.of("positive integer", Maybe.some(42), 42),
                Arguments.of("zero", Maybe.some(0), 0),
                Arguments.of("negative integer", Maybe.some(-10), -10),
                Arguments.of("none", Maybe.<Integer>none(), 99)
            );
        }
    }

    @Nested
    @DisplayName("Functor Laws Verification")
    class FunctorLawsTests {

        @Test
        @DisplayName("Identity Law: maybe.map(id) == maybe")
        void Should_SatisfyIdentityLaw_When_MappingIdentityFunction() {
            // Given
            Maybe<Integer> maybeSome = Maybe.some(42);
            Maybe<Integer> maybeNone = Maybe.none();
            Function<Integer, Integer> identity = x -> x;

            // When
            Maybe<Integer> mappedSome = maybeSome.map(identity);
            Maybe<Integer> mappedNone = maybeNone.map(identity);

            // Then
            assertThat(mappedSome).isEqualTo(maybeSome);
            assertThat(mappedNone).isEqualTo(maybeNone);
        }

        @Test
        @DisplayName("Composition Law: maybe.map(f).map(g) == maybe.map(g∘f)")
        void Should_SatisfyCompositionLaw_When_MappingComposedFunctions() {
            // Given
            Maybe<Integer> maybe = Maybe.some(10);
            Function<Integer, String> f = x -> "Value: " + x;
            Function<String, Integer> g = String::length;

            // When
            Maybe<Integer> leftSide = maybe.map(f).map(g);
            Maybe<Integer> rightSide = maybe.map(x -> g.apply(f.apply(x)));

            // Then
            assertThat(leftSide).isEqualTo(rightSide);
            assertThat(leftSide.hasValue()).isEqualTo(rightSide.hasValue());
            if (leftSide.hasValue()) {
                assertThat(leftSide.getValue()).isEqualTo(rightSide.getValue());
            }
        }
    }

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
            assertThat(maybe.getValue()).isEqualTo(value);
            assertThat(maybe.isEmpty()).isFalse();
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
        @DisplayName("Should create from nullable value correctly")
        void Should_CreateFromNullableValueCorrectly_When_UsingFromNullable() {
            // Given
            String nonNullValue = "test";
            String nullValue = null;

            // When
            Maybe<String> maybeFromNonNull = Maybe.fromNullable(nonNullValue);
            Maybe<String> maybeFromNull = Maybe.fromNullable(nullValue);

            // Then
            assertThat(maybeFromNonNull.hasValue()).isTrue();
            assertThat(maybeFromNonNull.getValue()).isEqualTo(nonNullValue);
            assertThat(maybeFromNull.hasValue()).isFalse();
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
    @DisplayName("Value Extraction")
    class ValueExtractionTests {

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
        @DisplayName("Should return default value when None")
        void Should_ReturnDefaultValue_When_None() {
            // Given
            Maybe<String> maybe = Maybe.none();
            String defaultValue = "default";

            // When
            String result = maybe.orElse(defaultValue);

            // Then
            assertThat(result).isEqualTo(defaultValue);
        }

        @Test
        @DisplayName("Should return value when Some")
        void Should_ReturnValue_When_Some() {
            // Given
            String value = "test";
            Maybe<String> maybe = Maybe.some(value);
            String defaultValue = "default";

            // When
            String result = maybe.orElse(defaultValue);

            // Then
            assertThat(result).isEqualTo(value);
        }

        @Test
        @DisplayName("Should call supplier when None")
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
        @DisplayName("Should not call supplier when Some")
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
    }
}