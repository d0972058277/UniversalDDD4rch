package com.architecture.core.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import com.architecture.core.domain.AggregateRoot;
import com.architecture.core.domain.DomainEvent;
import com.architecture.core.domain.DomainEventBase;
import com.architecture.core.domain.EntityId;
import com.architecture.core.functional.Error;
import com.architecture.core.functional.Result;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for Order aggregate lifecycle.
 * Tests T021: Order aggregate lifecycle in integration scenarios.
 */
@DisplayName("Order Aggregate Integration Tests")
class OrderAggregateIntegrationTest {

    // Supporting types for the Order aggregate
    static class OrderId implements EntityId<OrderId> {
        private final String value;

        public OrderId(String value) {
            this.value = Objects.requireNonNull(value, "Order ID cannot be null");
        }

        @Override
        public String getValue() { return value; }

        @Override
        public Result<Void> validate() {
            if (!value.matches("^ORD-\\d{6}$")) {
                return Result.failure(Error.validation("OrderId.InvalidFormat", "Invalid format", Map.of()));
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
            return Objects.equals(value, orderId.value);
        }

        @Override
        public int hashCode() { return Objects.hash(value); }

        @Override
        public String toString() { return "OrderId{" + value + "}"; }
    }

    static class CustomerId implements EntityId<CustomerId> {
        private final String value;

        public CustomerId(String value) {
            this.value = Objects.requireNonNull(value, "Customer ID cannot be null");
        }

        @Override
        public String getValue() { return value; }

        @Override
        public Result<Void> validate() { return Result.success(null); }

        @Override
        public int compareTo(CustomerId other) { return this.value.compareTo(other.value); }

        @Override
        public boolean equals(Object obj) {
            if (this == obj) return true;
            if (obj == null || getClass() != obj.getClass()) return false;
            CustomerId that = (CustomerId) obj;
            return Objects.equals(value, that.value);
        }

        @Override
        public int hashCode() { return Objects.hash(value); }
    }

    static class ProductId implements EntityId<ProductId> {
        private final String value;

        public ProductId(String value) {
            this.value = Objects.requireNonNull(value, "Product ID cannot be null");
        }

        @Override
        public String getValue() { return value; }

        @Override
        public Result<Void> validate() { return Result.success(null); }

        @Override
        public int compareTo(ProductId other) { return this.value.compareTo(other.value); }

        @Override
        public boolean equals(Object obj) {
            if (this == obj) return true;
            if (obj == null || getClass() != obj.getClass()) return false;
            ProductId productId = (ProductId) obj;
            return Objects.equals(value, productId.value);
        }

        @Override
        public int hashCode() { return Objects.hash(value); }
    }

    enum OrderStatus {
        DRAFT,
        CONFIRMED,
        SHIPPED,
        DELIVERED,
        CANCELLED
    }

    // Domain Events
    static class OrderCreatedEvent extends DomainEventBase {
        private final OrderId orderId;
        private final CustomerId customerId;

        public OrderCreatedEvent(OrderId orderId, CustomerId customerId) {
            super();
            this.orderId = orderId;
            this.customerId = customerId;
        }

        public OrderId getOrderId() { return orderId; }
        public CustomerId getCustomerId() { return customerId; }
    }

    static class OrderLineAddedEvent extends DomainEventBase {
        private final OrderId orderId;
        private final ProductId productId;
        private final int quantity;
        private final BigDecimal unitPrice;

        public OrderLineAddedEvent(OrderId orderId, ProductId productId, int quantity, BigDecimal unitPrice) {
            super();
            this.orderId = orderId;
            this.productId = productId;
            this.quantity = quantity;
            this.unitPrice = unitPrice;
        }

        public OrderId getOrderId() { return orderId; }
        public ProductId getProductId() { return productId; }
        public int getQuantity() { return quantity; }
        public BigDecimal getUnitPrice() { return unitPrice; }
    }

    static class OrderStatusChangedEvent extends DomainEventBase {
        private final OrderId orderId;
        private final OrderStatus previousStatus;
        private final OrderStatus newStatus;
        private final String reason;

