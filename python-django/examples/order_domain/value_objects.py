"""
Example implementations of value objects for the Order domain.
Demonstrates proper ValueObject implementation with structural equality.
"""

import re
from dataclasses import dataclass
from decimal import Decimal
from typing import Iterator, Any, Optional

from architecture_core.domain.value_objects import ValueObject


@dataclass(frozen=True, eq=False)
class Money(ValueObject):
    """Example Money value object with currency support."""

    amount: Decimal
    currency: str

    def __post_init__(self) -> None:
        """Validate Money constraints."""
        if self.amount < 0:
            raise ValueError("Money amount cannot be negative")

        if not self.currency:
            raise ValueError("Currency cannot be empty")

        if len(self.currency) != 3:
            raise ValueError(f"Currency must be 3-character ISO code, got '{self.currency}'")

        if not self.currency.isupper():
            raise ValueError(f"Currency must be uppercase, got '{self.currency}'")

        # Validate it's a reasonable currency code format
        if not re.match(r'^[A-Z]{3}$', self.currency):
            raise ValueError(f"Currency must be 3 uppercase letters, got '{self.currency}'")

    def get_equality_components(self) -> Iterator[Any]:
        """Return components for structural equality."""
        yield self.amount
        yield self.currency

    def add(self, other: 'Money') -> 'Money':
        """Add two Money values (same currency required)."""
        if self.currency != other.currency:
            raise ValueError(f"Cannot add different currencies: {self.currency} + {other.currency}")
        return Money(self.amount + other.amount, self.currency)

    def subtract(self, other: 'Money') -> 'Money':
        """Subtract two Money values (same currency required)."""
        if self.currency != other.currency:
            raise ValueError(f"Cannot subtract different currencies: {self.currency} - {other.currency}")
        result_amount = self.amount - other.amount
        if result_amount < 0:
            raise ValueError("Money subtraction cannot result in negative amount")
        return Money(result_amount, self.currency)

    def multiply(self, factor: Decimal) -> 'Money':
        """Multiply Money by a factor."""
        if factor < 0:
            raise ValueError("Cannot multiply money by negative factor")
        return Money(self.amount * factor, self.currency)

    def divide(self, divisor: Decimal) -> 'Money':
        """Divide Money by a divisor."""
        if divisor <= 0:
            raise ValueError("Cannot divide money by zero or negative divisor")
        return Money(self.amount / divisor, self.currency)

    def is_zero(self) -> bool:
        """Check if amount is zero."""
        return self.amount == 0

    def is_positive(self) -> bool:
        """Check if amount is positive."""
        return self.amount > 0

    @classmethod
    def zero(cls, currency: str) -> 'Money':
        """Create zero money in specified currency."""
        return cls(Decimal('0'), currency)

    @classmethod
    def usd(cls, amount: str | float | Decimal) -> 'Money':
        """Create Money in USD."""
        return cls(Decimal(str(amount)), 'USD')

    @classmethod
    def eur(cls, amount: str | float | Decimal) -> 'Money':
        """Create Money in EUR."""
        return cls(Decimal(str(amount)), 'EUR')

    @classmethod
    def gbp(cls, amount: str | float | Decimal) -> 'Money':
        """Create Money in GBP."""
        return cls(Decimal(str(amount)), 'GBP')

    def __str__(self) -> str:
        """String representation of Money."""
        return f"{self.amount} {self.currency}"

    def __repr__(self) -> str:
        """Developer representation of Money."""
        return f"Money(amount={self.amount}, currency='{self.currency}')"


@dataclass(frozen=True, eq=False)
class Address(ValueObject):
    """Example Address value object."""

    street: str
    city: str
    state: str
    postal_code: str
    country: str

    def __post_init__(self) -> None:
        """Validate Address constraints."""
        if not self.street or not self.street.strip():
            raise ValueError("Street cannot be empty")

        if not self.city or not self.city.strip():
            raise ValueError("City cannot be empty")

        if not self.state or not self.state.strip():
            raise ValueError("State cannot be empty")

        if not self.postal_code or not self.postal_code.strip():
            raise ValueError("Postal code cannot be empty")

        if not self.country or not self.country.strip():
            raise ValueError("Country cannot be empty")

        # Basic postal code validation for common formats
        if self.country.upper() in ['US', 'USA']:
            if not re.match(r'^\d{5}(-\d{4})?$', self.postal_code):
                raise ValueError(f"Invalid US postal code format: {self.postal_code}")

        if self.country.upper() in ['CA', 'CAN']:
            if not re.match(r'^[A-Z]\d[A-Z] \d[A-Z]\d$', self.postal_code.upper()):
                raise ValueError(f"Invalid Canadian postal code format: {self.postal_code}")

    def get_equality_components(self) -> Iterator[Any]:
        """Return components for structural equality."""
        yield self.street.strip().lower()
        yield self.city.strip().lower()
        yield self.state.strip().lower()
        yield self.postal_code.strip().upper()
        yield self.country.strip().upper()

    def get_formatted_address(self) -> str:
        """Get formatted multi-line address."""
        return f"""{self.street}
{self.city}, {self.state} {self.postal_code}
{self.country}"""

    def get_single_line_address(self) -> str:
        """Get single-line address."""
        return f"{self.street}, {self.city}, {self.state} {self.postal_code}, {self.country}"

    def is_same_country(self, other: 'Address') -> bool:
        """Check if two addresses are in the same country."""
        return self.country.strip().upper() == other.country.strip().upper()

    def is_same_city(self, other: 'Address') -> bool:
        """Check if two addresses are in the same city."""
        return (self.city.strip().lower() == other.city.strip().lower() and
                self.state.strip().lower() == other.state.strip().lower() and
                self.country.strip().upper() == other.country.strip().upper())

    @classmethod
    def create_us_address(cls, street: str, city: str, state: str, zip_code: str) -> 'Address':
        """Create US address with validation."""
        return cls(street, city, state, zip_code, 'US')

    @classmethod
    def create_canadian_address(cls, street: str, city: str, province: str, postal_code: str) -> 'Address':
        """Create Canadian address with validation."""
        return cls(street, city, province, postal_code, 'CA')

    def __str__(self) -> str:
        """String representation of Address."""
        return self.get_single_line_address()

    def __repr__(self) -> str:
        """Developer representation of Address."""
        return f"Address(street='{self.street}', city='{self.city}', state='{self.state}', postal_code='{self.postal_code}', country='{self.country}')"


