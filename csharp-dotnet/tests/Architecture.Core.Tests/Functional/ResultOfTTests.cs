using Architecture.Core.Functional;

namespace Architecture.Core.Tests.Functional;

public class ResultOfTTests
{
    [Fact]
    public void Should_CreateSuccessResult_When_CallingOkWithValue()
    {
        // Given
        const string expectedValue = "test value";

        // When
        var result = Result<string>.Ok(expectedValue);

        // Then
        result.IsSuccess.Should().BeTrue();
        result.IsFailure.Should().BeFalse();
        result.Value.Should().Be(expectedValue);
    }

    [Fact]
    public void Should_CreateFailureResult_When_CallingFailWithError()
    {
        // Given
        var error = Error.Domain("Test.Error", "Test error message");

        // When
        var result = Result<string>.Fail(error);

        // Then
        result.IsSuccess.Should().BeFalse();
        result.IsFailure.Should().BeTrue();
        result.Error.Should().Be(error);
    }

    [Fact]
    public void Should_ReturnSuccessValue_When_MatchingSuccessResult()
    {
        // Given
        const string value = "original";
        var result = Result<string>.Ok(value);
        const string expectedOutput = "success: original";

        // When
        var actualOutput = result.Match(
            onSuccess: v => $"success: {v}",
            onFailure: error => $"failure: {error.Message}"
        );

        // Then
        actualOutput.Should().Be(expectedOutput);
    }

    [Fact]
    public void Should_ReturnFailureValue_When_MatchingFailureResult()
    {
        // Given
        var error = Error.Domain("Test.Error", "Test error");
        var result = Result<string>.Fail(error);
        const string expectedOutput = "failure: Test error";

        // When
        var actualOutput = result.Match(
            onSuccess: v => $"success: {v}",
            onFailure: err => $"failure: {err.Message}"
        );

        // Then
        actualOutput.Should().Be(expectedOutput);
    }

    [Fact]
    public void Should_MapToNewType_When_ResultIsSuccess()
    {
        // Given
        var result = Result<string>.Ok("123");

        // When
        var mappedResult = result.Map(int.Parse);

        // Then
        mappedResult.IsSuccess.Should().BeTrue();
        mappedResult.Value.Should().Be(123);
    }

    [Fact]
    public void Should_ReturnFailure_When_MappingFailureResult()
    {
        // Given
        var error = Error.Domain("Test.Error", "Test error");
        var result = Result<string>.Fail(error);

        // When
        var mappedResult = result.Map(int.Parse);

        // Then
        mappedResult.IsFailure.Should().BeTrue();
        mappedResult.Error.Should().Be(error);
    }

    [Fact]
    public void Should_BindToNewResult_When_ResultIsSuccess()
    {
        // Given
        var result = Result<string>.Ok("123");

        // When
        var boundResult = result.Bind(value =>
            int.TryParse(value, out var parsed)
                ? Result<int>.Ok(parsed)
                : Result<int>.Fail(Error.Validation("Parse.Failed", "Could not parse")));

        // Then
        boundResult.IsSuccess.Should().BeTrue();
        boundResult.Value.Should().Be(123);
    }

    [Fact]
    public void Should_ReturnFailure_When_BindingFailureResult()
    {
        // Given
        var error = Error.Domain("Test.Error", "Test error");
        var result = Result<string>.Fail(error);

        // When
        var boundResult = result.Bind(value => Result<int>.Ok(int.Parse(value)));

        // Then
        boundResult.IsFailure.Should().BeTrue();
        boundResult.Error.Should().Be(error);
    }

    [Fact]
    public void Should_ImplicitlyConvertFromValue_When_AssigningValueToResult()
    {
        // Given
        const string value = "test";

        // When
        Result<string> result = value;

        // Then
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be(value);
    }

    [Fact]
    public void Should_ImplicitlyConvertFromError_When_AssigningErrorToResult()
    {
        // Given
        var error = Error.Domain("Test.Error", "Test error");

        // When
        Result<string> result = error;

        // Then
        result.IsFailure.Should().BeTrue();
        result.Error.Should().Be(error);
    }

    [Fact]
    public void Should_CreateFromMaybe_When_MaybeHasValue()
    {
        // Given
        var maybe = Maybe<string>.Some("test");
        var errorWhenNone = Error.Domain("Test.NotFound", "Value not found");

        // When
        var result = Result<string>.From(maybe, errorWhenNone);

        // Then
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be("test");
    }

    [Fact]
    public void Should_CreateFailureFromMaybe_When_MaybeHasNoValue()
    {
        // Given
        var maybe = Maybe<string>.None();
        var errorWhenNone = Error.Domain("Test.NotFound", "Value not found");

        // When
        var result = Result<string>.From(maybe, errorWhenNone);

        // Then
        result.IsFailure.Should().BeTrue();
        result.Error.Should().Be(errorWhenNone);
    }

    [Fact]
    public void Should_BeEqual_When_ComparingTwoSuccessResultsWithSameValue()
    {
        // Given
        var result1 = Result<string>.Ok("test");
        var result2 = Result<string>.Ok("test");

        // When & Then
        result1.Should().Be(result2);
        (result1 == result2).Should().BeTrue();
        (result1 != result2).Should().BeFalse();
    }

    [Fact]
    public void Should_NotBeEqual_When_ComparingSuccessResultsWithDifferentValues()
    {
        // Given
        var result1 = Result<string>.Ok("test1");
        var result2 = Result<string>.Ok("test2");

        // When & Then
        result1.Should().NotBe(result2);
        (result1 == result2).Should().BeFalse();
        (result1 != result2).Should().BeTrue();
    }

    [Fact]
    public void Should_ThrowException_When_AccessingValueOnFailureResult()
    {
        // Given
        var error = Error.Domain("Test.Error", "Test error");
        var result = Result<string>.Fail(error);

        // When & Then
        var action = () => _ = result.Value;
        action.Should().Throw<InvalidOperationException>()
            .WithMessage("Cannot access Value when Result is in failure state");
    }

    [Fact]
    public void Should_ThrowException_When_AccessingErrorOnSuccessResult()
    {
        // Given
        var result = Result<string>.Ok("test");

        // When & Then
        var action = () => _ = result.Error;
        action.Should().Throw<InvalidOperationException>()
            .WithMessage("Cannot access Error when Result is in success state");
    }
}