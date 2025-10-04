package com.architecture.shell.cqrs;

import com.architecture.core.functional.Result;
import com.architecture.core.infrastructure.CancellationToken;
import org.junit.jupiter.api.Test;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for UnitOfWork Behavior (isolated with mocks).
 * Tests follow TDD approach - written before implementation exists.
 * Naming: Should_ExpectedBehavior_When_StateUnderTest
 */
class UnitOfWorkBehaviorTests {

    /**
     * T053: UT-005 - UnitOfWork Transaction Behavior (Isolated)
     * Given: Command is executed with UnitOfWork behavior
     * When: Handler executes successfully
     * Then: Should call beginTransaction() on mock IUnitOfWork
     */
    @Test
    void should_CallBeginTransaction_When_CommandExecutes() {
        // Given: Mock UnitOfWork that tracks method calls
        var mockUnitOfWork = new MockUnitOfWork();
        var handlerRegistry = new HandlerRegistry();
        handlerRegistry.register(new TestCommandHandler());

        var behaviorRegistry = new BehaviorRegistry();
        behaviorRegistry.register(new com.architecture.shell.cqrs.behaviors.UnitOfWorkBehavior<>(mockUnitOfWork), 30);

        var mediator = new MediatorImpl(handlerRegistry, behaviorRegistry);

        // When: Command is executed
        var command = new TestCommand();
        mediator.send(command);

        // Then: beginTransaction() should have been called
        assertThat(mockUnitOfWork.beginTransactionCalls.get()).isEqualTo(1);
        assertThat(mockUnitOfWork.commitCalls.get()).isEqualTo(1);
        assertThat(mockUnitOfWork.rollbackCalls.get()).isEqualTo(0);
    }

    /**
     * T058: UT-006 - Nested Command Transaction Reuse
     * Given: Outer command with active transaction
     * When: Nested command is executed within same transaction scope
     * Then: Should reuse existing transaction (no new beginTransaction call)
     */
    @Test
    void should_ReuseTransaction_When_NestedCommandExecuted() {
        // Given: Mock UnitOfWork with active transaction
        var mockUnitOfWork = new MockUnitOfWork();
        var handlerRegistry = new HandlerRegistry();

        // Outer command handler that sends nested command
        var mediatorRef = new Object() {
            MediatorImpl value;
        };

        handlerRegistry.register(new CommandHandler<OuterCommand, Result<Void>>() {
            @Override
            public Result<Void> handle(OuterCommand command) {
                // Send nested command within transaction
                mediatorRef.value.send(new NestedCommand());
                return Result.success();
            }
        });

        handlerRegistry.register(new NestedCommandHandler());

        var behaviorRegistry = new BehaviorRegistry();
        behaviorRegistry.register(new com.architecture.shell.cqrs.behaviors.UnitOfWorkBehavior<>(mockUnitOfWork), 30);

        mediatorRef.value = new MediatorImpl(handlerRegistry, behaviorRegistry);

        // When: Outer command is executed
        mediatorRef.value.send(new OuterCommand());

        // Then: beginTransaction() should be called only once (transaction reused for nested command)
        assertThat(mockUnitOfWork.beginTransactionCalls.get()).isEqualTo(1); // Only outer command opens transaction
        assertThat(mockUnitOfWork.commitCalls.get()).isEqualTo(1); // Only outer command commits
        assertThat(mockUnitOfWork.rollbackCalls.get()).isEqualTo(0);
    }

    /**
     * T217: IT-009 - Transaction Provider Failure (Fail Fast)
     * Given: UnitOfWork.beginTransaction() throws exception (connection pool exhausted)
     * When: Command is executed
     * Then: Should fail fast with exception (not proceed to handler)
     */
    @Test
    void should_ThrowException_When_TransactionProviderFails() {
        // Given: Mock UnitOfWork that fails on beginTransaction
        var failingUnitOfWork = new FailingUnitOfWork();
        var handlerExecuted = new AtomicInteger(0);

        var handlerRegistry = new HandlerRegistry();
        handlerRegistry.register(new CommandHandler<TestCommand, Result<Void>>() {
            @Override
            public Result<Void> handle(TestCommand command) {
                handlerExecuted.incrementAndGet();
                return Result.success();
            }
        });

        var behaviorRegistry = new BehaviorRegistry();
        behaviorRegistry.register(new com.architecture.shell.cqrs.behaviors.UnitOfWorkBehavior<>(failingUnitOfWork), 30);

        var mediator = new MediatorImpl(handlerRegistry, behaviorRegistry);

        // When/Then: Should throw exception from beginTransaction (fail fast)
        assertThatThrownBy(() -> mediator.send(new TestCommand()))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Connection pool exhausted");

        // Handler should NOT have executed
        assertThat(handlerExecuted.get()).isEqualTo(0);
    }

    // Test fixtures

    private static class TestCommand implements Command<Result<Void>> {
    }

    private static class TestCommandHandler implements CommandHandler<TestCommand, Result<Void>> {
        @Override
        public Result<Void> handle(TestCommand command) {
            return Result.success();
        }
    }

    private static class OuterCommand implements Command<Result<Void>> {
    }

    private static class NestedCommand implements Command<Result<Void>> {
    }

    private static class NestedCommandHandler implements CommandHandler<NestedCommand, Result<Void>> {
        @Override
        public Result<Void> handle(NestedCommand command) {
            return Result.success();
        }
    }

    /**
     * Mock UnitOfWork for testing (tracks method calls)
     */
    private static class MockUnitOfWork implements UnitOfWork {
        final AtomicInteger beginTransactionCalls = new AtomicInteger(0);
        final AtomicInteger commitCalls = new AtomicInteger(0);
        final AtomicInteger rollbackCalls = new AtomicInteger(0);
        private UUID transactionId;
        private boolean hasActiveTransaction = false;

        @Override
        public UUID getTransactionId() {
            return transactionId;
        }

        @Override
        public boolean hasActiveTransaction() {
            return hasActiveTransaction;
        }

        @Override
        public void beginTransaction() {
            beginTransactionCalls.incrementAndGet();
            transactionId = UUID.randomUUID();
            hasActiveTransaction = true;
        }

        @Override
        public void commit() {
            commitCalls.incrementAndGet();
            hasActiveTransaction = false;
        }

        @Override
        public void rollback() {
            rollbackCalls.incrementAndGet();
            hasActiveTransaction = false;
        }
    }

    /**
     * Mock UnitOfWork that fails on beginTransaction (simulates connection failure)
     */
    private static class FailingUnitOfWork implements UnitOfWork {
        @Override
        public UUID getTransactionId() {
            return null;
        }

        @Override
        public boolean hasActiveTransaction() {
            return false;
        }

        @Override
        public void beginTransaction() {
            throw new RuntimeException("Connection pool exhausted - cannot begin transaction");
        }

        @Override
        public void commit() {
        }

        @Override
        public void rollback() {
        }
    }
}
