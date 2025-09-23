"""
Memory usage profiling for core types.

Validates memory efficiency and allocation patterns for Architecture.Core
types to ensure they meet enterprise performance requirements.

Focus: Minimal memory footprint and low GC pressure
"""

import gc
import sys
import tracemalloc
import time
from typing import List, Any, Dict
from decimal import Decimal

import pytest

# Import core types
from architecture_core.domain.aggregates import AggregateRoot
from architecture_core.domain.entities import Entity
from architecture_core.domain.value_objects import ValueObject
from architecture_core.domain.events import DomainEventBase
from architecture_core.functional.result import Result
from architecture_core.functional.maybe import Maybe
from architecture_core.functional.error import Error

# Import example domain for testing
from examples.order_domain.aggregates import Order, OrderStatus
from examples.order_domain.identifiers import OrderId, CustomerId, ProductId
from examples.order_domain.value_objects import Money, Address, PersonName, Quantity


class MemoryProfiler:
    """Helper class for memory profiling."""

    def __init__(self):
        self.start_snapshot = None
        self.end_snapshot = None

    def start_trace(self):
        """Start memory tracing."""
        gc.collect()  # Clean up before measurement
        tracemalloc.start()
        self.start_snapshot = tracemalloc.take_snapshot()

    def end_trace(self) -> Dict[str, Any]:
        """End memory tracing and return statistics."""
        self.end_snapshot = tracemalloc.take_snapshot()
        tracemalloc.stop()

        top_stats = self.end_snapshot.compare_to(self.start_snapshot, 'lineno')

        # Calculate total memory usage
        total_size = sum(stat.size for stat in top_stats)
        total_count = sum(stat.count for stat in top_stats)

        return {
            'total_size_mb': total_size / 1024 / 1024,
            'total_size_kb': total_size / 1024,
            'total_count': total_count,
            'top_stats': top_stats[:10]  # Top 10 allocations
        }

    def measure_object_size(self, obj: Any) -> int:
        """Measure the size of an object in bytes."""
        return sys.getsizeof(obj)

    def measure_object_count(self) -> int:
        """Get current object count."""
        return len(gc.get_objects())


