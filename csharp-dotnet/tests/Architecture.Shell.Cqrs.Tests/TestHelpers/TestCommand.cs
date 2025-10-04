// Copyright (c) 2025 Universal DDD Architecture. All rights reserved.

using Architecture.Core.Functional;

namespace Architecture.Shell.Cqrs.Tests.TestHelpers;

/// <summary>
/// Test command that returns a result.
/// </summary>
public sealed record TestCommand(string Data) : ICommand<Result<string>>;

/// <summary>
/// Test command with no return value.
/// </summary>
public sealed record VoidTestCommand(string Data) : ICommand;

/// <summary>
/// Test command that will fail during execution.
/// </summary>
public sealed record FailingCommand(bool ShouldThrow) : ICommand<Result<string>>;

/// <summary>
/// Test command for nested command scenarios.
/// </summary>
public sealed record OuterCommand(string OuterData, string InnerData) : ICommand<Result<string>>;

/// <summary>
/// Test command for nested command scenarios (inner command).
/// </summary>
public sealed record InnerCommand(string Data) : ICommand<Result<string>>;
