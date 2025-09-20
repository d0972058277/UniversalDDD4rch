using System;
using System.Linq;
using System.Threading.Tasks;
using Architecture.Core.Functional;
using QuickstartExample.Domain;

namespace QuickstartExample;

class Program
{
    static async Task Main(string[] args)
    {
        Console.WriteLine("=== Architecture.Core Quickstart Example ===\n");

        // Example 1: Creating and working with value objects
        Console.WriteLine("=== Value Objects Example ===");
        DemonstrateValueObjects();

        // Example 2: Creating aggregates and handling events
        Console.WriteLine("\n=== Aggregate and Events Example ===");
        DemonstrateAggregatesAndEvents();

        // Example 3: Functional error handling
        Console.WriteLine("\n=== Functional Error Handling ===");
        DemonstrateFunctionalErrorHandling();

        // Example 4: Maybe type usage
        Console.WriteLine("\n=== Maybe Type Example ===");
        DemonstrateMaybeTypes();

        // Example 5: Chaining operations
        Console.WriteLine("\n=== Operation Chaining Example ===");
        await DemonstrateOperationChaining().ConfigureAwait(false);

        Console.WriteLine("\n=== All examples completed successfully! ===");
    }

    static void DemonstrateValueObjects()
    {
        var money1 = new Money(100.50m, "USD");
        var money2 = new Money(100.50m, "USD");
        var money3 = new Money(100.50m, "EUR");

        Console.WriteLine($"money1 == money2: {money1 == money2}"); // True
        Console.WriteLine($"money1 == money3: {money1 == money3}"); // False
        Console.WriteLine($"money1.GetHashCode() == money2.GetHashCode(): {money1.GetHashCode() == money2.GetHashCode()}"); // True

        // CustomerId implicit conversion
        CustomerId customerId = "CUST-001";
        string customerIdString = customerId;
        Console.WriteLine($"CustomerId implicit conversion: {customerIdString}");
    }

    static void DemonstrateAggregatesAndEvents()
    {
        var customerId = new CustomerId("CUST-001");
        var totalAmount = new Money(150.75m, "USD");
        var order = new Order(customerId, totalAmount, "correlation-123");

        Console.WriteLine($"Order created: {order.Id}");
        Console.WriteLine($"Customer: {order.CustomerId}");
        Console.WriteLine($"Total Amount: {order.TotalAmount}");
        Console.WriteLine($"Status: {order.Status}");
        Console.WriteLine($"Events count: {order.Events.Count}");

        // Show event details
        var firstEvent = order.Events.First();
        Console.WriteLine($"First event ID: {firstEvent.Id}");
        Console.WriteLine($"First event correlation ID: {firstEvent.CorrelationId}");
        Console.WriteLine($"First event occurred at: {firstEvent.OccurredAt}");
    }

    static void DemonstrateFunctionalErrorHandling()
    {
        var customerId = new CustomerId("CUST-001");
        var totalAmount = new Money(150.75m, "USD");
        var order = new Order(customerId, totalAmount);

        // Successful operation
        var confirmResult = order.ConfirmOrder();
        confirmResult.Match<object>(
            onSuccess: () => { Console.WriteLine("Order confirmed successfully"); return null!; },
            onFailure: error => { Console.WriteLine($"Failed to confirm: {error.Message}"); return null!; }
        );

        // Failed operation (trying to confirm already confirmed order)
        var confirmAgainResult = order.ConfirmOrder();
        confirmAgainResult.Match<object>(
            onSuccess: () => { Console.WriteLine("Order confirmed again"); return null!; },
            onFailure: error => { Console.WriteLine($"Expected failure: {error.Code} - {error.Message}"); return null!; }
        );

        // Another failed operation (trying to cancel shipped order)
        order.ShipOrder(); // Move to shipped status
        var cancelResult = order.CancelOrder();
        cancelResult.Match<object>(
            onSuccess: () => { Console.WriteLine("Order cancelled successfully"); return null!; },
            onFailure: error => { Console.WriteLine($"Cannot cancel: {error.Code} - {error.Message}"); return null!; }
        );
    }

    static void DemonstrateMaybeTypes()
    {
        // Maybe with value
        var maybeOrder = FindOrderById("ORDER-123"); // Returns Maybe<Order>

        var result = maybeOrder
            .Map(o => o.TotalAmount)
            .Map(amount => $"Order total: {amount.Amount} {amount.Currency}")
            .OrElse("Order not found");

        Console.WriteLine(result);

        // Maybe without value
        var emptyMaybe = Maybe<Order>.None();
        var emptyResult = emptyMaybe
            .Map(o => o.TotalAmount.ToString())
            .OrElse("No order available");

        Console.WriteLine(emptyResult);

        // Maybe with value
        var order = new Order(new CustomerId("CUST-001"), new Money(199.99m, "USD"));
        var someMaybe = Maybe<Order>.Some(order);
        var someResult = someMaybe
            .Map(o => $"Found order {o.Id} for customer {o.CustomerId}")
            .OrElse("Order not found");

        Console.WriteLine(someResult);
    }

    static async Task DemonstrateOperationChaining()
    {
        var order = new Order(new CustomerId("CUST-001"), new Money(100m, "USD"));

        var result = await ProcessOrderAsync(order).ConfigureAwait(false);
        result.Match<object?>(
            onSuccess: orderId => { Console.WriteLine($"Order {orderId} processed successfully"); return null; },
            onFailure: error => { Console.WriteLine($"Processing failed: {error.Message}"); return null; }
        );

        // Test with invalid order
        var invalidOrder = new Order(new CustomerId("CUST-002"), new Money(-10m, "USD"));
        var invalidResult = await ProcessOrderAsync(invalidOrder).ConfigureAwait(false);
        invalidResult.Match<object?>(
            onSuccess: orderId => { Console.WriteLine($"Invalid order {orderId} processed"); return null; },
            onFailure: error => { Console.WriteLine($"Expected validation failure: {error.Code} - {error.Message}"); return null; }
        );
    }

    static Maybe<Order> FindOrderById(string orderId)
    {
        // Simulate database lookup that might not find the order
        if (orderId == "EXISTING-ORDER")
        {
            return Maybe<Order>.Some(new Order(new CustomerId("CUST-001"), new Money(250.00m, "USD")));
        }
        return Maybe<Order>.None();
    }

    static async Task<Result<string>> ProcessOrderAsync(Order order)
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

    static Result ValidateOrder(Order order)
    {
        if (order.TotalAmount.Amount <= 0)
            return Error.Validation("Order.InvalidAmount", "Order amount must be positive");

        if (string.IsNullOrEmpty(order.CustomerId))
            return Error.Validation("Order.MissingCustomer", "Order must have a customer");

        return Result.Ok();
    }
}