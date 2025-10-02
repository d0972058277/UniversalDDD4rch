using Architecture.Core.Functional;
using Microsoft.Extensions.Logging;

namespace Architecture.Shell.Cqrs;

/// <summary>
/// Default implementation of <see cref="IMediator"/>.
/// Routes requests to handlers and executes pipeline behaviors in configured order.
/// </summary>
public sealed class Mediator : IMediator
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<IMediator> _logger;
    private readonly Action<IServiceProvider>? _handlerValidator;

    /// <summary>
    /// Initializes a new instance of the <see cref="Mediator"/> class.
    /// </summary>
    /// <param name="serviceProvider">Service provider for resolving handlers and behaviors.</param>
    /// <param name="logger">Logger for diagnostic information.</param>
    /// <param name="handlerValidator">Optional handler validation logic (typically provided by DI registration).</param>
    /// <exception cref="InvalidOperationException">
    /// When handler registration validation fails (zero or multiple handlers for same request type).
    /// Per FR-008 and spec.md:L64-67 edge cases, this validation occurs at constructor time.
    /// </exception>
    public Mediator(
        IServiceProvider serviceProvider,
        ILogger<IMediator> logger,
        Action<IServiceProvider>? handlerValidator = null)
    {
        ArgumentNullException.ThrowIfNull(serviceProvider);
        ArgumentNullException.ThrowIfNull(logger);

        _serviceProvider = serviceProvider;
        _logger = logger;
        _handlerValidator = handlerValidator;

        // Execute constructor-time handler uniqueness validation per T036b
        // The validator is provided by DI registration (T182) which has knowledge of all registered types
        _handlerValidator?.Invoke(_serviceProvider);
    }

    /// <inheritdoc />
    public async Task<TResponse> SendAsync<TResponse>(
        IBaseRequest request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var requestType = request.GetType();
        var responseType = typeof(TResponse);

        // Resolve handler for request type
        var handler = ResolveHandler(requestType, responseType);

        // Resolve applicable pipeline behaviors
        var behaviors = ResolveBehaviors(requestType, responseType);

        // Build behavior chain in configured order
        var pipeline = BuildPipeline<TResponse>(request, handler, behaviors, cancellationToken);

        // Execute pipeline
        return await pipeline().ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task<Result> SendAsync(
        ICommand command,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);

        var requestType = command.GetType();
        var responseType = typeof(Result);

        // Resolve handler for command type
        var handler = ResolveHandler(requestType, responseType);

        // Resolve applicable pipeline behaviors
        var behaviors = ResolveBehaviors(requestType, responseType);

        // Build behavior chain in configured order
        var pipeline = BuildPipeline<Result>(command, handler, behaviors, cancellationToken);

        // Execute pipeline
        return await pipeline().ConfigureAwait(false);
    }

    private object ResolveHandler(Type requestType, Type responseType)
    {
        // Construct handler interface type: IRequestHandler<TRequest, TResponse>
        var handlerType = typeof(IRequestHandler<,>).MakeGenericType(requestType, responseType);

        var handler = _serviceProvider.GetService(handlerType);

        // Validate handler registration per FR-008
        if (handler == null)
        {
            throw new InvalidOperationException(
                $"No handler registered for request type '{requestType.Name}'. " +
                $"Expected handler implementing '{handlerType.Name}'.");
        }

        return handler;
    }

    private IEnumerable<object> ResolveBehaviors(Type requestType, Type responseType)
    {
        // Construct behavior interface type: IPipelineBehavior<TRequest, TResponse>
        var behaviorType = typeof(IPipelineBehavior<,>).MakeGenericType(requestType, responseType);
        var behaviorsEnumerableType = typeof(IEnumerable<>).MakeGenericType(behaviorType);

        var behaviors = _serviceProvider.GetService(behaviorsEnumerableType) as IEnumerable<object>;

        return behaviors ?? Enumerable.Empty<object>();
    }

    private RequestHandlerDelegate<TResponse> BuildPipeline<TResponse>(
        IBaseRequest request,
        object handler,
        IEnumerable<object> behaviors,
        CancellationToken cancellationToken)
    {
        var requestType = request.GetType();
        var responseType = typeof(TResponse);

        // Terminal handler invocation
        RequestHandlerDelegate<TResponse> handlerDelegate = () =>
        {
            var handleMethod = handler.GetType().GetMethod(nameof(IRequestHandler<IBaseRequest, object>.HandleAsync));
            if (handleMethod == null)
                throw new InvalidOperationException($"Handler for '{requestType.Name}' does not implement HandleAsync method.");

            var result = handleMethod.Invoke(handler, new object[] { request, cancellationToken });
            return (Task<TResponse>)result!;
        };

        // Wrap handler with behaviors in reverse order (inner to outer)
        // Behaviors with lower Order values execute first (outer behaviors)
        var orderedBehaviors = behaviors
            .Cast<dynamic>() // Use dynamic to access Order property
            .OrderByDescending(b => (int)b.Order) // Reverse order for wrapping
            .ToList();

        // Validate behavior order and log warnings per BR-004
        ValidateBehaviorOrder(orderedBehaviors, request);

        // Build pipeline by wrapping handler with behaviors
        RequestHandlerDelegate<TResponse> pipeline = handlerDelegate;

        foreach (var behavior in orderedBehaviors)
        {
            var currentPipeline = pipeline;
            pipeline = () => behavior.HandleAsync((dynamic)request, currentPipeline, cancellationToken);
        }

        return pipeline;
    }

    private void ValidateBehaviorOrder(List<dynamic> behaviors, IBaseRequest request)
    {
        // Recommended order:
        // 1. Validation (10)
        // 2. Authorization (20)
        // 3. UnitOfWork/Transaction (30)
        // 4. Telemetry (40)
        // 5. Caching (50)
        // 6. Resilience (60)

        var orderedByOrder = behaviors.OrderBy(b => (int)b.Order).ToList();

        // Check for dangerous orderings
        for (int i = 0; i < orderedByOrder.Count - 1; i++)
        {
            var current = orderedByOrder[i];
            var next = orderedByOrder[i + 1];
            var currentName = current.GetType().Name as string;
            var nextName = next.GetType().Name as string;
            var currentOrder = (int)current.Order;
            var nextOrder = (int)next.Order;

            if (currentName == null || nextName == null)
                continue;

            // Warning: Transaction before Validation
            if (currentName.Contains("UnitOfWork", StringComparison.Ordinal) &&
                nextName.Contains("Validation", StringComparison.Ordinal))
            {
                LogWarning(
                    "Non-recommended behavior order detected: {0} (order {1}) executes before {2} (order {3}). " +
                    "Consider running Validation before Transaction to fail fast on invalid requests.",
                    currentName, currentOrder, nextName, nextOrder);
            }

            // Warning: Transaction before Authorization
            if (currentName.Contains("UnitOfWork", StringComparison.Ordinal) &&
                nextName.Contains("Authorization", StringComparison.Ordinal))
            {
                LogWarning(
                    "Non-recommended behavior order detected: {0} (order {1}) executes before {2} (order {3}). " +
                    "Consider running Authorization before Transaction to avoid wasting transaction resources.",
                    currentName, currentOrder, nextName, nextOrder);
            }
        }
    }

    [System.Diagnostics.CodeAnalysis.SuppressMessage("Usage", "CA2254:Template should be a static expression", Justification = "Message template varies based on validation scenario")]
    [System.Diagnostics.CodeAnalysis.SuppressMessage("Performance", "CA1848:Use LoggerMessage delegates", Justification = "Low-frequency warning logging does not warrant LoggerMessage overhead")]
    private void LogWarning(string message, params object[] args)
    {
        if (_logger.IsEnabled(LogLevel.Warning))
        {
            _logger.Log(LogLevel.Warning, message, args);
        }
    }
}
