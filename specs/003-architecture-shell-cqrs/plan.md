
# Implementation Plan: Architecture.Shell - CQRS Module

**Branch**: `003-architecture-shell-cqrs` | **Date**: 2025-09-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/porridg3/GitHub/UniversalDDD4rch/specs/003-architecture-shell-cqrs/spec.md`

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
Architecture.Shell CQRS Module provides a unified mediator pattern implementation for routing commands and queries to their handlers while applying cross-cutting concerns (transaction management, validation, authorization, caching, telemetry) through a composable pipeline. This enables clean separation between business logic and infrastructure concerns with consistent behavior across all request types, following DDD and CQRS principles across multiple language implementations (C#, Java, Go, TypeScript, Python).

## Technical Context
**Language/Version**: Multi-language (C# .NET 8 LTS, Java 21/25 LTS, Go 1.21+, TypeScript 5.9+/Node.js 22 LTS, Python 3.11+)
**Primary Dependencies**:
  - C#: Microsoft.Extensions.DependencyInjection.Abstractions, Microsoft.Extensions.Logging
  - Java: JSR-330 (javax.inject), SLF4J
  - Go: Standard library only (manual DI wiring)
  - TypeScript: reflect-metadata (decorators), winston/pino (logging)
  - Python: typing module, logging module
**Storage**: Transaction abstraction only (UnitOfWork); actual storage via Architecture.Core repositories
**Testing**: Language-native frameworks (xUnit/NUnit for C#, JUnit 5 for Java, testify for Go, Jest for TypeScript, pytest for Python) with Given-When-Then structure
**Target Platform**: Multi-platform (server-side application layers across all supported languages)
**Project Type**: Library/Framework (multi-language architecture module)
**Performance Goals**: No imposed latency constraints (NFR-001); sub-millisecond mediator overhead target
**Constraints**: Minimal dependencies (LP-001); language-native async patterns (LP-002); Result<T> for business errors, exceptions for infrastructure errors (BR-007)
**Scale/Scope**: Core CQRS abstractions (8 functional requirements, 8 behavioral requirements); ~15 core interfaces/types per language; integration with Architecture.Core

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Domain-Driven Design Architecture**:
- [x] Clear separation of Domain, Application, Infrastructure, and Presentation layers → CQRS Module sits in Application Layer; provides abstractions for command/query handlers with clear boundaries
- [x] Domain layer contains only business logic (entities, value objects, domain services) → This module provides application-layer infrastructure; depends on Architecture.Core for domain abstractions
- [x] Infrastructure dependencies point inward (dependency inversion) → UnitOfWork and PipelineBehaviors follow dependency inversion; implementations inject concrete transaction providers

**CQRS Implementation**:
- [x] Commands and Queries clearly separated → FR-002 enforces distinction via Command/Command<TResult>/Query<TResult> marker interfaces
- [x] Commands do not return data (except success/failure) → Commands return Result<Unit> or Result<TResult> for business errors only (BR-007)
- [x] Queries are read-only and stateless → BR-003 enforces no transactions for queries; semantic read-only nature validated via architecture tests

**Test-Driven Development**:
- [x] All tests written before implementation → UT-001 through IT-007 specify contract tests before implementation
- [x] Test naming follows Should_ExpectedBehavior_When_StateUnderTest pattern → Enforced in tasks.md:L72-75 per Constitution Section III
- [x] Given-When-Then structure with explicit comment blocks → Enforced in tasks.md:L74 per Constitution Section III; acceptance scenarios 1-8 follow Given-When-Then structure

**Functional Programming Principles**:
- [x] Result/Error/Maybe monads used for error handling → BR-007 mandates Result<T> for business errors; integration with Architecture.Core Result monad
- [x] Exceptions only for unrecoverable errors → BR-006, BR-007 specify infrastructure errors throw exceptions while business errors return Result.Failure
- [x] Language-appropriate error handling patterns → LP-002 enforces language-native async patterns; mixed error handling strategy per language conventions

**Multi-Language Consistency**:
- [x] Same domain model structure across all language implementations → Key Abstractions section defines 12 consistent types across C#/Java/Go/TS/Python
- [x] Consistent API contracts and behavioral contracts → 8 FRs, 8 BRs, 7 integration tests form cross-language contract test suite
- [x] Framework-specific but architecturally aligned implementation → LP-001 through LP-006 specify language-appropriate DI, logging, async patterns while maintaining architectural consistency

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

**Structure Decision**: Multi-language library implementation following existing UniversalDDD4rch repository structure:
```
csharp-dotnet/src/Architecture.Shell.Cqrs/
java-spring/src/main/java/arch/shell/cqrs/
golang/pkg/shell/cqrs/
typescript-nodejs/architecture-shell-cqrs/
python-django/architecture/shell/cqrs/
```
Note: TypeScript uses `architecture-shell-cqrs` directory (not `packages/shell-cqrs`) to align with Node.js package naming conventions and avoid gitignore conflicts with transient `packages/` directories.
Each language maintains its own test structure following established patterns in Architecture.Core implementations.

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

**Task Generation Strategy**:
1. Load `.specify/templates/tasks-template.md` as base template
2. Generate contract test tasks from `/contracts/CONTRACT_TESTS.md`:
   - UT-001 through UT-006 (6 unit test tasks) [P]
   - IT-001 through IT-007 (7 integration test tasks)
3. Generate core type implementation tasks from `data-model.md`:
   - BaseRequest, Command, Query marker interfaces (3 tasks per language) [P]
   - Handler interfaces (3 tasks per language) [P]
   - Mediator interface and implementation (1 task per language)
4. Generate pipeline behavior tasks:
   - ValidationBehavior, AuthorizationBehavior, UnitOfWorkBehavior, TelemetryBehavior, CachingBehavior (5 tasks per language)
5. Generate UnitOfWork implementation tasks:
   - IUnitOfWork interface (1 task per language) [P]
   - EntityFramework/GORM/TypeORM/Django ORM integration (1 task per language)
6. Generate DI registration/mediator wiring tasks (1 task per language)
7. Generate quickstart validation tasks (1 integration test per language)

**Ordering Strategy**:
- **Phase A (Parallel)**: Core interfaces and marker types (BaseRequest, Command, Query, handlers)
- **Phase B (Sequential)**: Mediator implementation (depends on Phase A)
- **Phase C (Parallel)**: Contract tests for interfaces (UT-001 to UT-006)
- **Phase D (Sequential)**: Pipeline behaviors (depends on Mediator)
- **Phase E (Parallel)**: UnitOfWork implementations per language
- **Phase F (Sequential)**: Integration tests (IT-001 to IT-007, depends on all implementations)
- **Phase G (Parallel)**: Quickstart validation per language

**Estimated Task Count per Language**:
- Core interfaces: 10 tasks
- Contract tests: 13 tasks (6 unit + 7 integration)
- Behaviors: 5 tasks
- UnitOfWork: 2 tasks
- DI registration: 1 task
- Quickstart validation: 1 task
- **Initial estimate per language**: ~32 tasks
- **Initial estimate across 5 languages**: ~160 tasks (many parallelizable)
- **Final count**: 250 tasks (refined after /analyze with additional test coverage for FR-007 guards and BR-004 warning validation)

**Task Naming Convention**: `T###-[Language]-[Component]-[Action]`
- Example: `T001-CSharp-BaseRequest-DefineInterface`
- Example: `T045-TypeScript-ValidationBehavior-Implement`
- Example: `T120-Go-IntegrationTest-IT-003-NestedCommands`

