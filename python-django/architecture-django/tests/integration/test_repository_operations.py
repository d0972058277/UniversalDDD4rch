"""
Integration tests for repository async operations.

These tests verify that repository implementations work correctly
with async operations, proper error handling, and cancellation.
"""

import pytest
import asyncio
from typing import List, Dict, Optional
from abc import ABC, abstractmethod

from architecture_core.domain.repositories import Repository
from architecture_core.functional.result import Result
from architecture_core.functional.maybe import Maybe
from architecture_core.functional.error import Error


# Test entities and repositories for async operations testing
class TestEntityId:
    """Simple test entity ID"""
    def __init__(self, value: str):
        self.value = value

    def __str__(self) -> str:
        return self.value

    def __eq__(self, other) -> bool:
        return isinstance(other, TestEntityId) and self.value == other.value

    def __hash__(self) -> int:
        return hash(self.value)


class TestAggregate:
    """Simple test aggregate"""
    def __init__(self, id: TestEntityId, name: str, version: int = 0):
        self.id = id
        self.name = name
        self.version = version

    def increment_version(self):
        self.version += 1


class InMemoryTestRepository(Repository[TestAggregate, TestEntityId]):
    """In-memory repository implementation for testing"""

    def __init__(self):
        self._storage: Dict[str, TestAggregate] = {}
        self._operation_delay = 0.01  # Small delay to simulate async operations
        self._fail_operations = False
        self._concurrent_access_enabled = True

    async def get_by_id_async(self, id: TestEntityId) -> Maybe[TestAggregate]:
        """Get aggregate by ID asynchronously"""
        await asyncio.sleep(self._operation_delay)

        if self._fail_operations:
            # For testing purposes, we'll return empty Maybe instead of raising
            return Maybe.none()

        aggregate = self._storage.get(str(id))
        if aggregate:
            # Return a copy to avoid reference issues
            copy_aggregate = TestAggregate(aggregate.id, aggregate.name, aggregate.version)
            return Maybe.some(copy_aggregate)
        return Maybe.none()

    async def add_async(self, aggregate: TestAggregate) -> Result[None]:
        """Add new aggregate asynchronously"""
        await asyncio.sleep(self._operation_delay)

        if self._fail_operations:
            return Result.failure(Error.infrastructure(
                "Repository.AddFailed",
                "Failed to add aggregate to storage"
            ))

        if str(aggregate.id) in self._storage:
            return Result.failure(Error.domain(
                "Repository.AggregateExists",
                f"Aggregate with ID {aggregate.id} already exists"
            ))

        # Create a copy to avoid reference issues
        stored_aggregate = TestAggregate(aggregate.id, aggregate.name, aggregate.version)
        self._storage[str(aggregate.id)] = stored_aggregate
        return Result.success(None)

    async def update_async(self, aggregate: TestAggregate) -> Result[None]:
        """Update existing aggregate asynchronously"""
        await asyncio.sleep(self._operation_delay)

        if self._fail_operations:
            return Result.failure(Error.infrastructure(
                "Repository.UpdateFailed",
                "Failed to update aggregate in storage"
            ))

        existing = self._storage.get(str(aggregate.id))
        if not existing:
            return Result.failure(Error.domain(
                "Repository.AggregateNotFound",
                f"Aggregate with ID {aggregate.id} not found"
            ))

        # Simulate optimistic concurrency control
        # The aggregate version should be exactly one more than the existing version
        if existing.version + 1 != aggregate.version:
            return Result.failure(Error.concurrency(
                "Repository.ConcurrencyConflict",
                f"Aggregate version mismatch: expected {existing.version + 1}, got {aggregate.version}"
            ))

        # Create a copy to avoid reference issues
        updated_aggregate = TestAggregate(aggregate.id, aggregate.name, aggregate.version)
        self._storage[str(aggregate.id)] = updated_aggregate
        return Result.success(None)

    async def delete_async(self, id: TestEntityId) -> Result[None]:
        """Delete aggregate by ID asynchronously"""
        await asyncio.sleep(self._operation_delay)

        if self._fail_operations:
            return Result.failure(Error.infrastructure(
                "Repository.DeleteFailed",
                "Failed to delete aggregate from storage"
            ))

        if str(id) not in self._storage:
            return Result.failure(Error.domain(
                "Repository.AggregateNotFound",
                f"Aggregate with ID {id} not found"
            ))

        del self._storage[str(id)]
        return Result.success(None)

    async def exists_async(self, id: TestEntityId) -> bool:
        """Check if aggregate exists asynchronously"""
        await asyncio.sleep(self._operation_delay)
        return str(id) in self._storage

    # Helper methods for testing
    def set_operation_delay(self, delay: float):
        """Set artificial delay for operations"""
        self._operation_delay = delay

    def set_fail_operations(self, fail: bool):
        """Make operations fail for testing error handling"""
        self._fail_operations = fail

    def clear_storage(self):
        """Clear all stored aggregates"""
        self._storage.clear()

    def get_storage_count(self) -> int:
        """Get number of stored aggregates"""
        return len(self._storage)


