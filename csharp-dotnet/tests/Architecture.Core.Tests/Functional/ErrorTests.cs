using Architecture.Core.Functional;

namespace Architecture.Core.Tests.Functional;

public class ErrorTests
{
    [Fact]
    public void Should_CreateDomainError_When_CallingDomainMethod()
    {
        // Given
        const string code = "Domain.Business.Rule";
        const string message = "Business rule violation";

        // When
        var error = Error.Domain(code, message);

        // Then
        error.Code.Should().Be(code);
        error.Message.Should().Be(message);
        error.Category.Should().Be(ErrorCategory.Domain);
        error.Metadata.Should().BeEmpty();
    }

    [Fact]
    public void Should_CreateValidationError_When_CallingValidationMethod()
    {
        // Given
        const string code = "Validation.Required";
        const string message = "Field is required";

        // When
        var error = Error.Validation(code, message);

        // Then
        error.Code.Should().Be(code);
        error.Message.Should().Be(message);
        error.Category.Should().Be(ErrorCategory.Validation);
        error.Metadata.Should().BeEmpty();
    }

    [Fact]
    public void Should_CreateInfrastructureError_When_CallingInfrastructureMethod()
    {
        // Given
        const string code = "Infrastructure.Database";
        const string message = "Database connection failed";

        // When
        var error = Error.Infrastructure(code, message);

        // Then
        error.Code.Should().Be(code);
        error.Message.Should().Be(message);
        error.Category.Should().Be(ErrorCategory.Infrastructure);
        error.Metadata.Should().BeEmpty();
    }

    [Fact]
    public void Should_CreateConcurrencyError_When_CallingConcurrencyMethod()
    {
        // Given
        const string code = "Concurrency.OptimisticLock";
        const string message = "Optimistic concurrency failure";

        // When
        var error = Error.Concurrency(code, message);

        // Then
        error.Code.Should().Be(code);
        error.Message.Should().Be(message);
        error.Category.Should().Be(ErrorCategory.Concurrency);
        error.Metadata.Should().BeEmpty();
    }

    [Fact]
    public void Should_CreateSecurityError_When_CallingSecurityMethod()
    {
        // Given
        const string code = "Security.Unauthorized";
        const string message = "User not authorized";

        // When
        var error = Error.Security(code, message);

        // Then
        error.Code.Should().Be(code);
        error.Message.Should().Be(message);
        error.Category.Should().Be(ErrorCategory.Security);
        error.Metadata.Should().BeEmpty();
    }

    [Fact]
    public void Should_IncludeMetadata_When_ProvidingMetadataToFactoryMethod()
    {
        // Given
        const string code = "Test.Error";
        const string message = "Test error with metadata";
        var metadata = new Dictionary<string, object>
        {
            ["UserId"] = "user123",
            ["RequestId"] = Guid.NewGuid(),
            ["Timestamp"] = DateTimeOffset.UtcNow
        };

        // When
        var error = Error.Domain(code, message, metadata);

        // Then
        error.Code.Should().Be(code);
        error.Message.Should().Be(message);
        error.Category.Should().Be(ErrorCategory.Domain);
        error.Metadata.Should().HaveCount(3);
        error.Metadata["UserId"].Should().Be("user123");
        error.Metadata.Should().ContainKey("RequestId");
        error.Metadata.Should().ContainKey("Timestamp");
    }

    [Fact]
    public void Should_BeEqual_When_ComparingErrorsWithSameCodeAndMessage()
    {
        // Given
        const string code = "Test.Error";
        const string message = "Test error message";
        var error1 = Error.Domain(code, message);
        var error2 = Error.Domain(code, message);

        // When & Then
        error1.Should().Be(error2);
        (error1 == error2).Should().BeTrue();
        (error1 != error2).Should().BeFalse();
        error1.GetHashCode().Should().Be(error2.GetHashCode());
    }

    [Fact]
    public void Should_NotBeEqual_When_ComparingErrorsWithDifferentCodes()
    {
        // Given
        var error1 = Error.Domain("Test.Error1", "Test error");
        var error2 = Error.Domain("Test.Error2", "Test error");

        // When & Then
        error1.Should().NotBe(error2);
        (error1 == error2).Should().BeFalse();
        (error1 != error2).Should().BeTrue();
    }

    [Fact]
    public void Should_NotBeEqual_When_ComparingErrorsWithDifferentMessages()
    {
        // Given
        var error1 = Error.Domain("Test.Error", "Test error 1");
        var error2 = Error.Domain("Test.Error", "Test error 2");

        // When & Then
        error1.Should().NotBe(error2);
        (error1 == error2).Should().BeFalse();
        (error1 != error2).Should().BeTrue();
    }

    [Fact]
    public void Should_NotBeEqual_When_ComparingErrorsWithDifferentCategories()
    {
        // Given
        var error1 = Error.Domain("Test.Error", "Test error");
        var error2 = Error.Validation("Test.Error", "Test error");

        // When & Then
        error1.Should().NotBe(error2);
        (error1 == error2).Should().BeFalse();
        (error1 != error2).Should().BeTrue();
    }

    [Fact]
    public void Should_HandleNullMetadata_When_PassingNullToDomainMethod()
    {
        // Given
        const string code = "Test.Error";
        const string message = "Test error";

        // When
        var error = Error.Domain(code, message, null);

        // Then
        error.Metadata.Should().NotBeNull();
        error.Metadata.Should().BeEmpty();
    }

    [Fact]
    public void Should_HaveReadOnlyMetadata_When_AccessingMetadataProperty()
    {
        // Given
        var metadata = new Dictionary<string, object> { ["key"] = "value" };
        var error = Error.Domain("Test.Error", "Test error", metadata);

        // When & Then
        error.Metadata.Should().BeAssignableTo<IReadOnlyDictionary<string, object>>();
    }

    [Fact]
    public void Should_ProvideStringRepresentation_When_CallingToString()
    {
        // Given
        var error = Error.Domain("Test.Error", "Test error message");

        // When
        var stringRepresentation = error.ToString();

        // Then
        stringRepresentation.Should().Contain("Test.Error");
        stringRepresentation.Should().Contain("Test error message");
        stringRepresentation.Should().Contain("Domain");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Should_ThrowException_When_CreatingErrorWithEmptyCode(string invalidCode)
    {
        // Given & When & Then
        var action = () => Error.Domain(invalidCode, "Valid message");
        action.Should().Throw<ArgumentException>()
            .WithParameterName("code");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Should_ThrowException_When_CreatingErrorWithEmptyMessage(string invalidMessage)
    {
        // Given & When & Then
        var action = () => Error.Domain("Valid.Code", invalidMessage);
        action.Should().Throw<ArgumentException>()
            .WithParameterName("message");
    }

    [Fact]
    public void Should_ThrowException_When_CreatingErrorWithNullCode()
    {
        // Given & When & Then
        var action = () => Error.Domain(null!, "Valid message");
        action.Should().Throw<ArgumentNullException>()
            .WithParameterName("code");
    }

    [Fact]
    public void Should_ThrowException_When_CreatingErrorWithNullMessage()
    {
        // Given & When & Then
        var action = () => Error.Domain("Valid.Code", null!);
        action.Should().Throw<ArgumentNullException>()
            .WithParameterName("message");
    }
}