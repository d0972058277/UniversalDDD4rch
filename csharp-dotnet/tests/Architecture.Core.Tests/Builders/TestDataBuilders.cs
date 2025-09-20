using System;
using System.Collections.Generic;
using Architecture.Core.Functional;
using Architecture.Core.Tests.TestDomain;

namespace Architecture.Core.Tests.Builders;

/// <summary>
/// Test data builders that provide fluent APIs for creating test objects with sensible defaults.
/// </summary>
public static class TestDataBuilders
{
    /// <summary>
    /// Builder for creating Money value objects in tests.
    /// </summary>
    public class MoneyBuilder
    {
        private decimal _amount = 100.00m;
        private string _currency = "USD";

        public MoneyBuilder WithAmount(decimal amount)
        {
            _amount = amount;
            return this;
        }

        public MoneyBuilder WithCurrency(string currency)
        {
            _currency = currency;
            return this;
        }

        public Money Build() => new(_amount, _currency);

        public static implicit operator Money(MoneyBuilder builder) => builder.Build();
    }

    /// <summary>
    /// Builder for creating CustomerId value objects in tests.
    /// </summary>
    public class CustomerIdBuilder
    {
        private string _value = "CUST-001";

        public CustomerIdBuilder WithValue(string value)
        {
            _value = value;
            return this;
        }

        public CustomerId Build() => new(_value);

        public static implicit operator CustomerId(CustomerIdBuilder builder) => builder.Build();
    }

    /// <summary>
    /// Builder for creating Order aggregates in tests.
    /// </summary>
    public class OrderBuilder
    {
        private CustomerId _customerId = new("CUST-001");
        private Money _totalAmount = new(100.00m, "USD");
        private string? _correlationId;
        private OrderStatus _status = OrderStatus.Pending;

        public OrderBuilder WithCustomerId(CustomerId customerId)
        {
            _customerId = customerId;
            return this;
        }

        public OrderBuilder WithCustomerId(string customerId)
        {
            _customerId = new CustomerId(customerId);
            return this;
        }

        public OrderBuilder WithTotalAmount(Money totalAmount)
        {
            _totalAmount = totalAmount;
            return this;
        }

        public OrderBuilder WithTotalAmount(decimal amount, string currency = "USD")
        {
            _totalAmount = new Money(amount, currency);
            return this;
        }

        public OrderBuilder WithCorrelationId(string? correlationId)
        {
            _correlationId = correlationId;
            return this;
        }

        public OrderBuilder WithStatus(OrderStatus status)
        {
            _status = status;
            return this;
        }

        public Order Build()
        {
            var order = new Order(_customerId, _totalAmount, _correlationId);

            // Apply status changes if needed
            if (_status != OrderStatus.Pending)
            {
                switch (_status)
                {
                    case OrderStatus.Confirmed:
                        order.ConfirmOrder();
                        break;
                    case OrderStatus.Shipped:
                        order.ConfirmOrder();
                        order.ShipOrder();
                        break;
                    case OrderStatus.Cancelled:
                        order.CancelOrder();
                        break;
                }
            }

            return order;
        }

        public static implicit operator Order(OrderBuilder builder) => builder.Build();
    }

    /// <summary>
    /// Builder for creating Error objects in tests.
    /// </summary>
    public class ErrorBuilder
    {
        private string _code = "TEST.ERROR";
        private string _message = "Test error message";
        private ErrorCategory _category = ErrorCategory.Domain;
        private Dictionary<string, object>? _metadata;

        public ErrorBuilder WithCode(string code)
        {
            _code = code;
            return this;
        }

        public ErrorBuilder WithMessage(string message)
        {
            _message = message;
            return this;
        }

        public ErrorBuilder WithCategory(ErrorCategory category)
        {
            _category = category;
            return this;
        }

        public ErrorBuilder WithMetadata(string key, object value)
        {
            _metadata ??= new Dictionary<string, object>();
            _metadata[key] = value;
            return this;
        }

        public ErrorBuilder WithMetadata(Dictionary<string, object> metadata)
        {
            _metadata = metadata;
            return this;
        }

        public Error Build()
        {
            return _category switch
            {
                ErrorCategory.Domain => Error.Domain(_code, _message, _metadata),
                ErrorCategory.Validation => Error.Validation(_code, _message, _metadata),
                ErrorCategory.Infrastructure => Error.Infrastructure(_code, _message, _metadata),
                ErrorCategory.Concurrency => Error.Concurrency(_code, _message, _metadata),
                ErrorCategory.Security => Error.Security(_code, _message, _metadata),
                _ => Error.Domain(_code, _message, _metadata)
            };
        }

        public static implicit operator Error(ErrorBuilder builder) => builder.Build();
    }

    /// <summary>
    /// Provides fluent entry points for test data builders.
    /// </summary>
    public static class A
    {
        public static MoneyBuilder Money => new();
        public static CustomerIdBuilder CustomerId => new();
        public static OrderBuilder Order => new();
        public static ErrorBuilder Error => new();
    }

    /// <summary>
    /// Provides alternative fluent entry points for test data builders.
    /// </summary>
    public static class An
    {
        public static OrderBuilder Order => new();
        public static ErrorBuilder Error => new();
    }

    /// <summary>
    /// Common test scenarios and data sets.
    /// </summary>
    public static class Common
    {
        public static readonly Money StandardAmount = new(100.00m, "USD");
        public static readonly Money LargeAmount = new(10000.00m, "USD");
        public static readonly Money SmallAmount = new(0.01m, "USD");
        public static readonly Money ZeroAmount = new(0.00m, "USD");
        public static readonly Money NegativeAmount = new(-50.00m, "USD");

        public static readonly CustomerId StandardCustomerId = new("CUST-001");
        public static readonly CustomerId PremiumCustomerId = new("PREMIUM-001");
        public static readonly CustomerId TestCustomerId = new("TEST-CUSTOMER");

        public static readonly Error DomainError = Error.Domain("DOMAIN.ERROR", "A domain error occurred");
        public static readonly Error ValidationError = Error.Validation("VALIDATION.ERROR", "Invalid input provided");
        public static readonly Error InfrastructureError = Error.Infrastructure("INFRA.ERROR", "Database connection failed");
        public static readonly Error ConcurrencyError = Error.Concurrency("CONCURRENCY.ERROR", "Version conflict detected");
        public static readonly Error SecurityError = Error.Security("SECURITY.ERROR", "Access denied");

        public static Order CreateStandardOrder() =>
            A.Order
                .WithCustomerId(StandardCustomerId)
                .WithTotalAmount(StandardAmount)
                .Build();

        public static Order CreateOrderWithStatus(OrderStatus status) =>
            A.Order
                .WithCustomerId(StandardCustomerId)
                .WithTotalAmount(StandardAmount)
                .WithStatus(status)
                .Build();

        public static Order CreateOrderForCustomer(string customerId, decimal amount = 100.00m) =>
            A.Order
                .WithCustomerId(customerId)
                .WithTotalAmount(amount)
                .Build();
    }
}