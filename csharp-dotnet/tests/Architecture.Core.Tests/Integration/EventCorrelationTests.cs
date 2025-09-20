using System;
using System.Collections.Generic;
using System.Linq;
using Xunit;
using Architecture.Core.Domain.Aggregates;
using Architecture.Core.Domain.Events;
using Architecture.Core.Tests.TestDomain;

namespace Architecture.Core.Tests.Integration;

public class EventCorrelationTests
{
    [Fact]
    public void Should_TrackCorrelationAcrossEventChain_When_MultipleEventsRaised()
    {
        // Given
        var correlationId = "correlation-123";
        var aggregate = new TestOrderAggregate("order-1", correlationId);

        // When
        aggregate.ConfirmOrder();
        aggregate.ShipOrder();
        aggregate.DeliverOrder();

        // Then
        var events = aggregate.Events.ToList();
        Assert.Equal(4, events.Count); // Created + Confirmed + Shipped + Delivered

        // All events should maintain the same correlation ID
        Assert.All(events, e => Assert.Equal(correlationId, e.CorrelationId));
    }

    [Fact]
    public void Should_LinkCausationBetweenEvents_When_EventsCausedByPrevious()
    {
        // Given
        var aggregate = new TestOrderAggregate("order-1");

        // When
        aggregate.ConfirmOrder(); // This should be caused by the creation event
        var events = aggregate.Events.ToList();

        // Then
        Assert.Equal(2, events.Count);
        var createdEvent = events[0];
        var confirmedEvent = events[1];

        // The confirmed event should reference the created event as its cause
        Assert.Equal(createdEvent.Id.ToString(), confirmedEvent.CausationId);
    }

    [Fact]
    public void Should_MaintainEventChainIntegrity_When_ComplexWorkflowExecuted()
    {
        // Given
        var originalCorrelationId = "user-request-456";
        var order1 = new TestOrderAggregate("order-1", originalCorrelationId);
        var order2 = new TestOrderAggregate("order-2", originalCorrelationId);

        // When - Simulate complex workflow
        order1.ConfirmOrder();
        var order1ConfirmedEvent = order1.Events.Last();

        // Order 2 processing caused by Order 1 confirmation
        order2.ConfirmOrder(order1ConfirmedEvent.Id.ToString());
        order2.ShipOrder();

        // Then
        var order1Events = order1.Events.ToList();
        var order2Events = order2.Events.ToList();

        // Both aggregates should maintain the same correlation ID
        Assert.All(order1Events, e => Assert.Equal(originalCorrelationId, e.CorrelationId));
        Assert.All(order2Events, e => Assert.Equal(originalCorrelationId, e.CorrelationId));

        // Order 2's confirmed event should be caused by Order 1's confirmed event
        var order2ConfirmedEvent = order2Events.FirstOrDefault(e => e is OrderConfirmedEvent);
        Assert.NotNull(order2ConfirmedEvent);
        Assert.Equal(order1ConfirmedEvent.Id.ToString(), order2ConfirmedEvent.CausationId);
    }

    [Fact]
    public void Should_PreserveMetadataAcrossEventChain_When_MetadataProvided()
    {
        // Given
        var initialMetadata = new Dictionary<string, object>
        {
            { "userId", "user-123" },
            { "sessionId", "session-456" },
            { "requestSource", "mobile-app" }
        };
        var aggregate = new TestOrderAggregate("order-1", "correlation-123", initialMetadata);

        // When
        aggregate.ConfirmOrder();
        aggregate.ShipOrder();

        // Then
        var events = aggregate.Events.ToList();

        // Check that key metadata is preserved across events
        Assert.All(events, e =>
        {
            Assert.True(e.Metadata.ContainsKey("userId"));
            Assert.Equal("user-123", e.Metadata["userId"]);
        });
    }

    [Fact]
    public void Should_GenerateUniqueEventIds_When_MultipleEventsCreated()
    {
        // Given
        var aggregate = new TestOrderAggregate("order-1");

        // When
        aggregate.ConfirmOrder();
        aggregate.ShipOrder();
        aggregate.DeliverOrder();

        // Then
        var events = aggregate.Events.ToList();
        var eventIds = events.Select(e => e.Id).ToList();

        // All event IDs should be unique
        Assert.Equal(eventIds.Count, eventIds.Distinct().Count());
        Assert.All(eventIds, id => Assert.NotEqual(Guid.Empty, id));
    }

