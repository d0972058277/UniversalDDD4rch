# Claude Code Context: Universal DDD Architecture

## Project Overview
Universal DDD Architecture providing core abstractions and functional types for domain-driven development across multiple languages (C#, Java, Python, Go, TypeScript). Currently implementing Architecture.Core for TypeScript Node.js and .NET 8 LTS.

## Current Technology Stack
- **TypeScript 5.9+ with Node.js 22 LTS** (primary implementation)
- **Pure Node.js standard library** (no external runtime dependencies)
- **Jest** for testing
- **Optional integrations**: Express.js, TypeORM, class-validator

## Architecture Principles
- **Domain-Driven Design** with explicit layer separation
- **CQRS** for command/query responsibility segregation
- **Test-Driven Development** (mandatory, Should_ExpectedBehavior_When_StateUnderTest naming)
- **Functional Programming** (Result/Maybe monads, no exceptions for business logic)
- **Multi-Language Consistency** across all implementations

## Key Components Currently Implementing

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
2. **2025-09-21**: Research phase completed for TypeScript Node.js implementation
3. **2025-09-21**: Data model design for TypeScript completed
4. **2025-09-21**: API contracts definition for TypeScript completed
5. **2025-09-21**: Quickstart documentation for TypeScript completed

## Implementation Status
- [x] Feature specification (001-architecture-core-ddd)
- [x] Research phase (TypeScript patterns, monadic types, performance)
- [x] Data model design (TypeScript)
- [x] API contracts definition (TypeScript)
- [x] Quickstart documentation (TypeScript)
- [ ] Task generation (/tasks command next)
- [ ] Core implementation (TDD approach)
- [ ] Comprehensive test suite
- [ ] Performance validation

## File Structure
```
specs/001-architecture-core-ddd/
├── spec.md                      # Feature requirements
├── plan.md                      # Implementation plan
├── research-typescript.md       # TypeScript technology decisions
├── data-model-typescript.md     # TypeScript type definitions
├── quickstart-typescript.md     # TypeScript usage examples
├── contracts-typescript/        # TypeScript API contracts
│   └── core-types-contract.ts
└── tasks.md                     # Generated tasks (pending)

typescript-nodejs/               # TypeScript implementation (TBD)
├── src/
├── tests/
└── package.json
```

## Key Quality Gates
- Zero external runtime dependencies (Node.js standard library only)
- TDD with Given-When-Then structure
- Monadic laws compliance (Left Identity/Right Identity/Associativity)
- ValueObject equality handling (multi-field, collections, nulls)
- Repository async/cancellation patterns with AbortSignal
- Cross-language consistency validation

## Immediate Next Steps
1. Execute `/tasks` command to generate implementation tasks
2. Implement core types following TDD principles
3. Validate monadic laws with comprehensive tests
4. Performance benchmarking for equality operations
5. Integration with optional frameworks (Express.js, TypeORM)

## Configuration Commands
- `/plan Architecture.Core`: Create implementation plan
- `/tasks`: Generate detailed implementation tasks
- `npm test`: Run test suite (when implemented)
- `npm run build`: Production build

## Performance Targets
- Minimal allocations for Result/Maybe types (class-based with optimization)
- Optimized ValueObject equality (caching hash codes)
- Efficient aggregate event collection (Array with ReadonlyArray wrapper)
- Async/await best practices with AbortSignal support

---
*Last updated: 2025-09-21 | Architecture.Core v1.0 TypeScript implementation phase*