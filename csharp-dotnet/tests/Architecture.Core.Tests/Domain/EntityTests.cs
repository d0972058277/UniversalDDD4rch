using System;
using Xunit;
using Architecture.Core.Domain.Entities;

namespace Architecture.Core.Tests.Domain;

public class EntityTests
{
    [Fact]
    public void Should_BeEqual_When_SameId()
    {
        // Given
        var id = "test-id";
        var entity1 = new TestEntity(id, "Name1");
        var entity2 = new TestEntity(id, "Name2"); // Different properties but same ID

        // When
        var areEqual = entity1.Equals(entity2);
        var operatorEqual = entity1 == entity2;

        // Then
        Assert.True(areEqual);
        Assert.True(operatorEqual);
        Assert.Equal(entity1.GetHashCode(), entity2.GetHashCode());
    }

    [Fact]
    public void Should_NotBeEqual_When_DifferentIds()
    {
        // Given
        var entity1 = new TestEntity("id1", "Name");
        var entity2 = new TestEntity("id2", "Name");

        // When
        var areEqual = entity1.Equals(entity2);
        var operatorEqual = entity1 == entity2;

        // Then
        Assert.False(areEqual);
        Assert.False(operatorEqual);
        Assert.True(entity1 != entity2);
    }

    [Fact]
    public void Should_NotBeEqual_When_ComparingWithNull()
    {
        // Given
        var entity = new TestEntity("test-id", "Name");

        // When
        var equalToNull = entity.Equals(null);
        var operatorEqualToNull = entity == null;

        // Then
        Assert.False(equalToNull);
        Assert.False(operatorEqualToNull);
        Assert.True(entity != null);
    }

    [Fact]
    public void Should_NotBeEqual_When_ComparingDifferentTypes()
    {
        // Given
        var entity1 = new TestEntity("test-id", "Name");
        var entity2 = new TestEntityDifferentType("test-id", 42);

        // When
        var areEqual = entity1.Equals(entity2);

        // Then
        Assert.False(areEqual);
    }

    [Fact]
    public void Should_BeEqualToSelf_When_ComparingToSameInstance()
    {
        // Given
        var entity = new TestEntity("test-id", "Name");

        // When
        var equalToSelf = entity.Equals(entity);

        // Then
        Assert.True(equalToSelf);
    }

    [Fact]
    public void Should_ThrowException_When_IdIsNull()
    {
        // Given/When/Then
        Assert.Throws<ArgumentNullException>(() => new TestEntity(null!, "Name"));
    }

    [Fact]
    public void Should_PreserveId_When_EntityCreated()
    {
        // Given
        var expectedId = "test-id-123";

        // When
        var entity = new TestEntity(expectedId, "Name");

        // Then
        Assert.Equal(expectedId, entity.Id);
    }

    [Fact]
    public void Should_HandleComplexIdTypes_When_UsingCustomIdObject()
    {
        // Given
        var customId1 = new CustomId("ABC", 123);
        var customId2 = new CustomId("ABC", 123);
        var customId3 = new CustomId("DEF", 456);

        var entity1 = new TestEntityWithCustomId(customId1, "Data");
        var entity2 = new TestEntityWithCustomId(customId2, "Data");
        var entity3 = new TestEntityWithCustomId(customId3, "Data");

        // When
        var equal = entity1.Equals(entity2);
        var notEqual = entity1.Equals(entity3);

        // Then
        Assert.True(equal);
        Assert.False(notEqual);
        Assert.Equal(entity1.GetHashCode(), entity2.GetHashCode());
    }

    private class TestEntity : Entity<string>
    {
        public string Name { get; }

        public TestEntity(string id, string name) : base(id)
        {
            Name = name;
        }
    }

    private class TestEntityDifferentType : Entity<string>
    {
        public int Value { get; }

        public TestEntityDifferentType(string id, int value) : base(id)
        {
            Value = value;
        }
    }

    private class TestEntityWithCustomId : Entity<CustomId>
    {
        public string Data { get; }

        public TestEntityWithCustomId(CustomId id, string data) : base(id)
        {
            Data = data;
        }
    }

    private class CustomId : IEquatable<CustomId>
    {
        public string Code { get; }
        public int Number { get; }

        public CustomId(string code, int number)
        {
            Code = code;
            Number = number;
        }

        public bool Equals(CustomId? other)
        {
            if (other is null) return false;
            if (ReferenceEquals(this, other)) return true;
            return Code == other.Code && Number == other.Number;
        }

        public override bool Equals(object? obj) => Equals(obj as CustomId);

        public override int GetHashCode() => HashCode.Combine(Code, Number);

        public static bool operator ==(CustomId? left, CustomId? right) => Equals(left, right);

        public static bool operator !=(CustomId? left, CustomId? right) => !Equals(left, right);
    }
}