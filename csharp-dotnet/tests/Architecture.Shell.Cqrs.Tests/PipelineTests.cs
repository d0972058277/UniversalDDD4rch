using Architecture.Core.Functional;
using Architecture.Shell.Cqrs;
using Microsoft.Extensions.Logging;
using Moq;

namespace Architecture.Shell.Cqrs.Tests;

/// <summary>
/// UT-003: Pipeline Behavior Execution Order
/// UT-003b: Custom Behavior Order Configuration
/// UT-008: Behavior Order Warning Validation
/// </summary>
public class PipelineTests
{
    // UT-003: T042
    [Fact]
    public async Task Should_ExecuteBehaviorsInOrder_When_RequestProcessed()
    {
        // Given: Multiple behaviors registered with specific order
        var executionLog = new List<string>();
        var serviceProvider = new Mock<IServiceProvider>();
        var logger = new Mock<ILogger<IMediator>>();

        var behavior1 = new TrackingBehavior<TestCommand, Result>("Behavior1", executionLog, order: 10);
        var behavior2 = new TrackingBehavior<TestCommand, Result>("Behavior2", executionLog, order: 20);
        var behavior3 = new TrackingBehavior<TestCommand, Result>("Behavior3", executionLog, order: 30);
        var behaviors = new IPipelineBehavior<TestCommand, Result>[] { behavior3, behavior1, behavior2 };

        var handler = new Mock<ICommandHandler<TestCommand>>();
        handler
            .Setup(h => h.HandleAsync(It.IsAny<TestCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result.Ok())
            .Callback(() => executionLog.Add("Handler"));

        serviceProvider
            .Setup(sp => sp.GetService(typeof(IRequestHandler<TestCommand, Result>)))
            .Returns(handler.Object);
        serviceProvider
            .Setup(sp => sp.GetService(typeof(IEnumerable<IPipelineBehavior<TestCommand, Result>>)))
            .Returns(behaviors);

        var mediator = new Mediator(serviceProvider.Object, logger.Object);
        var command = new TestCommand();

        // When: Command is processed through pipeline
        await mediator.SendAsync(command, CancellationToken.None);

        // Then: Behaviors should execute in order (sorted by Order property)
        executionLog.Should().ContainInOrder("Behavior1-Before", "Behavior2-Before", "Behavior3-Before", "Handler", "Behavior3-After", "Behavior2-After", "Behavior1-After");
    }

    // UT-003b: T042b
    [Fact]
    public async Task Should_AllowCustomOrder_When_BehaviorsConfiguredOutOfRecommendedSequence()
    {
        // Given: Behaviors configured in non-recommended order (Transaction before Validation)
        var executionLog = new List<string>();
        var serviceProvider = new Mock<IServiceProvider>();
        var logger = new Mock<ILogger<IMediator>>();

        // Non-recommended: Transaction (order 10) before Validation (order 20)
        var transactionBehavior = new TrackingBehavior<TestCommand, Result>("Transaction", executionLog, order: 10);
        var validationBehavior = new TrackingBehavior<TestCommand, Result>("Validation", executionLog, order: 20);
        var behaviors = new IPipelineBehavior<TestCommand, Result>[] { transactionBehavior, validationBehavior };

        var handler = new Mock<ICommandHandler<TestCommand>>();
        handler
            .Setup(h => h.HandleAsync(It.IsAny<TestCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result.Ok())
            .Callback(() => executionLog.Add("Handler"));

        serviceProvider
            .Setup(sp => sp.GetService(typeof(IRequestHandler<TestCommand, Result>)))
            .Returns(handler.Object);
        serviceProvider
            .Setup(sp => sp.GetService(typeof(IEnumerable<IPipelineBehavior<TestCommand, Result>>)))
            .Returns(behaviors);

        var mediator = new Mediator(serviceProvider.Object, logger.Object);
        var command = new TestCommand();

        // When: Command is processed
        var result = await mediator.SendAsync(command, CancellationToken.None);

        // Then: System should allow custom order (even if not recommended)
        result.IsSuccess.Should().BeTrue();
        executionLog.Should().ContainInOrder("Transaction-Before", "Validation-Before", "Handler");
    }

    // UT-008: T061g
    [Fact]
    public async Task Should_LogWarning_When_BehaviorOrderDeviatesFromRecommended()
    {
        // Given: Behaviors in non-recommended order
        var serviceProvider = new Mock<IServiceProvider>();
        var loggerMock = new Mock<ILogger<IMediator>>();
        var loggedWarnings = new List<string>();

        // Enable warning logging
        loggerMock
            .Setup(l => l.IsEnabled(LogLevel.Warning))
            .Returns(true);

        // Capture warning logs
        loggerMock
            .Setup(l => l.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()))
            .Callback((LogLevel level, EventId eventId, object state, Exception exception, Delegate formatter) =>
            {
                var message = state?.ToString() ?? string.Empty;
                loggedWarnings.Add(message);
            });

        // Non-recommended order: UnitOfWork (order 5) before Validation (order 10)
        // This should trigger a warning because transaction opens before validation
        var unitOfWorkBehavior = new UnitOfWorkTestBehavior<TestCommand, Result>(order: 5);
        var validationBehavior = new ValidationTestBehavior<TestCommand, Result>(order: 10);
        var behaviors = new IPipelineBehavior<TestCommand, Result>[] { unitOfWorkBehavior, validationBehavior };

        var handler = new Mock<ICommandHandler<TestCommand>>();
        handler.Setup(h => h.HandleAsync(It.IsAny<TestCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result.Ok());

        serviceProvider
            .Setup(sp => sp.GetService(typeof(IRequestHandler<TestCommand, Result>)))
            .Returns(handler.Object);
        serviceProvider
            .Setup(sp => sp.GetService(typeof(IEnumerable<IPipelineBehavior<TestCommand, Result>>)))
            .Returns(behaviors);

        var mediator = new Mediator(serviceProvider.Object, loggerMock.Object);
        var command = new TestCommand();

        // When: Command is processed with non-recommended order
        await mediator.SendAsync(command, CancellationToken.None);

        // Then: Warning should be logged about non-recommended behavior order
        loggedWarnings.Should().Contain(w => w.Contains("behavior order") || w.Contains("recommended"));
    }
}

// Helper behavior for tracking execution
public class TrackingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IBaseRequest
{
    private readonly string _name;
    private readonly List<string> _executionLog;
    private readonly int _order;

    public TrackingBehavior(string name, List<string> executionLog, int order)
    {
        _name = name;
        _executionLog = executionLog;
        _order = order;
    }

    public int Order => _order;

    public async Task<TResponse> HandleAsync(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        _executionLog.Add($"{_name}-Before");
        var response = await next();
        _executionLog.Add($"{_name}-After");
        return response;
    }
}

// Test behaviors with type names matching warning detection logic
public class UnitOfWorkTestBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IBaseRequest
{
    private readonly int _order;

    public UnitOfWorkTestBehavior(int order)
    {
        _order = order;
    }

    public int Order => _order;

    public async Task<TResponse> HandleAsync(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        return await next();
    }
}

public class ValidationTestBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IBaseRequest
{
    private readonly int _order;

    public ValidationTestBehavior(int order)
    {
        _order = order;
    }

    public int Order => _order;

    public async Task<TResponse> HandleAsync(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        return await next();
    }
}
