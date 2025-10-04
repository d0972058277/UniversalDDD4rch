"""Unit type for representing void/no-value returns."""


class UnitType:
    """
    Unit type representing the absence of a meaningful value.

    Used for commands that don't return data (equivalent to void in other languages).
    Following functional programming conventions, we use a singleton Unit value
    instead of None to make the "no return value" case explicit in the type system.
    """

    _instance = None

    def __new__(cls):
        """Ensure Unit is a singleton."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __repr__(self) -> str:
        """Return string representation."""
        return "Unit"

    def __eq__(self, other) -> bool:
        """Check equality (all Unit instances are equal)."""
        return isinstance(other, UnitType)

    def __hash__(self) -> int:
        """Return hash (constant since all Unit instances are equal)."""
        return hash("Unit")


# Singleton instance
Unit = UnitType()

__all__ = ["Unit", "UnitType"]
