using System;
using System.Collections.Generic;
using System.Linq;
using Xunit;
using Architecture.Core.Functional;
using Architecture.Core.Domain.Events;
using Architecture.Core.Domain.Aggregates;
using Architecture.Core.Tests.TestDomain;

namespace Architecture.Core.Tests.Extensions;

/// <summary>
/// Custom assertion extensions for testing Architecture.Core types.
/// </summary>
public static class AssertionExtensions
{
    /// <summary>
    /// Asserts that a Result is successful.
    /// </summary>
    public static void ShouldBeSuccess(this Result result)
    {
        Assert.True(result.IsSuccess, $"Expected success but got failure: {(result.IsFailure ? result.Error.ToString() : "Unknown error")}");
    }

    /// <summary>
    /// Asserts that a Result&lt;T&gt; is successful and returns the value.
    /// </summary>
    public static T ShouldBeSuccess<T>(this Result<T> result)
    {
        Assert.True(result.IsSuccess, $"Expected success but got failure: {(result.IsFailure ? result.Error.ToString() : "Unknown error")}");
        return result.Value;
    }

    /// <summary>
    /// Asserts that a Result is a failure.
    /// </summary>
    public static Error ShouldBeFailure(this Result result)
    {
        Assert.True(result.IsFailure, "Expected failure but got success");
        return result.Error;
    }

    /// <summary>
    /// Asserts that a Result&lt;T&gt; is a failure.
    /// </summary>
    public static Error ShouldBeFailure<T>(this Result<T> result)
    {
        Assert.True(result.IsFailure, "Expected failure but got success");
        return result.Error;
    }

    /// <summary>
    /// Asserts that a Result is a failure with the specified error code.
    /// </summary>
    public static Error ShouldBeFailureWithCode(this Result result, string expectedCode)
    {
        var error = result.ShouldBeFailure();
        Assert.Equal(expectedCode, error.Code);
        return error;
    }

    /// <summary>
    /// Asserts that a Result&lt;T&gt; is a failure with the specified error code.
    /// </summary>
    public static Error ShouldBeFailureWithCode<T>(this Result<T> result, string expectedCode)
    {
        var error = result.ShouldBeFailure();
        Assert.Equal(expectedCode, error.Code);
        return error;
    }

    /// <summary>
    /// Asserts that a Result is a failure with the specified error category.
    /// </summary>
    public static Error ShouldBeFailureWithCategory(this Result result, ErrorCategory expectedCategory)
    {
        var error = result.ShouldBeFailure();
        Assert.Equal(expectedCategory, error.Category);
        return error;
    }

    /// <summary>
    /// Asserts that a Result&lt;T&gt; is a failure with the specified error category.
    /// </summary>
    public static Error ShouldBeFailureWithCategory<T>(this Result<T> result, ErrorCategory expectedCategory)
    {
        var error = result.ShouldBeFailure();
        Assert.Equal(expectedCategory, error.Category);
        return error;
    }

    /// <summary>
    /// Asserts that a Maybe&lt;T&gt; has a value.
    /// </summary>
    public static T ShouldHaveValue<T>(this Maybe<T> maybe)
    {
        Assert.True(maybe.HasValue, "Expected Maybe to have a value but it was None");
        return maybe.Value;
    }

    /// <summary>
    /// Asserts that a Maybe&lt;T&gt; has no value.
    /// </summary>
    public static void ShouldBeNone<T>(this Maybe<T> maybe)
    {
        Assert.False(maybe.HasValue, $"Expected Maybe to be None but it had value: {maybe.Value}");
    }

    /// <summary>
    /// Asserts that a Maybe&lt;T&gt; has the specified value.
    /// </summary>
    public static void ShouldHaveValue<T>(this Maybe<T> maybe, T expectedValue)
    {
        var actualValue = maybe.ShouldHaveValue();
        Assert.Equal(expectedValue, actualValue);
    }

    /// <summary>
    /// Asserts that an aggregate has raised the specified number of events.
    /// </summary>
    public static void ShouldHaveEventCount<TId>(this IAggregateRoot<TId> aggregate, int expectedCount)
        where TId : class
    {
        Assert.Equal(expectedCount, aggregate.Events.Count);
    }

    /// <summary>
    /// Asserts that an aggregate has raised an event of the specified type.
    /// </summary>
    public static T ShouldHaveRaisedEvent<T>(this IAggregateRoot<string> aggregate)
        where T : class, IDomainEvent
    {
        var events = aggregate.Events.OfType<T>().ToList();
        Assert.Single(events);
        return events.First();
    }

    /// <summary>
    /// Asserts that an aggregate has raised the specified number of events of the given type.
    /// </summary>
    public static IList<T> ShouldHaveRaisedEvents<T>(this IAggregateRoot<string> aggregate, int expectedCount)
        where T : class, IDomainEvent
    {
        var events = aggregate.Events.OfType<T>().ToList();
        Assert.Equal(expectedCount, events.Count);
        return events;
    }

