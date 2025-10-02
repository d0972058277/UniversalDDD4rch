namespace Architecture.Shell.Cqrs;

/// <summary>
/// Delegate representing the next step in the pipeline (behavior or handler).
/// </summary>
/// <typeparam name="TResponse">The response type returned by the pipeline.</typeparam>
/// <returns>A task that represents the asynchronous operation and returns the response.</returns>
public delegate Task<TResponse> RequestHandlerDelegate<TResponse>();

/// <summary>
/// Interceptor for cross-cutting concerns that wraps handler execution.
/// Behaviors execute in configured order to apply validation, authorization,
/// transactions, telemetry, caching, and other infrastructure concerns.
/// </summary>
/// <typeparam name="TRequest">The request type being processed.</typeparam>
/// <typeparam name="TResponse">The response type returned after processing.</typeparam>
/// <remarks>
/// <para><strong>Execution Pattern:</strong></para>
/// <code>
/// class ValidationBehavior&lt;TRequest, TResponse&gt; : IPipelineBehavior&lt;TRequest, TResponse&gt;
/// {
///     public async Task&lt;TResponse&gt; HandleAsync(TRequest request, RequestHandlerDelegate&lt;TResponse&gt; next, CancellationToken ct)
///     {
///         // Pre-handler logic
///         var validationResult = await _validator.ValidateAsync(request, ct);
///         if (validationResult.IsFailure)
///             throw new ValidationException(validationResult.Errors);
///
///         // Call next behavior or handler
///         var response = await next();
///
///         // Post-handler logic (if needed)
///         return response;
///     }
/// }
/// </code>
///
/// <para><strong>Common Behaviors (Recommended Order):</strong></para>
/// <list type="number">
/// <item>ValidationBehavior (order: 10) - Validate request payload</item>
/// <item>AuthorizationBehavior (order: 20) - Check permissions</item>
/// <item>UnitOfWorkBehavior (order: 30) - Open transaction for commands</item>
/// <item>TelemetryBehavior (order: 40) - Log request type, duration, status</item>
/// <item>CachingBehavior (order: 50) - Cache query results</item>
/// <item>ResilienceBehavior (order: 60) - Retry/timeout/circuit breaker</item>
/// </list>
///
/// <para><strong>Behavior Constraints:</strong></para>
/// <list type="bullet">
/// <item>Behaviors MUST call <c>next()</c> to continue pipeline unless explicitly short-circuiting</item>
/// <item>Behaviors MAY short-circuit by throwing exception or returning early</item>
/// <item>Behaviors execute in order determined by <see cref="Order"/> property</item>
/// <item>Behaviors can be conditionally applied using <see cref="IBehaviorMatcher"/></item>
/// </list>
/// </remarks>
public interface IPipelineBehavior<in TRequest, TResponse>
    where TRequest : IBaseRequest
{
    /// <summary>
    /// Gets the execution order for this behavior.
    /// Lower values execute first (outer behaviors).
    /// Higher values execute last (inner behaviors, closer to handler).
    /// </summary>
    int Order { get; }

    /// <summary>
    /// Handles the request by executing cross-cutting logic and calling the next behavior or handler.
    /// </summary>
    /// <param name="request">The request being processed.</param>
    /// <param name="continuation">
    /// Delegate to invoke the next behavior in the pipeline or the handler itself.
    /// MUST be called unless the behavior explicitly short-circuits the pipeline.
    /// </param>
    /// <param name="cancellationToken">Cancellation token for early termination.</param>
    /// <returns>The response after processing the request through the pipeline.</returns>
    Task<TResponse> HandleAsync(
        TRequest request,
        RequestHandlerDelegate<TResponse> continuation,
        CancellationToken cancellationToken);
}
