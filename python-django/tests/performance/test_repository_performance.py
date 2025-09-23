"""
Performance benchmarks for repository operations.

Validates that repository operations meet performance targets
for database operations as specified in the Architecture.Core requirements.

Target: <200ms p95 for repository operations
"""

import time
import statistics
import asyncio
from typing import List, Dict, Any, Optional
from decimal import Decimal
from unittest.mock import AsyncMock, Mock

import pytest

# Import core types
from architecture_core.domain.repositories import Repository
from architecture_core.functional.result import Result
from architecture_core.functional.maybe import Maybe
from architecture_core.functional.error import Error

# Import Django types (mocked for testing)
from django_architecture_core.repositories import DjangoRepository

# Import example domain for testing
from examples.order_domain.aggregates import Order, OrderStatus
from examples.order_domain.identifiers import OrderId, CustomerId, ProductId
from examples.order_domain.value_objects import Money, Address, PersonName, Quantity


class MockOrderModel:
    """Mock Django model for testing."""

    def __init__(self, **kwargs):
        self.pk = kwargs.get('pk')
        self.version = kwargs.get('version', 0)
        self.customer_id = kwargs.get('customer_id')
        self.customer_name = kwargs.get('customer_name')
        self.status = kwargs.get('status', 'draft')
        self.total_amount = kwargs.get('total_amount', '0.00')
        self.currency = kwargs.get('currency', 'USD')

    async def asave(self):
        """Mock async save."""
        await asyncio.sleep(0.001)  # Simulate database latency

    class objects:
        @classmethod
        async def aget(cls, pk):
            """Mock async get."""
            await asyncio.sleep(0.002)  # Simulate database latency
            if pk == "ORD-NOT-FOUND":
                from django.core.exceptions import ObjectDoesNotExist
                raise ObjectDoesNotExist("Order not found")

            return MockOrderModel(
                pk=pk,
                version=1,
                customer_id="CUST-789",
                customer_name="John Doe",
                status="draft",
                total_amount="25.99",
                currency="USD"
            )

        @classmethod
        def filter(cls, **kwargs):
            """Mock filter method."""
            return MockQuerySet()

        @classmethod
        async def aexists(cls):
            """Mock async exists."""
            await asyncio.sleep(0.001)
            return True

    class _meta:
        fields = [
            Mock(name='id'),
            Mock(name='version'),
            Mock(name='customer_id'),
            Mock(name='customer_name'),
            Mock(name='status'),
            Mock(name='total_amount'),
            Mock(name='currency')
        ]


class MockQuerySet:
    """Mock Django QuerySet."""

    async def aupdate(self, **kwargs):
        """Mock async update."""
        await asyncio.sleep(0.003)  # Simulate database latency
        return 1  # Rows affected

    async def adelete(self):
        """Mock async delete."""
        await asyncio.sleep(0.002)  # Simulate database latency
        return (1, {'MockOrderModel': 1})  # (count, details)

    async def aexists(self):
        """Mock async exists."""
        await asyncio.sleep(0.001)
        return True


class MockOrderRepository(DjangoRepository[Order, OrderId, MockOrderModel]):
    """Mock repository implementation for testing."""

    def __init__(self):
        super().__init__(MockOrderModel)

    def _map_to_domain(self, model_instance: MockOrderModel) -> Order:
        """Map mock model to domain aggregate."""
        order_id = OrderId(model_instance.pk)
        customer_id = CustomerId(model_instance.customer_id)
        customer_name = PersonName("John", "Doe")
        address = Address(
            street="123 Main St",
            city="Anytown",
            state="ST",
            postal_code="12345",
            country="US"
        )

        order = Order(order_id, customer_id, customer_name, address)
        order._mark_version(model_instance.version)
        return order

    def _map_to_model(self, aggregate: Order) -> MockOrderModel:
        """Map domain aggregate to mock model."""
        return MockOrderModel(
            pk=str(aggregate.id),
            version=aggregate.version,
            customer_id=str(aggregate.customer_id),
            customer_name=aggregate.customer_name.get_full_name(),
            status=aggregate.status.value,
            total_amount=str(aggregate.total_amount.amount),
            currency=aggregate.total_amount.currency
        )


