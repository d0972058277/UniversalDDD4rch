using System;
using System.Collections.Generic;
using Architecture.Core.Domain.ValueObjects;

namespace QuickstartExample.Domain;

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

    public static implicit operator string(CustomerId customerId) => customerId?.Value ?? string.Empty;
    public static implicit operator CustomerId(string value) => new(value);

    public static CustomerId FromString(string value) => new(value);
    public string ToCustomerId() => Value;

    public override string ToString() => Value;
}