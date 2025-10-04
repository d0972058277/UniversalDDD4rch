using Architecture.Core.Functional;
using Architecture.Shell.Cqrs;
using Moq;

namespace Architecture.Shell.Cqrs.Tests;

/// <summary>
/// UT-004: Cancellation Token Propagation
/// </summary>
public class CancellationTests
{
    // UT-004: T047
    [Fact]
    public async Task Should_TerminateEarly_When_CancellationRequested()
    {
        // Given: A long-running command handler that respects cancellation
        var serviceProvider = new Mock<IServiceProvider>();
        var logger = new Mock<Microsoft.Extensions.Logging.ILogger<IMediator>>();
        var handler = new CancellableCommandHandler();

        serviceProvider
            .Setup(sp => sp.GetService(typeof(IRequestHandler<LongRunningCommand, Result>)))
            .Returns(handler);

        var mediator = new Mediator(serviceProvider.Object, logger.Object);
        var command = new LongRunningCommand();
        var cts = new CancellationTokenSource();

        // When: Cancellation is requested during handler execution
        var task = mediator.SendAsync(command, cts.Token);
        cts.CancelAfter(TimeSpan.FromMilliseconds(100)); // Cancel after 100ms

        // Then: Handler should throw OperationCanceledException (or TaskCanceledException)
        var exception = await Record.ExceptionAsync(async () => await task);

        exception.Should().NotBeNull();
        exception.Should().BeAssignableTo<OperationCanceledException>();
        handler.WasCancelled.Should().BeTrue();
    }
}

// Test domain types
public record LongRunningCommand : ICommand;

public class CancellableCommandHandler : ICommandHandler<LongRunningCommand>
{
    public bool WasCancelled { get; private set; }

    public async Task<Result> HandleAsync(LongRunningCommand request, CancellationToken cancellationToken)
    {
        try
        {
            // Simulate long-running operation
            for (int i = 0; i < 100; i++)
            {
                await Task.Delay(50, cancellationToken); // Check cancellation every 50ms
            }
            return Result.Ok();
        }
        catch (OperationCanceledException)
        {
            WasCancelled = true;
            throw;
        }
    }
}