    [Fact]
    public void Should_TimestampEventsCorrectly_When_EventsRaisedOverTime()
    {
        // Given
        var aggregate = new TestOrderAggregate("order-1");
        var startTime = DateTimeOffset.UtcNow;

        // When
        aggregate.ConfirmOrder();
        System.Threading.Thread.Sleep(10); // Small delay
        aggregate.ShipOrder();
        System.Threading.Thread.Sleep(10); // Small delay
        aggregate.DeliverOrder();

        var endTime = DateTimeOffset.UtcNow;

        // Then
        var events = aggregate.Events.ToList();

        // All events should be timestamped within our test window
        Assert.All(events, e =>
        {
            Assert.True(e.OccurredAt >= startTime);
            Assert.True(e.OccurredAt <= endTime);
        });

        // Events should be in chronological order
        for (int i = 1; i < events.Count; i++)
        {
            Assert.True(events[i].OccurredAt >= events[i - 1].OccurredAt);
        }
    }

    [Fact]
    public void Should_SupportEventCorrelationAcrossAggregates_When_CrossAggregateWorkflow()
    {
        // Given
        var workflowCorrelationId = "workflow-789";
        var orderAggregate = new TestOrderAggregate("order-1", workflowCorrelationId);
        var paymentAggregate = new TestPaymentAggregate("payment-1", workflowCorrelationId);

        // When
        orderAggregate.ConfirmOrder();
        var orderConfirmedEvent = orderAggregate.Events.Last();

        // Payment processing triggered by order confirmation
        paymentAggregate.ProcessPayment(orderConfirmedEvent.Id.ToString());

        // Then
        var orderEvents = orderAggregate.Events.ToList();
        var paymentEvents = paymentAggregate.Events.ToList();

        // Both aggregates share the same correlation ID
        Assert.All(orderEvents, e => Assert.Equal(workflowCorrelationId, e.CorrelationId));
        Assert.All(paymentEvents, e => Assert.Equal(workflowCorrelationId, e.CorrelationId));

        // Payment event is caused by order event
        var paymentProcessedEvent = paymentEvents.FirstOrDefault(e => e is PaymentProcessedEvent);
        Assert.NotNull(paymentProcessedEvent);
        Assert.Equal(orderConfirmedEvent.Id.ToString(), paymentProcessedEvent.CausationId);
    }

    [Fact]
    public void Should_HandleEventMetadataEvolution_When_MetadataChangesOverTime()
    {
        // Given
        var aggregate = new TestOrderAggregate("order-1");

        // When
        aggregate.ConfirmOrder();

        // Simulate adding new metadata for subsequent events
        var additionalMetadata = new Dictionary<string, object>
        {
            { "processedBy", "system-automation" },
            { "priority", "high" }
        };
        aggregate.ShipOrder(additionalMetadata: additionalMetadata);

        // Then
        var events = aggregate.Events.ToList();
        var confirmedEvent = events.FirstOrDefault(e => e is OrderConfirmedEvent);
        var shippedEvent = events.FirstOrDefault(e => e is OrderShippedEvent);

        Assert.NotNull(confirmedEvent);
        Assert.NotNull(shippedEvent);

        // Confirmed event shouldn't have the additional metadata
        Assert.False(confirmedEvent.Metadata.ContainsKey("processedBy"));

        // Shipped event should have the additional metadata
        Assert.True(shippedEvent.Metadata.ContainsKey("processedBy"));
        Assert.Equal("system-automation", shippedEvent.Metadata["processedBy"]);
    }
}

// Test aggregates and events for correlation testing
public class TestOrderAggregate : AggregateRoot<string>
{
    public CorrelationOrderStatus Status { get; private set; }
    private readonly string? _correlationId;
    private readonly Dictionary<string, object>? _baseMetadata;
    private IDomainEvent? _lastEvent;

    public TestOrderAggregate(string id, string? correlationId = null, Dictionary<string, object>? metadata = null)
        : base(id)
    {
        Status = CorrelationOrderStatus.Created;
        _correlationId = correlationId;
        _baseMetadata = metadata;

        var createdEvent = new OrderCreatedEvent(id, correlationId, metadata);
        AddEvent(createdEvent);
        _lastEvent = createdEvent;
    }

