import com.architecture.core.domain.*;
import com.architecture.core.functional.Error;
import com.architecture.core.functional.Maybe;
import com.architecture.core.functional.Result;

import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.CompletableFuture;

/**
 * Architecture.Core Java Quickstart Example
 * Demonstrates usage of DDD abstractions and functional types with an Order domain.
 *
 * This example shows:
 * 1. Entity identifiers with validation
 * 2. Value objects with structural equality
 * 3. Aggregate roots with domain events
 * 4. Functional error handling with Result and Maybe
 * 5. Repository pattern for data access
 */
public class QuickstartExample {

    // ===========================================================================================
    // 1. ENTITY IDENTIFIERS
    // ===========================================================================================

    /**
     * Order identifier with validation rules
     */
    static class OrderId implements EntityId<OrderId> {
        private final String value;

        public OrderId(String value) {
            this.value = Objects.requireNonNull(value, "Order ID cannot be null");
        }

        @Override
        public String getValue() { return value; }

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

            return Result.success(null);
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

    // ===========================================================================================
    // 2. VALUE OBJECTS
    // ===========================================================================================

    /**
     * Money value object with currency support
     */
    static class Money extends ValueObject {
        private final BigDecimal amount;
        private final Currency currency;

        public Money(BigDecimal amount, Currency currency) {
            this.amount = Objects.requireNonNull(amount, "Amount cannot be null");
            this.currency = Objects.requireNonNull(currency, "Currency cannot be null");

            if (amount.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Amount cannot be negative");
            }
        }

        public BigDecimal getAmount() { return amount; }
        public Currency getCurrency() { return currency; }

        public Money add(Money other) {
            if (!this.currency.equals(other.currency)) {
                throw new IllegalArgumentException("Cannot add money with different currencies");
            }
            return new Money(this.amount.add(other.amount), this.currency);
        }

        public Money multiply(BigDecimal factor) {
            return new Money(this.amount.multiply(factor), this.currency);
        }

        @Override
        protected Iterable<Object> getEqualityComponents() {
            return List.of(amount, currency);
        }

        // Factory methods
        public static Money usd(double amount) {
            return new Money(BigDecimal.valueOf(amount), Currency.getInstance("USD"));
        }

        public static Money eur(double amount) {
            return new Money(BigDecimal.valueOf(amount), Currency.getInstance("EUR"));
        }
    }

    // ===========================================================================================
    // 3. DOMAIN EVENTS
    // ===========================================================================================

    static class OrderCreatedEvent extends DomainEventBase {
        private final OrderId orderId;
        private final CustomerId customerId;
        private final Money totalAmount;

        public OrderCreatedEvent(OrderId orderId, CustomerId customerId, Money totalAmount) {
            super();
            this.orderId = Objects.requireNonNull(orderId);
            this.customerId = Objects.requireNonNull(customerId);
            this.totalAmount = Objects.requireNonNull(totalAmount);
        }

        public OrderId getOrderId() { return orderId; }
        public CustomerId getCustomerId() { return customerId; }
        public Money getTotalAmount() { return totalAmount; }
    }

    static class OrderLineAddedEvent extends DomainEventBase {
        private final OrderId orderId;
        private final ProductId productId;
        private final int quantity;
        private final Money unitPrice;

        public OrderLineAddedEvent(OrderId orderId, ProductId productId, int quantity, Money unitPrice) {
            super();
            this.orderId = orderId;
            this.productId = productId;
            this.quantity = quantity;
            this.unitPrice = unitPrice;
        }

        public OrderId getOrderId() { return orderId; }
        public ProductId getProductId() { return productId; }
        public int getQuantity() { return quantity; }
        public Money getUnitPrice() { return unitPrice; }
    }

    // ===========================================================================================
    // 4. AGGREGATE ROOT
    // ===========================================================================================

    enum OrderStatus { DRAFT, CONFIRMED, SHIPPED, DELIVERED, CANCELLED }

    static class OrderLine {
        private final ProductId productId;
        private final int quantity;
        private final Money unitPrice;

        public OrderLine(ProductId productId, int quantity, Money unitPrice) {
            this.productId = Objects.requireNonNull(productId);
            this.quantity = quantity;
            this.unitPrice = Objects.requireNonNull(unitPrice);
        }

