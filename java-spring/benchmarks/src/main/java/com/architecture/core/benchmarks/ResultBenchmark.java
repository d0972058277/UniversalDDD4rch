package com.architecture.core.benchmarks;

import com.architecture.core.functional.Error;
import com.architecture.core.functional.Result;

import org.openjdk.jmh.annotations.*;
import org.openjdk.jmh.infra.Blackhole;

import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * JMH benchmark for Result monadic operations performance.
 * Tests map, bind, and match operations to ensure they meet sub-microsecond targets.
 */
@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.NANOSECONDS)
@State(Scope.Benchmark)
@Fork(2)
@Warmup(iterations = 5, time = 1, timeUnit = TimeUnit.SECONDS)
@Measurement(iterations = 10, time = 1, timeUnit = TimeUnit.SECONDS)
public class ResultBenchmark {

    private Result<Integer> successResult;
    private Result<Integer> failureResult;
    private Error domainError;
    private Error validationError;
    private Error infrastructureError;

    @Setup
    public void setup() {
        successResult = Result.success(42);

        domainError = Error.domain("Domain.BusinessRule", "Business rule violation");
        validationError = Error.validation("Validation.Required", "Field is required",
            Map.of("field", "name", "value", ""));
        infrastructureError = Error.infrastructure("Infrastructure.Database", "Connection failed",
            new RuntimeException("Database timeout"));

        failureResult = Result.failure(domainError);
    }

    @Benchmark
    public void benchmarkResultSuccessCreation(Blackhole bh) {
        Result<Integer> result = Result.success(123);
        bh.consume(result);
    }

    @Benchmark
    public void benchmarkResultFailureCreation(Blackhole bh) {
        Result<Integer> result = Result.failure(domainError);
        bh.consume(result);
    }

    @Benchmark
    public void benchmarkResultMapSuccess(Blackhole bh) {
        Result<String> mapped = successResult.map(x -> "Value: " + x);
        bh.consume(mapped);
    }

    @Benchmark
    public void benchmarkResultMapFailure(Blackhole bh) {
        Result<String> mapped = failureResult.map(x -> "Value: " + x);
        bh.consume(mapped);
    }

    @Benchmark
    public void benchmarkResultBindSuccess(Blackhole bh) {
        Result<String> bound = successResult.bind(x -> Result.success("Bound: " + x));
        bh.consume(bound);
    }

    @Benchmark
    public void benchmarkResultBindFailure(Blackhole bh) {
        Result<String> bound = failureResult.bind(x -> Result.success("Bound: " + x));
        bh.consume(bound);
    }

    @Benchmark
    public void benchmarkResultMatchSuccess(Blackhole bh) {
        String result = successResult.match(
            value -> "Success: " + value,
            error -> "Error: " + error.getMessage()
        );
        bh.consume(result);
    }

    @Benchmark
    public void benchmarkResultMatchFailure(Blackhole bh) {
        String result = failureResult.match(
            value -> "Success: " + value,
            error -> "Error: " + error.getMessage()
        );
        bh.consume(result);
    }

    @Benchmark
    public void benchmarkResultChainedOperations(Blackhole bh) {
        Result<String> result = successResult
            .map(x -> x * 2)
            .bind(x -> x > 50 ? Result.success(x) : Result.failure(Error.domain("Value.TooSmall", "Value too small")))
            .map(x -> "Final: " + x);
        bh.consume(result);
    }

    @Benchmark
    public void benchmarkErrorCreationDomain(Blackhole bh) {
        Error error = Error.domain("Domain.Test", "Test domain error");
        bh.consume(error);
    }

    @Benchmark
    public void benchmarkErrorCreationValidation(Blackhole bh) {
        Error error = Error.validation("Validation.Test", "Test validation error",
            Map.of("field", "test", "value", "invalid"));
        bh.consume(error);
    }

    @Benchmark
    public void benchmarkErrorCreationInfrastructure(Blackhole bh) {
        Error error = Error.infrastructure("Infrastructure.Test", "Test infrastructure error",
            new RuntimeException("Test exception"));
        bh.consume(error);
    }

    @Benchmark
    public void benchmarkResultEqualityCheck(Blackhole bh) {
        Result<Integer> other = Result.success(42);
        boolean equal = successResult.equals(other);
        bh.consume(equal);
    }

    @Benchmark
    public void benchmarkResultHashCode(Blackhole bh) {
        int hash = successResult.hashCode();
        bh.consume(hash);
    }
}