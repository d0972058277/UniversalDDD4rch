using System.Collections.Generic;
using Architecture.Core.Domain.Events;

namespace QuickstartExample.Domain.Events;

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