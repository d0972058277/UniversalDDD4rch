"""
Integration tests for Django ORM repository implementation.

These tests verify Django-specific repository functionality including
ORM integration, transaction handling, and optimistic concurrency.

Note: These tests require Django to be configured and available.
"""

import pytest
import asyncio
from typing import Optional, Dict, Any
from dataclasses import dataclass

# Django integration is optional - skip tests if Django not available
django = pytest.importorskip("django")

from django.test import TestCase
from django.db import models, transaction
from asgiref.sync import sync_to_async

from architecture_core.functional.result import Result
from architecture_core.functional.maybe import Maybe
from architecture_core.functional.error import Error
from django_architecture_core.repositories import DjangoRepository


# Test Django models for integration testing
class TestOrderModel(models.Model):
    """Django model for Order aggregate testing"""
    id = models.CharField(max_length=50, primary_key=True)
    customer_name = models.CharField(max_length=100)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    status = models.CharField(max_length=20, default='DRAFT')
    version = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'test_app'


# Domain objects for testing Django integration
@dataclass(frozen=True)
class TestOrderId:
    """Test Order ID"""
    value: str

    def __str__(self) -> str:
        return self.value

    def __eq__(self, other: object) -> bool:
        return isinstance(other, TestOrderId) and self.value == other.value

    def __hash__(self) -> int:
        return hash(self.value)


@dataclass(frozen=True)
class TestMoney:
    """Test Money value object"""
    amount: float
    currency: str

    def __post_init__(self):
        if self.amount < 0:
            raise ValueError("Amount cannot be negative")


class TestOrder:
    """Domain Order aggregate for testing"""

    def __init__(self, id: TestOrderId, customer_name: str, total: TestMoney, version: int = 0):
        self.id = id
        self.customer_name = customer_name
        self.total = total
        self.status = 'DRAFT'
        self.version = version

    def increment_version(self):
        self.version += 1

    def confirm(self):
        if self.status != 'DRAFT':
            raise ValueError("Can only confirm draft orders")
        self.status = 'CONFIRMED'
        self.increment_version()


class TestDjangoOrderRepository(DjangoRepository[TestOrder, TestOrderId]):
    """Django repository implementation for testing"""

    def __init__(self):
        super().__init__(TestOrderModel)

    def _map_to_domain(self, model_instance: TestOrderModel) -> TestOrder:
        """Map Django model to domain aggregate"""
        money = TestMoney(float(model_instance.total_amount), model_instance.currency)
        order = TestOrder(
            TestOrderId(model_instance.id),
            model_instance.customer_name,
            money,
            model_instance.version
        )
        order.status = model_instance.status
        return order

    def _map_to_model(self, aggregate: TestOrder) -> TestOrderModel:
        """Map domain aggregate to Django model"""
        try:
            model_instance = TestOrderModel.objects.get(id=str(aggregate.id))
            # Update existing instance
            model_instance.customer_name = aggregate.customer_name
            model_instance.total_amount = aggregate.total.amount
            model_instance.currency = aggregate.total.currency
            model_instance.status = aggregate.status
            model_instance.version = aggregate.version
        except TestOrderModel.DoesNotExist:
            # Create new instance
            model_instance = TestOrderModel(
                id=str(aggregate.id),
                customer_name=aggregate.customer_name,
                total_amount=aggregate.total.amount,
                currency=aggregate.total.currency,
                status=aggregate.status,
                version=aggregate.version
            )
        return model_instance

    async def get_by_id_async(self, id: TestOrderId) -> Maybe[TestOrder]:
        """Get order by ID using Django ORM async"""
        try:
            model_instance = await sync_to_async(TestOrderModel.objects.get)(id=str(id))
            domain_order = self._map_to_domain(model_instance)
            return Maybe.some(domain_order)
        except TestOrderModel.DoesNotExist:
            return Maybe.none()
        except Exception as e:
            # In a real implementation, you might want to log this
            return Maybe.none()

    async def add_async(self, aggregate: TestOrder) -> Result[None]:
        """Add order using Django ORM async"""
        try:
            model_instance = self._map_to_model(aggregate)
            await sync_to_async(model_instance.save)()
            return Result.success(None)
        except Exception as e:
            return Result.failure(Error.infrastructure(
                "Django.AddFailed",
                f"Failed to add order: {str(e)}"
            ))

    async def update_async(self, aggregate: TestOrder) -> Result[None]:
        """Update order with optimistic concurrency control"""
        try:
            with transaction.atomic():
                # Check current version in database
                current_model = await sync_to_async(TestOrderModel.objects.get)(id=str(aggregate.id))

                if current_model.version != aggregate.version - 1:
                    return Result.failure(Error.concurrency(
                        "Django.ConcurrencyConflict",
                        f"Version mismatch: expected {current_model.version}, got {aggregate.version - 1}"
                    ))

                # Update the model
                updated_model = self._map_to_model(aggregate)
                await sync_to_async(updated_model.save)()

                return Result.success(None)

        except TestOrderModel.DoesNotExist:
            return Result.failure(Error.domain(
                "Django.OrderNotFound",
                f"Order {aggregate.id} not found"
            ))
        except Exception as e:
            return Result.failure(Error.infrastructure(
                "Django.UpdateFailed",
                f"Failed to update order: {str(e)}"
            ))

    async def delete_async(self, id: TestOrderId) -> Result[None]:
        """Delete order by ID"""
        try:
            deleted_count, _ = await sync_to_async(TestOrderModel.objects.filter(id=str(id)).delete)()
            if deleted_count == 0:
                return Result.failure(Error.domain(
                    "Django.OrderNotFound",
                    f"Order {id} not found for deletion"
                ))
            return Result.success(None)
        except Exception as e:
            return Result.failure(Error.infrastructure(
                "Django.DeleteFailed",
                f"Failed to delete order: {str(e)}"
            ))

    async def exists_async(self, id: TestOrderId) -> bool:
        """Check if order exists"""
        try:
            return await sync_to_async(TestOrderModel.objects.filter(id=str(id)).exists)()
        except Exception:
            return False

    # Domain-specific query methods
    async def find_by_customer_name_async(self, customer_name: str) -> list[TestOrder]:
        """Find orders by customer name"""
        try:
            models = await sync_to_async(list)(
                TestOrderModel.objects.filter(customer_name=customer_name)
            )
            return [self._map_to_domain(model) for model in models]
        except Exception:
            return []

    async def find_by_status_async(self, status: str) -> list[TestOrder]:
        """Find orders by status"""
        try:
            models = await sync_to_async(list)(
                TestOrderModel.objects.filter(status=status)
            )
            return [self._map_to_domain(model) for model in models]
        except Exception:
            return []


