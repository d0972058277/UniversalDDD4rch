"""Integration tests for command execution lifecycle (IT-001, IT-002, IT-003, IT-008, IT-008b, IT-010)."""

import pytest
from typing import Optional
from architecture_core.functional import Result, Error
from architecture_shell_cqrs import Mediator, ICommandHandler, IPipelineBehavior, Unit
from architecture_shell_cqrs.concrete_behaviors.unitofwork_behavior import UnitOfWorkBehavior
from tests.in_memory_unitofwork import InMemoryUnitOfWork


# Test Commands
class SuccessfulCommand:
    """Command that succeeds."""
    pass


class FailingCommand:
    """Command that throws exception."""
    pass


class BusinessFailureCommand:
    """Command that returns Result.Failure for business validation error."""
    pass


class VoidBusinessFailureCommand:
    """Void command that returns Result<Unit>.Failure for business validation error."""
    pass


class NestedCommand:
    """Command called from within another command."""
    pass


class OuterCommand:
    """Command that calls a nested command."""
    pass


# Test Handlers
class SuccessfulCommandHandler(ICommandHandler[SuccessfulCommand, Result[Unit]]):
    """Handler that succeeds."""

    async def handle(self, command: SuccessfulCommand) -> Result[Unit]:
        """Handle successful command."""
        return Result.success(Unit)


class FailingCommandHandler(ICommandHandler[FailingCommand, Result[Unit]]):
    """Handler that throws exception."""

    async def handle(self, command: FailingCommand) -> Result[Unit]:
        """Handle failing command."""
        raise RuntimeError("Handler infrastructure error")


class BusinessFailureCommandHandler(ICommandHandler[BusinessFailureCommand, Result[str]]):
    """Handler that returns business failure."""

    async def handle(self, command: BusinessFailureCommand) -> Result[str]:
        """Handle command with business validation failure."""
        return Result.failure(Error.validation("Command.BusinessRuleViolated", "Business rule violated"))


class VoidBusinessFailureCommandHandler(ICommandHandler[VoidBusinessFailureCommand, Result[Unit]]):
    """Handler that returns void business failure."""

    async def handle(self, command: VoidBusinessFailureCommand) -> Result[Unit]:
        """Handle void command with business validation failure."""
        return Result.failure(Error.validation("VoidCommand.BusinessRuleViolated", "Void command business rule violated"))


class NestedCommandHandler(ICommandHandler[NestedCommand, Result[Unit]]):
    """Handler for nested command."""

    async def handle(self, command: NestedCommand) -> Result[Unit]:
        """Handle nested command."""
        return Result.success(Unit)


class OuterCommandHandler(ICommandHandler[OuterCommand, Result[Unit]]):
    """Handler that calls nested command."""

    def __init__(self, mediator: Mediator):
        """Initialize with mediator reference."""
        self.mediator = mediator

    async def handle(self, command: OuterCommand) -> Result[Unit]:
        """Handle outer command by calling nested command."""
        # Call nested command within same transaction
        nested_result = await self.mediator.send(NestedCommand())
        return nested_result


class FailingBehavior(IPipelineBehavior[SuccessfulCommand, Result[Unit]]):
    """Behavior that throws exception after transaction begins."""

    order = 35  # After UnitOfWork (30) but before Telemetry (40)

    async def handle(self, request, next_handler) -> Result[Unit]:
        """Throw exception after transaction begins."""
        raise ValueError("Behavior validation failed")


class TestCommandExecution_IT001:
    """Integration tests for successful command execution (IT-001)."""

    @pytest.mark.asyncio
    async def test_should_commit_transaction_when_command_succeeds(self):
        """
        Should commit transaction when command succeeds.

        Given: A command with UnitOfWork behavior
        When: The handler completes successfully
        Then: Transaction should be committed

        This test validates BR-001 and BR-008 that successful commands commit transactions.
        """
        # Given
        mediator = Mediator()
        unit_of_work = InMemoryUnitOfWork()
        handler = SuccessfulCommandHandler()
        behavior = UnitOfWorkBehavior(unit_of_work)

        mediator.register_handler(SuccessfulCommand, handler)
        mediator.register_behavior(behavior)

        command = SuccessfulCommand()

        # When
        result = await mediator.send(command)

        # Then
        assert result.is_success
        assert unit_of_work.begin_transaction_call_count == 1, "Should begin transaction"
        assert unit_of_work.commit_call_count == 1, "Should commit transaction"
        assert unit_of_work.rollback_call_count == 0, "Should not rollback"


class TestCommandExecution_IT002:
    """Integration tests for command execution rollback (IT-002)."""

    @pytest.mark.asyncio
    async def test_should_rollback_transaction_when_command_throws_exception(self):
        """
        Should rollback transaction when command throws exception.

        Given: A command with UnitOfWork behavior
        When: The handler throws an exception (infrastructure error)
        Then: Transaction should be rolled back

        This test validates BR-007 that infrastructure errors trigger rollback.
        """
        # Given
        mediator = Mediator()
        unit_of_work = InMemoryUnitOfWork()
        handler = FailingCommandHandler()
        behavior = UnitOfWorkBehavior(unit_of_work)

        mediator.register_handler(FailingCommand, handler)
        mediator.register_behavior(behavior)

        command = FailingCommand()

        # When/Then
        with pytest.raises(RuntimeError) as exc_info:
            await mediator.send(command)

        assert "infrastructure error" in str(exc_info.value).lower()
        assert unit_of_work.begin_transaction_call_count == 1, "Should begin transaction"
        assert unit_of_work.commit_call_count == 0, "Should not commit"
        assert unit_of_work.rollback_call_count == 1, "Should rollback transaction"