    /// <summary>
    /// Asserts that an aggregate has not raised any events of the specified type.
    /// </summary>
    public static void ShouldNotHaveRaisedEvent<T>(this IAggregateRoot<string> aggregate)
        where T : class, IDomainEvent
    {
        var events = aggregate.Events.OfType<T>().ToList();
        Assert.Empty(events);
    }

    /// <summary>
    /// Asserts that an order has the specified status.
    /// </summary>
    public static void ShouldHaveStatus(this Order order, OrderStatus expectedStatus)
    {
        Assert.Equal(expectedStatus, order.Status);
    }

    /// <summary>
    /// Asserts that an order was created by the specified customer.
    /// </summary>
    public static void ShouldBelongToCustomer(this Order order, CustomerId expectedCustomerId)
    {
        Assert.Equal(expectedCustomerId, order.CustomerId);
    }

    /// <summary>
    /// Asserts that an order was created by the specified customer.
    /// </summary>
    public static void ShouldBelongToCustomer(this Order order, string expectedCustomerId)
    {
        Assert.Equal(expectedCustomerId, order.CustomerId.Value);
    }

    /// <summary>
    /// Asserts that an order has the specified total amount.
    /// </summary>
    public static void ShouldHaveTotalAmount(this Order order, Money expectedAmount)
    {
        Assert.Equal(expectedAmount, order.TotalAmount);
    }

    /// <summary>
    /// Asserts that an order has the specified total amount.
    /// </summary>
    public static void ShouldHaveTotalAmount(this Order order, decimal expectedAmount, string expectedCurrency = "USD")
    {
        Assert.Equal(expectedAmount, order.TotalAmount.Amount);
        Assert.Equal(expectedCurrency, order.TotalAmount.Currency);
    }

    /// <summary>
    /// Asserts that a domain event has the specified correlation ID.
    /// </summary>
    public static void ShouldHaveCorrelationId(this IDomainEvent domainEvent, string? expectedCorrelationId)
    {
        Assert.Equal(expectedCorrelationId, domainEvent.CorrelationId);
    }

    /// <summary>
    /// Asserts that a domain event has the specified causation ID.
    /// </summary>
    public static void ShouldHaveCausationId(this IDomainEvent domainEvent, string? expectedCausationId)
    {
        Assert.Equal(expectedCausationId, domainEvent.CausationId);
    }

    /// <summary>
    /// Asserts that a domain event occurred within the specified time range.
    /// </summary>
    public static void ShouldHaveOccurredAround(this IDomainEvent domainEvent, DateTimeOffset expectedTime, TimeSpan tolerance)
    {
        var timeDifference = Math.Abs((domainEvent.OccurredAt - expectedTime).TotalMilliseconds);
        Assert.True(timeDifference <= tolerance.TotalMilliseconds,
            $"Event occurred at {domainEvent.OccurredAt} but expected around {expectedTime} (±{tolerance})");
    }

    /// <summary>
    /// Asserts that a domain event occurred recently (within the last 5 seconds).
    /// </summary>
    public static void ShouldHaveOccurredRecently(this IDomainEvent domainEvent)
    {
        domainEvent.ShouldHaveOccurredAround(DateTimeOffset.UtcNow, TimeSpan.FromSeconds(5));
    }

    /// <summary>
    /// Asserts that a domain event has metadata with the specified key and value.
    /// </summary>
    public static void ShouldHaveMetadata(this IDomainEvent domainEvent, string key, object expectedValue)
    {
        Assert.True(domainEvent.Metadata.ContainsKey(key), $"Event metadata does not contain key: {key}");
        Assert.Equal(expectedValue, domainEvent.Metadata[key]);
    }

    /// <summary>
    /// Asserts that two value objects are equal.
    /// </summary>
    public static void ShouldBeEqualTo<T>(this T actual, T expected)
        where T : class
    {
        Assert.Equal(expected, actual);
    }

    /// <summary>
    /// Asserts that two value objects are not equal.
    /// </summary>
    public static void ShouldNotBeEqualTo<T>(this T actual, T expected)
        where T : class
    {
        Assert.NotEqual(expected, actual);
    }

    /// <summary>
    /// Asserts that a collection contains the specified item.
    /// </summary>
    public static void ShouldContain<T>(this IEnumerable<T> collection, T item)
    {
        Assert.Contains(item, collection);
    }

    /// <summary>
    /// Asserts that a collection does not contain the specified item.
    /// </summary>
    public static void ShouldNotContain<T>(this IEnumerable<T> collection, T item)
    {
        Assert.DoesNotContain(item, collection);
    }

    /// <summary>
    /// Asserts that a collection has the specified count.
    /// </summary>
    public static void ShouldHaveCount<T>(this IEnumerable<T> collection, int expectedCount)
    {
        Assert.Equal(expectedCount, collection.Count());
    }

    /// <summary>
    /// Asserts that a collection is empty.
    /// </summary>
    public static void ShouldBeEmpty<T>(this IEnumerable<T> collection)
    {
        Assert.Empty(collection);
    }

    /// <summary>
    /// Asserts that a collection is not empty.
    /// </summary>
    public static void ShouldNotBeEmpty<T>(this IEnumerable<T> collection)
    {
        Assert.NotEmpty(collection);
    }
}