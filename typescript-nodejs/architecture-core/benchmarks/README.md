# Performance Benchmarks

This directory contains **manual profiling tools** for analyzing memory usage and performance characteristics. These are **NOT** automated tests and should **NOT** be run in CI/CD pipelines.

## Important Notes

⚠️ **These are profiling tools, not tests**
- Results vary based on Node.js version, hardware, and system load
- Do not use for automated testing or assertions
- Use for development analysis and optimization guidance only

## Memory Profiling

### Prerequisites

The memory profiling tool requires the `--expose-gc` flag to force garbage collection:

```bash
node --expose-gc --require ts-node/register benchmarks/memory-profiling.ts
```

### What It Measures

- Memory growth patterns for Result/Maybe types
- ValueObject memory footprint
- AggregateRoot memory usage with events
- Long-running memory stability

### Expected Output

```
=== Result Type Memory Profile ===
Iterations: 100000
Memory growth: 15.23 MB
Per operation: 152 bytes

=== Maybe Type Memory Profile ===
Iterations: 100000
Memory growth: 12.45 MB
Per operation: 124 bytes

...
```

### Interpreting Results

- **Memory growth** is approximate and affected by V8's heap management
- **Per operation** values include GC overhead and object allocation
- Use trends over time rather than absolute values
- Compare relative changes between versions

## Why Not Automated Tests?

1. **Hardware Dependency**: Performance metrics depend on CPU speed, available memory, and system load
2. **Non-Deterministic**: V8's garbage collector behavior varies between runs
3. **Node.js Version Differences**: Memory management changed significantly between v22 and v24
4. **CI Variability**: Shared CI runners have unpredictable performance characteristics

## Correctness Tests

For automated testing, see:
- `tests/performance/hash-performance.test.ts` - Hash code correctness (not speed)
- `tests/performance/memory-tests.test.ts` - Memory usage correctness (not consumption)

These tests verify **behavior** rather than **performance**.
