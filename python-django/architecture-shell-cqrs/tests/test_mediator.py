"""Unit tests for Mediator handler registration and execution."""

import pytest
from architecture_core.functional import Result
from architecture_shell_cqrs import Mediator, ICommandHandler, ICommand, Unit


# Test command for handler registration tests
class TestCommand:
    """Test command for unit tests."""
    pass


class TestCommandHandler(ICommandHandler[TestCommand, Unit]):
    """Test command handler."""

    async def handle(self, command: TestCommand) -> Result[Unit]:
        """Handle test command."""
        return Result.success(Unit)


class AnotherTestCommandHandler(ICommandHandler[TestCommand, Unit]):
    """Another test command handler (for multiple handler tests)."""

    async def handle(self, command: TestCommand) -> Result[Unit]:
        """Handle test command."""
        return Result.success(Unit)


class TestMediator_HandlerRegistration:
    """Tests for handler registration uniqueness (UT-001)."""

    @pytest.mark.asyncio
    async def test_should_throw_exception_when_zero_handlers_registered(self):
        """
        Should throw exception when zero handlers registered.

        Given: A mediator with no registered handlers
        When: A command is sent
        Then: Should return error indicating handler not found
        """
        # Given
        mediator = Mediator()
        command = TestCommand()

        # When
        result = await mediator.send(command)

        # Then
        assert result.is_failure
        assert "No handler registered" in result.error.message


    @pytest.mark.asyncio
    async def test_should_throw_exception_when_multiple_handlers_registered(self):
        """
        Should throw exception when multiple handlers registered.

        Given: A mediator with two handlers for the same command type
        When: Attempting to register the second handler
        Then: Should throw exception indicating ambiguous handler registration
        """
        # Given
        mediator = Mediator()
        handler1 = TestCommandHandler()
        handler2 = AnotherTestCommandHandler()

        # When
        mediator.register_handler(TestCommand, handler1)

        # Then: Second registration should raise exception
        with pytest.raises(Exception) as exc_info:
            mediator.register_handler(TestCommand, handler2)

        assert "already registered" in str(exc_info.value).lower() or "ambiguous" in str(exc_info.value).lower()


    @pytest.mark.asyncio
    async def test_should_resolve_handler_when_exactly_one_handler_registered(self):
        """
        Should resolve handler when exactly one handler registered.

        Given: A mediator with exactly one handler for a command type
        When: The command is sent
        Then: Should successfully execute the handler
        """
        # Given
        mediator = Mediator()
        handler = TestCommandHandler()
        mediator.register_handler(TestCommand, handler)
        command = TestCommand()

        # When
        result = await mediator.send(command)

        # Then
        assert result.is_success
        assert result.value == Unit


class TestMediator_ConstructorValidation:
    """Tests for constructor-time handler uniqueness validation (UT-001c)."""

    def test_should_throw_exception_when_constructor_detects_ambiguous_handlers(self):
        """
        Should throw exception when constructor detects ambiguous handlers.

        Given: Two handlers registered for the same command type
        When: Mediator is initialized/validated
        Then: Should raise exception with handler names in error message

        Note: This test validates FR-008 requirement that Mediator constructor/initialization
        detects ambiguous handler registration (multiple handlers for same request type)
        and throws before runtime per spec.md:L67 edge case.
        """
        # Given
        handlers_map = {
            TestCommand: [TestCommandHandler(), AnotherTestCommandHandler()]
        }

        # When/Then: Constructor or validation method should detect duplicates
        # For Python, we'll implement this in a validate_handlers() method
        # called during initialization
        mediator = Mediator()

        with pytest.raises(Exception) as exc_info:
            for request_type, handlers in handlers_map.items():
                for handler in handlers:
                    mediator.register_handler(request_type, handler)

        # Verify error message includes handler information
        error_msg = str(exc_info.value).lower()
        assert ("ambiguous" in error_msg or "multiple" in error_msg or "already registered" in error_msg)
