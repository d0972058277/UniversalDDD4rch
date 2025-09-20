# Tasks: Architecture.Core - DDD Abstractions and Functional Types

**Input**: Design documents from `/specs/001-architecture-core-ddd/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: C# .NET 8 LTS, pure BCL, xUnit testing
   → Structure: Single project DDD architecture
2. Load design documents ✅:
   → data-model.md: 8 core types identified
   → contracts/: 1 contract file with all type definitions
   → research.md: Technical decisions for BCL implementation
3. Generate tasks by category ✅:
   → Setup: Project structure, dependencies, analyzers
   → Tests: Contract tests, monadic law tests, integration tests
   → Core: Functional types, DDD abstractions, repositories
   → Integration: Test infrastructure, performance benchmarks
   → Polish: Documentation, examples, validation
4. Apply task rules ✅:
   → Different files = [P] for parallel execution
   → TDD approach: Tests before implementation
   → Dependency order: Functional types → Base classes → Aggregates
5. Tasks numbered T001-T042 ✅
6. Dependencies and parallel execution defined ✅
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All paths use absolute file paths from repository root

## Path Conventions (DDD Architecture - Single Project)
- **Source**: `src/Architecture.Core/`
- **Tests**: `tests/Architecture.Core.Tests/`
- **Examples**: `examples/QuickstartExample/`
- **Benchmarks**: `benchmarks/Architecture.Core.Benchmarks/`

## Phase 3.1: Setup

- [x] **T001** Create .NET 8 project structure for Architecture.Core at `csharp-dotnet/src/Architecture.Core/Architecture.Core.csproj`
- [x] **T002** Create test project structure at `csharp-dotnet/tests/Architecture.Core.Tests/Architecture.Core.Tests.csproj` with xUnit dependencies
- [x] **T003** [P] Configure EditorConfig, Directory.Build.props for warnings-as-errors and C# 12 features
- [x] **T004** [P] Create benchmark project at `csharp-dotnet/benchmarks/Architecture.Core.Benchmarks/Architecture.Core.Benchmarks.csproj` with BenchmarkDotNet
- [x] **T005** [P] Create example project at `csharp-dotnet/examples/QuickstartExample/QuickstartExample.csproj` referencing Architecture.Core

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
**Test naming: Should_ExpectedBehavior_When_StateUnderTest**
**Test structure: Given-When-Then blocks with explicit comments**

### Functional Types Contract Tests
- [x] **T006** [P] Result struct contract tests in `csharp-dotnet/tests/Architecture.Core.Tests/Functional/ResultTests.cs`
- [x] **T007** [P] Result<T> struct contract tests in `csharp-dotnet/tests/Architecture.Core.Tests/Functional/ResultOfTTests.cs`
- [x] **T008** [P] Error struct contract tests in `csharp-dotnet/tests/Architecture.Core.Tests/Functional/ErrorTests.cs`
- [x] **T009** [P] Maybe<T> struct contract tests in `csharp-dotnet/tests/Architecture.Core.Tests/Functional/MaybeTests.cs`

### Monadic Laws Tests
- [x] **T010** [P] Result monadic laws tests (Left Identity, Right Identity, Associativity) in `csharp-dotnet/tests/Architecture.Core.Tests/Functional/ResultMonadicLawsTests.cs`
- [x] **T011** [P] Maybe monadic laws tests (Left Identity, Right Identity, Associativity) in `csharp-dotnet/tests/Architecture.Core.Tests/Functional/MaybeMonadicLawsTests.cs`

### DDD Abstractions Contract Tests
- [x] **T012** [P] ValueObject equality contract tests in `tests/Architecture.Core.Tests/Domain/ValueObjectTests.cs`
- [x] **T013** [P] Entity<TId> identity equality tests in `tests/Architecture.Core.Tests/Domain/EntityTests.cs`
- [x] **T014** [P] AggregateRoot<TId> event collection tests in `tests/Architecture.Core.Tests/Domain/AggregateRootTests.cs`
- [x] **T015** [P] DomainEventBase metadata handling tests in `tests/Architecture.Core.Tests/Domain/DomainEventBaseTests.cs`
- [x] **T016** [P] IRepository<TAggregate,TId> interface contract tests in `tests/Architecture.Core.Tests/Domain/RepositoryTests.cs`

### Integration Scenario Tests
- [x] **T017** [P] Order domain quickstart scenario test in `tests/Architecture.Core.Tests/Integration/QuickstartScenarioTests.cs`
- [x] **T018** [P] ValueObject multi-field equality scenarios in `tests/Architecture.Core.Tests/Integration/ValueObjectEqualityScenarios.cs`
- [x] **T019** [P] Aggregate event correlation chain tests in `tests/Architecture.Core.Tests/Integration/EventCorrelationTests.cs`

## Phase 3.3: Core Implementation (ONLY after tests are failing)
**DDD Implementation Order: Functional Types → Domain Base Classes → Repository Interfaces**

### Functional Types Implementation
- [x] **T020** [P] Error struct implementation in `src/Architecture.Core/Functional/Error.cs`
- [x] **T021** [P] ErrorCategory enum in `src/Architecture.Core/Functional/ErrorCategory.cs`
- [x] **T022** Result struct implementation in `src/Architecture.Core/Functional/Result.cs` (depends on T020)
- [x] **T023** Result<T> struct implementation in `src/Architecture.Core/Functional/ResultOfT.cs` (depends on T020, T022)
- [x] **T024** [P] Maybe<T> struct implementation in `src/Architecture.Core/Functional/Maybe.cs`

### Domain Base Classes Implementation
- [x] **T025** [P] IDomainEvent interface in `src/Architecture.Core/Domain/Events/IDomainEvent.cs`
- [x] **T026** DomainEventBase abstract class in `src/Architecture.Core/Domain/Events/DomainEventBase.cs` (depends on T025)
- [x] **T027** [P] IEntity<TId> interface in `src/Architecture.Core/Domain/Entities/IEntity.cs`
- [x] **T028** Entity<TId> abstract class in `src/Architecture.Core/Domain/Entities/Entity.cs` (depends on T027)
- [x] **T029** ValueObject abstract class in `src/Architecture.Core/Domain/ValueObjects/ValueObject.cs`
- [x] **T030** [P] IAggregateRoot<TId> interface in `src/Architecture.Core/Domain/Aggregates/IAggregateRoot.cs`
- [x] **T031** AggregateRoot<TId> abstract class in `src/Architecture.Core/Domain/Aggregates/AggregateRoot.cs` (depends on T028, T030, T025)

### Repository Interfaces Implementation
- [x] **T032** [P] IRepository<TAggregate,TId> interface in `src/Architecture.Core/Domain/Repositories/IRepository.cs` (depends on T030, T022, T024)

## Phase 3.4: Integration & Infrastructure

### Test Infrastructure
- [x] **T033** [P] Test data builders in `tests/Architecture.Core.Tests/Builders/TestDataBuilders.cs`
- [x] **T034** [P] Custom assertion extensions in `tests/Architecture.Core.Tests/Extensions/AssertionExtensions.cs`

### Example Implementation
- [x] **T035** Order domain example implementation in `examples/QuickstartExample/Domain/` (Money, CustomerId, Order, Events)
- [x] **T036** Order repository example in `examples/QuickstartExample/Repositories/IOrderRepository.cs`
- [x] **T037** Quickstart program demonstrating all scenarios in `examples/QuickstartExample/Program.cs`

## Phase 3.5: Performance & Polish

### Performance Benchmarks
- [x] **T038** [P] ValueObject equality performance benchmarks in `benchmarks/Architecture.Core.Benchmarks/ValueObjectEqualityBenchmarks.cs`
- [x] **T039** [P] Result/Maybe allocation benchmarks in `benchmarks/Architecture.Core.Benchmarks/FunctionalTypesAllocationBenchmarks.cs`

### Documentation & Validation
- [x] **T040** [P] XML documentation comments for all public APIs
- [x] **T041** [P] README.md with usage examples and getting started guide
- [x] **T042** Run all tests, verify 100% pass rate, and validate quickstart example execution

## Dependencies

### Critical Path Dependencies
1. **Setup** (T001-T005) → **Tests** (T006-T019)
2. **Error/ErrorCategory** (T020-T021) → **Result Types** (T022-T023)
3. **Base Interfaces** (T025, T027, T030) → **Abstract Classes** (T026, T028, T031)
4. **Domain Types** (T025-T031) → **Repository Interface** (T032)
5. **Core Implementation** (T020-T032) → **Examples** (T035-T037)
6. **All Implementation** → **Performance & Polish** (T038-T042)

### Parallel Execution Groups
```
Group 1 - Setup: T003, T004, T005
Group 2 - Contract Tests: T006, T007, T008, T009
Group 3 - Monadic Laws: T010, T011
Group 4 - Domain Tests: T012, T013, T014, T015, T016
Group 5 - Integration Tests: T017, T018, T019
Group 6 - Independent Types: T020, T021, T024, T025, T027, T029, T030
Group 7 - Test Infrastructure: T033, T034
Group 8 - Performance: T038, T039
Group 9 - Documentation: T040, T041
```

## Parallel Execution Examples

### Launch Contract Tests Together (After T005):
```bash
# All contract tests can run in parallel - different files
Task: "Result struct contract tests in tests/Architecture.Core.Tests/Functional/ResultTests.cs"
Task: "Result<T> struct contract tests in tests/Architecture.Core.Tests/Functional/ResultOfTTests.cs"
Task: "Error struct contract tests in tests/Architecture.Core.Tests/Functional/ErrorTests.cs"
Task: "Maybe<T> struct contract tests in tests/Architecture.Core.Tests/Functional/MaybeTests.cs"
```

### Launch Independent Type Implementations (After T019):
```bash
# Independent types - no cross-dependencies
Task: "Error struct implementation in src/Architecture.Core/Functional/Error.cs"
Task: "ErrorCategory enum in src/Architecture.Core/Functional/ErrorCategory.cs"
Task: "Maybe<T> struct implementation in src/Architecture.Core/Functional/Maybe.cs"
Task: "IDomainEvent interface in src/Architecture.Core/Domain/Events/IDomainEvent.cs"
Task: "IEntity<TId> interface in src/Architecture.Core/Domain/Entities/IEntity.cs"
```

## Key Implementation Notes

### Constitutional Compliance
- **TDD Mandatory**: All tests (T006-T019) MUST be written and failing before implementation (T020-T032)
- **Given-When-Then**: All test methods must include explicit comment blocks for each section
- **Monadic Laws**: Result and Maybe types must pass Left Identity, Right Identity, and Associativity tests
- **Pure BCL**: Zero external runtime dependencies in core library

### Performance Requirements
- **Struct-based**: Result, Maybe, and Error must be readonly structs to avoid allocations
- **Equality Optimization**: ValueObject equality must use component enumeration with caching
- **Async Patterns**: Repository interface must follow .NET async best practices with ConfigureAwait(false)

### Multi-Language Consistency
- **API Contracts**: Maintain identical behavioral contracts across language implementations
- **Error Categories**: Use consistent error categorization (Domain, Validation, Infrastructure, Concurrency, Security)
- **Naming Conventions**: Follow C# conventions while maintaining architectural alignment

## Task Validation Checklist
*All requirements verified during task generation*

- [x] All contract types have corresponding test tasks (T006-T016)
- [x] All domain entities have implementation tasks (T025-T032)
- [x] All tests come before implementation (T006-T019 → T020-T032)
- [x] Parallel tasks are truly independent (different files, no shared state)
- [x] Each task specifies exact absolute file path
- [x] No task modifies same file as another [P] task
- [x] Monadic laws explicitly tested (T010-T011)
- [x] Integration scenarios cover quickstart examples (T017-T019)
- [x] Performance benchmarks included (T038-T039)

---

**Total Tasks**: 42
**Estimated Effort**: 15-20 development days
**Critical Path**: T001 → T006-T019 → T020-T021 → T022-T023 → T025-T031 → T032 → T035-T037 → T042