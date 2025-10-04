package com.architecture.shell.cqrs;

import com.architecture.core.functional.Result;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.DoubleStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * T198: Performance validation tests for CQRS mediator overhead.
 *
 * <p>Per NFR-001, these tests measure and report performance metrics WITHOUT enforcing
 * specific latency thresholds. The goal is to provide developers with overhead data
 * for assessment, not to block builds on performance targets.
 *
 * <p><b>Functional Validation (BLOCKING)</b>:
 * <ul>
 *   <li>Per BR-002 and NFR-002: ALL command executions MUST log TransactionId</li>
 *   <li>This is a functional requirement, not a performance threshold</li>
 * </ul>
 *
 * <p><b>Performance Metrics (INFORMATIONAL)</b>:
 * <ul>
 *   <li>Measure mediator overhead excluding handler logic (isolate framework cost)</li>
 *   <li>Execute 1000 no-op commands through full pipeline</li>
 *   <li>Report p50 (median), p95, p99 latencies</li>
 * </ul>
 *
 * <p>Test naming: Should_ExpectedBehavior_When_StateUnderTest
 */
class PerformanceTests {

    private static final Logger logger = LoggerFactory.getLogger(PerformanceTests.class);
    private static final int ITERATION_COUNT = 1000;

    /**
     * Measures mediator overhead and validates TransactionId logging for commands.
     *
     * <p><b>Given</b>: Mediator with full pipeline (ValidationBehavior, AuthorizationBehavior,
     * UnitOfWorkBehavior, TelemetryBehavior) using mock implementations
     *
     * <p><b>When</b>: Execute 1000 no-op commands
     *
     * <p><b>Then</b>:
     * <ul>
     *   <li>FUNCTIONAL (MUST pass): All 1000 telemetry entries include non-null TransactionId (BR-002, NFR-002)</li>
     *   <li>INFORMATIONAL: Report p50, p95, p99 latencies for developer assessment</li>
     *   <li>INFORMATIONAL: Output environment details (JVM version, hardware, timestamp)</li>
     * </ul>
     */
    @Test
    void should_MeasureMediatorOverheadAndValidateTransactionId_When_ExecutingCommands() {
        // Given: Create telemetry collector for TransactionId validation
        var telemetryCollector = new TelemetryCollector();

        // Given: Create mock UnitOfWork that generates TransactionIds
        var mockUnitOfWork = new MockUnitOfWork();

        // Given: Setup handler registry with no-op handler
        var handlerRegistry = new HandlerRegistry();
        handlerRegistry.register(new NoOpCommandHandler());

        // Given: Setup behavior registry with full pipeline
        var behaviorRegistry = new BehaviorRegistry();

        // Validation behavior (order=10) - minimal overhead
        behaviorRegistry.register(
            new MockValidationBehavior<>(),
            10,
            new BehaviorMatcher.AllRequestsMatcher()
        );

        // Authorization behavior (order=20) - minimal overhead
        behaviorRegistry.register(
            new MockAuthorizationBehavior<>(),
            20,
            new BehaviorMatcher.AllRequestsMatcher()
        );

        // UnitOfWork behavior (order=30) - tracks TransactionId
        behaviorRegistry.register(
            new MockUnitOfWorkBehavior<>(mockUnitOfWork),
            30,
            new BehaviorMatcher.CommandOnlyMatcher()
        );

        // Telemetry behavior (order=40) - collects metrics and TransactionId
        behaviorRegistry.register(
            new CollectingTelemetryBehavior<>(telemetryCollector, mockUnitOfWork),
            40,
            new BehaviorMatcher.AllRequestsMatcher()
        );

        // Given: Create mediator
        var mediator = new MediatorImpl(handlerRegistry, behaviorRegistry);

        // Given: Warmup (exclude JIT compilation from measurements)
        for (int i = 0; i < 100; i++) {
            mediator.send(new NoOpCommand());
        }
        telemetryCollector.clear();

        // When: Execute 1000 commands and measure overhead
        var durations = new ArrayList<Long>(ITERATION_COUNT);
        var overallStart = Instant.now();

        for (int i = 0; i < ITERATION_COUNT; i++) {
            var start = System.nanoTime();
            Result<Void> result = mediator.send(new NoOpCommand());
            var end = System.nanoTime();

            durations.add(end - start);

            // Validate command succeeds
            assertThat(result.isSuccess()).isTrue();
        }

        var overallEnd = Instant.now();
        var totalDuration = Duration.between(overallStart, overallEnd);

        // Then: FUNCTIONAL VALIDATION - All command executions MUST log TransactionId (BR-002, NFR-002)
        var telemetryEntries = telemetryCollector.getEntries();
        assertThat(telemetryEntries)
            .as("All command executions must be logged")
            .hasSize(ITERATION_COUNT);

        var entriesWithTransactionId = telemetryEntries.stream()
            .filter(e -> e.transactionId() != null)
            .count();

        assertThat(entriesWithTransactionId)
            .as("ALL command telemetry entries MUST include non-null TransactionId per BR-002 and NFR-002")
            .isEqualTo(ITERATION_COUNT);

        // Then: INFORMATIONAL - Calculate and report performance metrics (no pass/fail thresholds per NFR-001)
        var sortedDurations = durations.stream()
            .mapToLong(Long::longValue)
            .sorted()
            .toArray();

        var p50 = sortedDurations[ITERATION_COUNT / 2] / 1_000_000.0; // Convert to ms
        var p95 = sortedDurations[(int) (ITERATION_COUNT * 0.95)] / 1_000_000.0;
        var p99 = sortedDurations[(int) (ITERATION_COUNT * 0.99)] / 1_000_000.0;
        var mean = java.util.Arrays.stream(sortedDurations).average().orElse(0) / 1_000_000.0;

        // Then: Output performance report with environment details
        logger.info("=== CQRS Mediator Performance Benchmark ===");
        logger.info("Environment:");
        logger.info("  Java Version: {}", System.getProperty("java.version"));
        logger.info("  JVM: {}", System.getProperty("java.vm.name"));
        logger.info("  OS: {} {}", System.getProperty("os.name"), System.getProperty("os.version"));
        logger.info("  CPU Cores: {}", Runtime.getRuntime().availableProcessors());
        logger.info("  Max Memory: {} MB", Runtime.getRuntime().maxMemory() / (1024 * 1024));
        logger.info("  Timestamp: {}", Instant.now());
        logger.info("");
        logger.info("Test Configuration:");
        logger.info("  Iterations: {}", ITERATION_COUNT);
        logger.info("  Pipeline: ValidationBehavior -> AuthorizationBehavior -> UnitOfWorkBehavior -> TelemetryBehavior");
        logger.info("  Handler: No-op (measures framework overhead only)");
        logger.info("");
        logger.info("Performance Metrics (Mediator Overhead):");
        logger.info("  Total Duration: {} ms", totalDuration.toMillis());
        logger.info("  Mean Latency: {:.3f} ms", mean);
        logger.info("  p50 (median): {:.3f} ms", p50);
        logger.info("  p95: {:.3f} ms", p95);
        logger.info("  p99: {:.3f} ms", p99);
        logger.info("  Throughput: {:.0f} requests/sec", (ITERATION_COUNT * 1000.0) / totalDuration.toMillis());
        logger.info("");
        logger.info("Functional Validation:");
        logger.info("  Commands with TransactionId: {}/{} (BR-002, NFR-002)", entriesWithTransactionId, ITERATION_COUNT);
        logger.info("==========================================");

        // Note: No performance assertions per NFR-001 - metrics are informational for developer assessment
    }

