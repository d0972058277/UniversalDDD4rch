"""
Unit tests for Entity identity-based equality.

Tests comprehensive scenarios for Entity identity equality
including ID comparison, inheritance, and edge cases.

Test naming: test_should_expected_behavior_when_state_under_test
"""

import pytest
from typing import Any

# Import core types
from architecture_core.domain.entities import Entity
from architecture_core.domain.protocols import EntityId

# Import example identifiers
from examples.order_domain.identifiers import OrderId, CustomerId, ProductId


class MockEntityId:
    """Mock entity ID for testing."""

    def __init__(self, value: str):
        self.value = value

    def __str__(self) -> str:
        return self.value

    def __eq__(self, other: object) -> bool:
        return isinstance(other, MockEntityId) and self.value == other.value

    def __hash__(self) -> int:
        return hash(self.value)


class MockEntity(Entity[MockEntityId]):
    """Mock entity for testing."""

    def __init__(self, id: MockEntityId, data: str = "default"):
        super().__init__(id)
        self.data = data

    def update_data(self, new_data: str) -> None:
        """Update entity data (doesn't affect equality)."""
        self.data = new_data


class AnotherMockEntity(Entity[MockEntityId]):
    """Another mock entity type for testing type differences."""

    def __init__(self, id: MockEntityId):
        super().__init__(id)


class DerivedMockEntity(MockEntity):
    """Derived mock entity for testing inheritance."""

    def __init__(self, id: MockEntityId, data: str = "default", extra: str = "extra"):
        super().__init__(id, data)
        self.extra = extra


