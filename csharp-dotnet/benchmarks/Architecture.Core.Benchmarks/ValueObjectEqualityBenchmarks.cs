using System;
using System.Collections.Generic;
using System.Linq;
using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Jobs;
using Architecture.Core.Domain.ValueObjects;

namespace Architecture.Core.Benchmarks;

[SimpleJob(RuntimeMoniker.Net80)]
[MemoryDiagnoser]
[MarkdownExporter]
public class ValueObjectEqualityBenchmarks
{
    private readonly TestAddress[] _addresses = new TestAddress[1000];
    private readonly TestAddress _targetAddress;
    private readonly TestComplexValue[] _complexValues = new TestComplexValue[1000];
    private readonly TestComplexValue _targetComplexValue;

    public ValueObjectEqualityBenchmarks()
    {
        // Initialize test data
        for (int i = 0; i < 1000; i++)
        {
            _addresses[i] = new TestAddress($"{i} Main St", "TestCity", "12345");
        }
        _targetAddress = new TestAddress("500 Main St", "TestCity", "12345");

        for (int i = 0; i < 1000; i++)
        {
            _complexValues[i] = new TestComplexValue($"Name{i}", i, new[] { $"Tag{i}", $"Category{i}" });
        }
        _targetComplexValue = new TestComplexValue("Name500", 500, new[] { "Tag500", "Category500" });
    }

    [Benchmark]
    public bool SimpleValueObjectEquality()
    {
        var address1 = new TestAddress("123 Main St", "TestCity", "12345");
        var address2 = new TestAddress("123 Main St", "TestCity", "12345");
        return address1.Equals(address2);
    }

    [Benchmark]
    public int SimpleValueObjectHashCode()
    {
        var address = new TestAddress("123 Main St", "TestCity", "12345");
        return address.GetHashCode();
    }

    [Benchmark]
    public bool ComplexValueObjectEquality()
    {
        var value1 = new TestComplexValue("TestName", 42, new[] { "Tag1", "Tag2", "Tag3" });
        var value2 = new TestComplexValue("TestName", 42, new[] { "Tag1", "Tag2", "Tag3" });
        return value1.Equals(value2);
    }

    [Benchmark]
    public int ComplexValueObjectHashCode()
    {
        var value = new TestComplexValue("TestName", 42, new[] { "Tag1", "Tag2", "Tag3" });
        return value.GetHashCode();
    }

    [Benchmark]
    public bool FindAddressInCollection()
    {
        return _addresses.Contains(_targetAddress);
    }

    [Benchmark]
    public bool FindComplexValueInCollection()
    {
        return _complexValues.Contains(_targetComplexValue);
    }

    [Benchmark]
    public TestAddress? FindAddressWithLinq()
    {
        return _addresses.FirstOrDefault(a => a.Equals(_targetAddress));
    }

    [Benchmark]
    public TestComplexValue? FindComplexValueWithLinq()
    {
        return _complexValues.FirstOrDefault(v => v.Equals(_targetComplexValue));
    }

    [Benchmark]
    public Dictionary<TestAddress, string> CreateAddressDictionary()
    {
        var dict = new Dictionary<TestAddress, string>();
        for (int i = 0; i < 100; i++)
        {
            var address = new TestAddress($"{i} Street", "City", "ZIP");
            dict[address] = $"Value{i}";
        }
        return dict;
    }

    [Benchmark]
    public bool DictionaryLookup()
    {
        var dict = new Dictionary<TestAddress, string>();
        for (int i = 0; i < 100; i++)
        {
            var address = new TestAddress($"{i} Street", "City", "ZIP");
            dict[address] = $"Value{i}";
        }

        var lookupAddress = new TestAddress("50 Street", "City", "ZIP");
        return dict.ContainsKey(lookupAddress);
    }

    [Benchmark]
    public bool ValueObjectOperatorEquality()
    {
        var address1 = new TestAddress("123 Main St", "TestCity", "12345");
        var address2 = new TestAddress("123 Main St", "TestCity", "12345");
        return address1 == address2;
    }

    [Benchmark]
    public bool ValueObjectOperatorInequality()
    {
        var address1 = new TestAddress("123 Main St", "TestCity", "12345");
        var address2 = new TestAddress("456 Oak Ave", "TestCity", "12345");
        return address1 != address2;
    }
}

// Test value objects for benchmarking
public class TestAddress : ValueObject
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

public class TestComplexValue : ValueObject
{
    public string Name { get; }
    public int Value { get; }
    public IReadOnlyList<string> Tags { get; }

    public TestComplexValue(string name, int value, IEnumerable<string> tags)
    {
        Name = name;
        Value = value;
        Tags = tags.ToList().AsReadOnly();
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Name;
        yield return Value;
        foreach (var tag in Tags)
        {
            yield return tag;
        }
    }
}