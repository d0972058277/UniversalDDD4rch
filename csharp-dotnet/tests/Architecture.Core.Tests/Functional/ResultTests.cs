using Architecture.Core.Functional;

namespace Architecture.Core.Tests.Functional;

public class ResultTests
{
    [Fact]
    public void Should_CreateSuccessResult_When_CallingOk()
    {
        // Given - nothing specific

        // When
        var result = Result.Ok();

        // Then
        result.IsSuccess.Should().BeTrue();
        result.IsFailure.Should().BeFalse();
    }

    [Fact]
    public void Should_CreateFailureResult_When_CallingFailWithError()
    {
        // Given
        var error = Error.Domain("Test.Error", "Test error message");

        // When
        var result = Result.Fail(error);

        // Then
        result.IsSuccess.Should().BeFalse();
        result.IsFailure.Should().BeTrue();
        result.Error.Should().Be(error);
    }

    [Fact]
    public void Should_ReturnSuccessValue_When_MatchingSuccessResult()
    {
        // Given
        var result = Result.Ok();
        const string expectedValue = "success";

        // When
        var actualValue = result.Match(
            onSuccess: () => expectedValue,
            onFailure: error => "failure"
        );

        // Then
        actualValue.Should().Be(expectedValue);
    }

    [Fact]
    public void Should_ReturnFailureValue_When_MatchingFailureResult()
    {
        // Given
        var error = Error.Domain("Test.Error", "Test error");
        var result = Result.Fail(error);
        const string expectedValue = "failure";

        // When
        var actualValue = result.Match(
            onSuccess: () => "success",
            onFailure: err => expectedValue
        );

        // Then
        actualValue.Should().Be(expectedValue);
    }

    [Fact]
    public void Should_MapToNewValue_When_ResultIsSuccess()
    {
        // Given
        var result = Result.Ok();
        const string expectedValue = "mapped";

        // When
        var mappedResult = result.Map(() => expectedValue);

        // Then
        mappedResult.IsSuccess.Should().BeTrue();
        mappedResult.Value.Should().Be(expectedValue);
    }

    [Fact]
    public void Should_ReturnFailure_When_MappingFailureResult()
    {
        // Given
        var error = Error.Domain("Test.Error", "Test error");
        var result = Result.Fail(error);

        // When
        var mappedResult = result.Map(() => "mapped");

        // Then
        mappedResult.IsFailure.Should().BeTrue();
        mappedResult.Error.Should().Be(error);
    }

    [Fact]
    public void Should_BindToNewResult_When_ResultIsSuccess()
    {
        // Given
        var result = Result.Ok();
        var expectedResult = Result.Ok();

        // When
        var boundResult = result.Bind(() => expectedResult);

        // Then
        boundResult.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void Should_ReturnFailure_When_BindingFailureResult()
    {
        // Given
        var error = Error.Domain("Test.Error", "Test error");
        var result = Result.Fail(error);

        // When
        var boundResult = result.Bind(() => Result.Ok());

        // Then
        boundResult.IsFailure.Should().BeTrue();
        boundResult.Error.Should().Be(error);
    }

    [Fact]
    public void Should_ImplicitlyConvertFromError_When_AssigningErrorToResult()
    {
        // Given
        var error = Error.Domain("Test.Error", "Test error");

        // When
        Result result = error;

        // Then
        result.IsFailure.Should().BeTrue();
        result.Error.Should().Be(error);
    }

    [Fact]
    public void Should_BeEqual_When_ComparingTwoSuccessResults()
    {
        // Given
        var result1 = Result.Ok();
        var result2 = Result.Ok();

        // When & Then
        result1.Should().Be(result2);
        (result1 == result2).Should().BeTrue();
        (result1 != result2).Should().BeFalse();
    }

    [Fact]
    public void Should_BeEqual_When_ComparingTwoFailureResultsWithSameError()
    {
        // Given
        var error = Error.Domain("Test.Error", "Test error");
        var result1 = Result.Fail(error);
        var result2 = Result.Fail(error);

        // When & Then
        result1.Should().Be(result2);
        (result1 == result2).Should().BeTrue();
        (result1 != result2).Should().BeFalse();
    }

    [Fact]
    public void Should_NotBeEqual_When_ComparingSuccessWithFailure()
    {
        // Given
        var successResult = Result.Ok();
        var failureResult = Result.Fail(Error.Domain("Test.Error", "Test error"));

        // When & Then
        successResult.Should().NotBe(failureResult);
        (successResult == failureResult).Should().BeFalse();
        (successResult != failureResult).Should().BeTrue();
    }
}