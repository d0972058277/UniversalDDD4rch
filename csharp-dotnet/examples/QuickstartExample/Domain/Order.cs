using System;
using Architecture.Core.Domain.Aggregates;
using Architecture.Core.Functional;
using QuickstartExample.Domain.Events;

namespace QuickstartExample.Domain;

public class Order : AggregateRoot<string>
{
    public CustomerId CustomerId { get; private set; }
    public Money TotalAmount { get; private set; }
    public OrderStatus Status { get; private set; }
    public DateTime CreatedAt { get; private set; }

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

        AddEvent(new OrderCreatedEvent(Id, CustomerId, TotalAmount.Amount, correlationId));
    }

    public Result ConfirmOrder()
    {
        if (Status != OrderStatus.Pending)
            return Error.Domain("Order.InvalidStatus", $"Cannot confirm order in {Status} status");

        var previousStatus = Status;
        Status = OrderStatus.Confirmed;

        AddEvent(new OrderStatusChangedEvent(Id, previousStatus.ToString(), Status.ToString()));
        return Result.Ok();
    }

    public Result CancelOrder()
    {
        if (Status == OrderStatus.Shipped || Status == OrderStatus.Delivered)
            return Error.Domain("Order.CannotCancel", $"Cannot cancel order in {Status} status");

        var previousStatus = Status;
        Status = OrderStatus.Cancelled;

        AddEvent(new OrderStatusChangedEvent(Id, previousStatus.ToString(), Status.ToString()));
        return Result.Ok();
    }

    public Result ShipOrder()
    {
        if (Status != OrderStatus.Confirmed)
            return Error.Domain("Order.InvalidStatus", $"Cannot ship order in {Status} status");

        var previousStatus = Status;
        Status = OrderStatus.Shipped;

        AddEvent(new OrderStatusChangedEvent(Id, previousStatus.ToString(), Status.ToString()));
        return Result.Ok();
    }

    public Result DeliverOrder()
    {
        if (Status != OrderStatus.Shipped)
            return Error.Domain("Order.InvalidStatus", $"Cannot deliver order in {Status} status");

        var previousStatus = Status;
        Status = OrderStatus.Delivered;

        AddEvent(new OrderStatusChangedEvent(Id, previousStatus.ToString(), Status.ToString()));
        return Result.Ok();
    }
}