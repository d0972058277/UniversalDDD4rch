using Architecture.Core.Functional;

namespace Architecture.Shell.Cqrs;

/// <summary>
/// Marker interface for commands that modify state without return values (void commands).
/// Returns <see cref="Result"/> for business validation errors or <c>Unit</c> for successful completion.
/// </summary>
/// <remarks>
/// <para><strong>Behavioral Requirements:</strong></para>
/// <list type="bullet">
/// <item>MUST modify application state (otherwise use <see cref="IQuery{TResult}"/>)</item>
/// <item>MUST execute within transaction boundary (enforced by UnitOfWorkBehavior)</item>
/// <item>MAY return <see cref="Result.Failure"/> for business validation errors</item>
/// <item>Infrastructure errors (DB connection failures) should throw exceptions</item>
/// </list>
/// </remarks>
/// <example>
/// <code>
/// public record PublishBlogPostCommand(Guid BlogPostId, DateTime PublishDate) : ICommand;
///
/// public class PublishBlogPostHandler : ICommandHandler&lt;PublishBlogPostCommand&gt;
/// {
///     public async Task&lt;Result&gt; HandleAsync(PublishBlogPostCommand command, CancellationToken ct)
///     {
///         // Business validation
///         if (command.PublishDate &lt; DateTime.UtcNow)
///             return Result.Failure(Error.Validation("Cannot publish in the past"));
///
///         // State modification (within transaction)
///         await _repository.UpdateAsync(blogPost, ct);
///         return Result.Success();
///     }
/// }
/// </code>
/// </example>
public interface ICommand : IBaseRequest
{
}

/// <summary>
/// Marker interface for commands that modify state and return a value.
/// </summary>
/// <typeparam name="TResult">
/// The return type, commonly <see cref="Result{T}"/> for mixed error handling
/// (business failures via Result.Failure, infrastructure errors via exceptions).
/// </typeparam>
/// <remarks>
/// <para><strong>Return Value Guidelines:</strong></para>
/// <list type="bullet">
/// <item>Return minimal data (IDs, counts, versions) not full entities</item>
/// <item>For created entities, return Result&lt;EntityId&gt;</item>
/// <item>For updates, return Result&lt;int&gt; (version number)</item>
/// <item>Avoid returning full DTOs (use separate query instead)</item>
/// </list>
/// </remarks>
/// <example>
/// <code>
/// public record CreateOrderCommand(Guid CustomerId, List&lt;OrderItemDto&gt; Items)
///     : ICommand&lt;Result&lt;Guid&gt;&gt;;
///
/// public class CreateOrderHandler : ICommandHandler&lt;CreateOrderCommand, Result&lt;Guid&gt;&gt;
/// {
///     public async Task&lt;Result&lt;Guid&gt;&gt; HandleAsync(CreateOrderCommand command, CancellationToken ct)
///     {
///         var order = Order.Create(command.CustomerId, command.Items);
///         if (order.IsFailure)
///             return Result.Failure&lt;Guid&gt;(order.Error);
///
///         await _repository.AddAsync(order.Value, ct);
///         return Result.Success(order.Value.Id.Value);
///     }
/// }
/// </code>
/// </example>
public interface ICommand<out TResult> : IBaseRequest
{
}
