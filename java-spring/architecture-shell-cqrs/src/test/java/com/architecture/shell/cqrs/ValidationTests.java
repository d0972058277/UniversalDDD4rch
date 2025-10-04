package com.architecture.shell.cqrs;

import com.architecture.core.functional.Error;
import com.architecture.core.functional.Result;
import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration tests for Validation Behavior.
 * Tests validate that validation failures short-circuit pipeline.
 * Naming: Should_ExpectedBehavior_When_StateUnderTest
 */
class ValidationTests {

    /**
     * T178: IT-007 - Validation Behavior Short-Circuit
     * Given: Validation behavior that rejects invalid commands
     * When: Invalid command is sent
     * Then: Should abort execution before reaching handler (short-circuit)
     */
    @Test
    void should_AbortExecution_When_ValidationFails() {
        // Given: Validation behavior that fails validation
        var handlerExecuted = new AtomicBoolean(false);
        var handlerRegistry = new HandlerRegistry();
        handlerRegistry.register(new TestCommandHandler(handlerExecuted));

        var behaviorRegistry = new BehaviorRegistry();
        behaviorRegistry.register(new ValidatingBehavior(), 10); // Validation first

        var mediator = new MediatorImpl(handlerRegistry, behaviorRegistry);

        // When: Invalid command is sent
        var command = new InvalidCommand();

        // Then: Validation behavior should throw/return failure BEFORE handler execution
        assertThatThrownBy(() -> mediator.send(command))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Validation failed");

        // Handler should NOT have executed
        assertThat(handlerExecuted.get()).isFalse();
    }

    // Test fixtures

    private static class InvalidCommand implements Command<Result<Void>> {
    }

    private static class TestCommandHandler implements CommandHandler<InvalidCommand, Result<Void>> {
        private final AtomicBoolean executedFlag;

        TestCommandHandler(AtomicBoolean executedFlag) {
            this.executedFlag = executedFlag;
        }

        @Override
        public Result<Void> handle(InvalidCommand command) {
            executedFlag.set(true);
            return Result.success();
        }
    }

    /**
     * Validation behavior that rejects InvalidCommand
     */
    private static class ValidatingBehavior implements PipelineBehavior<BaseRequest, Object> {
        @Override
        public Object handle(BaseRequest request, RequestHandlerDelegate<Object> next) {
            // Reject InvalidCommand
            if (request instanceof InvalidCommand) {
                throw new IllegalArgumentException("Validation failed: InvalidCommand is not allowed");
            }

            // Proceed for other requests
            return next.handle();
        }
    }
}
