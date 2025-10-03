package com.architecture.shell.cqrs;

/**
 * Marker interface for queries that read data without modifying state.
 * Queries are read-only operations that return DTOs or projections.
 *
 * Requirements:
 * - FR-002: CQRS separation - queries only read, never modify state
 * - BR-003: Queries MUST NOT open transactions
 * - spec.md:L72-73: Queries MUST NOT call repository write methods (enforced by AT-001 architecture test)
 *
 * Usage:
 * <pre>
 * public record GetOrderDetailsQuery(
 *     UUID orderId
 * ) implements Query<OrderDetailsDto> { }
 * </pre>
 *
 * Query handlers may return Result<T> if business-level query failures are possible:
 * <pre>
 * public record GetUserProfileQuery(
 *     UUID userId
 * ) implements Query<Result<UserProfileDto>> { }
 * </pre>
 *
 * DDD Layer: Application Layer
 *
 * @param <TResult> The return type (DTO/projection or Result<DTO>)
 * @see QueryHandler
 * @see Command
 */
public interface Query<TResult> extends BaseRequest {
    // Marker interface - no methods required
    // Type parameter TResult enables type-safe handler resolution
}
