# Implementation Plan: Architecture.Core - DDD Abstractions and Functional Types

**Branch**: `001-architecture-core-ddd` | **Date**: 2025-09-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-architecture-core-ddd/spec.md`

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
Architecture.Core for Go implements minimal viable DDD core abstractions (AggregateRoot, Entity, ValueObject, DomainEvent, Repository) and functional types (Result, Error, Maybe) using pure Go standard library with zero external runtime dependencies. Supports optional integration packages: chi/gin for HTTP routing, GORM for ORM, and testify for enhanced testing capabilities.

## Technical Context
**Language/Version**: Go 1.24+ or Go 1.25 (current releases in 2025, rolling support model)
**Primary Dependencies**: Pure Go standard library (no external runtime dependencies)
**Storage**: Optional GORM integration for SQL databases, interface-based for testability
**Testing**: Go standard testing package + optional testify for enhanced assertions
**Target Platform**: Cross-platform (Linux, Windows, macOS) via Go compilation
**Project Type**: Single library project with DDD architecture
**Performance Goals**: Minimal allocations for functional types, optimized equality operations
**Constraints**: Zero external runtime dependencies in core, optional integration packages only
**Scale/Scope**: Core library for DDD applications, designed for enterprise-scale domain modeling

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
- [x] Exceptions only for unrecoverable errors (Go uses explicit error handling)
- [x] Language-appropriate error handling patterns (Go's explicit error returns)

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
# Single project (DEFAULT) - DDD Architecture for Go
golang/
├── pkg/
│   ├── domain/              # Business logic layer
│   │   ├── aggregate.go     # AggregateRoot interface and base
│   │   ├── entity.go        # Entity interface and base
│   │   ├── valueobject.go   # ValueObject interface and base
│   │   ├── event.go         # DomainEvent interface and base
│   │   └── repository.go    # Repository interface
│   ├── functional/          # Functional programming types
│   │   ├── result.go        # Result and Result[T] types
│   │   ├── maybe.go         # Maybe[T] type
│   │   └── error.go         # Error type with categorization
│   └── integration/         # Optional framework integrations
│       ├── chi/             # Chi router integration
│       ├── gin/             # Gin router integration
│       └── gorm/            # GORM repository implementations
├── examples/                # Usage examples and quickstart
│   ├── quickstart/          # Basic usage example
│   ├── ecommerce/           # E-commerce domain example
│   └── banking/             # Banking domain example
├── internal/                # Internal utilities and test helpers
│   └── testing/             # Test utilities and fixtures
└── tests/
    ├── unit/               # Domain and functional type tests
    ├── integration/        # Integration tests with optional packages
    ├── contract/           # API contract compliance tests
    └── performance/        # Performance and benchmark tests

# Go module files
go.mod                      # Go module definition
go.sum                      # Dependency checksums
```

**Structure Decision**: Single library project following Go conventions with pkg/ for public APIs

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - Go version compatibility strategy (1.24+ vs 1.25 specific features)
   - Go generics best practices for DDD types (Go 1.18+ features)
   - Go interface design patterns for repository abstraction
   - Error handling patterns in Go vs other languages (no exceptions)
   - Memory allocation optimization for functional types
   - Go testing patterns and benchmarking approaches

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research Go generics best practices for DDD type design"
     Task: "Research Go interface patterns for repository abstraction"
     Task: "Research Go memory optimization for functional types"
     Task: "Research Go error handling patterns vs exceptions"
     Task: "Research Go testing and benchmarking best practices"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all technical decisions documented

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Go struct definitions for AggregateRoot, Entity, ValueObject
   - Interface definitions for DomainEvent, Repository
   - Generic type constraints and relationships
   - Validation patterns using Go's type system

2. **Generate API contracts** from functional requirements:
   - Go interface definitions for all core types
   - Method signatures with proper error handling
   - Generic type constraints and bounds
   - Output Go interface definitions to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per interface/type
   - Assert interface compliance and behavior
   - Tests must fail (no implementation yet)
   - Use Go's testing.T and benchmarking

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps
   - Performance benchmarks for critical paths

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/powershell/update-agent-context.ps1 -AgentType claude` for Claude Code
   - Add Go-specific technical context
   - Update recent changes and status
   - Keep under 150 lines for token efficiency

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each interface → interface definition task [P]
- Each type → implementation task with TDD [P]
- Each user story → integration test task
- Performance benchmarking tasks for critical paths
- Optional integration package tasks (chi, gin, gorm)

**Ordering Strategy**:
- TDD order: Interface definitions → Tests → Implementation
- Dependency order: Functional types → Domain types → Repository → Integrations
- Mark [P] for parallel execution (independent packages)

**Estimated Output**: 30-35 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

No constitutional violations detected. The Go implementation follows all required principles:
- Pure DDD architecture with clear layer separation
- CQRS through interface design
- TDD with Go testing conventions
- Functional error handling using Result types instead of exceptions
- Multi-language consistency through identical domain contracts

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*