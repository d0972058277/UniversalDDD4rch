using Architecture.Shell.Cqrs;

namespace Architecture.Shell.Cqrs.Tests;

/// <summary>
/// UT-007: BehaviorMatcher Type Guards
/// </summary>
public class BehaviorMatcherTests
{
    // UT-007: T061b
    [Fact]
    public void Should_MatchCommands_When_IsCommandGuardUsed()
    {
        // Given: BehaviorMatcher configured to match only commands
        var commandMatcher = new CommandOnlyMatcher();
        var queryMatcher = new QueryOnlyMatcher();

        var command = new TestCommand();
        var query = new TestQuery { Id = 1 };

        // When: Matcher is evaluated against command and query
        var commandMatchesCommandMatcher = commandMatcher.Matches(command);
        var queryMatchesCommandMatcher = commandMatcher.Matches(query);
        var commandMatchesQueryMatcher = queryMatcher.Matches(command);
        var queryMatchesQueryMatcher = queryMatcher.Matches(query);

        // Then: Command matcher should only match commands
        commandMatchesCommandMatcher.Should().BeTrue();
        queryMatchesCommandMatcher.Should().BeFalse();

        // And: Query matcher should only match queries
        commandMatchesQueryMatcher.Should().BeFalse();
        queryMatchesQueryMatcher.Should().BeTrue();
    }

    [Fact]
    public void Should_MatchAllRequests_When_AllRequestsMatcherUsed()
    {
        // Given: BehaviorMatcher configured to match all requests
        var allMatcher = new AllRequestsMatcher();

        var command = new TestCommand();
        var query = new TestQuery { Id = 1 };

        // When: Matcher is evaluated
        var commandMatches = allMatcher.Matches(command);
        var queryMatches = allMatcher.Matches(query);

        // Then: Both should match
        commandMatches.Should().BeTrue();
        queryMatches.Should().BeTrue();
    }
}

// Matcher implementations
public class CommandOnlyMatcher : IBehaviorMatcher
{
    public bool Matches<TRequest>(TRequest request) where TRequest : IBaseRequest
    {
        return request is ICommand;
    }
}

public class QueryOnlyMatcher : IBehaviorMatcher
{
    public bool Matches<TRequest>(TRequest request) where TRequest : IBaseRequest
    {
        var requestType = typeof(TRequest);
        return requestType.GetInterfaces().Any(i =>
            i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IQuery<>));
    }
}

public class AllRequestsMatcher : IBehaviorMatcher
{
    public bool Matches<TRequest>(TRequest request) where TRequest : IBaseRequest
    {
        return true;
    }
}
