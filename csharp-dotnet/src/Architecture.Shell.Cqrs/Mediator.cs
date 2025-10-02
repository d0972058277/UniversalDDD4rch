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

        // Validate that the handler actually implements the expected interface
        if (!handlerType.IsAssignableFrom(handler.GetType()))
        {
            throw new InvalidOperationException(
                $"Handler for '{requestType.Name}' does not implement '{handlerType.Name}'. " +
                $"Actual type: '{handler.GetType().Name}'.");
        }

        return handler;
    }

    private List<BehaviorInfo> ResolveBehaviors(Type requestType, Type responseType)
    {
        // Construct behavior interface type: IPipelineBehavior<TRequest, TResponse>
        var behaviorType = typeof(IPipelineBehavior<,>).MakeGenericType(requestType, responseType);
        var behaviorsEnumerableType = typeof(IEnumerable<>).MakeGenericType(behaviorType);

        var behaviors = _serviceProvider.GetService(behaviorsEnumerableType) as IEnumerable<object>;

        if (behaviors == null)
            return new List<BehaviorInfo>();

        // Extract behavior info (instance + order) using reflection to access Order property
        var behaviorList = new List<BehaviorInfo>();
        foreach (var behavior in behaviors)
        {
            var orderProperty = behavior.GetType().GetProperty(nameof(IPipelineBehavior<IBaseRequest, object>.Order));
            var order = orderProperty != null ? (int)orderProperty.GetValue(behavior)! : 0;
            behaviorList.Add(new BehaviorInfo(behavior, order));
        }

        return behaviorList;
    }

    private sealed record BehaviorInfo(object Instance, int Order);

    private RequestHandlerDelegate<TResponse> BuildPipeline<TResponse>(
        IBaseRequest request,
        object handler,
        List<BehaviorInfo> behaviors,
        CancellationToken cancellationToken)
    {
        var requestType = request.GetType();
        var responseType = typeof(TResponse);

        // Terminal handler invocation
        // We need to invoke the handler without using dynamic (which can't find methods on boxed objects)
        // and without using MethodInfo.Invoke (which wraps exceptions in TargetInvocationException)
        // Solution: Use Expression trees to compile a strongly-typed delegate
        var handlerType = typeof(IRequestHandler<,>).MakeGenericType(requestType, responseType);
        var handleMethod = handlerType.GetMethod(nameof(IRequestHandler<IBaseRequest, object>.HandleAsync))!;

        // Create expression: (h, r, ct) => ((IRequestHandler<TRequest, TResponse>)h).HandleAsync((TRequest)r, ct)
        var handlerParam = System.Linq.Expressions.Expression.Parameter(typeof(object), "h");
        var requestParam = System.Linq.Expressions.Expression.Parameter(typeof(IBaseRequest), "r");
        var ctParam = System.Linq.Expressions.Expression.Parameter(typeof(CancellationToken), "ct");

        var castHandler = System.Linq.Expressions.Expression.Convert(handlerParam, handlerType);
        var castRequest = System.Linq.Expressions.Expression.Convert(requestParam, requestType);
        var methodCall = System.Linq.Expressions.Expression.Call(castHandler, handleMethod, castRequest, ctParam);

        var lambda = System.Linq.Expressions.Expression.Lambda<Func<object, IBaseRequest, CancellationToken, Task<TResponse>>>(
            methodCall, handlerParam, requestParam, ctParam);
        var compiledHandler = lambda.Compile();

        RequestHandlerDelegate<TResponse> handlerDelegate = () => compiledHandler(handler, request, cancellationToken);

        // Wrap handler with behaviors in reverse order (inner to outer)
        // Behaviors with lower Order values execute first (outer behaviors)
        var orderedBehaviors = behaviors
            .OrderByDescending(b => b.Order) // Reverse order for wrapping
            .ToList();

        // Validate behavior order and log warnings per BR-004
        ValidateBehaviorOrder(orderedBehaviors, request);

        // Build pipeline by wrapping handler with behaviors
        RequestHandlerDelegate<TResponse> pipeline = handlerDelegate;

        foreach (var behaviorInfo in orderedBehaviors)
        {
            var currentPipeline = pipeline;
            var behaviorInstance = behaviorInfo.Instance;

            // Compile a strongly-typed delegate for behavior invocation
            var behaviorType = typeof(IPipelineBehavior<,>).MakeGenericType(requestType, responseType);
            var behaviorMethod = behaviorType.GetMethod(nameof(IPipelineBehavior<IBaseRequest, object>.HandleAsync))!;

            // Create expression: (b, r, cont, ct) => ((IPipelineBehavior<TRequest, TResponse>)b).HandleAsync((TRequest)r, cont, ct)
            var behaviorParam = System.Linq.Expressions.Expression.Parameter(typeof(object), "b");
            var requestParam2 = System.Linq.Expressions.Expression.Parameter(typeof(IBaseRequest), "r");
            var contParam = System.Linq.Expressions.Expression.Parameter(typeof(RequestHandlerDelegate<TResponse>), "cont");
            var ctParam2 = System.Linq.Expressions.Expression.Parameter(typeof(CancellationToken), "ct");

            var castBehavior = System.Linq.Expressions.Expression.Convert(behaviorParam, behaviorType);
            var castRequest2 = System.Linq.Expressions.Expression.Convert(requestParam2, requestType);
            var methodCall2 = System.Linq.Expressions.Expression.Call(castBehavior, behaviorMethod, castRequest2, contParam, ctParam2);

            var lambda2 = System.Linq.Expressions.Expression.Lambda<Func<object, IBaseRequest, RequestHandlerDelegate<TResponse>, CancellationToken, Task<TResponse>>>(
                methodCall2, behaviorParam, requestParam2, contParam, ctParam2);
            var compiledBehavior = lambda2.Compile();

            pipeline = () => compiledBehavior(behaviorInstance, request, currentPipeline, cancellationToken);
        }

        return pipeline;
    }

    private void ValidateBehaviorOrder(List<BehaviorInfo> behaviors, IBaseRequest request)
    {
        // Recommended order:
        // 1. Validation (10)
        // 2. Authorization (20)
        // 3. UnitOfWork/Transaction (30)
        // 4. Telemetry (40)
        // 5. Caching (50)
        // 6. Resilience (60)

        var orderedByOrder = behaviors.OrderBy(b => b.Order).ToList();

        // Check for dangerous orderings
        for (int i = 0; i < orderedByOrder.Count - 1; i++)
        {
            var current = orderedByOrder[i];
            var next = orderedByOrder[i + 1];
            var currentName = current.Instance.GetType().Name;
            var nextName = next.Instance.GetType().Name;
            var currentOrder = current.Order;
            var nextOrder = next.Order;

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
