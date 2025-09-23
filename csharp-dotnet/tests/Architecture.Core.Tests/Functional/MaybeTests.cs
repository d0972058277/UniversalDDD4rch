using Architecture.Core.Functional;

namespace Architecture.Core.Tests.Functional;

public class MaybeTests
{
    [Fact]
    public void Should_CreateSomeValue_When_CallingSomeWithValue()
    {
        // Given
        const string expectedValue = "test value";

        // When
        var maybe = Maybe<string>.Some(expectedValue);

        // Then
        maybe.HasValue.Should().BeTrue();
        maybe.Value.Should().Be(expectedValue);
    }

    [Fact]
    public void Should_CreateNoneValue_When_CallingNone()
    {
        // Given - nothing specific

        // When
        var maybe = Maybe<string>.None();

        // Then
        maybe.HasValue.Should().BeFalse();
    }

    [Fact]
    public void Should_ReturnSomeValue_When_MatchingSomeWithValue()
    {
        // Given
        const string value = "original";
        var maybe = Maybe<string>.Some(value);
        const string expectedOutput = "some: original";

        // When
        var actualOutput = maybe.Match(
            onSome: v => $"some: {v}",
            onNone: () => "none"
        );

        // Then
        actualOutput.Should().Be(expectedOutput);
    }

    [Fact]
    public void Should_ReturnNoneValue_When_MatchingNone()
    {
        // Given
        var maybe = Maybe<string>.None();
        const string expectedOutput = "none";

        // When
        var actualOutput = maybe.Match(
            onSome: v => $"some: {v}",
            onNone: () => expectedOutput
        );

        // Then
        actualOutput.Should().Be(expectedOutput);
    }

    [Fact]
    public void Should_MapToNewType_When_MaybeHasValue()
    {
        // Given
        var maybe = Maybe<string>.Some("123");

        // When
        var mappedMaybe = maybe.Map(int.Parse);

        // Then
        mappedMaybe.HasValue.Should().BeTrue();
        mappedMaybe.Value.Should().Be(123);
    }

    [Fact]
    public void Should_ReturnNone_When_MappingNone()
    {
        // Given
        var maybe = Maybe<string>.None();

        // When
        var mappedMaybe = maybe.Map(int.Parse);

        // Then
        mappedMaybe.HasValue.Should().BeFalse();
    }

    [Fact]
    public void Should_BindToNewMaybe_When_MaybeHasValue()
    {
        // Given
        var maybe = Maybe<string>.Some("123");

        // When
        var boundMaybe = maybe.Bind(value =>
            int.TryParse(value, out var parsed)
                ? Maybe<int>.Some(parsed)
                : Maybe<int>.None());

        // Then
        boundMaybe.HasValue.Should().BeTrue();
        boundMaybe.Value.Should().Be(123);
    }

    [Fact]
    public void Should_ReturnNone_When_BindingNone()
    {
        // Given
        var maybe = Maybe<string>.None();

        // When
        var boundMaybe = maybe.Bind(value => Maybe<int>.Some(int.Parse(value)));

        // Then
        boundMaybe.HasValue.Should().BeFalse();
    }

    [Fact]
    public void Should_ReturnOriginalValue_When_OrElseWithSome()
    {
        // Given
        const string originalValue = "original";
        var maybe = Maybe<string>.Some(originalValue);
        const string defaultValue = "default";

        // When
        var result = maybe.OrElse(defaultValue);

        // Then
        result.Should().Be(originalValue);
    }

    [Fact]
    public void Should_ReturnDefaultValue_When_OrElseWithNone()
    {
        // Given
        var maybe = Maybe<string>.None();
        const string defaultValue = "default";

        // When
        var result = maybe.OrElse(defaultValue);

        // Then
        result.Should().Be(defaultValue);
    }

    [Fact]
    public void Should_ReturnOriginalValue_When_OrElseWithFactoryAndSome()
    {
        // Given
        const string originalValue = "original";
        var maybe = Maybe<string>.Some(originalValue);
        var factoryCalled = false;

        // When
        var result = maybe.OrElse(() =>
        {
            factoryCalled = true;
            return "default";
        });

        // Then
        result.Should().Be(originalValue);
        factoryCalled.Should().BeFalse();
    }

    [Fact]
    public void Should_CallFactoryAndReturnValue_When_OrElseWithFactoryAndNone()
    {
        // Given
        var maybe = Maybe<string>.None();
        const string defaultValue = "default";
        var factoryCalled = false;

        // When
        var result = maybe.OrElse(() =>
        {
            factoryCalled = true;
            return defaultValue;
        });

        // Then
        result.Should().Be(defaultValue);
        factoryCalled.Should().BeTrue();
    }