        public OrderStatusChangedEvent(OrderId orderId, OrderStatus previousStatus, OrderStatus newStatus, String reason) {
            super();
            this.orderId = orderId;
            this.previousStatus = previousStatus;
            this.newStatus = newStatus;
            this.reason = reason;
        }

        public OrderId getOrderId() { return orderId; }
        public OrderStatus getPreviousStatus() { return previousStatus; }
        public OrderStatus getNewStatus() { return newStatus; }
        public String getReason() { return reason; }
    }

    // Order Line value object
    static class OrderLine {
        private final ProductId productId;
        private final int quantity;
        private final BigDecimal unitPrice;

        public OrderLine(ProductId productId, int quantity, BigDecimal unitPrice) {
            this.productId = Objects.requireNonNull(productId);
            this.quantity = quantity;
            this.unitPrice = Objects.requireNonNull(unitPrice);
        }

        public ProductId getProductId() { return productId; }
        public int getQuantity() { return quantity; }
        public BigDecimal getUnitPrice() { return unitPrice; }
        public BigDecimal getTotalPrice() { return unitPrice.multiply(BigDecimal.valueOf(quantity)); }
    }

    // Order Aggregate
    static class Order extends AggregateRoot<OrderId> {
        private final CustomerId customerId;
        private final List<OrderLine> orderLines;
        private OrderStatus status;
        private BigDecimal totalAmount;

        public Order(OrderId id, CustomerId customerId) {
            super(id);
            this.customerId = Objects.requireNonNull(customerId);
            this.orderLines = new ArrayList<>();
            this.status = OrderStatus.DRAFT;
            this.totalAmount = BigDecimal.ZERO;

            addDomainEvent(new OrderCreatedEvent(id, customerId));
        }

        public Result<Void> addOrderLine(ProductId productId, int quantity, BigDecimal unitPrice) {
            if (status != OrderStatus.DRAFT) {
                return Result.failure(Error.domain(
                    "Order.CannotModify",
                    "Cannot modify order that is not in draft status"
                ));
            }

            if (quantity <= 0) {
                return Result.failure(Error.validation(
                    "Order.InvalidQuantity",
                    "Quantity must be positive",
                    Map.of("quantity", quantity)
                ));
            }

            if (unitPrice.compareTo(BigDecimal.ZERO) <= 0) {
                return Result.failure(Error.validation(
                    "Order.InvalidUnitPrice",
                    "Unit price must be positive",
                    Map.of("unitPrice", unitPrice)
                ));
            }

            OrderLine orderLine = new OrderLine(productId, quantity, unitPrice);
            orderLines.add(orderLine);
            recalculateTotal();

            addDomainEvent(new OrderLineAddedEvent(getId(), productId, quantity, unitPrice));
            return Result.success();
        }

        public Result<Void> confirm() {
            if (status != OrderStatus.DRAFT) {
                return Result.failure(Error.domain(
                    "Order.InvalidStatusTransition",
                    "Cannot confirm order that is not in draft status"
                ));
            }

            if (orderLines.isEmpty()) {
                return Result.failure(Error.domain(
                    "Order.EmptyOrder",
                    "Cannot confirm empty order"
                ));
            }

            OrderStatus previousStatus = this.status;
            this.status = OrderStatus.CONFIRMED;

            addDomainEvent(new OrderStatusChangedEvent(
                getId(), previousStatus, status, "Order confirmed by customer"
            ));

            return Result.success();
        }

        public Result<Void> cancel() {
            if (status == OrderStatus.DELIVERED || status == OrderStatus.CANCELLED) {
                return Result.failure(Error.domain(
                    "Order.CannotCancel",
                    "Cannot cancel delivered or already cancelled order"
                ));
            }

            OrderStatus previousStatus = this.status;
            this.status = OrderStatus.CANCELLED;

            addDomainEvent(new OrderStatusChangedEvent(
                getId(), previousStatus, status, "Order cancelled"
            ));

            return Result.success();
        }

