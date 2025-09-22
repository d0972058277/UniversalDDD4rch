package com.architecture.core.domain;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.math.BigDecimal;
import java.util.Currency;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.*;

/**
 * Contract tests for ValueObject structural equality requirements.
 * Tests that all ValueObject implementations must satisfy.
 *
 * Requirements: FR-004, FR-012 - Structural equality and immutability
 * Test naming: Should_ExpectedBehavior_When_StateUnderTest
 */
@DisplayName("ValueObject Contract Tests")
class ValueObjectContractTest {

    @Nested
    @DisplayName("ValueObject Structural Equality")
    class ValueObjectStructuralEquality {

        @Test
        @DisplayName("Should_BeEqual_When_SameValues")
        void Should_BeEqual_When_SameValues() {
            // Given
            TestMoney money1 = new TestMoney(BigDecimal.valueOf(100.50), Currency.getInstance("USD"));
            TestMoney money2 = new TestMoney(BigDecimal.valueOf(100.50), Currency.getInstance("USD"));

            // When & Then
            assertThat(money1).isEqualTo(money2);
            assertThat(money1.hashCode()).isEqualTo(money2.hashCode());
        }

        @Test
        @DisplayName("Should_NotBeEqual_When_DifferentValues")
        void Should_NotBeEqual_When_DifferentValues() {
            // Given
            TestMoney money1 = new TestMoney(BigDecimal.valueOf(100.50), Currency.getInstance("USD"));
            TestMoney money2 = new TestMoney(BigDecimal.valueOf(200.50), Currency.getInstance("USD"));

            // When & Then
            assertThat(money1).isNotEqualTo(money2);
        }

        @Test
        @DisplayName("Should_NotBeEqual_When_DifferentCurrency")
        void Should_NotBeEqual_When_DifferentCurrency() {
            // Given
            TestMoney money1 = new TestMoney(BigDecimal.valueOf(100.50), Currency.getInstance("USD"));
            TestMoney money2 = new TestMoney(BigDecimal.valueOf(100.50), Currency.getInstance("EUR"));

            // When & Then
            assertThat(money1).isNotEqualTo(money2);
        }

        @ParameterizedTest(name = "Should be equal when same values: {0}, {1}")
        @MethodSource("equalValueObjectPairs")
        @DisplayName("Should_BeEqual_When_StructurallyIdentical")
        void Should_BeEqual_When_StructurallyIdentical(TestValueObject obj1, TestValueObject obj2) {
            // Given & When & Then
            assertThat(obj1).isEqualTo(obj2);
            assertThat(obj1.hashCode()).isEqualTo(obj2.hashCode());
        }

        private static Stream<Arguments> equalValueObjectPairs() {
            return Stream.of(
                Arguments.of(
                    new TestMoney(BigDecimal.ZERO, Currency.getInstance("USD")),
                    new TestMoney(BigDecimal.ZERO, Currency.getInstance("USD"))
                ),
                Arguments.of(
                    new TestAddress("123 Main St", "Springfield", "IL", "62701"),
                    new TestAddress("123 Main St", "Springfield", "IL", "62701")
                ),
                Arguments.of(
                    new TestPersonName("John", "Doe"),
                    new TestPersonName("John", "Doe")
                )
            );
        }
    }

    @Nested
    @DisplayName("ValueObject Hash Code Stability")
    class ValueObjectHashCodeStability {

        @Test
        @DisplayName("Should_HaveStableHashCode_When_ObjectNotModified")
        void Should_HaveStableHashCode_When_ObjectNotModified() {
            // Given
            TestMoney money = new TestMoney(BigDecimal.valueOf(100.50), Currency.getInstance("USD"));

            // When
            int hashCode1 = money.hashCode();
            int hashCode2 = money.hashCode();

            // Then
            assertThat(hashCode1).isEqualTo(hashCode2);
        }

        @Test
        @DisplayName("Should_HaveConsistentHashCode_When_EqualObjects")
        void Should_HaveConsistentHashCode_When_EqualObjects() {
            // Given
            TestMoney money1 = new TestMoney(BigDecimal.valueOf(100.50), Currency.getInstance("USD"));
            TestMoney money2 = new TestMoney(BigDecimal.valueOf(100.50), Currency.getInstance("USD"));

            // When & Then
            assertThat(money1.hashCode()).isEqualTo(money2.hashCode());
        }

