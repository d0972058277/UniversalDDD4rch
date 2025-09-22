# Architecture.Core Java Quickstart Guide

**Version**: 1.0
**Date**: 2025-09-22
**Language**: Java 21+ LTS
**Framework**: Spring Boot (Optional)

## Getting Started

### Maven Dependency
```xml
<dependency>
    <groupId>com.architecture</groupId>
    <artifactId>architecture-core</artifactId>
    <version>1.0.0</version>
</dependency>

<!-- Optional Spring Integration -->
<dependency>
    <groupId>com.architecture</groupId>
    <artifactId>architecture-core-spring</artifactId>
    <version>1.0.0</version>
</dependency>
```

### Gradle Dependency
```kotlin
implementation("com.architecture:architecture-core:1.0.0")

// Optional Spring Integration
implementation("com.architecture:architecture-core-spring:1.0.0")
```

## Example Domain: Order Management

### 1. Creating Entity Identifiers

```java
import com.architecture.core.domain.EntityId;
import com.architecture.core.functional.Result;

// Define a custom entity ID
public class OrderId implements EntityId<OrderId> {
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

        return Result.success(null);
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
```

### 2. Creating Value Objects

```java
import com.architecture.core.domain.ValueObject;

// Define a Money value object
public class Money extends ValueObject {
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
```

### 3. Creating Domain Events

```java
import com.architecture.core.domain.DomainEventBase;

// Order created event
public class OrderCreatedEvent extends DomainEventBase {
    private final OrderId orderId;
    private final CustomerId customerId;
    private final Money totalAmount;

    public OrderCreatedEvent(OrderId orderId, CustomerId customerId, Money totalAmount) {
        super();
        this.orderId = Objects.requireNonNull(orderId);
        this.customerId = Objects.requireNonNull(customerId);
        this.totalAmount = Objects.requireNonNull(totalAmount);
    }

    public OrderCreatedEvent(OrderId orderId, CustomerId customerId, Money totalAmount,
                           String correlationId, String causationId) {
        super(correlationId, causationId);
        this.orderId = Objects.requireNonNull(orderId);
        this.customerId = Objects.requireNonNull(customerId);
        this.totalAmount = Objects.requireNonNull(totalAmount);
    }

    public OrderId getOrderId() { return orderId; }
    public CustomerId getCustomerId() { return customerId; }
    public Money getTotalAmount() { return totalAmount; }
}
```

### 4. Creating Aggregate Roots

```java
import com.architecture.core.domain.AggregateRoot;

public class Order extends AggregateRoot<OrderId> {
    private final CustomerId customerId;
    private final List<OrderLine> orderLines;
    private OrderStatus status;
    private Money totalAmount;

    // Constructor for new orders
    public Order(OrderId id, CustomerId customerId) {
        super(id);
        this.customerId = Objects.requireNonNull(customerId);
        this.orderLines = new ArrayList<>();
        this.status = OrderStatus.DRAFT;
        this.totalAmount = Money.usd(0);

        // Add domain event
        addDomainEvent(new OrderCreatedEvent(id, customerId, totalAmount));
    }

    // Business methods
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

        OrderStatus previousStatus = this.status;
        this.status = OrderStatus.CONFIRMED;

        addDomainEvent(new OrderStatusChangedEvent(
            getId(), previousStatus, status, "Order confirmed by customer"
        ));

        return Result.success(null);
    }

    private void recalculateTotal() {
        totalAmount = orderLines.stream()
            .map(line -> line.getUnitPrice().multiply(BigDecimal.valueOf(line.getQuantity())))
            .reduce(Money.usd(0), Money::add);
    }

    // Getters
    public CustomerId getCustomerId() { return customerId; }
    public List<OrderLine> getOrderLines() { return Collections.unmodifiableList(orderLines); }
    public OrderStatus getStatus() { return status; }
    public Money getTotalAmount() { return totalAmount; }
}
```

### 5. Using Functional Types

