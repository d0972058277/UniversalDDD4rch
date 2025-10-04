package com.architecture.shell.cqrs;

import com.architecture.core.functional.Result;
import org.junit.jupiter.api.Test;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration tests for Command Execution Lifecycle.
 * Tests validate end-to-end behavior including transaction management.
 * Naming: Should_ExpectedBehavior_When_StateUnderTest
 */
class CommandExecutionTests {

    /**
     * T148: IT-001 - Command Execution Lifecycle (Success)
     * Given: Command handler that succeeds
     * When: Command is executed through mediator with UnitOfWork behavior
     * Then: Should commit transaction on successful completion
     */
    @Test
    void should_CommitTransaction_When_CommandSucceeds() {
        // Given: InMemory UnitOfWork and successful command handler
        var unitOfWork = new InMemoryUnitOfWork();
        var handlerRegistry = new HandlerRegistry();
        handlerRegistry.register(new SuccessCommandHandler());

        var behaviorRegistry = new BehaviorRegistry();
        behaviorRegistry.register(new com.architecture.shell.cqrs.behaviors.UnitOfWorkBehavior<>(unitOfWork), 30);

        var mediator = new MediatorImpl(handlerRegistry, behaviorRegistry);

        // When: Command is executed
        var result = mediator.<Result<String>>send(new SuccessCommand());

        // Then: Transaction should be committed
        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getValue()).isEqualTo("Success");
        assertThat(unitOfWork.wasCommitted()).isTrue();
        assertThat(unitOfWork.wasRolledBack()).isFalse();
    }

    /**
     * T152: IT-002 - Command Execution Rollback (Exception)
     * Given: Command handler that throws exception
     * When: Command is executed
     * Then: Should rollback transaction when handler throws exception
     */
    @Test
    void should_RollbackTransaction_When_CommandThrowsException() {
        // Given: InMemory UnitOfWork and failing command handler
        var unitOfWork = new InMemoryUnitOfWork();
        var handlerRegistry = new HandlerRegistry();
        handlerRegistry.register(new ThrowingCommandHandler());

        var behaviorRegistry = new BehaviorRegistry();
        behaviorRegistry.register(new com.architecture.shell.cqrs.behaviors.UnitOfWorkBehavior<>(unitOfWork), 30);

        var mediator = new MediatorImpl(handlerRegistry, behaviorRegistry);

        // When/Then: Command execution should throw exception
        assertThatThrownBy(() -> mediator.send(new ThrowingCommand()))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Infrastructure error");

        // Then: Transaction should be rolled back
        assertThat(unitOfWork.wasCommitted()).isFalse();
        assertThat(unitOfWork.wasRolledBack()).isTrue();
    }

    /**
     * T157: IT-003 - Nested Command Transaction Reuse
     * Given: Outer command with active transaction
     * When: Nested command is executed within same transaction scope
     * Then: Should share transaction between outer and nested commands
     */
    @Test
    void should_ShareTransaction_When_NestedCommandCalled() {
        // Given: InMemory UnitOfWork and nested command scenario
        var unitOfWork = new InMemoryUnitOfWork();
        var handlerRegistry = new HandlerRegistry();

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
        behaviorRegistry.register(new com.architecture.shell.cqrs.behaviors.UnitOfWorkBehavior<>(unitOfWork), 30);

        mediatorRef.value = new MediatorImpl(handlerRegistry, behaviorRegistry);

        // When: Outer command is executed
        mediatorRef.value.send(new OuterCommand());

        // Then: Transaction should be shared (single commit, no nested transactions)
        assertThat(unitOfWork.getBeginTransactionCount()).isEqualTo(1); // Only one transaction opened
        assertThat(unitOfWork.wasCommitted()).isTrue();
        assertThat(unitOfWork.wasRolledBack()).isFalse();
    }

    /**
     * T211: IT-008 - Transaction Commit on Business Failure
     * Given: Command handler that returns Result.Failure (business error)
     * When: Handler returns failure result
     * Then: Should commit transaction (business failures are valid states per BR-008)
     */
    @Test
    void should_CommitTransaction_When_HandlerReturnsResultFailure() {
        // Given: InMemory UnitOfWork and handler that returns business failure
        var unitOfWork = new InMemoryUnitOfWork();
        var handlerRegistry = new HandlerRegistry();
        handlerRegistry.register(new BusinessFailureCommandHandler());

        var behaviorRegistry = new BehaviorRegistry();
        behaviorRegistry.register(new com.architecture.shell.cqrs.behaviors.UnitOfWorkBehavior<>(unitOfWork), 30);

        var mediator = new MediatorImpl(handlerRegistry, behaviorRegistry);

        // When: Command is executed
        var result = mediator.<Result<String>>send(new BusinessFailureCommand());

        // Then: Result is failure but transaction is COMMITTED (not rolled back)
        assertThat(result.isFailure()).isTrue();
        assertThat(result.getError().getMessage()).contains("Business validation failed");
        assertThat(unitOfWork.wasCommitted()).isTrue();
        assertThat(unitOfWork.wasRolledBack()).isFalse();
    }

    /**
     * T211b: IT-008b - Transaction Commit on Business Failure (Void Commands)
     * Given: Void command handler that returns Result<Unit>.Failure
     * When: Handler returns failure result
     * Then: Should commit transaction (extends IT-008 for void commands)
     */
    @Test
    void should_CommitTransaction_When_VoidCommandHandlerReturnsResultFailure() {
        // Given: InMemory UnitOfWork and void command handler that returns business failure
        var unitOfWork = new InMemoryUnitOfWork();
        var handlerRegistry = new HandlerRegistry();
        handlerRegistry.register(new VoidBusinessFailureCommandHandler());

        var behaviorRegistry = new BehaviorRegistry();
        behaviorRegistry.register(new com.architecture.shell.cqrs.behaviors.UnitOfWorkBehavior<>(unitOfWork), 30);

        var mediator = new MediatorImpl(handlerRegistry, behaviorRegistry);

        // When: Void command is executed
        var result = mediator.<Result<Void>>send(new VoidBusinessFailureCommand());

        // Then: Result is failure but transaction is COMMITTED
        assertThat(result.isFailure()).isTrue();
        assertThat(result.getError().getMessage()).contains("Void command business validation failed");
        assertThat(unitOfWork.wasCommitted()).isTrue();
        assertThat(unitOfWork.wasRolledBack()).isFalse();
    }

    /**
     * T222: IT-010 - Behavior Exception Rollback
     * Given: Pipeline behavior that throws exception
     * When: Behavior throws during execution
     * Then: Should rollback transaction (extends IT-002 beyond handler exceptions)
     */
    @Test
    void should_RollbackTransaction_When_BehaviorThrowsException() {
        // Given: InMemory UnitOfWork and behavior that throws exception
        var unitOfWork = new InMemoryUnitOfWork();
        var handlerRegistry = new HandlerRegistry();
        handlerRegistry.register(new SuccessCommandHandler());

        var behaviorRegistry = new BehaviorRegistry();
        behaviorRegistry.register(new com.architecture.shell.cqrs.behaviors.UnitOfWorkBehavior<>(unitOfWork), 20); // Transaction first
        behaviorRegistry.register(new ThrowingBehavior(), 30); // Throwing behavior after transaction

        var mediator = new MediatorImpl(handlerRegistry, behaviorRegistry);

        // When/Then: Behavior exception should propagate
        assertThatThrownBy(() -> mediator.send(new SuccessCommand()))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Behavior threw exception");

        // Then: Transaction should be rolled back
        assertThat(unitOfWork.wasCommitted()).isFalse();
        assertThat(unitOfWork.wasRolledBack()).isTrue();
    }

    // Test fixtures

    private static class SuccessCommand implements Command<Result<String>> {
    }

    private static class SuccessCommandHandler implements CommandHandler<SuccessCommand, Result<String>> {
        @Override
        public Result<String> handle(SuccessCommand command) {
            return Result.success("Success");
        }
    }

    private static class ThrowingCommand implements Command<Result<Void>> {
    }

    private static class ThrowingCommandHandler implements CommandHandler<ThrowingCommand, Result<Void>> {
        @Override
        public Result<Void> handle(ThrowingCommand command) {
            throw new RuntimeException("Infrastructure error - database unavailable");
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

    private static class BusinessFailureCommand implements Command<Result<String>> {
    }

    private static class BusinessFailureCommandHandler implements CommandHandler<BusinessFailureCommand, Result<String>> {
        @Override
        public Result<String> handle(BusinessFailureCommand command) {
            // Business validation failure - transaction should commit
            return Result.failure(com.architecture.core.functional.Error.validation(
                "INSUFFICIENT_STOCK",
                "Business validation failed: insufficient stock",
                new java.util.HashMap<>()
            ));
        }
    }

    private static class VoidBusinessFailureCommand implements Command<Result<Void>> {
    }

    private static class VoidBusinessFailureCommandHandler implements CommandHandler<VoidBusinessFailureCommand, Result<Void>> {
        @Override
        public Result<Void> handle(VoidBusinessFailureCommand command) {
            // Void command business validation failure - transaction should commit
            return Result.failure(com.architecture.core.functional.Error.validation(
                "VOID_VALIDATION_FAILURE",
                "Void command business validation failed",
                new java.util.HashMap<>()
            ));
        }
    }

    /**
     * Behavior that throws exception (for IT-010 test)
     */
    private static class ThrowingBehavior implements PipelineBehavior<BaseRequest, Object> {
        @Override
        public Object handle(BaseRequest request, RequestHandlerDelegate<Object> next) {
            throw new RuntimeException("Behavior threw exception");
        }
    }
}
