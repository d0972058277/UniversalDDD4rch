"""Performance validation tests (T201)."""

import pytest
import platform
import os
from datetime import datetime
from statistics import median, quantiles
from typing import List
from architecture_core.functional import Result, Error
from architecture_shell_cqrs import Mediator, ICommandHandler, ICommand, Unit
from architecture_shell_cqrs.concrete_behaviors.validation_behavior import (
    ValidationBehavior,
    IValidator,
    ValidationResult,
)
from architecture_shell_cqrs.concrete_behaviors.authorization_behavior import (
    AuthorizationBehavior,
    IAuthorizer,
    AuthorizationResult,
)
from architecture_shell_cqrs.concrete_behaviors.unitofwork_behavior import UnitOfWorkBehavior
from architecture_shell_cqrs.concrete_behaviors.telemetry_behavior import (
    TelemetryBehavior,
    ILogger,
)
from tests.in_memory_unitofwork import InMemoryUnitOfWork


class NoOpCommand(ICommand[Unit]):
    """No-op command for performance testing."""

    def __init__(self, iteration: int):
        self.iteration = iteration


class NoOpCommandHandler(ICommandHandler[NoOpCommand, Unit]):
    """No-op handler (minimal work to isolate mediator overhead)."""

    async def handle(self, command: NoOpCommand) -> Result[Unit]:
        """Return success immediately."""
        return Result.success(Unit)


class PassingValidator(IValidator[NoOpCommand, Unit]):
    """Mock validator that always passes."""

    async def validate(self, request: NoOpCommand) -> ValidationResult:
        """Always return valid."""
        return ValidationResult(is_valid=True, errors=[])


class PassingAuthorizer(IAuthorizer[NoOpCommand, Unit]):
    """Mock authorizer that always passes."""

    async def is_authorized(self, request: NoOpCommand) -> AuthorizationResult:
        """Always authorize."""
        return AuthorizationResult(is_authorized=True)


class CapturingLogger(ILogger):
    """Logger that captures telemetry entries."""

    def __init__(self):
        """Initialize with empty log entries."""
        self.info_logs: List[dict] = []
        self.error_logs: List[dict] = []

    def error(self, message: str, **context) -> None:
        """Capture error log."""
        self.error_logs.append({"message": message, **context})

    def warn(self, message: str, **context) -> None:
        """No-op for performance."""
        pass

    def info(self, message: str, **context) -> None:
        """Capture info log."""
        self.info_logs.append({"message": message, **context})

    def debug(self, message: str, **context) -> None:
        """No-op for performance."""
        pass


class TestPerformance:
    """Performance validation tests per NFR-001 and NFR-002."""

    @pytest.mark.asyncio
    async def test_should_measure_mediator_overhead_and_validate_transaction_ids(self):
        """
        Should measure mediator overhead and validate TransactionId logging.

        **Performance Metrics (Informational):**
        - Executes 1000 no-op commands through full pipeline
        - Reports p50, p95, p99 latencies in milliseconds
        - Outputs runtime version, hardware specs, timestamp

        **Functional Validation (Blocking):**
        - Verifies all 1000 command executions log non-null TransactionId per NFR-002/BR-002

        This test validates NFR-001 (performance measurement) and NFR-002 (TransactionId requirement).
        """
        # Setup: Create mediator with full pipeline
        mediator = Mediator()
        unit_of_work = InMemoryUnitOfWork()
        logger = CapturingLogger()
        handler = NoOpCommandHandler()

        # Register handler
        mediator.register_handler(NoOpCommand, handler)

        # Register behaviors in recommended order
        mediator.register_behavior(ValidationBehavior(PassingValidator()))
        mediator.register_behavior(AuthorizationBehavior(PassingAuthorizer()))
        mediator.register_behavior(UnitOfWorkBehavior(unit_of_work, logger))
        mediator.register_behavior(TelemetryBehavior(logger, unit_of_work))

        # Execute 1000 iterations and measure latencies
        iterations = 1000
        latencies_ms: List[float] = []

        import time

        for i in range(iterations):
            # Reset UnitOfWork for each command
            unit_of_work.reset()

            # Measure execution time
            start = time.perf_counter()
            result = await mediator.send(NoOpCommand(i))
            end = time.perf_counter()

            # Validate success
            assert result.is_success, f"Command {i} failed"

            # Record latency in milliseconds
            latencies_ms.append((end - start) * 1000)

        # Calculate statistics
        p50 = median(latencies_ms)
        percentiles = quantiles(latencies_ms, n=100)
        p95 = percentiles[94]  # 95th percentile
        p99 = percentiles[98]  # 99th percentile

        # Get system information
        python_version = platform.python_version()
        cpu_count = os.cpu_count() or "unknown"
        timestamp = datetime.utcnow().isoformat()

        # Output performance metrics (informational - no pass/fail thresholds per NFR-001)
        performance_summary = f"""
=== Performance Test Summary ===
Timestamp: {timestamp}
Runtime: Python {python_version}
Hardware: {cpu_count} CPU cores

Iterations: {iterations}
Latency Statistics (milliseconds):
  p50 (median): {p50:.3f}ms
  p95:          {p95:.3f}ms
  p99:          {p99:.3f}ms

Benchmark completed successfully.
================================
"""
        print(performance_summary)

        # FUNCTIONAL VALIDATION (BLOCKING per NFR-002/BR-002)
        # Verify all command executions logged TransactionId
        completion_logs = [log for log in logger.info_logs if "completed" in log["message"]]

        assert (
            len(completion_logs) == iterations
        ), f"Expected {iterations} completion logs, got {len(completion_logs)}"

        # Validate TransactionId presence for ALL command executions
        missing_transaction_ids = [
            log for log in completion_logs if log.get("transaction_id") is None
        ]

        assert (
            len(missing_transaction_ids) == 0
        ), f"NFR-002/BR-002 violation: {len(missing_transaction_ids)} commands missing TransactionId"

        print(
            f"✓ TransactionId validation passed: All {iterations} commands logged non-null TransactionId"
        )
