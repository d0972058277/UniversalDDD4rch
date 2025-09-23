using System;
using System.Collections.Generic;
using System.Linq;
using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Jobs;
using Architecture.Core.Functional;

namespace Architecture.Core.Benchmarks;

[SimpleJob(RuntimeMoniker.Net80)]
[MemoryDiagnoser]
[MarkdownExporter]
public class FunctionalTypesAllocationBenchmarks
{
    private readonly Error _testError = Error.Domain("TEST.ERROR", "Test error message");
    private readonly string _testValue = "Test Value";
    private readonly int _testInt = 42;

    [Benchmark]
    public Result CreateSuccessResult()
    {
        return Result.Ok();
    }

    [Benchmark]
    public Result CreateFailureResult()
    {
        return Result.Fail(_testError);
    }

    [Benchmark]
    public Result<string> CreateSuccessResultOfT()
    {
        return Result<string>.Ok(_testValue);
    }

    [Benchmark]
    public Result<string> CreateFailureResultOfT()
    {
        return Result<string>.Fail(_testError);
    }

    [Benchmark]
    public Maybe<string> CreateSomeMaybe()
    {
        return Maybe<string>.Some(_testValue);
    }

    [Benchmark]
    public Maybe<string> CreateNoneMaybe()
    {
        return Maybe<string>.None();
    }

    [Benchmark]
    public Error CreateDomainError()
    {
        return Error.Domain("DOMAIN.ERROR", "Domain error occurred");
    }

    [Benchmark]
    public Error CreateValidationError()
    {
        return Error.Validation("VALIDATION.ERROR", "Validation failed");
    }

    [Benchmark]
    public Error CreateErrorWithMetadata()
    {
        var metadata = new Dictionary<string, object>
        {
            { "field", "testField" },
            { "value", "testValue" }
        };
        return Error.Validation("VALIDATION.ERROR", "Validation failed", metadata);
    }

    [Benchmark]
    public string ResultMapChain()
    {
        return Result<int>.Ok(_testInt)
            .Map(x => x * 2)
            .Map(x => x.ToString())
            .Map(x => $"Value: {x}")
            .Match(
                onSuccess: value => value,
                onFailure: error => error.Message
            );
    }

    [Benchmark]
    public Result<int> ResultBindChain()
    {
        return Result<int>.Ok(_testInt)
            .Bind(x => x > 0 ? Result<int>.Ok(x * 2) : Result<int>.Fail(_testError))
            .Bind(x => x < 100 ? Result<int>.Ok(x + 10) : Result<int>.Fail(_testError));
    }

    [Benchmark]
    public string MaybeMapChain()
    {
        return Maybe<int>.Some(_testInt)
            .Map(x => x * 2)
            .Map(x => x.ToString())
            .Map(x => $"Value: {x}")
            .OrElse("No value");
    }

    [Benchmark]
    public Maybe<int> MaybeBindChain()
    {
        return Maybe<int>.Some(_testInt)
            .Bind(x => x > 0 ? Maybe<int>.Some(x * 2) : Maybe<int>.None())
            .Bind(x => x < 100 ? Maybe<int>.Some(x + 10) : Maybe<int>.None());
    }

    [Benchmark]
    public IEnumerable<Result<string>> ProcessResultCollection()
    {
        var inputs = Enumerable.Range(1, 1000);
        return inputs.Select(i =>
            i % 2 == 0
                ? Result<string>.Ok($"Even: {i}")
                : Result<string>.Fail(Error.Validation("ODD.NUMBER", $"Odd number: {i}"))
        );
    }

    [Benchmark]
    public IEnumerable<Maybe<string>> ProcessMaybeCollection()
    {
        var inputs = Enumerable.Range(1, 1000);
        return inputs.Select(i =>
            i % 2 == 0
                ? Maybe<string>.Some($"Even: {i}")
                : Maybe<string>.None()
        );
    }

    [Benchmark]
    public int CountSuccessfulResults()
    {
        var results = Enumerable.Range(1, 1000)
            .Select(i => i % 2 == 0
                ? Result<int>.Ok(i)
                : Result<int>.Fail(_testError));

        return results.Count(r => r.IsSuccess);
    }

    [Benchmark]
    public int CountSomeMaybes()
    {
        var maybes = Enumerable.Range(1, 1000)
            .Select(i => i % 2 == 0
                ? Maybe<int>.Some(i)
                : Maybe<int>.None());

        return maybes.Count(m => m.HasValue);
    }

    [Benchmark]
    public Result<string> ImplicitConversionToResult()
    {
        Result<string> result = _testValue; // Implicit conversion from T to Result<T>
        return result;
    }

    [Benchmark]
    public Result<string> ImplicitErrorToResult()
    {
        Result<string> result = _testError; // Implicit conversion from Error to Result<T>
        return result;
    }

    [Benchmark]
    public Maybe<string> ImplicitConversionToMaybe()
    {
        Maybe<string> maybe = _testValue; // Implicit conversion from T to Maybe<T>
        return maybe;
    }

    [Benchmark]
    public Result<string> ConvertMaybeToResult()
    {
        var maybe = Maybe<string>.Some(_testValue);
        return maybe.ToResult(Error.Domain("NO.VALUE", "No value present"));
    }

    [Benchmark]
    public Maybe<string> ConvertResultToMaybe()
    {
        var result = Result<string>.Ok(_testValue);
        return result.IsSuccess ? Maybe<string>.Some(result.Value) : Maybe<string>.None();
    }

    [Benchmark]
    public string ResultMatchPattern()
    {
        var result = Result<string>.Ok(_testValue);
        return result.Match(
            onSuccess: value => $"Success: {value}",
            onFailure: error => $"Failure: {error.Message}"
        );
    }

    [Benchmark]
    public string MaybeMatchPattern()
    {
        var maybe = Maybe<string>.Some(_testValue);
        return maybe.Match(
            onSome: value => $"Some: {value}",
            onNone: () => "None"
        );
    }
}