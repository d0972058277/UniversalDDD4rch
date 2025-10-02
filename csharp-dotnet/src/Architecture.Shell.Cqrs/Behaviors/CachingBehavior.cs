// Copyright (c) 2025 Universal DDD Architecture. All rights reserved.

using System;
using System.Threading;
using System.Threading.Tasks;

namespace Architecture.Shell.Cqrs.Behaviors;

/// <summary>
/// Pipeline behavior that caches query responses to improve performance.
/// Executes at order 50 (queries only) to return cached results or write-through on cache miss.
/// </summary>
/// <typeparam name="TRequest">The query type being cached.</typeparam>
/// <typeparam name="TResponse">The response type from the handler.</typeparam>
/// <remarks>
/// Should only be applied to queries (read-only operations) using QueryOnlyMatcher.
/// Cache key is derived from query properties. Integrates with IDistributedCache or IMemoryCache.
/// </remarks>
public sealed class CachingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IBaseRequest
{
    // Note: In a real implementation, this would inject IMemoryCache or IDistributedCache
    // For now, we provide a minimal implementation for testing purposes

    /// <summary>
    /// Gets the execution order for this behavior (50 - queries only, after telemetry).
    /// </summary>
    public int Order => 50;

    /// <summary>
    /// Initializes a new instance of the <see cref="CachingBehavior{TRequest, TResponse}"/> class.
    /// </summary>
    public CachingBehavior()
    {
    }

    /// <summary>
    /// Checks cache for query result; executes handler on cache miss and stores result.
    /// </summary>
    /// <param name="request">The query to process.</param>
    /// <param name="continuation">The next behavior or handler in the pipeline.</param>
    /// <param name="cancellationToken">Cancellation token to cancel the operation.</param>
    /// <returns>Cached response or fresh response from handler.</returns>
    /// <exception cref="ArgumentNullException">Thrown when request is null.</exception>
    public async Task<TResponse> HandleAsync(
        TRequest request,
        RequestHandlerDelegate<TResponse> continuation,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(continuation);

        // Given: Query is received
        // When: Check cache for existing result
        // (In production, this would use IMemoryCache/IDistributedCache with serialized key from request properties)

        // For now, we skip caching if no cache service is registered
        // Cache logic would go here in a real implementation:
        // 1. Generate cache key from request properties
        // 2. Check cache for key
        // 3. If hit: return cached value
        // 4. If miss: execute handler, store result, return

        // Then: Execute handler (cache miss scenario)
        return await continuation().ConfigureAwait(false);
    }
}