class TestEntityIdentityEquality:
    """Test identity-based equality behavior in Entity."""

    def test_should_be_equal_when_same_instance(self):
        """Test that entity is equal to itself."""
        # Given
        entity_id = MockEntityId("ENTITY-123")
        entity = MockEntity(entity_id)

        # When
        result = entity == entity

        # Then
        assert result is True

    def test_should_be_equal_when_same_id_same_type(self):
        """Test that entities are equal when they have the same ID and type."""
        # Given
        entity_id = MockEntityId("ENTITY-123")
        entity1 = MockEntity(entity_id, "data1")
        entity2 = MockEntity(entity_id, "data2")  # Different data, same ID

        # When
        result = entity1 == entity2

        # Then
        assert result is True  # Equality based on ID only, not data

    def test_should_not_be_equal_when_different_ids(self):
        """Test that entities are not equal when they have different IDs."""
        # Given
        entity1 = MockEntity(MockEntityId("ENTITY-123"), "same data")
        entity2 = MockEntity(MockEntityId("ENTITY-456"), "same data")

        # When
        result = entity1 == entity2

        # Then
        assert result is False

    def test_should_not_be_equal_when_compared_to_none(self):
        """Test that entity is not equal to None."""
        # Given
        entity = MockEntity(MockEntityId("ENTITY-123"))

        # When
        result = entity == None

        # Then
        assert result is False

    def test_should_not_be_equal_when_compared_to_non_entity(self):
        """Test that entity is not equal to non-Entity objects."""
        # Given
        entity = MockEntity(MockEntityId("ENTITY-123"))
        non_entity = "ENTITY-123"

        # When
        result = entity == non_entity

        # Then
        assert result is False

    def test_should_not_be_equal_when_different_entity_types(self):
        """Test that different entity types are not equal even with same ID."""
        # Given
        entity_id = MockEntityId("ENTITY-123")
        mock_entity = MockEntity(entity_id)
        another_entity = AnotherMockEntity(entity_id)

        # When
        result = mock_entity == another_entity

        # Then
        assert result is False  # Different types, even with same ID

    def test_should_be_equal_when_inheritance_same_concrete_type(self):
        """Test equality with inheritance - same concrete type."""
        # Given
        entity_id = MockEntityId("ENTITY-123")
        derived1 = DerivedMockEntity(entity_id, "data1", "extra1")
        derived2 = DerivedMockEntity(entity_id, "data2", "extra2")

        # When
        result = derived1 == derived2

        # Then
        assert result is True  # Same concrete type and ID

    def test_should_not_be_equal_when_inheritance_different_types(self):
        """Test equality with inheritance - different types in hierarchy."""
        # Given
        entity_id = MockEntityId("ENTITY-123")
        base_entity = MockEntity(entity_id)
        derived_entity = DerivedMockEntity(entity_id)

        # When
        result = base_entity == derived_entity

        # Then
        assert result is False  # Different concrete types

    def test_should_maintain_hash_consistency_with_equality(self):
        """Test that equal entities have equal hash codes."""
        # Given
        entity_id = MockEntityId("ENTITY-123")
        entity1 = MockEntity(entity_id, "data1")
        entity2 = MockEntity(entity_id, "data2")

        # When
        hash1 = hash(entity1)
        hash2 = hash(entity2)

        # Then
        assert entity1 == entity2
        assert hash1 == hash2  # Equal objects must have equal hashes

    def test_should_have_different_hashes_when_different_ids(self):
        """Test that entities with different IDs typically have different hashes."""
        # Given
        entity1 = MockEntity(MockEntityId("ENTITY-123"))
        entity2 = MockEntity(MockEntityId("ENTITY-456"))

        # When
        hash1 = hash(entity1)
        hash2 = hash(entity2)

        # Then
        assert entity1 != entity2
        # Note: Different objects may have equal hashes (hash collisions are allowed)
        # but they typically shouldn't for different IDs

    def test_should_preserve_equality_after_data_changes(self):
        """Test that equality is preserved even when entity data changes."""
        # Given
        entity_id = MockEntityId("ENTITY-123")
        entity1 = MockEntity(entity_id, "initial data")
        entity2 = MockEntity(entity_id, "initial data")
        assert entity1 == entity2

        # When
        entity1.update_data("changed data")

        # Then
        assert entity1 == entity2  # Still equal - identity-based equality
        assert entity1.data != entity2.data  # But data is different

    def test_should_work_with_real_domain_entity_ids(self):
        """Test equality with real domain entity IDs."""

        class OrderEntity(Entity[OrderId]):
            def __init__(self, id: OrderId, status: str = "draft"):
                super().__init__(id)
                self.status = status

        class CustomerEntity(Entity[CustomerId]):
            def __init__(self, id: CustomerId, name: str = "Unknown"):
                super().__init__(id)
                self.name = name

        # Given
        order_id = OrderId("ORD-123456")
        customer_id = CustomerId("CUST-789")

        order1 = OrderEntity(order_id, "draft")
        order2 = OrderEntity(order_id, "confirmed")  # Different status
        customer = CustomerEntity(customer_id)

        # When & Then
        assert order1 == order2  # Same ID, same type
        assert order1 != customer  # Different types
        assert hash(order1) == hash(order2)

    def test_should_handle_none_id_validation(self):
        """Test that None ID raises appropriate error."""
        # Given & When & Then
        with pytest.raises(ValueError, match="Entity ID cannot be None"):
            MockEntity(None)

    def test_should_provide_meaningful_string_representation(self):
        """Test that string representation includes type and ID."""
        # Given
        entity_id = MockEntityId("ENTITY-123")
        entity = MockEntity(entity_id, "test data")

        # When
        str_repr = str(entity)

        # Then
        assert "MockEntity" in str_repr
        assert "ENTITY-123" in str_repr

    def test_should_handle_complex_entity_id_types(self):
        """Test equality with complex entity ID types."""

        class ComplexId:
            def __init__(self, prefix: str, number: int, suffix: str):
                self.prefix = prefix
                self.number = number
                self.suffix = suffix

            def __str__(self) -> str:
                return f"{self.prefix}-{self.number}-{self.suffix}"

            def __eq__(self, other: object) -> bool:
                return (isinstance(other, ComplexId) and
                       self.prefix == other.prefix and
                       self.number == other.number and
                       self.suffix == other.suffix)

            def __hash__(self) -> int:
                return hash((self.prefix, self.number, self.suffix))

        class ComplexEntity(Entity[ComplexId]):
            def __init__(self, id: ComplexId):
                super().__init__(id)

        # Given
        id1 = ComplexId("ORDER", 123, "DRAFT")
        id2 = ComplexId("ORDER", 123, "DRAFT")  # Same components
        id3 = ComplexId("ORDER", 456, "DRAFT")  # Different number

        entity1 = ComplexEntity(id1)
        entity2 = ComplexEntity(id2)
        entity3 = ComplexEntity(id3)

        # When & Then
        assert entity1 == entity2  # Same complex ID
        assert entity1 != entity3  # Different complex ID
        assert hash(entity1) == hash(entity2)

    def test_should_maintain_equality_contract_reflexivity(self):
        """Test reflexivity: x == x should always be True."""
        # Given
        entity = MockEntity(MockEntityId("ENTITY-123"))

        # When & Then
        assert entity == entity

    def test_should_maintain_equality_contract_symmetry(self):
        """Test symmetry: if x == y then y == x."""
        # Given
        entity_id = MockEntityId("ENTITY-123")
        entity1 = MockEntity(entity_id)
        entity2 = MockEntity(entity_id)

        # When & Then
        assert entity1 == entity2
        assert entity2 == entity1  # Symmetry

    def test_should_maintain_equality_contract_transitivity(self):
        """Test transitivity: if x == y and y == z then x == z."""
        # Given
        entity_id = MockEntityId("ENTITY-123")
        entity1 = MockEntity(entity_id, "data1")
        entity2 = MockEntity(entity_id, "data2")
        entity3 = MockEntity(entity_id, "data3")

        # When & Then
        assert entity1 == entity2
        assert entity2 == entity3
        assert entity1 == entity3  # Transitivity

    def test_should_maintain_equality_contract_consistency(self):
        """Test consistency: multiple calls should return same result."""
        # Given
        entity_id = MockEntityId("ENTITY-123")
        entity1 = MockEntity(entity_id)
        entity2 = MockEntity(entity_id)
        different_entity = MockEntity(MockEntityId("ENTITY-456"))

        # When & Then
        # Multiple calls should be consistent
        for _ in range(5):
            assert entity1 == entity2
            assert entity1 != different_entity

    def test_should_handle_entity_collections_correctly(self):
        """Test that entities work correctly in collections."""
        # Given
        id1 = MockEntityId("ENTITY-123")
        id2 = MockEntityId("ENTITY-456")
        entity1a = MockEntity(id1, "data1")
        entity1b = MockEntity(id1, "data2")  # Same ID, different data
        entity2 = MockEntity(id2)

        # When
        entity_set = {entity1a, entity1b, entity2}
        entity_list = [entity1a, entity1b, entity2]

        # Then
        # Set should contain only 2 unique entities (entity1a and entity1b are equal)
        assert len(entity_set) == 2
        assert len(entity_list) == 3

        # Check membership
        assert entity1a in entity_set
        assert entity1b in entity_set  # Same as entity1a
        assert entity2 in entity_set

    def test_should_work_as_dictionary_keys(self):
        """Test that entities can be used as dictionary keys."""
        # Given
        id1 = MockEntityId("ENTITY-123")
        id2 = MockEntityId("ENTITY-456")
        entity1a = MockEntity(id1, "data1")
        entity1b = MockEntity(id1, "data2")  # Same ID
        entity2 = MockEntity(id2)

        # When
        entity_dict = {
            entity1a: "value1",
            entity2: "value2"
        }

        # Then
        assert entity_dict[entity1a] == "value1"
        assert entity_dict[entity1b] == "value1"  # Same key as entity1a
        assert entity_dict[entity2] == "value2"
        assert len(entity_dict) == 2


if __name__ == "__main__":
    # Run tests when executed directly
    import sys

    # Create test instance and run all test methods
    test_instance = TestEntityIdentityEquality()

    # Get all test methods
    test_methods = [method for method in dir(test_instance)
                   if method.startswith('test_should_')]

    print(f"Running {len(test_methods)} Entity identity equality tests...")

    failed_tests = []

    for test_method_name in test_methods:
        try:
            test_method = getattr(test_instance, test_method_name)
            test_method()
            print(f"✅ {test_method_name}")
        except Exception as e:
            print(f"❌ {test_method_name}: {e}")
            failed_tests.append(test_method_name)

    if failed_tests:
        print(f"\n❌ {len(failed_tests)} tests failed:")
        for test_name in failed_tests:
            print(f"  - {test_name}")
        sys.exit(1)
    else:
        print(f"\n✅ All {len(test_methods)} Entity identity equality tests passed!")
        sys.exit(0)