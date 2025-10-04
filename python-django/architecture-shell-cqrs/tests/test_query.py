"""Unit tests for Query handler execution (UT-002)."""

import pytest
from typing import TypeVar
from architecture_core.functional import Result
from architecture_shell_cqrs import Mediator, IQueryHandler, IQuery


TResult = TypeVar("TResult")


class TestQueryResult:
    """Test query result type."""

    def __init__(self, value: str):
        self.value = value

    def __eq__(self, other):
        if not isinstance(other, TestQueryResult):
            return False
        return self.value == other.value


class TestQuery:
    """Test query."""

    def __init__(self, query_id: str):
        self.query_id = query_id


class TestQueryHandler(IQueryHandler[TestQuery, TestQueryResult]):
    """Test query handler."""

    async def handle(self, query: TestQuery) -> Result[TestQueryResult]:
        """Handle test query."""
        return Result.success(TestQueryResult(f"Result for {query.query_id}"))


class TestQuery_ReturnTypeContracts:
    """Tests for query return type contracts (UT-002)."""

    @pytest.mark.asyncio
    async def test_should_return_correct_type_when_query_handler_executes(self):
        """
        Should return correct type when query handler executes.

        Given: A query handler registered for a specific query type
        When: The query is executed
        Then: Should return the expected result type

        This test validates FR-003 that queries return typed results.
        """
        # Given
        mediator = Mediator()
        handler = TestQueryHandler()
        mediator.register_handler(TestQuery, handler)
        query = TestQuery("test-123")

        # When
        result = await mediator.send(query)

        # Then
        assert result.is_success
        assert isinstance(result.value, TestQueryResult)
        assert result.value.value == "Result for test-123"