    [Fact]
    public void Should_ImplicitlyConvertFromValue_When_AssigningValueToMaybe()
    {
        // Given
        const string value = "test";

        // When
        Maybe<string> maybe = value;

        // Then
        maybe.HasValue.Should().BeTrue();
        maybe.Value.Should().Be(value);
    }

    [Fact]
    public void Should_ImplicitlyConvertFromNull_When_AssigningNullToMaybe()
    {
        // Given
        string? nullValue = null;

        // When
        Maybe<string> maybe = nullValue!;

        // Then
        maybe.HasValue.Should().BeFalse();
    }

    [Fact]
    public void Should_ConvertToSuccessResult_When_ToResultWithSome()
    {
        // Given
        const string value = "test";
        var maybe = Maybe<string>.Some(value);
        var errorWhenNone = Error.Domain("Test.NotFound", "Value not found");

        // When
        var result = maybe.ToResult(errorWhenNone);

        // Then
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be(value);
    }

    [Fact]
    public void Should_ConvertToFailureResult_When_ToResultWithNone()
    {
        // Given
        var maybe = Maybe<string>.None();
        var errorWhenNone = Error.Domain("Test.NotFound", "Value not found");

        // When
        var result = maybe.ToResult(errorWhenNone);

        // Then
        result.IsFailure.Should().BeTrue();
        result.Error.Should().Be(errorWhenNone);
    }

    [Fact]
    public void Should_BeEqual_When_ComparingTwoSomesWithSameValue()
    {
        // Given
        var maybe1 = Maybe<string>.Some("test");
        var maybe2 = Maybe<string>.Some("test");

        // When & Then
        maybe1.Should().Be(maybe2);
        (maybe1 == maybe2).Should().BeTrue();
        (maybe1 != maybe2).Should().BeFalse();
        maybe1.GetHashCode().Should().Be(maybe2.GetHashCode());
    }

    [Fact]
    public void Should_BeEqual_When_ComparingTwoNones()
    {
        // Given
        var maybe1 = Maybe<string>.None();
        var maybe2 = Maybe<string>.None();

        // When & Then
        maybe1.Should().Be(maybe2);
        (maybe1 == maybe2).Should().BeTrue();
        (maybe1 != maybe2).Should().BeFalse();
        maybe1.GetHashCode().Should().Be(maybe2.GetHashCode());
    }

    [Fact]
    public void Should_NotBeEqual_When_ComparingSomeWithNone()
    {
        // Given
        var some = Maybe<string>.Some("test");
        var none = Maybe<string>.None();

        // When & Then
        some.Should().NotBe(none);
        (some == none).Should().BeFalse();
        (some != none).Should().BeTrue();
    }

    [Fact]
    public void Should_NotBeEqual_When_ComparingSomesWithDifferentValues()
    {
        // Given
        var maybe1 = Maybe<string>.Some("test1");
        var maybe2 = Maybe<string>.Some("test2");

        // When & Then
        maybe1.Should().NotBe(maybe2);
        (maybe1 == maybe2).Should().BeFalse();
        (maybe1 != maybe2).Should().BeTrue();
    }

    [Fact]
    public void Should_ThrowException_When_AccessingValueOnNone()
    {
        // Given
        var maybe = Maybe<string>.None();

        // When & Then
        var action = () => _ = maybe.Value;
        action.Should().Throw<InvalidOperationException>()
            .WithMessage("Cannot access Value when Maybe has no value");
    }

    [Theory]
    [InlineData(null)]
    public void Should_CreateNone_When_SomeCalledWithNull(string? nullValue)
    {
        // Given & When
        var maybe = Maybe<string>.Some(nullValue!);

        // Then
        maybe.HasValue.Should().BeFalse();
    }

    [Fact]
    public void Should_ProvideStringRepresentation_When_CallingToStringOnSome()
    {
        // Given
        var maybe = Maybe<string>.Some("test");

        // When
        var stringRepresentation = maybe.ToString();

        // Then
        stringRepresentation.Should().Be("Some(test)");
    }

    [Fact]
    public void Should_ProvideStringRepresentation_When_CallingToStringOnNone()
    {
        // Given
        var maybe = Maybe<string>.None();

        // When
        var stringRepresentation = maybe.ToString();

        // Then
        stringRepresentation.Should().Be("None");
    }
}