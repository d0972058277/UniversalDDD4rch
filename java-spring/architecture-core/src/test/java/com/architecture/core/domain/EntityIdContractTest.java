package com.architecture.core.domain;

import com.architecture.core.functional.Result;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.*;

/**
 * Contract tests for EntityId interface compliance.
 * Tests that all EntityId implementations must satisfy.
 *
 * Requirements: FR-001 through FR-017 - EntityId type safety and validation
 * Test naming: Should_ExpectedBehavior_When_StateUnderTest
 */
@DisplayName("EntityId Contract Tests")
class EntityIdContractTest {

    @Nested
    @DisplayName("EntityId Validation")
    class EntityIdValidation {

        @Test
        @DisplayName("Should_ReturnSuccess_When_ValidEntityIdProvided")
        void Should_ReturnSuccess_When_ValidEntityIdProvided() {
            // Given
            TestEntityId validId = new TestEntityId("VALID-123");

            // When
            Result<Void> result = validId.validate();

            // Then
            assertThat(result.isSuccess()).isTrue();
        }

        @Test
        @DisplayName("Should_ReturnFailure_When_InvalidEntityIdProvided")
        void Should_ReturnFailure_When_InvalidEntityIdProvided() {
            // Given
            TestEntityId invalidId = new TestEntityId("");

            // When
            Result<Void> result = invalidId.validate();

            // Then
            assertThat(result.isFailure()).isTrue();
            assertThat(result.getError().getCode()).contains("Empty");
        }

        @Test
        @DisplayName("Should_ThrowException_When_NullValueProvided")
        void Should_ThrowException_When_NullValueProvided() {
            // Given
            // When & Then
            assertThatThrownBy(() -> new TestEntityId(null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("cannot be null");
        }
    }

    @Nested
    @DisplayName("EntityId Comparison")
    class EntityIdComparison {

        @Test
        @DisplayName("Should_CompareCorrectly_When_SameValues")
        void Should_CompareCorrectly_When_SameValues() {
            // Given
            TestEntityId id1 = new TestEntityId("ABC-123");
            TestEntityId id2 = new TestEntityId("ABC-123");

            // When
            int comparison = id1.compareTo(id2);

            // Then
            assertThat(comparison).isEqualTo(0);
        }

        @Test
        @DisplayName("Should_CompareCorrectly_When_DifferentValues")
        void Should_CompareCorrectly_When_DifferentValues() {
            // Given
            TestEntityId id1 = new TestEntityId("ABC-123");
            TestEntityId id2 = new TestEntityId("XYZ-456");

            // When
            int comparison = id1.compareTo(id2);

            // Then
            assertThat(comparison).isLessThan(0);
        }

        @ParameterizedTest(name = "Should compare {0} with {1} correctly")
        @MethodSource("comparisonTestCases")
        @DisplayName("Should_HandleComparison_When_VariousValuesProvided")
        void Should_HandleComparison_When_VariousValuesProvided(
            String value1, String value2, int expectedResult) {
            // Given
            TestEntityId id1 = new TestEntityId(value1);
            TestEntityId id2 = new TestEntityId(value2);

            // When
            int actualResult = Integer.signum(id1.compareTo(id2));

            // Then
            assertThat(actualResult).isEqualTo(expectedResult);
        }

        private static Stream<Arguments> comparisonTestCases() {
            return Stream.of(
                Arguments.of("A", "B", -1),
                Arguments.of("B", "A", 1),
                Arguments.of("SAME", "SAME", 0),
                Arguments.of("123", "456", -1),
                Arguments.of("999", "111", 1)
            );
        }
    }

    @Nested
    @DisplayName("EntityId Serialization")
    class EntityIdSerialization {

        @Test
        @DisplayName("Should_BeSerializable_When_EntityIdImplemented")
        void Should_BeSerializable_When_EntityIdImplemented() {
            // Given
            TestEntityId entityId = new TestEntityId("SER-123");

            // When & Then
            assertThat(entityId).isInstanceOf(java.io.Serializable.class);
        }

        @Test
        @DisplayName("Should_ReturnNonNullValue_When_GetValueCalled")
        void Should_ReturnNonNullValue_When_GetValueCalled() {
            // Given
            TestEntityId entityId = new TestEntityId("VAL-123");

            // When
            String value = entityId.getValue();

            // Then
            assertThat(value).isNotNull();
            assertThat(value).isEqualTo("VAL-123");
        }
    }

    @Nested
    @DisplayName("EntityId Equality")
    class EntityIdEquality {

        @Test
        @DisplayName("Should_BeEqual_When_SameValues")
        void Should_BeEqual_When_SameValues() {
            // Given
            TestEntityId id1 = new TestEntityId("EQUAL-123");
            TestEntityId id2 = new TestEntityId("EQUAL-123");

            // When & Then
            assertThat(id1).isEqualTo(id2);
            assertThat(id1.hashCode()).isEqualTo(id2.hashCode());
        }

        @Test
        @DisplayName("Should_NotBeEqual_When_DifferentValues")
        void Should_NotBeEqual_When_DifferentValues() {
            // Given
            TestEntityId id1 = new TestEntityId("DIFF-123");
            TestEntityId id2 = new TestEntityId("DIFF-456");

            // When & Then
            assertThat(id1).isNotEqualTo(id2);
        }

        @Test
        @DisplayName("Should_NotBeEqual_When_ComparedToNull")
        void Should_NotBeEqual_When_ComparedToNull() {
            // Given
            TestEntityId id = new TestEntityId("NULL-TEST");

            // When & Then
            assertThat(id).isNotEqualTo(null);
        }

        @Test
        @DisplayName("Should_NotBeEqual_When_ComparedToDifferentType")
        void Should_NotBeEqual_When_ComparedToDifferentType() {
            // Given
            TestEntityId id = new TestEntityId("TYPE-TEST");
            String string = "TYPE-TEST";

            // When & Then
            assertThat(id).isNotEqualTo(string);
        }
    }

    /**
     * Test implementation of EntityId for contract testing.
     * This class MUST FAIL until EntityId interface is implemented.
     */
    private static class TestEntityId implements EntityId<TestEntityId> {
        private final String value;

        public TestEntityId(String value) {
            this.value = java.util.Objects.requireNonNull(value, "Entity ID value cannot be null");
        }

        @Override
        public String getValue() {
            return value;
        }

        @Override
        public Result<Void> validate() {
            if (value.trim().isEmpty()) {
                return Result.failure("EntityId.Empty", "Entity ID cannot be empty");
            }
            return Result.success();
        }

        @Override
        public int compareTo(TestEntityId other) {
            return this.value.compareTo(other.value);
        }

        @Override
        public boolean equals(Object obj) {
            if (this == obj) return true;
            if (obj == null || getClass() != obj.getClass()) return false;
            TestEntityId that = (TestEntityId) obj;
            return java.util.Objects.equals(value, that.value);
        }

        @Override
        public int hashCode() {
            return java.util.Objects.hash(value);
        }

        @Override
        public String toString() {
            return "TestEntityId{" + value + "}";
        }
    }
}