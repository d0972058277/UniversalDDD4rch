namespace Architecture.Shell.Cqrs;

/// <summary>
/// Configuration interface for determining which behaviors apply to which request types.
/// Enables conditional behavior execution based on request characteristics (command vs query, custom attributes, etc.).
/// </summary>
/// <remarks>
/// <para><strong>Common Matchers:</strong></para>
/// <list type="bullet">
/// <item>CommandOnlyMatcher - Applies behavior only to commands (for UnitOfWorkBehavior)</item>
/// <item>QueryOnlyMatcher - Applies behavior only to queries (for CachingBehavior)</item>
/// <item>AllRequestsMatcher - Applies behavior to all requests (for TelemetryBehavior)</item>
/// </list>
/// </remarks>
/// <example>
/// <code>
/// public class CommandOnlyMatcher : IBehaviorMatcher
/// {
///     public bool Matches&lt;TRequest&gt;(TRequest request) where TRequest : IBaseRequest
///     {
///         return request is ICommand;
///     }
/// }
///
/// // Usage in DI registration
/// services.AddPipelineBehavior&lt;UnitOfWorkBehavior&lt;,&gt;&gt;(new CommandOnlyMatcher());
/// </code>
/// </example>
public interface IBehaviorMatcher
{
    /// <summary>
    /// Determines if the behavior should be applied to the specified request.
    /// </summary>
    /// <typeparam name="TRequest">The request type to evaluate.</typeparam>
    /// <param name="request">The request instance (may be used for attribute inspection or runtime checks).</param>
    /// <returns><c>true</c> if the behavior should apply; otherwise, <c>false</c>.</returns>
    bool Matches<TRequest>(TRequest request) where TRequest : IBaseRequest;
}
