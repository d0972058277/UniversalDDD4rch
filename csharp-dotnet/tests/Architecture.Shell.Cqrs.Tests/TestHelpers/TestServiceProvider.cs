// Copyright (c) 2025 Universal DDD Architecture. All rights reserved.

using System;
using System.Collections.Generic;
using System.Linq;

namespace Architecture.Shell.Cqrs.Tests.TestHelpers;

/// <summary>
/// Simple service provider for testing that stores service instances in a dictionary.
/// </summary>
public sealed class TestServiceProvider : IServiceProvider
{
    private readonly Dictionary<Type, object> _services = new();

    /// <summary>
    /// Registers a service instance for a specific type.
    /// </summary>
    public void AddService(Type serviceType, object implementation)
    {
        _services[serviceType] = implementation;
    }

    /// <summary>
    /// Registers a service instance for a specific type (generic version).
    /// </summary>
    public void AddService<T>(T implementation) where T : notnull
    {
        _services[typeof(T)] = implementation;
    }

    /// <summary>
    /// Gets the service object of the specified type.
    /// </summary>
    public object? GetService(Type serviceType)
    {
        return _services.TryGetValue(serviceType, out var service) ? service : null;
    }

    /// <summary>
    /// Creates a builder for fluent service registration.
    /// </summary>
    public static TestServiceProviderBuilder CreateBuilder()
    {
        return new TestServiceProviderBuilder();
    }
}

/// <summary>
/// Builder for creating TestServiceProvider with fluent API.
/// </summary>
public sealed class TestServiceProviderBuilder
{
    private readonly TestServiceProvider _provider = new();
    private readonly List<object> _handlers = new();
    private readonly List<object> _behaviors = new();

    /// <summary>
    /// Adds a request handler to the service provider.
    /// </summary>
    public TestServiceProviderBuilder AddHandler<TRequest, TResponse>(object handler)
        where TRequest : IBaseRequest
    {
        _handlers.Add(handler);
        _provider.AddService(typeof(IRequestHandler<TRequest, TResponse>), handler);
        return this;
    }

    /// <summary>
    /// Adds a pipeline behavior to the service provider.
    /// </summary>
    public TestServiceProviderBuilder AddBehavior<TRequest, TResponse>(object behavior)
        where TRequest : IBaseRequest
    {
        _behaviors.Add(behavior);
        _provider.AddService(typeof(IPipelineBehavior<TRequest, TResponse>), behavior);
        return this;
    }

    /// <summary>
    /// Adds a singleton service instance.
    /// </summary>
    public TestServiceProviderBuilder AddSingleton<T>(T instance) where T : notnull
    {
        _provider.AddService(typeof(T), instance);
        return this;
    }

    /// <summary>
    /// Adds multiple handlers at once.
    /// </summary>
    public TestServiceProviderBuilder AddHandlers(params object[] handlers)
    {
        foreach (var handler in handlers)
        {
            _handlers.Add(handler);

            // Find all IRequestHandler<,> interfaces implemented by the handler
            var handlerInterfaces = handler.GetType()
                .GetInterfaces()
                .Where(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IRequestHandler<,>));

            foreach (var handlerInterface in handlerInterfaces)
            {
                _provider.AddService(handlerInterface, handler);
            }
        }
        return this;
    }

    /// <summary>
    /// Adds multiple behaviors at once.
    /// </summary>
    public TestServiceProviderBuilder AddBehaviors(params object[] behaviors)
    {
        foreach (var behavior in behaviors)
        {
            _behaviors.Add(behavior);

            // Find all IPipelineBehavior<,> interfaces implemented by the behavior
            var behaviorInterfaces = behavior.GetType()
                .GetInterfaces()
                .Where(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IPipelineBehavior<,>));

            foreach (var behaviorInterface in behaviorInterfaces)
            {
                _provider.AddService(behaviorInterface, behavior);
            }
        }
        return this;
    }

    /// <summary>
    /// Builds the service provider.
    /// </summary>
    public IServiceProvider Build()
    {
        return _provider;
    }
}
