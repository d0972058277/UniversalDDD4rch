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
- 001-architecture-core-ddd: Added Java 21 LTS (free until September 2026) or Java 25 LTS (free until September 2028) + Pure JDK implementation (no external runtime dependencies for core); Optional integration packages: Spring Boot, Spring Data JPA, Spring Security, JUnit 5
- 001-architecture-core-ddd: Added Java 21 LTS (free until September 2026) or Java 25 LTS (free until September 2028) + Pure JDK implementation (no external runtime dependencies for core); Optional integration packages: Spring Boot, Spring Data JPA, Spring Security, JUnit 5
1. **2025-09-21**: Architecture.Core specification completed
2. **2025-09-21**: Go implementation plan and tasks generated (50 tasks ready)
3. **2025-09-21**: TypeScript implementation completed (100% test success)
4. **2025-09-21**: Go research, data model, contracts, and quickstart completed

## Implementation Status

### C# .NET Implementation
- [x] Complete implementation with 100% test coverage
- [x] Production ready with comprehensive test suite
- [x] Entity Framework integration
- [x] MediatR command/query handlers
- [x] Performance benchmarks
- [x] NuGet package ready

### Java Spring Implementation
- [x] Feature specification (001-architecture-core-ddd)
- [x] Research phase (Java generics, Spring integration, performance optimization)
- [x] Data model design (Java with bounded generics)
- [x] API contracts definition (Java interfaces and classes)
- [x] Quickstart documentation (Spring Boot examples)
- [x] Planning complete (ready for task generation)
- [ ] Core library implementation (TDD approach)
- [ ] Spring integration package
- [ ] Example applications
- [ ] Performance validation

### Go Implementation
- [x] Feature specification (001-architecture-core-ddd)
- [x] Research phase (Go generics, zero allocations, error patterns)
- [x] Data model design (Go with generics)
- [x] API contracts definition (Go interfaces)
- [x] Quickstart documentation (Go examples)
- [x] Task generation (50 tasks ready for execution)
- [x] Core implementation (TDD approach)
- [x] Comprehensive test suite
- [x] Performance validation

### TypeScript Implementation
- [x] Complete implementation with 100% test success rate
- [x] All 573 tests passing
- [x] Production ready

## File Structure
```
specs/001-architecture-core-ddd/
├── spec.md                           # Feature requirements
├── plan.md                           # Implementation plan
├── research.md                       # Java technology decisions
├── data-model.md                     # Java type definitions
├── quickstart.md                     # Java usage examples
├── contracts/                        # Multi-language API contracts
│   ├── core-types-contract.cs       # C# contracts
│   ├── core-types-contract.java     # Java contracts
│   ├── core-types-contract.go       # Go contracts
│   └── core-types-contract.ts       # TypeScript contracts
└── tasks.md                          # Generated tasks

csharp-dotnet/                        # C# .NET implementation (complete)
├── src/Architecture.Core/            # Core library
│   ├── Domain/                       # DDD abstractions
│   │   ├── Aggregates/
│   │   ├── Entities/
│   │   ├── Events/
│   │   ├── Repositories/
│   │   └── ValueObjects/
│   └── Functional/                   # Functional types
├── tests/Architecture.Core.Tests/    # Comprehensive test suite
├── examples/QuickstartExample/       # Usage examples
├── benchmarks/                       # Performance tests
└── Architecture.Core.sln             # Solution file

java-spring/                          # Java Spring implementation (planning complete)
├── architecture-core/               # Pure JDK core library
│   ├── src/main/java/com/architecture/core/
│   │   ├── domain/                   # DDD abstractions
│   │   ├── functional/               # Functional types
│   │   └── infrastructure/           # Support classes
│   └── src/test/java/                # Unit tests
├── architecture-core-spring/        # Spring integration package
│   ├── src/main/java/com/architecture/core/spring/
│   │   ├── repositories/             # Spring Data implementations
│   │   ├── configuration/            # Auto-configuration
│   │   └── converters/               # Type converters
│   └── src/test/java/                # Integration tests
├── examples/                         # Usage examples
│   ├── quickstart/
│   └── spring-boot-app/
└── benchmarks/                       # JMH performance tests

golang/                               # Go implementation (ready for implementation)
├── pkg/
│   ├── domain/                       # Domain abstractions
│   └── functional/                   # Functional types
├── examples/                         # Usage examples
├── internal/                         # Internal utilities
└── tests/                            # Test suites

typescript-nodejs/                    # TypeScript implementation (complete)
├── src/                              # Core implementation
├── tests/                            # Test suites (573 tests)
├── examples/                         # Usage examples
└── package.json                      # Configuration
```

