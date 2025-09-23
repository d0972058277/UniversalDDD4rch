"""
Example implementations of entity identifiers for the Order domain.
Demonstrates proper EntityId protocol implementation with validation.
"""

import re
import uuid
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class OrderId:
    """Example OrderId implementation with validation."""

    value: str

    def __post_init__(self) -> None:
        """Validate OrderId format and constraints."""
        if not self.value:
            raise ValueError("OrderId value cannot be empty")

        if not self.value.strip():
            raise ValueError("OrderId value cannot be whitespace only")

        # Validate format: ORD-XXXXXX where X is digit
        if not re.match(r'^ORD-\d{6}$', self.value):
            raise ValueError(
                f"OrderId must follow format 'ORD-XXXXXX' where X is digit, got '{self.value}'"
            )

    def __str__(self) -> str:
        """String representation of OrderId."""
        return self.value

    def __eq__(self, other: object) -> bool:
        """Equality based on value."""
        return isinstance(other, OrderId) and self.value == other.value

    def __hash__(self) -> int:
        """Hash based on value."""
        return hash(self.value)

    @classmethod
    def generate(cls) -> 'OrderId':
        """Generate a new OrderId with random number."""
        random_number = str(uuid.uuid4().int)[-6:]  # Take last 6 digits
        return cls(f"ORD-{random_number}")

    @classmethod
    def from_string(cls, value: str) -> 'OrderId':
        """Create OrderId from string value."""
        return cls(value)


@dataclass(frozen=True)
class CustomerId:
    """Example CustomerId implementation with validation."""

    value: str

    def __post_init__(self) -> None:
        """Validate CustomerId format and constraints."""
        if not self.value:
            raise ValueError("CustomerId value cannot be empty")

        if not self.value.strip():
            raise ValueError("CustomerId value cannot be whitespace only")

        # Validate format: CUST-XXX where X is alphanumeric
        if not re.match(r'^CUST-[A-Z0-9]{3,10}$', self.value):
            raise ValueError(
                f"CustomerId must follow format 'CUST-XXX' where X is 3-10 alphanumeric chars, got '{self.value}'"
            )

    def __str__(self) -> str:
        """String representation of CustomerId."""
        return self.value

    def __eq__(self, other: object) -> bool:
        """Equality based on value."""
        return isinstance(other, CustomerId) and self.value == other.value

    def __hash__(self) -> int:
        """Hash based on value."""
        return hash(self.value)

    @classmethod
    def generate(cls) -> 'CustomerId':
        """Generate a new CustomerId with random suffix."""
        random_suffix = str(uuid.uuid4().hex[:6]).upper()
        return cls(f"CUST-{random_suffix}")

    @classmethod
    def from_string(cls, value: str) -> 'CustomerId':
        """Create CustomerId from string value."""
        return cls(value)


@dataclass(frozen=True)
class ProductId:
    """Example ProductId implementation with validation."""

    value: str

    def __post_init__(self) -> None:
        """Validate ProductId format and constraints."""
        if not self.value:
            raise ValueError("ProductId value cannot be empty")

        if not self.value.strip():
            raise ValueError("ProductId value cannot be whitespace only")

        # Validate format: PROD-XXX where X is alphanumeric
        if not re.match(r'^PROD-[A-Z0-9]{3,15}$', self.value):
            raise ValueError(
                f"ProductId must follow format 'PROD-XXX' where X is 3-15 alphanumeric chars, got '{self.value}'"
            )

    def __str__(self) -> str:
        """String representation of ProductId."""
        return self.value

    def __eq__(self, other: object) -> bool:
        """Equality based on value."""
        return isinstance(other, ProductId) and self.value == other.value

    def __hash__(self) -> int:
        """Hash based on value."""
        return hash(self.value)

    @classmethod
    def generate(cls, product_code: Optional[str] = None) -> 'ProductId':
        """Generate a new ProductId with optional product code."""
        if product_code:
            return cls(f"PROD-{product_code.upper()}")
        else:
            random_code = str(uuid.uuid4().hex[:8]).upper()
            return cls(f"PROD-{random_code}")

    @classmethod
    def from_string(cls, value: str) -> 'ProductId':
        """Create ProductId from string value."""
        return cls(value)