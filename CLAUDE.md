# Claude Code Context: Universal DDD Architecture

## Project Overview
Universal DDD Architecture providing core abstractions and functional types for domain-driven development across multiple languages (C#, Java, Python, Go, TypeScript). Currently implementing Architecture.Core for Go and TypeScript Node.js.

## Current Technology Stack
- **Go 1.21+ with pure standard library** (Go implementation - planning complete)
- **TypeScript 5.9+ with Node.js 22 LTS** (TypeScript implementation - complete)
- **Pure standard libraries** (no external runtime dependencies for core)
- **Optional integrations**: chi/gin, GORM, testify (Go); Express.js, TypeORM, class-validator (TypeScript)

## Architecture Principles
- **Domain-Driven Design** with explicit layer separation
- **CQRS** for command/query responsibility segregation
- **Test-Driven Development** (mandatory, Should_ExpectedBehavior_When_StateUnderTest naming)
- **Functional Programming** (Result/Maybe monads, no exceptions for business logic)
- **Multi-Language Consistency** across all implementations

## Key Components

### DDD Abstractions
- `AggregateRoot<TId>`: Version control, event collection, business invariants
- `Entity<TId>`: Identity-based equality, generic constraints
- `ValueObject`: Structural equality via getEqualityComponents()
- `IDomainEvent/DomainEventBase`: Correlation/causation tracking, metadata
- `IRepository<TAggregate, TId>`: Async operations with cancellation

### Functional Types
- `Result/Result<T>`: Monadic error handling with map/bind/match
- `Error`: Categorized errors (Domain/Validation/Infrastructure/Concurrency/Security)
- `Maybe<T>`: Optional values with hasValue/map/bind/orElse

## Recent Changes
1. **2025-09-21**: Architecture.Core specification completed
2. **2025-09-21**: Go implementation plan and tasks generated (50 tasks ready)
3. **2025-09-21**: TypeScript implementation completed (100% test success)
4. **2025-09-21**: Go research, data model, contracts, and quickstart completed

## Implementation Status

### Go Implementation
- [x] Feature specification (001-architecture-core-ddd)
- [x] Research phase (Go generics, zero allocations, error patterns)
- [x] Data model design (Go with generics)
- [x] API contracts definition (Go interfaces)
- [x] Quickstart documentation (Go examples)
- [x] Task generation (50 tasks ready for execution)
- [ ] Core implementation (TDD approach)
- [ ] Comprehensive test suite
- [ ] Performance validation

### TypeScript Implementation
- [x] Complete implementation with 100% test success rate
- [x] All 573 tests passing
- [x] Production ready

## File Structure
```
specs/001-architecture-core-ddd/
├── spec.md                      # Feature requirements
├── plan.md                      # Implementation plan
├── research.md                  # Go technology decisions
├── data-model-go.md             # Go type definitions
├── quickstart-go.md             # Go usage examples
├── contracts/                   # Go API contracts
│   └── core-types-contract.go
└── tasks.md                     # Generated tasks (50 tasks ready)

golang/                          # Go implementation (ready for implementation)
├── pkg/
│   ├── domain/                  # Domain abstractions
│   └── functional/              # Functional types
├── examples/                    # Usage examples
├── internal/                    # Internal utilities
└── tests/                       # Test suites

typescript-nodejs/               # TypeScript implementation (complete)
├── src/                         # Core implementation
├── tests/                       # Test suites (573 tests)
├── examples/                    # Usage examples
└── package.json                 # Configuration
```

## Key Quality Gates
- Zero external runtime dependencies (pure standard libraries)
- TDD with Given-When-Then structure
- Monadic laws compliance (Left Identity/Right Identity/Associativity)
- ValueObject equality handling (multi-field, collections, nulls)
- Repository async/cancellation patterns
- Cross-language consistency validation

## Go Implementation Details

### Technical Approach
- **Go 1.21+ generics** with type constraints for type safety
- **Value types** for Result/Maybe to minimize allocations
- **Explicit error handling** following Go idioms
- **Small interfaces** with dependency inversion
- **Table-driven tests** with Given-When-Then structure

### Performance Goals
- Zero-allocation patterns for functional types
- Stack allocation for small types
- Minimal GC pressure
- Optimized equality operations

## Immediate Next Steps (Go)
1. Begin task execution starting with T001 (project setup)
2. Write failing tests first (T005-T020) before implementation
3. Implement functional types (T021-T023) then domain types (T024-T028)
4. Create quickstart examples (T029-T032)
5. Performance validation and benchmarking

## Configuration Commands
- `/plan Architecture.Core`: Create implementation plan ✅
- `/tasks`: Generate detailed implementation tasks ✅
- `go test ./...`: Run Go test suite (when implemented)
- `go test -bench=.`: Run Go benchmarks
- `npm test`: Run TypeScript test suite ✅

## Performance Targets (Go)
- Zero allocations for Result/Maybe operations
- Sub-nanosecond equality comparisons
- Efficient event collection with slice reuse
- Context-aware async patterns

---
*Last updated: 2025-09-21 | Architecture.Core Go v1.0 planning complete, ready for implementation*