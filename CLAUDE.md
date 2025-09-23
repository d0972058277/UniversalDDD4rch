# Claude Code Context: Universal DDD Architecture

## Project Overview
Universal DDD Architecture providing core abstractions and functional types for domain-driven development across multiple languages (C#, Java, Python, Go, TypeScript). Multi-language implementations with consistent DDD patterns and functional programming principles.

## Current Technology Stack
- **C# .NET 8 LTS** (C# implementation - complete with 100% test coverage)
- **Java 21/25 LTS with Spring Boot** (Java implementation - planning complete, ready for implementation)
- **Go 1.21+ with pure standard library** (Go implementation - planning complete)
- **TypeScript 5.9+ with Node.js 22 LTS** (TypeScript implementation - complete)
- **Pure standard libraries** (no external runtime dependencies for core)
- **Optional integrations**:
  - C#: MediatR, Entity Framework, FluentValidation
  - Java: Spring Boot, Spring Data JPA, Spring Security, JUnit 5
  - Go: chi/gin, GORM, testify
  - TypeScript: Express.js, TypeORM, class-validator

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
1. **2025-09-23**: Multi-language consistency v2.0 specification and planning completed
2. **2025-09-21**: Architecture.Core specification completed
3. **2025-09-21**: TypeScript implementation completed (100% test success)
4. **2025-09-21**: Go implementation completed

## Implementation Status

| Language | Status | Test Coverage | Key Features |
|----------|--------|---------------|--------------|
| **C# .NET** | ✅ Complete | 100% | Production ready, Entity Framework, MediatR |
| **Go** | ✅ Complete | 100% | Zero allocations, performance optimized |
| **TypeScript** | ✅ Complete | 573 tests passing | Node.js 22 LTS, Promise-based |
| **Java Spring** | 🔄 Planning Complete | Ready for implementation | Spring Boot integration planned |
| **Python Django** | ✅ Complete | Full coverage | Django integration available |

## Project Structure
```
specs/
├── 001-architecture-core-ddd/       # Core DDD implementation specs
├── 002-universal-ddd-architecture/  # Multi-language consistency v2.0
csharp-dotnet/                        # C# .NET implementation (complete)
golang/                               # Go implementation (complete)
java-spring/                          # Java implementation (planning complete)
python-django/                       # Python implementation (complete)
typescript-nodejs/                    # TypeScript implementation (complete)
```

## Key Quality Gates
- Zero external runtime dependencies (pure standard libraries)
- TDD with Given-When-Then structure
- Monadic laws compliance (Left Identity/Right Identity/Associativity)
- ValueObject equality handling (multi-field, collections, nulls)
- Repository async/cancellation patterns
- Cross-language consistency validation

## Current Focus
- **Multi-language consistency v2.0**: API alignment across all 5 languages (Priority 1)
- **Java Spring implementation**: Ready for `/tasks` command execution
- **Package architecture**: Core/integration separation across all languages

## Key Commands
- `/plan`: Create implementation plan for new features
- `/tasks`: Generate detailed implementation tasks
- Language-specific build/test commands available in respective implementation directories

---
*Last updated: 2025-09-23 | Multi-language consistency v2.0 specification completed*
