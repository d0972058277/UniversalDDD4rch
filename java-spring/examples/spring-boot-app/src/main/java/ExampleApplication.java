import com.architecture.core.domain.*;
import com.architecture.core.functional.*;
import com.architecture.core.infrastructure.CancellationToken;
import com.architecture.core.spring.configuration.ArchitectureCoreAutoConfiguration;
import com.architecture.core.spring.repositories.SpringDataRepositoryAdapter;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import javax.persistence.*;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

/**
 * Spring Boot Example Application demonstrating Architecture.Core integration.
 *
 * This example shows:
 * 1. Spring Boot auto-configuration for Architecture.Core
 * 2. JPA entity mapping for domain aggregates
 * 3. Spring Data repository integration
 * 4. REST API with functional error handling
 * 5. Transaction management with domain events
 */
@SpringBootApplication
@EnableJpaRepositories
@Import(ArchitectureCoreAutoConfiguration.class)
public class ExampleApplication {

    public static void main(String[] args) {
        SpringApplication.run(ExampleApplication.class, args);
    }

    // ===========================================================================================
    // DOMAIN MODEL
    // ===========================================================================================

    /**
     * Order ID with validation
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
            if (!value.matches("^ORD-\\d{6}$")) {
                return Result.failure(Error.validation("OrderId.InvalidFormat", "Invalid format"));
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
        public String toString() { return value; }
    }

    static class CustomerId implements EntityId<CustomerId> {
        private final String value;

        public CustomerId(String value) {
            this.value = Objects.requireNonNull(value);
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

    /**
     * Order aggregate root
     */
    static class Order extends AggregateRoot<OrderId> {
        private final CustomerId customerId;
        private BigDecimal totalAmount;
        private String status;

        public Order(OrderId id, CustomerId customerId) {
            super(id);
            this.customerId = Objects.requireNonNull(customerId);
            this.totalAmount = BigDecimal.ZERO;
            this.status = "DRAFT";

            addDomainEvent(new OrderCreatedEvent(id, customerId));
        }

        public Result<Void> updateTotal(BigDecimal amount) {
            if (amount.compareTo(BigDecimal.ZERO) < 0) {
                return Result.failure(Error.validation("Order.NegativeAmount", "Amount cannot be negative"));
            }
            this.totalAmount = amount;
            return Result.success(null);
        }

        public Result<Void> confirm() {
            if (!"DRAFT".equals(status)) {
                return Result.failure(Error.domain("Order.InvalidStatus", "Order is not in draft status"));
            }
            this.status = "CONFIRMED";
            addDomainEvent(new OrderConfirmedEvent(getId()));
            return Result.success(null);
        }

        // Getters
        public CustomerId getCustomerId() { return customerId; }
        public BigDecimal getTotalAmount() { return totalAmount; }
        public String getStatus() { return status; }
    }

    /**
     * Domain events
     */
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

    static class OrderConfirmedEvent extends DomainEventBase {
        private final OrderId orderId;

        public OrderConfirmedEvent(OrderId orderId) {
            super();
            this.orderId = orderId;
        }

        public OrderId getOrderId() { return orderId; }
    }

    // ===========================================================================================
    // JPA ENTITIES
    // ===========================================================================================

    /**
     * JPA entity for Order persistence
     */
    @Entity
    @Table(name = "orders")
    static class OrderEntity {
        @Id
        private String id;

        @Column(name = "customer_id", nullable = false)
        private String customerId;

        @Column(name = "total_amount", precision = 10, scale = 2)
        private BigDecimal totalAmount;

        @Column(name = "status")
        private String status;

        @Version
        private Long version;

        // Constructors
        public OrderEntity() {}

        public OrderEntity(String id, String customerId, BigDecimal totalAmount, String status) {
            this.id = id;
            this.customerId = customerId;
            this.totalAmount = totalAmount;
            this.status = status;
        }

        // Getters and setters
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getCustomerId() { return customerId; }
        public void setCustomerId(String customerId) { this.customerId = customerId; }

        public BigDecimal getTotalAmount() { return totalAmount; }
        public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public Long getVersion() { return version; }
        public void setVersion(Long version) { this.version = version; }
    }

    // ===========================================================================================
    // REPOSITORY LAYER
    // ===========================================================================================

    /**
     * Spring Data JPA repository
     */
    @Repository
    interface OrderJpaRepository extends JpaRepository<OrderEntity, String> {
        List<OrderEntity> findByCustomerId(String customerId);
        List<OrderEntity> findByStatus(String status);
    }

    /**
     * Domain repository interface
     */
    interface OrderRepository extends Repository<Order, OrderId> {
        CompletableFuture<List<Order>> findByCustomerIdAsync(CustomerId customerId, CancellationToken cancellationToken);
        CompletableFuture<List<Order>> findByStatusAsync(String status, CancellationToken cancellationToken);
    }

