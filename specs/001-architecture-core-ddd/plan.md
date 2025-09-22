
# Implementation Plan: Architecture.Core - DDD Abstractions and Functional Types (Java Spring)

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
Implement Architecture.Core for Java Spring providing essential DDD abstractions (AggregateRoot<TId>, Entity<TId>, ValueObject, DomainEvent, Repository<TAggregate,TId>) and functional types (Result/Result<T>, Error, Maybe<T>) using pure JDK with no external runtime dependencies. Support Spring Boot, Spring Data JPA, Spring Security, JUnit 5 integration packages while maintaining constitutional DDD+CQRS+TDD principles and explicit architecture layer separation.

## Technical Context
**Language/Version**: Java 21 LTS (free until September 2026) or Java 25 LTS (free until September 2028)
**Primary Dependencies**: Pure JDK implementation (no external runtime dependencies for core); Optional integration packages: Spring Boot, Spring Data JPA, Spring Security, JUnit 5
**Storage**: N/A (core abstractions only - storage implementations are optional integrations)
**Testing**: JUnit 5 with TDD approach following Should_ExpectedBehavior_When_StateUnderTest naming pattern
**Target Platform**: JVM-based applications (server, desktop, Android via integration packages)
**Project Type**: Single library project with clear DDD layer separation
**Performance Goals**: Zero-allocation patterns for functional types, minimal GC pressure for monadic operations
**Constraints**: Pure JDK only for core library, zero external runtime dependencies, monadic laws compliance (Left Identity/Right Identity/Associativity)
**Scale/Scope**: Core library foundation for enterprise DDD applications, multi-language consistency across C#, Java, Python, Go, TypeScript implementations
**Arguments**: Architecture.Core for Java Spring: Implement DDD core abstractions (AggregateRoot<TId>, Entity<TId>, ValueObject, DomainEvent, Repository<TAggregate,TId>) and functional types (Result/Result<T>, Error, Maybe<T>) using pure JDK with no external runtime dependencies. Support Spring Boot, Spring Data JPA, Spring Security, JUnit 5. Follow explicit architecture principles with clear layer separation.

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Domain-Driven Design Architecture**:
- [x] Clear separation of Domain, Application, Infrastructure, and Presentation layers
- [x] Domain layer contains only business logic (entities, value objects, domain services)
- [x] Infrastructure dependencies point inward (dependency inversion)

**CQRS Implementation**:
- [x] Commands and Queries clearly separated (Repository interface separates read/write operations)
- [x] Commands do not return data (except success/failure via Result types)
- [x] Queries are read-only and stateless (Repository read operations)

**Test-Driven Development**:
- [x] All tests written before implementation
- [x] Test naming follows Should_ExpectedBehavior_When_StateUnderTest pattern
- [x] Given-When-Then structure with explicit comment blocks

**Functional Programming Principles**:
- [x] Result/Error/Maybe monads used for error handling
- [x] Exceptions only for unrecoverable errors
- [x] Language-appropriate error handling patterns (Java Optional integration with Maybe<T>)

**Multi-Language Consistency**:
- [x] Same domain model structure across all language implementations
- [x] Consistent API contracts and behavioral contracts
- [x] Framework-specific but architecturally aligned implementation (Java generics matching C#/TypeScript/Go patterns)

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

### Source Code (Java Spring Implementation)
```
java-spring/
├── architecture-core/              # Core DDD abstractions (pure JDK)
│   ├── src/main/java/
│   │   └── com/architecture/core/
│   │       ├── domain/             # DDD abstractions
│   │       │   ├── AggregateRoot.java
│   │       │   ├── Entity.java
│   │       │   ├── EntityId.java
│   │       │   ├── ValueObject.java
│   │       │   ├── DomainEvent.java
│   │       │   └── Repository.java
│   │       ├── functional/         # Functional types
│   │       │   ├── Result.java
│   │       │   ├── Maybe.java
│   │       │   ├── Error.java
│   │       │   └── ErrorCategory.java
│   │       └── infrastructure/     # Support classes
│   │           ├── CancellationToken.java
│   │           └── OperationCancelledException.java
│   └── src/test/java/              # Unit tests
│       └── com/architecture/core/
│           ├── domain/
│           ├── functional/
│           └── integration/
├── architecture-core-spring/       # Spring integration package
│   ├── src/main/java/
│   │   └── com/architecture/core/spring/
│   │       ├── repositories/       # Spring Data implementations
│   │       ├── configuration/      # Auto-configuration
│   │       ├── converters/         # Type converters
│   │       └── aspects/            # Cross-cutting concerns
│   └── src/test/java/              # Integration tests
├── examples/                       # Usage examples
│   ├── quickstart/                 # Basic examples
│   └── spring-boot-app/            # Complete Spring Boot application
├── benchmarks/                     # Performance benchmarks
├── docs/                           # Documentation
└── build/                          # Build outputs
```

**Structure Decision**: Java Spring Implementation - Pure JDK core library with Spring integration packages (following /java-spring directory structure)

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

**Output**: data-model.md, /contracts/core-types-contract.java, java-contracts-documentation.md, java-testing-documentation.md, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy for Java Spring Implementation**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks targeting `/java-spring/` directory structure
- Core library tasks: `/java-spring/architecture-core/`
- Spring integration tasks: `/java-spring/architecture-core-spring/`
- Example application tasks: `/java-spring/examples/`

**Task Categories**:
1. **Core Library (TDD)**: Domain abstractions and functional types
   - EntityId<T> interface and implementations [P]
   - AggregateRoot<TId> base class [P]
   - Entity<TId> base class [P]
   - ValueObject base class [P]
   - Result<T> and Maybe<T> functional types [P]
   - Repository<TAggregate,TId> interface [P]

2. **Spring Integration**: Framework-specific implementations
   - Spring Data repository implementations
   - Auto-configuration classes
   - Type converters for JPA
   - Aspect-oriented concerns

3. **Examples and Documentation**:
   - Quickstart example application
   - Spring Boot integration demo
   - Performance benchmarks

**Ordering Strategy**:
- TDD order: Tests before implementation in `/src/test/java/`
- Core before Spring: Pure JDK types before framework integration
- Examples last: Working implementations after core is complete
- Mark [P] for parallel execution (independent Maven modules)

**Estimated Output**: 35-40 numbered, ordered tasks targeting Java Spring directory structure

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