    // Test fixtures

    /**
     * No-op command for measuring mediator overhead
     */
    private static class NoOpCommand implements Command<Result<Void>> {
    }

    /**
     * No-op command handler (minimal execution time)
     */
    private static class NoOpCommandHandler implements CommandHandler<NoOpCommand, Result<Void>> {
        @Override
        public Result<Void> handle(NoOpCommand command) {
            return Result.success();
        }
    }

    /**
     * Mock UnitOfWork that generates TransactionIds
     */
    private static class MockUnitOfWork implements UnitOfWork {
        private UUID currentTransactionId;
        private boolean hasActiveTransaction = false;

        @Override
        public UUID getTransactionId() {
            return currentTransactionId;
        }

        @Override
        public boolean hasActiveTransaction() {
            return hasActiveTransaction;
        }

        @Override
        public void beginTransaction() {
            currentTransactionId = UUID.randomUUID();
            hasActiveTransaction = true;
        }

        @Override
        public void commit() {
            hasActiveTransaction = false;
        }

        @Override
        public void rollback() {
            hasActiveTransaction = false;
        }
    }

    /**
     * Mock validation behavior (minimal overhead)
     */
    private static class MockValidationBehavior<TRequest extends BaseRequest, TResponse>
        implements PipelineBehavior<TRequest, TResponse> {
        @Override
        public TResponse handle(TRequest request, RequestHandlerDelegate<TResponse> next) {
            return next.handle();
        }
    }

