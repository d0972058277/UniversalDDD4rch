using Architecture.Core.Functional;

namespace Architecture.Core.Tests.Functional;

/// <summary>
/// Tests that verify Maybe type follows monadic laws:
/// - Left Identity: Bind(Return(a), f) = f(a)
/// - Right Identity: Bind(m, Return) = m
/// - Associativity: Bind(Bind(m, f), g) = Bind(m, x => Bind(f(x), g))
/// </summary>
public class MaybeMonadicLawsTests
{
    [Fact]
    public void Should_SatisfyLeftIdentityLaw_When_BindingSomeWithFunction()
    {
        // Given
        const string value = "test";
        Func<string, Maybe<int>> function = s => Maybe<int>.Some(s.Length);

        // When
        var leftSide = Maybe<string>.Some(value).Bind(function);
        var rightSide = function(value);

        // Then
        leftSide.Should().Be(rightSide);
    }

    [Fact]
    public void Should_SatisfyRightIdentityLaw_When_BindingWithReturn()
    {
        // Given
        var maybe = Maybe<string>.Some("test");

        // When
        var leftSide = maybe.Bind(Maybe<string>.Some);
        var rightSide = maybe;

        // Then
        leftSide.Should().Be(rightSide);
    }

    [Fact]
    public void Should_SatisfyRightIdentityLaw_When_BindingNoneWithReturn()
    {
        // Given
        var maybe = Maybe<string>.None();

        // When
        var leftSide = maybe.Bind(Maybe<string>.Some);
        var rightSide = maybe;

        // Then
        leftSide.Should().Be(rightSide);
    }

    [Fact]
    public void Should_SatisfyAssociativityLaw_When_BindingNested()
    {
        // Given
        var maybe = Maybe<string>.Some("123");
        Func<string, Maybe<int>> f = s => int.TryParse(s, out var i)
            ? Maybe<int>.Some(i)
            : Maybe<int>.None();
        Func<int, Maybe<string>> g = i => Maybe<string>.Some($"Value: {i}");

        // When
        var leftSide = maybe.Bind(f).Bind(g);
        var rightSide = maybe.Bind(x => f(x).Bind(g));

        // Then
        leftSide.Should().Be(rightSide);
    }

    [Fact]
    public void Should_SatisfyAssociativityLaw_When_BindingNestedWithNone()
    {
        // Given
        var maybe = Maybe<string>.None();
        Func<string, Maybe<int>> f = s => Maybe<int>.Some(s.Length);
        Func<int, Maybe<string>> g = i => Maybe<string>.Some($"Length: {i}");

        // When
        var leftSide = maybe.Bind(f).Bind(g);
        var rightSide = maybe.Bind(x => f(x).Bind(g));

        // Then
        leftSide.Should().Be(rightSide);
        leftSide.HasValue.Should().BeFalse();
    }

    [Fact]
    public void Should_SatisfyAssociativityLaw_When_IntermediateBindingReturnsNone()
    {
        // Given
        var maybe = Maybe<string>.Some("not-a-number");
        Func<string, Maybe<int>> f = s => Maybe<int>.None();
        Func<int, Maybe<string>> g = i => Maybe<string>.Some($"Value: {i}");

        // When
        var leftSide = maybe.Bind(f).Bind(g);
        var rightSide = maybe.Bind(x => f(x).Bind(g));

        // Then
        leftSide.Should().Be(rightSide);
        leftSide.HasValue.Should().BeFalse();
    }

    [Fact]
    public void Should_SatisfyLeftIdentityLaw_When_UsingMapInsteadOfBind()
    {
        // Given
        const string value = "test";
        Func<string, int> function = s => s.Length;

        // When
        var leftSide = Maybe<string>.Some(value).Map(function);
        var rightSide = Maybe<int>.Some(function(value));

        // Then
        leftSide.Should().Be(rightSide);
    }