        public ProductId getProductId() { return productId; }
        public int getQuantity() { return quantity; }
        public Money getUnitPrice() { return unitPrice; }
        public Money getTotalPrice() { return unitPrice.multiply(BigDecimal.valueOf(quantity)); }
    }

    /**
     * Order aggregate root with business logic and event sourcing
     */
    static class Order extends AggregateRoot<OrderId> {
        private final CustomerId customerId;
        private final List<OrderLine> orderLines;
        private OrderStatus status;
        private Money totalAmount;

        public Order(OrderId id, CustomerId customerId) {
            super(id);
            this.customerId = Objects.requireNonNull(customerId);
            this.orderLines = new ArrayList<>();
            this.status = OrderStatus.DRAFT;
            this.totalAmount = Money.usd(0);

            addDomainEvent(new OrderCreatedEvent(id, customerId, totalAmount));
        }

        public Result<Void> addOrderLine(ProductId productId, int quantity, Money unitPrice) {
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

            OrderLine orderLine = new OrderLine(productId, quantity, unitPrice);
            orderLines.add(orderLine);
            recalculateTotal();

            addDomainEvent(new OrderLineAddedEvent(getId(), productId, quantity, unitPrice));
            return Result.success(null);
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

            this.status = OrderStatus.CONFIRMED;
            return Result.success(null);
        }

        private void recalculateTotal() {
            totalAmount = orderLines.stream()
                .map(OrderLine::getTotalPrice)
                .reduce(Money.usd(0), Money::add);
        }

        public CustomerId getCustomerId() { return customerId; }
        public List<OrderLine> getOrderLines() { return Collections.unmodifiableList(orderLines); }
        public OrderStatus getStatus() { return status; }
        public Money getTotalAmount() { return totalAmount; }
    }

    // ===========================================================================================
    // 5. REPOSITORY PATTERN
    // ===========================================================================================

    /**
     * Order repository interface
     */
    interface OrderRepository extends Repository<Order, OrderId> {
        CompletableFuture<List<Order>> findByCustomerIdAsync(
            CustomerId customerId,
            com.architecture.core.infrastructure.CancellationToken cancellationToken
        );
    }

    /**
     * In-memory implementation for demonstration
     */
    static class InMemoryOrderRepository implements OrderRepository {
        private final Map<OrderId, Order> orders = new HashMap<>();

        @Override
        public CompletableFuture<Maybe<Order>> getByIdAsync(
            OrderId id,
            com.architecture.core.infrastructure.CancellationToken cancellationToken
        ) {
            return CompletableFuture.completedFuture(
                orders.containsKey(id) ? Maybe.some(orders.get(id)) : Maybe.none()
            );
        }

        @Override
        public CompletableFuture<Result<Void>> addAsync(
            Order aggregate,
            com.architecture.core.infrastructure.CancellationToken cancellationToken
        ) {
            orders.put(aggregate.getId(), aggregate);
            return CompletableFuture.completedFuture(Result.success(null));
        }

        @Override
        public CompletableFuture<Result<Void>> updateAsync(
            Order aggregate,
            com.architecture.core.infrastructure.CancellationToken cancellationToken
        ) {
            if (!orders.containsKey(aggregate.getId())) {
                return CompletableFuture.completedFuture(
                    Result.failure(Error.domain("Order.NotFound", "Order not found"))
                );
            }
            orders.put(aggregate.getId(), aggregate);
            return CompletableFuture.completedFuture(Result.success(null));
        }

        @Override
        public CompletableFuture<Result<Void>> deleteAsync(
            OrderId id,
            com.architecture.core.infrastructure.CancellationToken cancellationToken
        ) {
            if (!orders.containsKey(id)) {
                return CompletableFuture.completedFuture(
                    Result.failure(Error.domain("Order.NotFound", "Order not found"))
                );
            }
            orders.remove(id);
            return CompletableFuture.completedFuture(Result.success(null));
        }

        @Override
        public CompletableFuture<Boolean> existsAsync(
            OrderId id,
            com.architecture.core.infrastructure.CancellationToken cancellationToken
        ) {
            return CompletableFuture.completedFuture(orders.containsKey(id));
        }

        @Override
        public CompletableFuture<List<Order>> findByCustomerIdAsync(
            CustomerId customerId,
            com.architecture.core.infrastructure.CancellationToken cancellationToken
        ) {
            List<Order> customerOrders = orders.values().stream()
                .filter(order -> order.getCustomerId().equals(customerId))
                .toList();
            return CompletableFuture.completedFuture(customerOrders);
        }
    }

