package com.architecture.core.benchmarks;

import com.architecture.core.domain.AggregateRoot;
import com.architecture.core.domain.DomainEventBase;
import com.architecture.core.domain.EntityId;
import com.architecture.core.functional.Result;

import org.openjdk.jmh.annotations.*;
import org.openjdk.jmh.infra.Blackhole;

import java.util.Objects;
import java.util.concurrent.TimeUnit;

/**
 * JMH benchmark for AggregateRoot operations performance.
 * Tests event addition, version control, and concurrent access patterns.
 */
@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.NANOSECONDS)
@State(Scope.Benchmark)
@Fork(2)
@Warmup(iterations = 5, time = 1, timeUnit = TimeUnit.SECONDS)
@Measurement(iterations = 10, time = 1, timeUnit = TimeUnit.SECONDS)
public class AggregateRootBenchmark {

    private TestAggregate aggregate;
    private TestEvent event;

    @Setup
    public void setup() {
        TestId id = new TestId("TEST-001");
        aggregate = new TestAggregate(id);
        event = new TestEvent("Test event");
    }

    @Benchmark
    public void benchmarkAggregateCreation(Blackhole bh) {
        TestId id = new TestId("TEST-" + System.nanoTime());
        TestAggregate agg = new TestAggregate(id);
        bh.consume(agg);
    }

    @Benchmark
    public void benchmarkAddDomainEvent(Blackhole bh) {
        TestEvent evt = new TestEvent("Benchmark event");
        aggregate.performAction(evt);
        bh.consume(aggregate);
    }

    @Benchmark
    public void benchmarkGetDomainEvents(Blackhole bh) {
        var events = aggregate.getDomainEvents();
        bh.consume(events);
    }

    @Benchmark
    public void benchmarkVersionIncrement(Blackhole bh) {
        aggregate.incrementVersion();
        bh.consume(aggregate.getVersion());
    }

    @Benchmark
    public void benchmarkClearDomainEvents(Blackhole bh) {
        aggregate.clearDomainEvents();
        bh.consume(aggregate);
    }

    @Benchmark
    public void benchmarkAggregateEquality(Blackhole bh) {
        TestId sameId = new TestId("TEST-001");
        TestAggregate other = new TestAggregate(sameId);
        boolean equal = aggregate.equals(other);
        bh.consume(equal);
    }

    @Benchmark
    public void benchmarkAggregateHashCode(Blackhole bh) {
        int hash = aggregate.hashCode();
        bh.consume(hash);
    }

    @Benchmark
    public void benchmarkFullWorkflow(Blackhole bh) {
        // Simulate a typical aggregate workflow
        TestId id = new TestId("WORKFLOW-" + System.nanoTime());
        TestAggregate agg = new TestAggregate(id);

        // Add multiple events
        agg.performAction(new TestEvent("Event 1"));
        agg.performAction(new TestEvent("Event 2"));
        agg.performAction(new TestEvent("Event 3"));

        // Get events for processing
        var events = agg.getDomainEvents();

        // Increment version (simulate persistence)
        agg.incrementVersion();

        // Clear events after processing
        agg.clearDomainEvents();

        bh.consume(agg);
        bh.consume(events);
    }

    /**
     * Test entity ID implementation for benchmarking.
     */
    public static class TestId implements EntityId<TestId> {
        private final String value;

        public TestId(String value) {
            this.value = Objects.requireNonNull(value, "Test ID cannot be null");
        }

        @Override
        public String getValue() {
            return value;
        }

        @Override
        public Result<Void> validate() {
            return value.trim().isEmpty()
                ? Result.failure("TestId.Empty", "Test ID cannot be empty")
                : Result.success(null);
        }

        @Override
        public int compareTo(TestId other) {
            return this.value.compareTo(other.value);
        }

        @Override
        public boolean equals(Object obj) {
            if (this == obj) return true;
            if (obj == null || getClass() != obj.getClass()) return false;
            TestId testId = (TestId) obj;
            return Objects.equals(value, testId.value);
        }

        @Override
        public int hashCode() {
            return Objects.hash(value);
        }

        @Override
        public String toString() {
            return "TestId{" + value + "}";
        }
    }

    /**
     * Test aggregate root implementation for benchmarking.
     */
    public static class TestAggregate extends AggregateRoot<TestId> {
        private String name;

        public TestAggregate(TestId id) {
            super(id);
            this.name = "Test Aggregate " + id.getValue();
        }

        public void performAction(TestEvent event) {
            addDomainEvent(event);
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
            addDomainEvent(new TestEvent("Name changed to: " + name));
        }
    }

    /**
     * Test domain event implementation for benchmarking.
     */
    public static class TestEvent extends DomainEventBase {
        private final String description;

        public TestEvent(String description) {
            super();
            this.description = Objects.requireNonNull(description, "Description cannot be null");
        }

        public String getDescription() {
            return description;
        }

        @Override
        public String toString() {
            return "TestEvent{" +
                "description='" + description + '\'' +
                ", eventId=" + getEventId() +
                ", occurredAt=" + getOccurredAt() +
                '}';
        }
    }
}