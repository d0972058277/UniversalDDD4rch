using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Architecture.Shell.Cqrs;

/// <summary>
/// Extension methods for registering CQRS services with dependency injection.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Adds CQRS mediator and related services to the service collection.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configure">Configuration action for CQRS registration.</param>
    /// <returns>The service collection for chaining.</returns>
    /// <example>
    /// <code>
    /// services.AddCqrs(config =>
    /// {
    ///     config.RegisterHandlersFromAssembly(typeof(CreateOrderHandler).Assembly);
    ///     config.AddBehavior&lt;ValidationBehavior&lt;,&gt;&gt;(order: 10);
    ///     config.AddBehavior&lt;UnitOfWorkBehavior&lt;,&gt;&gt;(order: 30);
    /// });
    /// </code>
    /// </example>
    public static IServiceCollection AddCqrs(
        this IServiceCollection services,
        Action<CqrsConfiguration> configure)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configure);

        var configuration = new CqrsConfiguration(services);
        configure(configuration);

        // Validate handler uniqueness using service descriptors (before building service provider)
        // This avoids circular dependency issues that occur when trying to resolve handlers at runtime
        foreach (var registration in configuration.HandlerRegistrations)
        {
            ValidateHandlerUniquenessFromDescriptors(services, registration.RequestType, registration.ResponseType);
        }

        // Register mediator as scoped service
        services.AddScoped<IMediator>(sp =>
        {
            var logger = sp.GetRequiredService<ILogger<IMediator>>();
            return new Mediator(sp, logger);
        });

        return services;
    }

    /// <summary>
    /// Validates that exactly one handler is registered for each request type.
    /// Throws InvalidOperationException if zero or multiple handlers are found.
    /// Uses service descriptors to avoid instantiating handlers (which could cause circular dependencies).
    /// </summary>
    private static void ValidateHandlerUniquenessFromDescriptors(IServiceCollection services, Type requestType, Type responseType)
    {
        var handlerType = typeof(IRequestHandler<,>).MakeGenericType(requestType, responseType);

        // Count registrations by checking service descriptors
        var registrations = services
            .Where(descriptor => descriptor.ServiceType == handlerType)
            .ToList();

        if (registrations.Count == 0)
        {
            throw new InvalidOperationException(
                $"No handler registered for request type '{requestType.Name}' with response type '{responseType.Name}'. " +
                $"Expected exactly one handler implementing '{handlerType.Name}'.");
        }

        if (registrations.Count > 1)
        {
            var handlerNames = string.Join(", ", registrations.Select(r => r.ImplementationType?.Name ?? r.ServiceType.Name));
            throw new InvalidOperationException(
                $"Multiple handlers registered for request type '{requestType.Name}' with response type '{responseType.Name}': {handlerNames}. " +
                $"Only one handler is allowed per request type.");
        }
    }
}

/// <summary>
/// Configuration builder for CQRS services.
/// </summary>
public sealed class CqrsConfiguration
{
    private readonly IServiceCollection _services;
    internal readonly List<HandlerRegistration> HandlerRegistrations = new();

    internal CqrsConfiguration(IServiceCollection services)
    {
        _services = services;
    }

    /// <summary>
    /// Registers all command and query handlers from the specified assembly.
    /// </summary>
    /// <param name="assembly">The assembly to scan for handlers.</param>
    /// <returns>The configuration for chaining.</returns>
    public CqrsConfiguration RegisterHandlersFromAssembly(Assembly assembly)
    {
        ArgumentNullException.ThrowIfNull(assembly);

        var handlerTypes = assembly.GetTypes()
            .Where(t => t.IsClass && !t.IsAbstract && t.IsPublic) // Only scan public classes
            .SelectMany(t => t.GetInterfaces(), (type, iface) => new { Type = type, Interface = iface })
            .Where(x => x.Interface.IsGenericType &&
                       (x.Interface.GetGenericTypeDefinition() == typeof(IRequestHandler<,>) ||
                        x.Interface.GetGenericTypeDefinition() == typeof(ICommandHandler<,>) ||
                        x.Interface.GetGenericTypeDefinition() == typeof(ICommandHandler<>) ||
                        x.Interface.GetGenericTypeDefinition() == typeof(IQueryHandler<,>)))
            .ToList();

        foreach (var handler in handlerTypes)
        {
            // Register as the specific handler interface
            _services.AddScoped(handler.Interface, handler.Type);

            // Track registration for validation
            var genericArgs = handler.Interface.GetGenericArguments();
            if (genericArgs.Length == 2)
            {
                HandlerRegistrations.Add(new HandlerRegistration(genericArgs[0], genericArgs[1]));
            }
            else if (genericArgs.Length == 1 && handler.Interface.GetGenericTypeDefinition() == typeof(ICommandHandler<>))
            {
                // Void command handler: ICommandHandler<TCommand> implements IRequestHandler<TCommand, Result>
                HandlerRegistrations.Add(new HandlerRegistration(genericArgs[0], typeof(Architecture.Core.Functional.Result)));
            }
        }

        return this;
    }

