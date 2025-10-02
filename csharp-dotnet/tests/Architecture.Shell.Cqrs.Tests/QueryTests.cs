using Architecture.Core.Functional;
using Architecture.Shell.Cqrs;
using Moq;

namespace Architecture.Shell.Cqrs.Tests;

/// <summary>
/// UT-002: Query Return Type Contracts
/// </summary>
public class QueryTests
{
    // UT-002: T037
    [Fact]
    public async Task Should_ReturnCorrectType_When_QueryHandlerExecutes()
    {
        // Given: A query handler that returns a specific DTO type
        var serviceProvider = new Mock<IServiceProvider>();
        var logger = new Mock<Microsoft.Extensions.Logging.ILogger<IMediator>>();
        var handler = new TestQueryHandler();

        serviceProvider
            .Setup(sp => sp.GetService(typeof(IRequestHandler<TestQuery, TestDto>)))
            .Returns(handler);

        var mediator = new Mediator(serviceProvider.Object, logger.Object);
        var query = new TestQuery { Id = 123 };

        // When: Query is executed through mediator
        var result = await mediator.SendAsync<TestDto>(query, CancellationToken.None);

        // Then: Result should match expected return type
        result.Should().NotBeNull();
        result.Should().BeOfType<TestDto>();
        result.Id.Should().Be(123);
        result.Name.Should().Be("Test");
    }
}

// Test domain types
public record TestQuery : IQuery<TestDto>
{
    public int Id { get; init; }
}

public record TestDto
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
}

public class TestQueryHandler : IQueryHandler<TestQuery, TestDto>
{
    public Task<TestDto> HandleAsync(TestQuery request, CancellationToken cancellationToken)
    {
        return Task.FromResult(new TestDto { Id = request.Id, Name = "Test" });
    }
}
