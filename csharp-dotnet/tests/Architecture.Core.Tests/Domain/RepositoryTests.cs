using System;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Architecture.Core.Domain.Repositories;
using Architecture.Core.Domain.Aggregates;
using Architecture.Core.Functional;

namespace Architecture.Core.Tests.Domain;

public class RepositoryTests
{
    [Fact]
    public async Task Should_ReturnMaybe_When_GetByIdAsyncCalled()
    {
        // Given
        var repository = new TestRepository();
        var testId = "test-id";

        // When
        var result = await repository.GetByIdAsync(testId);

        // Then
        Assert.IsType<Maybe<TestAggregate>>(result);
        // This test verifies the contract - implementation will determine Some/None
    }

    [Fact]
    public async Task Should_AcceptCancellationToken_When_GetByIdAsyncCalled()
    {
        // Given
        var repository = new TestRepository();
        var testId = "test-id";
        using var cts = new CancellationTokenSource();

        // When
        var result = await repository.GetByIdAsync(testId, cts.Token);

        // Then
        Assert.IsType<Maybe<TestAggregate>>(result);
        // Verify cancellation token is properly passed through
        Assert.True(repository.LastCancellationToken.HasValue);
    }

    [Fact]
    public async Task Should_ReturnResult_When_AddAsyncCalled()
    {
        // Given
        var repository = new TestRepository();
        var aggregate = new TestAggregate("test-id");

        // When
        var result = await repository.AddAsync(aggregate);

        // Then
        Assert.IsType<Result>(result);
        Assert.Equal(aggregate, repository.LastAddedAggregate);
    }

    [Fact]
    public async Task Should_ReturnResult_When_UpdateAsyncCalled()
    {
        // Given
        var repository = new TestRepository();
        var aggregate = new TestAggregate("test-id");

        // When
        var result = await repository.UpdateAsync(aggregate);

        // Then
        Assert.IsType<Result>(result);
        Assert.Equal(aggregate, repository.LastUpdatedAggregate);
    }

    [Fact]
    public async Task Should_ReturnResult_When_DeleteAsyncCalled()
    {
        // Given
        var repository = new TestRepository();
        var testId = "test-id";

        // When
        var result = await repository.DeleteAsync(testId);

        // Then
        Assert.IsType<Result>(result);
        Assert.Equal(testId, repository.LastDeletedId);
    }

    [Fact]
    public async Task Should_ReturnResultOfBool_When_ExistsAsyncCalled()
    {
        // Given
        var repository = new TestRepository();
        var testId = "test-id";

        // When
        var result = await repository.ExistsAsync(testId);

        // Then
        Assert.IsType<Result<bool>>(result);
        Assert.Equal(testId, repository.LastExistsCheckId);
    }

    [Fact]
    public async Task Should_SupportDefaultCancellationToken_When_NotProvided()
    {
        // Given
        var repository = new TestRepository();
        var testId = "test-id";

        // When
        await repository.GetByIdAsync(testId); // No cancellation token provided
        await repository.AddAsync(new TestAggregate("add-id"));
        await repository.UpdateAsync(new TestAggregate("update-id"));
        await repository.DeleteAsync("delete-id");
        await repository.ExistsAsync("exists-id");

        // Then
        // Should not throw exceptions when using default cancellation token
        Assert.True(true); // If we get here, all calls succeeded
    }

    [Fact]
    public async Task Should_HandleCancellation_When_TokenIsCancelled()
    {
        // Given
        var repository = new TestRepository();
        var testId = "test-id";
        using var cts = new CancellationTokenSource();
        cts.Cancel(); // Cancel immediately

        // When/Then
        await Assert.ThrowsAsync<OperationCanceledException>(
            () => repository.GetByIdAsync(testId, cts.Token));
    }

    [Fact]
    public void Should_EnforceGenericConstraints_When_RepositoryDeclared()
    {
        // Given/When/Then
        // This test verifies compile-time constraints
        // TAggregate must be class and implement IAggregateRoot<TId>
        // TId must be class
        var repository = new TestRepository();
        Assert.NotNull(repository);

        // The following would not compile due to constraints:
        // IRepository<int, string> invalidRepo1; // TAggregate must be class
        // IRepository<TestAggregate, int> invalidRepo2; // TId must be class
        // IRepository<TestEntity, string> invalidRepo3; // TAggregate must implement IAggregateRoot<TId>
    }

    [Fact]
    public async Task Should_WorkWithComplexIdTypes_When_UsingCustomIdObject()
    {
        // Given
        var customId = new CustomId("ABC", 123);
        var repository = new TestRepositoryWithCustomId();
        var aggregate = new TestAggregateWithCustomId(customId);

        // When
        var addResult = await repository.AddAsync(aggregate);
        var getResult = await repository.GetByIdAsync(customId);
        var existsResult = await repository.ExistsAsync(customId);

        // Then
        Assert.IsType<Result>(addResult);
        Assert.IsType<Maybe<TestAggregateWithCustomId>>(getResult);
        Assert.IsType<Result<bool>>(existsResult);
    }

    // Test implementations for contract verification
    private class TestRepository : IRepository<TestAggregate, string>
    {
        public TestAggregate? LastAddedAggregate { get; private set; }
        public TestAggregate? LastUpdatedAggregate { get; private set; }
        public string? LastDeletedId { get; private set; }
        public string? LastExistsCheckId { get; private set; }
        public CancellationToken? LastCancellationToken { get; private set; }

        public Task<Maybe<TestAggregate>> GetByIdAsync(string id, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            LastCancellationToken = cancellationToken;
            return Task.FromResult(Maybe<TestAggregate>.None()); // Contract test - implementation can vary
        }

        public Task<Result> AddAsync(TestAggregate aggregate, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            LastAddedAggregate = aggregate;
            return Task.FromResult(Result.Ok());
        }

        public Task<Result> UpdateAsync(TestAggregate aggregate, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            LastUpdatedAggregate = aggregate;
            return Task.FromResult(Result.Ok());
        }

        public Task<Result> DeleteAsync(string id, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            LastDeletedId = id;
            return Task.FromResult(Result.Ok());
        }

        public Task<Result<bool>> ExistsAsync(string id, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            LastExistsCheckId = id;
            return Task.FromResult(Result<bool>.Ok(false)); // Contract test - implementation can vary
        }
    }

    private class TestRepositoryWithCustomId : IRepository<TestAggregateWithCustomId, CustomId>
    {
        public Task<Maybe<TestAggregateWithCustomId>> GetByIdAsync(CustomId id, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Maybe<TestAggregateWithCustomId>.None());
        }

        public Task<Result> AddAsync(TestAggregateWithCustomId aggregate, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Result.Ok());
        }

        public Task<Result> UpdateAsync(TestAggregateWithCustomId aggregate, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Result.Ok());
        }

        public Task<Result> DeleteAsync(CustomId id, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Result.Ok());
        }

        public Task<Result<bool>> ExistsAsync(CustomId id, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Result<bool>.Ok(false));
        }
    }

    private class TestAggregate : AggregateRoot<string>
    {
        public TestAggregate(string id) : base(id)
        {
        }
    }

    private class TestAggregateWithCustomId : AggregateRoot<CustomId>
    {
        public TestAggregateWithCustomId(CustomId id) : base(id)
        {
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