package com.architecture.core.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import com.architecture.core.domain.Repository;
import com.architecture.core.functional.Maybe;
import com.architecture.core.functional.Result;
import com.architecture.core.infrastructure.CancellationToken;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;

/**
 * Integration tests for Order repository operations.
 * Tests T022: Order repository operations in integration scenarios.
 */
@DisplayName("Order Repository Integration Tests")
class OrderRepositoryIntegrationTest {

    // Reusing types from OrderAggregateIntegrationTest for consistency
    private static class OrderId implements com.architecture.core.domain.EntityId<OrderId> {
        private final String value;

        public OrderId(String value) {
            this.value = java.util.Objects.requireNonNull(value, "Order ID cannot be null");
        }

        @Override
        public String getValue() { return value; }

        @Override
        public Result<Void> validate() {
            if (!value.matches("^ORD-\\d{6}$")) {
                return Result.failure(com.architecture.core.functional.Error.validation(
                    "OrderId.InvalidFormat", "Invalid format", java.util.Map.of()));
            }
            return Result.success();
        }

        @Override
        public int compareTo(OrderId other) { return this.value.compareTo(other.value); }

        @Override
        public boolean equals(Object obj) {
            if (this == obj) return true;
            if (obj == null || getClass() != obj.getClass()) return false;
            OrderId orderId = (OrderId) obj;
            return java.util.Objects.equals(value, orderId.value);
        }

        @Override
        public int hashCode() { return java.util.Objects.hash(value); }

        @Override
        public String toString() { return "OrderId{" + value + "}"; }
    }

    private static class CustomerId implements com.architecture.core.domain.EntityId<CustomerId> {
        private final String value;

        public CustomerId(String value) {
            this.value = java.util.Objects.requireNonNull(value, "Customer ID cannot be null");
        }

        @Override
        public String getValue() { return value; }

        @Override
        public Result<Void> validate() { return Result.success(); }

        @Override
        public int compareTo(CustomerId other) { return this.value.compareTo(other.value); }

        @Override
        public boolean equals(Object obj) {
            if (this == obj) return true;
            if (obj == null || getClass() != obj.getClass()) return false;
            CustomerId that = (CustomerId) obj;
            return java.util.Objects.equals(value, that.value);
        }

        @Override
        public int hashCode() { return java.util.Objects.hash(value); }
    }

    private static class Order extends com.architecture.core.domain.AggregateRoot<OrderId> {
        private final CustomerId customerId;

        public Order(OrderId id, CustomerId customerId) {
            super(id);
            this.customerId = java.util.Objects.requireNonNull(customerId);
        }

        public Order(OrderId id, CustomerId customerId, long version) {
            super(id, version);
            this.customerId = java.util.Objects.requireNonNull(customerId);
        }

        public CustomerId getCustomerId() { return customerId; }
    }

    // Repository interface for Orders
    interface OrderRepository extends Repository<Order, OrderId> {
        CompletableFuture<java.util.List<Order>> findByCustomerIdAsync(
            CustomerId customerId,
            CancellationToken cancellationToken
        );
    }

    @Mock
    private OrderRepository mockRepository;

