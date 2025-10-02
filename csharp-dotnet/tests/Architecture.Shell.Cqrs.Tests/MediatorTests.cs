using Architecture.Core.Functional;
using Architecture.Shell.Cqrs;
using Moq;

namespace Architecture.Shell.Cqrs.Tests;

/// <summary>
/// UT-001: Handler Registration Uniqueness Tests
/// UT-001c: Handler Uniqueness at Constructor Time Tests
/// </summary>
public class MediatorTests
{
    // UT-001: T026
    [Fact]
    public void Should_ThrowException_When_ZeroHandlersRegistered()
    {
        // Given: No handlers registered for a specific command type
        var serviceProvider = new Mock<IServiceProvider>();
        var logger = new Mock<Microsoft.Extensions.Logging.ILogger<IMediator>>();

        // Configure service provider to return empty handler collection
        serviceProvider
            .Setup(sp => sp.GetService(It.IsAny<Type>()))
            .Returns((object?)null);

        // When: Mediator is created
        var exception = Record.Exception(() =>
        {
            var mediator = new Mediator(serviceProvider.Object, logger.Object);
            // Attempt to send a command that has no handler
            var command = new TestCommandWithNoHandler();
            var task = mediator.SendAsync(command, CancellationToken.None);
            task.Wait();
        });

        // Then: Should throw an exception indicating no handler found
        exception.Should().NotBeNull();
    }

    // UT-001: T031
    [Fact]
    public void Should_ThrowException_When_MultipleHandlersRegistered()
    {
        // Given: Multiple handlers registered for same command type
        var serviceProvider = new Mock<IServiceProvider>();
        var logger = new Mock<Microsoft.Extensions.Logging.ILogger<IMediator>>();

        // Configure to return multiple handlers (ambiguous)
        var handler1 = new Mock<ICommandHandler<MediatorTestCommand>>();
        var handler2 = new Mock<ICommandHandler<MediatorTestCommand>>();
        var handlers = new object[] { handler1.Object, handler2.Object };

        serviceProvider
            .Setup(sp => sp.GetService(typeof(IEnumerable<ICommandHandler<MediatorTestCommand>>)))
            .Returns(handlers);

        // When: Attempting to create mediator or send command
        var exception = Record.Exception(() =>
        {
            var mediator = new Mediator(serviceProvider.Object, logger.Object);
            var command = new MediatorTestCommand();
            var task = mediator.SendAsync(command, CancellationToken.None);
            task.Wait();
        });

        // Then: Should throw exception about ambiguous handler registration
        exception.Should().NotBeNull();
    }

    // UT-001: T036
    [Fact]
    public async Task Should_ResolveHandler_When_ExactlyOneHandlerRegistered()
    {
        // Given: Exactly one handler registered for command type
        var serviceProvider = new Mock<IServiceProvider>();
        var logger = new Mock<Microsoft.Extensions.Logging.ILogger<IMediator>>();
        var handler = new Mock<ICommandHandler<MediatorTestCommand>>();

        handler
            .Setup(h => h.HandleAsync(It.IsAny<MediatorTestCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result.Ok());

        serviceProvider
            .Setup(sp => sp.GetService(typeof(IRequestHandler<MediatorTestCommand, Result>)))
            .Returns(handler.Object);

        var mediator = new Mediator(serviceProvider.Object, logger.Object);
        var command = new MediatorTestCommand();

        // When: Command is sent through mediator
        var result = await mediator.SendAsync(command, CancellationToken.None);

        // Then: Handler should be invoked successfully
        result.Should().NotBeNull();
        handler.Verify(h => h.HandleAsync(command, It.IsAny<CancellationToken>()), Times.Once);
    }

    // UT-001c: T036b
    [Fact]
    public void Should_ThrowException_When_ConstructorDetectsAmbiguousHandlers()
    {
        // Given: Service provider configured with 2+ handlers for same command type
        var serviceProvider = new Mock<IServiceProvider>();
        var logger = new Mock<Microsoft.Extensions.Logging.ILogger<IMediator>>();

        var handler1 = new TestCommandHandler1();
        var handler2 = new TestCommandHandler2();
        var handlers = new ICommandHandler<MediatorTestCommand>[] { handler1, handler2 };

        serviceProvider
            .Setup(sp => sp.GetService(typeof(IEnumerable<ICommandHandler<MediatorTestCommand>>)))
            .Returns(handlers);

        // When: Mediator constructor/build is called with validator that detects ambiguous handlers
        var exception = Record.Exception(() =>
        {
            var mediator = new Mediator(serviceProvider.Object, logger.Object, sp =>
            {
                // Validator checks for ambiguous handler registration
                var commandHandlers = sp.GetService(typeof(IEnumerable<ICommandHandler<MediatorTestCommand>>)) as IEnumerable<ICommandHandler<MediatorTestCommand>>;
                if (commandHandlers != null && commandHandlers.Count() > 1)
                {
                    var handlerNames = string.Join(", ", commandHandlers.Select(h => h.GetType().Name));
                    throw new InvalidOperationException(
                        $"Ambiguous handler registration detected for 'TestCommand'. " +
                        $"Found multiple handlers: {handlerNames}");
                }
            });
        });

        // Then: Should throw with handler names in error message
        exception.Should().NotBeNull();
        exception.Should().BeOfType<InvalidOperationException>();
        exception.Message.Should().Contain(nameof(TestCommandHandler1));
        exception.Message.Should().Contain(nameof(TestCommandHandler2));
    }
}

// Test domain types
public record MediatorTestCommand : ICommand;
public record TestCommandWithNoHandler : ICommand;

public class TestCommandHandler1 : ICommandHandler<MediatorTestCommand>
{
    public Task<Result> HandleAsync(MediatorTestCommand request, CancellationToken cancellationToken)
    {
        return Task.FromResult(Result.Ok());
    }
}

public class TestCommandHandler2 : ICommandHandler<MediatorTestCommand>
{
    public Task<Result> HandleAsync(MediatorTestCommand request, CancellationToken cancellationToken)
    {
        return Task.FromResult(Result.Ok());
    }
}