@dataclass(frozen=True, eq=False)
class PersonName(ValueObject):
    """Example PersonName value object."""

    first_name: str
    last_name: str
    middle_name: Optional[str] = None

    def __post_init__(self) -> None:
        """Validate PersonName constraints."""
        if not self.first_name or not self.first_name.strip():
            raise ValueError("First name cannot be empty")

        if not self.last_name or not self.last_name.strip():
            raise ValueError("Last name cannot be empty")

        if len(self.first_name.strip()) < 1:
            raise ValueError("First name must be at least 1 character")

        if len(self.last_name.strip()) < 1:
            raise ValueError("Last name must be at least 1 character")

        if self.middle_name is not None and len(self.middle_name.strip()) == 0:
            raise ValueError("Middle name cannot be empty string (use None instead)")

    def get_equality_components(self) -> Iterator[Any]:
        """Return components for structural equality."""
        yield self.first_name.strip().lower()
        yield self.last_name.strip().lower()
        yield self.middle_name.strip().lower() if self.middle_name else None

    def get_full_name(self) -> str:
        """Get full name formatted."""
        if self.middle_name:
            return f"{self.first_name} {self.middle_name} {self.last_name}"
        return f"{self.first_name} {self.last_name}"

    def get_last_first_format(self) -> str:
        """Get name in 'Last, First' format."""
        if self.middle_name:
            return f"{self.last_name}, {self.first_name} {self.middle_name}"
        return f"{self.last_name}, {self.first_name}"

    def get_initials(self) -> str:
        """Get initials (first letters of each name part)."""
        initials = f"{self.first_name[0]}{self.last_name[0]}"
        if self.middle_name:
            initials = f"{self.first_name[0]}{self.middle_name[0]}{self.last_name[0]}"
        return initials.upper()

    def __str__(self) -> str:
        """String representation of PersonName."""
        return self.get_full_name()

    def __repr__(self) -> str:
        """Developer representation of PersonName."""
        return f"PersonName(first_name='{self.first_name}', last_name='{self.last_name}', middle_name={repr(self.middle_name)})"


@dataclass(frozen=True, eq=False)
class Quantity(ValueObject):
    """Example Quantity value object for order lines."""

    value: int
    unit: str = "pieces"

    def __post_init__(self) -> None:
        """Validate Quantity constraints."""
        if self.value < 0:
            raise ValueError("Quantity cannot be negative")

        if self.value == 0:
            raise ValueError("Quantity cannot be zero")

        if not self.unit or not self.unit.strip():
            raise ValueError("Unit cannot be empty")

    def get_equality_components(self) -> Iterator[Any]:
        """Return components for structural equality."""
        yield self.value
        yield self.unit.strip().lower()

    def add(self, other: 'Quantity') -> 'Quantity':
        """Add two quantities (same unit required)."""
        if self.unit.strip().lower() != other.unit.strip().lower():
            raise ValueError(f"Cannot add different units: {self.unit} + {other.unit}")
        return Quantity(self.value + other.value, self.unit)

    def subtract(self, other: 'Quantity') -> 'Quantity':
        """Subtract two quantities (same unit required)."""
        if self.unit.strip().lower() != other.unit.strip().lower():
            raise ValueError(f"Cannot subtract different units: {self.unit} - {other.unit}")
        result_value = self.value - other.value
        if result_value <= 0:
            raise ValueError("Quantity subtraction must result in positive value")
        return Quantity(result_value, self.unit)

    def multiply(self, factor: int) -> 'Quantity':
        """Multiply quantity by a factor."""
        if factor <= 0:
            raise ValueError("Cannot multiply quantity by zero or negative factor")
        return Quantity(self.value * factor, self.unit)

    def is_single(self) -> bool:
        """Check if quantity is exactly one."""
        return self.value == 1

    @classmethod
    def pieces(cls, value: int) -> 'Quantity':
        """Create quantity in pieces."""
        return cls(value, "pieces")

    @classmethod
    def kilograms(cls, value: int) -> 'Quantity':
        """Create quantity in kilograms."""
        return cls(value, "kg")

    @classmethod
    def liters(cls, value: int) -> 'Quantity':
        """Create quantity in liters."""
        return cls(value, "L")

    def __str__(self) -> str:
        """String representation of Quantity."""
        return f"{self.value} {self.unit}"

    def __repr__(self) -> str:
        """Developer representation of Quantity."""
        return f"Quantity(value={self.value}, unit='{self.unit}')"