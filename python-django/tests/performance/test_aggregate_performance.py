"""
Performance benchmarks for aggregate operations.

Validates that aggregate operations meet sub-millisecond performance targets
as specified in the Architecture.Core requirements.

Target: Sub-millisecond aggregate operations (< 1ms)
"""

import time
import statistics
from decimal import Decimal
from typing import List, Callable, Any

import pytest

# Import core types
from architecture_core.domain.aggregates import AggregateRoot
from architecture_core.domain.entities import Entity
from architecture_core.domain.events import DomainEventBase
from architecture_core.domain.protocols import EntityId
from architecture_core.functional.result import Result
from architecture_core.functional.error import Error

# Import example domain for testing
from examples.order_domain.aggregates import Order, OrderStatus
from examples.order_domain.identifiers import OrderId, CustomerId, ProductId
from examples.order_domain.value_objects import Money, Address, PersonName, Quantity


class TestAggregatePerformance:
    """Performance tests for aggregate operations."""

    # Performance targets in milliseconds
    MAX_OPERATION_TIME_MS = 1.0  # Sub-millisecond target
    MEASUREMENT_ITERATIONS = 1000  # Number of iterations for reliable measurements
    WARMUP_ITERATIONS = 100  # Warmup iterations to stabilize JIT

    def setup_method(self):
        """Set up test data for performance measurements."""
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
        self.product_id = ProductId("PROD-001")
        self.quantity = Quantity(2)
        self.unit_price = Money(Decimal("25.99"), "USD")

    def measure_operation(self, operation: Callable[[], Any], iterations: int = None) -> float:
        """
        Measure average operation time in milliseconds.

        Args:
            operation: The operation to measure
            iterations: Number of iterations (defaults to MEASUREMENT_ITERATIONS)

        Returns:
            Average operation time in milliseconds
        """
        if iterations is None:
            iterations = self.MEASUREMENT_ITERATIONS

        # Warmup phase
        for _ in range(self.WARMUP_ITERATIONS):
            operation()

        # Measurement phase
        times = []
        for _ in range(iterations):
            start_time = time.perf_counter()
            operation()
            end_time = time.perf_counter()
            times.append((end_time - start_time) * 1000)  # Convert to milliseconds

        return statistics.mean(times)

    def test_aggregate_creation_performance(self):
        """Test aggregate creation performance."""
        def create_order():
            return Order(
                order_id=self.order_id,
                customer_id=self.customer_id,
                customer_name=self.customer_name,
                billing_address=self.address
            )

        avg_time = self.measure_operation(create_order)

        print(f"\nAggregate Creation Performance:")
        print(f"  Average time: {avg_time:.3f}ms")
        print(f"  Target: < {self.MAX_OPERATION_TIME_MS}ms")
        print(f"  Iterations: {self.MEASUREMENT_ITERATIONS}")

        assert avg_time < self.MAX_OPERATION_TIME_MS, f"Aggregate creation took {avg_time:.3f}ms, exceeds {self.MAX_OPERATION_TIME_MS}ms target"

    def test_add_order_line_performance(self):
        """Test adding order line performance."""
        order = Order(
            order_id=self.order_id,
            customer_id=self.customer_id,
            customer_name=self.customer_name,
            billing_address=self.address
        )

        def add_order_line():
            # Create a new product ID for each iteration to avoid duplicate error
            product_id = ProductId(f"PROD-{int(time.time_ns()) % 1000000:06d}")
            result = order.add_order_line(product_id, self.quantity, self.unit_price)
            # Clear the line to avoid memory accumulation
            if result.is_success:
                order._order_lines.clear()
                order._recalculate_total()

        avg_time = self.measure_operation(add_order_line)

        print(f"\nAdd Order Line Performance:")
        print(f"  Average time: {avg_time:.3f}ms")
        print(f"  Target: < {self.MAX_OPERATION_TIME_MS}ms")
        print(f"  Iterations: {self.MEASUREMENT_ITERATIONS}")

        assert avg_time < self.MAX_OPERATION_TIME_MS, f"Add order line took {avg_time:.3f}ms, exceeds {self.MAX_OPERATION_TIME_MS}ms target"

    def test_order_confirmation_performance(self):
        """Test order confirmation performance."""
        def setup_and_confirm_order():
            order = Order(
                order_id=OrderId.generate(),
                customer_id=self.customer_id,
                customer_name=self.customer_name,
                billing_address=self.address
            )
            # Add one order line
            product_id = ProductId(f"PROD-{int(time.time_ns()) % 1000000:06d}")
            order.add_order_line(product_id, self.quantity, self.unit_price)
            # Confirm the order
            return order.confirm()

        avg_time = self.measure_operation(setup_and_confirm_order)

        print(f"\nOrder Confirmation Performance:")
        print(f"  Average time: {avg_time:.3f}ms")
        print(f"  Target: < {self.MAX_OPERATION_TIME_MS}ms")
        print(f"  Iterations: {self.MEASUREMENT_ITERATIONS}")

        assert avg_time < self.MAX_OPERATION_TIME_MS, f"Order confirmation took {avg_time:.3f}ms, exceeds {self.MAX_OPERATION_TIME_MS}ms target"

    def test_event_collection_performance(self):
        """Test domain event collection performance."""
        order = Order(
            order_id=self.order_id,
            customer_id=self.customer_id,
            customer_name=self.customer_name,
            billing_address=self.address
        )

        def collect_events():
            events = order.domain_events
            return len(events)

        avg_time = self.measure_operation(collect_events)

        print(f"\nEvent Collection Performance:")
        print(f"  Average time: {avg_time:.3f}ms")
        print(f"  Target: < {self.MAX_OPERATION_TIME_MS}ms")
        print(f"  Iterations: {self.MEASUREMENT_ITERATIONS}")

        assert avg_time < self.MAX_OPERATION_TIME_MS, f"Event collection took {avg_time:.3f}ms, exceeds {self.MAX_OPERATION_TIME_MS}ms target"

    def test_version_increment_performance(self):
        """Test version increment performance."""
        order = Order(
            order_id=self.order_id,
            customer_id=self.customer_id,
            customer_name=self.customer_name,
            billing_address=self.address
        )

        def increment_version():
            order.increment_version()

        avg_time = self.measure_operation(increment_version)

        print(f"\nVersion Increment Performance:")
        print(f"  Average time: {avg_time:.3f}ms")
        print(f"  Target: < {self.MAX_OPERATION_TIME_MS}ms")
        print(f"  Iterations: {self.MEASUREMENT_ITERATIONS}")

        assert avg_time < self.MAX_OPERATION_TIME_MS, f"Version increment took {avg_time:.3f}ms, exceeds {self.MAX_OPERATION_TIME_MS}ms target"

    def test_property_access_performance(self):
        """Test aggregate property access performance."""
        order = Order(
            order_id=self.order_id,
            customer_id=self.customer_id,
            customer_name=self.customer_name,
            billing_address=self.address
        )

        def access_properties():
            _ = order.id
            _ = order.version
            _ = order.customer_id
            _ = order.status
            _ = order.total_amount
            _ = order.line_count

        avg_time = self.measure_operation(access_properties)

        print(f"\nProperty Access Performance:")
        print(f"  Average time: {avg_time:.3f}ms")
        print(f"  Target: < {self.MAX_OPERATION_TIME_MS}ms")
        print(f"  Iterations: {self.MEASUREMENT_ITERATIONS}")

        assert avg_time < self.MAX_OPERATION_TIME_MS, f"Property access took {avg_time:.3f}ms, exceeds {self.MAX_OPERATION_TIME_MS}ms target"

    def test_complex_business_operation_performance(self):
        """Test complex business operation performance."""
        def complex_operation():
            # Create order
            order = Order(
                order_id=OrderId.generate(),
                customer_id=self.customer_id,
                customer_name=self.customer_name,
                billing_address=self.address
            )

            # Add multiple order lines
            for i in range(3):
                product_id = ProductId(f"PROD-{i:03d}{int(time.time_ns()) % 1000:03d}")
                quantity = Quantity(i + 1)
                unit_price = Money(Decimal(f"{10 + i}.99"), "USD")
                order.add_order_line(product_id, quantity, unit_price)

            # Confirm order
            order.confirm()

            # Add notes
            order.add_notes("Test order with multiple items")

            return order

        avg_time = self.measure_operation(complex_operation, iterations=100)  # Fewer iterations for complex operation

        print(f"\nComplex Business Operation Performance:")
        print(f"  Average time: {avg_time:.3f}ms")
        print(f"  Target: < {self.MAX_OPERATION_TIME_MS * 5}ms (5x target for complex operation)")
        print(f"  Iterations: 100")

        # Allow 5x the normal target for complex operations
        max_complex_time = self.MAX_OPERATION_TIME_MS * 5
        assert avg_time < max_complex_time, f"Complex operation took {avg_time:.3f}ms, exceeds {max_complex_time}ms target"

    def test_memory_efficiency(self):
        """Test that aggregate operations don't cause excessive object allocation."""
        import gc
        import sys

        # Force garbage collection before measurement
        gc.collect()

        # Get initial object count
        initial_objects = len(gc.get_objects())

        # Perform operations
        orders = []
        for i in range(100):
            order = Order(
                order_id=OrderId(f"ORD-{i:06d}"),
                customer_id=self.customer_id,
                customer_name=self.customer_name,
                billing_address=self.address
            )

            product_id = ProductId(f"PROD-{i:03d}")
            order.add_order_line(product_id, self.quantity, self.unit_price)
            order.confirm()
            orders.append(order)

        # Force garbage collection after operations
        gc.collect()

        # Get final object count
        final_objects = len(gc.get_objects())

        # Calculate objects per order (rough estimate)
        objects_created = final_objects - initial_objects
        objects_per_order = objects_created / 100

        print(f"\nMemory Efficiency:")
        print(f"  Objects before: {initial_objects}")
        print(f"  Objects after: {final_objects}")
        print(f"  Objects created: {objects_created}")
        print(f"  Objects per order: {objects_per_order:.1f}")
        print(f"  Target: < 50 objects per order")

        # Allow reasonable object allocation (aggregate + events + value objects)
        assert objects_per_order < 50, f"Created {objects_per_order:.1f} objects per order, exceeds 50 object target"

    def test_performance_summary(self):
        """Generate performance summary report."""
        print(f"\n{'='*60}")
        print("AGGREGATE PERFORMANCE SUMMARY")
        print(f"{'='*60}")
        print(f"Target: Sub-millisecond operations (< {self.MAX_OPERATION_TIME_MS}ms)")
        print(f"Measurement iterations: {self.MEASUREMENT_ITERATIONS}")
        print(f"Warmup iterations: {self.WARMUP_ITERATIONS}")
        print(f"{'='*60}")

        # Note: This test doesn't perform measurements, just provides a summary
        # All measurements are done in individual tests above
        assert True  # Always pass - this is just for reporting


if __name__ == "__main__":
    # Run performance tests when executed directly
    test_instance = TestAggregatePerformance()
    test_instance.setup_method()

    print("Running Aggregate Performance Benchmarks...")

    try:
        test_instance.test_aggregate_creation_performance()
        test_instance.test_add_order_line_performance()
        test_instance.test_order_confirmation_performance()
        test_instance.test_event_collection_performance()
        test_instance.test_version_increment_performance()
        test_instance.test_property_access_performance()
        test_instance.test_complex_business_operation_performance()
        test_instance.test_memory_efficiency()
        test_instance.test_performance_summary()

        print("\n✅ All aggregate performance tests passed!")

    except AssertionError as e:
        print(f"\n❌ Performance test failed: {e}")
        exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        exit(1)