    /**
     * Spring Data repository adapter implementation
     */
    @Repository
    static class SpringOrderRepositoryAdapter extends SpringDataRepositoryAdapter<Order, OrderId, OrderEntity, String>
            implements OrderRepository {

        private final OrderJpaRepository jpaRepository;

        public SpringOrderRepositoryAdapter(OrderJpaRepository jpaRepository, Executor asyncExecutor) {
            super(
                jpaRepository,
                asyncExecutor,
                SpringOrderRepositoryAdapter::mapToEntity,
                SpringOrderRepositoryAdapter::mapToDomain,
                orderId -> orderId.getValue()
            );
            this.jpaRepository = jpaRepository;
        }

        @Override
        public CompletableFuture<List<Order>> findByCustomerIdAsync(CustomerId customerId, CancellationToken cancellationToken) {
            return CompletableFuture.supplyAsync(() -> {
                try {
                    cancellationToken.throwIfCancellationRequested();
                    List<OrderEntity> entities = jpaRepository.findByCustomerId(customerId.getValue());
                    return entities.stream().map(SpringOrderRepositoryAdapter::mapToDomain).toList();
                } catch (Exception e) {
                    throw new RuntimeException("Failed to find orders by customer ID", e);
                }
            }, getAsyncExecutor());
        }

        @Override
        public CompletableFuture<List<Order>> findByStatusAsync(String status, CancellationToken cancellationToken) {
            return CompletableFuture.supplyAsync(() -> {
                try {
                    cancellationToken.throwIfCancellationRequested();
                    List<OrderEntity> entities = jpaRepository.findByStatus(status);
                    return entities.stream().map(SpringOrderRepositoryAdapter::mapToDomain).toList();
                } catch (Exception e) {
                    throw new RuntimeException("Failed to find orders by status", e);
                }
            }, getAsyncExecutor());
        }

        private static OrderEntity mapToEntity(Order order) {
            return new OrderEntity(
                order.getId().getValue(),
                order.getCustomerId().getValue(),
                order.getTotalAmount(),
                order.getStatus()
            );
        }

        private static Order mapToDomain(OrderEntity entity) {
            OrderId orderId = new OrderId(entity.getId());
            CustomerId customerId = new CustomerId(entity.getCustomerId());
            Order order = new Order(orderId, customerId);
            order.updateTotal(entity.getTotalAmount());
            if ("CONFIRMED".equals(entity.getStatus())) {
                order.confirm();
            }
            return order;
        }
    }

    // ===========================================================================================
    // APPLICATION SERVICE
    // ===========================================================================================

    @Service
    @Transactional
    static class OrderService {
        private final OrderRepository orderRepository;

        public OrderService(OrderRepository orderRepository) {
            this.orderRepository = orderRepository;
        }

        public CompletableFuture<Result<OrderId>> createOrderAsync(String customerId, BigDecimal totalAmount) {
            return CompletableFuture.supplyAsync(() -> {
                try {
                    // Generate order ID
                    String orderIdValue = "ORD-" + String.format("%06d", new Random().nextInt(1000000));
                    OrderId orderId = new OrderId(orderIdValue);
                    CustomerId customerIdObj = new CustomerId(customerId);

                    // Create order
                    Order order = new Order(orderId, customerIdObj);
                    Result<Void> updateResult = order.updateTotal(totalAmount);

                    if (updateResult.isFailure()) {
                        return Result.failure(updateResult.getError());
                    }

                    // Save order
                    Result<Void> saveResult = orderRepository.addAsync(order, CancellationToken.none()).join();
                    if (saveResult.isFailure()) {
                        return Result.failure(saveResult.getError());
                    }

                    return Result.success(orderId);

                } catch (Exception e) {
                    return Result.failure(Error.infrastructure("OrderService.CreateFailed",
                        "Failed to create order", e));
                }
            });
        }

        public CompletableFuture<Result<Void>> confirmOrderAsync(String orderIdValue) {
            return CompletableFuture.supplyAsync(() -> {
                try {
                    OrderId orderId = new OrderId(orderIdValue);
                    Maybe<Order> maybeOrder = orderRepository.getByIdAsync(orderId, CancellationToken.none()).join();

                    if (maybeOrder.isEmpty()) {
                        return Result.failure(Error.domain("Order.NotFound", "Order not found"));
                    }

                    Order order = maybeOrder.getValue();
                    Result<Void> confirmResult = order.confirm();

                    if (confirmResult.isFailure()) {
                        return confirmResult;
                    }

                    return orderRepository.updateAsync(order, CancellationToken.none()).join();

                } catch (Exception e) {
                    return Result.failure(Error.infrastructure("OrderService.ConfirmFailed",
                        "Failed to confirm order", e));
                }
            });
        }

