"""
ValueObject abstract base class for structural equality.

This module provides the base class for value objects that implement
structural equality based on their component values.
"""

from typing import Iterator, Any
from abc import ABC, abstractmethod


class ValueObject(ABC):
    """
    Abstract base class for value objects with structural equality.

    Value objects are immutable objects whose equality is based on their
    structural content rather than identity. They represent descriptive
    aspects of the domain with no conceptual identity.

    Subclasses must implement get_equality_components() to define which
    attributes participate in equality comparison. The base class provides
    implementations of __eq__ and __hash__ based on these components.

    Examples:
        class Money(ValueObject):
            def __init__(self, amount: Decimal, currency: str):
                self.amount = amount
                self.currency = currency

            def get_equality_components(self) -> Iterator[Any]:
                yield self.amount
                yield self.currency.upper()

        class Address(ValueObject):
            def __init__(self, street: str, city: str, postal_code: str):
                self.street = street
                self.city = city
                self.postal_code = postal_code

            def get_equality_components(self) -> Iterator[Any]:
                yield self.street.lower().strip()
                yield self.city.lower().strip()
                yield self.postal_code.upper().strip()

    Design Principles:
        1. Immutability: Value objects should be immutable after creation
        2. Structural Equality: Equality based on component values, not identity
        3. Side-effect Free: Operations should not modify state
        4. Replaceability: Value objects can be replaced with equal instances
    """

    @abstractmethod
    def get_equality_components(self) -> Iterator[Any]:
        """
        Return components that define equality for this value object.

        This method must be implemented by subclasses to specify which
        attributes participate in equality comparison. Components should
        be yielded in a consistent order.

        Returns:
            Iterator yielding equality components

        Examples:
            def get_equality_components(self) -> Iterator[Any]:
                yield self.amount
                yield self.currency
                yield self.precision

        Notes:
            - Order matters for equality comparison
            - Include all fields that define the value's meaning
            - Normalize values (e.g., case-insensitive strings)
            - Handle None values appropriately
            - Convert collections to tuples for hashability
        """
        ...

    def __eq__(self, other: object) -> bool:
        """
        Structural equality based on equality components.

        Two value objects are equal if they are of the same type and
        have equal equality components in the same order.

        Args:
            other: Object to compare with

        Returns:
            True if objects are structurally equal, False otherwise
        """
        if self is other:
            return True

        if other is None or type(self) != type(other):
            return False

        return self._get_equality_components_list() == other._get_equality_components_list()

    def __hash__(self) -> int:
        """
        Hash code based on equality components.

        The hash is computed from all equality components to ensure
        that equal objects have equal hash codes.

        Returns:
            Hash code for the value object
        """
        components = self._get_equality_components_list()
        return hash(tuple(components))

    def _get_equality_components_list(self) -> list[Any]:
        """
        Convert equality components to list for comparison.

        This method handles the conversion of the iterator to a list
        and ensures proper handling of unhashable types by converting
        them to hashable equivalents.

        Returns:
            List of equality components
        """
        components = []
        for component in self.get_equality_components():
            if component is None:
                components.append(None)
            elif isinstance(component, (list, set)):
                # Convert collections to tuples for hashability
                components.append(tuple(sorted(component)) if isinstance(component, set) else tuple(component))
            elif isinstance(component, dict):
                # Convert dictionaries to sorted tuples of key-value pairs
                components.append(tuple(sorted(component.items())))
            else:
                components.append(component)
        return components

    def __str__(self) -> str:
        """
        String representation showing type and key components.

        Returns:
            Human-readable string representation
        """
        class_name = self.__class__.__name__
        components = self._get_equality_components_list()

        if not components:
            return f"{class_name}()"

        # Show first few components for readability
        if len(components) <= 3:
            component_str = ", ".join(str(c) for c in components)
        else:
            component_str = ", ".join(str(c) for c in components[:3]) + ", ..."

        return f"{class_name}({component_str})"

    def __repr__(self) -> str:
        """
        Detailed string representation for debugging.

        Returns:
            Detailed string representation
        """
        return self.__str__()