// Copyright (c) 2025 Universal DDD Architecture. All rights reserved.

namespace Architecture.Shell.Cqrs.Tests.TestHelpers;

/// <summary>
/// Matcher that applies behavior only to commands.
/// </summary>
public sealed class CommandOnlyMatcher : IBehaviorMatcher
{
    public bool Matches<TRequest>(TRequest request) where TRequest : IBaseRequest
    {
        // Check if request implements ICommand (void) or ICommand<T> (with result)
        var requestType = request.GetType();
        var interfaces = requestType.GetInterfaces();

        foreach (var iface in interfaces)
        {
            if (iface == typeof(ICommand))
                return true;

            if (iface.IsGenericType && iface.GetGenericTypeDefinition() == typeof(ICommand<>))
                return true;
        }

        return false;
    }
}

/// <summary>
/// Matcher that applies behavior only to queries.
/// </summary>
public sealed class QueryOnlyMatcher : IBehaviorMatcher
{
    public bool Matches<TRequest>(TRequest request) where TRequest : IBaseRequest
    {
        // Check if request implements IQuery<T>
        var requestType = request.GetType();
        var interfaces = requestType.GetInterfaces();

        foreach (var iface in interfaces)
        {
            if (iface.IsGenericType && iface.GetGenericTypeDefinition() == typeof(IQuery<>))
                return true;
        }

        return false;
    }
}

/// <summary>
/// Matcher that applies behavior to all requests.
/// </summary>
public sealed class AllRequestsMatcher : IBehaviorMatcher
{
    public bool Matches<TRequest>(TRequest request) where TRequest : IBaseRequest
    {
        return true;
    }
}