    // ===========================================================================================
    // 6. APPLICATION SERVICE
    // ===========================================================================================

    /**
     * Order service demonstrating functional composition
     */
    static class OrderService {
        private final OrderRepository orderRepository;

        public OrderService(OrderRepository orderRepository) {
            this.orderRepository = orderRepository;
        }

        public Result<OrderId> createOrder(CustomerId customerId, List<OrderLineRequest> lineRequests) {
            // Validate input
            if (lineRequests.isEmpty()) {
                return Result.failure(Error.validation(
                    "OrderService.EmptyLines",
                    "Cannot create order without order lines",
                    Map.of()
                ));
            }

            // Generate new order ID
            OrderId orderId = new OrderId("ORD-" + String.format("%06d",
                new Random().nextInt(1000000)));
            Order order = new Order(orderId, customerId);

            // Add order lines using functional composition
            Result<Void> addLinesResult = lineRequests.stream()
                .map(req -> order.addOrderLine(req.getProductId(), req.getQuantity(), req.getUnitPrice()))
                .reduce(Result.success(null), (acc, result) ->
                    acc.bind(ignored -> result)
                );

            if (addLinesResult.isFailure()) {
                return Result.failure(addLinesResult.getError());
            }

            // Save order
            try {
                orderRepository.addAsync(order, com.architecture.core.infrastructure.CancellationToken.none()).get();
                return Result.success(orderId);
            } catch (Exception e) {
                return Result.failure(Error.infrastructure("OrderService.SaveFailed",
                    "Failed to save order", e));
            }
        }

        public Result<String> processOrderWorkflow(CustomerId customerId, List<OrderLineRequest> lines) {
            return createOrder(customerId, lines)
                .bind(this::confirmOrder)
                .map(order -> "Order processed successfully: " + order.getId());
        }

        private Result<Order> confirmOrder(OrderId orderId) {
            try {
                Maybe<Order> maybeOrder = orderRepository.getByIdAsync(
                    orderId, com.architecture.core.infrastructure.CancellationToken.none()).get();

                if (maybeOrder.isEmpty()) {
                    return Result.failure(Error.domain("Order.NotFound", "Order not found"));
                }

                Order order = maybeOrder.getValue();
                Result<Void> confirmResult = order.confirm();

                if (confirmResult.isFailure()) {
                    return Result.failure(confirmResult.getError());
                }

                orderRepository.updateAsync(order, com.architecture.core.infrastructure.CancellationToken.none()).get();
                return Result.success(order);

            } catch (Exception e) {
                return Result.failure(Error.infrastructure("OrderService.ConfirmFailed",
                    "Failed to confirm order", e));
            }
        }
    }

    /**
     * Order line request DTO
     */
    static class OrderLineRequest {
        private final ProductId productId;
        private final int quantity;
        private final Money unitPrice;

        public OrderLineRequest(ProductId productId, int quantity, Money unitPrice) {
            this.productId = productId;
            this.quantity = quantity;
            this.unitPrice = unitPrice;
        }

        public ProductId getProductId() { return productId; }
        public int getQuantity() { return quantity; }
        public Money getUnitPrice() { return unitPrice; }
    }

    // ===========================================================================================
    // 7. MAIN EXAMPLE
    // ===========================================================================================

    public static void main(String[] args) {
        System.out.println("=== Architecture.Core Java Quickstart Example ===\n");

        // Example 1: Working with value objects
        demonstrateValueObjects();

        // Example 2: Creating and working with aggregates
        demonstrateAggregates();

        // Example 3: Functional error handling
        demonstrateFunctionalErrorHandling();

        // Example 4: Maybe type usage
        demonstrateMaybeType();

        // Example 5: Repository pattern
        demonstrateRepositoryPattern();

        // Example 6: Complete workflow
        demonstrateCompleteWorkflow();

        System.out.println("\n=== Quickstart Example Complete ===");
    }

    private static void demonstrateValueObjects() {
        System.out.println("=== 1. Value Objects Example ===");

        Money money1 = Money.usd(100.50);
        Money money2 = Money.usd(100.50);
        Money money3 = Money.eur(100.50);

        System.out.println("money1.equals(money2): " + money1.equals(money2)); // true
        System.out.println("money1.equals(money3): " + money1.equals(money3)); // false

        Money total = money1.add(Money.usd(50.25));
        System.out.println("Total after adding $50.25: $" + total.getAmount());
        System.out.println();
    }

