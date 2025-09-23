package com.architecture.core.benchmarks;

import com.architecture.core.functional.Maybe;
import com.architecture.core.functional.Result;
import com.architecture.core.functional.Error;

import org.openjdk.jmh.annotations.*;
import org.openjdk.jmh.infra.Blackhole;

import java.util.Optional;
import java.util.concurrent.TimeUnit;

/**
 * JMH benchmark for Maybe monadic operations performance.
 * Tests map, bind, and value extraction operations.
 */
@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.NANOSECONDS)
@State(Scope.Benchmark)
@Fork(2)
@Warmup(iterations = 5, time = 1, timeUnit = TimeUnit.SECONDS)
@Measurement(iterations = 10, time = 1, timeUnit = TimeUnit.SECONDS)
public class MaybeBenchmark {

    private Maybe<Integer> someValue;
    private Maybe<Integer> noneValue;

    @Setup
    public void setup() {
        someValue = Maybe.some(42);
        noneValue = Maybe.none();
    }

    @Benchmark
    public void benchmarkMaybeSomeCreation(Blackhole bh) {
        Maybe<Integer> maybe = Maybe.some(123);
        bh.consume(maybe);
    }

    @Benchmark
    public void benchmarkMaybeNoneCreation(Blackhole bh) {
        Maybe<Integer> maybe = Maybe.none();
        bh.consume(maybe);
    }

    @Benchmark
    public void benchmarkMaybeFromNullable(Blackhole bh) {
        Maybe<String> maybe = Maybe.fromNullable("test");
        bh.consume(maybe);
    }

    @Benchmark
    public void benchmarkMaybeFromNullableNull(Blackhole bh) {
        Maybe<String> maybe = Maybe.fromNullable(null);
        bh.consume(maybe);
    }

    @Benchmark
    public void benchmarkMaybeMapSome(Blackhole bh) {
        Maybe<String> mapped = someValue.map(x -> "Value: " + x);
        bh.consume(mapped);
    }

    @Benchmark
    public void benchmarkMaybeMapNone(Blackhole bh) {
        Maybe<String> mapped = noneValue.map(x -> "Value: " + x);
        bh.consume(mapped);
    }

    @Benchmark
    public void benchmarkMaybeBindSome(Blackhole bh) {
        Maybe<String> bound = someValue.bind(x -> Maybe.some("Bound: " + x));
        bh.consume(bound);
    }

    @Benchmark
    public void benchmarkMaybeBindNone(Blackhole bh) {
        Maybe<String> bound = noneValue.bind(x -> Maybe.some("Bound: " + x));
        bh.consume(bound);
    }

    @Benchmark
    public void benchmarkMaybeOrElseSome(Blackhole bh) {
        Integer value = someValue.orElse(999);
        bh.consume(value);
    }

    @Benchmark
    public void benchmarkMaybeOrElseNone(Blackhole bh) {
        Integer value = noneValue.orElse(999);
        bh.consume(value);
    }

    @Benchmark
    public void benchmarkMaybeOrElseGetSome(Blackhole bh) {
        Integer value = someValue.orElseGet(() -> 999);
        bh.consume(value);
    }

    @Benchmark
    public void benchmarkMaybeOrElseGetNone(Blackhole bh) {
        Integer value = noneValue.orElseGet(() -> 999);
        bh.consume(value);
    }

    @Benchmark
    public void benchmarkMaybeChainedOperations(Blackhole bh) {
        Maybe<String> result = someValue
            .map(x -> x * 2)
            .bind(x -> x > 50 ? Maybe.some(x) : Maybe.none())
            .map(x -> "Final: " + x);
        bh.consume(result);
    }

    @Benchmark
    public void benchmarkMaybeToOptional(Blackhole bh) {
        Optional<Integer> optional = someValue.toOptional();
        bh.consume(optional);
    }

    @Benchmark
    public void benchmarkMaybeToResult(Blackhole bh) {
        Result<Integer> result = someValue.toResult(Error.domain("Missing.Value", "Value is missing"));
        bh.consume(result);
    }

    @Benchmark
    public void benchmarkMaybeEqualityCheck(Blackhole bh) {
        Maybe<Integer> other = Maybe.some(42);
        boolean equal = someValue.equals(other);
        bh.consume(equal);
    }

    @Benchmark
    public void benchmarkMaybeHashCode(Blackhole bh) {
        int hash = someValue.hashCode();
        bh.consume(hash);
    }

    @Benchmark
    public void benchmarkMaybeHasValue(Blackhole bh) {
        boolean hasValue = someValue.hasValue();
        bh.consume(hasValue);
    }

    @Benchmark
    public void benchmarkMaybeIsEmpty(Blackhole bh) {
        boolean isEmpty = noneValue.isEmpty();
        bh.consume(isEmpty);
    }
}