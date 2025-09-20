# Quickstart Guide: Architecture.Core

This guide demonstrates how to use Architecture.Core abstractions and functional types in a simple domain model.

## Setup

```bash
# Clone repository
git clone https://github.com/your-org/UniversalDDD4rch.git
cd UniversalDDD4rch

# Create new console app for testing
dotnet new console -n QuickstartExample
cd QuickstartExample

# Add reference to Architecture.Core (when implemented)
dotnet add reference ../src/Architecture.Core/Architecture.Core.csproj

# Run the example
dotnet run
```

## Example Domain: Order Management

### 1. Create Value Objects

```csharp
using Architecture.Core;

// Money value object with currency support
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

// Customer ID as a strongly-typed identifier
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
```

### 2. Create Domain Events

```csharp
// Order created event
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

// Order status changed event
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
```

### 3. Create Aggregate Root

```csharp
// Order aggregate with business rules
public class Order : AggregateRoot<CustomerId>
{
    public CustomerId CustomerId { get; private set; }
    public Money TotalAmount { get; private set; }
    public OrderStatus Status { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private Order() { } // For persistence

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
}

public enum OrderStatus
{
    Pending,
    Confirmed,
    Shipped,
    Delivered,
    Cancelled
}
```

### 4. Create Repository Interface

```csharp
// Order repository interface
public interface IOrderRepository : IRepository<Order, CustomerId>
{
    Task<Maybe<Order>> GetByCustomerIdAsync(CustomerId customerId, CancellationToken cancellationToken = default);
    Task<Result<IEnumerable<Order>>> GetOrdersByStatusAsync(OrderStatus status, CancellationToken cancellationToken = default);
}
```

### 5. Demonstrate Usage

```csharp
using Architecture.Core;

class Program
{
    static async Task Main(string[] args)
    {
        // Example 1: Creating and working with value objects
        Console.WriteLine("=== Value Objects Example ===");

        var money1 = new Money(100.50m, "USD");
        var money2 = new Money(100.50m, "USD");
        var money3 = new Money(100.50m, "EUR");

        Console.WriteLine($"money1 == money2: {money1 == money2}"); // True
        Console.WriteLine($"money1 == money3: {money1 == money3}"); // False

        // Example 2: Creating aggregates and handling events
        Console.WriteLine("\n=== Aggregate and Events Example ===");

        var customerId = new CustomerId("CUST-001");
        var totalAmount = new Money(150.75m, "USD");
        var order = new Order(customerId, totalAmount, "correlation-123");

        Console.WriteLine($"Order created: {order.Id}");
        Console.WriteLine($"Events count: {order.Events.Count}");

        // Example 3: Functional error handling
        Console.WriteLine("\n=== Functional Error Handling ===");

        var confirmResult = order.ConfirmOrder();
        confirmResult.Match(
            onSuccess: () => Console.WriteLine("Order confirmed successfully"),
            onFailure: error => Console.WriteLine($"Failed to confirm: {error.Message}")
        );

        var cancelResult = order.CancelOrder();
        cancelResult.Match(
            onSuccess: () => Console.WriteLine("Order cancelled successfully"),
            onFailure: error => Console.WriteLine($"Failed to cancel: {error.Message}")
        );

        // Example 4: Maybe type usage
        Console.WriteLine("\n=== Maybe Type Example ===");

        var maybeOrder = FindOrderById("ORDER-123"); // Returns Maybe<Order>

        var result = maybeOrder
            .Map(o => o.TotalAmount)
            .Map(amount => $"Order total: {amount.Amount} {amount.Currency}")
            .OrElse("Order not found");

        Console.WriteLine(result);

        // Example 5: Chaining operations
        Console.WriteLine("\n=== Operation Chaining Example ===");

        var processResult = await ProcessOrderAsync(order);
        processResult.Match(
            onSuccess: orderId => Console.WriteLine($"Order {orderId} processed successfully"),
            onFailure: error => Console.WriteLine($"Processing failed: {error.Message}")
        );
    }

    static Maybe<Order> FindOrderById(string orderId)
    {
        // Simulate database lookup that might not find the order
        return Maybe<Order>.None();
    }

    static async Task<Result<string>> ProcessOrderAsync(Order order)
    {
        try
        {
            // Simulate async processing
            await Task.Delay(100);

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

    static Result ValidateOrder(Order order)
    {
        if (order.TotalAmount.Amount <= 0)
            return Error.Validation("Order.InvalidAmount", "Order amount must be positive");

        if (string.IsNullOrEmpty(order.CustomerId))
            return Error.Validation("Order.MissingCustomer", "Order must have a customer");

        return Result.Ok();
    }
}
```

## Expected Output

```
=== Value Objects Example ===
money1 == money2: True
money1 == money3: False

=== Aggregate and Events Example ===
Order created: <generated-guid>
Events count: 1

=== Functional Error Handling ===
Order confirmed successfully
Failed to cancel: Cannot cancel order in Confirmed status

=== Maybe Type Example ===
Order not found

=== Operation Chaining Example ===
Order <order-id> processed successfully
```

## Key Concepts Demonstrated

1. **Value Objects**: Immutable objects with structural equality
2. **Aggregate Roots**: Entity lifecycle management with domain events
3. **Domain Events**: Event-driven architecture with correlation tracking
4. **Functional Error Handling**: Result and Maybe types for safe operations
5. **Repository Pattern**: Data access abstraction with async operations
6. **Method Chaining**: Monadic operations for clean error handling

## Next Steps

1. Implement the Repository pattern with Entity Framework
2. Add domain services for complex business logic
3. Integrate with MediatR for command/query handling
4. Set up event publishing and handling infrastructure
5. Add comprehensive logging and monitoring

## Testing

```csharp
[Test]
public void Should_CreateOrder_When_ValidDataProvided()
{
    // Given
    var customerId = new CustomerId("CUST-001");
    var amount = new Money(100m, "USD");

    // When
    var order = new Order(customerId, amount);

    // Then
    Assert.That(order.CustomerId, Is.EqualTo(customerId));
    Assert.That(order.TotalAmount, Is.EqualTo(amount));
    Assert.That(order.Status, Is.EqualTo(OrderStatus.Pending));
    Assert.That(order.Events.Count, Is.EqualTo(1));
    Assert.That(order.Events.First(), Is.TypeOf<OrderCreatedEvent>());
}
```

This quickstart demonstrates the core patterns and shows how Architecture.Core enables clean, testable, and maintainable domain-driven code.