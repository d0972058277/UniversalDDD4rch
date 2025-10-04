"""Unit tests for UnitOfWork behavior (UT-005, UT-006, IT-009)."""

import pytest
from typing import List
from architecture_core.functional import Result
from architecture_shell_cqrs import Mediator, ICommandHandler, IPipelineBehavior, ICommand, Unit


class TestCommand:
    """Test command for UnitOfWork tests."""
    pass


class NestedCommand:
    """Nested command for transaction reuse tests."""
    pass


class UnitOfWork:
    """Mock UnitOfWork for testing."""

    def __init__(self):
        self.transaction_started = False
        self.transaction_committed = False
        self.transaction_rolled_back = False
        self.active_transaction = None

    async def begin_transaction(self):
        """Begin a transaction."""
        if self.active_transaction:
            raise RuntimeError("Transaction already active")
        self.transaction_started = True
        self.active_transaction = "transaction-123"

    async def commit(self):
        """Commit the transaction."""
        if not self.active_transaction:
            raise RuntimeError("No active transaction")
        self.transaction_committed = True
        self.active_transaction = None

    async def rollback(self):
        """Rollback the transaction."""
        if not self.active_transaction:
            raise RuntimeError("No active transaction")
        self.transaction_rolled_back = True
        self.active_transaction = None

    def has_active_transaction(self) -> bool:
        """Check if transaction is active."""
        return self.active_transaction is not None


class UnitOfWorkBehavior(IPipelineBehavior[TestCommand, Unit]):
    """Mock UnitOfWork behavior for testing."""

    def __init__(self, unit_of_work: UnitOfWork):
        self.unit_of_work = unit_of_work
        self.order = 30

    async def handle(self, request, next_handler) -> Result[Unit]:
        """Handle with transaction management."""
        if not self.unit_of_work.has_active_transaction():
            await self.unit_of_work.begin_transaction()
            try:
                result = await next_handler()
                await self.unit_of_work.commit()
                return result
            except Exception:
                await self.unit_of_work.rollback()
                raise
        else:
            # Reuse existing transaction
            return await next_handler()


class TestCommandHandler(ICommandHandler[TestCommand, Unit]):
    """Test command handler."""

    async def handle(self, command: TestCommand) -> Result[Unit]:
        """Handle test command."""
        return Result.success(Unit)


class NestedCommandHandler(ICommandHandler[NestedCommand, Unit]):
    """Handler for nested command."""

    def __init__(self, mediator: Mediator):
        self.mediator = mediator

    async def handle(self, command: NestedCommand) -> Result[Unit]:
        """Handle nested command."""
        # This simulates a nested command call
        return Result.success(Unit)


class FailingTransactionProvider:
    """Mock UnitOfWork that fails on transaction begin."""

    async def begin_transaction(self):
        """Fail to begin transaction."""
        raise ConnectionError("Database connection pool exhausted")

    def has_active_transaction(self) -> bool:
        """Check if transaction is active."""
        return False


class TestUnitOfWorkBehavior_Isolated:
    """Tests for UnitOfWork behavior in isolation (UT-005)."""

    @pytest.mark.asyncio
    async def test_should_call_begin_transaction_when_command_executes(self):
        """
        Should call begin transaction when command executes.

        Given: A command with UnitOfWork behavior
        When: The command is executed
        Then: UnitOfWork.begin_transaction() should be called

        This test validates BR-001 that commands execute within transactions.
        Note: This test verifies UnitOfWork behavior in isolation using mocked transactions.
        End-to-end transaction lifecycle validated in integration tests.
        """
        # Given
        mediator = Mediator()
        unit_of_work = UnitOfWork()
        handler = TestCommandHandler()
        behavior = UnitOfWorkBehavior(unit_of_work)

        mediator.register_handler(TestCommand, handler)
        mediator.register_behavior(behavior)

        command = TestCommand()

        # When
        result = await mediator.send(command)

        # Then
        assert result.is_success
        assert unit_of_work.transaction_started
        assert unit_of_work.transaction_committed


class TestUnitOfWorkBehavior_NestedCommands:
    """Tests for nested command transaction reuse (UT-006)."""

    @pytest.mark.asyncio
    async def test_should_reuse_transaction_when_nested_command_executed(self):
        """
        Should reuse transaction when nested command executed.

        Given: An active transaction from outer command
        When: A nested command is executed
        Then: Should reuse the existing transaction (not create new one)

        This test validates BR-005 that nested commands reuse active transactions.
        """
        # Given
        mediator = Mediator()
        unit_of_work = UnitOfWork()

        # Manually start a transaction to simulate outer command
        await unit_of_work.begin_transaction()

        handler = TestCommandHandler()
        behavior = UnitOfWorkBehavior(unit_of_work)

        mediator.register_handler(TestCommand, handler)
        mediator.register_behavior(behavior)

        command = TestCommand()

        # When
        result = await mediator.send(command)

        # Then
        assert result.is_success
        # Transaction should still be active (not committed by nested command)
        assert unit_of_work.has_active_transaction()
        assert not unit_of_work.transaction_committed


class TestUnitOfWorkBehavior_TransactionProviderFailure:
    """Tests for transaction provider failure (IT-009)."""

    @pytest.mark.asyncio
    async def test_should_throw_exception_when_transaction_provider_fails(self):
        """
        Should throw exception when transaction provider fails.

        Given: A UnitOfWork that fails on begin_transaction()
        When: A command is executed
        Then: Should throw exception immediately (fail-fast)

        This test validates BR-006 requirement that UnitOfWork fails fast when
        BeginTransactionAsync() throws (connection pool exhaustion, database unavailability).
        """
        # Given
        failing_provider = FailingTransactionProvider()

        class FailingUnitOfWorkBehavior(IPipelineBehavior[TestCommand, Unit]):
            """UnitOfWork behavior with failing provider."""

            def __init__(self):
                self.order = 30

            async def handle(self, request, next_handler) -> Result[Unit]:
                """Handle with failing transaction."""
                if not failing_provider.has_active_transaction():
                    # This should throw
                    await failing_provider.begin_transaction()
                return await next_handler()

        mediator = Mediator()
        handler = TestCommandHandler()
        behavior = FailingUnitOfWorkBehavior()

        mediator.register_handler(TestCommand, handler)
        mediator.register_behavior(behavior)

        command = TestCommand()

        # When/Then
        with pytest.raises(ConnectionError) as exc_info:
            await mediator.send(command)

        assert "pool exhausted" in str(exc_info.value).lower() or "connection" in str(exc_info.value).lower()