class TestRepositoryPerformance:
    """Performance tests for repository operations."""

    # Performance targets
    MAX_OPERATION_TIME_MS = 200.0  # 200ms p95 target
    MEASUREMENT_ITERATIONS = 100  # Enough for reliable measurements
    WARMUP_ITERATIONS = 10  # Warmup iterations

    def setup_method(self):
        """Set up test data."""
        self.repository = MockOrderRepository()
        self.order_id = OrderId("ORD-123456")
        self.customer_id = CustomerId("CUST-789")
        self.customer_name = PersonName("John", "Doe")
        self.address = Address(
            street="123 Main St",
            city="Anytown",
            state="ST",
            postal_code="12345",
            country="US"
        )

    async def measure_async_operation(self, operation, iterations: int = None) -> Dict[str, float]:
        """
        Measure async operation performance.

        Args:
            operation: The async operation to measure
            iterations: Number of iterations (defaults to MEASUREMENT_ITERATIONS)

        Returns:
            Dictionary with performance statistics
        """
        if iterations is None:
            iterations = self.MEASUREMENT_ITERATIONS

        # Warmup phase
        for _ in range(self.WARMUP_ITERATIONS):
            await operation()

        # Measurement phase
        times = []
        for _ in range(iterations):
            start_time = time.perf_counter()
            await operation()
            end_time = time.perf_counter()
            times.append((end_time - start_time) * 1000)  # Convert to milliseconds

        return {
            'mean': statistics.mean(times),
            'median': statistics.median(times),
            'p95': self._calculate_percentile(times, 95),
            'p99': self._calculate_percentile(times, 99),
            'min': min(times),
            'max': max(times)
        }

    def _calculate_percentile(self, times: List[float], percentile: float) -> float:
        """Calculate percentile from timing data."""
        sorted_times = sorted(times)
        index = int((percentile / 100) * len(sorted_times))
        if index >= len(sorted_times):
            index = len(sorted_times) - 1
        return sorted_times[index]

    @pytest.mark.asyncio
    async def test_get_by_id_performance(self):
        """Test get by ID operation performance."""
        async def get_operation():
            return await self.repository.get_by_id_async(self.order_id)

        stats = await self.measure_async_operation(get_operation)

        print(f"\nGet By ID Performance:")
        print(f"  Mean: {stats['mean']:.2f}ms")
        print(f"  Median: {stats['median']:.2f}ms")
        print(f"  95th percentile: {stats['p95']:.2f}ms")
        print(f"  99th percentile: {stats['p99']:.2f}ms")
        print(f"  Min: {stats['min']:.2f}ms")
        print(f"  Max: {stats['max']:.2f}ms")
        print(f"  Target: < {self.MAX_OPERATION_TIME_MS}ms p95")

        assert stats['p95'] < self.MAX_OPERATION_TIME_MS, f"Get by ID p95 {stats['p95']:.2f}ms exceeds {self.MAX_OPERATION_TIME_MS}ms target"

    @pytest.mark.asyncio
    async def test_add_performance(self):
        """Test add operation performance."""
        async def add_operation():
            order = Order(
                order_id=OrderId(f"ORD-{time.time_ns()}"),
                customer_id=self.customer_id,
                customer_name=self.customer_name,
                billing_address=self.address
            )
            return await self.repository.add_async(order)

        stats = await self.measure_async_operation(add_operation)

        print(f"\nAdd Operation Performance:")
        print(f"  Mean: {stats['mean']:.2f}ms")
        print(f"  95th percentile: {stats['p95']:.2f}ms")
        print(f"  Target: < {self.MAX_OPERATION_TIME_MS}ms p95")

        assert stats['p95'] < self.MAX_OPERATION_TIME_MS, f"Add operation p95 {stats['p95']:.2f}ms exceeds {self.MAX_OPERATION_TIME_MS}ms target"

    @pytest.mark.asyncio
    async def test_update_performance(self):
        """Test update operation performance."""
        # Create a base order for updating
        base_order = Order(
            order_id=self.order_id,
            customer_id=self.customer_id,
            customer_name=self.customer_name,
            billing_address=self.address
        )

        async def update_operation():
            # Create a fresh order for each update to avoid concurrency issues
            order = Order(
                order_id=OrderId(f"ORD-{time.time_ns()}"),
                customer_id=self.customer_id,
                customer_name=self.customer_name,
                billing_address=self.address
            )
            order._mark_version(1)  # Set version for update
            return await self.repository.update_async(order)

        stats = await self.measure_async_operation(update_operation)

        print(f"\nUpdate Operation Performance:")
        print(f"  Mean: {stats['mean']:.2f}ms")
        print(f"  95th percentile: {stats['p95']:.2f}ms")
        print(f"  Target: < {self.MAX_OPERATION_TIME_MS}ms p95")

        assert stats['p95'] < self.MAX_OPERATION_TIME_MS, f"Update operation p95 {stats['p95']:.2f}ms exceeds {self.MAX_OPERATION_TIME_MS}ms target"

    @pytest.mark.asyncio
    async def test_delete_performance(self):
        """Test delete operation performance."""
        async def delete_operation():
            order_id = OrderId(f"ORD-{time.time_ns()}")
            return await self.repository.delete_async(order_id)

        stats = await self.measure_async_operation(delete_operation)

        print(f"\nDelete Operation Performance:")
        print(f"  Mean: {stats['mean']:.2f}ms")
        print(f"  95th percentile: {stats['p95']:.2f}ms")
        print(f"  Target: < {self.MAX_OPERATION_TIME_MS}ms p95")

        assert stats['p95'] < self.MAX_OPERATION_TIME_MS, f"Delete operation p95 {stats['p95']:.2f}ms exceeds {self.MAX_OPERATION_TIME_MS}ms target"

    @pytest.mark.asyncio
    async def test_exists_performance(self):
        """Test exists check performance."""
        async def exists_operation():
            return await self.repository.exists_async(self.order_id)

        stats = await self.measure_async_operation(exists_operation)

        print(f"\nExists Check Performance:")
        print(f"  Mean: {stats['mean']:.2f}ms")
        print(f"  95th percentile: {stats['p95']:.2f}ms")
        print(f"  Target: < {self.MAX_OPERATION_TIME_MS}ms p95")

        assert stats['p95'] < self.MAX_OPERATION_TIME_MS, f"Exists check p95 {stats['p95']:.2f}ms exceeds {self.MAX_OPERATION_TIME_MS}ms target"

    @pytest.mark.asyncio
    async def test_concurrent_operations_performance(self):
        """Test concurrent repository operations performance."""
        async def concurrent_reads():
            tasks = []
            for i in range(10):
                order_id = OrderId(f"ORD-{i:06d}")
                task = self.repository.get_by_id_async(order_id)
                tasks.append(task)

            results = await asyncio.gather(*tasks)
            return results

        stats = await self.measure_async_operation(concurrent_reads, iterations=20)

        print(f"\nConcurrent Operations Performance (10 concurrent reads):")
        print(f"  Mean: {stats['mean']:.2f}ms")
        print(f"  95th percentile: {stats['p95']:.2f}ms")
        print(f"  Target: < {self.MAX_OPERATION_TIME_MS * 2}ms p95 (2x for concurrent)")

        # Allow 2x target for concurrent operations
        max_concurrent_time = self.MAX_OPERATION_TIME_MS * 2
        assert stats['p95'] < max_concurrent_time, f"Concurrent operations p95 {stats['p95']:.2f}ms exceeds {max_concurrent_time}ms target"

    @pytest.mark.asyncio
    async def test_batch_operations_performance(self):
        """Test batch repository operations performance."""
        async def batch_adds():
            orders = []
            for i in range(10):
                order = Order(
                    order_id=OrderId(f"ORD-BATCH-{time.time_ns()}-{i}"),
                    customer_id=self.customer_id,
                    customer_name=self.customer_name,
                    billing_address=self.address
                )
                orders.append(order)

            # Add all orders
            for order in orders:
                await self.repository.add_async(order)

        stats = await self.measure_async_operation(batch_adds, iterations=10)

        print(f"\nBatch Operations Performance (10 sequential adds):")
        print(f"  Mean: {stats['mean']:.2f}ms")
        print(f"  95th percentile: {stats['p95']:.2f}ms")
        print(f"  Target: < {self.MAX_OPERATION_TIME_MS * 5}ms p95 (5x for batch)")

        # Allow 5x target for batch operations
        max_batch_time = self.MAX_OPERATION_TIME_MS * 5
        assert stats['p95'] < max_batch_time, f"Batch operations p95 {stats['p95']:.2f}ms exceeds {max_batch_time}ms target"

    @pytest.mark.asyncio
    async def test_error_handling_performance(self):
        """Test error handling performance (operations that fail)."""
        async def failed_get():
            # This ID will trigger a not found error
            return await self.repository.get_by_id_async(OrderId("ORD-NOT-FOUND"))

        # Override the mock to simulate exception
        original_aget = MockOrderModel.objects.aget

        async def failing_aget(pk):
            await asyncio.sleep(0.002)  # Simulate database latency
            raise Exception("Database connection error")

        MockOrderModel.objects.aget = failing_aget

        try:
            stats = await self.measure_async_operation(failed_get, iterations=50)

            print(f"\nError Handling Performance:")
            print(f"  Mean: {stats['mean']:.2f}ms")
            print(f"  95th percentile: {stats['p95']:.2f}ms")
            print(f"  Target: < {self.MAX_OPERATION_TIME_MS}ms p95")

            assert stats['p95'] < self.MAX_OPERATION_TIME_MS, f"Error handling p95 {stats['p95']:.2f}ms exceeds {self.MAX_OPERATION_TIME_MS}ms target"

        finally:
            # Restore original method
            MockOrderModel.objects.aget = original_aget

    @pytest.mark.asyncio
    async def test_repository_throughput(self):
        """Test repository throughput under load."""
        operations_count = 100
        start_time = time.perf_counter()

        # Perform mixed operations
        tasks = []
        for i in range(operations_count):
            if i % 4 == 0:  # 25% reads
                task = self.repository.get_by_id_async(OrderId(f"ORD-{i:06d}"))
            elif i % 4 == 1:  # 25% exists checks
                task = self.repository.exists_async(OrderId(f"ORD-{i:06d}"))
            elif i % 4 == 2:  # 25% adds
                order = Order(
                    order_id=OrderId(f"ORD-THROUGHPUT-{i:06d}"),
                    customer_id=self.customer_id,
                    customer_name=self.customer_name,
                    billing_address=self.address
                )
                task = self.repository.add_async(order)
            else:  # 25% deletes
                task = self.repository.delete_async(OrderId(f"ORD-{i:06d}"))

            tasks.append(task)

        # Execute all operations concurrently
        await asyncio.gather(*tasks)

        end_time = time.perf_counter()
        total_time = end_time - start_time
        operations_per_second = operations_count / total_time

        print(f"\nRepository Throughput:")
        print(f"  Operations: {operations_count}")
        print(f"  Total time: {total_time:.2f}s")
        print(f"  Operations per second: {operations_per_second:.1f}")
        print(f"  Target: > 100 ops/sec")

        assert operations_per_second > 100, f"Throughput {operations_per_second:.1f} ops/sec below 100 ops/sec target"

    def test_repository_performance_summary(self):
        """Generate repository performance summary report."""
        print(f"\n{'='*60}")
        print("REPOSITORY PERFORMANCE SUMMARY")
        print(f"{'='*60}")
        print(f"Target: <{self.MAX_OPERATION_TIME_MS}ms p95 for database operations")
        print(f"Measurement iterations: {self.MEASUREMENT_ITERATIONS}")
        print(f"Warmup iterations: {self.WARMUP_ITERATIONS}")
        print(f"Focus: Async database operations with Result/Maybe patterns")
        print(f"{'='*60}")

        # Note: This test doesn't perform measurements, just provides a summary
        assert True  # Always pass - this is just for reporting


# Async test runner for standalone execution
async def run_async_tests():
    """Run async tests when executed directly."""
    test_instance = TestRepositoryPerformance()
    test_instance.setup_method()

    print("Running Repository Performance Benchmarks...")

    try:
        await test_instance.test_get_by_id_performance()
        await test_instance.test_add_performance()
        await test_instance.test_update_performance()
        await test_instance.test_delete_performance()
        await test_instance.test_exists_performance()
        await test_instance.test_concurrent_operations_performance()
        await test_instance.test_batch_operations_performance()
        await test_instance.test_error_handling_performance()
        await test_instance.test_repository_throughput()
        test_instance.test_repository_performance_summary()

        print("\n✅ All repository performance tests passed!")

    except AssertionError as e:
        print(f"\n❌ Performance test failed: {e}")
        return False
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        return False

    return True


if __name__ == "__main__":
    # Run performance tests when executed directly
    success = asyncio.run(run_async_tests())
    if not success:
        exit(1)