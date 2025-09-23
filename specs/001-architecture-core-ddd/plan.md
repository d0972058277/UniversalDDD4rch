
# Implementation Plan: Architecture.Core - Python Django Implementation

**Branch**: `001-architecture-core-ddd` | **Date**: 2025-09-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/porridg3/GitHub/UniversalDDD4rch/specs/001-architecture-core-ddd/spec.md`

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
Implementation of DDD core abstractions (AggregateRoot, Entity, ValueObject, DomainEvent, Repository) and functional types (Result/Result[T], Error, Maybe[T]) for Python Django applications. The library will use pure Python standard library with no external runtime dependencies, supporting optional integration with Django 4+, Django REST Framework, pytest, and factory_boy. The implementation follows explicit architecture principles with clear layer separation and TDD methodology.

## Technical Context
**Language/Version**: Python 3.12+ (supported until October 2028) or Python 3.13+ (latest stable)
**Primary Dependencies**: Pure Python standard library (core), Django 4+, Django REST Framework (optional integrations)
**Storage**: Optional Django ORM, PostgreSQL/MySQL (for Django integration examples)
**Testing**: pytest with factory_boy for test data generation
**Target Platform**: Cross-platform (Linux, macOS, Windows) web applications
**Project Type**: single - Core library with optional Django integration packages
**Performance Goals**: Sub-millisecond aggregate operations, memory-efficient value object equality
**Constraints**: Zero external runtime dependencies for core library, <200ms p95 for repository operations
**Scale/Scope**: Support for 10k+ domain aggregates, enterprise-scale Django applications
**Arguments**: $ARGUMENTS - Architecture.Core for Python Django: Implement DDD core abstractions (AggregateRoot, Entity, ValueObject, DomainEvent, Repository) and functional types (Result/Result[T], Error, Maybe[T]) using pure Python standard library with no external runtime dependencies. Support Django 4+, Django REST Framework, pytest, factory_boy. Follow explicit architecture principles with clear layer separation.

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Domain-Driven Design Architecture**:
- [x] Clear separation of Domain, Application, Infrastructure, and Presentation layers (Python package structure with domain/, application/, infrastructure/, presentation/)
- [x] Domain layer contains only business logic (entities, value objects, domain services) - AggregateRoot, Entity, ValueObject in domain/
- [x] Infrastructure dependencies point inward (dependency inversion) - Django integration as optional infrastructure layer

**CQRS Implementation**:
- [x] Commands and Queries clearly separated (Command/Query handlers in application layer)
- [x] Commands do not return data (except success/failure) - Commands return Result<None> or Result<T> for created entities
- [x] Queries are read-only and stateless (Query handlers return Result<T> or Maybe<T>)

**Test-Driven Development**:
- [x] All tests written before implementation (pytest with TDD approach)
- [x] Test naming follows Should_ExpectedBehavior_When_StateUnderTest pattern (Python test method naming)
- [x] Given-When-Then structure with explicit comment blocks (AAA pattern with comments)

**Functional Programming Principles**:
- [x] Result/Error/Maybe monads used for error handling (Python implementations with typing support)
- [x] Exceptions only for unrecoverable errors (Domain exceptions only for invariant violations)
- [x] Language-appropriate error handling patterns (Python Result pattern with match statements)

**Multi-Language Consistency**:
- [x] Same domain model structure across all language implementations (Consistent with C#, Java, Go, TypeScript versions)
- [x] Consistent API contracts and behavioral contracts (Same interfaces and behaviors)
- [x] Framework-specific but architecturally aligned implementation (Django-specific but DDD-compliant)

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
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

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── domain/          # Business logic layer
│   ├── application/     # Use cases and application services
│   ├── infrastructure/  # External concerns
│   └── presentation/    # API controllers
└── tests/

frontend/
├── src/
│   ├── domain/         # Client-side domain models
│   ├── application/    # Client-side use cases
│   ├── infrastructure/ # HTTP clients, localStorage
│   └── presentation/   # Components, pages
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same DDD structure as backend above]

ios/ or android/
├── Domain/             # Platform-specific domain layer
├── Application/        # Platform-specific use cases
├── Infrastructure/     # Platform APIs, networking
└── Presentation/       # Views, ViewModels
```

**Structure Decision**: Option 1 (Single project with DDD Architecture) - Core library with optional Django integration packages

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/powershell/update-agent-context.ps1 -AgentType claude` for your AI assistant
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy for Python Django**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Core library tasks (zero dependencies):
  * Domain abstractions: AggregateRoot[TId], Entity[TId], ValueObject
  * Functional types: Result[T], Maybe[T], Error
  * Repository interfaces: Repository[TAggregate, TId]
- Django integration tasks (optional package):
  * Model mixins: AggregateRootModelMixin
  * Repository implementations: DjangoRepository
  * Django ORM mapping utilities
- Test generation strategy:
  * Unit tests for each domain component [P]
  * Property-based tests for monadic laws [P]
  * Integration tests for Django repositories
  * Performance benchmarks for core operations [P]

**Python-Specific Ordering Strategy**:
- TDD order: pytest tests before implementation
- Dependency order:
  1. Type protocols and interfaces
  2. Functional types (Result, Maybe, Error)
  3. Domain base classes (ValueObject, Entity, AggregateRoot)
  4. Repository interfaces
  5. Django integration layer (separate package)
- Mark [P] for parallel execution (independent modules)
- async/await patterns for repository operations

**Technology-Specific Tasks**:
- Python package structure setup (pyproject.toml, __init__.py)
- Type checking configuration (mypy.ini)
- pytest configuration and fixtures
- Django package setup (separate django-architecture-core)
- Performance profiling with cProfile and memory_profiler
- Documentation generation with Sphinx

**Estimated Output**: 30-35 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
