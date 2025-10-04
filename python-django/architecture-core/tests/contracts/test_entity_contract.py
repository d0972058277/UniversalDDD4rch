"""
Contract tests for Entity generic class.

These tests define the behavioral contract that all Entity implementations must satisfy.
Tests are written following TDD approach and MUST FAIL before implementation.

Test naming: test_should_expected_behavior_when_state_under_test
Test structure: Given-When-Then blocks with explicit comments
"""

import pytest
from dataclasses import dataclass
from architecture_core.domain import Entity


@dataclass(frozen=True)
class TestEntityId:
    """Test entity ID for contract verification"""
    value: str

    def __str__(self) -> str:
        return self.value

    def __eq__(self, other: object) -> bool:
        return isinstance(other, TestEntityId) and self.value == other.value

    def __hash__(self) -> int:
        return hash(self.value)


class TestEntityContract:
    """Contract tests for Entity behavioral compliance"""

    def test_should_initialize_with_id_when_created(self):
        """
        Contract: Entity must initialize with required ID
        """
        # Given
        entity_id = TestEntityId("test-123")

        # When
        entity = self._create_test_entity(entity_id)

        # Then
        assert entity.id == entity_id

    def test_should_be_equal_when_same_id(self):
        """
        Contract: Entities with same ID must be equal (identity-based equality)
        """
        # Given
        entity_id = TestEntityId("test-123")
        entity1 = self._create_test_entity(entity_id)
        entity2 = self._create_test_entity(entity_id)

        # When
        result = entity1 == entity2

        # Then
        assert result is True

    def test_should_not_be_equal_when_different_ids(self):
        """
        Contract: Entities with different IDs must not be equal
        """
        # Given
        entity_id1 = TestEntityId("test-123")
        entity_id2 = TestEntityId("test-456")
        entity1 = self._create_test_entity(entity_id1)
        entity2 = self._create_test_entity(entity_id2)

        # When
        result = entity1 == entity2

        # Then
        assert result is False

    def test_should_not_be_equal_when_compared_to_none(self):
        """
        Contract: Entity must not be equal to None
        """
        # Given
        entity_id = TestEntityId("test-123")
        entity = self._create_test_entity(entity_id)

        # When
        result = entity == None

        # Then
        assert result is False

    def test_should_not_be_equal_when_compared_to_different_type(self):
        """
        Contract: Entity must not be equal to different types
        """
        # Given
        entity_id = TestEntityId("test-123")
        entity = self._create_test_entity(entity_id)

        # When
        result = entity == "test-123"

        # Then
        assert result is False

    def test_should_be_hashable_when_used_in_collections(self):
        """
        Contract: Entity must be hashable for use in sets and dict keys
        """
        # Given
        entity_id1 = TestEntityId("test-123")
        entity_id2 = TestEntityId("test-456")
        entity1 = self._create_test_entity(entity_id1)
        entity2 = self._create_test_entity(entity_id2)

        # When
        hash1 = hash(entity1)
        hash2 = hash(entity2)
        entity_set = {entity1, entity2}

        # Then
        assert isinstance(hash1, int)
        assert isinstance(hash2, int)
        assert len(entity_set) == 2

    def test_should_have_consistent_hash_when_equal_entities(self):
        """
        Contract: Equal entities must have same hash code
        """
        # Given
        entity_id = TestEntityId("test-123")
        entity1 = self._create_test_entity(entity_id)
        entity2 = self._create_test_entity(entity_id)

        # When
        hash1 = hash(entity1)
        hash2 = hash(entity2)

        # Then
        assert entity1 == entity2
        assert hash1 == hash2

    def test_should_support_identity_reflexivity_when_same_instance(self):
        """
        Contract: Entity must satisfy reflexivity (x == x)
        """
        # Given
        entity_id = TestEntityId("test-123")
        entity = self._create_test_entity(entity_id)

        # When
        result = entity == entity

        # Then
        assert result is True

    def test_should_support_identity_symmetry_when_equal_entities(self):
        """
        Contract: Entity must satisfy symmetry (x == y implies y == x)
        """
        # Given
        entity_id = TestEntityId("test-123")
        entity1 = self._create_test_entity(entity_id)
        entity2 = self._create_test_entity(entity_id)

        # When
        result1 = entity1 == entity2
        result2 = entity2 == entity1

        # Then
        assert result1 == result2 == True

    def test_should_support_identity_transitivity_when_three_equal_entities(self):
        """
        Contract: Entity must satisfy transitivity (x == y and y == z implies x == z)
        """
        # Given
        entity_id = TestEntityId("test-123")
        entity1 = self._create_test_entity(entity_id)
        entity2 = self._create_test_entity(entity_id)
        entity3 = self._create_test_entity(entity_id)

        # When
        result_xy = entity1 == entity2
        result_yz = entity2 == entity3
        result_xz = entity1 == entity3

        # Then
        assert result_xy is True
        assert result_yz is True
        assert result_xz is True

    def test_should_maintain_id_immutability_when_accessed(self):
        """
        Contract: Entity ID must be immutable after creation
        """
        # Given
        entity_id = TestEntityId("test-123")
        entity = self._create_test_entity(entity_id)

        # When
        retrieved_id = entity.id

        # Then
        assert retrieved_id == entity_id
        assert retrieved_id is entity_id  # Should be same instance

    def test_should_reject_none_id_when_created(self):
        """
        Contract: Entity must reject None as ID
        """
        # Given
        none_id = None

        # When/Then
        with pytest.raises((ValueError, TypeError)):
            self._create_test_entity(none_id)

    def test_should_ignore_other_attributes_in_equality_when_same_id(self):
        """
        Contract: Entity equality must be based only on ID, not other attributes
        """
        # Given
        entity_id = TestEntityId("test-123")
        entity1 = self._create_test_entity_with_data(entity_id, "data1")
        entity2 = self._create_test_entity_with_data(entity_id, "data2")

        # When
        result = entity1 == entity2

        # Then
        assert result is True  # Same ID, different data, still equal

    def test_should_not_be_equal_when_different_entity_types_same_id(self):
        """
        Contract: Entities of different types must not be equal even with same ID
        """
        # Given
        entity_id = TestEntityId("test-123")
        entity1 = self._create_test_entity(entity_id)
        entity2 = self._create_different_test_entity(entity_id)

        # When
        result = entity1 == entity2

        # Then
        assert result is False

    def _create_test_entity(self, entity_id: TestEntityId) -> Entity:
        """
        Helper method to create test Entity instance.
        This will fail until Entity is properly implemented.
        """
        # This import will fail until implementation exists
        from architecture_core.domain import Entity

        # Use a consistent class definition to avoid type mismatch issues
        if not hasattr(self, '_TestEntity'):
            class TestEntity(Entity[TestEntityId]):
                def __init__(self, id: TestEntityId):
                    super().__init__(id)
            self._TestEntity = TestEntity

        return self._TestEntity(entity_id)

    def _create_test_entity_with_data(self, entity_id: TestEntityId, data: str) -> Entity:
        """
        Helper method to create test Entity with additional data.
        """
        from architecture_core.domain import Entity

        if not hasattr(self, '_TestEntityWithData'):
            class TestEntityWithData(Entity[TestEntityId]):
                def __init__(self, id: TestEntityId, data: str):
                    super().__init__(id)
                    self.data = data
            self._TestEntityWithData = TestEntityWithData

        return self._TestEntityWithData(entity_id, data)

    def _create_different_test_entity(self, entity_id: TestEntityId) -> Entity:
        """
        Helper method to create different type of test Entity.
        """
        from architecture_core.domain import Entity

        if not hasattr(self, '_DifferentTestEntity'):
            class DifferentTestEntity(Entity[TestEntityId]):
                def __init__(self, id: TestEntityId):
                    super().__init__(id)
            self._DifferentTestEntity = DifferentTestEntity

        return self._DifferentTestEntity(entity_id)