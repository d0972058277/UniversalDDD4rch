namespace Architecture.Shell.Cqrs;

/// <summary>
/// Base handler interface for processing application-layer requests.
/// </summary>
/// <typeparam name="TRequest">The request type (command, query, notification).</typeparam>
/// <typeparam name="TResponse">The response type returned after processing.</typeparam>
/// <remarks>
/// <para><strong>Handler Requirements:</strong></para>
/// <list type="bullet">
/// <item>Each request type MUST map to exactly one handler (enforced at DI registration)</item>
/// <item>Handlers MUST respect CancellationToken and terminate early when requested</item>
/// <item>Handlers MUST use Result&lt;T&gt; for business errors, throw exceptions for infrastructure errors</item>
/// <item>Handlers SHOULD be stateless (dependencies injected via constructor)</item>
/// </list>
/// </remarks>
public interface IRequestHandler<in TRequest, TResponse>
    where TRequest : IBaseRequest
{
    /// <summary>
    /// Handles the request asynchronously.
    /// </summary>
    /// <param name="request">The request to process.</param>
    /// <param name="cancellationToken">
    /// Cancellation token for early termination. Handlers MUST check this token
    /// during long-running operations and throw <see cref="OperationCanceledException"/>
    /// when cancellation is requested.
    /// </param>
    /// <returns>The response after processing the request.</returns>
    /// <exception cref="OperationCanceledException">When cancellation is requested.</exception>
    Task<TResponse> HandleAsync(TRequest request, CancellationToken cancellationToken);
}