class TestCommandExecution_IT003:
    """Integration tests for nested command transaction reuse (IT-003)."""

    @pytest.mark.asyncio
    async def test_should_share_transaction_when_nested_command_called(self):
        """
        Should share transaction when nested command called.

        Given: An outer command that calls a nested command
        When: Both commands execute
        Then: They should share the same transaction (not create nested transaction)

        This test validates BR-005 that nested commands reuse active transactions.
        """
        # Given
        mediator = Mediator()
        unit_of_work = InMemoryUnitOfWork()

        outer_handler = OuterCommandHandler(mediator)
        nested_handler = NestedCommandHandler()
        behavior = UnitOfWorkBehavior(unit_of_work)

        mediator.register_handler(OuterCommand, outer_handler)
        mediator.register_handler(NestedCommand, nested_handler)
        mediator.register_behavior(behavior)

        command = OuterCommand()

        # When
        result = await mediator.send(command)

        # Then
        assert result.is_success
        assert unit_of_work.begin_transaction_call_count == 1, "Should begin transaction only once"
        assert unit_of_work.commit_call_count == 1, "Should commit once at the end"
        assert unit_of_work.rollback_call_count == 0, "Should not rollback"


class TestCommandExecution_IT008:
    """Integration tests for Result.Failure transaction commit (IT-008)."""

    @pytest.mark.asyncio
    async def test_should_commit_transaction_when_handler_returns_result_failure(self):
        """
        Should commit transaction when handler returns Result.Failure.

        Given: A command handler that returns Result.Failure (business error)
        When: The handler completes with business failure
        Then: Transaction should be committed (not rolled back)

        This test validates BR-008 requirement that Result.Failure() triggers transaction commit.
        Business validation failures are valid outcomes that should persist state.
        """
        # Given
        mediator = Mediator()
        unit_of_work = InMemoryUnitOfWork()
        handler = BusinessFailureCommandHandler()
        behavior = UnitOfWorkBehavior(unit_of_work)

        mediator.register_handler(BusinessFailureCommand, handler)
        mediator.register_behavior(behavior)

        command = BusinessFailureCommand()

        # When
        result = await mediator.send(command)

        # Then
        assert result.is_failure, "Handler should return business failure"
        assert str(result.error.category) == "Validation", "Should be validation error"
        assert "business rule" in result.error.message.lower()

        # Transaction should commit (business failure is valid state)
        assert unit_of_work.begin_transaction_call_count == 1, "Should begin transaction"
        assert unit_of_work.commit_call_count == 1, "Should commit transaction"
        assert unit_of_work.rollback_call_count == 0, "Should not rollback"


class TestCommandExecution_IT008b:
    """Integration tests for void command Result<Unit>.Failure transaction commit (IT-008b)."""

    @pytest.mark.asyncio
    async def test_should_commit_transaction_when_void_command_handler_returns_result_failure(self):
        """
        Should commit transaction when void command handler returns Result<Unit>.Failure.

        Given: A void command handler that returns Result<Unit>.Failure (business error)
        When: The handler completes with business failure
        Then: Transaction should be committed (not rolled back)

        This test validates BR-008 requirement for void commands returning Result<Unit>.Failure.
        Extends IT-008 coverage to void command scenarios.
        """
        # Given
        mediator = Mediator()
        unit_of_work = InMemoryUnitOfWork()
        handler = VoidBusinessFailureCommandHandler()
        behavior = UnitOfWorkBehavior(unit_of_work)

        mediator.register_handler(VoidBusinessFailureCommand, handler)
        mediator.register_behavior(behavior)

        command = VoidBusinessFailureCommand()

        # When
        result = await mediator.send(command)

        # Then
        assert result.is_failure, "Handler should return business failure"
        assert str(result.error.category) == "Validation", "Should be validation error"
        assert "void command business rule" in result.error.message.lower()

        # Transaction should commit (business failure is valid state)
        assert unit_of_work.begin_transaction_call_count == 1, "Should begin transaction"
        assert unit_of_work.commit_call_count == 1, "Should commit transaction"
        assert unit_of_work.rollback_call_count == 0, "Should not rollback"


class TestCommandExecution_IT010:
    """Integration tests for behavior exception rollback (IT-010)."""

    @pytest.mark.asyncio
    async def test_should_rollback_transaction_when_behavior_throws_exception(self):
        """
        Should rollback transaction when behavior throws exception.

        Given: A behavior that throws an exception before handler execution
        When: The behavior fails
        Then: Transaction should be rolled back

        This test validates spec.md edge case "behavior throws exception" triggers transaction rollback.
        Extends IT-002 beyond handler exceptions to include pipeline behavior failures.
        """
        # Given
        mediator = Mediator()
        unit_of_work = InMemoryUnitOfWork()
        handler = SuccessfulCommandHandler()
        unitofwork_behavior = UnitOfWorkBehavior(unit_of_work)
        failing_behavior = FailingBehavior()

        mediator.register_handler(SuccessfulCommand, handler)
        mediator.register_behavior(unitofwork_behavior)
        mediator.register_behavior(failing_behavior)

        command = SuccessfulCommand()

        # When/Then
        with pytest.raises(ValueError) as exc_info:
            await mediator.send(command)

        assert "behavior validation failed" in str(exc_info.value).lower()
        assert unit_of_work.begin_transaction_call_count == 1, "Should begin transaction"
        assert unit_of_work.commit_call_count == 0, "Should not commit"
        assert unit_of_work.rollback_call_count == 1, "Should rollback transaction"