    private OrderId testOrderId;
    private CustomerId testCustomerId;
    private Order testOrder;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        testOrderId = new OrderId("ORD-123456");
        testCustomerId = new CustomerId("CUST-789");
        testOrder = new Order(testOrderId, testCustomerId);
    }

    @Test
    @DisplayName("Should_RetrieveOrderSuccessfully_When_OrderExists")
    void Should_RetrieveOrderSuccessfully_When_OrderExists() throws ExecutionException, InterruptedException {
        // Given
        when(mockRepository.getByIdAsync(eq(testOrderId), any(CancellationToken.class)))
            .thenReturn(CompletableFuture.completedFuture(Maybe.some(testOrder)));

        // When
        CompletableFuture<Maybe<Order>> future = mockRepository.getByIdAsync(
            testOrderId, CancellationToken.none()
        );
        Maybe<Order> result = future.get();

        // Then
        assertThat(result.hasValue()).isTrue();
        assertThat(result.getValue().getId()).isEqualTo(testOrderId);
        assertThat(result.getValue().getCustomerId()).isEqualTo(testCustomerId);

        verify(mockRepository, times(1)).getByIdAsync(eq(testOrderId), any(CancellationToken.class));
    }

    @Test
    @DisplayName("Should_ReturnNone_When_OrderDoesNotExist")
    void Should_ReturnNone_When_OrderDoesNotExist() throws ExecutionException, InterruptedException {
        // Given
        OrderId nonExistentId = new OrderId("ORD-999999");
        when(mockRepository.getByIdAsync(eq(nonExistentId), any(CancellationToken.class)))
            .thenReturn(CompletableFuture.completedFuture(Maybe.none()));

        // When
        CompletableFuture<Maybe<Order>> future = mockRepository.getByIdAsync(
            nonExistentId, CancellationToken.none()
        );
        Maybe<Order> result = future.get();

        // Then
        assertThat(result.hasValue()).isFalse();
        assertThat(result.isEmpty()).isTrue();

        verify(mockRepository, times(1)).getByIdAsync(eq(nonExistentId), any(CancellationToken.class));
    }

    @Test
    @DisplayName("Should_AddOrderSuccessfully_When_ValidOrderProvided")
    void Should_AddOrderSuccessfully_When_ValidOrderProvided() throws ExecutionException, InterruptedException {
        // Given
        when(mockRepository.addAsync(eq(testOrder), any(CancellationToken.class)))
            .thenReturn(CompletableFuture.completedFuture(Result.success()));

        // When
        CompletableFuture<Result<Void>> future = mockRepository.addAsync(
            testOrder, CancellationToken.none()
        );
        Result<Void> result = future.get();

        // Then
        assertThat(result.isSuccess()).isTrue();

        verify(mockRepository, times(1)).addAsync(eq(testOrder), any(CancellationToken.class));
    }

    @Test
    @DisplayName("Should_ReturnFailure_When_AddOrderFails")
    void Should_ReturnFailure_When_AddOrderFails() throws ExecutionException, InterruptedException {
        // Given
        com.architecture.core.functional.Error dbError = com.architecture.core.functional.Error.infrastructure(
            "Database.ConnectionFailed",
            "Failed to connect to database",
            new RuntimeException("Connection timeout")
        );
        when(mockRepository.addAsync(eq(testOrder), any(CancellationToken.class)))
            .thenReturn(CompletableFuture.completedFuture(Result.failure(dbError)));

        // When
        CompletableFuture<Result<Void>> future = mockRepository.addAsync(
            testOrder, CancellationToken.none()
        );
        Result<Void> result = future.get();

        // Then
        assertThat(result.isFailure()).isTrue();
        assertThat(result.getError().getCode()).isEqualTo("Database.ConnectionFailed");
        assertThat(result.getError().getCategory()).isEqualTo(com.architecture.core.functional.ErrorCategory.INFRASTRUCTURE);

        verify(mockRepository, times(1)).addAsync(eq(testOrder), any(CancellationToken.class));
    }

    @Test
    @DisplayName("Should_UpdateOrderSuccessfully_When_ValidOrderProvided")
    void Should_UpdateOrderSuccessfully_When_ValidOrderProvided() throws ExecutionException, InterruptedException {
        // Given
        Order updatedOrder = new Order(testOrderId, testCustomerId, 1); // Incremented version
        when(mockRepository.updateAsync(eq(updatedOrder), any(CancellationToken.class)))
            .thenReturn(CompletableFuture.completedFuture(Result.success()));

        // When
        CompletableFuture<Result<Void>> future = mockRepository.updateAsync(
            updatedOrder, CancellationToken.none()
        );
        Result<Void> result = future.get();

        // Then
        assertThat(result.isSuccess()).isTrue();

        verify(mockRepository, times(1)).updateAsync(eq(updatedOrder), any(CancellationToken.class));
    }

    @Test
    @DisplayName("Should_ReturnConcurrencyError_When_VersionConflictOccurs")
    void Should_ReturnConcurrencyError_When_VersionConflictOccurs() throws ExecutionException, InterruptedException {
        // Given
        com.architecture.core.functional.Error concurrencyError = com.architecture.core.functional.Error.concurrency(
            "Order.VersionConflict",
            "Order has been modified by another user"
        );
        when(mockRepository.updateAsync(eq(testOrder), any(CancellationToken.class)))
            .thenReturn(CompletableFuture.completedFuture(Result.failure(concurrencyError)));

        // When
        CompletableFuture<Result<Void>> future = mockRepository.updateAsync(
            testOrder, CancellationToken.none()
        );
        Result<Void> result = future.get();

        // Then
        assertThat(result.isFailure()).isTrue();
        assertThat(result.getError().getCode()).isEqualTo("Order.VersionConflict");
        assertThat(result.getError().getCategory()).isEqualTo(com.architecture.core.functional.ErrorCategory.CONCURRENCY);

        verify(mockRepository, times(1)).updateAsync(eq(testOrder), any(CancellationToken.class));
    }

    @Test
    @DisplayName("Should_DeleteOrderSuccessfully_When_OrderExists")
    void Should_DeleteOrderSuccessfully_When_OrderExists() throws ExecutionException, InterruptedException {
        // Given
        when(mockRepository.deleteAsync(eq(testOrderId), any(CancellationToken.class)))
            .thenReturn(CompletableFuture.completedFuture(Result.success()));

        // When
        CompletableFuture<Result<Void>> future = mockRepository.deleteAsync(
            testOrderId, CancellationToken.none()
        );
        Result<Void> result = future.get();

        // Then
        assertThat(result.isSuccess()).isTrue();

        verify(mockRepository, times(1)).deleteAsync(eq(testOrderId), any(CancellationToken.class));
    }

    @Test
    @DisplayName("Should_ReturnFailure_When_DeleteOrderDoesNotExist")
    void Should_ReturnFailure_When_DeleteOrderDoesNotExist() throws ExecutionException, InterruptedException {
        // Given
        OrderId nonExistentId = new OrderId("ORD-999999");
        com.architecture.core.functional.Error notFoundError = com.architecture.core.functional.Error.domain(
            "Order.NotFound",
            "Order with specified ID does not exist"
        );
        when(mockRepository.deleteAsync(eq(nonExistentId), any(CancellationToken.class)))
            .thenReturn(CompletableFuture.completedFuture(Result.failure(notFoundError)));

        // When
        CompletableFuture<Result<Void>> future = mockRepository.deleteAsync(
            nonExistentId, CancellationToken.none()
        );
        Result<Void> result = future.get();

        // Then
        assertThat(result.isFailure()).isTrue();
        assertThat(result.getError().getCode()).isEqualTo("Order.NotFound");

        verify(mockRepository, times(1)).deleteAsync(eq(nonExistentId), any(CancellationToken.class));
    }

    @Test
    @DisplayName("Should_CheckExistenceCorrectly_When_OrderExistsOrNot")
    void Should_CheckExistenceCorrectly_When_OrderExistsOrNot() throws ExecutionException, InterruptedException {
        // Given
        when(mockRepository.existsAsync(eq(testOrderId), any(CancellationToken.class)))
            .thenReturn(CompletableFuture.completedFuture(true));

        OrderId nonExistentId = new OrderId("ORD-999999");
        when(mockRepository.existsAsync(eq(nonExistentId), any(CancellationToken.class)))
            .thenReturn(CompletableFuture.completedFuture(false));

        // When
        Boolean existsResult = mockRepository.existsAsync(testOrderId, CancellationToken.none()).get();
        Boolean notExistsResult = mockRepository.existsAsync(nonExistentId, CancellationToken.none()).get();

        // Then
        assertThat(existsResult).isTrue();
        assertThat(notExistsResult).isFalse();

        verify(mockRepository, times(1)).existsAsync(eq(testOrderId), any(CancellationToken.class));
        verify(mockRepository, times(1)).existsAsync(eq(nonExistentId), any(CancellationToken.class));
    }

    @Test
    @DisplayName("Should_FindByCustomerIdSuccessfully_When_CustomerHasOrders")
    void Should_FindByCustomerIdSuccessfully_When_CustomerHasOrders() throws ExecutionException, InterruptedException {
        // Given
        Order order1 = new Order(new OrderId("ORD-123456"), testCustomerId);
        Order order2 = new Order(new OrderId("ORD-123457"), testCustomerId);
        java.util.List<Order> customerOrders = java.util.Arrays.asList(order1, order2);

        when(mockRepository.findByCustomerIdAsync(eq(testCustomerId), any(CancellationToken.class)))
            .thenReturn(CompletableFuture.completedFuture(customerOrders));

        // When
        CompletableFuture<java.util.List<Order>> future = mockRepository.findByCustomerIdAsync(
            testCustomerId, CancellationToken.none()
        );
        java.util.List<Order> result = future.get();

        // Then
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getId().getValue()).isEqualTo("ORD-123456");
        assertThat(result.get(1).getId().getValue()).isEqualTo("ORD-123457");
        assertThat(result.stream().allMatch(order -> order.getCustomerId().equals(testCustomerId))).isTrue();

        verify(mockRepository, times(1)).findByCustomerIdAsync(eq(testCustomerId), any(CancellationToken.class));
    }

    @Test
    @DisplayName("Should_ReturnEmptyList_When_CustomerHasNoOrders")
    void Should_ReturnEmptyList_When_CustomerHasNoOrders() throws ExecutionException, InterruptedException {
        // Given
        CustomerId customerWithNoOrders = new CustomerId("CUST-000");
        when(mockRepository.findByCustomerIdAsync(eq(customerWithNoOrders), any(CancellationToken.class)))
            .thenReturn(CompletableFuture.completedFuture(java.util.Collections.emptyList()));

        // When
        CompletableFuture<java.util.List<Order>> future = mockRepository.findByCustomerIdAsync(
            customerWithNoOrders, CancellationToken.none()
        );
        java.util.List<Order> result = future.get();

        // Then
        assertThat(result).isEmpty();

        verify(mockRepository, times(1)).findByCustomerIdAsync(eq(customerWithNoOrders), any(CancellationToken.class));
    }

    @Test
    @DisplayName("Should_HandleTimeoutGracefully_When_OperationTakesTooLong")
    void Should_HandleTimeoutGracefully_When_OperationTakesTooLong() {
        // Given
        CompletableFuture<Maybe<Order>> slowFuture = new CompletableFuture<>();
        when(mockRepository.getByIdAsync(eq(testOrderId), any(CancellationToken.class)))
            .thenReturn(slowFuture);

        // When & Then
        assertThatThrownBy(() -> {
            mockRepository.getByIdAsync(testOrderId, CancellationToken.none())
                .get(100, TimeUnit.MILLISECONDS); // Short timeout for test
        }).isInstanceOf(TimeoutException.class);

        verify(mockRepository, times(1)).getByIdAsync(eq(testOrderId), any(CancellationToken.class));
    }

    @Test
    @DisplayName("Should_HandleCancellationCorrectly_When_CancellationTokenIsTriggered")
    void Should_HandleCancellationCorrectly_When_CancellationTokenIsTriggered() throws ExecutionException, InterruptedException {
        // Given
        CancellationToken cancelledToken = new TestCancellationToken(true);
        com.architecture.core.functional.Error cancellationError = com.architecture.core.functional.Error.infrastructure(
            "Operation.Cancelled",
            "Operation was cancelled",
            new com.architecture.core.infrastructure.OperationCancelledException()
        );
        when(mockRepository.getByIdAsync(eq(testOrderId), eq(cancelledToken)))
            .thenReturn(CompletableFuture.completedFuture(Maybe.none())); // Simulating cancelled operation

        // When
        CompletableFuture<Maybe<Order>> future = mockRepository.getByIdAsync(testOrderId, cancelledToken);
        Maybe<Order> result = future.get();

        // Then
        assertThat(result.isEmpty()).isTrue(); // Cancelled operations typically return empty results

        verify(mockRepository, times(1)).getByIdAsync(eq(testOrderId), eq(cancelledToken));
    }

    @Test
    @DisplayName("Should_HandleAsyncExceptionsCorrectly_When_RepositoryThrowsException")
    void Should_HandleAsyncExceptionsCorrectly_When_RepositoryThrowsException() {
        // Given
        CompletableFuture<Maybe<Order>> faultyFuture = CompletableFuture.supplyAsync(() -> {
            throw new RuntimeException("Database connection failed");
        });
        when(mockRepository.getByIdAsync(eq(testOrderId), any(CancellationToken.class)))
            .thenReturn(faultyFuture);

        // When & Then
        assertThatThrownBy(() -> {
            mockRepository.getByIdAsync(testOrderId, CancellationToken.none()).get();
        }).isInstanceOf(ExecutionException.class)
          .hasCauseInstanceOf(RuntimeException.class)
          .hasRootCauseMessage("Database connection failed");

        verify(mockRepository, times(1)).getByIdAsync(eq(testOrderId), any(CancellationToken.class));
    }

    // Test implementation of CancellationToken for testing purposes
    private static class TestCancellationToken implements CancellationToken {
        private final boolean isCancelled;

        public TestCancellationToken(boolean isCancelled) {
            this.isCancelled = isCancelled;
        }

        @Override
        public boolean isCancellationRequested() {
            return isCancelled;
        }

        @Override
        public void throwIfCancellationRequested() throws com.architecture.core.infrastructure.OperationCancelledException {
            if (isCancelled) {
                throw new com.architecture.core.infrastructure.OperationCancelledException("Operation was cancelled");
            }
        }
    }
}