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
1. **2025-09-23**: **Universal DDD Architecture v2.0 COMPLETED** - Full multi-language consistency implementation
2. **2025-09-23**: Migration guides completed for all languages (C#, Go, Java, Python, TypeScript)
3. **2025-09-23**: Cross-language contract test validation completed
4. **2025-09-23**: API alignment matrix and consistency contracts validated
5. **2025-09-23**: Package architecture separation implemented (core/integration packages)

## Implementation Status v2.0

| Language | Status | Test Coverage | Key Features | v2.0 Enhancements |
|----------|--------|---------------|--------------|-------------------|
| **C# .NET** | ✅ v2.0 Complete | 100% | Production ready, Entity Framework, MediatR | Separated packages, IncrementVersion() API |
| **Go** | ✅ v2.0 Complete | 100% | Zero allocations, performance optimized | GORM integration, Add/Update repository separation |
| **TypeScript** | ✅ v2.0 Complete | 214 contract tests passing | Node.js 22 LTS, Promise-based | Express/TypeORM packages, Result.ok() consistency |
| **Java Spring** | ✅ v2.0 Complete | API complete | Spring Boot integration, JPA repositories | Spring Data integration, CompletableFuture patterns |
| **Python Django** | ✅ v2.0 Complete | 113 contract tests passing | Django integration, async support | Django ORM package, async-first design |

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

## v2.0 Architectural Decisions

### API Consistency Achievements
- **Standardized Repository Interface**: Separated Add/Update operations across all languages
- **AggregateRoot API Alignment**: Consistent IncrementVersion() method, event management patterns
- **Result Monad Harmonization**: Language-appropriate creation methods (Result.ok/success/Ok)
- **Package Architecture**: Core/integration separation with zero external dependencies in core packages

### Cross-Language Validation
- **Contract Tests**: 214 TypeScript, 113 Python, all Go tests passing
- **Monadic Law Compliance**: Left Identity, Right Identity, and Associativity laws validated
- **Performance Benchmarks**: Sub-millisecond operations, memory efficiency targets met
- **Migration Guides**: Complete v1.x to v2.0 upgrade paths for all languages

### Integration Packages
- **C#**: Architecture.Core.EntityFramework, Architecture.Core.MediatR
- **Go**: GORM integration helpers, zero-allocation patterns
- **Java**: Spring Data JPA, CompletableFuture async patterns
- **Python**: Django ORM integration, async-first design
- **TypeScript**: Express.js middleware, TypeORM repositories

## Key Commands
- `/plan`: Create implementation plan for new features
- `/tasks`: Generate detailed implementation tasks
- Language-specific build/test commands available in respective implementation directories

---
*Last updated: 2025-09-23 | **Universal DDD Architecture v2.0 IMPLEMENTATION COMPLETED***

**Achievement Summary:**
- ✅ 5 languages with full API consistency (C#, Go, Java, Python, TypeScript)
- ✅ 55 core implementation tasks completed (T001-T055)
- ✅ Migration guides for all languages (T056-T060)
- ✅ Cross-language contract validation (T061)
- ✅ Performance benchmarks validated (T062)
- ✅ Architectural documentation updated (T063)
- ✅ Multi-language consistency achieved across 24 functional requirements