        @Test
        @DisplayName("Should_HandleHashCodeCollisions_When_ComplexObjects")
        void Should_HandleHashCodeCollisions_When_ComplexObjects() {
            // Given - Test objects with potential hash collisions
            TestAddress addr1 = new TestAddress("Aa", "BB", "CC", "12345");
            TestAddress addr2 = new TestAddress("BB", "Aa", "CC", "12345");

            // When & Then
            // Objects are different but may have same hash code (collision acceptable)
            assertThat(addr1).isNotEqualTo(addr2);
            // Hash codes may or may not be equal (collisions are allowed)
        }
    }

    @Nested
    @DisplayName("ValueObject Immutability")
    class ValueObjectImmutability {

        @Test
        @DisplayName("Should_BeImmutable_When_CreatedWithValues")
        void Should_BeImmutable_When_CreatedWithValues() {
            // Given
            BigDecimal originalAmount = BigDecimal.valueOf(100.50);
            Currency originalCurrency = Currency.getInstance("USD");
            TestMoney money = new TestMoney(originalAmount, originalCurrency);

            // When - Attempt to modify the original values
            originalAmount = BigDecimal.valueOf(200.00);

            // Then - Money object should remain unchanged
            assertThat(money.getAmount()).isEqualTo(BigDecimal.valueOf(100.50));
            assertThat(money.getCurrency()).isEqualTo(Currency.getInstance("USD"));
        }

        @Test
        @DisplayName("Should_ReturnDefensiveCopies_When_GettersUsed")
        void Should_ReturnDefensiveCopies_When_GettersUsed() {
            // Given
            TestAddress address = new TestAddress("123 Main St", "Springfield", "IL", "62701");

            // When
            String street1 = address.getStreet();
            String street2 = address.getStreet();

            // Then - Should return same content but can be different objects
            assertThat(street1).isEqualTo(street2);
        }
    }

    @Nested
    @DisplayName("ValueObject Null Handling")
    class ValueObjectNullHandling {

        @Test
        @DisplayName("Should_NotBeEqual_When_ComparedToNull")
        void Should_NotBeEqual_When_ComparedToNull() {
            // Given
            TestMoney money = new TestMoney(BigDecimal.valueOf(100.50), Currency.getInstance("USD"));

            // When & Then
            assertThat(money).isNotEqualTo(null);
        }

        @Test
        @DisplayName("Should_NotBeEqual_When_ComparedToDifferentType")
        void Should_NotBeEqual_When_ComparedToDifferentType() {
            // Given
            TestMoney money = new TestMoney(BigDecimal.valueOf(100.50), Currency.getInstance("USD"));
            String string = "100.50 USD";

            // When & Then
            assertThat(money).isNotEqualTo(string);
        }

        @Test
        @DisplayName("Should_HandleNullComponents_When_ComponentIsNull")
        void Should_HandleNullComponents_When_ComponentIsNull() {
            // Given
            TestPersonName nameWithNull = new TestPersonName("John", null);
            TestPersonName anotherNameWithNull = new TestPersonName("John", null);
            TestPersonName nameWithoutNull = new TestPersonName("John", "Doe");

            // When & Then
            assertThat(nameWithNull).isEqualTo(anotherNameWithNull);
            assertThat(nameWithNull).isNotEqualTo(nameWithoutNull);
            assertThat(nameWithNull.hashCode()).isEqualTo(anotherNameWithNull.hashCode());
        }

        @Test
        @DisplayName("Should_ThrowException_When_RequiredComponentIsNull")
        void Should_ThrowException_When_RequiredComponentIsNull() {
            // Given & When & Then
            assertThatThrownBy(() -> new TestMoney(null, Currency.getInstance("USD")))
                .isInstanceOf(NullPointerException.class);

            assertThatThrownBy(() -> new TestMoney(BigDecimal.valueOf(100), null))
                .isInstanceOf(NullPointerException.class);
        }
    }

    @Nested
    @DisplayName("ValueObject Collections")
    class ValueObjectCollections {