**Dependency Markers**:
- `[P]` = Parallelizable (no dependencies within language)
- `[REQUIRES: T###, T###]` = Explicit task dependencies
- `[BLOCKS: T###]` = Tasks blocked by this one

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**Status**: ✅ No constitutional violations detected

All design decisions comply with:
- DDD Architecture (clear layer separation, dependency inversion)
- CQRS Implementation (command/query separation enforced)
- TDD (contract tests defined before implementation)
- Functional Programming (Result<T> monads for business errors)
- Multi-Language Consistency (12 core types consistent across 5 languages)


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - `research.md` generated
- [x] Phase 1: Design complete (/plan command) - `data-model.md`, `/contracts/`, `quickstart.md` generated
- [x] Phase 2: Task planning complete (/plan command - describe approach only) - Strategy documented above
- [ ] Phase 3: Tasks generated (/tasks command) - awaiting `/tasks` execution
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (all 15 checkpoints satisfied)
- [x] Post-Design Constitution Check: PASS (no new violations introduced)
- [x] All NEEDS CLARIFICATION resolved (5 clarifications from `/clarify` session)
- [x] Complexity deviations documented (none - full constitutional compliance)

**Artifacts Generated**:
- [x] `/specs/003-architecture-shell-cqrs/research.md` (8 research decisions)
- [x] `/specs/003-architecture-shell-cqrs/data-model.md` (13 core types defined)
- [x] `/specs/003-architecture-shell-cqrs/contracts/csharp-interfaces.cs` (C# contracts)
- [x] `/specs/003-architecture-shell-cqrs/contracts/java-interfaces.java` (Java contracts)
- [x] `/specs/003-architecture-shell-cqrs/contracts/golang-interfaces.go` (Go contracts)
- [x] `/specs/003-architecture-shell-cqrs/contracts/typescript-interfaces.ts` (TypeScript contracts)
- [x] `/specs/003-architecture-shell-cqrs/contracts/python-interfaces.py` (Python contracts)
- [x] `/specs/003-architecture-shell-cqrs/contracts/CONTRACT_TESTS.md` (13 contract test specs)
- [x] `/specs/003-architecture-shell-cqrs/quickstart.md` (Integration guide with examples)
- [x] `/specs/003-architecture-shell-cqrs/plan.md` (This file)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