class TestRepositoryAsyncOperations:
    """Integration tests for repository async operations"""

    @pytest.fixture
    def repository(self):
        """Create a fresh repository for each test"""
        repo = InMemoryTestRepository()
        repo.clear_storage()
        return repo

    @pytest.fixture
    def sample_aggregate(self):
        """Create a sample aggregate for testing"""
        return TestAggregate(TestEntityId("TEST-001"), "Sample Aggregate")

    @pytest.mark.asyncio
    async def test_should_add_aggregate_successfully_when_not_exists(self, repository, sample_aggregate):
        """
        Test successful aggregate addition

        Given: Empty repository and new aggregate
        When: Adding aggregate
        Then: Aggregate should be stored successfully
        """
        # Given
        assert repository.get_storage_count() == 0

        # When
        result = await repository.add_async(sample_aggregate)

        # Then
        assert result.is_success
        assert repository.get_storage_count() == 1

        # Verify we can retrieve it
        retrieved = await repository.get_by_id_async(sample_aggregate.id)
        assert retrieved.has_value
        assert retrieved.value.name == "Sample Aggregate"

    @pytest.mark.asyncio
    async def test_should_fail_add_when_aggregate_already_exists(self, repository, sample_aggregate):
        """
        Test addition failure when aggregate already exists

        Given: Repository with existing aggregate
        When: Adding aggregate with same ID
        Then: Should fail with appropriate error
        """
        # Given
        await repository.add_async(sample_aggregate)

        # When
        duplicate_aggregate = TestAggregate(sample_aggregate.id, "Duplicate")
        result = await repository.add_async(duplicate_aggregate)

        # Then
        assert result.is_failure
        assert result.error.code == "Repository.AggregateExists"
        assert str(sample_aggregate.id) in result.error.message

    @pytest.mark.asyncio
    async def test_should_get_aggregate_when_exists(self, repository, sample_aggregate):
        """
        Test successful aggregate retrieval

        Given: Repository with stored aggregate
        When: Getting aggregate by ID
        Then: Should return the aggregate
        """
        # Given
        await repository.add_async(sample_aggregate)

        # When
        result = await repository.get_by_id_async(sample_aggregate.id)

        # Then
        assert result.has_value
        assert result.value.id == sample_aggregate.id
        assert result.value.name == sample_aggregate.name

    @pytest.mark.asyncio
    async def test_should_return_none_when_aggregate_not_exists(self, repository):
        """
        Test retrieval when aggregate doesn't exist

        Given: Empty repository
        When: Getting non-existent aggregate
        Then: Should return None
        """
        # Given
        non_existent_id = TestEntityId("NON-EXISTENT")

        # When
        result = await repository.get_by_id_async(non_existent_id)

        # Then
        assert not result.has_value

    @pytest.mark.asyncio
    async def test_should_update_aggregate_successfully_when_exists(self, repository, sample_aggregate):
        """
        Test successful aggregate update

        Given: Repository with existing aggregate
        When: Updating aggregate with correct version
        Then: Should update successfully
        """
        # Given
        await repository.add_async(sample_aggregate)
        sample_aggregate.name = "Updated Name"
        sample_aggregate.increment_version()

        # When
        result = await repository.update_async(sample_aggregate)

        # Then
        assert result.is_success

        # Verify update
        retrieved = await repository.get_by_id_async(sample_aggregate.id)
        assert retrieved.has_value
        assert retrieved.value.name == "Updated Name"
        assert retrieved.value.version == 1

    @pytest.mark.asyncio
    async def test_should_fail_update_when_aggregate_not_exists(self, repository):
        """
        Test update failure when aggregate doesn't exist

        Given: Empty repository
        When: Updating non-existent aggregate
        Then: Should fail with appropriate error
        """
        # Given
        non_existent_aggregate = TestAggregate(TestEntityId("NON-EXISTENT"), "Test")
        non_existent_aggregate.increment_version()

        # When
        result = await repository.update_async(non_existent_aggregate)

        # Then
        assert result.is_failure
        assert result.error.code == "Repository.AggregateNotFound"

    @pytest.mark.asyncio
    async def test_should_fail_update_when_version_conflict(self, repository, sample_aggregate):
        """
        Test update failure due to optimistic concurrency conflict

        Given: Repository with existing aggregate
        When: Updating with wrong version
        Then: Should fail with concurrency error
        """
        # Given
        await repository.add_async(sample_aggregate)

        # Simulate concurrent modification by advancing version incorrectly
        sample_aggregate.version = 5  # Should be 1 for first update
        sample_aggregate.name = "Conflicted Update"

        # When
        result = await repository.update_async(sample_aggregate)

        # Then
        assert result.is_failure
        assert result.error.code == "Repository.ConcurrencyConflict"
        assert "version mismatch" in result.error.message

    @pytest.mark.asyncio
    async def test_should_delete_aggregate_successfully_when_exists(self, repository, sample_aggregate):
        """
        Test successful aggregate deletion

        Given: Repository with existing aggregate
        When: Deleting the aggregate
        Then: Aggregate should be removed
        """
        # Given
        await repository.add_async(sample_aggregate)
        assert repository.get_storage_count() == 1

        # When
        result = await repository.delete_async(sample_aggregate.id)

        # Then
        assert result.is_success
        assert repository.get_storage_count() == 0

        # Verify it's gone
        retrieved = await repository.get_by_id_async(sample_aggregate.id)
        assert not retrieved.has_value

    @pytest.mark.asyncio
    async def test_should_fail_delete_when_aggregate_not_exists(self, repository):
        """
        Test deletion failure when aggregate doesn't exist

        Given: Empty repository
        When: Deleting non-existent aggregate
        Then: Should fail with appropriate error
        """
        # Given
        non_existent_id = TestEntityId("NON-EXISTENT")

        # When
        result = await repository.delete_async(non_existent_id)

        # Then
        assert result.is_failure
        assert result.error.code == "Repository.AggregateNotFound"

    @pytest.mark.asyncio
    async def test_should_check_existence_correctly(self, repository, sample_aggregate):
        """
        Test existence check operations

        Given: Repository with and without aggregates
        When: Checking existence
        Then: Should return correct boolean values
        """
        # Given - Empty repository
        non_existent_id = TestEntityId("NON-EXISTENT")

        # When/Then - Should not exist initially
        exists_before = await repository.exists_async(sample_aggregate.id)
        assert not exists_before

        exists_non_existent = await repository.exists_async(non_existent_id)
        assert not exists_non_existent

        # Given - Add aggregate
        await repository.add_async(sample_aggregate)

        # When/Then - Should exist after adding
        exists_after = await repository.exists_async(sample_aggregate.id)
        assert exists_after

        # When/Then - Non-existent should still not exist
        exists_non_existent_after = await repository.exists_async(non_existent_id)
        assert not exists_non_existent_after

    @pytest.mark.asyncio
    async def test_should_handle_concurrent_operations_correctly(self, repository):
        """
        Test concurrent repository operations

        Given: Multiple async operations running concurrently
        When: Executing operations in parallel
        Then: All operations should complete without interference
        """
        # Given
        aggregates = [
            TestAggregate(TestEntityId(f"CONCURRENT-{i}"), f"Aggregate {i}")
            for i in range(5)
        ]

        # When - Add all aggregates concurrently
        add_tasks = [repository.add_async(agg) for agg in aggregates]
        add_results = await asyncio.gather(*add_tasks)

        # Then - All additions should succeed
        for result in add_results:
            assert result.is_success

        assert repository.get_storage_count() == 5

        # When - Retrieve all aggregates concurrently
        get_tasks = [repository.get_by_id_async(agg.id) for agg in aggregates]
        get_results = await asyncio.gather(*get_tasks)

        # Then - All retrievals should succeed
        for result in get_results:
            assert result.has_value

        # When - Check existence for all aggregates concurrently
        exists_tasks = [repository.exists_async(agg.id) for agg in aggregates]
        exists_results = await asyncio.gather(*exists_tasks)

        # Then - All should exist
        for exists in exists_results:
            assert exists

    @pytest.mark.asyncio
    async def test_should_handle_infrastructure_failures_gracefully(self, repository, sample_aggregate):
        """
        Test infrastructure failure handling

        Given: Repository configured to fail operations
        When: Performing operations
        Then: Should return appropriate infrastructure errors
        """
        # Given
        repository.set_fail_operations(True)

        # When - Try to add
        add_result = await repository.add_async(sample_aggregate)

        # Then
        assert add_result.is_failure
        assert add_result.error.code == "Repository.AddFailed"
        assert add_result.error.category.value == "Infrastructure"

        # Reset for update test
        repository.set_fail_operations(False)
        await repository.add_async(sample_aggregate)
        sample_aggregate.increment_version()
        repository.set_fail_operations(True)

        # When - Try to update
        update_result = await repository.update_async(sample_aggregate)

        # Then
        assert update_result.is_failure
        assert update_result.error.code == "Repository.UpdateFailed"

        # When - Try to delete
        delete_result = await repository.delete_async(sample_aggregate.id)

        # Then
        assert delete_result.is_failure
        assert delete_result.error.code == "Repository.DeleteFailed"

    @pytest.mark.asyncio
    async def test_should_respect_async_timing_and_cancellation(self, repository):
        """
        Test async timing and cancellation behavior

        Given: Repository with configured delays
        When: Running operations with timeouts
        Then: Should handle timing correctly
        """
        # Given
        repository.set_operation_delay(0.1)  # 100ms delay
        large_aggregate = TestAggregate(TestEntityId("SLOW-OP"), "Slow Operation")

        # When - Measure operation timing
        import time
        start_time = time.time()
        result = await repository.add_async(large_aggregate)
        end_time = time.time()

        # Then
        assert result.is_success
        operation_time = end_time - start_time
        assert operation_time >= 0.1  # Should take at least the delay time

        # When - Test with timeout (simulated cancellation)
        repository.set_operation_delay(0.5)  # 500ms delay
        timeout_aggregate = TestAggregate(TestEntityId("TIMEOUT-TEST"), "Timeout Test")

        try:
            # This should timeout before the operation completes
            await asyncio.wait_for(
                repository.add_async(timeout_aggregate),
                timeout=0.2  # 200ms timeout, less than 500ms operation time
            )
            assert False, "Should have timed out"
        except asyncio.TimeoutError:
            # Then - This is expected behavior
            pass

    @pytest.mark.asyncio
    async def test_should_maintain_data_consistency_under_load(self, repository):
        """
        Test data consistency under concurrent load

        Given: Multiple concurrent operations on same data
        When: Performing mixed operations
        Then: Data consistency should be maintained
        """
        # Given
        base_aggregate = TestAggregate(TestEntityId("CONSISTENCY-TEST"), "Base")
        await repository.add_async(base_aggregate)

        # When - Concurrent reads (should not interfere with each other)
        read_tasks = [repository.get_by_id_async(base_aggregate.id) for _ in range(10)]
        read_results = await asyncio.gather(*read_tasks)

        # Then - All reads should succeed and return same data
        for result in read_results:
            assert result.has_value
            assert result.value.name == "Base"
            assert result.value.version == 0

        # When - Multiple existence checks
        exists_tasks = [repository.exists_async(base_aggregate.id) for _ in range(10)]
        exists_results = await asyncio.gather(*exists_tasks)

        # Then - All should return True consistently
        for exists in exists_results:
            assert exists

        # When - Try to add duplicates concurrently (should all fail except potentially first)
        duplicate_aggregates = [
            TestAggregate(base_aggregate.id, f"Duplicate {i}")
            for i in range(5)
        ]
        duplicate_tasks = [repository.add_async(agg) for agg in duplicate_aggregates]
        duplicate_results = await asyncio.gather(*duplicate_tasks, return_exceptions=True)

        # Then - All should fail since aggregate already exists
        for result in duplicate_results:
            if not isinstance(result, Exception):
                assert result.is_failure
                assert result.error.code == "Repository.AggregateExists"