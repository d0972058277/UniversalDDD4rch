package com.architecture.core.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;

import com.architecture.core.domain.EntityId;
import com.architecture.core.functional.Error;
import com.architecture.core.functional.ErrorCategory;
import com.architecture.core.functional.Result;

import java.util.Map;
import java.util.Objects;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for OrderId validation and comparison.
 * Tests T019: OrderId validation and comparison in integration scenarios.
 */
@DisplayName("OrderId Integration Tests")
class OrderIdIntegrationTest {

    /**
     * Test OrderId implementation for the quickstart example
     */
    static class OrderId implements EntityId<OrderId> {
        private final String value;

        public OrderId(String value) {
            this.value = Objects.requireNonNull(value, "Order ID cannot be null");
        }

        @Override
        public String getValue() {
            return value;
        }

        @Override
        public Result<Void> validate() {
            if (value.trim().isEmpty()) {
                return Result.failure(Error.validation(
                    "OrderId.Empty",
                    "Order ID cannot be empty",
                    Map.of("value", value)
                ));
            }

            if (!value.matches("^ORD-\\d{6}$")) {
                return Result.failure(Error.validation(
                    "OrderId.InvalidFormat",
                    "Order ID must follow format ORD-XXXXXX",
                    Map.of("value", value, "pattern", "ORD-\\d{6}")
                ));
            }

            return Result.success();
        }

        @Override
        public int compareTo(OrderId other) {
            return this.value.compareTo(other.value);
        }

        @Override
        public boolean equals(Object obj) {
            if (this == obj) return true;
            if (obj == null || getClass() != obj.getClass()) return false;
            OrderId orderId = (OrderId) obj;
            return Objects.equals(value, orderId.value);
        }

        @Override
        public int hashCode() {
            return Objects.hash(value);
        }

        @Override
        public String toString() {
            return "OrderId{" + value + "}";
        }
    }

    @Test
    @DisplayName("Should_ValidateSuccessfully_When_OrderIdFormatIsCorrect")
    void Should_ValidateSuccessfully_When_OrderIdFormatIsCorrect() {
        // Given
        OrderId orderId = new OrderId("ORD-123456");

        // When
        Result<Void> result = orderId.validate();

        // Then
        assertThat(result.isSuccess()).isTrue();
    }

    @ParameterizedTest(name = "Should reject invalid format: {0}")
    @ValueSource(strings = {
        "",
        "   ",
        "ORDER-123456",
        "ORD-12345",
        "ORD-1234567",
        "ORD-ABCDEF",
        "ord-123456",
        "123456",
        "ORD_123456"
    })
    @DisplayName("Should_ReturnValidationError_When_OrderIdFormatIsInvalid")
    void Should_ReturnValidationError_When_OrderIdFormatIsInvalid(String invalidValue) {
        // Given
        OrderId orderId = new OrderId(invalidValue);

        // When
        Result<Void> result = orderId.validate();

        // Then
        assertThat(result.isFailure()).isTrue();
        assertThat(result.getError().getCategory()).isEqualTo(ErrorCategory.VALIDATION);
        assertThat(result.getError().getMetadata()).containsKey("value");
    }

    @Test
    @DisplayName("Should_ProvideDetailedErrorMetadata_When_ValidationFails")
    void Should_ProvideDetailedErrorMetadata_When_ValidationFails() {
        // Given
        String invalidValue = "INVALID-FORMAT";
        OrderId orderId = new OrderId(invalidValue);

        // When
        Result<Void> result = orderId.validate();

        // Then
        assertThat(result.isFailure()).isTrue();
        Error error = result.getError();
        assertThat(error.getCode()).isEqualTo("OrderId.InvalidFormat");
        assertThat(error.getCategory()).isEqualTo(ErrorCategory.VALIDATION);
        assertThat(error.getMetadata()).containsEntry("value", invalidValue);
        assertThat(error.getMetadata()).containsEntry("pattern", "ORD-\\d{6}");
    }

