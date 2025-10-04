"""Unit tests for cancellation token propagation (UT-004)."""

import pytest
import asyncio
from architecture_core.functional import Result
from architecture_shell_cqrs import Mediator, ICommandHandler, ICommand, Unit


class LongRunningCommand:
    """Test command that simulates long-running operation."""
    pass


class LongRunningCommandHandler(ICommandHandler[LongRunningCommand, Unit]):
    """Handler that respects cancellation."""

    def __init__(self):
        self.was_cancelled = False

    async def handle(self, command: LongRunningCommand) -> Result[Unit]:
        """Handle command with cancellation check."""
        try:
            # Simulate long operation
            await asyncio.sleep(10)  # This should be cancelled
            return Result.success(Unit)
        except asyncio.CancelledError:
            self.was_cancelled = True
            raise


class TestCancellation_TokenPropagation:
    """Tests for cancellation token propagation (UT-004)."""

    @pytest.mark.asyncio
    async def test_should_terminate_early_when_cancellation_requested(self):
        """
        Should terminate early when cancellation requested.

        Given: A long-running command handler
        When: Cancellation is requested during execution
        Then: Handler should terminate early and raise CancelledError

        This test validates NFR-003 that handlers respect cancellation tokens.
        """
        # Given
        mediator = Mediator()
        handler = LongRunningCommandHandler()
        mediator.register_handler(LongRunningCommand, handler)
        command = LongRunningCommand()

        # When: Execute with cancellation after short delay
        task = asyncio.create_task(mediator.send(command))

        # Cancel after 0.1 seconds (before the 10 second sleep completes)
        await asyncio.sleep(0.1)
        task.cancel()

        # Then: Should raise CancelledError
        with pytest.raises(asyncio.CancelledError):
            await task

        # Handler should have detected cancellation
        assert handler.was_cancelled
