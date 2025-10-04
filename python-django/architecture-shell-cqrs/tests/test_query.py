"""Unit tests for Query handler execution (UT-002, IT-004, IT-005)."""

import pytest
from typing import TypeVar, Optional, Any, Dict
from architecture_core.functional import Result
from architecture_shell_cqrs import Mediator, IQueryHandler, IQuery
from architecture_shell_cqrs.concrete_behaviors.unitofwork_behavior import UnitOfWorkBehavior
from architecture_shell_cqrs.concrete_behaviors.caching_behavior import CachingBehavior, ICacheProvider
from tests.in_memory_unitofwork import InMemoryUnitOfWork


TResult = TypeVar("TResult")


class TestQueryResult:
    """Test query result type."""

    def __init__(self, value: str):
        self.value = value

    def __eq__(self, other):
        if not isinstance(other, TestQueryResult):
            return False
        return self.value == other.value


class TestQuery(IQuery[TestQueryResult]):
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


class TestQueryExecution_IT004:
    """Integration tests for query execution without transactions (IT-004)."""

    @pytest.mark.asyncio
    async def test_should_skip_transaction_management_when_query_executes(self):
        """
        Should skip transaction management when query executes.

        Given: A query with UnitOfWork behavior registered
        When: The query is executed
        Then: UnitOfWork should NOT begin/commit transactions (queries are read-only)

        This test validates BR-003 that queries do NOT open transactions.
        """
        # Given
        mediator = Mediator()
        unit_of_work = InMemoryUnitOfWork()
        handler = TestQueryHandler()
        behavior = UnitOfWorkBehavior(unit_of_work)

        mediator.register_handler(TestQuery, handler)
        mediator.register_behavior(behavior)

        query = TestQuery("test-query-123")

        # When
        result = await mediator.send(query)

        # Then
        assert result.is_success
        assert isinstance(result.value, TestQueryResult)
        assert result.value.value == "Result for test-query-123"

        # Transaction should NOT be used for queries
        assert unit_of_work.begin_transaction_call_count == 0, "Should not begin transaction for query"
        assert unit_of_work.commit_call_count == 0, "Should not commit transaction for query"
        assert unit_of_work.rollback_call_count == 0, "Should not rollback transaction for query"


class InMemoryCacheProvider(ICacheProvider):
    """In-memory cache provider for testing."""

    def __init__(self):
        """Initialize empty cache."""
        self._cache: Dict[str, Any] = {}

    async def get(self, key: str) -> Optional[Any]:
        """Retrieve cached value."""
        return self._cache.get(key)

    async def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        """Store value in cache."""
        self._cache[key] = value

    async def remove(self, key: str) -> None:
        """Remove value from cache."""
        self._cache.pop(key, None)


class CacheableTestQuery(IQuery[TestQueryResult]):
    """Cacheable test query."""

    def __init__(self, query_id: str):
        self.query_id = query_id
        self.cache_ttl_seconds = 300  # 5 minutes
        self.cache_key = query_id


class CacheableTestQueryHandler(IQueryHandler[CacheableTestQuery, TestQueryResult]):
    """Handler for cacheable test query."""

    def __init__(self):
        """Initialize handler with execution count."""
        self.execution_count = 0

    async def handle(self, query: CacheableTestQuery) -> Result[TestQueryResult]:
        """Handle cacheable query and track execution count."""
        self.execution_count += 1
        return Result.success(TestQueryResult(f"Result for {query.query_id}"))


class TestQueryExecution_IT005:
    """Integration tests for query caching behavior (IT-005)."""

    @pytest.mark.asyncio
    async def test_should_return_cached_result_when_query_executed_twice(self):
        """
        Should return cached result when query executed twice.

        Given: A cacheable query with CachingBehavior registered
        When: The same query is executed twice
        Then: Handler should execute only once (second call uses cached result)

        This test validates that CachingBehavior caches query results.
        """
        # Given
        mediator = Mediator()
        cache_provider = InMemoryCacheProvider()
        handler = CacheableTestQueryHandler()
        behavior = CachingBehavior(cache_provider)

        mediator.register_handler(CacheableTestQuery, handler)
        mediator.register_behavior(behavior)

        query = CacheableTestQuery("cached-query-123")

        # When - First execution
        result1 = await mediator.send(query)

        # Then - First execution should succeed and call handler
        assert result1.is_success
        assert isinstance(result1.value, TestQueryResult)
        assert result1.value.value == "Result for cached-query-123"
        assert handler.execution_count == 1, "Handler should execute once for first call"

        # When - Second execution (same query)
        result2 = await mediator.send(query)

        # Then - Second execution should return cached result without calling handler
        assert result2.is_success
        assert isinstance(result2.value, TestQueryResult)
        assert result2.value.value == "Result for cached-query-123"
        assert handler.execution_count == 1, "Handler should NOT execute again (cache hit)"
        assert result1.value == result2.value, "Results should be identical"
