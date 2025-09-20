using System;
using System.Collections.Generic;
using System.Linq;
using Xunit;
using Architecture.Core.Domain.ValueObjects;

namespace Architecture.Core.Tests.Integration;

public class ValueObjectEqualityScenarios
{
    [Fact]
    public void Should_HandleMultiFieldEquality_When_AllFieldsMatch()
    {
        // Given
        var address1 = new Address("123 Main St", "Anytown", "NY", "12345", "USA");
        var address2 = new Address("123 Main St", "Anytown", "NY", "12345", "USA");

        // When
        var areEqual = address1.Equals(address2);
        var hashCodesEqual = address1.GetHashCode() == address2.GetHashCode();

        // Then
        Assert.True(areEqual);
        Assert.True(hashCodesEqual);
        Assert.True(address1 == address2);
        Assert.False(address1 != address2);
    }

    [Fact]
    public void Should_HandleMultiFieldInequality_When_AnyFieldDiffers()
    {
        // Given
        var address1 = new Address("123 Main St", "Anytown", "NY", "12345", "USA");
        var address2 = new Address("123 Main St", "Anytown", "CA", "12345", "USA"); // Different state

        // When
        var areEqual = address1.Equals(address2);

        // Then
        Assert.False(areEqual);
        Assert.True(address1 != address2);
        Assert.False(address1 == address2);
    }

    [Fact]
    public void Should_HandleCollectionComponents_When_CollectionsAreEqual()
    {
        // Given
        var phoneNumbers1 = new List<string> { "555-1234", "555-5678" };
        var phoneNumbers2 = new List<string> { "555-1234", "555-5678" };
        var contact1 = new ContactInfo("John Doe", phoneNumbers1);
        var contact2 = new ContactInfo("John Doe", phoneNumbers2);

        // When
        var areEqual = contact1.Equals(contact2);

        // Then
        Assert.True(areEqual);
        Assert.Equal(contact1.GetHashCode(), contact2.GetHashCode());
    }

    [Fact]
    public void Should_HandleCollectionComponents_When_CollectionsHaveDifferentOrder()
    {
        // Given
        var phoneNumbers1 = new List<string> { "555-1234", "555-5678" };
        var phoneNumbers2 = new List<string> { "555-5678", "555-1234" }; // Different order
        var contact1 = new ContactInfo("John Doe", phoneNumbers1);
        var contact2 = new ContactInfo("John Doe", phoneNumbers2);

        // When
        var areEqual = contact1.Equals(contact2);

        // Then
        Assert.False(areEqual); // Order matters in this implementation
    }

    [Fact]
    public void Should_HandleNestedValueObjects_When_NestedObjectsAreEqual()
    {
        // Given
        var address1 = new Address("123 Main St", "Anytown", "NY", "12345", "USA");
        var address2 = new Address("123 Main St", "Anytown", "NY", "12345", "USA");
        var person1 = new PersonWithAddress("John Doe", address1);
        var person2 = new PersonWithAddress("John Doe", address2);

        // When
        var areEqual = person1.Equals(person2);

        // Then
        Assert.True(areEqual);
        Assert.Equal(person1.GetHashCode(), person2.GetHashCode());
    }

    [Fact]
    public void Should_HandleNestedValueObjects_When_NestedObjectsDiffer()
    {
        // Given
        var address1 = new Address("123 Main St", "Anytown", "NY", "12345", "USA");
        var address2 = new Address("456 Oak Ave", "Anytown", "NY", "12345", "USA"); // Different street
        var person1 = new PersonWithAddress("John Doe", address1);
        var person2 = new PersonWithAddress("John Doe", address2);

        // When
        var areEqual = person1.Equals(person2);

        // Then
        Assert.False(areEqual);
    }

    [Fact]
    public void Should_HandleNullComponents_When_BothHaveNullComponents()
    {
        // Given
        var address1 = new AddressWithOptionalFields("123 Main St", null, "NY", "12345");
        var address2 = new AddressWithOptionalFields("123 Main St", null, "NY", "12345");

        // When
        var areEqual = address1.Equals(address2);

        // Then
        Assert.True(areEqual);
        Assert.Equal(address1.GetHashCode(), address2.GetHashCode());
    }

