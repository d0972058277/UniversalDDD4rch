# Testing Guide

## 🎯 Quick Start

The simplest way to run tests:

```bash
# Run ALL tests (318 tests) - works out of the box! ✨
pytest

# That's it! The project is pre-configured.
```

## 📊 Test Results

When you run `pytest`, you'll see:

```
============================= test session starts ==============================
...
318 passed, 6 warnings in 1.65s
```

## 🔧 How It Works

### The Magic: `pyproject.toml` Configuration

The root `pyproject.toml` contains:

```toml
[tool.pytest.ini_options]
pythonpath = [
    "architecture-core/src",      # Core package sources
    "architecture-django/src",    # Django integration sources  
    "architecture-shell-cqrs/src", # CQRS sources
    ".",                          # Examples directory
]
```

This means **you don't need to set PYTHONPATH manually** - pytest automatically finds all the packages!

## 📋 Test Commands

### Basic Commands

```bash
pytest              # Run all tests (318)
pytest -v           # Verbose output
pytest -q           # Quiet output
pytest --cov        # With coverage report
```

### By Test Type (using markers)

```bash
pytest -m contract      # Contract tests (113 tests)
pytest -m unit          # Unit tests  
pytest -m integration   # Integration tests
pytest -m performance   # Performance tests
```

### By Package

```bash
pytest architecture-core/tests/           # Core package (253 tests)
pytest architecture-django/tests/         # Django integration
pytest architecture-shell-cqrs/tests/     # CQRS mediator
```

### Specific Test Suites

```bash
pytest architecture-core/tests/contracts/  # All contract tests
pytest architecture-core/tests/unit/       # All unit tests
pytest architecture-core/tests/properties/ # Monadic law tests
```

## 🎬 Helper Scripts

For convenience, we also provide shell scripts:

```bash
./test-all.sh           # Comprehensive test with summary
./run-tests.sh          # Run all tests
./run-tests.sh contract # Contract tests only
./run-tests.sh unit     # Unit tests only
./run-tests.sh core     # Core package only
./run-tests.sh coverage # With HTML coverage report
```

## 📦 Package-Specific Testing

### Architecture.Core (253 tests)

```bash
cd architecture-core
pytest  # Works because parent pyproject.toml is discovered
```

### Architecture.Django

```bash
cd architecture-django
pytest  # Requires Django settings for some tests
```

### Architecture.Shell.Cqrs

```bash
cd architecture-shell-cqrs
pytest
```

## 🐛 Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'architecture_core'"

**Solution**: Make sure you're running pytest from the **root directory** (`python-django/`), not from inside a package directory.

```bash
# ✅ Correct
cd /path/to/python-django
pytest

# ❌ Wrong  
cd /path/to/python-django/architecture-core
pytest tests/  # This won't find the pythonpath config
```

### Issue: Django import errors

**Solution**: Some tests require Django settings. These are automatically excluded by default. To run them, configure Django first.

## 📈 Coverage Reports

```bash
# Terminal coverage report
pytest --cov

# HTML coverage report (opens in browser)
pytest --cov --cov-report=html
open htmlcov/index.html

# Or use the script
./run-tests.sh coverage
```

## 🎯 Test Categories

Our tests are organized into:

1. **Contract Tests** (`-m contract`)
   - 113 tests validating API contracts
   - Ensure consistency across language implementations
   - Test: Result, Maybe, Entity, ValueObject, etc.

2. **Unit Tests** (`-m unit`)
   - Edge cases and specific behaviors
   - ValueObject equality, aggregate events, etc.

3. **Properties Tests**
   - Monadic laws (Left Identity, Right Identity, Associativity)
   - Functional programming guarantees

4. **Integration Tests** (`-m integration`)
   - Repository operations
   - Django ORM integration
   - Full lifecycle tests

5. **Performance Tests** (`-m performance`)
   - Benchmark tests
   - Memory usage tests
   - Requires specific setup (excluded by default)

## ✅ Pre-Commit Checks

Before committing, ensure:

```bash
# All tests pass
pytest

# Code is formatted
black .
isort .

# Type checking passes
mypy architecture-core/src
```

---

**TL;DR**: Just run `pytest` from the root directory! 🚀
