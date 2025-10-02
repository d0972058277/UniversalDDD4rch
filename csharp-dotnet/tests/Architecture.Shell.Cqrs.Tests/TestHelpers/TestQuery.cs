// Copyright (c) 2025 Universal DDD Architecture. All rights reserved.

namespace Architecture.Shell.Cqrs.Tests.TestHelpers;

/// <summary>
/// Test query that returns a string result.
/// </summary>
public sealed record TestQuery(string Id) : IQuery<string>;

/// <summary>
/// Test query for caching scenarios.
/// </summary>
public sealed record CacheableQuery(string Key) : IQuery<string>;
