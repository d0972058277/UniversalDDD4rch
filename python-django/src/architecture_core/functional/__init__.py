"""
Functional programming types for error handling and optional values.

This module provides monadic types for functional programming patterns:
- Result: Success/failure result type with monadic operations
- Maybe: Optional value type with safe navigation
- Error: Structured error information with categorization
"""

from architecture_core.functional.error import Error, ErrorCategory
from architecture_core.functional.result import Result
from architecture_core.functional.maybe import Maybe

__all__ = [
    "Result",
    "Maybe",
    "Error",
    "ErrorCategory",
]