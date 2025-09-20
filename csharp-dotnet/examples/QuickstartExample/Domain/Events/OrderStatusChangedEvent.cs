using System.Collections.Generic;
using Architecture.Core.Domain.Events;

namespace QuickstartExample.Domain.Events;

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