"""
Unit tests for ValueObject equality edge cases.

Tests comprehensive edge cases for ValueObject structural equality
including nulls, collections, mixed types, and inheritance scenarios.

Test naming: test_should_expected_behavior_when_state_under_test
"""

import pytest
from typing import Iterator, Any, List, Dict, Set, Optional
from decimal import Decimal
from dataclasses import dataclass

# Import core types
from architecture_core.domain.value_objects import ValueObject

# Import example value objects
from examples.order_domain.value_objects import Money, Address, PersonName, Quantity


class TestValueObjectEqualityEdgeCases:
    """Test edge cases for ValueObject equality behavior."""

    def test_should_be_equal_when_same_instance(self):
        """Test that value object is equal to itself."""
        # Given
        money = Money(Decimal("100.50"), "USD")

        # When
        result = money == money

        # Then
        assert result is True

    def test_should_not_be_equal_when_compared_to_none(self):
        """Test that value object is not equal to None."""
        # Given
        money = Money(Decimal("100.50"), "USD")

        # When
        result = money == None

        # Then
        assert result is False

    def test_should_not_be_equal_when_compared_to_different_type(self):
        """Test that value object is not equal to different type."""
        # Given
        money = Money(Decimal("100.50"), "USD")
        string_value = "Money(100.50, USD)"

        # When
        result = money == string_value

        # Then
        assert result is False

    def test_should_not_be_equal_when_compared_to_non_value_object(self):
        """Test that value object is not equal to non-ValueObject."""
        # Given
        money = Money(Decimal("100.50"), "USD")
        regular_object = object()

        # When
        result = money == regular_object

        # Then
        assert result is False

    def test_should_not_be_equal_when_different_value_object_types(self):
        """Test that different ValueObject types are not equal even with same components."""

        class MoneyV1(ValueObject):
            def __init__(self, amount: Decimal, currency: str):
                self.amount = amount
                self.currency = currency

            def get_equality_components(self) -> Iterator[Any]:
                yield self.amount
                yield self.currency

        class MoneyV2(ValueObject):
            def __init__(self, amount: Decimal, currency: str):
                self.amount = amount
                self.currency = currency

            def get_equality_components(self) -> Iterator[Any]:
                yield self.amount
                yield self.currency

        # Given
        money_v1 = MoneyV1(Decimal("100.50"), "USD")
        money_v2 = MoneyV2(Decimal("100.50"), "USD")

        # When
        result = money_v1 == money_v2

        # Then
        assert result is False

    def test_should_handle_none_components_in_equality(self):
        """Test equality with None components."""

        class OptionalValueObject(ValueObject):
            def __init__(self, required: str, optional: Optional[str] = None):
                self.required = required
                self.optional = optional

            def get_equality_components(self) -> Iterator[Any]:
                yield self.required
                yield self.optional

        # Given
        obj1 = OptionalValueObject("test", None)
        obj2 = OptionalValueObject("test", None)
        obj3 = OptionalValueObject("test", "value")

        # When & Then
        assert obj1 == obj2  # Both have None
        assert obj1 != obj3  # One has None, other has value

    def test_should_handle_list_components_in_equality(self):
        """Test equality with list components."""

        class ListValueObject(ValueObject):
            def __init__(self, name: str, items: List[str]):
                self.name = name
                self.items = items

            def get_equality_components(self) -> Iterator[Any]:
                yield self.name
                yield self.items

        # Given
        obj1 = ListValueObject("test", ["a", "b", "c"])
        obj2 = ListValueObject("test", ["a", "b", "c"])
        obj3 = ListValueObject("test", ["a", "c", "b"])  # Different order

        # When & Then
        assert obj1 == obj2  # Same list contents and order
        assert obj1 != obj3  # Different order

    def test_should_handle_set_components_in_equality(self):
        """Test equality with set components."""

        class SetValueObject(ValueObject):
            def __init__(self, name: str, tags: Set[str]):
                self.name = name
                self.tags = tags

            def get_equality_components(self) -> Iterator[Any]:
                yield self.name
                yield self.tags

        # Given
        obj1 = SetValueObject("test", {"tag1", "tag2", "tag3"})
        obj2 = SetValueObject("test", {"tag3", "tag1", "tag2"})  # Different order
        obj3 = SetValueObject("test", {"tag1", "tag2"})  # Different contents

        # When & Then
        assert obj1 == obj2  # Sets are order-independent
        assert obj1 != obj3  # Different contents

    def test_should_handle_dict_components_in_equality(self):
        """Test equality with dictionary components."""

        class DictValueObject(ValueObject):
            def __init__(self, name: str, metadata: Dict[str, Any]):
                self.name = name
                self.metadata = metadata

            def get_equality_components(self) -> Iterator[Any]:
                yield self.name
                yield self.metadata

        # Given
        obj1 = DictValueObject("test", {"key1": "value1", "key2": "value2"})
        obj2 = DictValueObject("test", {"key2": "value2", "key1": "value1"})  # Different order
        obj3 = DictValueObject("test", {"key1": "value1"})  # Different contents

        # When & Then
        assert obj1 == obj2  # Dicts are order-independent
        assert obj1 != obj3  # Different contents

    def test_should_handle_nested_collections_in_equality(self):
        """Test equality with nested collection components."""

        class NestedValueObject(ValueObject):
            def __init__(self, name: str, nested_data: Dict[str, List[str]]):
                self.name = name
                self.nested_data = nested_data

            def get_equality_components(self) -> Iterator[Any]:
                yield self.name
                yield self.nested_data

        # Given
        obj1 = NestedValueObject("test", {"list1": ["a", "b"], "list2": ["c", "d"]})
        obj2 = NestedValueObject("test", {"list2": ["c", "d"], "list1": ["a", "b"]})  # Different dict order
        obj3 = NestedValueObject("test", {"list1": ["b", "a"], "list2": ["c", "d"]})  # Different list order

        # When & Then
        assert obj1 == obj2  # Dict order doesn't matter
        assert obj1 != obj3  # List order matters

    def test_should_handle_empty_collections_in_equality(self):
        """Test equality with empty collection components."""

        class EmptyCollectionValueObject(ValueObject):
            def __init__(self, empty_list: List[str], empty_dict: Dict[str, str], empty_set: Set[str]):
                self.empty_list = empty_list
                self.empty_dict = empty_dict
                self.empty_set = empty_set

            def get_equality_components(self) -> Iterator[Any]:
                yield self.empty_list
                yield self.empty_dict
                yield self.empty_set

        # Given
        obj1 = EmptyCollectionValueObject([], {}, set())
        obj2 = EmptyCollectionValueObject([], {}, set())

        # When
        result = obj1 == obj2

        # Then
        assert result is True

    def test_should_handle_case_sensitive_string_components(self):
        """Test equality with case-sensitive string components."""

        class CaseSensitiveValueObject(ValueObject):
            def __init__(self, value: str):
                self.value = value

            def get_equality_components(self) -> Iterator[Any]:
                yield self.value  # No normalization

        # Given
        obj1 = CaseSensitiveValueObject("Test")
        obj2 = CaseSensitiveValueObject("test")
        obj3 = CaseSensitiveValueObject("TEST")

        # When & Then
        assert obj1 != obj2  # Different case
        assert obj1 != obj3  # Different case
        assert obj2 != obj3  # Different case

    def test_should_normalize_string_components_when_designed_to(self):
        """Test equality with normalized string components."""
        # Given - using PersonName which normalizes to lowercase
        name1 = PersonName("John", "DOE")
        name2 = PersonName("JOHN", "doe")
        name3 = PersonName("john", "Doe")

        # When & Then
        assert name1 == name2  # Names are normalized to lowercase
        assert name1 == name3  # Names are normalized to lowercase
        assert name2 == name3  # Names are normalized to lowercase

    def test_should_handle_whitespace_normalization(self):
        """Test equality with whitespace normalization."""
        # Given - using Address which normalizes whitespace
        addr1 = Address("  123 Main St  ", "  New York  ", "  NY  ", "10001", "  US  ")
        addr2 = Address("123 Main St", "New York", "NY", "10001", "US")

        # When
        result = addr1 == addr2

        # Then
        assert result is True  # Whitespace is normalized in equality components

    def test_should_handle_numeric_precision_in_equality(self):
        """Test equality with numeric precision."""
        # Given
        money1 = Money(Decimal("100.50"), "USD")
        money2 = Money(Decimal("100.500"), "USD")  # Different precision
        money3 = Money(Decimal("100.51"), "USD")  # Different value

        # When & Then
        assert money1 == money2  # Decimal handles precision correctly
        assert money1 != money3  # Different values

    def test_should_maintain_hash_consistency_with_equality(self):
        """Test that equal objects have equal hash codes."""
        # Given
        money1 = Money(Decimal("100.50"), "USD")
        money2 = Money(Decimal("100.50"), "USD")
        money3 = Money(Decimal("100.51"), "USD")

        # When
        hash1 = hash(money1)
        hash2 = hash(money2)
        hash3 = hash(money3)

        # Then
        assert money1 == money2
        assert hash1 == hash2  # Equal objects must have equal hashes
        assert money1 != money3
        # Note: Unequal objects may have equal hashes (hash collisions are allowed)

    def test_should_handle_complex_mixed_type_components(self):
        """Test equality with complex mixed-type components."""

        class ComplexValueObject(ValueObject):
            def __init__(self,
                        string_val: str,
                        int_val: int,
                        decimal_val: Decimal,
                        list_val: List[str],
                        dict_val: Dict[str, int],
                        optional_val: Optional[str] = None):
                self.string_val = string_val
                self.int_val = int_val
                self.decimal_val = decimal_val
                self.list_val = list_val
                self.dict_val = dict_val
                self.optional_val = optional_val

            def get_equality_components(self) -> Iterator[Any]:
                yield self.string_val
                yield self.int_val
                yield self.decimal_val
                yield self.list_val
                yield self.dict_val
                yield self.optional_val

        # Given
        obj1 = ComplexValueObject(
            "test", 42, Decimal("3.14"),
            ["a", "b"], {"x": 1, "y": 2}, "optional"
        )
        obj2 = ComplexValueObject(
            "test", 42, Decimal("3.14"),
            ["a", "b"], {"y": 2, "x": 1}, "optional"  # Dict order different
        )
        obj3 = ComplexValueObject(
            "test", 42, Decimal("3.14"),
            ["a", "b"], {"x": 1, "y": 2}, None  # Optional value different
        )

        # When & Then
        assert obj1 == obj2  # Dict order doesn't affect equality
        assert obj1 != obj3  # Optional value affects equality

    def test_should_handle_inheritance_hierarchy_correctly(self):
        """Test equality with value object inheritance."""

        class BaseValueObject(ValueObject):
            def __init__(self, base_value: str):
                self.base_value = base_value

            def get_equality_components(self) -> Iterator[Any]:
                yield self.base_value

        class DerivedValueObject(BaseValueObject):
            def __init__(self, base_value: str, derived_value: int):
                super().__init__(base_value)
                self.derived_value = derived_value

            def get_equality_components(self) -> Iterator[Any]:
                yield from super().get_equality_components()
                yield self.derived_value

        # Given
        base_obj = BaseValueObject("test")
        derived_obj1 = DerivedValueObject("test", 42)
        derived_obj2 = DerivedValueObject("test", 42)
        derived_obj3 = DerivedValueObject("test", 43)

        # When & Then
        assert base_obj != derived_obj1  # Different types
        assert derived_obj1 == derived_obj2  # Same type and components
        assert derived_obj1 != derived_obj3  # Same type, different components

    def test_should_handle_circular_reference_protection(self):
        """Test that circular references don't cause infinite loops."""

        class CircularValueObject(ValueObject):
            def __init__(self, name: str, data: Dict[str, Any]):
                self.name = name
                self.data = data

            def get_equality_components(self) -> Iterator[Any]:
                yield self.name
                yield self.data

        # Given - create circular reference in data
        data1 = {"key": "value"}
        data1["self"] = data1  # Circular reference

        data2 = {"key": "value"}
        data2["self"] = data2  # Circular reference

        obj1 = CircularValueObject("test", data1)
        obj2 = CircularValueObject("test", data2)

        # When & Then
        # This should not cause infinite recursion
        # The equality comparison should handle the circular reference gracefully
        try:
            result = obj1 == obj2
            # Result may be True or False depending on implementation,
            # but it should not hang or crash
            assert isinstance(result, bool)
        except RecursionError:
            pytest.fail("Circular reference caused infinite recursion")

    def test_should_handle_very_large_collections(self):
        """Test equality with large collection components."""

        class LargeCollectionValueObject(ValueObject):
            def __init__(self, large_list: List[int]):
                self.large_list = large_list

            def get_equality_components(self) -> Iterator[Any]:
                yield self.large_list

        # Given
        large_list1 = list(range(10000))
        large_list2 = list(range(10000))
        large_list3 = list(range(9999))  # One element shorter

        obj1 = LargeCollectionValueObject(large_list1)
        obj2 = LargeCollectionValueObject(large_list2)
        obj3 = LargeCollectionValueObject(large_list3)

        # When & Then
        assert obj1 == obj2  # Same large collections
        assert obj1 != obj3  # Different sizes

    def test_should_handle_unicode_and_special_characters(self):
        """Test equality with Unicode and special characters."""

        class UnicodeValueObject(ValueObject):
            def __init__(self, text: str):
                self.text = text

            def get_equality_components(self) -> Iterator[Any]:
                yield self.text

        # Given
        obj1 = UnicodeValueObject("Hello 世界! 🌍")
        obj2 = UnicodeValueObject("Hello 世界! 🌍")
        obj3 = UnicodeValueObject("Hello World! 🌍")

        # When & Then
        assert obj1 == obj2  # Same Unicode text
        assert obj1 != obj3  # Different Unicode text

    def test_should_provide_meaningful_string_representation(self):
        """Test that string representation is meaningful for debugging."""
        # Given
        money = Money(Decimal("100.50"), "USD")
        address = Address("123 Main St", "New York", "NY", "10001", "US")

        # When
        money_str = str(money)
        address_str = str(address)

        # Then
        assert "Money" in money_str or "100.50" in money_str or "USD" in money_str
        assert "Address" in address_str or "123 Main St" in address_str

    def test_should_handle_dataclass_value_objects_correctly(self):
        """Test that dataclass-based value objects work correctly."""
        # Given - Money is a dataclass
        money1 = Money(Decimal("100.50"), "USD")
        money2 = Money(Decimal("100.50"), "USD")
        money3 = Money(Decimal("100.51"), "USD")

        # When & Then
        assert money1 == money2  # Same values
        assert money1 != money3  # Different values
        assert hash(money1) == hash(money2)  # Hash consistency

    def test_should_maintain_immutability_contract(self):
        """Test that value objects maintain immutability."""
        # Given
        money = Money(Decimal("100.50"), "USD")

        # When & Then
        # Frozen dataclass should prevent modification
        with pytest.raises(Exception):  # FrozenInstanceError or AttributeError
            money.amount = Decimal("200.00")

        with pytest.raises(Exception):  # FrozenInstanceError or AttributeError
            money.currency = "EUR"


if __name__ == "__main__":
    # Run tests when executed directly
    import sys

    # Create test instance and run all test methods
    test_instance = TestValueObjectEqualityEdgeCases()

    # Get all test methods
    test_methods = [method for method in dir(test_instance)
                   if method.startswith('test_should_')]

    print(f"Running {len(test_methods)} ValueObject equality edge case tests...")

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
        print(f"\n✅ All {len(test_methods)} ValueObject equality edge case tests passed!")
        sys.exit(0)