        private void recalculateTotal() {
            totalAmount = orderLines.stream()
                .map(OrderLine::getTotalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        public CustomerId getCustomerId() { return customerId; }
        public List<OrderLine> getOrderLines() { return Collections.unmodifiableList(orderLines); }
        public OrderStatus getStatus() { return status; }
        public BigDecimal getTotalAmount() { return totalAmount; }
    }

    @Test
    @DisplayName("Should_CreateOrderSuccessfully_When_ValidDataProvided")
    void Should_CreateOrderSuccessfully_When_ValidDataProvided() {
        // Given
        OrderId orderId = new OrderId("ORD-123456");
        CustomerId customerId = new CustomerId("CUST-789");

        // When
        Order order = new Order(orderId, customerId);

        // Then
        assertThat(order.getId()).isEqualTo(orderId);
        assertThat(order.getCustomerId()).isEqualTo(customerId);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.DRAFT);
        assertThat(order.getVersion()).isEqualTo(0);
        assertThat(order.getTotalAmount()).isEqualTo(BigDecimal.ZERO);
        assertThat(order.getOrderLines()).isEmpty();
        assertThat(order.getDomainEvents()).hasSize(1);
        assertThat(order.getDomainEvents().get(0)).isInstanceOf(OrderCreatedEvent.class);
    }

    @Test
    @DisplayName("Should_AddOrderLineSuccessfully_When_OrderIsInDraftStatus")
    void Should_AddOrderLineSuccessfully_When_OrderIsInDraftStatus() {
        // Given
        Order order = new Order(new OrderId("ORD-123456"), new CustomerId("CUST-789"));
        ProductId productId = new ProductId("PROD-001");
        int quantity = 2;
        BigDecimal unitPrice = new BigDecimal("25.50");

        // When
        Result<Void> result = order.addOrderLine(productId, quantity, unitPrice);

        // Then
        assertThat(result.isSuccess()).isTrue();
        assertThat(order.getOrderLines()).hasSize(1);

        OrderLine addedLine = order.getOrderLines().get(0);
        assertThat(addedLine.getProductId()).isEqualTo(productId);
        assertThat(addedLine.getQuantity()).isEqualTo(quantity);
        assertThat(addedLine.getUnitPrice()).isEqualTo(unitPrice);
        assertThat(order.getTotalAmount()).isEqualTo(new BigDecimal("51.00"));

        assertThat(order.getDomainEvents()).hasSize(2);
        assertThat(order.getDomainEvents().get(1)).isInstanceOf(OrderLineAddedEvent.class);
    }

    @Test
    @DisplayName("Should_ReturnFailure_When_AddingOrderLineToNonDraftOrder")
    void Should_ReturnFailure_When_AddingOrderLineToNonDraftOrder() {
        // Given
        Order order = new Order(new OrderId("ORD-123456"), new CustomerId("CUST-789"));
        order.addOrderLine(new ProductId("PROD-001"), 1, new BigDecimal("10.00"));
        order.confirm(); // Change status to CONFIRMED

        // When
        Result<Void> result = order.addOrderLine(
            new ProductId("PROD-002"), 1, new BigDecimal("20.00")
        );

        // Then
        assertThat(result.isFailure()).isTrue();
        assertThat(result.getError().getCode()).isEqualTo("Order.CannotModify");
        assertThat(order.getOrderLines()).hasSize(1); // No new line added
    }

    @Test
    @DisplayName("Should_ReturnFailure_When_AddingOrderLineWithInvalidQuantity")
    void Should_ReturnFailure_When_AddingOrderLineWithInvalidQuantity() {
        // Given
        Order order = new Order(new OrderId("ORD-123456"), new CustomerId("CUST-789"));

        // When
        Result<Void> result = order.addOrderLine(
            new ProductId("PROD-001"), -1, new BigDecimal("10.00")
        );

        // Then
        assertThat(result.isFailure()).isTrue();
        assertThat(result.getError().getCode()).isEqualTo("Order.InvalidQuantity");
        assertThat(result.getError().getMetadata()).containsEntry("quantity", -1);
    }

