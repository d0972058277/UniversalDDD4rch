# Testing Guide - Go Implementation

## Quick Start

### Run All Tests (One Command)

```bash
# Using the test script (recommended)
./test-all.sh

# Or from any directory
bash /path/to/golang/test-all.sh
```

## Test Commands

### All Modules

```bash
# Run all tests across all modules
./test-all.sh

# Or using workspace
go test ./...
```

### Module-Specific Tests

```bash
# Architecture Core tests
cd architecture-core
go test -v ./tests/...

# CQRS tests (when implemented)
cd architecture-shell-cqrs
go test -v ./tests/...

# GORM tests
cd architecture-gorm
go test -v ./...
```

### Test Types

```bash
# Contract tests only (architecture-core)
cd architecture-core
go test -v ./tests/contract/...

# Unit tests only
go test -v ./tests/unit/...

# Integration tests only
go test -v ./tests/integration/...

# Performance benchmarks
go test -bench=. ./tests/performance/...
```

### With Race Detection

```bash
# Detect race conditions
go test -race ./...

# Per module
cd architecture-core
go test -race -v ./tests/...
```

### With Coverage

```bash
# Generate coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# View coverage in terminal
go test -cover ./...
```

## Test Output

### test-all.sh Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧪 Running Tests for All Modules
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Module: architecture-core
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[contract tests pass]
[unit tests pass]
[integration tests pass]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Module: architecture-shell-cqrs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏳ No tests yet (module in development)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Module: architecture-gorm
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏳ No tests yet

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All module tests complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Test Structure

### architecture-core/tests/

```
tests/
├── contract/          # Cross-language API contract tests
│   ├── aggregate_root_contract_test.go
│   ├── entity_contract_test.go
│   ├── value_object_contract_test.go
│   ├── domain_event_contract_test.go
│   ├── repository_contract_test.go
│   ├── result_contract_test.go
│   ├── maybe_contract_test.go
│   └── error_contract_test.go
│
├── unit/              # Unit tests for individual components
│   ├── aggregate_test.go
│   ├── result_test.go
│   └── maybe_test.go
│
├── integration/       # End-to-end integration tests
│   └── aggregate_scenarios_test.go
│
└── performance/       # Benchmark tests
    └── benchmarks_test.go
```

### architecture-shell-cqrs/tests/

```
tests/
├── unit/              # Unit tests for CQRS components
├── integration/       # Integration tests with behaviors
└── performance/       # CQRS performance benchmarks
```

## Test Naming Convention

All tests follow the pattern:
```
TestX_Should_ExpectedBehavior_When_StateUnderTest
```

Example:
```go
func TestResult_Should_ReturnValue_When_Success(t *testing.T) {
    // Given
    result := functional.Ok("test")

    // When
    value := result.Value()

    // Then
    if value != "test" {
        t.Error("Expected 'test', got:", value)
    }
}
```

## Test Categories

### Contract Tests ✅
- Verify cross-language API consistency
- Validate monadic laws (Left Identity, Right Identity, Associativity)
- Test interface compliance

**Status**: 12/12 passing in architecture-core

### Unit Tests ✅
- Test individual components in isolation
- Fast execution
- No external dependencies

**Status**: Passing in architecture-core

### Integration Tests ⚠️
- Test component interactions
- Realistic scenarios
- May require some setup

**Status**: Some passing (examples folder dependency issue)

### Performance Tests ⏳
- Benchmark critical paths
- Measure allocations
- Identify bottlenecks

**Status**: To be implemented

## Continuous Integration

### Local CI Simulation

```bash
# Full CI pipeline
./test-all.sh
go vet ./...
gofmt -l .
```

### Coverage Requirements

- **architecture-core**: 100% contract test coverage ✅
- **architecture-shell-cqrs**: TBD (in development)
- **architecture-gorm**: TBD

## Troubleshooting

### Issue: "no required module provides package..."

**Solution**: Run `go work sync` to update workspace dependencies

```bash
go work sync
```

### Issue: Tests fail with race detector

**Solution**: This indicates a concurrency issue. Review the failing test with:

```bash
go test -race -v ./path/to/failing/test
```

### Issue: Integration tests fail

**Solution**: Check if examples folder is accessible:

```bash
cd architecture-core
ls -la examples/
```

## Future Enhancements

- [ ] Add contract tests for architecture-shell-cqrs
- [ ] Implement performance benchmarks
- [ ] Add mutation testing
- [ ] Set up automated CI/CD pipeline
- [ ] Add test coverage badges

---

**Last Updated**: 2025-10-04
**Test Framework**: Go native `testing` package
**Coverage Tool**: `go tool cover`
