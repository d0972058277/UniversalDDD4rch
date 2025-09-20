using System;
using System.Collections.Generic;
using System.Linq;
using Architecture.Core.Domain.Aggregates;
using Architecture.Core.Domain.Events;
using Architecture.Core.Domain.ValueObjects;
using Architecture.Core.Functional;

namespace Architecture.Core.Tests.TestDomain;

// Shared test domain models used across integration tests

public class Money : ValueObject
{
    public decimal Amount { get; }
    public string Currency { get; }

    public Money(decimal amount, string currency)
    {
        Amount = amount;
        Currency = currency ?? throw new ArgumentNullException(nameof(currency));
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Amount;
        yield return Currency;
    }
}

public class CustomerId : ValueObject
{
    public string Value { get; }

    public CustomerId(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("Customer ID cannot be empty", nameof(value));
        Value = value;
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Value;
    }

    public static implicit operator string(CustomerId customerId) => customerId.Value;
    public static implicit operator CustomerId(string value) => new(value);
}

public enum OrderStatus
{
    Pending,
    Confirmed,
    Shipped,
    Delivered,
    Cancelled
}

public class Order : AggregateRoot<string>
{
    public CustomerId CustomerId { get; private set; }
    public Money TotalAmount { get; private set; }
    public OrderStatus Status { get; private set; }
    public DateTime CreatedAt { get; private set; }
    private readonly string? _correlationId;

    private Order() : base(string.Empty)
    {
        CustomerId = new CustomerId("temp");
        TotalAmount = new Money(0, "USD");
        Status = OrderStatus.Pending;
        CreatedAt = DateTime.UtcNow;
    } // For persistence

    public Order(CustomerId customerId, Money totalAmount, string? correlationId = null)
        : base(Guid.NewGuid().ToString())
    {
        CustomerId = customerId;
        TotalAmount = totalAmount;
        Status = OrderStatus.Pending;
        CreatedAt = DateTime.UtcNow;
        _correlationId = correlationId;

        AddEvent(new OrderCreatedEvent(Id, CustomerId, TotalAmount.Amount, correlationId));
    }

    public Result ConfirmOrder()
    {
        if (Status != OrderStatus.Pending)
            return Error.Domain("Order.InvalidStatus", $"Cannot confirm order in {Status} status");

        var previousStatus = Status;
        Status = OrderStatus.Confirmed;

        AddEvent(new OrderStatusChangedEvent(Id, previousStatus.ToString(), Status.ToString(), _correlationId));
        return Result.Ok();
    }

    public Result CancelOrder()
    {
        if (Status == OrderStatus.Shipped || Status == OrderStatus.Delivered)
            return Error.Domain("Order.CannotCancel", $"Cannot cancel order in {Status} status");

        var previousStatus = Status;
        Status = OrderStatus.Cancelled;

        AddEvent(new OrderStatusChangedEvent(Id, previousStatus.ToString(), Status.ToString(), _correlationId));
        return Result.Ok();
    }

    public Result ShipOrder()
    {
        if (Status != OrderStatus.Confirmed)
            return Error.Domain("Order.InvalidStatus", $"Cannot ship order in {Status} status");

        var previousStatus = Status;
        Status = OrderStatus.Shipped;

        AddEvent(new OrderStatusChangedEvent(Id, previousStatus.ToString(), Status.ToString(), _correlationId));
        return Result.Ok();
    }
}

public class OrderCreatedEvent : DomainEventBase
{
    public string OrderId { get; }
    public string CustomerId { get; }
    public decimal TotalAmount { get; }

    public OrderCreatedEvent(string orderId, string customerId, decimal totalAmount,
        string? correlationId = null, string? causationId = null)
        : base(correlationId, causationId)
    {
        OrderId = orderId;
        CustomerId = customerId;
        TotalAmount = totalAmount;
    }
}

public class OrderStatusChangedEvent : DomainEventBase
{
    public string OrderId { get; }
    public string PreviousStatus { get; }
    public string NewStatus { get; }

    public OrderStatusChangedEvent(string orderId, string previousStatus, string newStatus,
        string? correlationId = null, string? causationId = null)
        : base(correlationId, causationId)
    {
        OrderId = orderId;
        PreviousStatus = previousStatus;
        NewStatus = newStatus;
    }
}