    /**
     * Mock authorization behavior (minimal overhead)
     */
    private static class MockAuthorizationBehavior<TRequest extends BaseRequest, TResponse>
        implements PipelineBehavior<TRequest, TResponse> {
        @Override
        public TResponse handle(TRequest request, RequestHandlerDelegate<TResponse> next) {
            return next.handle();
        }
    }

    /**
     * Mock UnitOfWork behavior that manages transactions
     */
    private static class MockUnitOfWorkBehavior<TRequest extends BaseRequest, TResponse>
        implements PipelineBehavior<TRequest, TResponse> {

        private final MockUnitOfWork unitOfWork;

        MockUnitOfWorkBehavior(MockUnitOfWork unitOfWork) {
            this.unitOfWork = unitOfWork;
        }

        @Override
        public TResponse handle(TRequest request, RequestHandlerDelegate<TResponse> next) {
            // Only apply to commands
            if (!(request instanceof Command<?>)) {
                return next.handle();
            }

            unitOfWork.beginTransaction();
            try {
                var response = next.handle();
                unitOfWork.commit();
                return response;
            } catch (Exception e) {
                unitOfWork.rollback();
                throw e;
            }
        }
    }

    /**
     * Telemetry entry for validation
     */
    private record TelemetryEntry(String requestType, long durationMs, String status, UUID transactionId) {
    }

    /**
     * Telemetry collector for TransactionId validation
     */
    private static class TelemetryCollector {
        private final List<TelemetryEntry> entries = new ArrayList<>();

        void collect(String requestType, long durationMs, String status, UUID transactionId) {
            entries.add(new TelemetryEntry(requestType, durationMs, status, transactionId));
        }

        List<TelemetryEntry> getEntries() {
            return new ArrayList<>(entries);
        }

        void clear() {
            entries.clear();
        }
    }

    /**
     * Collecting telemetry behavior that tracks TransactionId
     */
    private static class CollectingTelemetryBehavior<TRequest extends BaseRequest, TResponse>
        implements PipelineBehavior<TRequest, TResponse> {

        private final TelemetryCollector collector;
        private final MockUnitOfWork unitOfWork;

        CollectingTelemetryBehavior(TelemetryCollector collector, MockUnitOfWork unitOfWork) {
            this.collector = collector;
            this.unitOfWork = unitOfWork;
        }

        @Override
        public TResponse handle(TRequest request, RequestHandlerDelegate<TResponse> next) {
            var start = System.nanoTime();
            try {
                var response = next.handle();
                var end = System.nanoTime();
                var durationMs = (end - start) / 1_000_000;

                // For commands, collect TransactionId (per BR-002, NFR-002)
                UUID transactionId = null;
                if (request instanceof Command<?> && unitOfWork.hasActiveTransaction()) {
                    transactionId = unitOfWork.getTransactionId();
                }

                collector.collect(request.getClass().getSimpleName(), durationMs, "Success", transactionId);
                return response;
            } catch (Exception e) {
                var end = System.nanoTime();
                var durationMs = (end - start) / 1_000_000;
                collector.collect(request.getClass().getSimpleName(), durationMs, "Error", unitOfWork.getTransactionId());
                throw e;
            }
        }
    }
}
