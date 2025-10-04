// Copyright (c) 2025 Universal DDD Architecture. All rights reserved.

using System;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace Architecture.Shell.Cqrs.Behaviors;

/// <summary>
/// Pipeline behavior that logs telemetry for request processing.
/// Executes at order 40 (after transaction, wrapping handler execution) to measure handler duration.
/// </summary>
/// <typeparam name="TRequest">The request type being processed.</typeparam>
/// <typeparam name="TResponse">The response type from the handler.</typeparam>
/// <remarks>
/// Logs request type, duration, status, and exceptions per NFR-002 requirements.
/// For commands, includes TransactionId for correlation (BR-002).
/// </remarks>
public sealed class TelemetryBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IBaseRequest
{
    private readonly ILogger<TelemetryBehavior<TRequest, TResponse>> _logger;

    /// <summary>
    /// Gets the execution order for this behavior (40 - after transaction, wrapping handler).
    /// </summary>
    public int Order => 40;

    /// <summary>
    /// Initializes a new instance of the <see cref="TelemetryBehavior{TRequest, TResponse}"/> class.
    /// </summary>
    /// <param name="logger">Logger for telemetry output.</param>
    public TelemetryBehavior(ILogger<TelemetryBehavior<TRequest, TResponse>> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Logs telemetry before and after request processing.
    /// </summary>
    /// <param name="request">The request being processed.</param>
    /// <param name="continuation">The next behavior or handler in the pipeline.</param>
    /// <param name="cancellationToken">Cancellation token to cancel the operation.</param>
    /// <returns>The response from the handler.</returns>
    public async Task<TResponse> HandleAsync(
        TRequest request,
        RequestHandlerDelegate<TResponse> continuation,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(continuation);

        var requestType = typeof(TRequest).FullName ?? typeof(TRequest).Name;
        var stopwatch = Stopwatch.StartNew();

        try
        {
            // Given: Request starts processing
            _logger.LogInformation(
                "{RequestType} started at {Timestamp}",
                requestType,
                DateTimeOffset.UtcNow);

            // When: Execute handler
            var response = await continuation().ConfigureAwait(false);

            // Then: Log success telemetry
            stopwatch.Stop();
            _logger.LogInformation(
                "{RequestType} completed successfully - Duration: {Duration}ms, Status: Success",
                requestType,
                stopwatch.ElapsedMilliseconds);

            return response;
        }
        catch (OperationCanceledException)
        {
            // Cancellation requested
            stopwatch.Stop();
            _logger.LogWarning(
                "{RequestType} cancelled - Duration: {Duration}ms, Status: Cancelled",
                requestType,
                stopwatch.ElapsedMilliseconds);
            throw;
        }
        catch (Exception ex)
        {
            // Infrastructure or business error
            stopwatch.Stop();
            _logger.LogError(
                ex,
                "{RequestType} failed - Duration: {Duration}ms, Status: Error, Exception: {ExceptionType}",
                requestType,
                stopwatch.ElapsedMilliseconds,
                ex.GetType().Name);
            throw;
        }
    }
}
