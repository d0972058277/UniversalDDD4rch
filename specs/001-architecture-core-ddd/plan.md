# Implementation Plan: Architecture.Core - DDD Abstractions and Functional Types

**Branch**: `001-architecture-core-ddd` | **Date**: 2025-09-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-architecture-core-ddd/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Architecture.Core provides essential DDD abstractions (AggregateRoot, Entity, ValueObject, DomainEvent, Repository) and functional programming types (Result, Maybe, Error) for building domain-driven applications. The implementation follows pure BCL approach with zero external runtime dependencies, targeting .NET 8 LTS with optional integration packages for MediatR, Entity Framework, and FluentValidation.

## Technical Context
**Language/Version**: C# .NET 8 LTS (supported until November 2026)
**Primary Dependencies**: Pure BCL only (core), optional MediatR, Entity Framework, FluentValidation
**Storage**: N/A (abstractions only, Repository interface)
**Testing**: xUnit, NUnit, or MSTest with Given-When-Then structure
**Target Platform**: .NET 8+ applications (web, console, desktop)
**Project Type**: single - DDD core library
**Performance Goals**: Minimal allocations, optimized equality operations for ValueObject
**Constraints**: Zero runtime dependencies in core library, BCL only
**Scale/Scope**: Foundation library for enterprise DDD applications, multi-language consistency

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Domain-Driven Design Architecture**:
- [x] Clear separation of Domain, Application, Infrastructure, and Presentation layers
- [x] Domain layer contains only business logic (entities, value objects, domain services)
- [x] Infrastructure dependencies point inward (dependency inversion)

**CQRS Implementation**:
- [x] Commands and Queries clearly separated
- [x] Commands do not return data (except success/failure)
- [x] Queries are read-only and stateless

**Test-Driven Development**:
- [x] All tests written before implementation
- [x] Test naming follows Should_ExpectedBehavior_When_StateUnderTest pattern
- [x] Given-When-Then structure with explicit comment blocks

**Functional Programming Principles**:
- [x] Result/Error/Maybe monads used for error handling
- [x] Exceptions only for unrecoverable errors
- [x] Language-appropriate error handling patterns

**Multi-Language Consistency**:
- [x] Same domain model structure across all language implementations
- [x] Consistent API contracts and behavioral contracts
- [x] Framework-specific but architecturally aligned implementation

## Project Structure

### Documentation (this feature)
```
specs/001-architecture-core-ddd/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT) - DDD Architecture
src/
├── domain/              # Business logic layer
│   ├── entities/
│   ├── value-objects/
│   ├── services/
│   └── events/
├── application/         # Use cases and application services
│   ├── commands/
│   ├── queries/
│   ├── handlers/
│   └── dtos/
├── infrastructure/     # External concerns
│   ├── repositories/
│   ├── messaging/
│   └── persistence/
└── presentation/       # Controllers and APIs
    ├── controllers/
    ├── middleware/
    └── serializers/

tests/
├── unit/              # Domain and application layer tests
├── integration/       # Infrastructure integration tests
└── contract/          # API contract tests
```

**Structure Decision**: Option 1 (Single project) - Core library with DDD architecture separation

## Phase 0: Outline & Research
*✅ COMPLETED*

**Research Tasks Completed**:
1. ✅ .NET 8 LTS BCL best practices for generic constraints and performance
2. ✅ Monadic patterns implementation in C# without external dependencies
3. ✅ Reflection-based ValueObject equality optimization techniques
4. ✅ Domain event correlation/causation ID patterns
5. ✅ Repository interface design for async/cancellation best practices

**Output**: research.md with all technical decisions documented and justified

## Phase 1: Design & Contracts
*✅ COMPLETED*

**Artifacts Generated**:
1. ✅ `data-model.md`: Core types, relationships, validation rules
2. ✅ `contracts/core-types-contract.cs`: Public API contracts and interfaces
3. ✅ `quickstart.md`: Usage examples with Order domain demonstration
4. ✅ `CLAUDE.md`: Agent context file with project overview and current status

**Phase 1 Validation**:
- All entities extracted from feature specification
- API contracts follow functional programming principles
- Contract tests framework outlined (implementation in Phase 3)
- Quickstart provides comprehensive usage examples

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract interface → unit test task [P]
- Each abstract base class → implementation task [P]
- Each functional type → monadic laws test task
- Each user story from quickstart → integration test task
- Performance optimization tasks for ValueObject equality
- Documentation tasks for API reference

**Ordering Strategy**:
- TDD order: Tests before implementation
- Dependency order: Functional types → Base classes → Aggregates
- Mark [P] for parallel execution (independent implementations)
- Critical path: Result/Maybe → ValueObject → Entity → AggregateRoot

**Estimated Output**: 35-40 numbered, ordered tasks in tasks.md

**Key Task Categories**:
1. **Core Functional Types** (8-10 tasks): Result, Maybe, Error with monadic operations
2. **DDD Base Classes** (12-15 tasks): ValueObject, Entity, AggregateRoot, DomainEventBase
3. **Repository Interfaces** (3-5 tasks): IRepository with async patterns
4. **Test Infrastructure** (5-8 tasks): Test helpers, builders, assertion extensions
5. **Performance Tests** (3-5 tasks): Benchmarks for equality operations
6. **Integration Examples** (3-5 tasks): Quickstart validation, sample implementations

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Complexity Tracking
*No constitutional violations identified*

All architectural decisions align with constitutional requirements:
- Pure DDD patterns with clear layer separation
- Functional error handling throughout
- TDD approach mandated for all implementations
- Multi-language consistency maintained through shared contracts
- Zero external dependencies in core library

## Progress Tracking
*✅ All /plan command phases completed successfully*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning approach documented (/plan command)
- [ ] Phase 3: Tasks generated (/tasks command - NEXT)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none required)

**Ready for Next Command**: `/tasks` - Generate implementation tasks from design artifacts
