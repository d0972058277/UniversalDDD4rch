// Copyright (c) 2025 Universal DDD Architecture. All rights reserved.

using System;
using System.Threading;
using System.Threading.Tasks;
using Architecture.Core.Functional;
using Architecture.Shell.Cqrs.Tests.TestHelpers;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Xunit;

namespace Architecture.Shell.Cqrs.Tests;

/// <summary>
/// Tests for ServiceCollectionExtensions DI registration.
/// Validates T182: AddCqrs() extension method with handler scanning and mediator registration.
/// </summary>
public class ServiceCollectionExtensionsTests
{
    /// <summary>
    /// Should_RegisterMediator_When_AddCqrsCalledWithAssemblyScanning.
    /// Validates that AddCqrs() registers IMediator and scans assembly for handlers.
    /// </summary>
    [Fact]
    public void Should_RegisterMediator_When_AddCqrsCalledWithAssemblyScanning()
    {
        // Given: Service collection with AddCqrs configuration
        var services = new ServiceCollection();
        services.AddLogging();

        services.AddCqrs(config =>
        {
            config.RegisterHandlersFromAssembly(typeof(TestCommandHandler).Assembly);
        });

        // When: Service provider is built
        var serviceProvider = services.BuildServiceProvider();

        // Then: IMediator is registered and can be resolved
        var mediator = serviceProvider.GetService<IMediator>();
        Assert.NotNull(mediator);
        Assert.IsType<Mediator>(mediator);
    }

    /// <summary>
    /// Should_RegisterHandlers_When_AssemblyScanned.
    /// Validates that RegisterHandlersFromAssembly() finds and registers all handlers.
    /// </summary>
    [Fact]
    public void Should_RegisterHandlers_When_AssemblyScanned()
    {
        // Given: Service collection with assembly scanning
        var services = new ServiceCollection();
        services.AddLogging();

        services.AddCqrs(config =>
        {
            config.RegisterHandlersFromAssembly(typeof(TestCommandHandler).Assembly);
        });

        var serviceProvider = services.BuildServiceProvider();

        // When: Resolve handler interfaces
        var commandHandler = serviceProvider.GetService<ICommandHandler<TestCommand, Result<string>>>();
        var queryHandler = serviceProvider.GetService<IQueryHandler<TestHelpers.TestQuery, string>>();
        var voidCommandHandler = serviceProvider.GetService<ICommandHandler<VoidTestCommand>>();

        // Then: Handlers are registered
        Assert.NotNull(commandHandler);
        Assert.NotNull(queryHandler);
        Assert.NotNull(voidCommandHandler);
    }

    /// <summary>
    /// Should_ExecuteCommand_When_MediatorResolvedFromDI.
    /// Validates end-to-end: DI registration → handler resolution → command execution.
    /// </summary>
    [Fact]
    public async Task Should_ExecuteCommand_When_MediatorResolvedFromDI()
    {
        // Given: Full DI setup with mediator and handlers
        var services = new ServiceCollection();
        services.AddLogging();

        services.AddCqrs(config =>
        {
            config.RegisterHandlersFromAssembly(typeof(TestCommandHandler).Assembly);
        });

        var serviceProvider = services.BuildServiceProvider();
        var mediator = serviceProvider.GetRequiredService<IMediator>();

        // When: Command is executed through mediator
        var command = new TestCommand("test data");
        var result = await mediator.SendAsync<Result<string>>(command, CancellationToken.None);

        // Then: Command is handled successfully
        Assert.True(result.IsSuccess);
        Assert.Contains("Processed: test data", result.Value);
    }

    /// <summary>
    /// Should_ThrowException_When_MultipleHandlersRegisteredForSameRequest.
    /// Validates FR-008: AddCqrs() detects ambiguous handler registration at configuration time.
    /// Note: This test uses manual registration instead of assembly scanning to avoid
    /// interference from test helpers.
    /// </summary>
    [Fact]
    public void Should_ThrowException_When_MultipleHandlersRegisteredForSameRequest()
    {
        // Given: Service collection with duplicate handler registrations
        var services = new ServiceCollection();
        services.AddLogging();

        // Manually register the same handler twice
        services.AddScoped<IRequestHandler<TestCommand, Result<string>>, TestCommandHandler>();
        services.AddScoped<IRequestHandler<TestCommand, Result<string>>, TestCommandHandler>();

        // When/Then: AddCqrs() validates and should detect the duplicate
        var ex = Assert.Throws<InvalidOperationException>(() =>
        {
            services.AddCqrs(config =>
            {
                // Don't scan assembly - just trigger validation by manually tracking the registration
                // Since we registered IRequestHandler<> directly, we need to mimic what
                // RegisterHandlersFromAssembly() does
                var field = config.GetType().GetField("HandlerRegistrations",
                    System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);

                var list = field?.GetValue(config);
                var addMethod = list?.GetType().GetMethod("Add");

                var registrationType = Type.GetType("Architecture.Shell.Cqrs.HandlerRegistration, Architecture.Shell.Cqrs");
                var registration = Activator.CreateInstance(registrationType!, typeof(TestCommand), typeof(Result<string>));

                addMethod?.Invoke(list, new[] { registration });
            });
        });

        Assert.Contains("Multiple handlers", ex.Message);
        Assert.Contains("TestCommand", ex.Message);
    }

    /// <summary>
    /// Should_AddBehavior_When_ConfiguredWithFactoryMethod.
    /// Validates that specific behaviors can be registered for request/response pairs.
    /// </summary>
    [Fact]
    public void Should_AddBehavior_When_ConfiguredWithFactoryMethod()
    {
        // Given: Service collection with behavior registration
        var services = new ServiceCollection();
        services.AddLogging();

        services.AddCqrs(config =>
        {
            config.RegisterHandlersFromAssembly(typeof(TestCommandHandler).Assembly);

            // Register a telemetry behavior for TestCommand
            config.AddBehavior<TestCommand, Result<string>>(sp =>
                new Behaviors.TelemetryBehavior<TestCommand, Result<string>>(
                    sp.GetRequiredService<ILogger<Behaviors.TelemetryBehavior<TestCommand, Result<string>>>>()));
        });

        var serviceProvider = services.BuildServiceProvider();

        // When: Resolve behavior
        var behavior = serviceProvider.GetService<IPipelineBehavior<TestCommand, Result<string>>>();

        // Then: Behavior is registered
        Assert.NotNull(behavior);
        Assert.IsType<Behaviors.TelemetryBehavior<TestCommand, Result<string>>>(behavior);
    }
}
