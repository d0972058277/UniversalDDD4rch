# Tasks: Architecture.Core Java Spring Implementation

**Input**: Design documents from `/Users/porridg3/GitHub/UniversalDDD4rch/specs/001-architecture-core-ddd/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/core-types-contract.java

## Execution Flow (main)
```
1. Load plan.md: Java 21 LTS with Spring Boot integration packages
2. Load data-model.md: 7 core types (EntityId, Entity, AggregateRoot, ValueObject, DomainEvent, Repository, Result/Maybe/Error)
3. Load contracts/core-types-contract.java: API compliance contracts
4. Load quickstart.md: Complete Order management example with TDD structure
5. Generate 48 tasks across 5 phases: Setup → Tests → Core → Integration → Polish
6. Apply TDD ordering: All tests before implementation
7. Mark parallel tasks [P] for independent file operations
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions (Java Spring)
- **Core library**: `java-spring/architecture-core/src/main/java/com/architecture/core/`
- **Tests**: `java-spring/architecture-core/src/test/java/com/architecture/core/`
- **Spring integration**: `java-spring/architecture-core-spring/src/main/java/com/architecture/core/spring/`
- **Examples**: `java-spring/examples/quickstart/src/main/java/`

## Phase 3.1: Setup (T001-T005)
- [X] T001 Create Java Spring project structure following plan.md requirements in /java-spring/
- [X] T002 Initialize Maven multi-module project with Java 21 LTS and Spring Boot 3.x dependencies
- [X] T003 [P] Configure Maven build configuration with compiler settings in architecture-core/pom.xml
- [X] T004 [P] Configure Maven build configuration with Spring dependencies in architecture-core-spring/pom.xml
- [X] T005 [P] Configure checkstyle and spotbugs linting tools in parent pom.xml

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
**Test naming: Should_ExpectedBehavior_When_StateUnderTest**
**Test structure: Given-When-Then blocks with explicit comments**

### Core Contract Tests (T006-T013)
- [X] T006 [P] Contract test EntityId interface compliance in src/test/java/com/architecture/core/domain/EntityIdContractTest.java
- [X] T007 [P] Contract test Entity identity equality in src/test/java/com/architecture/core/domain/EntityContractTest.java
- [X] T008 [P] Contract test AggregateRoot version control in src/test/java/com/architecture/core/domain/AggregateRootContractTest.java
- [X] T009 [P] Contract test ValueObject structural equality in src/test/java/com/architecture/core/domain/ValueObjectContractTest.java
- [X] T010 [P] Contract test DomainEvent metadata requirements in src/test/java/com/architecture/core/domain/DomainEventContractTest.java
- [X] T011 [P] Contract test Repository async operations in src/test/java/com/architecture/core/domain/RepositoryContractTest.java
- [X] T012 [P] Contract test Result monadic laws compliance in src/test/java/com/architecture/core/functional/ResultContractTest.java
- [X] T013 [P] Contract test Maybe monadic laws compliance in src/test/java/com/architecture/core/functional/MaybeContractTest.java

### Functional Type Tests (T014-T018)
- [X] T014 [P] Unit tests for Error categorization and metadata in src/test/java/com/architecture/core/functional/ErrorTest.java
- [X] T015 [P] Unit tests for Result map/bind/match operations in src/test/java/com/architecture/core/functional/ResultTest.java
- [X] T016 [P] Unit tests for Maybe map/bind/orElse operations in src/test/java/com/architecture/core/functional/MaybeTest.java
- [X] T017 [P] Unit tests for CancellationToken behavior in src/test/java/com/architecture/core/infrastructure/CancellationTokenTest.java
- [X] T018 [P] Unit tests for Result-Maybe conversions in src/test/java/com/architecture/core/functional/ConversionTest.java

### Integration Tests for Quickstart Example (T019-T022)
- [X] T019 [P] Integration test OrderId validation and comparison in src/test/java/com/architecture/core/integration/OrderIdIntegrationTest.java
- [X] T020 [P] Integration test Money value object operations in src/test/java/com/architecture/core/integration/MoneyIntegrationTest.java
- [X] T021 [P] Integration test Order aggregate lifecycle in src/test/java/com/architecture/core/integration/OrderAggregateIntegrationTest.java
- [X] T022 [P] Integration test Order repository operations in src/test/java/com/architecture/core/integration/OrderRepositoryIntegrationTest.java

## Phase 3.3: Core Implementation (ONLY after tests are failing)
**DDD Layer Implementation Order: Domain → Application → Infrastructure → Presentation**

### Functional Types (T023-T027)
- [X] T023 [P] Error class with categorization in src/main/java/com/architecture/core/functional/Error.java
- [X] T024 [P] ErrorCategory enum with display names in src/main/java/com/architecture/core/functional/ErrorCategory.java
- [X] T025 [P] Result<T> class with monadic operations in src/main/java/com/architecture/core/functional/Result.java
- [X] T026 [P] Maybe<T> class with optional value semantics in src/main/java/com/architecture/core/functional/Maybe.java
- [X] T027 [P] ResultException wrapper class in src/main/java/com/architecture/core/functional/ResultException.java

### Infrastructure Support (T028-T030)
- [X] T028 [P] CancellationToken interface in src/main/java/com/architecture/core/infrastructure/CancellationToken.java
- [X] T029 [P] OperationCancelledException class in src/main/java/com/architecture/core/infrastructure/OperationCancelledException.java
- [X] T030 [P] NonCancellationToken implementation in src/main/java/com/architecture/core/infrastructure/NonCancellationToken.java

