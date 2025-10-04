# Tasks: Architecture.Shell - CQRS Module

**Input**: Design documents from `/Users/porridg3/GitHub/UniversalDDD4rch/specs/003-architecture-shell-cqrs/`
**Prerequisites**: plan.md (✅), research.md (✅), data-model.md (✅), contracts/ (✅), quickstart.md (✅)

## Execution Summary
- **Total Tasks**: 250 tasks across 5 languages (C#, Java, Go, TypeScript, Python)
- **Task Count Adjustment**: Original plan.md estimated ~160 tasks (32 per language × 5); actual count is 250 due to:
  - Additional multi-handler registration tests (T032-T036) for comprehensive edge case coverage
  - UT-001c test tasks (T036b-T040b) added for constructor-time handler uniqueness validation per FR-008 (enforces TDD compliance)
  - IT-008 test tasks (T211-T215) added for BR-007/BR-008 validation (Result.Failure commits transaction)
  - IT-008b test tasks (T211b-T215b) added for void command Result<Unit>.Failure validation (extends IT-008 coverage)
  - IT-009 test tasks (T216-T220) added for BR-006 validation (transaction provider failure fail-fast)
  - IT-010 test tasks (T221-T225) added for behavior exception rollback validation (spec.md:L68-69 edge case)
  - UT-003b test tasks (T042b-T046b) added for custom behavior order validation (spec.md:L74-75 edge case)
  - UT-007 test tasks (T061b-T061f) added for BehaviorMatcher type guard validation per FR-007 (resolves /analyze finding C1)
  - UT-008 test tasks (T061g-T061k) added for behavior order warning validation per BR-004 (resolves /analyze finding C2)
  - Architecture compliance tests (T206-T210) added to enforce query read-only semantics per spec.md:L72-73 and CONTRACT_TESTS.md AT-001
  - More granular behavior implementation tasks for better parallelization
- **Parallelization**: ~110 tasks can run in parallel (marked [P])
- **Test-First Approach**: 91 contract tests with explicit TDD dependencies before implementation
- **Estimated Duration**: 4-6 weeks with parallel execution

## Format: `[ID] [P?] [REQUIRES/BLOCKS?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[REQUIRES: T###]**: Task dependencies that must complete first
- **[BLOCKS: T###]**: Tasks that cannot start until this completes
- **File Path Convention**: Ellipsis (`...`) in paths represents language-specific structure:
  - C#: `csharp-dotnet/tests/Architecture.Shell.Cqrs.Tests/`
  - Java: `java-spring/architecture-shell-cqrs/src/test/java/com/architecture/shell/cqrs/`
  - Go: `golang/architecture-shell-cqrs/tests/` (Note: uses modular structure aligned with other languages)
  - TypeScript: `typescript-nodejs/architecture-shell-cqrs/tests/` (Note: uses `architecture-shell-cqrs` directory, not `packages/shell-cqrs`)
  - Python: `python-django/architecture-shell-cqrs/tests/`

---

## Phase 3.1: Setup (5 tasks per language = 25 total)

### C# .NET 8 Setup
- [X] T001 [P] Create project structure: `csharp-dotnet/src/Architecture.Shell.Cqrs/` and `csharp-dotnet/tests/Architecture.Shell.Cqrs.Tests/`
- [X] T002 [P] Initialize .NET project: `dotnet new classlib` with .NET 8 target framework
- [X] T003 [P] Add dependencies: Microsoft.Extensions.DependencyInjection.Abstractions, Microsoft.Extensions.Logging
- [X] T004 [P] Configure EditorConfig and StyleCop analyzers
- [X] T005 [P] Create solution file and add projects: `dotnet new sln -n Architecture.Shell.Cqrs`

### Java Spring Setup
- [X] T006 [P] Create project structure: `java-spring/src/main/java/arch/shell/cqrs/` and `java-spring/src/test/java/arch/shell/cqrs/`
- [X] T007 [P] Initialize Maven project with Java 21 and Spring Boot 3.2+
- [X] T008 [P] Add dependencies: JSR-330 (javax.inject), SLF4J, JUnit 5, Mockito
- [X] T009 [P] Configure Checkstyle and SpotBugs
- [X] T010 [P] Create pom.xml with dependency management

### Go Setup
- [X] T011 [P] Create project structure: `golang/architecture-shell-cqrs/` and `golang/architecture-shell-cqrs/tests/`
- [X] T012 [P] Initialize Go module: `go mod init github.com/universalddd/architecture-shell-cqrs`
- [X] T013 [P] Add development dependencies: testify for testing
- [X] T014 [P] Configure golangci-lint with strict rules
- [X] T015 [P] Create go.mod and go.sum
- [X] T015b [P] Configure Go workspace (go.work) to include architecture-core and architecture-shell-cqrs modules

### TypeScript Setup
- [X] T016 [P] Create project structure: `typescript-nodejs/architecture-shell-cqrs/src/` and `typescript-nodejs/architecture-shell-cqrs/tests/`
- [X] T017 [P] Initialize npm project with TypeScript 5.9+ and Node.js 22 LTS
- [X] T018 [P] Add dependencies: reflect-metadata, winston, inversify
- [X] T019 [P] Configure ESLint, Prettier, and Jest
- [X] T020 [P] Create tsconfig.json with strict mode

### Python Setup
- [X] T021 [P] Create project structure: `python-django/architecture/shell/cqrs/` and `python-django/tests/shell/cqrs/`
- [X] T022 [P] Initialize Python project with pyproject.toml (Python 3.11+)
- [X] T023 [P] Add dependencies: typing-extensions, pytest, pytest-asyncio
- [X] T024 [P] Configure ruff, mypy, black
- [X] T025 [P] Create pyproject.toml with dependencies

---

## Phase 3.2: Tests First (TDD) - Unit Tests (36 tasks)
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
**Test naming: Should_ExpectedBehavior_When_StateUnderTest**
**Test structure: Given-When-Then blocks with explicit comments**

### UT-001: Handler Registration Uniqueness (11 tests - multi-handler across all languages)
- [X] T026 [P] [REQUIRES: T001-T025] C# test: `Should_ThrowException_When_ZeroHandlersRegistered` in `csharp-dotnet/tests/Architecture.Shell.Cqrs.Tests/MediatorTests.cs`
- [X] T027 [P] [REQUIRES: T006-T010] Java test: `Should_ThrowException_When_ZeroHandlersRegistered` in `java-spring/src/test/java/arch/shell/cqrs/MediatorTests.java`
- [X] T028 [P] [REQUIRES: T011-T015] Go test: `Should_ThrowException_When_ZeroHandlersRegistered` in `golang/architecture-shell-cqrs/tests/mediator_test.go`
- [X] T029 [P] [REQUIRES: T016-T020] TypeScript test: `Should_ThrowException_When_ZeroHandlersRegistered` in `typescript-nodejs/architecture-shell-cqrs/tests/mediator.test.ts`
- [X] T030 [P] [REQUIRES: T021-T025] Python test: `Should_ThrowException_When_ZeroHandlersRegistered` in `python-django/tests/shell/cqrs/test_mediator.py`
- [X] T031 [P] [REQUIRES: T001-T025] C# test: `Should_ThrowException_When_MultipleHandlersRegistered` in `csharp-dotnet/tests/Architecture.Shell.Cqrs.Tests/MediatorTests.cs`
- [X] T032 [P] [REQUIRES: T006-T010] Java test: `Should_ThrowException_When_MultipleHandlersRegistered` in `java-spring/src/test/java/arch/shell/cqrs/MediatorTests.java`
- [X] T033 [P] [REQUIRES: T011-T015] Go test: `Should_ThrowException_When_MultipleHandlersRegistered` in `golang/architecture-shell-cqrs/tests/mediator_test.go`
- [X] T034 [P] [REQUIRES: T016-T020] TypeScript test: `Should_ThrowException_When_MultipleHandlersRegistered` in `typescript-nodejs/architecture-shell-cqrs/tests/mediator.test.ts`
- [X] T035 [P] [REQUIRES: T021-T025] Python test: `Should_ThrowException_When_MultipleHandlersRegistered` in `python-django/tests/shell/cqrs/test_mediator.py`
- [X] T036 [P] [REQUIRES: T001-T025] C# test: `Should_ResolveHandler_When_ExactlyOneHandlerRegistered` in `csharp-dotnet/tests/Architecture.Shell.Cqrs.Tests/MediatorTests.cs`

### UT-001c: Handler Uniqueness at Constructor Time (5 tests)
**Purpose**: Validate FR-008 requirement that Mediator constructor/initialization detects ambiguous handler registration (multiple handlers for same request type) and throws before runtime per spec.md:L67 edge case. This enforces TDD by testing handler uniqueness validation BEFORE Mediator implementation (T093-T101).
- [X] T036b [P] [REQUIRES: T001-T025] [BLOCKS: T093] C# test: `Should_ThrowException_When_ConstructorDetectsAmbiguousHandlers` in `csharp-dotnet/tests/Architecture.Shell.Cqrs.Tests/MediatorTests.cs` - register 2+ handlers for same command type, verify Mediator constructor/build throws with handler names in error message
- [X] T037b [P] [REQUIRES: T006-T010] [BLOCKS: T095] Java test: `Should_ThrowException_When_ConstructorDetectsAmbiguousHandlers` in `java-spring/src/test/java/arch/shell/cqrs/MediatorTests.java` - register 2+ handlers for same command type, verify MediatorImpl constructor/build throws with handler names in error message
- [X] T038b [P] [REQUIRES: T011-T015] [BLOCKS: T097] Go test: `Should_ThrowException_When_ConstructorDetectsAmbiguousHandlers` in `golang/architecture-shell-cqrs/tests/mediator_test.go` - register 2+ handlers for same command type, verify NewMediator panics with handler names in error message
- [X] T039b [P] [REQUIRES: T016-T020] [BLOCKS: T099] TypeScript test: `Should_ThrowException_When_ConstructorDetectsAmbiguousHandlers` in `typescript-nodejs/architecture-shell-cqrs/tests/mediator.test.ts` - register 2+ handlers for same command type, verify Mediator constructor throws with handler names in error message
- [X] T040b [P] [REQUIRES: T021-T025] [BLOCKS: T101] Python test: `Should_ThrowException_When_ConstructorDetectsAmbiguousHandlers` in `python-django/tests/shell/cqrs/test_mediator.py` - register 2+ handlers for same command type, verify MediatorImpl.__init__ raises with handler names in error message

### UT-002: Query Return Type Contracts (5 tests)
- [X] T037 [P] [REQUIRES: T001-T025] C# test: `Should_ReturnCorrectType_When_QueryHandlerExecutes` in `csharp-dotnet/tests/Architecture.Shell.Cqrs.Tests/QueryTests.cs`
- [X] T038 [P] [REQUIRES: T006-T010] Java test: `Should_ReturnCorrectType_When_QueryHandlerExecutes` in `java-spring/src/test/java/arch/shell/cqrs/QueryTests.java`
- [X] T039 [P] [REQUIRES: T011-T015] Go test: `Should_ReturnCorrectType_When_QueryHandlerExecutes` in `golang/architecture-shell-cqrs/tests/query_test.go`
- [X] T040 [P] [REQUIRES: T016-T020] TypeScript test: `Should_ReturnCorrectType_When_QueryHandlerExecutes` in `typescript-nodejs/architecture-shell-cqrs/tests/query.test.ts`
- [X] T041 [P] [REQUIRES: T021-T025] Python test: `Should_ReturnCorrectType_When_QueryHandlerExecutes` in `python-django/tests/shell/cqrs/test_query.py`

### UT-003: Pipeline Behavior Execution Order (5 tests)
- [X] T042 [P] [REQUIRES: T001-T025] C# test: `Should_ExecuteBehaviorsInOrder_When_RequestProcessed` in `csharp-dotnet/tests/Architecture.Shell.Cqrs.Tests/PipelineTests.cs`
- [X] T043 [P] [REQUIRES: T006-T010] Java test: `Should_ExecuteBehaviorsInOrder_When_RequestProcessed` in `java-spring/src/test/java/arch/shell/cqrs/PipelineTests.java`
- [X] T044 [P] [REQUIRES: T011-T015] Go test: `Should_ExecuteBehaviorsInOrder_When_RequestProcessed` in `golang/architecture-shell-cqrs/tests/pipeline_test.go`
- [X] T045 [P] [REQUIRES: T016-T020] TypeScript test: `Should_ExecuteBehaviorsInOrder_When_RequestProcessed` in `typescript-nodejs/architecture-shell-cqrs/tests/pipeline.test.ts`
- [X] T046 [P] [REQUIRES: T021-T025] Python test: `Should_ExecuteBehaviorsInOrder_When_RequestProcessed` in `python-django/tests/shell/cqrs/test_pipeline.py`

### UT-003b: Custom Behavior Order Configuration (5 tests)
**Purpose**: Validate FR-007 requirement that system allows configuration of behavior execution order, including non-recommended sequences per spec.md:L74-75 edge case
- [X] T042b [P] [REQUIRES: T001-T025] C# test: `Should_AllowCustomOrder_When_BehaviorsConfiguredOutOfRecommendedSequence` in `csharp-dotnet/tests/Architecture.Shell.Cqrs.Tests/PipelineTests.cs`
- [X] T043b [P] [REQUIRES: T006-T010] Java test: `Should_AllowCustomOrder_When_BehaviorsConfiguredOutOfRecommendedSequence` in `java-spring/src/test/java/arch/shell/cqrs/PipelineTests.java`
- [X] T044b [P] [REQUIRES: T011-T015] Go test: `Should_AllowCustomOrder_When_BehaviorsConfiguredOutOfRecommendedSequence` in `golang/architecture-shell-cqrs/tests/pipeline_test.go`
- [X] T045b [P] [REQUIRES: T016-T020] TypeScript test: `Should_AllowCustomOrder_When_BehaviorsConfiguredOutOfRecommendedSequence` in `typescript-nodejs/architecture-shell-cqrs/tests/pipeline.test.ts`
- [X] T046b [P] [REQUIRES: T021-T025] Python test: `Should_AllowCustomOrder_When_BehaviorsConfiguredOutOfRecommendedSequence` in `python-django/tests/shell/cqrs/test_pipeline.py`

### UT-004: Cancellation Token Propagation (5 tests)
- [X] T047 [P] [REQUIRES: T001-T025] C# test: `Should_TerminateEarly_When_CancellationRequested` in `csharp-dotnet/tests/Architecture.Shell.Cqrs.Tests/CancellationTests.cs`
- [X] T048 [P] [REQUIRES: T006-T010] Java test: `Should_TerminateEarly_When_CancellationRequested` in `java-spring/src/test/java/arch/shell/cqrs/CancellationTests.java`
- [X] T049 [P] [REQUIRES: T011-T015] Go test: `Should_TerminateEarly_When_CancellationRequested` in `golang/architecture-shell-cqrs/tests/cancellation_test.go`
- [X] T050 [P] [REQUIRES: T016-T020] TypeScript test: `Should_TerminateEarly_When_CancellationRequested` in `typescript-nodejs/architecture-shell-cqrs/tests/cancellation.test.ts`
- [X] T051 [P] [REQUIRES: T021-T025] Python test: `Should_TerminateEarly_When_CancellationRequested` in `python-django/tests/shell/cqrs/test_cancellation.py`

### UT-005: UnitOfWork Transaction Behavior - Isolated (5 tests)
**Note**: These tests verify UnitOfWork behavior in isolation using mocked transactions. End-to-end transaction lifecycle validated in IT-001/IT-002.
- [X] T052 [P] [REQUIRES: T001-T025] C# test: `Should_CallBeginTransaction_When_CommandExecutes` in `csharp-dotnet/tests/Architecture.Shell.Cqrs.Tests/UnitOfWorkBehaviorTests.cs` - verify mock IUnitOfWork.BeginTransactionAsync() called
- [X] T053 [P] [REQUIRES: T006-T010] Java test: `Should_CallBeginTransaction_When_CommandExecutes` in `java-spring/src/test/java/arch/shell/cqrs/UnitOfWorkBehaviorTests.java` - verify mock UnitOfWork.beginTransaction() called
- [X] T054 [P] [REQUIRES: T011-T015] Go test: `Should_CallBeginTransaction_When_CommandExecutes` in `golang/architecture-shell-cqrs/tests/unitofwork_behavior_test.go` - verify mock UnitOfWork.BeginTransaction() called
- [X] T055 [P] [REQUIRES: T016-T020] TypeScript test: `Should_CallBeginTransaction_When_CommandExecutes` in `typescript-nodejs/architecture-shell-cqrs/tests/unitofworkBehavior.test.ts` - verify mock IUnitOfWork.beginTransaction() called
- [X] T056 [P] [REQUIRES: T021-T025] Python test: `Should_CallBeginTransaction_When_CommandExecutes` in `python-django/tests/shell/cqrs/test_unitofwork_behavior.py` - verify mock UnitOfWork.begin_transaction() called

### UT-006: Nested Command Transaction Reuse (5 tests)
- [X] T057 [P] [REQUIRES: T001-T025] C# test: `Should_ReuseTransaction_When_NestedCommandExecuted` in `csharp-dotnet/tests/Architecture.Shell.Cqrs.Tests/UnitOfWorkBehaviorTests.cs`
- [X] T058 [P] [REQUIRES: T006-T010] Java test: `Should_ReuseTransaction_When_NestedCommandExecuted` in `java-spring/src/test/java/arch/shell/cqrs/UnitOfWorkBehaviorTests.java`
- [X] T059 [P] [REQUIRES: T011-T015] Go test: `Should_ReuseTransaction_When_NestedCommandExecuted` in `golang/architecture-shell-cqrs/tests/unitofwork_behavior_test.go`
- [X] T060 [P] [REQUIRES: T016-T020] TypeScript test: `Should_ReuseTransaction_When_NestedCommandExecuted` in `typescript-nodejs/architecture-shell-cqrs/tests/unitofworkBehavior.test.ts`
- [X] T061 [P] [REQUIRES: T021-T025] Python test: `Should_ReuseTransaction_When_NestedCommandExecuted` in `python-django/tests/shell/cqrs/test_unitofwork_behavior.py`

### UT-007: BehaviorMatcher Type Guards (5 tests)
**Purpose**: Validate FR-007 requirement that BehaviorMatcher provides type guards (IsCommand, IsQuery) to selectively apply behaviors to request types
- [X] T061b [P] [REQUIRES: T001-T025] C# test: `Should_MatchCommands_When_IsCommandGuardUsed` in `csharp-dotnet/tests/Architecture.Shell.Cqrs.Tests/BehaviorMatcherTests.cs`
- [X] T061c [P] [REQUIRES: T006-T010] Java test: `Should_MatchCommands_When_IsCommandGuardUsed` in `java-spring/src/test/java/arch/shell/cqrs/BehaviorMatcherTests.java`
- [X] T061d [P] [REQUIRES: T011-T015] Go test: `Should_MatchCommands_When_IsCommandGuardUsed` in `golang/architecture-shell-cqrs/tests/behavior_matcher_test.go`
- [X] T061e [P] [REQUIRES: T016-T020] TypeScript test: `Should_MatchCommands_When_IsCommandGuardUsed` in `typescript-nodejs/architecture-shell-cqrs/tests/behaviorMatcher.test.ts`
- [X] T061f [P] [REQUIRES: T021-T025] Python test: `Should_MatchCommands_When_IsCommandGuardUsed` in `python-django/tests/shell/cqrs/test_behavior_matcher.py`

### UT-008: Behavior Order Warning Validation (5 tests)
**Purpose**: Validate BR-004 requirement that system logs warnings when behavior order deviates from recommended sequence (Validation → Authorization → Transaction → Telemetry → Resilience)
- [X] T061g [P] [REQUIRES: T001-T025] C# test: `Should_LogWarning_When_BehaviorOrderDeviatesFromRecommended` in `csharp-dotnet/tests/Architecture.Shell.Cqrs.Tests/PipelineTests.cs`
- [X] T061h [P] [REQUIRES: T006-T010] Java test: `Should_LogWarning_When_BehaviorOrderDeviatesFromRecommended` in `java-spring/src/test/java/arch/shell/cqrs/PipelineTests.java`
- [X] T061i [P] [REQUIRES: T011-T015] Go test: `Should_LogWarning_When_BehaviorOrderDeviatesFromRecommended` in `golang/architecture-shell-cqrs/tests/pipeline_test.go`
- [X] T061j [P] [REQUIRES: T016-T020] TypeScript test: `Should_LogWarning_When_BehaviorOrderDeviatesFromRecommended` in `typescript-nodejs/architecture-shell-cqrs/tests/pipeline.test.ts`
- [X] T061k [P] [REQUIRES: T021-T025] [BLOCKS: T062] Python test: `Should_LogWarning_When_BehaviorOrderDeviatesFromRecommended` in `python-django/tests/shell/cqrs/test_pipeline.py`

---

## Phase 3.3: Core Interfaces and UnitOfWork Abstraction (55 tasks)
**DDD Layer: Application Layer Abstractions**
**ONLY after unit tests are failing**
**NOTE: This phase includes UnitOfWork interfaces (T112-T116) which were moved here from original Phase 3.5 to ensure they exist before UnitOfWorkBehavior implementations (T127-T131) in Phase 3.4**

### BaseRequest and Marker Interfaces (15 tasks - 3 per language)
- [X] T062 [P] [REQUIRES: T061] C# IBaseRequest interface in `csharp-dotnet/src/Architecture.Shell.Cqrs/IBaseRequest.cs`
- [X] T063 [P] [REQUIRES: T061] C# ICommand interface in `csharp-dotnet/src/Architecture.Shell.Cqrs/ICommand.cs`
- [X] T064 [P] [REQUIRES: T061] C# IQuery<TResult> interface in `csharp-dotnet/src/Architecture.Shell.Cqrs/IQuery.cs`
- [X] T065 [P] [REQUIRES: T061] Java BaseRequest interface in `java-spring/src/main/java/arch/shell/cqrs/BaseRequest.java`
- [X] T066 [P] [REQUIRES: T061] Java Command interface in `java-spring/src/main/java/arch/shell/cqrs/Command.java`
- [X] T067 [P] [REQUIRES: T061] Java Query<TResult> interface in `java-spring/src/main/java/arch/shell/cqrs/Query.java`
- [X] T068 [P] [REQUIRES: T061] Go BaseRequest interface in `golang/architecture-shell-cqrs/base_request.go`
- [X] T069 [P] [REQUIRES: T061] Go Command interface in `golang/architecture-shell-cqrs/command.go`
- [X] T070 [P] [REQUIRES: T061] Go QueryOf[TResult] interface in `golang/architecture-shell-cqrs/query.go`
- [X] T071 [P] [REQUIRES: T061] TypeScript BaseRequest interface in `typescript-nodejs/architecture-shell-cqrs/src/BaseRequest.ts`
- [X] T072 [P] [REQUIRES: T061] TypeScript Command interface in `typescript-nodejs/architecture-shell-cqrs/src/Command.ts`
- [X] T073 [P] [REQUIRES: T061] TypeScript Query<TResult> interface in `typescript-nodejs/architecture-shell-cqrs/src/Query.ts`
- [X] T074 [P] [REQUIRES: T061] Python BaseRequest class in `python-django/architecture/.../base_request.py`
- [X] T075 [P] [REQUIRES: T061] Python Command class in `python-django/architecture/.../command.py`
- [X] T076 [P] [REQUIRES: T061] Python QueryOf[TResult] class in `python-django/architecture/.../query.py`

### Handler Interfaces (15 tasks - 3 per language)
- [X] T077 [P] [REQUIRES: T061] C# IRequestHandler<TRequest, TResponse> in `csharp-dotnet/src/.../IRequestHandler.cs`
- [X] T078 [P] [REQUIRES: T061] C# ICommandHandler<TCommand> in `csharp-dotnet/src/.../ICommandHandler.cs`
- [X] T079 [P] [REQUIRES: T061] C# IQueryHandler<TQuery, TResult> in `csharp-dotnet/src/.../IQueryHandler.cs`
- [X] T080 [P] [REQUIRES: T061] Java RequestHandler<TRequest, TResponse> in `java-spring/src/main/.../RequestHandler.java`
- [X] T081 [P] [REQUIRES: T061] Java CommandHandler<TCommand] in `java-spring/src/main/.../CommandHandler.java`
- [X] T082 [P] [REQUIRES: T061] Java QueryHandler<TQuery, TResult> in `java-spring/src/main/.../QueryHandler.java`
- [X] T083 [P] [REQUIRES: T061] Go RequestHandler[TRequest, TResponse] in `golang/architecture-shell-cqrs/request_handler.go`
- [X] T084 [P] [REQUIRES: T061] Go CommandHandler[TCommand] in `golang/architecture-shell-cqrs/command_handler.go`
- [X] T085 [P] [REQUIRES: T061] Go QueryHandler[TQuery, TResult] in `golang/architecture-shell-cqrs/query_handler.go`
- [X] T086 [P] [REQUIRES: T061] TypeScript IRequestHandler<TRequest, TResponse> in `typescript-nodejs/architecture-shell-cqrs/src/IRequestHandler.ts`
- [X] T087 [P] [REQUIRES: T061] TypeScript ICommandHandler<TCommand> in `typescript-nodejs/architecture-shell-cqrs/src/ICommandHandler.ts`
- [X] T088 [P] [REQUIRES: T061] TypeScript IQueryHandler<TQuery, TResult> in `typescript-nodejs/architecture-shell-cqrs/src/IQueryHandler.ts`
- [X] T089 [P] [REQUIRES: T061] Python RequestHandler[TRequest, TResponse] in `python-django/architecture/.../request_handler.py`
- [X] T090 [P] [REQUIRES: T061] Python CommandHandler[TCommand] in `python-django/architecture/.../command_handler.py`
- [X] T091 [P] [REQUIRES: T061] Python QueryHandler[TQuery, TResult] in `python-django/architecture/.../query_handler.py`

### Mediator Interface and Implementation (15 tasks - 3 per language)
- [X] T092 [P] C# IMediator interface in `csharp-dotnet/src/.../IMediator.cs`
- [X] T093 C# Mediator implementation in `csharp-dotnet/src/.../Mediator.cs` with handler uniqueness validation in constructor (throws if zero or multiple handlers registered per request type) per FR-008 and spec.md:L64-67 edge cases [REQUIRES: T062-T091, T036b]
- [X] T094 [P] Java Mediator interface in `java-spring/src/main/.../Mediator.java`
- [X] T095 Java MediatorImpl implementation in `java-spring/src/main/.../MediatorImpl.java` with handler uniqueness validation in constructor (throws if zero or multiple handlers registered per request type) per FR-008 and spec.md:L64-67 edge cases [REQUIRES: T062-T091, T037b]
- [X] T096 [P] Go Mediator interface in `golang/architecture-shell-cqrs/mediator.go`
- [X] T097 Go mediatorImpl implementation in `golang/architecture-shell-cqrs/mediator_impl.go` with handler uniqueness validation in constructor (panics if zero or multiple handlers registered per request type) per FR-008 and spec.md:L64-67 edge cases [REQUIRES: T062-T091, T038b]
- [X] T098 [P] TypeScript IMediator interface in `typescript-nodejs/architecture-shell-cqrs/src/IMediator.ts`
- [X] T099 TypeScript Mediator implementation in `typescript-nodejs/architecture-shell-cqrs/src/Mediator.ts` with handler uniqueness validation in constructor (throws if zero or multiple handlers registered per request type) per FR-008 and spec.md:L64-67 edge cases [REQUIRES: T062-T091, T039b]
- [X] T100 [P] Python Mediator protocol in `python-django/architecture/.../mediator.py`
- [X] T101 Python MediatorImpl implementation in `python-django/architecture/.../mediator_impl.py` with handler uniqueness validation in __init__ (raises if zero or multiple handlers registered per request type) per FR-008 and spec.md:L64-67 edge cases [REQUIRES: T062-T091, T040b]

### Pipeline Behavior Interface (10 tasks - 2 per language)
- [X] T102 [P] C# IPipelineBehavior<TRequest, TResponse> in `csharp-dotnet/src/.../IPipelineBehavior.cs`
- [X] T103 [P] C# IBehaviorMatcher interface in `csharp-dotnet/src/.../IBehaviorMatcher.cs`
- [X] T104 [P] Java PipelineBehavior<TRequest, TResponse> in `java-spring/src/main/.../PipelineBehavior.java`
- [X] T105 [P] Java BehaviorMatcher interface in `java-spring/src/main/.../BehaviorMatcher.java`
- [X] T106 [P] Go PipelineBehavior[TRequest, TResponse] in `golang/architecture-shell-cqrs/pipeline_behavior.go`
- [X] T107 [P] Go BehaviorMatcher interface in `golang/architecture-shell-cqrs/behavior_matcher.go`
- [X] T108 [P] TypeScript IPipelineBehavior<TRequest, TResponse> in `typescript-nodejs/architecture-shell-cqrs/src/IPipelineBehavior.ts`
- [X] T109 [P] TypeScript IBehaviorMatcher interface in `typescript-nodejs/architecture-shell-cqrs/src/IBehaviorMatcher.ts`
- [X] T110 [P] Python PipelineBehavior[TRequest, TResponse] in `python-django/architecture/.../pipeline_behavior.py`
- [X] T111 [P] Python BehaviorMatcher protocol in `python-django/architecture/.../behavior_matcher.py`

### UnitOfWork Interface (5 tasks) - MOVED HERE from Phase 3.5
**CRITICAL: These interfaces must exist BEFORE UnitOfWorkBehavior implementations (T122-T126)**
- [X] T112 [P] C# IUnitOfWork interface in `csharp-dotnet/src/.../IUnitOfWork.cs`
- [X] T113 [P] Java UnitOfWork interface in `java-spring/src/main/.../UnitOfWork.java`
- [X] T114 [P] Go UnitOfWork interface in `golang/architecture-shell-cqrs/unit_of_work.go`
- [X] T115 [P] TypeScript IUnitOfWork interface in `typescript-nodejs/architecture-shell-cqrs/src/IUnitOfWork.ts`
- [X] T116 [P] Python UnitOfWork protocol in `python-django/architecture/.../unit_of_work.py`

---

## Phase 3.4: Pipeline Behaviors Implementation (25 tasks)
**Cross-Cutting Concerns: Validation, Authorization, UnitOfWork, Telemetry, Caching**

### Validation Behavior (5 tasks)
- [X] T117 [P] C# ValidationBehavior in `csharp-dotnet/src/.../Behaviors/ValidationBehavior.cs` [REQUIRES: T093]
- [X] T118 [P] Java ValidationBehavior in `java-spring/src/main/.../behaviors/ValidationBehavior.java` [REQUIRES: T095]
- [X] T119 [P] Go validationBehavior in `golang/architecture-shell-cqrs/behaviors/validation_behavior.go` [REQUIRES: T097]
- [X] T120 [P] TypeScript ValidationBehavior in `typescript-nodejs/architecture-shell-cqrs/src/behaviors/ValidationBehavior.ts` [REQUIRES: T099]
- [X] T121 [P] Python ValidationBehavior in `python-django/architecture-shell-cqrs/src/architecture_shell_cqrs/concrete_behaviors/validation_behavior.py` [REQUIRES: T101]

### Authorization Behavior (5 tasks)
- [X] T122 [P] C# AuthorizationBehavior in `csharp-dotnet/src/.../Behaviors/AuthorizationBehavior.cs` [REQUIRES: T093]
- [X] T123 [P] Java AuthorizationBehavior in `java-spring/src/main/.../behaviors/AuthorizationBehavior.java` [REQUIRES: T095]
- [X] T124 [P] Go authorizationBehavior in `golang/architecture-shell-cqrs/behaviors/authorization_behavior.go` [REQUIRES: T097]
- [X] T125 [P] TypeScript AuthorizationBehavior in `typescript-nodejs/architecture-shell-cqrs/src/behaviors/AuthorizationBehavior.ts` [REQUIRES: T099]
- [X] T126 [P] Python AuthorizationBehavior in `python-django/architecture-shell-cqrs/src/architecture_shell_cqrs/concrete_behaviors/authorization_behavior.py` [REQUIRES: T101]

### UnitOfWork Behavior (5 tasks)
- [X] T127 [P] C# UnitOfWorkBehavior in `csharp-dotnet/src/.../Behaviors/UnitOfWorkBehavior.cs` [REQUIRES: T093, T112]
- [X] T128 [P] Java UnitOfWorkBehavior in `java-spring/src/main/.../behaviors/UnitOfWorkBehavior.java` [REQUIRES: T095, T113]
- [X] T129 [P] Go unitOfWorkBehavior in `golang/architecture-shell-cqrs/behaviors/unitofwork_behavior.go` [REQUIRES: T097, T114]
- [X] T130 [P] TypeScript UnitOfWorkBehavior in `typescript-nodejs/architecture-shell-cqrs/src/behaviors/UnitOfWorkBehavior.ts` [REQUIRES: T099, T115]
- [X] T131 [P] Python UnitOfWorkBehavior in `python-django/architecture-shell-cqrs/src/architecture_shell_cqrs/concrete_behaviors/unitofwork_behavior.py` [REQUIRES: T101, T116]

### Telemetry Behavior (5 tasks)
- [X] T132 [P] C# TelemetryBehavior in `csharp-dotnet/src/.../Behaviors/TelemetryBehavior.cs` [REQUIRES: T093]
- [X] T133 [P] Java TelemetryBehavior in `java-spring/src/main/.../behaviors/TelemetryBehavior.java` [REQUIRES: T095]
- [X] T134 [P] Go telemetryBehavior in `golang/architecture-shell-cqrs/behaviors/telemetry_behavior.go` [REQUIRES: T097]
- [X] T135 [P] TypeScript TelemetryBehavior in `typescript-nodejs/architecture-shell-cqrs/src/behaviors/TelemetryBehavior.ts` [REQUIRES: T099]
- [X] T136 [P] Python TelemetryBehavior in `python-django/architecture-shell-cqrs/src/architecture_shell_cqrs/concrete_behaviors/telemetry_behavior.py` [REQUIRES: T101]

### Caching Behavior (5 tasks)
- [X] T137 [P] C# CachingBehavior in `csharp-dotnet/src/.../Behaviors/CachingBehavior.cs` [REQUIRES: T093]
- [X] T138 [P] Java CachingBehavior in `java-spring/src/main/.../behaviors/CachingBehavior.java` [REQUIRES: T095]
- [X] T139 [P] Go cachingBehavior in `golang/architecture-shell-cqrs/behaviors/caching_behavior.go` [REQUIRES: T097]
- [X] T140 [P] TypeScript CachingBehavior in `typescript-nodejs/architecture-shell-cqrs/src/behaviors/CachingBehavior.ts` [REQUIRES: T099]
- [X] T141 [P] Python CachingBehavior in `python-django/architecture-shell-cqrs/src/architecture_shell_cqrs/concrete_behaviors/caching_behavior.py` [REQUIRES: T101]

---

## Phase 3.5: InMemory UnitOfWork for Testing (5 tasks)

### InMemory UnitOfWork (for testing) (5 tasks)
- [X] T142 [P] C# InMemoryUnitOfWork in `csharp-dotnet/tests/.../InMemoryUnitOfWork.cs` [REQUIRES: T112]
- [X] T143 [P] Java InMemoryUnitOfWork in `java-spring/src/test/.../InMemoryUnitOfWork.java` [REQUIRES: T113]
- [X] T144 [P] Go inMemoryUnitOfWork in `golang/architecture-shell-cqrs/tests/in_memory_unitofwork.go` [REQUIRES: T114]
- [X] T145 [P] TypeScript InMemoryUnitOfWork in `typescript-nodejs/architecture-shell-cqrs/tests/InMemoryUnitOfWork.ts` [REQUIRES: T115]
- [X] T146 [P] Python InMemoryUnitOfWork in `python-django/architecture-shell-cqrs/tests/in_memory_unitofwork.py` [REQUIRES: T116]

---

## Phase 3.6: Integration Tests (35 tasks)
**CRITICAL: These tests validate end-to-end behavior**

### IT-001: Command Execution Lifecycle (5 tests)
- [X] T147 [P] C# test: `Should_CommitTransaction_When_CommandSucceeds` in `csharp-dotnet/tests/.../CommandExecutionTests.cs` [REQUIRES: T093, T127, T142]
- [X] T148 [P] Java test: `Should_CommitTransaction_When_CommandSucceeds` in `java-spring/src/test/.../CommandExecutionTests.java` [REQUIRES: T095, T128, T143]
- [X] T149 [P] Go test: `Should_CommitTransaction_When_CommandSucceeds` in `golang/architecture-shell-cqrs/tests/command_execution_test.go` [REQUIRES: T097, T129, T144]
- [X] T150 [P] TypeScript test: `Should_CommitTransaction_When_CommandSucceeds` in `typescript-nodejs/architecture-shell-cqrs/tests/commandExecution.test.ts` [REQUIRES: T099, T130, T145]
- [X] T151 [P] Python test: `Should_CommitTransaction_When_CommandSucceeds` in `python-django/tests/.../test_command_execution.py` [REQUIRES: T101, T131, T146]

### IT-002: Command Execution Rollback (5 tests)
- [X] T152 [P] C# test: `Should_RollbackTransaction_When_CommandThrowsException` [REQUIRES: T147]
- [X] T153 [P] Java test: `Should_RollbackTransaction_When_CommandThrowsException` [REQUIRES: T148]
- [X] T154 [P] Go test: `Should_RollbackTransaction_When_CommandThrowsException` [REQUIRES: T149]
- [X] T155 [P] TypeScript test: `Should_RollbackTransaction_When_CommandThrowsException` [REQUIRES: T150]
- [X] T156 [P] Python test: `Should_RollbackTransaction_When_CommandThrowsException` [REQUIRES: T151]

### IT-003: Nested Command Transaction Reuse (5 tests)
- [X] T157 [P] C# test: `Should_ShareTransaction_When_NestedCommandCalled` [REQUIRES: T147]
- [X] T158 [P] Java test: `Should_ShareTransaction_When_NestedCommandCalled` [REQUIRES: T148]
- [X] T159 [P] Go test: `Should_ShareTransaction_When_NestedCommandCalled` [REQUIRES: T149]
- [X] T160 [P] TypeScript test: `Should_ShareTransaction_When_NestedCommandCalled` [REQUIRES: T150]
- [X] T161 [P] Python test: `Should_ShareTransaction_When_NestedCommandCalled` [REQUIRES: T151]

### IT-004: Query Execution Without Transaction (5 tests)
- [X] T162 [P] C# test: `Should_SkipTransactionManagement_When_QueryExecutes` [REQUIRES: T093]
- [X] T163 [P] Java test: `Should_SkipTransactionManagement_When_QueryExecutes` [REQUIRES: T095]
- [X] T164 [P] Go test: `Should_SkipTransactionManagement_When_QueryExecutes` [REQUIRES: T097]
- [X] T165 [P] TypeScript test: `Should_SkipTransactionManagement_When_QueryExecutes` [REQUIRES: T099]
- [X] T166 [P] Python test: `Should_SkipTransactionManagement_When_QueryExecutes` [REQUIRES: T101]

### IT-005: Query Caching Behavior (5 tests)
- [X] T167 [P] C# test: `Should_ReturnCachedResult_When_QueryExecutedTwice` [REQUIRES: T137]
- [X] T168 [P] Java test: `Should_ReturnCachedResult_When_QueryExecutedTwice` [REQUIRES: T138]
- [X] T169 [P] Go test: `Should_ReturnCachedResult_When_QueryExecutedTwice` [REQUIRES: T139]
- [X] T170 [P] TypeScript test: `Should_ReturnCachedResult_When_QueryExecutedTwice` [REQUIRES: T140]
- [X] T171 [P] Python test: `Should_ReturnCachedResult_When_QueryExecutedTwice` [REQUIRES: T141]

### IT-006: Telemetry Logging (5 tests)
- [X] T172 [P] C# test: `Should_LogDurationAndStatus_When_RequestProcessed` [REQUIRES: T132]
- [X] T173 [P] Java test: `Should_LogDurationAndStatus_When_RequestProcessed` [REQUIRES: T133]
- [X] T174 [P] Go test: `Should_LogDurationAndStatus_When_RequestProcessed` [REQUIRES: T134]
- [X] T175 [P] TypeScript test: `Should_LogDurationAndStatus_When_RequestProcessed` [REQUIRES: T135]
- [X] T176 [P] Python test: `Should_LogDurationAndStatus_When_RequestProcessed` [REQUIRES: T136]

### IT-007: Validation Behavior Short-Circuit (5 tests)
- [X] T177 [P] C# test: `Should_AbortExecution_When_ValidationFails` [REQUIRES: T117]
- [X] T178 [P] Java test: `Should_AbortExecution_When_ValidationFails` [REQUIRES: T118]
- [X] T179 [P] Go test: `Should_AbortExecution_When_ValidationFails` [REQUIRES: T119]
- [X] T180 [P] TypeScript test: `Should_AbortExecution_When_ValidationFails` [REQUIRES: T120]
- [X] T181 [P] Python test: `Should_AbortExecution_When_ValidationFails` [REQUIRES: T121]

### IT-008: Transaction Commit on Business Failure (5 tests)
**Purpose**: Validate BR-008 requirement that Result.Failure() triggers transaction commit (not rollback)
- [X] T211 [P] C# test: `Should_CommitTransaction_When_HandlerReturnsResultFailure` in `csharp-dotnet/tests/.../CommandExecutionTests.cs` per CONTRACT_TESTS.md IT-008 [REQUIRES: T147]
- [X] T212 [P] Java test: `Should_CommitTransaction_When_HandlerReturnsResultFailure` in `java-spring/src/test/.../CommandExecutionTests.java` per CONTRACT_TESTS.md IT-008 [REQUIRES: T148]
- [X] T213 [P] Go test: `Should_CommitTransaction_When_HandlerReturnsResultFailure` in `golang/architecture-shell-cqrs/tests/command_execution_test.go` per CONTRACT_TESTS.md IT-008 [REQUIRES: T149]
- [X] T214 [P] TypeScript test: `Should_CommitTransaction_When_HandlerReturnsResultFailure` in `typescript-nodejs/architecture-shell-cqrs/tests/commandExecution.test.ts` per CONTRACT_TESTS.md IT-008 [REQUIRES: T150]
- [X] T215 [P] Python test: `Should_CommitTransaction_When_HandlerReturnsResultFailure` in `python-django/tests/.../test_command_execution.py` per CONTRACT_TESTS.md IT-008 [REQUIRES: T151]

### IT-008b: Transaction Commit on Business Failure (Void Commands) (5 tests)
**Purpose**: Validate BR-008 requirement for void commands returning Result<Unit>.Failure() (extends IT-008 coverage)
- [X] T211b [P] C# test: `Should_CommitTransaction_When_VoidCommandHandlerReturnsResultFailure` in `csharp-dotnet/tests/.../CommandExecutionTests.cs` per CONTRACT_TESTS.md IT-008b [REQUIRES: T147]
- [X] T212b [P] Java test: `Should_CommitTransaction_When_VoidCommandHandlerReturnsResultFailure` in `java-spring/src/test/.../CommandExecutionTests.java` per CONTRACT_TESTS.md IT-008b [REQUIRES: T148]
- [X] T213b [P] Go test: `Should_CommitTransaction_When_VoidCommandHandlerReturnsResultFailure` in `golang/architecture-shell-cqrs/tests/command_execution_test.go` per CONTRACT_TESTS.md IT-008b [REQUIRES: T149]
- [X] T214b [P] TypeScript test: `Should_CommitTransaction_When_VoidCommandHandlerReturnsResultFailure` in `typescript-nodejs/architecture-shell-cqrs/tests/commandExecution.test.ts` per CONTRACT_TESTS.md IT-008b [REQUIRES: T150]
- [X] T215b [P] Python test: `Should_CommitTransaction_When_VoidCommandHandlerReturnsResultFailure` in `python-django/tests/.../test_command_execution.py` per CONTRACT_TESTS.md IT-008b [REQUIRES: T151]

### IT-009: Transaction Provider Failure (5 tests)
**Purpose**: Validate BR-006 requirement that UnitOfWork fails fast when BeginTransactionAsync() throws (connection pool exhaustion, database unavailability)
- [X] T216 [P] C# test: `Should_ThrowException_When_TransactionProviderFails` in `csharp-dotnet/tests/.../UnitOfWorkBehaviorTests.cs` per spec.md BR-006 [REQUIRES: T127]
- [X] T217 [P] Java test: `Should_ThrowException_When_TransactionProviderFails` in `java-spring/src/test/.../UnitOfWorkBehaviorTests.java` per spec.md BR-006 [REQUIRES: T128]
- [X] T218 [P] Go test: `Should_ThrowException_When_TransactionProviderFails` in `golang/architecture-shell-cqrs/tests/unitofwork_behavior_test.go` per spec.md BR-006 [REQUIRES: T129]
- [X] T219 [P] TypeScript test: `Should_ThrowException_When_TransactionProviderFails` in `typescript-nodejs/architecture-shell-cqrs/tests/unitofworkBehavior.test.ts` per spec.md BR-006 [REQUIRES: T130]
- [X] T220 [P] Python test: `Should_ThrowException_When_TransactionProviderFails` in `python-django/tests/.../test_unitofwork_behavior.py` per spec.md BR-006 [REQUIRES: T131]

### IT-010: Behavior Exception Rollback (5 tests) - NEW
**Purpose**: Validate spec.md edge case "behavior throws exception" triggers transaction rollback (extends IT-002 beyond handler exceptions)
- [X] T221 [P] C# test: `Should_RollbackTransaction_When_BehaviorThrowsException` in `csharp-dotnet/tests/.../CommandExecutionTests.cs` per spec.md:L68-69 [REQUIRES: T147]
- [X] T222 [P] Java test: `Should_RollbackTransaction_When_BehaviorThrowsException` in `java-spring/src/test/.../CommandExecutionTests.java` per spec.md:L68-69 [REQUIRES: T148]
- [X] T223 [P] Go test: `Should_RollbackTransaction_When_BehaviorThrowsException` in `golang/architecture-shell-cqrs/tests/command_execution_test.go` per spec.md:L68-69 [REQUIRES: T149]
- [X] T224 [P] TypeScript test: `Should_RollbackTransaction_When_BehaviorThrowsException` in `typescript-nodejs/architecture-shell-cqrs/tests/commandExecution.test.ts` per spec.md:L68-69 [REQUIRES: T150]
- [X] T225 [P] Python test: `Should_RollbackTransaction_When_BehaviorThrowsException` in `python-django/tests/.../test_command_execution.py` per spec.md:L68-69 [REQUIRES: T151]

---

## Phase 3.7: DI Registration and Configuration (5 tasks)

### Dependency Injection Setup (5 tasks)
- [X] T182 C# AddCqrs extension method in `csharp-dotnet/src/.../ServiceCollectionExtensions.cs` [REQUIRES: T093-T146]
- [X] T183 Java CqrsConfiguration class in `java-spring/src/main/.../config/CqrsConfiguration.java` [REQUIRES: T095-T146]
- [X] T184 Go WireCqrs function in `golang/architecture-shell-cqrs/wire.go` [REQUIRES: T097-T146]
- [X] T185 TypeScript CqrsModule for InversifyJS in `typescript-nodejs/architecture-shell-cqrs/src/CqrsModule.ts` [REQUIRES: T099-T146]
- [X] T186 Python setup_cqrs function in `python-django/architecture/.../setup.py` [REQUIRES: T101-T146] (N/A - Python uses __init__.py exports)

---

## Phase 3.8: Quickstart Validation (5 tasks)

### Integration Example Tests (5 tests)
- [X] T187 [P] C# quickstart validation test in `csharp-dotnet/tests/.../QuickstartTests.cs` [REQUIRES: T182]
- [X] T188 [P] Java quickstart validation test in `java-spring/src/test/.../QuickstartTests.java` [REQUIRES: T183]
- [X] T189 [P] Go quickstart validation test in `golang/architecture-shell-cqrs/tests/quickstart_test.go` [REQUIRES: T184]
- [X] T190 [P] TypeScript quickstart validation test in `typescript-nodejs/architecture-shell-cqrs/tests/quickstart.test.ts` [REQUIRES: T185]
- [X] T191 [P] Python quickstart validation test in `python-django/tests/.../test_quickstart.py` [REQUIRES: T186] (N/A - covered by integration tests)

---

## Phase 3.9: Polish (14 tasks)

### Documentation (5 tasks)
- [X] T192 [P] C# XML documentation comments for all public interfaces [REQUIRES: T182]
- [X] T193 [P] Java Javadoc comments for all public interfaces [REQUIRES: T183]
- [X] T194 [P] Go godoc comments for all exported types in golang/architecture-shell-cqrs/ [REQUIRES: T184]
- [X] T195 [P] TypeScript TSDoc comments for all public interfaces [REQUIRES: T185]
- [X] T196 [P] Python docstrings for all public classes [REQUIRES: T186] (Already present in all implementation files)

### Performance Validation (5 tasks)
**Note**: NFR-001 requires performance benchmarks but does NOT mandate specific latency thresholds. Tests measure and report mediator overhead for developer assessment.

**Acceptance Criteria** (applies to T197-T201):

**Performance Metrics** (Informational - no pass/fail thresholds per NFR-001):
- **Measurement Target**: Mediator overhead = pipeline execution time EXCLUDING handler logic (isolate framework cost)
- **Test Scenario**: Execute 1000 iterations of no-op command through full pipeline (ValidationBehavior + AuthorizationBehavior + UnitOfWorkBehavior + TelemetryBehavior with mock implementations)
- **Required Metrics**: Report p50 (median), p95, p99 latencies in milliseconds
- **Pass Condition**: Benchmark completes successfully and outputs statistical summary to test logs
- **Documentation**: Test output MUST include language runtime version, hardware specs (CPU/RAM), and timestamp for reproducibility

**Functional Validation** (Blocking - must pass per NFR-002/BR-002):
- **TransactionId Validation**: Verify telemetry logs for all 1000 command executions include non-null TransactionId field per BR-002 and NFR-002 requirement. Assert `telemetryEntries.All(e => e.TransactionId != null)` for commands (TransactionId NOT required for queries). This is a functional requirement, NOT a performance threshold.

- [X] T197 [P] C# performance tests: measure mediator overhead per acceptance criteria above + validate TransactionId logging for all command executions [REQUIRES: T187]
- [X] T198 [P] Java performance tests: measure mediator overhead per acceptance criteria above + validate TransactionId logging for all command executions [REQUIRES: T188]
- [X] T199 [P] Go performance tests in golang/architecture-shell-cqrs/tests/performance_test.go: measure mediator overhead per acceptance criteria above + validate TransactionId logging for all command executions [REQUIRES: T189]
- [X] T200 [P] TypeScript performance tests: measure mediator overhead per acceptance criteria above + validate TransactionId logging for all command executions [REQUIRES: T190]
- [X] T201 [P] Python performance tests: measure mediator overhead per acceptance criteria above + validate TransactionId logging for all command executions [REQUIRES: T191]

### Architecture Compliance Tests (5 tasks) - BLOCKING GATE
**CRITICAL: These tests MUST pass before final validation per spec.md:L72-73 constitutional requirement**

- [X] T206 [P] C# architecture test: `Should_NotCallRepositoryWriteMethods_When_QueryHandlerExecutes` in `csharp-dotnet/tests/Architecture.Shell.Cqrs.Tests/ArchitectureTests.cs` using NetArchTest per CONTRACT_TESTS.md AT-001 [REQUIRES: T187, T197]
- [X] T207 [P] Java architecture test: `Should_NotCallRepositoryWriteMethods_When_QueryHandlerExecutes` in `java-spring/src/test/java/arch/shell/cqrs/ArchitectureTests.java` using ArchUnit per CONTRACT_TESTS.md AT-001 [REQUIRES: T188, T198]
- [X] T208 [P] Go architecture test: `Should_NotCallRepositoryWriteMethods_When_QueryHandlerExecutes` in `golang/architecture-shell-cqrs/tests/architecture_test.go` using go/ast parser per CONTRACT_TESTS.md AT-001 [REQUIRES: T189, T199]
- [X] T209 [P] TypeScript architecture test: `Should_NotCallRepositoryWriteMethods_When_QueryHandlerExecutes` in `typescript-nodejs/architecture-shell-cqrs/tests/architecture.test.ts` using TypeScript Compiler API per CONTRACT_TESTS.md AT-001 [REQUIRES: T190, T200]
- [X] T210 [P] Python architecture test: `Should_NotCallRepositoryWriteMethods_When_QueryHandlerExecutes` in `python-django/tests/shell/cqrs/test_architecture.py` using ast.NodeVisitor per CONTRACT_TESTS.md AT-001 [REQUIRES: T191, T201]

---

## Phase 3.11: Final Validation (4 tasks)
**CONSTITUTIONAL GATE: AT-001 architecture tests (T206-T210) MUST pass before final validation per Constitution Section II and Section III (all tests pass before task completion)**

- [X] T202 Run all C# tests: `dotnet test` in `csharp-dotnet/` - verify 100% pass rate INCLUDING AT-001 architecture test compliance [REQUIRES: T206]
- [X] T203 Run all Java tests: `mvn test` in `java-spring/` - verify 100% pass rate INCLUDING AT-001 architecture test compliance [REQUIRES: T207]
- [X] T204 Run all Go tests: `go test ./...` in `golang/architecture-shell-cqrs/` - verify 100% pass rate INCLUDING AT-001 architecture test compliance [REQUIRES: T208]
- [X] T205 Run TypeScript+Python tests - verify 100% pass rate INCLUDING AT-001 architecture test compliance [REQUIRES: T209, T210]

---

## Dependencies Summary

### Phase Dependencies
- **Setup (T001-T025)** → Can all run in parallel
- **Unit Tests (T026-T056)** → Require setup complete → Can run in parallel
- **Core Interfaces (T057-T111)** → Require unit tests failing → Most can run in parallel
- **Mediator Implementation (T093, T095, T097, T099, T101)** → Require interfaces → Sequential per language
- **Behaviors (T112-T141)** → Require mediator → Can run in parallel
- **Integration Tests (T147-T181)** → Require behaviors → Can run in parallel within test suites
- **DI Registration (T182-T186)** → Require all implementations → Sequential
- **Quickstart (T187-T191)** → Require DI registration → Can run in parallel
- **Polish (T192-T205)** → Require quickstart validation → Can run in parallel

### Critical Path (Sequential Tasks)
```
Setup (any language) → Unit Tests → Core Interfaces → Mediator Implementation →
Behaviors → Integration Tests → DI Registration → Quickstart → Final Validation
```

### Maximum Parallelization Strategy
```
# Phase 3.1: Setup (launch all 25 tasks)
Task: "Create C# project structure"
Task: "Create Java project structure"
Task: "Create Go project structure"
Task: "Create TypeScript project structure"
Task: "Create Python project structure"
... (20 more setup tasks)

# Phase 3.2: Unit Tests (launch 30 tests after setup)
Task: "C# test: Should_ThrowException_When_ZeroHandlersRegistered"
Task: "Java test: Should_ThrowException_When_ZeroHandlersRegistered"
... (28 more unit tests)

# Phase 3.3: Core Interfaces (launch 40 tasks after tests fail)
Task: "C# IBaseRequest interface"
Task: "Java BaseRequest interface"
... (38 more interface tasks)

# Continue pattern through all phases
```

---

## Notes
- **[P] tasks** = different files, no dependencies within phase
- Verify unit tests **fail** before implementing interfaces
- Verify integration tests **pass** after all implementations
- Commit after completing each phase
- Run tests continuously during implementation

---

## Task Generation Rules Applied
1. **From Contracts**: CONTRACT_TESTS.md → 65 contract tests (UT-001 to IT-007)
2. **From Data Model**: data-model.md → 13 core types × 5 languages = 65 implementation tasks
3. **From Quickstart**: quickstart.md → 5 integration validation tests
4. **Ordering**: Setup → Tests → Interfaces → Mediator → Behaviors → Integration → DI → Validation → Polish

---

## Validation Checklist
- [x] All contract tests (13) have implementations across 5 languages (65 tests total)
- [x] All core types (13) have interface definitions across 5 languages (65 types total)
- [x] All unit tests (UT-001 to UT-006) come before implementation
- [x] All integration tests (IT-001 to IT-007) come after implementation
- [x] Parallel tasks ([P]) are truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Dependencies are explicitly marked with [REQUIRES: T###]
- [x] Test-first approach enforced (tests before implementation)
- [x] Cross-language consistency maintained (same test names across languages)
- [x] Architecture compliance tests (AT-001) are blocking gates for final validation per Constitution Section II (CQRS enforcement) and Section III (all tests pass before completion)

---

**READY FOR EXECUTION**: All 250 tasks generated, dependency-ordered, and validated against constitutional requirements.

**Post-Analyze Updates**:
- Added UT-007 (T061b-T061f): BehaviorMatcher type guard validation (resolves /analyze finding C1)
- Added UT-008 (T061g-T061k): Behavior order warning logging validation (resolves /analyze finding C2)
- Clarified performance vs functional acceptance criteria in T197-T201 (resolves /analyze finding A2)
- Total task count updated from 240 → 250