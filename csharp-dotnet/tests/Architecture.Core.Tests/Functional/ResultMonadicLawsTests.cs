using Architecture.Core.Functional;

namespace Architecture.Core.Tests.Functional;

/// <summary>
/// Tests that verify Result type follows monadic laws:
/// - Left Identity: Bind(Return(a), f) = f(a)
/// - Right Identity: Bind(m, Return) = m
/// - Associativity: Bind(Bind(m, f), g) = Bind(m, x => Bind(f(x), g))
/// </summary>
public class ResultMonadicLawsTests
{
    [Fact]
    public void Should_SatisfyLeftIdentityLaw_When_BindingReturnWithFunction()
    {
        // Given
        const string value = "test";
        Func<string, Result<int>> function = s => Result<int>.Ok(s.Length);

        // When
        var leftSide = Result<string>.Ok(value).Bind(function);
        var rightSide = function(value);

        // Then
        leftSide.Should().Be(rightSide);
    }

    [Fact]
    public void Should_SatisfyRightIdentityLaw_When_BindingWithReturn()
    {
        // Given
        var result = Result<string>.Ok("test");

        // When
        var leftSide = result.Bind(Result<string>.Ok);
        var rightSide = result;

        // Then
        leftSide.Should().Be(rightSide);
    }

    [Fact]
    public void Should_SatisfyRightIdentityLaw_When_BindingFailureWithReturn()
    {
        // Given
        var error = Error.Domain("Test.Error", "Test error");
        var result = Result<string>.Fail(error);

        // When
        var leftSide = result.Bind(Result<string>.Ok);
        var rightSide = result;

        // Then
        leftSide.Should().Be(rightSide);
    }

    [Fact]
    public void Should_SatisfyAssociativityLaw_When_BindingNested()
    {
        // Given
        var result = Result<string>.Ok("123");
        Func<string, Result<int>> f = s => int.TryParse(s, out var i)
            ? Result<int>.Ok(i)
            : Result<int>.Fail(Error.Validation("Parse.Failed", "Failed to parse"));
        Func<int, Result<string>> g = i => Result<string>.Ok($"Value: {i}");

        // When
        var leftSide = result.Bind(f).Bind(g);
        var rightSide = result.Bind(x => f(x).Bind(g));

        // Then
        leftSide.Should().Be(rightSide);
    }

    [Fact]
    public void Should_SatisfyAssociativityLaw_When_BindingNestedWithFailure()
    {
        // Given
        var error = Error.Domain("Test.Error", "Initial error");
        var result = Result<string>.Fail(error);
        Func<string, Result<int>> f = s => Result<int>.Ok(s.Length);
        Func<int, Result<string>> g = i => Result<string>.Ok($"Length: {i}");

        // When
        var leftSide = result.Bind(f).Bind(g);
        var rightSide = result.Bind(x => f(x).Bind(g));

        // Then
        leftSide.Should().Be(rightSide);
        leftSide.IsFailure.Should().BeTrue();
        leftSide.Error.Should().Be(error);
    }

    [Fact]
    public void Should_SatisfyAssociativityLaw_When_IntermediateBindingFails()
    {
        // Given
        var result = Result<string>.Ok("not-a-number");
        var parseError = Error.Validation("Parse.Failed", "Failed to parse");
        Func<string, Result<int>> f = s => Result<int>.Fail(parseError);
        Func<int, Result<string>> g = i => Result<string>.Ok($"Value: {i}");

        // When
        var leftSide = result.Bind(f).Bind(g);
        var rightSide = result.Bind(x => f(x).Bind(g));

        // Then
        leftSide.Should().Be(rightSide);
        leftSide.IsFailure.Should().BeTrue();
        leftSide.Error.Should().Be(parseError);
    }

    [Fact]
    public void Should_SatisfyLeftIdentityLaw_When_UsingMapInsteadOfBind()
    {
        // Given
        const string value = "test";
        Func<string, int> function = s => s.Length;

        // When
        var leftSide = Result<string>.Ok(value).Map(function);
        var rightSide = Result<int>.Ok(function(value));

        // Then
        leftSide.Should().Be(rightSide);
    }

    [Fact]
    public void Should_PreserveFailure_When_MappingOverFailedResult()
    {
        // Given
        var error = Error.Domain("Test.Error", "Test error");
        var result = Result<string>.Fail(error);
        Func<string, int> function = s => s.Length;

        // When
        var mappedResult = result.Map(function);

        // Then
        mappedResult.IsFailure.Should().BeTrue();
        mappedResult.Error.Should().Be(error);
    }

    [Fact]
    public void Should_ComposeCorrectly_When_ChainingMapOperations()
    {
        // Given
        var result = Result<string>.Ok("test");

        // When
        var chainedResult = result
            .Map(s => s.Length)
            .Map(i => i * 2)
            .Map(i => $"Result: {i}");

        // Then
        chainedResult.IsSuccess.Should().BeTrue();
        chainedResult.Value.Should().Be("Result: 8");
    }

    [Fact]
    public void Should_StopChaining_When_AnyMapOperationFails()
    {
        // Given
        var result = Result<string>.Ok("test");
        var error = Error.Validation("Length.Invalid", "Length is invalid");

        // When
        var chainedResult = result
            .Map(s => s.Length)
            .Bind(i => i > 10
                ? Result<int>.Ok(i * 2)
                : Result<int>.Fail(error))
            .Map(i => $"Result: {i}");

        // Then
        chainedResult.IsFailure.Should().BeTrue();
        chainedResult.Error.Should().Be(error);
    }

    [Fact]
    public void Should_SatisfyMonadicLaws_When_UsingNonGenericResult()
    {
        // Given
        var successResult = Result.Ok();
        var error = Error.Domain("Test.Error", "Test error");
        var failureResult = Result.Fail(error);

        // When & Then - Right Identity
        successResult.Bind(() => Result.Ok()).Should().Be(successResult);
        failureResult.Bind(() => Result.Ok()).Should().Be(failureResult);

        // When & Then - Associativity
        var f = () => Result.Ok();
        var g = () => Result.Ok();

        var leftAssoc = successResult.Bind(f).Bind(g);
        var rightAssoc = successResult.Bind(() => f().Bind(g));
        leftAssoc.Should().Be(rightAssoc);
    }
}