    [Fact]
    public void Should_PreserveNone_When_MappingOverNone()
    {
        // Given
        var maybe = Maybe<string>.None();
        Func<string, int> function = s => s.Length;

        // When
        var mappedMaybe = maybe.Map(function);

        // Then
        mappedMaybe.HasValue.Should().BeFalse();
    }

    [Fact]
    public void Should_ComposeCorrectly_When_ChainingMapOperations()
    {
        // Given
        var maybe = Maybe<string>.Some("test");

        // When
        var chainedMaybe = maybe
            .Map(s => s.Length)
            .Map(i => i * 2)
            .Map(i => $"Result: {i}");

        // Then
        chainedMaybe.HasValue.Should().BeTrue();
        chainedMaybe.Value.Should().Be("Result: 8");
    }

    [Fact]
    public void Should_StopChaining_When_AnyMapOperationReturnsNone()
    {
        // Given
        var maybe = Maybe<string>.Some("test");

        // When
        var chainedMaybe = maybe
            .Map(s => s.Length)
            .Bind(i => i > 10
                ? Maybe<int>.Some(i * 2)
                : Maybe<int>.None())
            .Map(i => $"Result: {i}");

        // Then
        chainedMaybe.HasValue.Should().BeFalse();
    }

    [Fact]
    public void Should_SatisfyFunctorLaws_When_UsingMap()
    {
        // Given
        var maybe = Maybe<string>.Some("test");
        Func<string, int> f = s => s.Length;
        Func<int, string> g = i => $"Length: {i}";

        // When & Then - Identity law: map(id) = id
        var identityMapped = maybe.Map(x => x);
        identityMapped.Should().Be(maybe);

        // When & Then - Composition law: map(g ∘ f) = map(g) ∘ map(f)
        var composed = maybe.Map(x => g(f(x)));
        var separate = maybe.Map(f).Map(g);
        composed.Should().Be(separate);
    }

    [Fact]
    public void Should_SatisfyFunctorLaws_When_UsingMapOnNone()
    {
        // Given
        var maybe = Maybe<string>.None();
        Func<string, int> f = s => s.Length;
        Func<int, string> g = i => $"Length: {i}";

        // When & Then - Identity law: map(id) = id
        var identityMapped = maybe.Map(x => x);
        identityMapped.Should().Be(maybe);

        // When & Then - Composition law: map(g ∘ f) = map(g) ∘ map(f)
        var composed = maybe.Map(x => g(f(x)));
        var separate = maybe.Map(f).Map(g);
        composed.Should().Be(separate);
        composed.HasValue.Should().BeFalse();
        separate.HasValue.Should().BeFalse();
    }

    [Fact]
    public void Should_SatisfyMonadLaws_When_ChainingComplexOperations()
    {
        // Given
        var maybe = Maybe<string>.Some("42");

        // When
        var result = maybe
            .Bind(s => int.TryParse(s, out var i) ? Maybe<int>.Some(i) : Maybe<int>.None())
            .Bind(i => i > 0 ? Maybe<int>.Some(i * 2) : Maybe<int>.None())
            .Map(i => $"Final: {i}")
            .OrElse("No value");

        // Then
        result.Should().Be("Final: 84");
    }

    [Fact]
    public void Should_ShortCircuit_When_AnyOperationInChainReturnsNone()
    {
        // Given
        var maybe = Maybe<string>.Some("not-a-number");
        var functionCallCount = 0;

        // When
        var result = maybe
            .Bind(s => int.TryParse(s, out var i) ? Maybe<int>.Some(i) : Maybe<int>.None())
            .Bind(i =>
            {
                functionCallCount++;
                return Maybe<int>.Some(i * 2);
            })
            .Map(i =>
            {
                functionCallCount++;
                return $"Final: {i}";
            })
            .OrElse("No value");

        // Then
        result.Should().Be("No value");
        functionCallCount.Should().Be(0); // Functions after None should not be called
    }
}