class TestMemoryUsage:
    """Memory usage tests for core types."""

    # Memory targets
    MAX_AGGREGATE_SIZE_KB = 1.0  # 1KB per aggregate
    MAX_VALUE_OBJECT_SIZE_BYTES = 200  # 200 bytes per value object
    MAX_FUNCTIONAL_TYPE_SIZE_BYTES = 100  # 100 bytes per Result/Maybe
    MAX_MEMORY_GROWTH_MB = 5.0  # 5MB total growth for operations

    def setup_method(self):
        """Set up test data."""
        self.profiler = MemoryProfiler()
        self.order_id = OrderId("ORDER-123456")
        self.customer_id = CustomerId("CUST-789")
        self.customer_name = PersonName("John", "Doe")
        self.address = Address(
            street="123 Main St",
            city="Anytown",
            state="ST",
            postal_code="12345",
            country="US"
        )
        self.product_id = ProductId("PROD-001")
        self.quantity = Quantity(2)
        self.unit_price = Money(Decimal("25.99"), "USD")

    def test_aggregate_memory_footprint(self):
        """Test memory footprint of aggregate instances."""
        print(f"\nAggregate Memory Footprint:")

        # Create a single order
        order = Order(
            order_id=self.order_id,
            customer_id=self.customer_id,
            customer_name=self.customer_name,
            billing_address=self.address
        )

        # Measure object size
        aggregate_size = self.profiler.measure_object_size(order)
        aggregate_size_kb = aggregate_size / 1024

        print(f"  Basic Order size: {aggregate_size} bytes ({aggregate_size_kb:.3f} KB)")

        # Add order lines and measure growth
        initial_size = aggregate_size
        for i in range(5):
            product_id = ProductId(f"PROD-{i:03d}")
            order.add_order_line(product_id, self.quantity, self.unit_price)
            current_size = self.profiler.measure_object_size(order)
            print(f"  With {i+1} lines: {current_size} bytes (+{current_size - initial_size} bytes)")

        final_size_kb = current_size / 1024
        print(f"  Final size: {current_size} bytes ({final_size_kb:.3f} KB)")
        print(f"  Target: < {self.MAX_AGGREGATE_SIZE_KB} KB")

        assert final_size_kb < self.MAX_AGGREGATE_SIZE_KB, f"Aggregate size {final_size_kb:.3f}KB exceeds {self.MAX_AGGREGATE_SIZE_KB}KB target"

    def test_value_object_memory_footprint(self):
        """Test memory footprint of value objects."""
        print(f"\nValue Object Memory Footprint:")

        # Test different value objects
        value_objects = [
            ("OrderId", self.order_id),
            ("CustomerId", self.customer_id),
            ("PersonName", self.customer_name),
            ("Address", self.address),
            ("Money", self.unit_price),
            ("Quantity", self.quantity)
        ]

        for name, obj in value_objects:
            size = self.profiler.measure_object_size(obj)
            print(f"  {name}: {size} bytes")
            assert size < self.MAX_VALUE_OBJECT_SIZE_BYTES, f"{name} size {size} bytes exceeds {self.MAX_VALUE_OBJECT_SIZE_BYTES} byte target"

        print(f"  Target: < {self.MAX_VALUE_OBJECT_SIZE_BYTES} bytes per value object")

    def test_functional_types_memory_footprint(self):
        """Test memory footprint of functional types."""
        print(f"\nFunctional Types Memory Footprint:")

        # Test Result types
        result_success = Result.success(42)
        result_failure = Result.failure(Error.domain("Test.Error", "Test error"))

        success_size = self.profiler.measure_object_size(result_success)
        failure_size = self.profiler.measure_object_size(result_failure)

        print(f"  Result.success: {success_size} bytes")
        print(f"  Result.failure: {failure_size} bytes")

        # Test Maybe types
        maybe_some = Maybe.some("test")
        maybe_none = Maybe.none()

        some_size = self.profiler.measure_object_size(maybe_some)
        none_size = self.profiler.measure_object_size(maybe_none)

        print(f"  Maybe.some: {some_size} bytes")
        print(f"  Maybe.none: {none_size} bytes")
        print(f"  Target: < {self.MAX_FUNCTIONAL_TYPE_SIZE_BYTES} bytes per functional type")

        # Verify all are within limits
        functional_types = [
            ("Result.success", success_size),
            ("Result.failure", failure_size),
            ("Maybe.some", some_size),
            ("Maybe.none", none_size)
        ]

        for name, size in functional_types:
            assert size < self.MAX_FUNCTIONAL_TYPE_SIZE_BYTES, f"{name} size {size} bytes exceeds {self.MAX_FUNCTIONAL_TYPE_SIZE_BYTES} byte target"

    def test_memory_allocation_patterns(self):
        """Test memory allocation patterns during operations."""
        print(f"\nMemory Allocation Patterns:")

        self.profiler.start_trace()

        # Perform typical operations
        orders = []
        for i in range(100):
            order = Order(
                order_id=OrderId(f"ORDER-{i:06d}"),
                customer_id=self.customer_id,
                customer_name=self.customer_name,
                billing_address=self.address
            )

            # Add order lines
            for j in range(3):
                product_id = ProductId(f"PROD-{i:03d}-{j}")
                order.add_order_line(product_id, self.quantity, self.unit_price)

            # Confirm order
            order.confirm()
            orders.append(order)

        # End tracing
        memory_stats = self.profiler.end_trace()

        print(f"  Total memory allocated: {memory_stats['total_size_mb']:.2f} MB")
        print(f"  Total allocations: {memory_stats['total_count']}")
        print(f"  Memory per order: {memory_stats['total_size_kb'] / 100:.2f} KB")
        print(f"  Target: < {self.MAX_MEMORY_GROWTH_MB} MB total")

        assert memory_stats['total_size_mb'] < self.MAX_MEMORY_GROWTH_MB, f"Memory usage {memory_stats['total_size_mb']:.2f}MB exceeds {self.MAX_MEMORY_GROWTH_MB}MB target"

    def test_functional_operations_memory_efficiency(self):
        """Test memory efficiency of functional operations."""
        print(f"\nFunctional Operations Memory Efficiency:")

        self.profiler.start_trace()

        # Perform chained functional operations
        results = []
        for i in range(1000):
            result = (Result.success(i)
                     .map(lambda x: x * 2)
                     .bind(lambda x: Result.success(str(x)))
                     .map(lambda x: len(x))
                     .bind(lambda x: Result.success(x > 0)))
            results.append(result)

        maybes = []
        for i in range(1000):
            maybe = (Maybe.some(f"item-{i}")
                    .map(str.upper)
                    .filter(lambda x: len(x) > 5)
                    .map(len)
                    .bind(lambda x: Maybe.some(x * 2)))
            maybes.append(maybe)

        memory_stats = self.profiler.end_trace()

        print(f"  Total memory for 2000 operations: {memory_stats['total_size_mb']:.2f} MB")
        print(f"  Memory per operation: {memory_stats['total_size_kb'] / 2000:.3f} KB")
        print(f"  Total allocations: {memory_stats['total_count']}")
        print(f"  Target: < 2 MB for 2000 operations")

        assert memory_stats['total_size_mb'] < 2.0, f"Functional operations used {memory_stats['total_size_mb']:.2f}MB, exceeds 2MB target"

    def test_garbage_collection_efficiency(self):
        """Test garbage collection efficiency."""
        print(f"\nGarbage Collection Efficiency:")

        # Measure initial state
        gc.collect()
        initial_objects = self.profiler.measure_object_count()

        # Create and discard objects
        for i in range(100):
            order = Order(
                order_id=OrderId(f"ORDER-{i:06d}"),
                customer_id=self.customer_id,
                customer_name=self.customer_name,
                billing_address=self.address
            )

            # Perform operations
            product_id = ProductId(f"PROD-{i:03d}")
            order.add_order_line(product_id, self.quantity, self.unit_price)
            order.confirm()

            # Create functional types
            result = Result.success(order.total_amount).map(lambda x: str(x))
            maybe = Maybe.some(order.status).map(lambda x: x.value)

        # Force garbage collection
        gc.collect()
        final_objects = self.profiler.measure_object_count()

        # Calculate object growth
        object_growth = final_objects - initial_objects
        print(f"  Objects before: {initial_objects}")
        print(f"  Objects after: {final_objects}")
        print(f"  Object growth: {object_growth}")
        print(f"  Target: < 100 objects retained")

        # Some objects may be retained, but should be minimal
        assert object_growth < 100, f"Object growth {object_growth} exceeds 100 object target"

    def test_event_collection_memory_efficiency(self):
        """Test memory efficiency of event collections."""
        print(f"\nEvent Collection Memory Efficiency:")

        order = Order(
            order_id=self.order_id,
            customer_id=self.customer_id,
            customer_name=self.customer_name,
            billing_address=self.address
        )

        # Measure initial event collection size
        initial_events = len(order.domain_events)
        initial_size = self.profiler.measure_object_size(order)

        # Add multiple order lines (each generates an event)
        for i in range(10):
            product_id = ProductId(f"PROD-{i:03d}")
            order.add_order_line(product_id, self.quantity, self.unit_price)

        # Measure final size
        final_events = len(order.domain_events)
        final_size = self.profiler.measure_object_size(order)

        size_growth = final_size - initial_size
        event_growth = final_events - initial_events

        print(f"  Initial events: {initial_events}")
        print(f"  Final events: {final_events}")
        print(f"  Event growth: {event_growth}")
        print(f"  Size growth: {size_growth} bytes")
        print(f"  Bytes per event: {size_growth / event_growth:.1f}")
        print(f"  Target: < 50 bytes per event")

        bytes_per_event = size_growth / event_growth if event_growth > 0 else 0
        assert bytes_per_event < 50, f"Memory per event {bytes_per_event:.1f} bytes exceeds 50 byte target"

    def test_memory_leak_detection(self):
        """Test for potential memory leaks."""
        print(f"\nMemory Leak Detection:")

        # Baseline measurement
        gc.collect()
        baseline_objects = self.profiler.measure_object_count()

        # Perform operations multiple times
        for iteration in range(5):
            temp_objects = []

            # Create objects
            for i in range(50):
                order = Order(
                    order_id=OrderId(f"ORDER-{iteration}-{i:03d}"),
                    customer_id=self.customer_id,
                    customer_name=self.customer_name,
                    billing_address=self.address
                )

                product_id = ProductId(f"PROD-{i:03d}")
                order.add_order_line(product_id, self.quantity, self.unit_price)
                temp_objects.append(order)

            # Clear references and force GC
            temp_objects.clear()
            gc.collect()

            # Measure object count
            current_objects = self.profiler.measure_object_count()
            growth = current_objects - baseline_objects

            print(f"  Iteration {iteration + 1}: {current_objects} objects (+{growth} from baseline)")

        # Final check
        final_objects = self.profiler.measure_object_count()
        total_growth = final_objects - baseline_objects

        print(f"  Baseline: {baseline_objects} objects")
        print(f"  Final: {final_objects} objects")
        print(f"  Total growth: {total_growth} objects")
        print(f"  Target: < 50 objects leaked")

        assert total_growth < 50, f"Potential memory leak detected: {total_growth} objects retained"

    def test_memory_usage_summary(self):
        """Generate memory usage summary report."""
        print(f"\n{'='*60}")
        print("MEMORY USAGE SUMMARY")
        print(f"{'='*60}")
        print(f"Aggregate target: < {self.MAX_AGGREGATE_SIZE_KB} KB")
        print(f"Value object target: < {self.MAX_VALUE_OBJECT_SIZE_BYTES} bytes")
        print(f"Functional type target: < {self.MAX_FUNCTIONAL_TYPE_SIZE_BYTES} bytes")
        print(f"Total memory growth target: < {self.MAX_MEMORY_GROWTH_MB} MB")
        print(f"Focus: Minimal footprint and low GC pressure")
        print(f"{'='*60}")

        # Note: This test doesn't perform measurements, just provides a summary
        assert True  # Always pass - this is just for reporting


if __name__ == "__main__":
    # Run memory tests when executed directly
    test_instance = TestMemoryUsage()
    test_instance.setup_method()

    print("Running Memory Usage Profiling...")

    try:
        test_instance.test_aggregate_memory_footprint()
        test_instance.test_value_object_memory_footprint()
        test_instance.test_functional_types_memory_footprint()
        test_instance.test_memory_allocation_patterns()
        test_instance.test_functional_operations_memory_efficiency()
        test_instance.test_garbage_collection_efficiency()
        test_instance.test_event_collection_memory_efficiency()
        test_instance.test_memory_leak_detection()
        test_instance.test_memory_usage_summary()

        print("\n✅ All memory usage tests passed!")

    except AssertionError as e:
        print(f"\n❌ Memory test failed: {e}")
        exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        exit(1)