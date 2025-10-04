package com.architecture.shell.cqrs;

import com.architecture.core.functional.Result;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for Mediator handler registration and resolution.
 * Tests follow TDD approach - written before implementation exists.
 * Naming: Should_ExpectedBehavior_When_StateUnderTest
 */
class MediatorTests {

    /**
     * T027: UT-001 - Handler Registration Uniqueness
     * Given: No handlers registered for a command type
     * When: Mediator attempts to send command with no handler
     * Then: Should throw exception indicating zero handlers registered
     */
    @Test
    void should_ThrowException_When_ZeroHandlersRegistered() {
        // Given: Empty handler registry
        var handlerRegistry = new HandlerRegistry();
        var mediator = new MediatorImpl(handlerRegistry);

        // When: Attempting to send command with no registered handler
        // Then: Should throw IllegalStateException at runtime
        assertThatThrownBy(() -> mediator.send(new TestCommand()))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("No handler registered")
            .hasMessageContaining("TestCommand");
    }

    /**
     * T032: UT-001 - Handler Registration Uniqueness (Multiple Handlers)
     * Given: Multiple handlers registered for same command type
     * When: Mediator is constructed
     * Then: Should throw exception indicating ambiguous registration
     */
    @Test
    void should_ThrowException_When_MultipleHandlersRegistered() {
        // Given: Two handlers for the same command type
        var handlerRegistry = new HandlerRegistry();
        handlerRegistry.register(new TestCommandHandler1());
        handlerRegistry.register(new TestCommandHandler2());

        // When/Then: Mediator construction should fail with ambiguous handler error
        assertThatThrownBy(() -> new MediatorImpl(handlerRegistry))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Multiple handlers registered")
            .hasMessageContaining("TestCommand")
            .hasMessageContaining("TestCommandHandler1")
            .hasMessageContaining("TestCommandHandler2");
    }

    /**
     * T037b: UT-001c - Handler Uniqueness at Constructor Time
     * Given: Multiple handlers registered for same command type
     * When: Mediator constructor/build is called
     * Then: Should throw exception with handler names BEFORE runtime
     */
    @Test
    void should_ThrowException_When_ConstructorDetectsAmbiguousHandlers() {
        // Given: Registry with 2 handlers for the same command type
        var handlerRegistry = new HandlerRegistry();
        var handler1 = new TestCommandHandler1();
        var handler2 = new TestCommandHandler2();
        handlerRegistry.register(handler1);
        handlerRegistry.register(handler2);

        // When: Mediator is constructed
        // Then: Should throw at construction time (not runtime) with handler names
        assertThatThrownBy(() -> new MediatorImpl(handlerRegistry))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Multiple handlers")
            .hasMessageContaining("TestCommandHandler1")
            .hasMessageContaining("TestCommandHandler2");
    }

    // Test fixtures (will fail compilation until interfaces are created)

    /**
     * Test command for handler registration tests
     */
    private static class TestCommand implements Command<Result<Void>> {
    }

    /**
     * First test handler
     */
    private static class TestCommandHandler1 implements CommandHandler<TestCommand, Result<Void>> {
        @Override
        public Result<Void> handle(TestCommand command) {
            return Result.success();
        }
    }

    /**
     * Second test handler (creates ambiguity)
     */
    private static class TestCommandHandler2 implements CommandHandler<TestCommand, Result<Void>> {
        @Override
        public Result<Void> handle(TestCommand command) {
            return Result.success();
        }
    }
}