    private static void demonstrateAggregates() {
        System.out.println("=== 2. Aggregate and Events Example ===");

        OrderId orderId = new OrderId("ORD-123456");
        CustomerId customerId = new CustomerId("CUST-001");
        Order order = new Order(orderId, customerId);

        System.out.println("Order created: " + order.getId());
        System.out.println("Events count: " + order.getDomainEvents().size());

        Result<Void> addLineResult = order.addOrderLine(
            new ProductId("PROD-001"),
            2,
            Money.usd(25.50)
        );

        if (addLineResult.isSuccess()) {
            System.out.println("Order line added successfully");
            System.out.println("Order total: $" + order.getTotalAmount().getAmount());
        }
        System.out.println();
    }

    private static void demonstrateFunctionalErrorHandling() {
        System.out.println("=== 3. Functional Error Handling ===");

        OrderId orderId = new OrderId("ORD-123456");
        CustomerId customerId = new CustomerId("CUST-001");
        Order order = new Order(orderId, customerId);

        // Add valid order line
        Result<Void> validResult = order.addOrderLine(
            new ProductId("PROD-001"),
            2,
            Money.usd(25.50)
        );

        validResult.match(
            success -> {
                System.out.println("✓ Order line added successfully");
                return null;
            },
            error -> {
                System.out.println("✗ Failed to add line: " + error.getMessage());
                return null;
            }
        );

        // Try to add invalid order line (negative quantity)
        Result<Void> invalidResult = order.addOrderLine(
            new ProductId("PROD-002"),
            -1,
            Money.usd(10.00)
        );

        invalidResult.match(
            success -> {
                System.out.println("✓ Order line added");
                return null;
            },
            error -> {
                System.out.println("✗ Expected error: " + error.getCode());
                return null;
            }
        );
        System.out.println();
    }

    private static void demonstrateMaybeType() {
        System.out.println("=== 4. Maybe Type Example ===");

        Maybe<Order> maybeOrder = findOrderById("ORD-999999"); // Returns Maybe.none()

        String result = maybeOrder
            .map(Order::getTotalAmount)
            .map(amount -> "Order total: $" + amount.getAmount())
            .orElse("Order not found");

        System.out.println(result);
        System.out.println();
    }

    private static void demonstrateRepositoryPattern() {
        System.out.println("=== 5. Repository Pattern Example ===");

        OrderRepository repository = new InMemoryOrderRepository();
        OrderId orderId = new OrderId("ORD-555666");
        CustomerId customerId = new CustomerId("CUST-999");
        Order order = new Order(orderId, customerId);

        // Save order
        try {
            Result<Void> saveResult = repository.addAsync(
                order, com.architecture.core.infrastructure.CancellationToken.none()).get();

            if (saveResult.isSuccess()) {
                System.out.println("✓ Order saved to repository");

                // Retrieve order
                Maybe<Order> retrievedOrder = repository.getByIdAsync(
                    orderId, com.architecture.core.infrastructure.CancellationToken.none()).get();

                if (retrievedOrder.hasValue()) {
                    System.out.println("✓ Order retrieved: " + retrievedOrder.getValue().getId());
                }
            }
        } catch (Exception e) {
            System.out.println("✗ Repository operation failed: " + e.getMessage());
        }
        System.out.println();
    }

    private static void demonstrateCompleteWorkflow() {
        System.out.println("=== 6. Complete Workflow Example ===");

        OrderRepository repository = new InMemoryOrderRepository();
        OrderService orderService = new OrderService(repository);

        CustomerId customerId = new CustomerId("CUST-WORKFLOW");
        List<OrderLineRequest> orderLines = List.of(
            new OrderLineRequest(new ProductId("PROD-001"), 2, Money.usd(25.00)),
            new OrderLineRequest(new ProductId("PROD-002"), 1, Money.usd(50.00))
        );

        Result<String> workflowResult = orderService.processOrderWorkflow(customerId, orderLines);

        workflowResult.match(
            success -> {
                System.out.println("✓ " + success);
                return null;
            },
            error -> {
                System.out.println("✗ Workflow failed: " + error.getMessage());
                return null;
            }
        );
    }

    private static Maybe<Order> findOrderById(String orderId) {
        // Simulate database lookup that might not find the order
        return Maybe.none();
    }
}