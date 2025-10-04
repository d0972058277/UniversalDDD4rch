"""Pytest configuration and fixtures for CQRS tests."""

import pytest
import sys
from pathlib import Path

# Add src directory to path for imports
src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))


@pytest.fixture
def sample_command():
    """Create a sample command for testing."""
    class SampleCommand:
        def __init__(self, value: str):
            self.value = value

    return SampleCommand("test")


@pytest.fixture
def sample_query():
    """Create a sample query for testing."""
    class SampleQuery:
        def __init__(self, query_id: str):
            self.query_id = query_id

    return SampleQuery("test-123")
