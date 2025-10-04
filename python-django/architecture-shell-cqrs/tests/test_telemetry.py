"""Integration tests for telemetry logging (IT-006)."""

import pytest
from typing import List, Dict, Any
from architecture_core.functional import Result
from architecture_shell_cqrs import Mediator, ICommandHandler, ICommand, Unit
from architecture_shell_cqrs.concrete_behaviors.telemetry_behavior import TelemetryBehavior, ILogger
from architecture_shell_cqrs.concrete_behaviors.unitofwork_behavior import UnitOfWorkBehavior
from tests.in_memory_unitofwork import InMemoryUnitOfWork


class TestCommand(ICommand[Unit]):
    """Test command for telemetry logging."""

    def __init__(self, command_id: str):
        self.command_id = command_id


class TestCommandHandler(ICommandHandler[TestCommand, Unit]):
    """Handler for test command."""

    async def handle(self, command: TestCommand) -> Result[Unit]:
        """Handle test command."""
        return Result.success(Unit)


class MockLogger(ILogger):
    """Mock logger for capturing log entries."""

    def __init__(self):
        """Initialize with empty log entries."""
        self.info_logs: List[Dict[str, Any]] = []
        self.warn_logs: List[Dict[str, Any]] = []
        self.error_logs: List[Dict[str, Any]] = []
        self.debug_logs: List[Dict[str, Any]] = []

    def error(self, message: str, **context) -> None:
        """Capture error log."""
        self.error_logs.append({"message": message, **context})

    def warn(self, message: str, **context) -> None:
        """Capture warning log."""
        self.warn_logs.append({"message": message, **context})

    def info(self, message: str, **context) -> None:
        """Capture info log."""
        self.info_logs.append({"message": message, **context})

    def debug(self, message: str, **context) -> None:
        """Capture debug log."""
        self.debug_logs.append({"message": message, **context})


class TestTelemetry_IT006:
    """Integration tests for telemetry logging (IT-006)."""

    @pytest.mark.asyncio
    async def test_should_log_duration_and_status_when_request_processed(self):
        """
        Should log duration and status when request processed.

        Given: A command with TelemetryBehavior registered
        When: The command is executed
        Then: Logger should record execution metrics (timestamp, duration, status)

        This test validates that TelemetryBehavior logs request execution metrics.
        """
        # Given
        mediator = Mediator()
        unit_of_work = InMemoryUnitOfWork()
        mock_logger = MockLogger()
        handler = TestCommandHandler()
        unitofwork_behavior = UnitOfWorkBehavior(unit_of_work)
        telemetry_behavior = TelemetryBehavior(mock_logger, unit_of_work)

        mediator.register_handler(TestCommand, handler)
        mediator.register_behavior(unitofwork_behavior)
        mediator.register_behavior(telemetry_behavior)

        command = TestCommand("telemetry-test-123")

        # When
        result = await mediator.send(command)

        # Then
        assert result.is_success

        # Verify telemetry logging
        assert len(mock_logger.info_logs) >= 2, "Should log start and completion"

        # Verify start log
        start_log = mock_logger.info_logs[0]
        assert "TestCommand started" in start_log["message"]
        assert start_log["request_type"] == "TestCommand"
        assert "timestamp" in start_log
        assert "transaction_id" in start_log
        assert start_log["transaction_id"] is not None, "Commands should have transaction_id"

        # Verify completion log
        completion_log = mock_logger.info_logs[1]
        assert "TestCommand completed" in completion_log["message"]
        assert completion_log["request_type"] == "TestCommand"
        assert "duration" in completion_log
        assert completion_log["duration"] >= 0, "Duration should be non-negative"
        assert completion_log["status"] == "Success"
        assert "transaction_id" in completion_log
        assert completion_log["transaction_id"] is not None, "Commands should have transaction_id"
        assert (
            completion_log["transaction_id"] == start_log["transaction_id"]
        ), "Transaction ID should be consistent"