@pytest.mark.django_db
class TestDjangoRepositoryIntegration:
    """Integration tests for Django repository implementation"""

    @pytest.fixture
    def repository(self):
        """Create repository for testing"""
        return TestDjangoOrderRepository()

    @pytest.fixture
    def sample_order(self):
        """Create sample order for testing"""
        return TestOrder(
            TestOrderId("DJANGO-001"),
            "John Doe",
            TestMoney(100.50, "USD")
        )

    @pytest.mark.asyncio
    async def test_should_add_order_successfully_to_django_db(self, repository, sample_order):
        """
        Test successful order addition to Django database

        Given: New order and Django repository
        When: Adding order
        Then: Order should be persisted in database
        """
        # Given
        initial_count = await sync_to_async(TestOrderModel.objects.count)()

        # When
        result = await repository.add_async(sample_order)

        # Then
        assert result.is_success

        # Verify in database
        final_count = await sync_to_async(TestOrderModel.objects.count)()
        assert final_count == initial_count + 1

        # Verify data integrity
        db_model = await sync_to_async(TestOrderModel.objects.get)(id="DJANGO-001")
        assert db_model.customer_name == "John Doe"
        assert float(db_model.total_amount) == 100.50
        assert db_model.currency == "USD"
        assert db_model.status == "DRAFT"
        assert db_model.version == 0

    @pytest.mark.asyncio
    async def test_should_retrieve_order_from_django_db_when_exists(self, repository, sample_order):
        """
        Test order retrieval from Django database

        Given: Order stored in database
        When: Retrieving by ID
        Then: Should return correct domain object
        """
        # Given
        await repository.add_async(sample_order)

        # When
        result = await repository.get_by_id_async(sample_order.id)

        # Then
        assert result.has_value
        retrieved_order = result.value
        assert retrieved_order.id == sample_order.id
        assert retrieved_order.customer_name == sample_order.customer_name
        assert retrieved_order.total.amount == sample_order.total.amount
        assert retrieved_order.total.currency == sample_order.total.currency

    @pytest.mark.asyncio
    async def test_should_return_none_when_order_not_exists_in_django_db(self, repository):
        """
        Test retrieval when order doesn't exist

        Given: Empty database
        When: Retrieving non-existent order
        Then: Should return None
        """
        # Given
        non_existent_id = TestOrderId("NON-EXISTENT")

        # When
        result = await repository.get_by_id_async(non_existent_id)

        # Then
        assert not result.has_value

    @pytest.mark.asyncio
    async def test_should_update_order_with_optimistic_concurrency_control(self, repository, sample_order):
        """
        Test order update with optimistic concurrency

        Given: Order in database
        When: Updating with correct version
        Then: Should update successfully
        """
        # Given
        await repository.add_async(sample_order)

        # Modify the order
        sample_order.customer_name = "Jane Smith"
        sample_order.increment_version()

        # When
        result = await repository.update_async(sample_order)

        # Then
        assert result.is_success

        # Verify in database
        db_model = await sync_to_async(TestOrderModel.objects.get)(id=str(sample_order.id))
        assert db_model.customer_name == "Jane Smith"
        assert db_model.version == 1

    @pytest.mark.asyncio
    async def test_should_fail_update_with_version_conflict(self, repository, sample_order):
        """
        Test update failure due to version conflict

        Given: Order in database
        When: Updating with wrong version
        Then: Should fail with concurrency error
        """
        # Given
        await repository.add_async(sample_order)

        # Simulate version conflict
        sample_order.version = 5  # Should be 1 for first update
        sample_order.customer_name = "Conflict Test"

        # When
        result = await repository.update_async(sample_order)

        # Then
        assert result.is_failure
        assert result.error.code == "Django.ConcurrencyConflict"
        assert "Version mismatch" in result.error.message

    @pytest.mark.asyncio
    async def test_should_delete_order_from_django_db(self, repository, sample_order):
        """
        Test order deletion from Django database

        Given: Order in database
        When: Deleting the order
        Then: Order should be removed from database
        """
        # Given
        await repository.add_async(sample_order)
        initial_count = await sync_to_async(TestOrderModel.objects.count)()

        # When
        result = await repository.delete_async(sample_order.id)

        # Then
        assert result.is_success

        # Verify removal
        final_count = await sync_to_async(TestOrderModel.objects.count)()
        assert final_count == initial_count - 1

        # Verify order no longer exists
        exists = await repository.exists_async(sample_order.id)
        assert not exists

    @pytest.mark.asyncio
    async def test_should_check_existence_correctly_in_django_db(self, repository, sample_order):
        """
        Test existence checking with Django database

        Given: Orders in various states
        When: Checking existence
        Then: Should return correct results
        """
        # Given - Order doesn't exist initially
        exists_before = await repository.exists_async(sample_order.id)
        assert not exists_before

        # Given - Add order
        await repository.add_async(sample_order)

        # When/Then - Should exist after adding
        exists_after = await repository.exists_async(sample_order.id)
        assert exists_after

        # When - Delete order
        await repository.delete_async(sample_order.id)

        # Then - Should not exist after deletion
        exists_deleted = await repository.exists_async(sample_order.id)
        assert not exists_deleted

    @pytest.mark.asyncio
    async def test_should_find_orders_by_customer_name(self, repository):
        """
        Test domain-specific query by customer name

        Given: Multiple orders with different customers
        When: Querying by customer name
        Then: Should return only matching orders
        """
        # Given
        order1 = TestOrder(TestOrderId("CUST-001"), "Alice Johnson", TestMoney(150.00, "USD"))
        order2 = TestOrder(TestOrderId("CUST-002"), "Bob Wilson", TestMoney(200.00, "EUR"))
        order3 = TestOrder(TestOrderId("CUST-003"), "Alice Johnson", TestMoney(75.50, "USD"))

        await repository.add_async(order1)
        await repository.add_async(order2)
        await repository.add_async(order3)

        # When
        alice_orders = await repository.find_by_customer_name_async("Alice Johnson")
        bob_orders = await repository.find_by_customer_name_async("Bob Wilson")
        nobody_orders = await repository.find_by_customer_name_async("Nobody")

        # Then
        assert len(alice_orders) == 2
        assert len(bob_orders) == 1
        assert len(nobody_orders) == 0

        # Verify correct orders returned
        alice_ids = {str(order.id) for order in alice_orders}
        assert "CUST-001" in alice_ids
        assert "CUST-003" in alice_ids

        assert str(bob_orders[0].id) == "CUST-002"

    @pytest.mark.asyncio
    async def test_should_find_orders_by_status(self, repository):
        """
        Test domain-specific query by order status

        Given: Orders with different statuses
        When: Querying by status
        Then: Should return only matching orders
        """
        # Given
        draft_order = TestOrder(TestOrderId("DRAFT-001"), "Customer A", TestMoney(100.00, "USD"))
        confirmed_order = TestOrder(TestOrderId("CONF-001"), "Customer B", TestMoney(200.00, "USD"))
        confirmed_order.confirm()

        await repository.add_async(draft_order)
        await repository.add_async(confirmed_order)

        # When
        draft_orders = await repository.find_by_status_async("DRAFT")
        confirmed_orders = await repository.find_by_status_async("CONFIRMED")
        cancelled_orders = await repository.find_by_status_async("CANCELLED")

        # Then
        assert len(draft_orders) == 1
        assert len(confirmed_orders) == 1
        assert len(cancelled_orders) == 0

        assert str(draft_orders[0].id) == "DRAFT-001"
        assert str(confirmed_orders[0].id) == "CONF-001"

    @pytest.mark.asyncio
    async def test_should_handle_django_transaction_rollback_on_error(self, repository):
        """
        Test transaction rollback behavior on errors

        Given: Repository operation that should fail
        When: Operation fails within transaction
        Then: Changes should be rolled back
        """
        # This test would require more sophisticated setup to trigger
        # actual transaction failures. For now, we test the error handling
        # path by testing invalid operations.

        # Given - Try to update non-existent order
        non_existent_order = TestOrder(TestOrderId("NON-EXISTENT"), "Test", TestMoney(100.00, "USD"))
        non_existent_order.increment_version()

        # When
        result = await repository.update_async(non_existent_order)

        # Then
        assert result.is_failure
        assert result.error.code == "Django.OrderNotFound"

        # Verify no partial state was created
        exists = await repository.exists_async(non_existent_order.id)
        assert not exists

    @pytest.mark.asyncio
    async def test_should_handle_concurrent_django_operations(self, repository):
        """
        Test concurrent operations with Django ORM

        Given: Multiple concurrent Django operations
        When: Executing operations in parallel
        Then: All operations should complete correctly
        """
        # Given
        orders = [
            TestOrder(TestOrderId(f"CONCURRENT-{i}"), f"Customer {i}", TestMoney(100.0 * i, "USD"))
            for i in range(1, 6)
        ]

        # When - Add all orders concurrently
        add_tasks = [repository.add_async(order) for order in orders]
        add_results = await asyncio.gather(*add_tasks, return_exceptions=True)

        # Then - All additions should succeed
        for result in add_results:
            assert not isinstance(result, Exception)
            assert result.is_success

        # Verify all orders exist
        for order in orders:
            exists = await repository.exists_async(order.id)
            assert exists

        # When - Retrieve all orders concurrently
        get_tasks = [repository.get_by_id_async(order.id) for order in orders]
        get_results = await asyncio.gather(*get_tasks, return_exceptions=True)

        # Then - All retrievals should succeed
        for result in get_results:
            assert not isinstance(result, Exception)
            assert result.has_value

    @pytest.mark.asyncio
    async def test_should_maintain_data_integrity_across_django_operations(self, repository):
        """
        Test data integrity across multiple Django operations

        Given: Series of operations on same order
        When: Performing CRUD operations
        Then: Data should remain consistent
        """
        # Given
        order = TestOrder(TestOrderId("INTEGRITY-001"), "Data Test", TestMoney(250.75, "EUR"))

        # When/Then - Add order
        add_result = await repository.add_async(order)
        assert add_result.is_success

        # When/Then - Retrieve and verify
        get_result = await repository.get_by_id_async(order.id)
        assert get_result.has_value
        retrieved = get_result.value
        assert retrieved.customer_name == "Data Test"
        assert retrieved.total.amount == 250.75
        assert retrieved.total.currency == "EUR"

        # When/Then - Update order
        order.customer_name = "Updated Name"
        order.total = TestMoney(300.00, "EUR")
        order.increment_version()

        update_result = await repository.update_async(order)
        assert update_result.is_success

        # When/Then - Verify update
        updated_get = await repository.get_by_id_async(order.id)
        assert updated_get.has_value
        updated = updated_get.value
        assert updated.customer_name == "Updated Name"
        assert updated.total.amount == 300.00
        assert updated.version == 1

        # When/Then - Delete order
        delete_result = await repository.delete_async(order.id)
        assert delete_result.is_success

        # When/Then - Verify deletion
        final_get = await repository.get_by_id_async(order.id)
        assert not final_get.has_value