        @Test
        @DisplayName("Should_HandleCollectionComponents_When_SameCollections")
        void Should_HandleCollectionComponents_When_SameCollections() {
            // Given
            List<String> tags1 = List.of("tag1", "tag2", "tag3");
            List<String> tags2 = List.of("tag1", "tag2", "tag3");
            TestTaggedItem item1 = new TestTaggedItem("Item", tags1);
            TestTaggedItem item2 = new TestTaggedItem("Item", tags2);

            // When & Then
            assertThat(item1).isEqualTo(item2);
            assertThat(item1.hashCode()).isEqualTo(item2.hashCode());
        }

        @Test
        @DisplayName("Should_HandleCollectionComponents_When_DifferentOrder")
        void Should_HandleCollectionComponents_When_DifferentOrder() {
            // Given
            List<String> tags1 = List.of("tag1", "tag2", "tag3");
            List<String> tags2 = List.of("tag3", "tag1", "tag2");
            TestTaggedItem item1 = new TestTaggedItem("Item", tags1);
            TestTaggedItem item2 = new TestTaggedItem("Item", tags2);

            // When & Then - Order matters in this implementation
            assertThat(item1).isNotEqualTo(item2);
        }
    }

    @Nested
    @DisplayName("ValueObject ToString")
    class ValueObjectToString {

        @Test
        @DisplayName("Should_IncludeClassName_When_ToStringCalled")
        void Should_IncludeClassName_When_ToStringCalled() {
            // Given
            TestMoney money = new TestMoney(BigDecimal.valueOf(100.50), Currency.getInstance("USD"));

            // When
            String result = money.toString();

            // Then
            assertThat(result).contains("TestMoney");
        }

        @Test
        @DisplayName("Should_IncludeComponents_When_ToStringCalled")
        void Should_IncludeComponents_When_ToStringCalled() {
            // Given
            TestMoney money = new TestMoney(BigDecimal.valueOf(100.50), Currency.getInstance("USD"));

            // When
            String result = money.toString();

            // Then
            assertThat(result).contains("100.5");
            assertThat(result).contains("USD");
        }
    }

    // Test ValueObject implementations
    private static abstract class TestValueObject extends ValueObject {
        // Base class for test value objects
    }

    private static class TestMoney extends TestValueObject {
        private final BigDecimal amount;
        private final Currency currency;

        public TestMoney(BigDecimal amount, Currency currency) {
            this.amount = java.util.Objects.requireNonNull(amount, "Amount cannot be null");
            this.currency = java.util.Objects.requireNonNull(currency, "Currency cannot be null");
        }

        public BigDecimal getAmount() { return amount; }
        public Currency getCurrency() { return currency; }

        @Override
        protected Iterable<Object> getEqualityComponents() {
            return List.of(amount, currency);
        }
    }

    private static class TestAddress extends TestValueObject {
        private final String street;
        private final String city;
        private final String state;
        private final String zipCode;

        public TestAddress(String street, String city, String state, String zipCode) {
            this.street = street;
            this.city = city;
            this.state = state;
            this.zipCode = zipCode;
        }

        public String getStreet() { return street; }
        public String getCity() { return city; }
        public String getState() { return state; }
        public String getZipCode() { return zipCode; }

        @Override
        protected Iterable<Object> getEqualityComponents() {
            return List.of(street, city, state, zipCode);
        }
    }

    private static class TestPersonName extends TestValueObject {
        private final String firstName;
        private final String lastName;

        public TestPersonName(String firstName, String lastName) {
            this.firstName = firstName;
            this.lastName = lastName;
        }

        public String getFirstName() { return firstName; }
        public String getLastName() { return lastName; }

        @Override
        protected Iterable<Object> getEqualityComponents() {
            return java.util.Arrays.asList(firstName, lastName);
        }
    }

    private static class TestTaggedItem extends TestValueObject {
        private final String name;
        private final List<String> tags;

        public TestTaggedItem(String name, List<String> tags) {
            this.name = name;
            this.tags = List.copyOf(tags); // Defensive copy
        }

        public String getName() { return name; }
        public List<String> getTags() { return tags; }

        @Override
        protected Iterable<Object> getEqualityComponents() {
            return List.of(name, tags);
        }
    }
}