    /// <summary>
    /// Registers a pipeline behavior with the specified execution order.
    /// </summary>
    /// <typeparam name="TBehavior">The behavior type (must be open generic like ValidationBehavior&lt;,&gt;).</typeparam>
    /// <param name="order">Execution order (lower values execute first, recommended: Validation=10, Authorization=20, UnitOfWork=30).</param>
    /// <param name="matcher">Optional matcher to filter which requests the behavior applies to.</param>
    /// <returns>The configuration for chaining.</returns>
    /// <remarks>
    /// Recommended behavior order per BR-004:
    /// 1. Validation (10) - Fail fast on invalid payloads
    /// 2. Authorization (20) - Check permissions before expensive operations
    /// 3. UnitOfWork (30) - Open transactions only after validation passes
    /// 4. Telemetry (40) - Measure execution time
    /// 5. Caching (50) - Cache query results
    /// 6. Resilience (60) - Retry/circuit breaker for external calls
    /// </remarks>
    public CqrsConfiguration AddBehavior<TBehavior>(int order, IBehaviorMatcher? matcher = null)
        where TBehavior : class
    {
        // Register behavior as open generic type
        // The mediator will resolve IPipelineBehavior<TRequest, TResponse> for each request
        var behaviorType = typeof(TBehavior);

        if (!behaviorType.IsGenericTypeDefinition || behaviorType.GetGenericArguments().Length != 2)
        {
            throw new ArgumentException(
                $"Behavior type must be an open generic type with 2 type parameters (e.g., ValidationBehavior<,>). " +
                $"Actual type: {behaviorType.Name}",
                nameof(TBehavior));
        }

        // Register as factory that creates behavior with Order property set
        _services.AddScoped(typeof(IPipelineBehavior<,>), sp =>
        {
            // This factory will be called by the mediator when resolving behaviors
            // We cannot create the instance here because we don't know TRequest/TResponse yet
            // Instead, we need to register it in a way that DI can resolve it with the right generic args
            throw new NotSupportedException(
                "Direct resolution of open generic IPipelineBehavior<,> is not supported. " +
                "Use RegisterBehavior method or register concrete types.");
        });

        // TODO: Implement proper open generic registration with order and matcher support
        // For now, behaviors must be registered manually as concrete types in user code

        return this;
    }

    /// <summary>
    /// Registers a specific pipeline behavior instance for a request/response type pair.
    /// </summary>
    /// <typeparam name="TRequest">The request type.</typeparam>
    /// <typeparam name="TResponse">The response type.</typeparam>
    /// <param name="behaviorFactory">Factory to create the behavior instance.</param>
    /// <returns>The configuration for chaining.</returns>
    public CqrsConfiguration AddBehavior<TRequest, TResponse>(
        Func<IServiceProvider, IPipelineBehavior<TRequest, TResponse>> behaviorFactory)
        where TRequest : IBaseRequest
    {
        ArgumentNullException.ThrowIfNull(behaviorFactory);

        _services.AddScoped<IPipelineBehavior<TRequest, TResponse>>(behaviorFactory);

        return this;
    }
}

/// <summary>
/// Represents a handler registration for validation.
/// </summary>
internal sealed record HandlerRegistration(Type RequestType, Type ResponseType);