    [Fact]
    public void Should_HandleNullComponents_When_OneHasNullOneHasValue()
    {
        // Given
        var address1 = new AddressWithOptionalFields("123 Main St", null, "NY", "12345");
        var address2 = new AddressWithOptionalFields("123 Main St", "Apt 2B", "NY", "12345");

        // When
        var areEqual = address1.Equals(address2);

        // Then
        Assert.False(areEqual);
    }

    [Fact]
    public void Should_HandleEmptyCollections_When_BothCollectionsAreEmpty()
    {
        // Given
        var contact1 = new ContactInfo("John Doe", new List<string>());
        var contact2 = new ContactInfo("John Doe", new List<string>());

        // When
        var areEqual = contact1.Equals(contact2);

        // Then
        Assert.True(areEqual);
        Assert.Equal(contact1.GetHashCode(), contact2.GetHashCode());
    }

    [Fact]
    public void Should_HandleNullCollections_When_BothCollectionsAreNull()
    {
        // Given
        var contact1 = new ContactInfoWithNullableCollection("John Doe", null);
        var contact2 = new ContactInfoWithNullableCollection("John Doe", null);

        // When
        var areEqual = contact1.Equals(contact2);

        // Then
        Assert.True(areEqual);
        Assert.Equal(contact1.GetHashCode(), contact2.GetHashCode());
    }

    [Fact]
    public void Should_HandleMixedTypes_When_ComponentsHaveDifferentTypes()
    {
        // Given
        var mixedValue1 = new MixedTypeValue("String", 42, 3.14m, true, DateTime.Parse("2023-01-01"));
        var mixedValue2 = new MixedTypeValue("String", 42, 3.14m, true, DateTime.Parse("2023-01-01"));
        var mixedValue3 = new MixedTypeValue("String", 42, 3.14m, false, DateTime.Parse("2023-01-01")); // Different bool

        // When
        var equal = mixedValue1.Equals(mixedValue2);
        var notEqual = mixedValue1.Equals(mixedValue3);

        // Then
        Assert.True(equal);
        Assert.False(notEqual);
        Assert.Equal(mixedValue1.GetHashCode(), mixedValue2.GetHashCode());
    }

    [Fact]
    public void Should_PerformanceOptimized_When_ManyEqualityChecks()
    {
        // Given
        var addresses = Enumerable.Range(0, 1000)
            .Select(i => new Address($"{i} Main St", "Anytown", "NY", "12345", "USA"))
            .ToList();

        var targetAddress = new Address("500 Main St", "Anytown", "NY", "12345", "USA");

        // When
        var startTime = DateTime.UtcNow;
        var found = addresses.Any(a => a.Equals(targetAddress));
        var endTime = DateTime.UtcNow;

        // Then
        Assert.True(found);
        Assert.True((endTime - startTime).TotalMilliseconds < 100); // Should be fast
    }

    [Fact]
    public void Should_HandleComplexEqualityScenario_When_RealWorldDataUsed()
    {
        // Given - Real-world scenario with customer data
        var customer1 = CreateComplexCustomer();
        var customer2 = CreateComplexCustomer(); // Same data
        var customer3 = CreateComplexCustomerWithDifference(); // One small difference

        // When
        var equal = customer1.Equals(customer2);
        var notEqual = customer1.Equals(customer3);

        // Then
        Assert.True(equal);
        Assert.False(notEqual);
    }

    private static ComplexCustomer CreateComplexCustomer()
    {
        var billingAddress = new Address("123 Main St", "Anytown", "NY", "12345", "USA");
        var shippingAddress = new Address("456 Oak Ave", "Anytown", "NY", "12345", "USA");
        var phoneNumbers = new List<string> { "555-1234", "555-5678" };
        var contactInfo = new ContactInfo("John Doe", phoneNumbers);

        return new ComplexCustomer("CUST-001", "John", "Doe", contactInfo, billingAddress, shippingAddress);
    }