## Key Quality Gates
- Zero external runtime dependencies (pure standard libraries)
- TDD with Given-When-Then structure
- Monadic laws compliance (Left Identity/Right Identity/Associativity)
- ValueObject equality handling (multi-field, collections, nulls)
- Repository async/cancellation patterns
- Cross-language consistency validation

## Language-Specific Implementation Details

### C# .NET Implementation
- **.NET 8 LTS** with nullable reference types
- **Record types** for value objects and events
- **Generic constraints** with interface bounds
- **Async/await patterns** for repository operations
- **xUnit** with FluentAssertions for testing

### Java Spring Implementation
- **Java 21 LTS** with bounded generics and pattern matching
- **Value-based classes** for Result/Maybe optimization
- **CompletableFuture** for async operations with cancellation
- **JUnit 5** with parameterized tests and JMH benchmarks
- **Maven multi-module** project structure
- **Spring Boot auto-configuration** for optional integration

### Go Implementation
- **Go 1.21+ generics** with type constraints for type safety
- **Value types** for Result/Maybe to minimize allocations
- **Explicit error handling** following Go idioms
- **Small interfaces** with dependency inversion
- **Table-driven tests** with Given-When-Then structure

### TypeScript Implementation
- **TypeScript 5.9+** with strict type checking
- **Discriminated unions** for Result/Maybe types
- **Promise-based async** patterns
- **Jest** testing framework with 573 tests passing
- **Node.js 22 LTS** runtime

## Immediate Next Steps
### Java Spring (Current Priority)
1. Execute `/tasks` command to generate implementation tasks
2. Implement core library (architecture-core) with TDD
3. Create Spring integration package (architecture-core-spring)
4. Build example Spring Boot applications
5. Performance validation with JMH benchmarks

### Go (Ready for Implementation)
1. Begin task execution starting with T001 (project setup)
2. Write failing tests first (T005-T020) before implementation
3. Implement functional types (T021-T023) then domain types (T024-T028)
4. Create quickstart examples (T029-T032)
5. Performance validation and benchmarking

## Configuration Commands
- `/plan Architecture.Core`: Create implementation plan ✅
- `/tasks`: Generate detailed implementation tasks (ready for Java Spring)

### C# .NET Commands
- `dotnet build`: Build solution
- `dotnet test`: Run all tests ✅
- `dotnet run --project examples/QuickstartExample`: Run examples

### Java Spring Commands (Ready)
- `mvn clean compile`: Build core library
- `mvn test`: Run JUnit 5 tests
- `mvn spring-boot:run`: Run Spring Boot examples
- `mvn -f benchmarks/pom.xml jmh:benchmark`: Run performance tests

### Go Commands
- `go test ./...`: Run Go test suite (when implemented)
- `go test -bench=.`: Run Go benchmarks
- `go run examples/quickstart/main.go`: Run examples

### TypeScript Commands
- `npm test`: Run TypeScript test suite ✅
- `npm run build`: Build TypeScript project
- `npm run example`: Run usage examples

## Performance Targets by Language

### C# .NET (Achieved)
- Sub-millisecond aggregate operations
- Memory-efficient value object equality
- Entity Framework optimized queries
- Comprehensive benchmarking suite

### Java Spring (Target)
- Zero allocations for Result/Maybe operations
- JVM escape analysis optimization
- Sub-nanosecond equality comparisons
- Spring Data JPA integration efficiency

### Go (Target)
- Zero allocations for Result/Maybe operations
- Stack allocation for small types
- Minimal GC pressure
- Context-aware async patterns

### TypeScript (Achieved)
- V8 engine optimization
- Promise chain efficiency
- Memory leak prevention
- Node.js event loop integration

---
*Last updated: 2025-09-22 | Multi-language Architecture.Core implementations with Java Spring planning complete*
