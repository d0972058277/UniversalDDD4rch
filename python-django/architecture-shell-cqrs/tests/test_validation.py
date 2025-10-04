"""Integration tests for validation behavior (IT-007)."""

import pytest
from architecture_core.functional import Result
from architecture_shell_cqrs import Mediator, ICommandHandler, ICommand, Unit
from architecture_shell_cqrs.concrete_behaviors.validation_behavior import (
    ValidationBehavior,
    IValidator,
    ValidationResult,
    ValidationError,
    ValidationException,
)


class TestCommand(ICommand[Unit]):
    """Test command for validation."""

    def __init__(self, value: str):
        self.value = value


class TestCommandHandler(ICommandHandler[TestCommand, Unit]):
    """Handler for test command."""

    def __init__(self):
        """Initialize handler with execution count."""
        self.execution_count = 0

    async def handle(self, command: TestCommand) -> Result[Unit]:
        """Handle test command and track execution."""
        self.execution_count += 1
        return Result.success(Unit)


class FailingValidator(IValidator[TestCommand, Unit]):
    """Validator that always fails."""

    async def validate(self, request: TestCommand) -> ValidationResult:
        """Validate request and fail."""
        return ValidationResult(
            is_valid=False,
            errors=[
                ValidationError(
                    property_name="value",
                    error_message="Value must not be empty",
                    attempted_value=request.value,
                )
            ],
        )


class PassingValidator(IValidator[TestCommand, Unit]):
    """Validator that always passes."""

    async def validate(self, request: TestCommand) -> ValidationResult:
        """Validate request and pass."""
        return ValidationResult(is_valid=True, errors=[])


class TestValidation_IT007:
    """Integration tests for validation behavior short-circuit (IT-007)."""

    @pytest.mark.asyncio
    async def test_should_abort_execution_when_validation_fails(self):
        """
        Should abort execution when validation fails.

        Given: A command with ValidationBehavior that fails validation
        When: The command is executed
        Then: ValidationException should be thrown and handler should NOT execute

        This test validates that ValidationBehavior short-circuits the pipeline.
        """
        # Given
        mediator = Mediator()
        validator = FailingValidator()
        handler = TestCommandHandler()
        behavior = ValidationBehavior(validator)

        mediator.register_handler(TestCommand, handler)
        mediator.register_behavior(behavior)

        command = TestCommand("")

        # When/Then
        with pytest.raises(ValidationException) as exc_info:
            await mediator.send(command)

        # Verify exception details
        assert "Validation failed" in str(exc_info.value)
        assert len(exc_info.value.validation_errors) == 1
        assert exc_info.value.validation_errors[0].property_name == "value"
        assert "must not be empty" in exc_info.value.validation_errors[0].error_message

        # Verify handler was NOT executed (pipeline short-circuited)
        assert (
            handler.execution_count == 0
        ), "Handler should NOT execute when validation fails"

    @pytest.mark.asyncio
    async def test_should_continue_execution_when_validation_passes(self):
        """
        Should continue execution when validation passes.

        Given: A command with ValidationBehavior that passes validation
        When: The command is executed
        Then: Handler should execute normally

        This test validates that ValidationBehavior allows execution when validation passes.
        """
        # Given
        mediator = Mediator()
        validator = PassingValidator()
        handler = TestCommandHandler()
        behavior = ValidationBehavior(validator)

        mediator.register_handler(TestCommand, handler)
        mediator.register_behavior(behavior)

        command = TestCommand("valid-value")

        # When
        result = await mediator.send(command)

        # Then
        assert result.is_success
        assert handler.execution_count == 1, "Handler should execute when validation passes"