#### Result<T> Usage
```java
public class OrderService {

    public Result<OrderId> createOrder(CustomerId customerId, List<OrderLineRequest> lineRequests) {
        // Validate input
        if (lineRequests.isEmpty()) {
            return Result.failure(Error.validation(
                "OrderService.EmptyLines",
                "Cannot create order without order lines"
            ));
        }

        // Generate new order ID
        OrderId orderId = OrderId.generate();
        Order order = new Order(orderId, customerId);

        // Add order lines using functional composition
        Result<Void> addLinesResult = lineRequests.stream()
            .map(req -> order.addOrderLine(req.getProductId(), req.getQuantity(), req.getUnitPrice()))
            .reduce(Result.success(null), (acc, result) ->
                acc.bind(ignored -> result)
            );

        return addLinesResult.map(ignored -> orderId);
    }

    // Chaining operations
    public Result<String> processOrderWorkflow(CustomerId customerId, List<OrderLineRequest> lines) {
        return createOrder(customerId, lines)
            .bind(this::confirmOrder)
            .bind(this::chargePayment)
            .bind(this::scheduleShipping)
            .map(order -> "Order processed successfully: " + order.getId());
    }
}
```

#### Maybe<T> Usage
```java
public class OrderQueryService {

    public Maybe<OrderDto> findOrderById(OrderId orderId) {
        return orderRepository.getByIdAsync(orderId, CancellationToken.none())
            .join()
            .map(this::mapToDto);
    }

    public String getOrderStatus(OrderId orderId) {
        return findOrderById(orderId)
            .map(dto -> dto.getStatus().toString())
            .orElse("Order not found");
    }

    // Safe navigation with Maybe
    public Maybe<Money> getOrderTotal(OrderId orderId) {
        return findOrderById(orderId)
            .map(OrderDto::getTotalAmount);
    }
}
```

### 6. Repository Pattern

```java
import com.architecture.core.domain.Repository;

public interface OrderRepository extends Repository<Order, OrderId> {
    // Domain-specific query methods
    CompletableFuture<List<Order>> findByCustomerIdAsync(
        CustomerId customerId,
        CancellationToken cancellationToken
    );

    CompletableFuture<List<Order>> findByStatusAsync(
        OrderStatus status,
        CancellationToken cancellationToken
    );
}
```

### 7. Complete Example

```java
public class QuickstartExample {

    public static void main(String[] args) {
        // Example 1: Creating and working with value objects
        System.out.println("=== Value Objects Example ===");

        Money money1 = Money.usd(100.50);
        Money money2 = Money.usd(100.50);
        Money money3 = Money.eur(100.50);

        System.out.println("money1.equals(money2): " + money1.equals(money2)); // true
        System.out.println("money1.equals(money3): " + money1.equals(money3)); // false

        // Example 2: Creating aggregates and handling events
        System.out.println("\n=== Aggregate and Events Example ===");

        OrderId orderId = new OrderId("ORD-123456");
        CustomerId customerId = new CustomerId("CUST-001");
        Order order = new Order(orderId, customerId);

        System.out.println("Order created: " + order.getId());
        System.out.println("Events count: " + order.getDomainEvents().size());

        // Example 3: Functional error handling
        System.out.println("\n=== Functional Error Handling ===");

        Result<Void> addLineResult = order.addOrderLine(
            new ProductId("PROD-001"),
            2,
            Money.usd(25.50)
        );

        addLineResult.match(
            success -> {
                System.out.println("Order line added successfully");
                return null;
            },
            error -> {
                System.out.println("Failed to add line: " + error.getMessage());
                return null;
            }
        );

        Result<Void> confirmResult = order.confirm();
        confirmResult.match(
            success -> {
                System.out.println("Order confirmed successfully");
                return null;
            },
            error -> {
                System.out.println("Failed to confirm: " + error.getMessage());
                return null;
            }
        );

        // Example 4: Maybe type usage
        System.out.println("\n=== Maybe Type Example ===");

        Maybe<Order> maybeOrder = findOrderById("ORD-999999"); // Returns Maybe.none()

        String result = maybeOrder
            .map(Order::getTotalAmount)
            .map(amount -> "Order total: " + amount.getAmount() + " " + amount.getCurrency())
            .orElse("Order not found");

        System.out.println(result);

        // Example 5: Operation chaining
        System.out.println("\n=== Operation Chaining Example ===");

        Result<String> processResult = processOrderExample(order);
        processResult.match(
            orderId -> {
                System.out.println("Order " + orderId + " processed successfully");
                return null;
            },
            error -> {
                System.out.println("Processing failed: " + error.getMessage());
                return null;
            }
        );
    }

    static Maybe<Order> findOrderById(String orderId) {
        // Simulate database lookup that might not find the order
        return Maybe.none();
    }

    static Result<String> processOrderExample(Order order) {
        // Simulate processing workflow
        Result<Void> validationResult = validateOrder(order);
        if (validationResult.isFailure()) {
            return Result.failure(validationResult.getError());
        }

        Result<Void> confirmResult = order.confirm();
        if (confirmResult.isFailure()) {
            return Result.failure(confirmResult.getError());
        }

        return Result.success(order.getId().getValue());
    }

    static Result<Void> validateOrder(Order order) {
        if (order.getTotalAmount().getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return Result.failure(Error.validation(
                "Order.InvalidAmount",
                "Order amount must be positive"
            ));
        }

        if (order.getCustomerId() == null) {
            return Result.failure(Error.validation(
                "Order.MissingCustomer",
                "Order must have a customer"
            ));
        }

        return Result.success(null);
    }
}
```

