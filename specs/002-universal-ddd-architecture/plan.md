
# Implementation Plan: Universal DDD Architecture Multi-Language Consistency v2.0

**Branch**: `002-universal-ddd-architecture` | **Date**: 2025-09-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-universal-ddd-architecture/spec.md`

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
Implement Priority 1-2 recommendations from multi-language consistency analysis to align C#, Go, Java, Python, TypeScript implementations in core APIs, error handling, framework integration, and testing structures. The primary goal is to ensure identical aggregate root functionality, consistent repository interface contracts, unified Result monad APIs, and separated core/integration package architecture across all five supported languages while maintaining semantic equivalence and respecting language-specific naming conventions.

## Technical Context
**Language/Version**: Multi-language (C# .NET 8 LTS, Go 1.21+, Java 21/25 LTS, Python 3.12+, TypeScript 5.9+ with Node.js 22 LTS)
**Primary Dependencies**: Pure standard libraries for core, optional integrations (MediatR, Entity Framework, Spring Boot, Django, Express.js)
**Storage**: N/A (Architecture library - storage handled by consuming applications)
**Testing**: Language-specific (xUnit, JUnit 5, pytest, testify, Jest) with TDD and Given-When-Then structure
**Target Platform**: Cross-platform library packages (NuGet, Maven, PyPI, Go modules, npm)
**Project Type**: Multi-language library architecture (separate language implementations with shared contracts)
**Performance Goals**: Zero allocations for Result/Maybe operations, sub-millisecond aggregate operations, minimal memory footprint
**Constraints**: Backward compatibility requirements, language-specific conventions, zero external runtime dependencies for core packages
**Scale/Scope**: 5 language implementations, 24 functional requirements, cross-language contract validation

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

**Structure Decision**: Multi-language library architecture (existing structure maintained with consistency improvements across languages)

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
- Load `.specify/templates/tasks-template.md` as base
- Generate multi-language implementation tasks from Phase 1 design docs
- Create language-specific API consistency tasks from contracts/api-alignment-matrix.md
- Generate contract validation tasks from contracts/consistency-contract.md
- Create migration guide tasks for v1.x to v2.0 breaking changes
- Package architecture separation tasks (core/integration split)

**Language-Specific Task Categories**:
1. **API Standardization Tasks** (Priority 1):
   - T001-T005: AggregateRoot API consistency across all languages
   - T006-T010: Repository interface completion and alignment
   - T011-T015: Result monad API harmonization

2. **Package Architecture Tasks** (Priority 2):
   - T016-T020: Core/integration package separation per language
   - T021-T025: Framework-specific integration packages
   - T026-T030: Dependency management and packaging

3. **Testing Infrastructure Tasks**:
   - T031-T035: Cross-language contract test implementation
   - T036-T040: Performance benchmark standardization
   - T041-T045: Integration test consistency

4. **Documentation and Migration Tasks**:
   - T046-T050: Quickstart example alignment
   - T051-T055: Migration guide creation
   - T056-T060: API compatibility matrix maintenance

**Ordering Strategy**:
- Constitutional TDD order: Contract tests before implementations
- Language dependency order: Core packages before integration packages
- Priority order: High impact (API consistency) before medium impact (package architecture)
- Mark [P] for parallel execution across different languages
- Mark [S] for sequential execution within language implementations

**Cross-Language Coordination**:
- Coordinate breaking changes across all language implementations
- Ensure semantic versioning consistency (major.minor.patch alignment)
- Validate contract compliance across all languages before completion

**Estimated Output**: 60+ numbered, prioritized tasks in tasks.md organized by language and impact

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
- [x] Complexity deviations documented (none required)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
