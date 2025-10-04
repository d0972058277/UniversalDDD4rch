package com.architecture.shell.cqrs;

/**
 * Handler interface for processing commands.
 * Commands modify state and execute within transaction boundaries.
 *
 * Requirements:
 * - FR-003: Exactly one handler per command type
 * - BR-001: Commands execute within UnitOfWork transaction
 * - BR-007: Use Result<T> for business errors, exceptions for infrastructure errors
 * - BR-008: Result.failure() commits transaction (business rejection is valid outcome)
 *
 * Transaction Semantics:
 * - UnitOfWorkBehavior opens transaction before handler execution
 * - Result.failure() → transaction COMMITS (business validation succeeded, request rejected)
 * - Exception thrown → transaction ROLLS BACK (infrastructure failure, invalid state)
 *
 * Example:
 * <pre>
 * public class CreateOrderHandler implements CommandHandler<CreateOrderCommand, Result<UUID>> {
 *     private final IRepository<Order, OrderId> repository;
 *
 *     {@literal @}Override
 *     public Result<UUID> handle(CreateOrderCommand command) {
 *         // Business validation
 *         if (command.items().isEmpty()) {
 *             return Result.failure("EMPTY_ORDER", "Order must have items");
 *         }
 *
 *         // Create aggregate (throws on infrastructure error)
 *         var order = Order.create(command.customerId(), command.items());
 *         repository.add(order);
 *
 *         return Result.success(order.getId().value());
 *     }
 * }
 * </pre>
 *
 * DDD Layer: Application Layer
 *
 * @param <TCommand> The command type
 * @param <TResult>  The result type (typically Result<T>)
 * @see Command
 * @see UnitOfWorkBehavior
 */
@FunctionalInterface
public interface CommandHandler<TCommand extends Command<TResult>, TResult>
    extends RequestHandler<TCommand, TResult> {
    // Inherits handle() method from RequestHandler
    // Type constraints ensure command handlers only handle commands
}
