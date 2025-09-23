/**
 * JMH performance benchmarks for Architecture.Core components.
 * <p>
 * This package contains JMH (Java Microbenchmark Harness) benchmarks to validate
 * the performance characteristics of core DDD abstractions and functional types.
 *
 * <h2>Performance Targets</h2>
 *
 * <h3>Functional Types</h3>
 * <ul>
 *   <li>Result map/bind operations: &lt; 1 microsecond average</li>
 *   <li>Maybe map/bind operations: &lt; 1 microsecond average</li>
 *   <li>Error creation and categorization: &lt; 100 nanoseconds average</li>
 * </ul>
 *
 * <h3>Value Objects</h3>
 * <ul>
 *   <li>ValueObject equality comparison: &lt; 100 nanoseconds average</li>
 *   <li>ValueObject hashCode computation: &lt; 50 nanoseconds average</li>
 * </ul>
 *
 * <h3>Domain Entities</h3>
 * <ul>
 *   <li>Entity equality comparison: &lt; 50 nanoseconds average</li>
 *   <li>AggregateRoot event addition: &lt; 200 nanoseconds average</li>
 * </ul>
 *
 * <h2>Benchmark Execution</h2>
 *
 * <h3>Running Benchmarks</h3>
 * <pre>{@code
 * # Run all benchmarks
 * mvn -f benchmarks/pom.xml jmh:benchmark
 *
 * # Run specific benchmark
 * mvn -f benchmarks/pom.xml jmh:benchmark -Djmh.benchmarks=ResultBenchmark
 *
 * # Run with profiling
 * mvn -f benchmarks/pom.xml jmh:benchmark -Djmh.prof=gc
 * }</pre>
 *
 * <h3>Benchmark Configuration</h3>
 * <ul>
 *   <li>Warmup iterations: 5</li>
 *   <li>Measurement iterations: 10</li>
 *   <li>Forks: 2</li>
 *   <li>Thread count: 1 (unless specified otherwise)</li>
 * </ul>
 *
 * @see org.openjdk.jmh.annotations.Benchmark
 * @since 1.0.0
 */
package com.architecture.core.benchmarks;