        public CompletableFuture<List<OrderDto>> getOrdersByCustomerAsync(String customerId) {
            CustomerId customerIdObj = new CustomerId(customerId);
            return orderRepository.findByCustomerIdAsync(customerIdObj, CancellationToken.none())
                .thenApply(orders -> orders.stream()
                    .map(this::mapToDto)
                    .toList());
        }

        private OrderDto mapToDto(Order order) {
            return new OrderDto(
                order.getId().getValue(),
                order.getCustomerId().getValue(),
                order.getTotalAmount(),
                order.getStatus()
            );
        }
    }

    // ===========================================================================================
    // REST CONTROLLER
    // ===========================================================================================

    /**
     * Order DTO for API responses
     */
    static class OrderDto {
        private final String id;
        private final String customerId;
        private final BigDecimal totalAmount;
        private final String status;

        public OrderDto(String id, String customerId, BigDecimal totalAmount, String status) {
            this.id = id;
            this.customerId = customerId;
            this.totalAmount = totalAmount;
            this.status = status;
        }

        public String getId() { return id; }
        public String getCustomerId() { return customerId; }
        public BigDecimal getTotalAmount() { return totalAmount; }
        public String getStatus() { return status; }
    }

    /**
     * Create order request
     */
    static class CreateOrderRequest {
        private String customerId;
        private BigDecimal totalAmount;

        public String getCustomerId() { return customerId; }
        public void setCustomerId(String customerId) { this.customerId = customerId; }

        public BigDecimal getTotalAmount() { return totalAmount; }
        public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    }

    /**
     * REST controller with functional error handling
     */
    @RestController
    @RequestMapping("/api/orders")
    static class OrderController {
        private final OrderService orderService;

        public OrderController(OrderService orderService) {
            this.orderService = orderService;
        }

        @PostMapping
        public CompletableFuture<ResponseEntity<Object>> createOrder(@RequestBody CreateOrderRequest request) {
            return orderService.createOrderAsync(request.getCustomerId(), request.getTotalAmount())
                .thenApply(result -> result.match(
                    orderId -> ResponseEntity.ok(Map.of("orderId", orderId.getValue())),
                    error -> ResponseEntity.badRequest().body(Map.of(
                        "error", error.getCode(),
                        "message", error.getMessage()
                    ))
                ));
        }

        @PostMapping("/{orderId}/confirm")
        public CompletableFuture<ResponseEntity<Object>> confirmOrder(@PathVariable String orderId) {
            return orderService.confirmOrderAsync(orderId)
                .thenApply(result -> result.match(
                    success -> ResponseEntity.ok(Map.of("message", "Order confirmed successfully")),
                    error -> ResponseEntity.badRequest().body(Map.of(
                        "error", error.getCode(),
                        "message", error.getMessage()
                    ))
                ));
        }

        @GetMapping("/customer/{customerId}")
        public CompletableFuture<List<OrderDto>> getOrdersByCustomer(@PathVariable String customerId) {
            return orderService.getOrdersByCustomerAsync(customerId);
        }

        @GetMapping("/health")
        public Map<String, String> health() {
            return Map.of(
                "status", "OK",
                "message", "Architecture.Core Spring Boot example is running"
            );
        }
    }

    // ===========================================================================================
    // COMMAND LINE RUNNER (for demo)
    // ===========================================================================================

    @Bean
    CommandLineRunner demo(OrderService orderService) {
        return args -> {
            System.out.println("\n=== Architecture.Core Spring Boot Example Started ===");
            System.out.println("API endpoints available:");
            System.out.println("  POST /api/orders - Create order");
            System.out.println("  POST /api/orders/{id}/confirm - Confirm order");
            System.out.println("  GET /api/orders/customer/{customerId} - Get orders by customer");
            System.out.println("  GET /api/orders/health - Health check");

            // Demo: Create and confirm an order
            System.out.println("\n=== Running Demo ===");

            Result<OrderId> createResult = orderService.createOrderAsync("CUST-001", new BigDecimal("99.99"))
                .get();

            createResult.match(
                orderId -> {
                    System.out.println("✓ Created order: " + orderId);

                    // Confirm the order
                    try {
                        Result<Void> confirmResult = orderService.confirmOrderAsync(orderId.getValue()).get();
                        confirmResult.match(
                            success -> {
                                System.out.println("✓ Confirmed order: " + orderId);
                                return null;
                            },
                            error -> {
                                System.out.println("✗ Failed to confirm order: " + error.getMessage());
                                return null;
                            }
                        );
                    } catch (Exception e) {
                        System.out.println("✗ Error confirming order: " + e.getMessage());
                    }

                    return null;
                },
                error -> {
                    System.out.println("✗ Failed to create order: " + error.getMessage());
                    return null;
                }
            );

            System.out.println("=== Demo Complete ===\n");
        };
    }
}