### Domain Abstractions (T031-T036)
- [X] T031 [P] EntityId<T> interface with validation in src/main/java/com/architecture/core/domain/EntityId.java
- [X] T032 [P] Entity<TId> base class with identity equality in src/main/java/com/architecture/core/domain/Entity.java
- [X] T033 [P] AggregateRoot<TId> with version control and events in src/main/java/com/architecture/core/domain/AggregateRoot.java
- [X] T034 [P] ValueObject base class with structural equality in src/main/java/com/architecture/core/domain/ValueObject.java
- [X] T035 [P] DomainEvent interface with metadata in src/main/java/com/architecture/core/domain/DomainEvent.java
- [X] T036 [P] DomainEventBase implementation class in src/main/java/com/architecture/core/domain/DomainEventBase.java

### Repository Pattern (T037-T038)
- [X] T037 Repository<TAggregate,TId> interface with async operations in src/main/java/com/architecture/core/domain/Repository.java
- [ ] T038 [P] Repository documentation and usage examples in src/main/java/com/architecture/core/domain/package-info.java

## Phase 3.4: Spring Integration Package (T039-T042)
- [X] T039 [P] Spring Data repository adapter in architecture-core-spring/src/main/java/com/architecture/core/spring/repositories/SpringDataRepositoryAdapter.java
- [X] T040 [P] Spring Boot auto-configuration in architecture-core-spring/src/main/java/com/architecture/core/spring/configuration/ArchitectureCoreAutoConfiguration.java
- [X] T041 [P] Result/Maybe to Optional converters in architecture-core-spring/src/main/java/com/architecture/core/spring/converters/FunctionalTypeConverters.java
- [X] T042 [P] Spring integration tests in architecture-core-spring/src/test/java/com/architecture/core/spring/SpringIntegrationTest.java

## Phase 3.5: Examples and Documentation (T043-T045)
- [X] T043 Complete quickstart example with Order domain in examples/quickstart/src/main/java/QuickstartExample.java
- [X] T044 [P] Spring Boot example application in examples/spring-boot-app/src/main/java/ExampleApplication.java
- [ ] T045 [P] JMH performance benchmarks in benchmarks/src/main/java/com/architecture/core/benchmarks/

## Phase 3.6: Polish and Validation (T046-T048)
- [X] T046 Verify all contract tests pass with 100% compliance
- [X] T047 [P] Performance validation: Result/Maybe operations <1μs, ValueObject equality <100ns
- [X] T048 Code review and refactoring for Java best practices and DDD compliance

## Dependencies
- Setup (T001-T005) before Tests (T006-T022)
- Tests (T006-T022) before Implementation (T023-T045)
- Functional types (T023-T027) before Domain abstractions (T031-T036)
- Core implementation (T023-T038) before Spring integration (T039-T042)
- Core and Spring before Examples (T043-T045)
- Implementation before Polish (T046-T048)

## Parallel Execution Examples
```
# Phase 3.2: Launch contract tests together
Task: "Contract test EntityId interface compliance in src/test/java/com/architecture/core/domain/EntityIdContractTest.java"
Task: "Contract test Entity identity equality in src/test/java/com/architecture/core/domain/EntityContractTest.java"
Task: "Contract test AggregateRoot version control in src/test/java/com/architecture/core/domain/AggregateRootContractTest.java"
Task: "Contract test ValueObject structural equality in src/test/java/com/architecture/core/domain/ValueObjectContractTest.java"

# Phase 3.3: Launch functional types together
Task: "Error class with categorization in src/main/java/com/architecture/core/functional/Error.java"
Task: "ErrorCategory enum with display names in src/main/java/com/architecture/core/functional/ErrorCategory.java"
Task: "Result<T> class with monadic operations in src/main/java/com/architecture/core/functional/Result.java"
Task: "Maybe<T> class with optional value semantics in src/main/java/com/architecture/core/functional/Maybe.java"
```

## Notes
- [P] tasks = different files, no dependencies
- All tests MUST fail before implementing
- Follow TDD: Red → Green → Refactor
- Use JUnit 5 with parameterized tests
- Commit after each task completion
- JMH benchmarks for performance validation

## Task Generation Rules Applied
1. **From Contracts**: core-types-contract.java → 8 contract test tasks (T006-T013)
2. **From Data Model**: 7 core types → 14 implementation tasks (T023-T038)
3. **From Quickstart**: Order example → 4 integration test tasks (T019-T022)
4. **Ordering**: Setup → Tests → Functional → Domain → Spring → Examples → Polish
5. **Dependencies**: Sequential phases, parallel within phases where files differ

## Validation Checklist ✅
- [x] All contracts have corresponding tests (T006-T013)
- [x] All data model entities have implementation tasks (T023-T038)
- [x] All tests come before implementation (T006-T022 before T023-T045)
- [x] Parallel tasks target different files
- [x] Each task specifies exact file path
- [x] TDD structure: Should_ExpectedBehavior_When_StateUnderTest
- [x] Java Spring path conventions followed
- [x] Monadic laws verification included
- [x] Performance benchmarking included
- [x] Spring integration properly separated

**Status**: ✅ Ready for execution - 48 tasks generated following constitutional DDD+CQRS+TDD principles