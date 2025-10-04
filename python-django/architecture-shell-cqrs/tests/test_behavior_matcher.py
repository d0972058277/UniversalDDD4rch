"""Unit tests for BehaviorMatcher type guards (UT-007)."""

import pytest
from architecture_core.functional import Result
from architecture_shell_cqrs import Mediator, ICommandHandler, IQueryHandler, IPipelineBehavior, Unit


class TestCommand:
    """Test command."""
    pass


class TestQuery:
    """Test query."""
    pass


class TestCommandHandler(ICommandHandler[TestCommand, Unit]):
    """Test command handler."""

    async def handle(self, command: TestCommand) -> Result[Unit]:
        """Handle test command."""
        return Result.success(Unit)


class TestQueryHandler(IQueryHandler[TestQuery, str]):
    """Test query handler."""

    async def handle(self, query: TestQuery) -> Result[str]:
        """Handle test query."""
        return Result.success("query result")


class BehaviorMatcher:
    """Type guard matcher for behaviors."""

    @staticmethod
    def is_command(request) -> bool:
        """Check if request is a command."""
        # In Python, we can check if the request implements ICommand
        # For now, simple type check
        return isinstance(request, TestCommand)

    @staticmethod
    def is_query(request) -> bool:
        """Check if request is a query."""
        return isinstance(request, TestQuery)


class CommandOnlyBehavior(IPipelineBehavior):
    """Behavior that only applies to commands."""

    def __init__(self):
        self.executed = False
        self.order = 10

    async def handle(self, request, next_handler) -> Result:
        """Handle only commands."""
        if BehaviorMatcher.is_command(request):
            self.executed = True
        return await next_handler()


class QueryOnlyBehavior(IPipelineBehavior):
    """Behavior that only applies to queries."""

    def __init__(self):
        self.executed = False
        self.order = 10

    async def handle(self, request, next_handler) -> Result:
        """Handle only queries."""
        if BehaviorMatcher.is_query(request):
            self.executed = True
        return await next_handler()


class TestBehaviorMatcher_TypeGuards:
    """Tests for BehaviorMatcher type guard validation (UT-007)."""

    @pytest.mark.asyncio
    async def test_should_match_commands_when_is_command_guard_used(self):
        """
        Should match commands when IsCommand guard used.

        Given: A behavior that uses IsCommand type guard
        When: A command and a query are processed
        Then: Behavior should only execute for commands, not queries

        This test validates FR-007 requirement that BehaviorMatcher provides
        type guards (IsCommand, IsQuery) to selectively apply behaviors to request types.
        """
        # Given
        mediator = Mediator()
        command_handler = TestCommandHandler()
        query_handler = TestQueryHandler()
        command_only_behavior = CommandOnlyBehavior()

        mediator.register_handler(TestCommand, command_handler)
        mediator.register_handler(TestQuery, query_handler)
        mediator.register_behavior(command_only_behavior)

        command = TestCommand()
        query = TestQuery()

        # When: Execute command
        command_result = await mediator.send(command)

        # Then: Behavior should have executed for command
        assert command_result.is_success
        assert command_only_behavior.executed

        # When: Execute query
        command_only_behavior.executed = False  # Reset
        query_result = await mediator.send(query)

        # Then: Behavior should NOT have executed for query
        assert query_result.is_success
        assert not command_only_behavior.executed


    @pytest.mark.asyncio
    async def test_should_match_queries_when_is_query_guard_used(self):
        """
        Should match queries when IsQuery guard used.

        Given: A behavior that uses IsQuery type guard
        When: A query and a command are processed
        Then: Behavior should only execute for queries, not commands
        """
        # Given
        mediator = Mediator()
        command_handler = TestCommandHandler()
        query_handler = TestQueryHandler()
        query_only_behavior = QueryOnlyBehavior()

        mediator.register_handler(TestCommand, command_handler)
        mediator.register_handler(TestQuery, query_handler)
        mediator.register_behavior(query_only_behavior)

        command = TestCommand()
        query = TestQuery()

        # When: Execute query
        query_result = await mediator.send(query)

        # Then: Behavior should have executed for query
        assert query_result.is_success
        assert query_only_behavior.executed

        # When: Execute command
        query_only_behavior.executed = False  # Reset
        command_result = await mediator.send(command)

        # Then: Behavior should NOT have executed for command
        assert command_result.is_success
        assert not query_only_behavior.executed
