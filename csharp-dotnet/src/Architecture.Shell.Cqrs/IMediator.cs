namespace Architecture.Shell.Cqrs;

/// <summary>
/// Single entry point for sending commands and queries.
/// Routes requests to handlers via configured pipeline behaviors.
/// </summary>
/// <remarks>
/// <para><strong>Behavioral Guarantees:</strong></para>
/// <list type="bullet">
/// <item>Each request type maps to exactly ONE handler (validated at startup)</item>
/// <item>Pipeline behaviors execute in configured order</item>
/// <item>Cancellation tokens propagate through entire pipeline</item>
/// <item>Exceptions propagate to caller for infrastructure error handling</item>
/// <item>Result&lt;T&gt; returns for business error handling</item>
/// </list>
/// </remarks>
public interface IMediator
{
    /// <summary>
    /// Sends a request that returns a response.
    /// </summary>
    /// <typeparam name="TResponse">The response type.</typeparam>
    /// <param name="request">The request to send (command or query).</param>
    /// <param name="cancellationToken">Cancellation token for early termination.</param>
    /// <returns>The response after processing through the pipeline.</returns>
    /// <exception cref="InvalidOperationException">When zero or multiple handlers registered for request type.</exception>
    /// <exception cref="OperationCanceledException">When cancellation is requested.</exception>
    Task<TResponse> SendAsync<TResponse>(
        IBaseRequest request,
        CancellationToken cancellationToken);
}
