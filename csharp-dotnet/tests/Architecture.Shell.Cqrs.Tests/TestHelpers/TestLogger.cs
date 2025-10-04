// Copyright (c) 2025 Universal DDD Architecture. All rights reserved.

using System;
using System.Collections.Generic;
using Microsoft.Extensions.Logging;

namespace Architecture.Shell.Cqrs.Tests.TestHelpers;

/// <summary>
/// Test logger that captures log messages for testing purposes.
/// </summary>
/// <typeparam name="T">The category type for the logger.</typeparam>
public sealed class TestLogger<T> : ILogger<T>
{
    private readonly List<LogEntry> _logEntries = new();

    /// <summary>
    /// Gets all log entries captured by this logger.
    /// </summary>
    public IReadOnlyList<LogEntry> LogEntries => _logEntries.AsReadOnly();

    /// <inheritdoc />
    public IDisposable? BeginScope<TState>(TState state) where TState : notnull
    {
        return null;
    }

    /// <inheritdoc />
    public bool IsEnabled(LogLevel logLevel)
    {
        return true;
    }

    /// <inheritdoc />
    public void Log<TState>(
        LogLevel logLevel,
        EventId eventId,
        TState state,
        Exception? exception,
        Func<TState, Exception?, string> formatter)
    {
        var message = formatter(state, exception);
        _logEntries.Add(new LogEntry(logLevel, eventId, message, exception, state));
    }

    /// <summary>
    /// Clears all captured log entries.
    /// </summary>
    public void Clear()
    {
        _logEntries.Clear();
    }

    /// <summary>
    /// Represents a single log entry.
    /// </summary>
    public sealed record LogEntry(
        LogLevel LogLevel,
        EventId EventId,
        string Message,
        Exception? Exception,
        object? State);
}
