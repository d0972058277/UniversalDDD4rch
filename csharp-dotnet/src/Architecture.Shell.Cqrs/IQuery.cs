namespace Architecture.Shell.Cqrs;

/// <summary>
/// Marker interface for read-only queries that return data without modifying state.
/// </summary>
/// <typeparam name="TResult">
/// The return type, typically a DTO/projection optimized for the presentation layer.
/// MAY be <see cref="Result{T}"/> if business-level query failures are possible
/// (e.g., authorization within handler).
/// </typeparam>
/// <remarks>
/// <para><strong>Behavioral Requirements:</strong></para>
/// <list type="bullet">
/// <item>MUST NOT modify state (enforced semantically; architecture tests verify no repository writes)</item>
/// <item>MUST NOT open transactions (enforced by UnitOfWorkBehavior)</item>
/// <item>SHOULD return DTOs/projections, not domain entities</item>
/// <item>Infrastructure errors (DB timeout, network failure) should throw exceptions</item>
/// <item>Business errors (data not found) MAY throw domain-specific exceptions or return Result.Failure depending on query semantics</item>
/// </list>
/// </remarks>
/// <example>
/// <code>
/// public record GetOrderDetailsQuery(Guid OrderId) : IQuery&lt;OrderDetailsDto&gt;;
///
/// public class GetOrderDetailsHandler : IQueryHandler&lt;GetOrderDetailsQuery, OrderDetailsDto&gt;
/// {
///     private readonly IOrderReadModel _readModel;
///
///     public async Task&lt;OrderDetailsDto&gt; HandleAsync(GetOrderDetailsQuery query, CancellationToken ct)
///     {
///         // Read-optimized query (no transaction)
///         var dto = await _readModel.GetOrderDetailsAsync(query.OrderId, ct);
///
///         if (dto == null)
///             throw new NotFoundException($"Order {query.OrderId} not found");
///
///         return dto;
///     }
/// }
/// </code>
/// </example>
public interface IQuery<out TResult> : IBaseRequest
{
}
