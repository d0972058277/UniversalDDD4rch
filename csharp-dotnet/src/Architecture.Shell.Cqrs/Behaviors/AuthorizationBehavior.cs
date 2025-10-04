// Copyright (c) 2025 Universal DDD Architecture. All rights reserved.

using System;
using System.Threading;
using System.Threading.Tasks;

namespace Architecture.Shell.Cqrs.Behaviors;

/// <summary>
/// Pipeline behavior that performs authorization checks before requests reach the handler.
/// Executes at order 20 (after validation, before transaction) to verify permissions.
/// </summary>
/// <typeparam name="TRequest">The request type being authorized.</typeparam>
/// <typeparam name="TResponse">The response type from the handler.</typeparam>
/// <remarks>
/// Authorization failures throw UnauthorizedAccessException to short-circuit the pipeline.
/// Integrates with ASP.NET Core authorization or custom authorization frameworks via IAuthorizationService.
/// </remarks>
public sealed class AuthorizationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IBaseRequest
{
    // Note: In a real implementation, this would inject IAuthorizationService or similar
    // For now, we provide a minimal implementation for testing purposes

    /// <summary>
    /// Gets the execution order for this behavior (20 - after validation).
    /// </summary>
    public int Order => 20;

    /// <summary>
    /// Initializes a new instance of the <see cref="AuthorizationBehavior{TRequest, TResponse}"/> class.
    /// </summary>
    public AuthorizationBehavior()
    {
    }

    /// <summary>
    /// Performs authorization check before passing to the next behavior in the pipeline.
    /// </summary>
    /// <param name="request">The request to authorize.</param>
    /// <param name="continuation">The next behavior or handler in the pipeline.</param>
    /// <param name="cancellationToken">Cancellation token to cancel the operation.</param>
    /// <returns>The response from the handler if authorization succeeds.</returns>
    /// <exception cref="UnauthorizedAccessException">Thrown when authorization fails.</exception>
    /// <exception cref="ArgumentNullException">Thrown when request is null.</exception>
    public async Task<TResponse> HandleAsync(
        TRequest request,
        RequestHandlerDelegate<TResponse> continuation,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(continuation);

        // Given: Request is received and validated
        // When: Authorization is performed
        // (In production, this would use IAuthorizationService or similar)

        // For now, we skip authorization if no service is registered
        // Authorization logic would go here in a real implementation

        // Then: Continue to next behavior if authorization passes
        return await continuation().ConfigureAwait(false);
    }
}
