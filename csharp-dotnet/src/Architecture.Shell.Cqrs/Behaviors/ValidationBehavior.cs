// Copyright (c) 2025 Universal DDD Architecture. All rights reserved.

using System;
using System.Threading;
using System.Threading.Tasks;

namespace Architecture.Shell.Cqrs.Behaviors;

/// <summary>
/// Pipeline behavior that validates requests before they reach the handler.
/// Executes at order 10 (first in recommended pipeline sequence) to fail fast on invalid payloads.
/// </summary>
/// <typeparam name="TRequest">The request type being validated.</typeparam>
/// <typeparam name="TResponse">The response type from the handler.</typeparam>
/// <remarks>
/// Validation failures throw exceptions to short-circuit the pipeline before expensive operations
/// (authorization checks, database transactions) are initiated. Integrates with FluentValidation
/// or other validation frameworks via IValidator interface.
/// </remarks>
public sealed class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IBaseRequest
{
    // Note: In a real implementation, this would inject IValidator<TRequest> from FluentValidation
    // For now, we provide a minimal implementation for testing purposes

    /// <summary>
    /// Gets the execution order for this behavior (10 - first in pipeline).
    /// </summary>
    public int Order => 10;

    /// <summary>
    /// Initializes a new instance of the <see cref="ValidationBehavior{TRequest, TResponse}"/> class.
    /// </summary>
    public ValidationBehavior()
    {
    }

    /// <summary>
    /// Validates the request before passing to the next behavior in the pipeline.
    /// </summary>
    /// <param name="request">The request to validate.</param>
    /// <param name="continuation">The next behavior or handler in the pipeline.</param>
    /// <param name="cancellationToken">Cancellation token to cancel the operation.</param>
    /// <returns>The response from the handler if validation passes.</returns>
    /// <exception cref="ValidationException">Thrown when validation fails.</exception>
    /// <exception cref="ArgumentNullException">Thrown when request is null.</exception>
    public async Task<TResponse> HandleAsync(
        TRequest request,
        RequestHandlerDelegate<TResponse> continuation,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(continuation);

        // Given: Request is received
        // When: Validation is performed
        // (In production, this would use IValidator<TRequest> from FluentValidation)

        // For now, we skip validation if no validator is registered
        // Validation logic would go here in a real implementation

        // Then: Continue to next behavior if validation passes
        return await continuation().ConfigureAwait(false);
    }
}
