"""Unit of Work protocol for transaction boundary abstraction."""

from abc import ABC, abstractmethod
from typing import Protocol
from uuid import UUID


class IUnitOfWork(Protocol):
    """
    Transaction boundary abstraction for commands.

    Provides transaction lifecycle management with support for nested command detection.

    **Behavioral Requirements:**
    - Commands MUST execute within transaction boundaries (enforced by UnitOfWorkBehavior)
    - Queries MUST NOT open transactions (no-op in UnitOfWorkBehavior)
    - Nested commands MUST reuse active transaction (check has_active_transaction)
    - Transaction commit occurs on successful handler completion (including Result.Failure business errors)
    - Transaction rollback occurs on exception (infrastructure errors only)
    - begin_transaction MUST fail fast when transaction provider unavailable (per BR-006)

    **Usage Pattern:**
    ```python
    # In UnitOfWorkBehavior
    if isinstance(request, ICommand) and not unit_of_work.has_active_transaction:
        await unit_of_work.begin_transaction()
        try:
            response = await next()
            await unit_of_work.commit()  # Even if response is Result.Failure
            return response
        except Exception:
            await unit_of_work.rollback()
            raise
    ```
    """

    @property
    def transaction_id(self) -> UUID:
        """
        Get the transaction ID for correlation with telemetry logs.

        Populated after begin_transaction() is called.

        REQUIRED for all command executions per NFR-002 and BR-002.
        Used by TelemetryBehavior to log transaction context.
        """
        ...

    @property
    def has_active_transaction(self) -> bool:
        """
        Indicate whether a transaction is currently active.

        Used by UnitOfWorkBehavior to detect nested commands and prevent nested transactions.
        """
        ...

    async def begin_transaction(self) -> None:
        """
        Open a new database transaction.

        Raises:
            InvalidOperationException: When transaction provider is unavailable
                (connection pool exhausted, database offline).
                Per BR-006, this MUST fail fast without retry.

        MUST generate new transaction_id and set has_active_transaction to True.
        """
        ...

    async def commit(self) -> None:
        """
        Commit the active transaction, persisting all changes.

        Called by UnitOfWorkBehavior when handler completes successfully.
        This includes scenarios where handler returns Result.Failure (business errors are valid state).
        """
        ...

    async def rollback(self) -> None:
        """
        Roll back the active transaction, discarding all changes.

        Called by UnitOfWorkBehavior when handler or behavior throws exception (infrastructure errors only).
        MUST be logged BEFORE rollback execution per BR-002 to ensure transaction_id correlation
        if rollback itself fails.
        """
        ...


__all__ = ["IUnitOfWork"]
