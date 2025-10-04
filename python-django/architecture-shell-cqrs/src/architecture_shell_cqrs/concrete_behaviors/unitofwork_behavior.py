"""UnitOfWorkBehavior - Transaction lifecycle management for commands."""

import time
from typing import Optional, Protocol, TypeVar
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


class UnitOfWorkBehavior(IPipelineBehavior[TRequest, TResponse]):
    """
    Pipeline behavior that manages transaction lifecycle.

    Opens transaction for commands, commits on success (including Result.Failure business errors),
    rolls back on exceptions. Skips transaction management for queries.
    Reuses active transaction for nested commands.

    **Recommended order:** 30 (after validation and authorization)

    **Transaction semantics per BR-006, BR-007, BR-008:**
    - BeginTransaction(): Opens new transaction if none active; throws if transaction provider unavailable (fail fast)
    - Nested commands reuse active transaction (has_active_transaction check)
    - Result.Failure() commits transaction (business rejection is valid state per BR-008)
    - Exceptions rollback transaction (infrastructure errors)
    - Logs transaction_id before rollback for correlation (per BR-002)

    Example:
        ```python
        behavior = UnitOfWorkBehavior(unit_of_work, logger)
        mediator.register_behavior(behavior)
        ```
    """

    order = 30

    def __init__(self, unit_of_work: IUnitOfWork, logger: Optional[ILogger] = None):
        """
        Initialize UnitOfWorkBehavior.

        Args:
            unit_of_work: Transaction boundary abstraction
            logger: Optional logger for transaction correlation
        """
        self.unit_of_work = unit_of_work
        self.logger = logger

    async def handle(self, request: TRequest, next_handler) -> Result[TResponse]:
        """
        Handle request with transaction management.

        Args:
            request: The request being processed
            next_handler: Delegate to invoke next behavior or handler

        Returns:
            Result containing response or error
        """
        # Skip transaction management for queries (BR-003)
        if not self._is_command(request):
            return await next_handler()

        # Reuse active transaction for nested commands (BR-005)
        if self.unit_of_work.has_active_transaction:
            return await next_handler()

        # Begin transaction for commands
        start_time = time.time()
        try:
            await self.unit_of_work.begin_transaction()

            # Execute handler
            response = await next_handler()

            # Commit transaction on success or business failure (BR-008)
            # Result.Failure() indicates business validation failure, not infrastructure error
            await self.unit_of_work.commit()

            return response
        except Exception as error:
            # Log error with transaction_id before rollback per BR-002
            # This ensures correlation even if rollback itself fails
            duration = time.time() - start_time
            if self.logger:
                self.logger.error(
                    "Request failed - rolling back transaction",
                    request_type=type(request).__name__,
                    transaction_id=self.unit_of_work.transaction_id,
                    duration=duration,
                    error=str(error),
                )

            # Rollback transaction on exception (infrastructure error)
            await self.unit_of_work.rollback()

            # Re-raise to propagate exception
            raise

    def _is_command(self, request) -> bool:
        """Type guard to detect command requests."""
        # Check if request implements ICommand protocol
        return isinstance(request, ICommand)


__all__ = ["UnitOfWorkBehavior", "ILogger"]
