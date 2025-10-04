"""InMemoryUnitOfWork - In-memory transaction implementation for testing."""

from uuid import UUID, uuid4
from typing import Optional
from architecture_shell_cqrs.unit_of_work import IUnitOfWork


class InMemoryUnitOfWork(IUnitOfWork):
    """
    In-memory transaction implementation for testing.

    Simulates transaction behavior without actual database connections.
    Tracks transaction state for test verification.

    **Used by integration tests to validate transaction lifecycle:**
    - Begin/commit/rollback call sequences
    - Nested transaction reuse
    - transaction_id generation

    Example:
        ```python
        unit_of_work = InMemoryUnitOfWork()
        await unit_of_work.begin_transaction()
        # ... execute commands
        await unit_of_work.commit()
        assert unit_of_work.commit_call_count == 1
        ```
    """

    def __init__(self):
        """Initialize InMemoryUnitOfWork with no active transaction."""
        self._transaction_id: Optional[UUID] = None
        self._has_active_transaction = False

        # Test instrumentation properties
        self.begin_transaction_call_count = 0
        self.commit_call_count = 0
        self.rollback_call_count = 0

    @property
    def transaction_id(self) -> UUID:
        """Get the transaction ID for correlation with telemetry logs."""
        if self._transaction_id is None:
            raise ValueError("No active transaction")
        return self._transaction_id

    @property
    def has_active_transaction(self) -> bool:
        """Indicate whether a transaction is currently active."""
        return self._has_active_transaction

    async def begin_transaction(self) -> None:
        """
        Open a new database transaction.

        If transaction already active, reuses existing (nested transaction support).
        """
        if self._has_active_transaction:
            # Nested transaction attempt - reuse existing
            return

        self._transaction_id = uuid4()
        self._has_active_transaction = True
        self.begin_transaction_call_count += 1

    async def commit(self) -> None:
        """
        Commit the active transaction, persisting all changes.

        Raises:
            ValueError: When no active transaction exists
        """
        if not self._has_active_transaction:
            raise ValueError("No active transaction to commit")

        self._has_active_transaction = False
        self._transaction_id = None
        self.commit_call_count += 1

    async def rollback(self) -> None:
        """
        Roll back the active transaction, discarding all changes.

        Rollback on non-active transaction is a no-op.
        """
        if not self._has_active_transaction:
            # Rollback on non-active transaction is a no-op
            return

        self._has_active_transaction = False
        self._transaction_id = None
        self.rollback_call_count += 1

    def reset(self) -> None:
        """Reset call counts for test isolation."""
        self._transaction_id = None
        self._has_active_transaction = False
        self.begin_transaction_call_count = 0
        self.commit_call_count = 0
        self.rollback_call_count = 0


__all__ = ["InMemoryUnitOfWork"]