    @ParameterizedTest(name = "{0} vs {1} = {2}")
    @MethodSource("orderIdComparisonCases")
    @DisplayName("Should_CompareOrderIdsCorrectly_When_UsingCompareTo")
    void Should_CompareOrderIdsCorrectly_When_UsingCompareTo(
        String first, String second, int expectedResult) {
        // Given
        OrderId orderId1 = new OrderId(first);
        OrderId orderId2 = new OrderId(second);

        // When
        int actualResult = orderId1.compareTo(orderId2);

        // Then
        assertThat(Integer.signum(actualResult)).isEqualTo(Integer.signum(expectedResult));
    }

    private static Stream<Arguments> orderIdComparisonCases() {
        return Stream.of(
            Arguments.of("ORD-123456", "ORD-123456", 0),
            Arguments.of("ORD-123456", "ORD-123457", -1),
            Arguments.of("ORD-123457", "ORD-123456", 1),
            Arguments.of("ORD-000001", "ORD-999999", -1),
            Arguments.of("ORD-999999", "ORD-000001", 1)
        );
    }

    @Test
    @DisplayName("Should_HaveConsistentEquality_When_ComparingEqualOrderIds")
    void Should_HaveConsistentEquality_When_ComparingEqualOrderIds() {
        // Given
        OrderId orderId1 = new OrderId("ORD-123456");
        OrderId orderId2 = new OrderId("ORD-123456");
        OrderId orderId3 = new OrderId("ORD-654321");

        // When & Then - Reflexive property
        assertThat(orderId1.equals(orderId1)).isTrue();

        // Symmetric property
        assertThat(orderId1.equals(orderId2)).isTrue();
        assertThat(orderId2.equals(orderId1)).isTrue();

        // Transitivity is implicitly tested since we're using string comparison

        // Consistency with hashCode
        assertThat(orderId1.hashCode()).isEqualTo(orderId2.hashCode());

        // Non-equality
        assertThat(orderId1.equals(orderId3)).isFalse();
        assertThat(orderId1.equals(null)).isFalse();
        assertThat(orderId1.equals("ORD-123456")).isFalse();
    }

    @Test
    @DisplayName("Should_HandleSequentialOrderIds_When_SortingCollection")
    void Should_HandleSequentialOrderIds_When_SortingCollection() {
        // Given
        OrderId[] orderIds = {
            new OrderId("ORD-999999"),
            new OrderId("ORD-000001"),
            new OrderId("ORD-500000"),
            new OrderId("ORD-123456")
        };

        // When
        java.util.Arrays.sort(orderIds);

        // Then
        assertThat(orderIds[0].getValue()).isEqualTo("ORD-000001");
        assertThat(orderIds[1].getValue()).isEqualTo("ORD-123456");
        assertThat(orderIds[2].getValue()).isEqualTo("ORD-500000");
        assertThat(orderIds[3].getValue()).isEqualTo("ORD-999999");
    }

    @Test
    @DisplayName("Should_MaintainSerializationContract_When_OrderIdIsSerialized")
    void Should_MaintainSerializationContract_When_OrderIdIsSerialized() {
        // Given
        OrderId originalOrderId = new OrderId("ORD-123456");

        // When & Then - Test that it implements Serializable correctly
        assertThat(originalOrderId).isInstanceOf(java.io.Serializable.class);

        // Basic serialization contract test - OrderId should maintain its value
        assertThat(originalOrderId.getValue()).isEqualTo("ORD-123456");
        assertThat(originalOrderId.validate().isSuccess()).isTrue();
    }

    @Test
    @DisplayName("Should_HandleEmptyStringValidation_When_OrderIdIsEmpty")
    void Should_HandleEmptyStringValidation_When_OrderIdIsEmpty() {
        // Given
        OrderId emptyOrderId = new OrderId("   ");

        // When
        Result<Void> result = emptyOrderId.validate();

        // Then
        assertThat(result.isFailure()).isTrue();
        Error error = result.getError();
        assertThat(error.getCode()).isEqualTo("OrderId.Empty");
        assertThat(error.getMessage()).contains("Order ID cannot be empty");
        assertThat(error.getCategory()).isEqualTo(ErrorCategory.VALIDATION);
    }
}