    private static ComplexCustomer CreateComplexCustomerWithDifference()
    {
        var billingAddress = new Address("123 Main St", "Anytown", "NY", "12345", "USA");
        var shippingAddress = new Address("456 Oak Ave", "Anytown", "CA", "12345", "USA"); // Different state
        var phoneNumbers = new List<string> { "555-1234", "555-5678" };
        var contactInfo = new ContactInfo("John Doe", phoneNumbers);

        return new ComplexCustomer("CUST-001", "John", "Doe", contactInfo, billingAddress, shippingAddress);
    }
}

// Test value objects for equality scenarios
public class Address : ValueObject
{
    public string Street { get; }
    public string City { get; }
    public string State { get; }
    public string ZipCode { get; }
    public string Country { get; }

    public Address(string street, string city, string state, string zipCode, string country)
    {
        Street = street;
        City = city;
        State = state;
        ZipCode = zipCode;
        Country = country;
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Street;
        yield return City;
        yield return State;
        yield return ZipCode;
        yield return Country;
    }
}

public class AddressWithOptionalFields : ValueObject
{
    public string Street { get; }
    public string? Apartment { get; }
    public string State { get; }
    public string ZipCode { get; }

    public AddressWithOptionalFields(string street, string? apartment, string state, string zipCode)
    {
        Street = street;
        Apartment = apartment;
        State = state;
        ZipCode = zipCode;
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Street;
        yield return Apartment;
        yield return State;
        yield return ZipCode;
    }
}

public class ContactInfo : ValueObject
{
    public string Name { get; }
    public IReadOnlyList<string> PhoneNumbers { get; }

    public ContactInfo(string name, IEnumerable<string> phoneNumbers)
    {
        Name = name;
        PhoneNumbers = phoneNumbers.ToList().AsReadOnly();
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Name;
        foreach (var phone in PhoneNumbers)
            yield return phone;
    }
}

public class ContactInfoWithNullableCollection : ValueObject
{
    public string Name { get; }
    public IReadOnlyList<string>? PhoneNumbers { get; }

    public ContactInfoWithNullableCollection(string name, IEnumerable<string>? phoneNumbers)
    {
        Name = name;
        PhoneNumbers = phoneNumbers?.ToList().AsReadOnly();
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Name;
        if (PhoneNumbers != null)
        {
            foreach (var phone in PhoneNumbers)
                yield return phone;
        }
    }
}

public class PersonWithAddress : ValueObject
{
    public string Name { get; }
    public Address Address { get; }

    public PersonWithAddress(string name, Address address)
    {
        Name = name;
        Address = address;
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Name;
        yield return Address;
    }
}

public class MixedTypeValue : ValueObject
{
    public string StringValue { get; }
    public int IntValue { get; }
    public decimal DecimalValue { get; }
    public bool BoolValue { get; }
    public DateTime DateValue { get; }

    public MixedTypeValue(string stringValue, int intValue, decimal decimalValue, bool boolValue, DateTime dateValue)
    {
        StringValue = stringValue;
        IntValue = intValue;
        DecimalValue = decimalValue;
        BoolValue = boolValue;
        DateValue = dateValue;
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return StringValue;
        yield return IntValue;
        yield return DecimalValue;
        yield return BoolValue;
        yield return DateValue;
    }
}

public class ComplexCustomer : ValueObject
{
    public string CustomerId { get; }
    public string FirstName { get; }
    public string LastName { get; }
    public ContactInfo ContactInfo { get; }
    public Address BillingAddress { get; }
    public Address ShippingAddress { get; }

    public ComplexCustomer(string customerId, string firstName, string lastName,
        ContactInfo contactInfo, Address billingAddress, Address shippingAddress)
    {
        CustomerId = customerId;
        FirstName = firstName;
        LastName = lastName;
        ContactInfo = contactInfo;
        BillingAddress = billingAddress;
        ShippingAddress = shippingAddress;
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return CustomerId;
        yield return FirstName;
        yield return LastName;
        yield return ContactInfo;
        yield return BillingAddress;
        yield return ShippingAddress;
    }
}