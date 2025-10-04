"""TelemetryBehavior - Request execution metrics logging."""

import time
import traceback
from datetime import datetime
from typing import TypeVar, Optional, Protocol
from architecture_core.functional import Result
from architecture_shell_cqrs.behaviors import IPipelineBehavior
from architecture_shell_cqrs.requests import ICommand
from architecture_shell_cqrs.unit_of_work import IUnitOfWork

TRequest = TypeVar("TRequest")
TResponse = TypeVar("TResponse")


class ILogger(Protocol):
    """Minimal logger interface compatible with Python logging module."""

    def error(self, message: str, **context) -> None:
        """Log error message with context."""
        ...

    def warn(self, message: str, **context) -> None:
        """Log warning message with context."""
        ...

    def info(self, message: str, **context) -> None:
        """Log info message with context."""
        ...

    def debug(self, message: str, **context) -> None:
        """Log debug message with context."""
        ...


class TelemetryBehavior(IPipelineBehavior[TRequest, TResponse]):
    """
    Pipeline behavior that logs request execution metrics.

    Captures request type, duration, status, and exceptions for observability.
    Logs transaction_id for all command executions per NFR-002 and BR-002.

    **Recommended order:** 40 (after transaction management, wraps handler execution)

    **Required telemetry fields per data-model.md:L459-L466:**
    - Timestamp: ISO 8601 datetime
    - LogLevel: Info/Warning/Error
    - RequestType: Fully qualified request type name
    - Duration: Elapsed time in milliseconds
    - Status: Success|BusinessFailure|InfrastructureError|Cancelled
    - Exception: Full exception details if thrown
    - TransactionId: UUID for ALL command executions (REQUIRED per NFR-002)

    Example:
        ```python
        behavior = TelemetryBehavior(logger, unit_of_work)
        mediator.register_behavior(behavior)
        ```
    """

    order = 40

    def __init__(self, logger: ILogger, unit_of_work: Optional[IUnitOfWork] = None):
        """
        Initialize TelemetryBehavior.

        Args:
            logger: Logger implementation for metrics
            unit_of_work: Optional UnitOfWork for transaction_id correlation
        """
        self.logger = logger
        self.unit_of_work = unit_of_work

    async def handle(self, request: TRequest, next_handler) -> Result[TResponse]:
        """
        Handle request with telemetry logging.

        Args:
            request: The request being processed
            next_handler: Delegate to invoke next behavior or handler

        Returns:
            Result containing response or error
        """
        start_time = time.time()
        request_type = type(request).__name__
        timestamp = datetime.utcnow().isoformat()

        # Log request start
        self.logger.info(
            f"{request_type} started",
            timestamp=timestamp,
            request_type=request_type,
            transaction_id=self._get_transaction_id(request),
        )

        try:
            # Execute handler
            response = await next_handler()
            duration_ms = (time.time() - start_time) * 1000

            # Detect business failure vs success
            status = (
                "BusinessFailure" if self._is_business_failure(response) else "Success"
            )

            # Log completion
            self.logger.info(
                f"{request_type} completed in {duration_ms:.2f}ms - {status}",
                timestamp=datetime.utcnow().isoformat(),
                request_type=request_type,
                duration=duration_ms,
                status=status,
                transaction_id=self._get_transaction_id(request),
            )

            return response
        except Exception as error:
            duration_ms = (time.time() - start_time) * 1000
            status = "InfrastructureError"

            # Log error with full exception details
            self.logger.error(
                f"{request_type} failed after {duration_ms:.2f}ms",
                timestamp=datetime.utcnow().isoformat(),
                request_type=request_type,
                duration=duration_ms,
                status=status,
                exception={
                    "type": type(error).__name__,
                    "message": str(error),
                    "stack": traceback.format_exc(),
                },
                transaction_id=self._get_transaction_id(request),
            )

            # Re-raise to propagate exception
            raise

    def _get_transaction_id(self, request: TRequest) -> Optional[str]:
        """
        Get transaction_id for command executions (REQUIRED per NFR-002 and BR-002).

        Returns None for queries (no transaction).
        """
        if not self._is_command(request):
            return None

        if self.unit_of_work and self.unit_of_work.has_active_transaction:
            return str(self.unit_of_work.transaction_id)

        return None

    def _is_business_failure(self, response) -> bool:
        """Detect business failures (Result.Failure) vs successes."""
        if response is None:
            return False

        # Check if response implements Result with is_failure property
        return hasattr(response, "is_failure") and response.is_failure is True

    def _is_command(self, request) -> bool:
        """Type guard to detect command requests."""
        return isinstance(request, ICommand)


__all__ = ["TelemetryBehavior", "ILogger"]
