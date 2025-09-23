using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit;
using Architecture.Core.Domain.Aggregates;
using Architecture.Core.Domain.Events;
using Architecture.Core.Domain.ValueObjects;
using Architecture.Core.Functional;
using TestDomain = Architecture.Core.Tests.TestDomain;

namespace Architecture.Core.Tests.Integration;

public class QuickstartScenarioTests
{
    [Fact]
    public void Should_CreateOrderWithEvents_When_ValidOrderDataProvided()
    {
        // Given
        var customerId = new TestDomain.CustomerId("CUST-001");
        var totalAmount = new TestDomain.Money(150.75m, "USD");
        var correlationId = "correlation-123";

        // When
        var order = new TestDomain.Order(customerId, totalAmount, correlationId);

        // Then
        Assert.Equal(customerId, order.CustomerId);
        Assert.Equal(totalAmount, order.TotalAmount);
        Assert.Equal(TestDomain.OrderStatus.Pending, order.Status);
        Assert.Single(order.Events);

        var createdEvent = order.Events.First() as TestDomain.OrderCreatedEvent;
        Assert.NotNull(createdEvent);
        Assert.Equal(order.Id, createdEvent.OrderId);
        Assert.Equal(customerId.Value, createdEvent.CustomerId);
        Assert.Equal(totalAmount.Amount, createdEvent.TotalAmount);
        Assert.Equal(correlationId, createdEvent.CorrelationId);
    }

    [Fact]
    public void Should_ConfirmOrder_When_OrderInPendingStatus()
    {
        // Given
        var order = new TestDomain.Order(new TestDomain.CustomerId("CUST-001"), new TestDomain.Money(100m, "USD"));
        var initialEventCount = order.Events.Count;

        // When
        var result = order.ConfirmOrder();

        // Then
        Assert.True(result.IsSuccess);
        Assert.Equal(TestDomain.OrderStatus.Confirmed, order.Status);
        Assert.Equal(initialEventCount + 1, order.Events.Count);

        var statusChangedEvent = order.Events.Last() as TestDomain.OrderStatusChangedEvent;
        Assert.NotNull(statusChangedEvent);
        Assert.Equal(order.Id, statusChangedEvent.OrderId);
        Assert.Equal(TestDomain.OrderStatus.Pending.ToString(), statusChangedEvent.PreviousStatus);
        Assert.Equal(TestDomain.OrderStatus.Confirmed.ToString(), statusChangedEvent.NewStatus);
    }

    [Fact]
    public void Should_FailToConfirm_When_OrderIsNotInPendingStatus()
    {
        // Given
        var order = new TestDomain.Order(new TestDomain.CustomerId("CUST-001"), new TestDomain.Money(100m, "USD"));
        order.ConfirmOrder(); // Move to Confirmed status
        var initialEventCount = order.Events.Count;

        // When
        var result = order.ConfirmOrder();

        // Then
        Assert.True(result.IsFailure);
        Assert.Equal("Order.InvalidStatus", result.Error.Code);
        Assert.Equal(TestDomain.OrderStatus.Confirmed, order.Status); // Status unchanged
        Assert.Equal(initialEventCount, order.Events.Count); // No new events
    }

    [Fact]
    public void Should_CancelOrder_When_OrderInValidStatus()
    {
        // Given
        var order = new TestDomain.Order(new TestDomain.CustomerId("CUST-001"), new TestDomain.Money(100m, "USD"));
        var initialEventCount = order.Events.Count;

        // When
        var result = order.CancelOrder();

        // Then
        Assert.True(result.IsSuccess);
        Assert.Equal(TestDomain.OrderStatus.Cancelled, order.Status);
        Assert.Equal(initialEventCount + 1, order.Events.Count);

        var statusChangedEvent = order.Events.Last() as TestDomain.OrderStatusChangedEvent;
        Assert.NotNull(statusChangedEvent);
        Assert.Equal(order.Id, statusChangedEvent.OrderId);
        Assert.Equal(TestDomain.OrderStatus.Pending.ToString(), statusChangedEvent.PreviousStatus);
        Assert.Equal(TestDomain.OrderStatus.Cancelled.ToString(), statusChangedEvent.NewStatus);
    }

    [Fact]
    public void Should_FailToCancelOrder_When_OrderIsShipped()
    {
        // Given
        var order = new TestDomain.Order(new TestDomain.CustomerId("CUST-001"), new TestDomain.Money(100m, "USD"));
        order.ConfirmOrder();
        order.ShipOrder();
        var initialEventCount = order.Events.Count;

        // When
        var result = order.CancelOrder();

        // Then
        Assert.True(result.IsFailure);
        Assert.Equal("Order.CannotCancel", result.Error.Code);
        Assert.Equal(TestDomain.OrderStatus.Shipped, order.Status); // Status unchanged
        Assert.Equal(initialEventCount, order.Events.Count); // No new events
    }

    [Fact]
    public async Task Should_ProcessOrderAsync_When_ValidOrderProvided()
    {
        // Given
        var order = new TestDomain.Order(new TestDomain.CustomerId("CUST-001"), new TestDomain.Money(150.75m, "USD"));

        // When
        var result = await ProcessOrderAsync(order);

        // Then
        Assert.True(result.IsSuccess);
        Assert.Equal(order.Id, result.Value);
        Assert.Equal(TestDomain.OrderStatus.Confirmed, order.Status);
    }

