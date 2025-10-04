"""Architecture compliance tests (AT-001)."""

import pytest
from typing import List, Any
from architecture_core.functional import Result
from architecture_shell_cqrs import Mediator, IQueryHandler, IQuery


class TestProduct:
    """Mock aggregate for architecture testing."""

    def __init__(self, product_id: str, name: str):
        self.product_id = product_id
        self.name = name


class InMemoryProductRepository:
    """Mock repository with write method tracking."""

    def __init__(self):
        self._products: List[TestProduct] = []
        self.add_called = False
        self.update_called = False
        self.delete_called = False

    async def get_by_id(self, product_id: str) -> TestProduct | None:
        """Read-only method (allowed in queries)."""
        for product in self._products:
            if product.product_id == product_id:
                return product
        return None

    async def list_all(self) -> List[TestProduct]:
        """Read-only method (allowed in queries)."""
        return self._products.copy()

    async def add(self, product: TestProduct) -> None:
        """Write method (NOT allowed in queries)."""
        self.add_called = True
        self._products.append(product)

    async def update(self, product: TestProduct) -> None:
        """Write method (NOT allowed in queries)."""
        self.update_called = True
        for i, p in enumerate(self._products):
            if p.product_id == product.product_id:
                self._products[i] = product
                break

    async def delete(self, product_id: str) -> None:
        """Write method (NOT allowed in queries)."""
        self.delete_called = True
        self._products = [p for p in self._products if p.product_id != product_id]


class GetProductQuery(IQuery[TestProduct | None]):
    """Valid query - read-only operations."""

    def __init__(self, product_id: str):
        self.product_id = product_id


class GetProductQueryHandler(IQueryHandler[GetProductQuery, TestProduct | None]):
    """Valid query handler - only calls read methods."""

    def __init__(self, repository: InMemoryProductRepository):
        self.repository = repository

    async def handle(self, query: GetProductQuery) -> Result[TestProduct | None]:
        """Handle query with read-only operations."""
        product = await self.repository.get_by_id(query.product_id)
        return Result.success(product)


class InvalidQueryThatCallsAdd(IQuery[None]):
    """Invalid query - violates CQRS by calling write methods."""

    def __init__(self, product: TestProduct):
        self.product = product


class InvalidQueryHandlerThatCallsAdd(
    IQueryHandler[InvalidQueryThatCallsAdd, None]
):
    """Invalid query handler - calls repository.add() (write operation)."""

    def __init__(self, repository: InMemoryProductRepository):
        self.repository = repository

    async def handle(self, query: InvalidQueryThatCallsAdd) -> Result[None]:
        """VIOLATION: Query handler calls write method."""
        await self.repository.add(query.product)
        return Result.success(None)


class TestArchitecture_AT001:
    """Architecture compliance tests for CQRS query read-only semantics (AT-001)."""

    @pytest.mark.asyncio
    async def test_should_not_call_repository_write_methods_when_query_handler_executes(
        self,
    ):
        """
        Should not call repository write methods when query handler executes.

        Given: A query handler for read-only operations
        When: The query is executed
        Then: Only repository read methods should be called (get_by_id, list_all)
        And: Repository write methods should NOT be called (add, update, delete)

        This test validates AT-001 requirement that queries must be read-only per CQRS principles.
        """
        # Given
        mediator = Mediator()
        repository = InMemoryProductRepository()

        # Seed repository with test data
        test_product = TestProduct("product-123", "Test Product")
        await repository.add(test_product)

        # Reset write tracking after seeding
        repository.add_called = False
        repository.update_called = False
        repository.delete_called = False

        handler = GetProductQueryHandler(repository)
        mediator.register_handler(GetProductQuery, handler)

        query = GetProductQuery("product-123")

        # When
        result = await mediator.send(query)

        # Then
        assert result.is_success
        assert result.value is not None
        assert result.value.product_id == "product-123"

        # Architecture compliance: verify NO write methods called
        assert (
            not repository.add_called
        ), "AT-001 violation: Query handler called repository.add()"
        assert (
            not repository.update_called
        ), "AT-001 violation: Query handler called repository.update()"
        assert (
            not repository.delete_called
        ), "AT-001 violation: Query handler called repository.delete()"

    @pytest.mark.asyncio
    async def test_should_fail_when_query_handler_calls_write_methods(self):
        """
        Should detect when query handler violates read-only semantics.

        Given: A query handler that incorrectly calls repository write methods
        When: The query is executed
        Then: Write method call should be detected as architecture violation

        This test validates that our architecture tests can detect CQRS violations.
        """
        # Given
        mediator = Mediator()
        repository = InMemoryProductRepository()

        invalid_handler = InvalidQueryHandlerThatCallsAdd(repository)
        mediator.register_handler(InvalidQueryThatCallsAdd, invalid_handler)

        new_product = TestProduct("new-product", "New Product")
        query = InvalidQueryThatCallsAdd(new_product)

        # When
        result = await mediator.send(query)

        # Then - verify the violation occurred
        assert repository.add_called, "Test should detect that write method was called"

        # This demonstrates the violation that should be prevented by architecture rules
        print(
            "✗ Architecture violation detected: Query handler called repository.add()"
        )
