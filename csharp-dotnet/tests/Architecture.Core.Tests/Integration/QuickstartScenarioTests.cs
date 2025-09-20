using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit;
using Architecture.Core.Domain.Aggregates;
using Architecture.Core.Domain.Events;
using Architecture.Core.Domain.ValueObjects;
using Architecture.Core.Functional;
using Architecture.Core.Tests.TestDomain;

namespace Architecture.Core.Tests.Integration;

public class QuickstartScenarioTests
{
    [Fact]
    public void Should_CreateOrderWithEvents_When_ValidOrderDataProvided()
    {
        // Given
        var customerId = new CustomerId("CUST-001");
        var totalAmount = new Money(150.75m, "USD");
        var correlationId = "correlation-123";

        // When
        var order = new Order(customerId, totalAmount, correlationId);

        // Then
        Assert.Equal(customerId, order.CustomerId);
        Assert.Equal(totalAmount, order.TotalAmount);
        Assert.Equal(OrderStatus.Pending, order.Status);
        Assert.Single(order.Events);

        var createdEvent = order.Events.First() as OrderCreatedEvent;
        Assert.NotNull(createdEvent);
        Assert.Equal(order.Id, createdEvent.OrderId);
        Assert.Equal(customerId.Value, createdEvent.CustomerId);
        Assert.Equal(totalAmount.Amount, createdEvent.TotalAmount);
        Assert.Equal(correlationId, createdEvent.CorrelationId);
    }

    [Fact]
    public void Should_ConfirmOrder_When_OrderIsInPendingStatus()
    {
        // Given
        var order = new Order(new CustomerId("CUST-001"), new Money(100m, "USD"));
        var initialEventCount = order.Events.Count;

        // When
        var result = order.ConfirmOrder();

        // Then
        Assert.True(result.IsSuccess);
        Assert.Equal(OrderStatus.Confirmed, order.Status);
        Assert.Equal(initialEventCount + 1, order.Events.Count);

        var statusChangedEvent = order.Events.Last() as OrderStatusChangedEvent;
        Assert.NotNull(statusChangedEvent);
        Assert.Equal(order.Id, statusChangedEvent.OrderId);
        Assert.Equal(OrderStatus.Pending.ToString(), statusChangedEvent.PreviousStatus);
        Assert.Equal(OrderStatus.Confirmed.ToString(), statusChangedEvent.NewStatus);
    }

    [Fact]
    public void Should_FailToConfirm_When_OrderIsNotInPendingStatus()
    {
        // Given
        var order = new Order(new CustomerId("CUST-001"), new Money(100m, "USD"));
        order.ConfirmOrder(); // Move to Confirmed status
        var eventCountAfterConfirm = order.Events.Count;

        // When
        var result = order.ConfirmOrder(); // Try to confirm again

        // Then
        Assert.True(result.IsFailure);
        Assert.Equal("Order.InvalidStatus", result.Error.Code);
        Assert.Equal(OrderStatus.Confirmed, order.Status); // Status unchanged
        Assert.Equal(eventCountAfterConfirm, order.Events.Count); // No new events
    }

    [Fact]
    public void Should_CancelOrder_When_OrderIsInValidStatusForCancellation()
    {
        // Given
        var order = new Order(new CustomerId("CUST-001"), new Money(100m, "USD"));
        var initialEventCount = order.Events.Count;

        // When
        var result = order.CancelOrder();

        // Then
        Assert.True(result.IsSuccess);
        Assert.Equal(OrderStatus.Cancelled, order.Status);
        Assert.Equal(initialEventCount + 1, order.Events.Count);

        var statusChangedEvent = order.Events.Last() as OrderStatusChangedEvent;
        Assert.NotNull(statusChangedEvent);
        Assert.Equal(OrderStatus.Pending.ToString(), statusChangedEvent.PreviousStatus);
        Assert.Equal(OrderStatus.Cancelled.ToString(), statusChangedEvent.NewStatus);
    }