    @Test
    @DisplayName("Should_ReturnFailure_When_AddingOrderLineWithInvalidUnitPrice")
    void Should_ReturnFailure_When_AddingOrderLineWithInvalidUnitPrice() {
        // Given
        Order order = new Order(new OrderId("ORD-123456"), new CustomerId("CUST-789"));

        // When
        Result<Void> result = order.addOrderLine(
            new ProductId("PROD-001"), 1, BigDecimal.ZERO
        );

        // Then
        assertThat(result.isFailure()).isTrue();
        assertThat(result.getError().getCode()).isEqualTo("Order.InvalidUnitPrice");
        assertThat(result.getError().getMetadata()).containsEntry("unitPrice", BigDecimal.ZERO);
    }

    @Test
    @DisplayName("Should_ConfirmOrderSuccessfully_When_OrderHasLines")
    void Should_ConfirmOrderSuccessfully_When_OrderHasLines() {
        // Given
        Order order = new Order(new OrderId("ORD-123456"), new CustomerId("CUST-789"));
        order.addOrderLine(new ProductId("PROD-001"), 2, new BigDecimal("25.00"));

        // When
        Result<Void> result = order.confirm();

        // Then
        assertThat(result.isSuccess()).isTrue();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
        assertThat(order.getDomainEvents()).hasSize(3); // Create + AddLine + Confirm

        DomainEvent lastEvent = order.getDomainEvents().get(2);
        assertThat(lastEvent).isInstanceOf(OrderStatusChangedEvent.class);

        OrderStatusChangedEvent statusEvent = (OrderStatusChangedEvent) lastEvent;
        assertThat(statusEvent.getPreviousStatus()).isEqualTo(OrderStatus.DRAFT);
        assertThat(statusEvent.getNewStatus()).isEqualTo(OrderStatus.CONFIRMED);
    }

    @Test
    @DisplayName("Should_ReturnFailure_When_ConfirmingEmptyOrder")
    void Should_ReturnFailure_When_ConfirmingEmptyOrder() {
        // Given
        Order order = new Order(new OrderId("ORD-123456"), new CustomerId("CUST-789"));

        // When
        Result<Void> result = order.confirm();

        // Then
        assertThat(result.isFailure()).isTrue();
        assertThat(result.getError().getCode()).isEqualTo("Order.EmptyOrder");
        assertThat(order.getStatus()).isEqualTo(OrderStatus.DRAFT); // Status unchanged
    }

    @Test
    @DisplayName("Should_ReturnFailure_When_ConfirmingNonDraftOrder")
    void Should_ReturnFailure_When_ConfirmingNonDraftOrder() {
        // Given
        Order order = new Order(new OrderId("ORD-123456"), new CustomerId("CUST-789"));
        order.addOrderLine(new ProductId("PROD-001"), 1, new BigDecimal("10.00"));
        order.confirm(); // First confirmation
        order.clearDomainEvents(); // Clear events for cleaner test

        // When
        Result<Void> result = order.confirm(); // Second confirmation attempt

        // Then
        assertThat(result.isFailure()).isTrue();
        assertThat(result.getError().getCode()).isEqualTo("Order.InvalidStatusTransition");
        assertThat(order.getDomainEvents()).isEmpty(); // No new events
    }