## Expected Output

```
=== Value Objects Example ===
money1.equals(money2): true
money1.equals(money3): false

=== Aggregate and Events Example ===
Order created: OrderId{ORD-123456}
Events count: 1

=== Functional Error Handling ===
Order line added successfully
Order confirmed successfully

=== Maybe Type Example ===
Order not found

=== Operation Chaining Example ===
Order ORD-123456 processed successfully
```

## Key Concepts Demonstrated

1. **Entity Identifiers**: Type-safe IDs with validation and formatting
2. **Value Objects**: Immutable objects with structural equality
3. **Aggregate Roots**: Entity lifecycle management with domain events
4. **Domain Events**: Event-driven architecture with correlation tracking
5. **Functional Error Handling**: Result and Maybe types for safe operations
6. **Repository Pattern**: Data access abstraction with async operations
7. **Method Chaining**: Monadic operations for clean error handling

## Testing Examples

### Unit Test Example
```java
class OrderTest {

    @Test
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
        assertThat(order.getDomainEvents()).hasSize(1);
        assertThat(order.getDomainEvents().get(0)).isInstanceOf(OrderCreatedEvent.class);
    }

    @Test
    void Should_ReturnFailure_When_AddingOrderLineToConfirmedOrder() {
        // Given
        Order order = new Order(new OrderId("ORD-123456"), new CustomerId("CUST-789"));
        order.confirm(); // Change status to CONFIRMED

        // When
        Result<Void> result = order.addOrderLine(
            new ProductId("PROD-001"),
            2,
            Money.usd(10.00)
        );

        // Then
        assertThat(result.isFailure()).isTrue();
        assertThat(result.getError().getCode()).isEqualTo("Order.CannotModify");
        assertThat(result.getError().getCategory()).isEqualTo(ErrorCategory.DOMAIN);
    }
}
```

## Next Steps

1. **Implement Repository with Spring Data JPA**
2. **Add domain services for complex business logic**
3. **Integrate with Spring Boot for dependency injection**
4. **Set up event publishing and handling infrastructure**
5. **Add comprehensive logging and monitoring**
6. **Create integration tests with test containers**

## Best Practices

### 1. Entity ID Design
- Use strong typing with EntityId<T> interface
- Implement proper validation in validate() method
- Follow consistent naming conventions

### 2. Value Object Design
- Make all fields final and immutable
- Provide all equality components in getEqualityComponents()
- Include factory methods for common use cases

### 3. Aggregate Design
- Keep aggregates small and focused
- Protect invariants through business methods
- Emit domain events for state changes

### 4. Error Handling
- Use appropriate error categories for different types of failures
- Include metadata for validation errors
- Implement retry logic only for infrastructure errors

---

**Quickstart Status**: ✅ Complete
**Ready for**: Implementation and Testing