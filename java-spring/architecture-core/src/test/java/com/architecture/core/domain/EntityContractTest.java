package com.architecture.core.domain;

import com.architecture.core.functional.Result;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.*;

/**
 * Contract tests for Entity identity equality requirements.
 * Tests that all Entity implementations must satisfy.
 *
 * Requirements: FR-003 - Identity-based equality
 * Test naming: Should_ExpectedBehavior_When_StateUnderTest
 */
@DisplayName("Entity Contract Tests")
class EntityContractTest {

    @Nested
    @DisplayName("Entity Identity Equality")
    class EntityIdentityEquality {

        @Test
        @DisplayName("Should_BeEqual_When_SameId")
        void Should_BeEqual_When_SameId() {
            // Given
            TestEntityId id = new TestEntityId("ENT-123");
            TestEntity entity1 = new TestEntity(id, "Name1", "Value1");
            TestEntity entity2 = new TestEntity(id, "Name2", "Value2");

            // When & Then
            assertThat(entity1).isEqualTo(entity2);
            assertThat(entity1.hashCode()).isEqualTo(entity2.hashCode());
        }

        @Test
        @DisplayName("Should_NotBeEqual_When_DifferentId")
        void Should_NotBeEqual_When_DifferentId() {
            // Given
            TestEntityId id1 = new TestEntityId("ENT-123");
            TestEntityId id2 = new TestEntityId("ENT-456");
            TestEntity entity1 = new TestEntity(id1, "SameName", "SameValue");
            TestEntity entity2 = new TestEntity(id2, "SameName", "SameValue");

            // When & Then
            assertThat(entity1).isNotEqualTo(entity2);
        }

        @Test
        @DisplayName("Should_BeEqual_When_SameInstance")
        void Should_BeEqual_When_SameInstance() {
            // Given
            TestEntityId id = new TestEntityId("ENT-SAME");
            TestEntity entity = new TestEntity(id, "Name", "Value");

            // When & Then
            assertThat(entity).isEqualTo(entity);
        }

        @Test
        @DisplayName("Should_NotBeEqual_When_ComparedToNull")
        void Should_NotBeEqual_When_ComparedToNull() {
            // Given
            TestEntityId id = new TestEntityId("ENT-NULL");
            TestEntity entity = new TestEntity(id, "Name", "Value");

            // When & Then
            assertThat(entity).isNotEqualTo(null);
        }

        @Test
        @DisplayName("Should_NotBeEqual_When_ComparedToDifferentClass")
        void Should_NotBeEqual_When_ComparedToDifferentClass() {
            // Given
            TestEntityId id = new TestEntityId("ENT-CLASS");
            TestEntity entity = new TestEntity(id, "Name", "Value");
            OtherTestEntity otherEntity = new OtherTestEntity(id, "Description");

            // When & Then
            assertThat(entity).isNotEqualTo(otherEntity);
        }
    }

    @Nested
    @DisplayName("Entity Hash Code Stability")
    class EntityHashCodeStability {

        @Test
        @DisplayName("Should_HaveStableHashCode_When_ObjectNotModified")
        void Should_HaveStableHashCode_When_ObjectNotModified() {
            // Given
            TestEntityId id = new TestEntityId("ENT-HASH");
            TestEntity entity = new TestEntity(id, "Name", "Value");

            // When
            int hashCode1 = entity.hashCode();
            int hashCode2 = entity.hashCode();

            // Then
            assertThat(hashCode1).isEqualTo(hashCode2);
        }

        @Test
        @DisplayName("Should_HaveStableHashCode_When_NonIdFieldsModified")
        void Should_HaveStableHashCode_When_NonIdFieldsModified() {
            // Given
            TestEntityId id = new TestEntityId("ENT-STABLE");
            TestEntity entity = new TestEntity(id, "OriginalName", "OriginalValue");
            int originalHashCode = entity.hashCode();

            // When
            entity.setName("ModifiedName");
            entity.setValue("ModifiedValue");
            int modifiedHashCode = entity.hashCode();

            // Then
            assertThat(modifiedHashCode).isEqualTo(originalHashCode);
        }

        @ParameterizedTest(name = "Hash code should be stable for ID: {0}")
        @ValueSource(strings = {"ABC-123", "XYZ-456", "TEST-789", "HASH-000"})
        @DisplayName("Should_HaveConsistentHashCode_When_SameIdUsed")
        void Should_HaveConsistentHashCode_When_SameIdUsed(String idValue) {
            // Given
            TestEntityId id = new TestEntityId(idValue);
            TestEntity entity1 = new TestEntity(id, "Name1", "Value1");
            TestEntity entity2 = new TestEntity(id, "Name2", "Value2");

            // When & Then
            assertThat(entity1.hashCode()).isEqualTo(entity2.hashCode());
        }
    }

    @Nested
    @DisplayName("Entity ID Access")
    class EntityIdAccess {

        @Test
        @DisplayName("Should_ReturnCorrectId_When_GetIdCalled")
        void Should_ReturnCorrectId_When_GetIdCalled() {
            // Given
            TestEntityId expectedId = new TestEntityId("ENT-ACCESS");
            TestEntity entity = new TestEntity(expectedId, "Name", "Value");

            // When
            TestEntityId actualId = entity.getId();

            // Then
            assertThat(actualId).isEqualTo(expectedId);
            assertThat(actualId).isSameAs(expectedId);
        }

        @Test
        @DisplayName("Should_ThrowException_When_NullIdProvided")
        void Should_ThrowException_When_NullIdProvided() {
            // Given & When & Then
            assertThatThrownBy(() -> new TestEntity(null, "Name", "Value"))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Entity ID cannot be null");
        }
    }

    @Nested
    @DisplayName("Entity ToString")
    class EntityToString {

        @Test
        @DisplayName("Should_IncludeIdInString_When_ToStringCalled")
        void Should_IncludeIdInString_When_ToStringCalled() {
            // Given
            TestEntityId id = new TestEntityId("ENT-STRING");
            TestEntity entity = new TestEntity(id, "Name", "Value");

            // When
            String result = entity.toString();

            // Then
            assertThat(result).contains("TestEntity");
            assertThat(result).contains("ENT-STRING");
        }
    }

    /**
     * Test implementation of Entity for contract testing.
     * This class MUST FAIL until Entity base class is implemented.
     */
    private static class TestEntity extends Entity<TestEntityId> {
        private String name;
        private String value;

        public TestEntity(TestEntityId id, String name, String value) {
            super(id);
            this.name = name;
            this.value = value;
        }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getValue() { return value; }
        public void setValue(String value) { this.value = value; }
    }

    /**
     * Different entity type for testing class-based equality.
     */
    private static class OtherTestEntity extends Entity<TestEntityId> {
        private String description;

        public OtherTestEntity(TestEntityId id, String description) {
            super(id);
            this.description = description;
        }

        public String getDescription() { return description; }
    }

    /**
     * Test EntityId implementation for testing purposes.
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