# Claude Code Context: Universal DDD Architecture

## Project Overview
Universal DDD Architecture providing core abstractions and functional types for domain-driven development across multiple languages (C#, Java, Python, Go, TypeScript). Currently implementing Architecture.Core for .NET 8 LTS.

## Current Technology Stack
- **C# .NET 8 LTS** (primary implementation)
- **Pure BCL** (no external runtime dependencies)
- **xUnit/NUnit** for testing
- **Optional integrations**: MediatR, Entity Framework, FluentValidation

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
- `ValueObject`: Structural equality via GetEqualityComponents()
- `IDomainEvent/DomainEventBase`: Correlation/causation tracking, metadata
- `IRepository<TAggregate, TId>`: Async operations with cancellation

### Functional Types
- `Result/Result<T>`: Monadic error handling with Map/Bind/Match
- `Error`: Categorized errors (Domain/Validation/Infrastructure/Concurrency/Security)
- `Maybe<T>`: Optional values with HasValue/Map/Bind/OrElse

## Recent Changes
1. **2025-09-21**: Architecture.Core specification completed
2. **2025-09-21**: Research phase completed for .NET 8 LTS implementation
3. **2025-09-21**: Data model and contracts defined
4. **2025-09-21**: Quickstart guide created with example domain

## Implementation Status
- [x] Feature specification (001-architecture-core-ddd)
- [x] Research phase (BCL patterns, monadic types, performance)
- [x] Data model design
- [x] API contracts definition
- [x] Quickstart documentation
- [ ] Task generation (/tasks command next)
- [ ] Core implementation (TDD approach)
- [ ] Comprehensive test suite
- [ ] Performance validation

## File Structure
```
specs/001-architecture-core-ddd/
├── spec.md              # Feature requirements
├── plan.md              # Implementation plan
├── research.md          # Technology decisions
├── data-model.md        # Type definitions
├── quickstart.md        # Usage examples
├── contracts/           # API contracts
└── tasks.md             # Generated tasks (pending)

src/Architecture.Core/   # Implementation (TBD)
tests/                   # Test suite (TBD)
```

## Key Quality Gates
- Zero external runtime dependencies (BCL only)
- TDD with Given-When-Then structure
- Monadic laws compliance (Left Identity/Right Identity/Associativity)
- ValueObject equality handling (multi-field, collections, nulls)
- Repository async/cancellation patterns
- Cross-language consistency validation

## Immediate Next Steps
1. Execute `/tasks` command to generate implementation tasks
2. Implement core types following TDD principles
3. Validate monadic laws with comprehensive tests
4. Performance benchmarking for equality operations
5. Integration with optional frameworks (MediatR, EF)

## Configuration Commands
- `/plan Architecture.Core`: Create implementation plan
- `/tasks`: Generate detailed implementation tasks
- `dotnet test`: Run test suite (when implemented)
- `dotnet build --configuration Release`: Production build

## Performance Targets
- Minimal allocations for Result/Maybe types (struct-based)
- Optimized ValueObject equality (reflection caching)
- Efficient aggregate event collection (List<T> with ReadOnlyCollection wrapper)
- Async/await best practices with ConfigureAwait(false)

---
*Last updated: 2025-09-21 | Architecture.Core v1.0 implementation phase*