    public void ConfirmOrder(string? causationId = null)
    {
        if (Status != CorrelationOrderStatus.Created) return;

        Status = CorrelationOrderStatus.Confirmed;
        var confirmedEvent = new OrderConfirmedEvent(Id, _correlationId, causationId ?? _lastEvent?.Id.ToString(), _baseMetadata);
        AddEvent(confirmedEvent);
        _lastEvent = confirmedEvent;
    }

    public void ShipOrder(Dictionary<string, object>? additionalMetadata = null)
    {
        if (Status != CorrelationOrderStatus.Confirmed) return;

        Status = CorrelationOrderStatus.Shipped;
        var metadata = CombineMetadata(_baseMetadata, additionalMetadata);
        var shippedEvent = new OrderShippedEvent(Id, _correlationId, _lastEvent?.Id.ToString(), metadata);
        AddEvent(shippedEvent);
        _lastEvent = shippedEvent;
    }

    public void DeliverOrder()
    {
        if (Status != CorrelationOrderStatus.Shipped) return;

        Status = CorrelationOrderStatus.Delivered;
        var deliveredEvent = new OrderDeliveredEvent(Id, _correlationId, _lastEvent?.Id.ToString(), _baseMetadata);
        AddEvent(deliveredEvent);
        _lastEvent = deliveredEvent;
    }

    private static Dictionary<string, object>? CombineMetadata(
        Dictionary<string, object>? baseMetadata,
        Dictionary<string, object>? additionalMetadata)
    {
        if (baseMetadata == null && additionalMetadata == null) return null;

        var combined = new Dictionary<string, object>();

        if (baseMetadata != null)
        {
            foreach (var kvp in baseMetadata)
                combined[kvp.Key] = kvp.Value;
        }

        if (additionalMetadata != null)
        {
            foreach (var kvp in additionalMetadata)
                combined[kvp.Key] = kvp.Value;
        }

        return combined;
    }
}

public class TestPaymentAggregate : AggregateRoot<string>
{
    public PaymentStatus Status { get; private set; }
    private readonly string? _correlationId;

    public TestPaymentAggregate(string id, string? correlationId = null) : base(id)
    {
        Status = PaymentStatus.Pending;
        _correlationId = correlationId;

        AddEvent(new PaymentCreatedEvent(id, correlationId));
    }

    public void ProcessPayment(string causationId)
    {
        if (Status != PaymentStatus.Pending) return;

        Status = PaymentStatus.Processed;
        AddEvent(new PaymentProcessedEvent(Id, _correlationId, causationId));
    }
}

public enum CorrelationOrderStatus { Created, Confirmed, Shipped, Delivered }
public enum PaymentStatus { Pending, Processed, Failed }

// Test events for correlation scenarios
public class OrderCreatedEvent : DomainEventBase
{
    public string OrderId { get; }

    public OrderCreatedEvent(string orderId, string? correlationId = null, IDictionary<string, object>? metadata = null)
        : base(correlationId, null, metadata)
    {
        OrderId = orderId;
    }
}

public class OrderConfirmedEvent : DomainEventBase
{
    public string OrderId { get; }

    public OrderConfirmedEvent(string orderId, string? correlationId = null, string? causationId = null, IDictionary<string, object>? metadata = null)
        : base(correlationId, causationId, metadata)
    {
        OrderId = orderId;
    }
}

public class OrderShippedEvent : DomainEventBase
{
    public string OrderId { get; }

    public OrderShippedEvent(string orderId, string? correlationId = null, string? causationId = null, IDictionary<string, object>? metadata = null)
        : base(correlationId, causationId, metadata)
    {
        OrderId = orderId;
    }
}

public class OrderDeliveredEvent : DomainEventBase
{
    public string OrderId { get; }

    public OrderDeliveredEvent(string orderId, string? correlationId = null, string? causationId = null, IDictionary<string, object>? metadata = null)
        : base(correlationId, causationId, metadata)
    {
        OrderId = orderId;
    }
}

public class PaymentCreatedEvent : DomainEventBase
{
    public string PaymentId { get; }

    public PaymentCreatedEvent(string paymentId, string? correlationId = null, string? causationId = null)
        : base(correlationId, causationId)
    {
        PaymentId = paymentId;
    }
}

public class PaymentProcessedEvent : DomainEventBase
{
    public string PaymentId { get; }

    public PaymentProcessedEvent(string paymentId, string? correlationId = null, string? causationId = null)
        : base(correlationId, causationId)
    {
        PaymentId = paymentId;
    }
}