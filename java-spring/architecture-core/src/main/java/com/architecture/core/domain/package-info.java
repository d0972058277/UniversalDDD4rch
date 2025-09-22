/**
 * Domain-Driven Design (DDD) core abstractions for Java applications.
 * <p>
 * This package provides the foundational types and interfaces for implementing
 * Domain-Driven Design patterns in Java, including entity identification,
 * aggregate roots, value objects, domain events, and repository abstractions.
 *
 * <h2>Core Types</h2>
 *
 * <h3>Entity Identification</h3>
 * <ul>
 *   <li>{@link EntityId} - Base interface for type-safe entity identifiers</li>
 *   <li>{@link Entity} - Base class for entities with identity-based equality</li>
 * </ul>
 *
 * <h3>Aggregate Pattern</h3>
 * <ul>
 *   <li>{@link AggregateRoot} - Base class for domain aggregates with version control and event collection</li>
 * </ul>
 *
 * <h3>Value Objects</h3>
 * <ul>
 *   <li>{@link ValueObject} - Base class for immutable value objects with structural equality</li>
 * </ul>
 *
 * <h3>Domain Events</h3>
 * <ul>
 *   <li>{@link DomainEvent} - Interface for domain events with correlation metadata</li>
 *   <li>{@link DomainEventBase} - Base implementation with standard metadata</li>
 * </ul>
 *
 * <h3>Repository Pattern</h3>
 * <ul>
 *   <li>{@link Repository} - Generic repository interface for aggregate persistence</li>
 * </ul>
 *
 * <h2>Repository Usage Examples</h2>
 *
 * <h3>Defining a Domain-Specific Repository</h3>
 * <pre>{@code
 * // Define your entity ID
 * public class OrderId implements EntityId<OrderId> {
 *     private final String value;
 *
 *     public OrderId(String value) {
 *         this.value = Objects.requireNonNull(value);
 *     }
 *
 *     @Override
 *     public String getValue() { return value; }
 *
 *     @Override
 *     public Result<Void> validate() {
 *         return value.matches("ORD-\\d{6}")
 *             ? Result.success(null)
 *             : Result.failure(Error.validation("OrderId.InvalidFormat", "Invalid order ID format"));
 *     }
 *
 *     @Override
 *     public int compareTo(OrderId other) {
 *         return this.value.compareTo(other.value);
 *     }
 * }
 *
 * // Define your aggregate root
 * public class Order extends AggregateRoot<OrderId> {
 *     private final CustomerId customerId;
 *     private OrderStatus status;
 *
 *     public Order(OrderId id, CustomerId customerId) {
 *         super(id);
 *         this.customerId = customerId;
 *         this.status = OrderStatus.DRAFT;
 *         addDomainEvent(new OrderCreatedEvent(id, customerId));
 *     }
 *
 *     public Result<Void> confirm() {
 *         if (status != OrderStatus.DRAFT) {
 *             return Result.failure(Error.domain(
 *                 "Order.InvalidTransition",
 *                 "Cannot confirm order that is not in draft status"
 *             ));
 *         }
 *         status = OrderStatus.CONFIRMED;
 *         addDomainEvent(new OrderConfirmedEvent(getId()));
 *         return Result.success(null);
 *     }
 * }
 *
 * // Define your repository interface
 * public interface OrderRepository extends Repository<Order, OrderId> {
 *     // Domain-specific query methods
 *     CompletableFuture<List<Order>> findByCustomerIdAsync(
 *         CustomerId customerId,
 *         CancellationToken cancellationToken
 *     );
 *
 *     CompletableFuture<List<Order>> findByStatusAsync(
 *         OrderStatus status,
 *         CancellationToken cancellationToken
 *     );
 * }
 * }</pre>
 *
 * <h3>Using Repository with Functional Error Handling</h3>
 * <pre>{@code
 * @Service
 * public class OrderService {
 *     private final OrderRepository orderRepository;
 *
 *     public OrderService(OrderRepository orderRepository) {
 *         this.orderRepository = orderRepository;
 *     }
 *
 *     public CompletableFuture<Result<Order>> createOrderAsync(
 *         CustomerId customerId,
 *         CancellationToken cancellationToken
 *     ) {
 *         OrderId orderId = OrderId.generate();
 *         Order order = new Order(orderId, customerId);
 *
 *         return orderRepository.addAsync(order, cancellationToken)
 *             .thenApply(result -> result.map(ignored -> order));
 *     }
 *
 *     public CompletableFuture<Result<Void>> confirmOrderAsync(
 *         OrderId orderId,
 *         CancellationToken cancellationToken
 *     ) {
 *         return orderRepository.getByIdAsync(orderId, cancellationToken)
 *             .thenCompose(maybeOrder -> {
 *                 if (maybeOrder.isEmpty()) {
 *                     return CompletableFuture.completedFuture(
 *                         Result.failure(Error.domain("Order.NotFound", "Order not found"))
 *                     );
 *                 }
 *
 *                 Order order = maybeOrder.getValue();
 *                 Result<Void> confirmResult = order.confirm();
 *
 *                 if (confirmResult.isFailure()) {
 *                     return CompletableFuture.completedFuture(confirmResult);
 *                 }
 *
 *                 return orderRepository.updateAsync(order, cancellationToken);
 *             });
 *     }
 *
 *     public CompletableFuture<Maybe<Order>> findOrderAsync(
 *         OrderId orderId,
 *         CancellationToken cancellationToken
 *     ) {
 *         return orderRepository.getByIdAsync(orderId, cancellationToken);
 *     }
 * }
 * }</pre>
 *
 * <h3>Repository Implementation Guidelines</h3>
 *
 * <h4>Async Operations</h4>
 * <p>All repository operations return {@link CompletableFuture} to enable non-blocking I/O:</p>
 * <ul>
 *   <li>Use appropriate executors for database operations</li>
 *   <li>Handle {@link CancellationToken} to support operation cancellation</li>
 *   <li>Return {@link Result} types for operations that can fail</li>
 *   <li>Return {@link Maybe} types for optional results</li>
 * </ul>
 *
 * <h4>Error Handling</h4>
 * <p>Repository implementations should:</p>
 * <ul>
 *   <li>Use {@link Result} for operations that can fail due to business rules</li>
 *   <li>Convert infrastructure exceptions to appropriate {@link Error} categories</li>
 *   <li>Preserve error context and metadata for debugging</li>
 *   <li>Handle optimistic concurrency conflicts appropriately</li>
 * </ul>
 *
 * <h4>Transaction Management</h4>
 * <p>Repository implementations should:</p>
 * <ul>
 *   <li>Participate in existing transactions when available</li>
 *   <li>Handle version control for optimistic concurrency</li>
 *   <li>Ensure aggregate consistency within transaction boundaries</li>
 *   <li>Publish domain events after successful persistence</li>
 * </ul>
 *
 * <h2>Best Practices</h2>
 *
 * <h3>Entity Identifier Design</h3>
 * <ul>
 *   <li>Use strong typing with bounded generics ({@code EntityId<T extends EntityId<T>>})</li>
 *   <li>Implement validation logic in the {@code validate()} method</li>
 *   <li>Follow consistent naming conventions (e.g., OrderId, CustomerId)</li>
 *   <li>Make identifiers immutable and serializable</li>
 * </ul>
 *
 * <h3>Aggregate Design</h3>
 * <ul>
 *   <li>Keep aggregates small and focused on a single business concept</li>
 *   <li>Protect business invariants through aggregate methods</li>
 *   <li>Emit domain events for state changes that other contexts need to know about</li>
 *   <li>Use version control to handle concurrent modifications</li>
 * </ul>
 *
 * <h3>Value Object Design</h3>
 * <ul>
 *   <li>Make all fields final and ensure immutability</li>
 *   <li>Include all relevant fields in {@code getEqualityComponents()}</li>
 *   <li>Provide factory methods for common creation patterns</li>
 *   <li>Validate invariants in constructors</li>
 * </ul>
 *
 * <h3>Repository Design</h3>
 * <ul>
 *   <li>Define repository interfaces in the domain layer</li>
 *   <li>Implement repositories in the infrastructure layer</li>
 *   <li>Use dependency inversion to keep domain layer pure</li>
 *   <li>Focus on aggregate roots, not individual entities</li>
 * </ul>
 *
 * <h2>Integration with Spring Framework</h2>
 *
 * <p>For Spring integration capabilities, see the {@code architecture-core-spring} module
 * which provides:</p>
 * <ul>
 *   <li>Spring Data JPA repository adapters</li>
 *   <li>Auto-configuration for dependency injection</li>
 *   <li>Type converters for JPA integration</li>
 *   <li>Transaction management support</li>
 * </ul>
 *
 * @see com.architecture.core.functional.Result
 * @see com.architecture.core.functional.Maybe
 * @see com.architecture.core.functional.Error
 * @see com.architecture.core.infrastructure.CancellationToken
 *
 * @since 1.0.0
 * @version 1.0.0
 */
package com.architecture.core.domain;

import com.architecture.core.functional.Error;
import com.architecture.core.functional.Maybe;
import com.architecture.core.functional.Result;
import com.architecture.core.infrastructure.CancellationToken;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.List;