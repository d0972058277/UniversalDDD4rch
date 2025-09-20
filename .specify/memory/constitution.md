<!--
Sync Impact Report:
- Version change: [TEMPLATE] → 1.0.0
- New constitution created with DDD+CQRS principles
- Added sections: Domain-Driven Design Architecture, Functional Programming Principles, Test-Driven Development, Multi-Language Support, Error Handling Strategy
- Templates requiring updates: ⚠ pending validation of all .specify/templates/*.md files
- Follow-up TODOs: Validate template consistency across all dependent artifacts
-->

# Universal DDD Architecture Constitution

## Core Principles

### I. Domain-Driven Design Architecture
All implementations MUST follow Explicit Architecture principles combining DDD, Hexagonal, Onion, Clean, and CQRS patterns. The architecture MUST clearly separate:
- Domain Layer (entities, value objects, domain services, domain events)
- Application Layer (use cases, application services, command/query handlers)
- Infrastructure Layer (repositories, external services, persistence)
- Presentation Layer (controllers, DTOs, serializers)

Each bounded context MUST be independently deployable and maintainable across all supported languages.

### II. Command Query Responsibility Segregation (CQRS)
All data operations MUST be clearly separated into Commands (write operations) and Queries (read operations). Commands MUST NOT return data except for success/failure indicators. Queries MUST be read-only and MUST NOT modify system state. Event sourcing MAY be implemented where business value justifies the complexity.

### III. Test-Driven Development (NON-NEGOTIABLE)
TDD is MANDATORY for all implementations. Tests MUST be written before implementation code. All tests MUST pass before any task can be marked as complete. Test naming MUST follow the pattern: `Should_ExpectedBehavior_When_StateUnderTest`. Test structure MUST include Given-When-Then blocks with explicit comments marking each section.

### IV. Functional Programming Principles
All implementations MUST use Result, Error, and Maybe monads for error handling and null safety. Exceptions MUST only be thrown for truly exceptional circumstances that cannot be handled through normal program flow. Languages without exceptions MUST use the most idiomatic error handling mechanism available (e.g., Go's error return values, Rust's Result type).

### V. Multi-Language Implementation Consistency
All architectural patterns MUST be consistently implemented across supported languages: C# .NET, Java Spring, Python Django, Go, and Node.js Express (TypeScript). Each implementation MUST maintain the same domain model structure, use case interfaces, and behavioral contracts while leveraging language-specific idioms and best practices.

## Multi-Language Support Standards

Each language implementation MUST provide:
- Identical domain model representations using language-appropriate constructs
- Consistent API contracts across all bounded contexts
- Language-specific monadic error handling (Result<T>, Option<T>, Either<L,R>)
- Framework-specific dependency injection and configuration
- Idiomatic testing frameworks while maintaining Given-When-Then structure

Technology stack requirements:
- C#: .NET Core/5+, Entity Framework, MediatR, FluentValidation
- Java: Spring Boot, Spring Data JPA, Spring Security, JUnit 5
- Python: Django 4+, Django REST Framework, pytest, factory_boy
- Go: Standard library + chi/gin, GORM, testify
- TypeScript: Express.js, TypeORM, Jest, class-validator

## Development Workflow

All development MUST follow this sequence:
1. Write failing tests following TDD principles
2. Implement minimum code to make tests pass
3. Refactor while maintaining test coverage
4. Verify all tests pass across all language implementations
5. Update documentation and architectural decision records

Code reviews MUST verify:
- TDD compliance (tests written first)
- Architectural pattern adherence
- Functional programming principle usage
- Cross-language consistency
- Complete test coverage with no failing tests

## Governance

This constitution supersedes all other development practices and guidelines. All implementations MUST comply with these principles regardless of language-specific conventions that may conflict.

Amendments require:
- Documentation of proposed changes with architectural impact analysis
- Cross-language implementation feasibility assessment
- Migration plan for existing code
- Approval from project maintainers

Compliance verification is MANDATORY for all pull requests. Any violation of these principles MUST be resolved before code integration.

**Version**: 1.0.0 | **Ratified**: 2025-09-20 | **Last Amended**: 2025-09-20