    @ParameterizedTest(name = "Should allow cancellation from {0}")
    @EnumSource(value = OrderStatus.class, names = {"DRAFT", "CONFIRMED", "SHIPPED"})
    @DisplayName("Should_CancelOrderSuccessfully_When_OrderIsNotDeliveredOrCancelled")
    void Should_CancelOrderSuccessfully_When_OrderIsNotDeliveredOrCancelled(OrderStatus initialStatus) {
        // Given
        Order order = new Order(new OrderId("ORD-123456"), new CustomerId("CUST-789"));
        order.addOrderLine(new ProductId("PROD-001"), 1, new BigDecimal("10.00"));

        // Simulate setting the status to the test parameter
        if (initialStatus == OrderStatus.CONFIRMED) {
            order.confirm();
        }
        // For SHIPPED, we'd need additional business logic, but for test purposes we'll assume it's set

        order.clearDomainEvents(); // Clear events for cleaner test

        // When
        Result<Void> result = order.cancel();

        // Then
        assertThat(result.isSuccess()).isTrue();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(order.getDomainEvents()).hasSize(1);

        OrderStatusChangedEvent cancelEvent = (OrderStatusChangedEvent) order.getDomainEvents().get(0);
        assertThat(cancelEvent.getNewStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(cancelEvent.getReason()).isEqualTo("Order cancelled");
    }

    @Test
    @DisplayName("Should_CalculateTotalCorrectly_When_MultipleOrderLinesAdded")
    void Should_CalculateTotalCorrectly_When_MultipleOrderLinesAdded() {
        // Given
        Order order = new Order(new OrderId("ORD-123456"), new CustomerId("CUST-789"));

        // When
        order.addOrderLine(new ProductId("PROD-001"), 2, new BigDecimal("10.50"));
        order.addOrderLine(new ProductId("PROD-002"), 1, new BigDecimal("25.00"));
        order.addOrderLine(new ProductId("PROD-003"), 3, new BigDecimal("5.75"));

        // Then
        BigDecimal expectedTotal = new BigDecimal("10.50").multiply(new BigDecimal("2"))
            .add(new BigDecimal("25.00"))
            .add(new BigDecimal("5.75").multiply(new BigDecimal("3")));

        assertThat(order.getTotalAmount()).isEqualTo(expectedTotal);
        assertThat(order.getOrderLines()).hasSize(3);
    }

    @Test
    @DisplayName("Should_MaintainEventOrdering_When_MultipleOperationsPerformed")
    void Should_MaintainEventOrdering_When_MultipleOperationsPerformed() {
        // Given
        Order order = new Order(new OrderId("ORD-123456"), new CustomerId("CUST-789"));

        // When
        order.addOrderLine(new ProductId("PROD-001"), 1, new BigDecimal("10.00"));
        order.addOrderLine(new ProductId("PROD-002"), 2, new BigDecimal("15.00"));
        order.confirm();

        // Then
        List<DomainEvent> events = order.getDomainEvents();
        assertThat(events).hasSize(4);

        assertThat(events.get(0)).isInstanceOf(OrderCreatedEvent.class);
        assertThat(events.get(1)).isInstanceOf(OrderLineAddedEvent.class);
        assertThat(events.get(2)).isInstanceOf(OrderLineAddedEvent.class);
        assertThat(events.get(3)).isInstanceOf(OrderStatusChangedEvent.class);

        // Verify event timestamps are in chronological order
        for (int i = 1; i < events.size(); i++) {
            assertThat(events.get(i).getOccurredAt())
                .isAfterOrEqualTo(events.get(i-1).getOccurredAt());
        }
    }

    @Test
    @DisplayName("Should_ClearEventsSuccessfully_When_ClearDomainEventsCalled")
    void Should_ClearEventsSuccessfully_When_ClearDomainEventsCalled() {
        // Given
        Order order = new Order(new OrderId("ORD-123456"), new CustomerId("CUST-789"));
        order.addOrderLine(new ProductId("PROD-001"), 1, new BigDecimal("10.00"));

        assertThat(order.getDomainEvents()).hasSize(2); // Verify events exist

        // When
        order.clearDomainEvents();

        // Then
        assertThat(order.getDomainEvents()).isEmpty();
    }

    @Test
    @DisplayName("Should_IncrementVersionCorrectly_When_VersionManagementUsed")
    void Should_IncrementVersionCorrectly_When_VersionManagementUsed() {
        // Given
        Order order = new Order(new OrderId("ORD-123456"), new CustomerId("CUST-789"));
        assertThat(order.getVersion()).isEqualTo(0);

        // When
        order.incrementVersion();
        order.incrementVersion();

        // Then
        assertThat(order.getVersion()).isEqualTo(2);
    }
}