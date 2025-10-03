package com.architecture.shell.cqrs;

/**
 * Marker interface for commands that modify state with return values.
 * Commands execute within transaction boundaries and may return results.
 *
 * Requirements:
 * - FR-002: CQRS separation - commands modify state
 * - BR-001: Commands MUST execute within transaction boundary
 * - BR-007: Commands return Result<T> for business errors, throw for infrastructure errors
 * - BR-008: Result.failure() commits transaction (business rejection is valid state)
 *
 * Usage:
 * <pre>
 * public record CreateOrderCommand(
 *     UUID customerId,
 *     List<OrderItem> items
 * ) implements Command<Result<UUID>> { }
 * </pre>
 *
 * For void commands (no return value), use Result<Void>:
 * <pre>
 * public record PublishBlogPostCommand(
 *     UUID postId
 * ) implements Command<Result<Void>> { }
 * </pre>
 *
 * DDD Layer: Application Layer
 *
 * @param <TResult> The return type (typically Result<T> or Result<Void>)
 * @see CommandHandler
 * @see Query
 */
public interface Command<TResult> extends BaseRequest {
    // Marker interface - no methods required
    // Type parameter TResult enables type-safe handler resolution
}
