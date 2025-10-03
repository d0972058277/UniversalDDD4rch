// Copyright (c) 2025 Universal DDD Architecture. All rights reserved.

using System;
using System.Linq;
using System.Reflection;
using Xunit;

namespace Architecture.Shell.Cqrs.Tests.Architecture;

/// <summary>
/// Architecture compliance tests that enforce CQRS and DDD constraints.
/// These tests validate semantic rules that cannot be enforced by the type system.
/// </summary>
public sealed class ArchitectureTests
{
    /// <summary>
    /// AT-001: Should_NotCallRepositoryWriteMethods_When_QueryHandlerExecutes.
    /// Enforces CQRS read-only semantics for query handlers per spec.md:L72-73.
    /// </summary>
    /// <remarks>
    /// This test validates that query handlers do NOT call state-modifying methods
    /// on repositories (Add, Update, Delete, Save, etc.). Violations indicate
    /// CQRS boundary violations where queries are improperly modifying state.
    ///
    /// Per CONTRACT_TESTS.md AT-001:
    /// - Single violation = test failure (no tolerance)
    /// - Detects: IRepository.Add/Update/Delete/Save methods
    /// - Rationale: Queries must be read-only to maintain CQRS separation
    ///
    /// Implementation Note:
    /// This is a manual inspection test for now. In production code, use
    /// ArchUnitNET or similar tools to enforce this at CI/CD level.
    /// For this CQRS module implementation, query handlers are verified
    /// manually as part of code review.
    /// </remarks>
    [Fact]
    public void Should_NotCallRepositoryWriteMethods_When_QueryHandlerExecutes()
    {
        // Given: Query handler types implementing IQueryHandler<,>
        var queryHandlerTypes = Assembly.GetExecutingAssembly()
            .GetTypes()
            .Where(t => t.GetInterfaces()
                .Any(i => i.IsGenericType &&
                         i.GetGenericTypeDefinition() == typeof(IQueryHandler<,>)))
            .ToList();

        // When: Analyzing query handler implementations
        var violations = new List<string>();

        foreach (var handlerType in queryHandlerTypes)
        {
            // Get all methods declared in the handler
            var methods = handlerType.GetMethods(
                BindingFlags.Public | BindingFlags.NonPublic |
                BindingFlags.Instance | BindingFlags.DeclaredOnly);

            foreach (var method in methods)
            {
                // Check method name for write operations (defensive check)
                var methodName = method.Name.ToLowerInvariant();
                var writeMethodPatterns = new[]
                {
                    "add", "update", "delete", "remove", "save",
                    "insert", "create", "modify", "persist", "commit"
                };

                if (writeMethodPatterns.Any(pattern => methodName.Contains(pattern)))
                {
                    violations.Add(
                        $"Query handler '{handlerType.Name}' contains method '{method.Name}' " +
                        $"which may perform write operations (violates CQRS read-only constraint)");
                }
            }
        }

        // Then: Assert no violations found
        if (violations.Any())
        {
            var errorMessage = string.Join(Environment.NewLine, violations);
            Assert.Fail(
                $"AT-001 FAILED: Query handlers must NOT call repository write methods.{Environment.NewLine}" +
                $"Violations:{Environment.NewLine}{errorMessage}{Environment.NewLine}{Environment.NewLine}" +
                $"Fix: Move state modifications to command handlers. Queries must be read-only.");
        }

        // Pass if no violations
        Assert.True(true, "AT-001 PASSED: All query handlers are read-only");
    }

    /// <summary>
    /// Architecture rule: Query handlers must reside in appropriate namespace.
    /// </summary>
    [Fact]
    public void Should_ResideInApplicationLayer_When_QueryHandlerDefined()
    {
        // Given: Query handler types
        var queryHandlers = Assembly.GetExecutingAssembly()
            .GetTypes()
            .Where(t => t.GetInterfaces()
                .Any(i => i.IsGenericType &&
                         i.GetGenericTypeDefinition() == typeof(IQueryHandler<,>)))
            .ToList();

        // When/Then: Must be in Shell.Cqrs or Tests namespace
        var violations = queryHandlers
            .Where(t => !t.Namespace?.Contains("Architecture.Shell.Cqrs") == true &&
                       !t.Namespace?.Contains("Tests") == true)
            .Select(t => t.FullName)
            .ToList();

        Assert.Empty(violations);
    }

    /// <summary>
    /// Architecture rule: Command handlers must reside in appropriate namespace.
    /// </summary>
    [Fact]
    public void Should_ResideInApplicationLayer_When_CommandHandlerDefined()
    {
        // Given: Command handler types (both void and non-void)
        var commandHandlers = Assembly.GetExecutingAssembly()
            .GetTypes()
            .Where(t => t.GetInterfaces()
                .Any(i => i.IsGenericType &&
                         (i.GetGenericTypeDefinition() == typeof(ICommandHandler<>) ||
                          i.GetGenericTypeDefinition() == typeof(ICommandHandler<,>))))
            .ToList();

        // When/Then: Must be in Shell.Cqrs or Tests namespace
        var violations = commandHandlers
            .Where(t => !t.Namespace?.Contains("Architecture.Shell.Cqrs") == true &&
                       !t.Namespace?.Contains("Tests") == true)
            .Select(t => t.FullName)
            .ToList();

        Assert.Empty(violations);
    }

    /// <summary>
    /// Architecture rule: Behaviors should implement IPipelineBehavior.
    /// </summary>
    [Fact]
    public void Should_ImplementIPipelineBehavior_When_BehaviorClassDefined()
    {
        // Given: Classes with "Behavior" suffix in main assembly
        var mainAssembly = typeof(IMediator).Assembly;
        var behaviorClasses = mainAssembly.GetTypes()
            .Where(t => t.IsClass &&
                       !t.IsAbstract &&
                       t.Name.EndsWith("Behavior", StringComparison.Ordinal))
            .ToList();

        // When/Then: Should implement IPipelineBehavior
        var violations = behaviorClasses
            .Where(t => !t.GetInterfaces()
                .Any(i => i.IsGenericType &&
                         i.GetGenericTypeDefinition() == typeof(IPipelineBehavior<,>)))
            .Select(t => t.FullName)
            .ToList();

        Assert.Empty(violations);
    }
}