    [Fact]
    public async Task Should_FailProcessing_When_OrderHasInvalidAmount()
    {
        // Given
        var order = new TestDomain.Order(new TestDomain.CustomerId("CUST-001"), new TestDomain.Money(-10m, "USD")); // Invalid amount

        // When
        var result = await ProcessOrderAsync(order);

        // Then
        Assert.True(result.IsFailure);
        Assert.Equal("Order.InvalidAmount", result.Error.Code);
        Assert.Equal(TestDomain.OrderStatus.Pending, order.Status); // Status unchanged
    }

    [Fact]
    public void Should_DemonstrateValueObjectEquality_When_ComparingMoneyInstances()
    {
        // Given
        var money1 = new TestDomain.Money(100.50m, "USD");
        var money2 = new TestDomain.Money(100.50m, "USD");
        var money3 = new TestDomain.Money(100.50m, "EUR");

        // When & Then
        Assert.Equal(money1, money2);
        Assert.True(money1 == money2);
        Assert.False(money1 == money3);
        Assert.Equal(money1.GetHashCode(), money2.GetHashCode());
        Assert.NotEqual(money1.GetHashCode(), money3.GetHashCode());
    }

    [Fact]
    public void Should_DemonstrateCustomerIdImplicitConversion_When_UsingStringOperations()
    {
        // Given
        TestDomain.CustomerId customerId = "CUST-001"; // Implicit conversion from string
        string customerIdString = customerId; // Implicit conversion to string

        // When & Then
        Assert.Equal("CUST-001", customerId.Value);
        Assert.Equal("CUST-001", customerIdString);
    }

    [Fact]
    public void Should_ChainMaybeOperations_When_UsingFunctionalStyle()
    {
        // Given
        var order = new TestDomain.Order(new TestDomain.CustomerId("CUST-001"), new TestDomain.Money(150.75m, "USD"));
        var maybeOrder = Maybe<TestDomain.Order>.Some(order);
        var emptyMaybe = Maybe<TestDomain.Order>.None();

        // When
        var result1 = maybeOrder
            .Map(o => o.TotalAmount)
            .Map(amount => $"Order total: {amount.Amount} {amount.Currency}")
            .OrElse("Order not found");

        var result2 = emptyMaybe
            .Map(o => o.TotalAmount)
            .Map(amount => $"Order total: {amount.Amount} {amount.Currency}")
            .OrElse("Order not found");

        // Then
        Assert.Equal("Order total: 150.75 USD", result1);
        Assert.Equal("Order not found", result2);
    }

    [Fact]
    public void Should_MaintainEventCorrelation_When_ProcessingMultipleOperations()
    {
        // Given
        var correlationId = "test-correlation-123";
        var order = new TestDomain.Order(new TestDomain.CustomerId("CUST-001"), new TestDomain.Money(100m, "USD"), correlationId);

        // When
        order.ConfirmOrder();
        order.ShipOrder();

        // Then
        var events = order.Events.ToList();
        Assert.Equal(3, events.Count); // Created + Confirmed + Shipped

        // All events should maintain the same correlation ID
        Assert.All(events, e => Assert.Equal(correlationId, e.CorrelationId));
    }

    [Fact]
    public void Should_ValidateBusinessRules_When_CreatingOrder()
    {
        // Given & When & Then
        Assert.Throws<ArgumentException>(() => new TestDomain.CustomerId(""));
        Assert.Throws<ArgumentNullException>(() => new TestDomain.Money(100m, null!));

        // Valid construction should not throw
        var validOrder = new TestDomain.Order(new TestDomain.CustomerId("VALID-001"), new TestDomain.Money(50m, "USD"));
        Assert.NotNull(validOrder);
        Assert.Equal(TestDomain.OrderStatus.Pending, validOrder.Status);
    }

    // Helper methods for testing
    private static async Task<Result<string>> ProcessOrderAsync(TestDomain.Order order)
    {
        try
        {
            // Simulate async processing
            await Task.Delay(10).ConfigureAwait(false);

            var validateResult = ValidateOrder(order);
            if (validateResult.IsFailure)
                return validateResult.Error;

            var confirmResult = order.ConfirmOrder();
            if (confirmResult.IsFailure)
                return confirmResult.Error;

            return Result<string>.Ok(order.Id);
        }
        catch (InvalidOperationException ex)
        {
            return Error.Infrastructure("Order.ProcessingFailed", ex.Message);
        }
        catch (ArgumentException ex)
        {
            return Error.Validation("Order.ProcessingFailed", ex.Message);
        }
    }

    private static Result ValidateOrder(TestDomain.Order order)
    {
        if (order.TotalAmount.Amount <= 0)
            return Error.Validation("Order.InvalidAmount", "Order amount must be positive");

        if (string.IsNullOrEmpty(order.CustomerId))
            return Error.Validation("Order.MissingCustomer", "Order must have a customer");

        return Result.Ok();
    }
}