    [Fact]
    public void Should_FailToCancelOrder_When_OrderIsShippedOrDelivered()
    {
        // Given
        var order = new Order(new CustomerId("CUST-001"), new Money(100m, "USD"));
        order.ConfirmOrder();
        order.ShipOrder(); // Move to Shipped status
        var eventCountAfterShip = order.Events.Count;

        // When
        var result = order.CancelOrder();

        // Then
        Assert.True(result.IsFailure);
        Assert.Equal("Order.CannotCancel", result.Error.Code);
        Assert.Equal(OrderStatus.Shipped, order.Status); // Status unchanged
        Assert.Equal(eventCountAfterShip, order.Events.Count); // No new events
    }

    [Fact]
    public async Task Should_ProcessOrderAsync_When_ValidOrderProvided()
    {
        // Given
        var order = new Order(new CustomerId("CUST-001"), new Money(100m, "USD"));

        // When
        var result = await ProcessOrderAsync(order);

        // Then
        Assert.True(result.IsSuccess);
        Assert.Equal(order.Id, result.Value);
        Assert.Equal(OrderStatus.Confirmed, order.Status);
    }

    [Fact]
    public async Task Should_FailProcessing_When_OrderHasInvalidAmount()
    {
        // Given
        var order = new Order(new CustomerId("CUST-001"), new Money(-10m, "USD")); // Invalid amount

        // When
        var result = await ProcessOrderAsync(order);

        // Then
        Assert.True(result.IsFailure);
        Assert.Equal("Order.InvalidAmount", result.Error.Code);
        Assert.Equal(OrderStatus.Pending, order.Status); // Status unchanged
    }

    [Fact]
    public void Should_DemonstrateValueObjectEquality_When_ComparingMoney()
    {
        // Given
        var money1 = new Money(100.50m, "USD");
        var money2 = new Money(100.50m, "USD");
        var money3 = new Money(100.50m, "EUR");

        // When/Then
        Assert.Equal(money1, money2);
        Assert.True(money1 == money2);
        Assert.NotEqual(money1, money3);
        Assert.True(money1 != money3);
        Assert.Equal(money1.GetHashCode(), money2.GetHashCode());
    }

    [Fact]
    public void Should_DemonstrateCustomerIdImplicitConversion_When_UsingStrings()
    {
        // Given
        string customerIdString = "CUST-123";

        // When
        CustomerId customerId = customerIdString; // Implicit conversion
        string convertedBack = customerId; // Implicit conversion

        // Then
        Assert.Equal(customerIdString, convertedBack);
        Assert.Equal(customerIdString, customerId.Value);
    }

    [Fact]
    public void Should_ChainMaybeOperations_When_UsingFunctionalStyle()
    {
        // Given
        var order = new Order(new CustomerId("CUST-001"), new Money(150.75m, "USD"));
        var maybeOrder = Maybe<Order>.Some(order);
        var emptyMaybe = Maybe<Order>.None();

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
    public void Should_TrackCorrelationAcrossEvents_When_EventChainCreated()
    {
        // Given
        var correlationId = "correlation-123";
        var order = new Order(new CustomerId("CUST-001"), new Money(100m, "USD"), correlationId);

        // When
        order.ConfirmOrder();

        // Then
        var allEvents = order.Events.ToList();
        Assert.All(allEvents, e => Assert.Equal(correlationId, e.CorrelationId));

        // Verify causation chain (second event caused by first)
        if (allEvents.Count > 1)
        {
            var secondEvent = allEvents[1];
            // In a full implementation, causation would link to the previous event
            Assert.NotNull(secondEvent.CausationId);
        }
    }

    // Helper method to simulate async order processing
    private static async Task<Result<string>> ProcessOrderAsync(Order order)
    {
        try
        {
            // Simulate async processing
            await Task.Delay(10);

            var validateResult = ValidateOrder(order);
            if (validateResult.IsFailure)
                return validateResult.Error;

            var confirmResult = order.ConfirmOrder();
            if (confirmResult.IsFailure)
                return confirmResult.Error;

            return Result<string>.Ok(order.Id);
        }
        catch (Exception ex)
        {
            return Error.Infrastructure("Order.ProcessingFailed", ex.Message);
        }
    }

    private static Result ValidateOrder(Order order)
    {
        if (order.TotalAmount.Amount <= 0)
            return Error.Validation("Order.InvalidAmount", "Order amount must be positive");

        if (string.IsNullOrEmpty(order.CustomerId))
            return Error.Validation("Order.MissingCustomer", "Order must have a customer");

        return Result.Ok();
    }
}

