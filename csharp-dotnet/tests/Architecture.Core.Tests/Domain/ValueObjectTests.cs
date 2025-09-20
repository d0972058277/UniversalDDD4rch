using System.Collections.Generic;
using Xunit;
using Architecture.Core.Domain.ValueObjects;

namespace Architecture.Core.Tests.Domain;

public class ValueObjectTests
{
    [Fact]
    public void Should_BeEqual_When_AllComponentsMatch()
    {
        // Given
        var address1 = new TestAddress("123 Main St", "Anytown", "12345");
        var address2 = new TestAddress("123 Main St", "Anytown", "12345");

        // When
        var areEqual = address1.Equals(address2);
        var operatorEqual = address1 == address2;

        // Then
        Assert.True(areEqual);
        Assert.True(operatorEqual);
        Assert.Equal(address1.GetHashCode(), address2.GetHashCode());
    }

    [Fact]
    public void Should_NotBeEqual_When_ComponentsDiffer()
    {
        // Given
        var address1 = new TestAddress("123 Main St", "Anytown", "12345");
        var address2 = new TestAddress("456 Oak Ave", "Anytown", "12345");

        // When
        var areEqual = address1.Equals(address2);
        var operatorEqual = address1 == address2;

        // Then
        Assert.False(areEqual);
        Assert.False(operatorEqual);
        Assert.True(address1 != address2);
    }

    [Fact]
    public void Should_HandleNull_When_ComparingWithNull()
    {
        // Given
        var address = new TestAddress("123 Main St", "Anytown", "12345");

        // When
        var equalToNull = address.Equals(null);
        var operatorEqualToNull = address == null;

        // Then
        Assert.False(equalToNull);
        Assert.False(operatorEqualToNull);
        Assert.True(address != null);
    }

    [Fact]
    public void Should_HandleNullComponents_When_ComponentIsNull()
    {
        // Given
        var address1 = new TestAddressWithNullable("123 Main St", null, "12345");
        var address2 = new TestAddressWithNullable("123 Main St", null, "12345");
        var address3 = new TestAddressWithNullable("123 Main St", "Suite 100", "12345");

        // When
        var equal = address1.Equals(address2);
        var notEqual = address1.Equals(address3);

        // Then
        Assert.True(equal);
        Assert.False(notEqual);
        Assert.Equal(address1.GetHashCode(), address2.GetHashCode());
    }

    [Fact]
    public void Should_WorkWithCollections_When_ComponentsAreCollections()
    {
        // Given
        var tags1 = new TestTags(new[] { "urgent", "important" });
        var tags2 = new TestTags(new[] { "urgent", "important" });
        var tags3 = new TestTags(new[] { "normal", "important" });

        // When
        var equal = tags1.Equals(tags2);
        var notEqual = tags1.Equals(tags3);

        // Then
        Assert.True(equal);
        Assert.False(notEqual);
    }

    [Fact]
    public void Should_BeEqualToSelf_When_ComparingToSameInstance()
    {
        // Given
        var address = new TestAddress("123 Main St", "Anytown", "12345");

        // When
        var equalToSelf = address.Equals(address);

        // Then
        Assert.True(equalToSelf);
    }

    [Fact]
    public void Should_NotBeEqual_When_ComparingDifferentTypes()
    {
        // Given
        var address = new TestAddress("123 Main St", "Anytown", "12345");
        var otherType = new TestPerson("John", "Doe");

        // When
        var areEqual = address.Equals(otherType);

        // Then
        Assert.False(areEqual);
    }

    private class TestAddress : ValueObject
    {
        public string Street { get; }
        public string City { get; }
        public string ZipCode { get; }

        public TestAddress(string street, string city, string zipCode)
        {
            Street = street;
            City = city;
            ZipCode = zipCode;
        }

        protected override IEnumerable<object?> GetEqualityComponents()
        {
            yield return Street;
            yield return City;
            yield return ZipCode;
        }
    }

    private class TestAddressWithNullable : ValueObject
    {
        public string Street { get; }
        public string? Apartment { get; }
        public string ZipCode { get; }

        public TestAddressWithNullable(string street, string? apartment, string zipCode)
        {
            Street = street;
            Apartment = apartment;
            ZipCode = zipCode;
        }

        protected override IEnumerable<object?> GetEqualityComponents()
        {
            yield return Street;
            yield return Apartment;
            yield return ZipCode;
        }
    }

    private class TestTags : ValueObject
    {
        public IReadOnlyList<string> Values { get; }

        public TestTags(IEnumerable<string> values)
        {
            Values = values.ToList().AsReadOnly();
        }

        protected override IEnumerable<object?> GetEqualityComponents()
        {
            foreach (var value in Values)
                yield return value;
        }
    }

    private class TestPerson : ValueObject
    {
        public string FirstName { get; }
        public string LastName { get; }

        public TestPerson(string firstName, string lastName)
        {
            FirstName = firstName;
            LastName = lastName;
        }

        protected override IEnumerable<object?> GetEqualityComponents()
        {
            yield return FirstName;
            yield return LastName;
        }
    }
}