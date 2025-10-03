package com.architecture.shell.cqrs;

/**
 * Handler interface for processing queries.
 * Queries are read-only operations that do NOT modify state or open transactions.
 *
 * Requirements:
 * - FR-003: Exactly one handler per query type
 * - BR-003: Queries MUST NOT open transactions
 * - spec.md:L72-73: Queries MUST NOT call repository write methods (add/update/delete)
 * - AT-001: Architecture test enforces no write operations in query handlers
 *
 * Read-Only Semantics:
 * - UnitOfWorkBehavior skips transaction opening for queries
 * - Queries typically return DTOs/projections, not domain entities
 * - Infrastructure errors (DB timeout) throw exceptions
 * - Business errors (data not found) may return Result.failure() or throw NotFoundExc based on domain semantics
 *
 * Example:
 * <pre>
 * public class GetOrderDetailsHandler implements QueryHandler<GetOrderDetailsQuery, OrderDetailsDto> {
 *     private final OrderReadModel readModel;
 *
 *     {@literal @}Override
 *     public OrderDetailsDto handle(GetOrderDetailsQuery query) {
 *         // Read-optimized query (no transaction)
 *         return readModel.getOrderDetails(query.orderId())
 *             .orElseThrow(() -> new NotFoundException("Order not found"));
 *     }
 * }
 * </pre>
 *
 * Caching:
 * - Queries may be cached via CachingBehavior
 * - Implement ICacheable interface to specify TTL
 *
 * DDD Layer: Application Layer
 *
 * @param <TQuery>  The query type
 * @param <TResult> The result type (DTO/projection or Result<DTO>)
 * @see Query
 * @see CachingBehavior
 */
@FunctionalInterface
public interface QueryHandler<TQuery extends Query<TResult>, TResult>
    extends RequestHandler<TQuery, TResult> {
    // Inherits handle() method from RequestHandler
    // Type constraints ensure query handlers only handle queries
}
