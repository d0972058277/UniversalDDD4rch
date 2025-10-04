namespace Architecture.Shell.Cqrs;

/// <summary>
/// Handler for read-only queries that return data without modifying state.
/// </summary>
/// <typeparam name="TQuery">The query type.</typeparam>
/// <typeparam name="TResult">
/// The return type, typically a DTO/projection. MAY be <see cref="Result{T}"/>
/// if business-level query failures are possible (e.g., authorization failures).
/// </typeparam>
/// <remarks>
/// <para><strong>Read-Only Constraints:</strong></para>
/// <list type="bullet">
/// <item>MUST NOT call repository.AddAsync/UpdateAsync/DeleteAsync (validated by architecture tests)</item>
/// <item>SHOULD use read-optimized data models or projections</item>
/// <item>NO transactions opened (queries execute outside transaction boundaries)</item>
/// </list>
/// </remarks>
public interface IQueryHandler<in TQuery, TResult> : IRequestHandler<TQuery, TResult>
    where TQuery : IQuery<TResult>
{
}
