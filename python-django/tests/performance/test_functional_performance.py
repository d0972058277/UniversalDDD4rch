"""
Performance benchmarks for Result and Maybe functional types.

Validates that functional operations meet performance targets for
monadic operations as specified in the Architecture.Core requirements.

Target: Zero allocations for Result/Maybe operations where possible
"""

import time
import statistics
from typing import List, Callable, Any

import pytest

# Import functional types
from architecture_core.functional.result import Result
from architecture_core.functional.maybe import Maybe
from architecture_core.functional.error import Error, ErrorCategory


class TestFunctionalPerformance:
    """Performance tests for Result and Maybe functional types."""

    # Performance targets
    MAX_OPERATION_TIME_MS = 0.1  # Very tight target for functional operations
    MEASUREMENT_ITERATIONS = 10000  # More iterations for precise measurements
    WARMUP_ITERATIONS = 1000  # Warmup iterations

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

    def test_result_creation_performance(self):
        """Test Result creation performance."""
        def create_success():
            return Result.success(42)

        def create_failure():
            return Result.failure(Error.domain("Test.Error", "Test error"))

        success_time = self.measure_operation(create_success)
        failure_time = self.measure_operation(create_failure)

        print(f"\nResult Creation Performance:")
        print(f"  Success creation: {success_time:.4f}ms")
        print(f"  Failure creation: {failure_time:.4f}ms")
        print(f"  Target: < {self.MAX_OPERATION_TIME_MS}ms")
        print(f"  Iterations: {self.MEASUREMENT_ITERATIONS}")

        assert success_time < self.MAX_OPERATION_TIME_MS, f"Success creation took {success_time:.4f}ms, exceeds {self.MAX_OPERATION_TIME_MS}ms target"
        assert failure_time < self.MAX_OPERATION_TIME_MS, f"Failure creation took {failure_time:.4f}ms, exceeds {self.MAX_OPERATION_TIME_MS}ms target"

    def test_result_map_performance(self):
        """Test Result map operation performance."""
        result = Result.success(10)

        def map_operation():
            return result.map(lambda x: x * 2)

        avg_time = self.measure_operation(map_operation)

        print(f"\nResult Map Performance:")
        print(f"  Average time: {avg_time:.4f}ms")
        print(f"  Target: < {self.MAX_OPERATION_TIME_MS}ms")
        print(f"  Iterations: {self.MEASUREMENT_ITERATIONS}")

        assert avg_time < self.MAX_OPERATION_TIME_MS, f"Result map took {avg_time:.4f}ms, exceeds {self.MAX_OPERATION_TIME_MS}ms target"

    def test_result_bind_performance(self):
        """Test Result bind operation performance."""
        result = Result.success(10)

        def bind_operation():
            return result.bind(lambda x: Result.success(x * 2))

        avg_time = self.measure_operation(bind_operation)

        print(f"\nResult Bind Performance:")
        print(f"  Average time: {avg_time:.4f}ms")
        print(f"  Target: < {self.MAX_OPERATION_TIME_MS}ms")
        print(f"  Iterations: {self.MEASUREMENT_ITERATIONS}")

        assert avg_time < self.MAX_OPERATION_TIME_MS, f"Result bind took {avg_time:.4f}ms, exceeds {self.MAX_OPERATION_TIME_MS}ms target"

    def test_result_chaining_performance(self):
        """Test Result operation chaining performance."""
        def chain_operations():
            return (Result.success(5)
                   .map(lambda x: x * 2)
                   .bind(lambda x: Result.success(x + 1))
                   .map(lambda x: str(x))
                   .bind(lambda x: Result.success(len(x))))

        avg_time = self.measure_operation(chain_operations)

        print(f"\nResult Chaining Performance:")
        print(f"  Average time: {avg_time:.4f}ms")
        print(f"  Target: < {self.MAX_OPERATION_TIME_MS * 5}ms (5x for chaining)")
        print(f"  Iterations: {self.MEASUREMENT_ITERATIONS}")

        # Allow 5x target for chaining operations
        max_chain_time = self.MAX_OPERATION_TIME_MS * 5
        assert avg_time < max_chain_time, f"Result chaining took {avg_time:.4f}ms, exceeds {max_chain_time}ms target"

    def test_result_match_performance(self):
        """Test Result match operation performance."""
        success_result = Result.success(42)
        failure_result = Result.failure(Error.domain("Test.Error", "Test error"))

        def match_success():
            return success_result.match(
                on_success=lambda x: x * 2,
                on_failure=lambda e: -1
            )

        def match_failure():
            return failure_result.match(
                on_success=lambda x: x * 2,
                on_failure=lambda e: -1
            )

        success_time = self.measure_operation(match_success)
        failure_time = self.measure_operation(match_failure)

        print(f"\nResult Match Performance:")
        print(f"  Success match: {success_time:.4f}ms")
        print(f"  Failure match: {failure_time:.4f}ms")
        print(f"  Target: < {self.MAX_OPERATION_TIME_MS}ms")
        print(f"  Iterations: {self.MEASUREMENT_ITERATIONS}")

        assert success_time < self.MAX_OPERATION_TIME_MS, f"Success match took {success_time:.4f}ms, exceeds {self.MAX_OPERATION_TIME_MS}ms target"
        assert failure_time < self.MAX_OPERATION_TIME_MS, f"Failure match took {failure_time:.4f}ms, exceeds {self.MAX_OPERATION_TIME_MS}ms target"

    def test_result_combine_performance(self):
        """Test Result combine operation performance."""
        results = [Result.success(i) for i in range(10)]

        def combine_operation():
            return Result.combine(results)

        avg_time = self.measure_operation(combine_operation, iterations=1000)  # Fewer iterations for combine

        print(f"\nResult Combine Performance:")
        print(f"  Average time: {avg_time:.4f}ms")
        print(f"  Target: < {self.MAX_OPERATION_TIME_MS * 10}ms (10x for combine)")
        print(f"  Iterations: 1000")

        # Allow 10x target for combine operations
        max_combine_time = self.MAX_OPERATION_TIME_MS * 10
        assert avg_time < max_combine_time, f"Result combine took {avg_time:.4f}ms, exceeds {max_combine_time}ms target"

    def test_maybe_creation_performance(self):
        """Test Maybe creation performance."""
        def create_some():
            return Maybe.some("test")

        def create_none():
            return Maybe.none()

        some_time = self.measure_operation(create_some)
        none_time = self.measure_operation(create_none)

        print(f"\nMaybe Creation Performance:")
        print(f"  Some creation: {some_time:.4f}ms")
        print(f"  None creation: {none_time:.4f}ms")
        print(f"  Target: < {self.MAX_OPERATION_TIME_MS}ms")
        print(f"  Iterations: {self.MEASUREMENT_ITERATIONS}")

        assert some_time < self.MAX_OPERATION_TIME_MS, f"Some creation took {some_time:.4f}ms, exceeds {self.MAX_OPERATION_TIME_MS}ms target"
        assert none_time < self.MAX_OPERATION_TIME_MS, f"None creation took {none_time:.4f}ms, exceeds {self.MAX_OPERATION_TIME_MS}ms target"

    def test_maybe_map_performance(self):
        """Test Maybe map operation performance."""
        maybe_some = Maybe.some("hello")
        maybe_none = Maybe.none()

        def map_some():
            return maybe_some.map(str.upper)

        def map_none():
            return maybe_none.map(str.upper)

        some_time = self.measure_operation(map_some)
        none_time = self.measure_operation(map_none)

        print(f"\nMaybe Map Performance:")
        print(f"  Some map: {some_time:.4f}ms")
        print(f"  None map: {none_time:.4f}ms")
        print(f"  Target: < {self.MAX_OPERATION_TIME_MS}ms")
        print(f"  Iterations: {self.MEASUREMENT_ITERATIONS}")

        assert some_time < self.MAX_OPERATION_TIME_MS, f"Some map took {some_time:.4f}ms, exceeds {self.MAX_OPERATION_TIME_MS}ms target"
        assert none_time < self.MAX_OPERATION_TIME_MS, f"None map took {none_time:.4f}ms, exceeds {self.MAX_OPERATION_TIME_MS}ms target"

    def test_maybe_bind_performance(self):
        """Test Maybe bind operation performance."""
        maybe_some = Maybe.some(10)

        def bind_operation():
            return maybe_some.bind(lambda x: Maybe.some(x * 2))

        avg_time = self.measure_operation(bind_operation)

        print(f"\nMaybe Bind Performance:")
        print(f"  Average time: {avg_time:.4f}ms")
        print(f"  Target: < {self.MAX_OPERATION_TIME_MS}ms")
        print(f"  Iterations: {self.MEASUREMENT_ITERATIONS}")

        assert avg_time < self.MAX_OPERATION_TIME_MS, f"Maybe bind took {avg_time:.4f}ms, exceeds {self.MAX_OPERATION_TIME_MS}ms target"

    def test_maybe_chaining_performance(self):
        """Test Maybe operation chaining performance."""
        def chain_operations():
            return (Maybe.some("hello")
                   .map(str.upper)
                   .map(len)
                   .bind(lambda x: Maybe.some(x * 2))
                   .filter(lambda x: x > 0))

        avg_time = self.measure_operation(chain_operations)

        print(f"\nMaybe Chaining Performance:")
        print(f"  Average time: {avg_time:.4f}ms")
        print(f"  Target: < {self.MAX_OPERATION_TIME_MS * 5}ms (5x for chaining)")
        print(f"  Iterations: {self.MEASUREMENT_ITERATIONS}")

        # Allow 5x target for chaining operations
        max_chain_time = self.MAX_OPERATION_TIME_MS * 5
        assert avg_time < max_chain_time, f"Maybe chaining took {avg_time:.4f}ms, exceeds {max_chain_time}ms target"

    def test_maybe_or_else_performance(self):
        """Test Maybe or_else operation performance."""
        maybe_some = Maybe.some("value")
        maybe_none = Maybe.none()

        def or_else_some():
            return maybe_some.or_else("default")

        def or_else_none():
            return maybe_none.or_else("default")

        some_time = self.measure_operation(or_else_some)
        none_time = self.measure_operation(or_else_none)

        print(f"\nMaybe OrElse Performance:")
        print(f"  Some or_else: {some_time:.4f}ms")
        print(f"  None or_else: {none_time:.4f}ms")
        print(f"  Target: < {self.MAX_OPERATION_TIME_MS}ms")
        print(f"  Iterations: {self.MEASUREMENT_ITERATIONS}")

        assert some_time < self.MAX_OPERATION_TIME_MS, f"Some or_else took {some_time:.4f}ms, exceeds {self.MAX_OPERATION_TIME_MS}ms target"
        assert none_time < self.MAX_OPERATION_TIME_MS, f"None or_else took {none_time:.4f}ms, exceeds {self.MAX_OPERATION_TIME_MS}ms target"

    def test_maybe_filter_performance(self):
        """Test Maybe filter operation performance."""
        maybe_some = Maybe.some(10)
        maybe_none = Maybe.none()

        def filter_some():
            return maybe_some.filter(lambda x: x > 5)

        def filter_none():
            return maybe_none.filter(lambda x: x > 5)

        some_time = self.measure_operation(filter_some)
        none_time = self.measure_operation(filter_none)

        print(f"\nMaybe Filter Performance:")
        print(f"  Some filter: {some_time:.4f}ms")
        print(f"  None filter: {none_time:.4f}ms")
        print(f"  Target: < {self.MAX_OPERATION_TIME_MS}ms")
        print(f"  Iterations: {self.MEASUREMENT_ITERATIONS}")

        assert some_time < self.MAX_OPERATION_TIME_MS, f"Some filter took {some_time:.4f}ms, exceeds {self.MAX_OPERATION_TIME_MS}ms target"
        assert none_time < self.MAX_OPERATION_TIME_MS, f"None filter took {none_time:.4f}ms, exceeds {self.MAX_OPERATION_TIME_MS}ms target"

    def test_memory_efficiency_functional_types(self):
        """Test memory efficiency of functional operations."""
        import gc
        import sys

        # Force garbage collection before measurement
        gc.collect()
        initial_objects = len(gc.get_objects())

        # Perform operations
        results = []
        maybes = []

        for i in range(1000):
            # Create Results
            result = Result.success(i).map(lambda x: x * 2).bind(lambda x: Result.success(str(x)))
            results.append(result)

            # Create Maybes
            maybe = Maybe.some(i).map(lambda x: x * 2).filter(lambda x: x > 0)
            maybes.append(maybe)

        # Force garbage collection after operations
        gc.collect()
        final_objects = len(gc.get_objects())

        # Calculate objects per operation
        objects_created = final_objects - initial_objects
        objects_per_operation = objects_created / 2000  # 1000 results + 1000 maybes

        print(f"\nFunctional Types Memory Efficiency:")
        print(f"  Objects before: {initial_objects}")
        print(f"  Objects after: {final_objects}")
        print(f"  Objects created: {objects_created}")
        print(f"  Objects per operation: {objects_per_operation:.1f}")
        print(f"  Target: < 5 objects per operation")

        # Allow reasonable object allocation
        assert objects_per_operation < 5, f"Created {objects_per_operation:.1f} objects per operation, exceeds 5 object target"

    def test_monadic_laws_performance(self):
        """Test performance of monadic law verification."""
        def verify_result_laws():
            # Left identity
            value = 42
            f = lambda x: Result.success(x * 2)
            left = Result.success(value).bind(f)
            right = f(value)

            # Right identity
            result = Result.success(42)
            left_id = result.bind(Result.success)

            # Associativity
            g = lambda x: Result.success(x + 1)
            assoc_left = result.bind(f).bind(g)
            assoc_right = result.bind(lambda x: f(x).bind(g))

            return left == right and left_id == result

        def verify_maybe_laws():
            # Left identity
            value = 42
            f = lambda x: Maybe.some(x * 2)
            left = Maybe.some(value).bind(f)
            right = f(value)

            # Right identity
            maybe = Maybe.some(42)
            left_id = maybe.bind(Maybe.some)

            return left == right and left_id == maybe

        result_laws_time = self.measure_operation(verify_result_laws, iterations=1000)
        maybe_laws_time = self.measure_operation(verify_maybe_laws, iterations=1000)

        print(f"\nMonadic Laws Performance:")
        print(f"  Result laws verification: {result_laws_time:.4f}ms")
        print(f"  Maybe laws verification: {maybe_laws_time:.4f}ms")
        print(f"  Target: < {self.MAX_OPERATION_TIME_MS * 10}ms (10x for verification)")
        print(f"  Iterations: 1000")

        # Allow 10x target for law verification
        max_laws_time = self.MAX_OPERATION_TIME_MS * 10
        assert result_laws_time < max_laws_time, f"Result laws verification took {result_laws_time:.4f}ms, exceeds {max_laws_time}ms target"
        assert maybe_laws_time < max_laws_time, f"Maybe laws verification took {maybe_laws_time:.4f}ms, exceeds {max_laws_time}ms target"

    def test_performance_summary(self):
        """Generate functional types performance summary report."""
        print(f"\n{'='*60}")
        print("FUNCTIONAL TYPES PERFORMANCE SUMMARY")
        print(f"{'='*60}")
        print(f"Target: High-performance functional operations (< {self.MAX_OPERATION_TIME_MS}ms)")
        print(f"Measurement iterations: {self.MEASUREMENT_ITERATIONS}")
        print(f"Warmup iterations: {self.WARMUP_ITERATIONS}")
        print(f"Focus: Zero-allocation monadic operations")
        print(f"{'='*60}")

        # Note: This test doesn't perform measurements, just provides a summary
        assert True  # Always pass - this is just for reporting


if __name__ == "__main__":
    # Run performance tests when executed directly
    test_instance = TestFunctionalPerformance()

    print("Running Functional Types Performance Benchmarks...")

    try:
        test_instance.test_result_creation_performance()
        test_instance.test_result_map_performance()
        test_instance.test_result_bind_performance()
        test_instance.test_result_chaining_performance()
        test_instance.test_result_match_performance()
        test_instance.test_result_combine_performance()
        test_instance.test_maybe_creation_performance()
        test_instance.test_maybe_map_performance()
        test_instance.test_maybe_bind_performance()
        test_instance.test_maybe_chaining_performance()
        test_instance.test_maybe_or_else_performance()
        test_instance.test_maybe_filter_performance()
        test_instance.test_memory_efficiency_functional_types()
        test_instance.test_monadic_laws_performance()
        test_instance.test_performance_summary()

        print("\n✅ All functional types performance tests passed!")

    except AssertionError as e:
        print(f"\n❌ Performance test failed: {e}")
        exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        exit(1)