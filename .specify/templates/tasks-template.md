# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions (DDD Architecture)
- **Single project**: `src/domain/`, `src/application/`, `src/infrastructure/`, `src/presentation/`
- **Web app**: `backend/src/[layer]/`, `frontend/src/[layer]/`
- **Mobile**: `api/src/[layer]/`, `ios/[Layer]/` or `android/[layer]/`
- All paths follow DDD layer structure - adjust language-specific casing based on conventions

## Phase 3.1: Setup
- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize [language] project with [framework] dependencies
- [ ] T003 [P] Configure linting and formatting tools

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
**Test naming: Should_ExpectedBehavior_When_StateUnderTest**
**Test structure: Given-When-Then blocks with explicit comments**
- [ ] T004 [P] Contract test POST /api/users in tests/contract/test_users_post.py
- [ ] T005 [P] Contract test GET /api/users/{id} in tests/contract/test_users_get.py
- [ ] T006 [P] Integration test user registration in tests/integration/test_registration.py
- [ ] T007 [P] Integration test auth flow in tests/integration/test_auth.py

## Phase 3.3: Core Implementation (ONLY after tests are failing)
**DDD Layer Implementation Order: Domain → Application → Infrastructure → Presentation**
- [ ] T008 [P] User entity in src/domain/entities/user.py (with Result/Error monads)
- [ ] T009 [P] User repository interface in src/domain/repositories/user_repository.py
- [ ] T010 [P] Create user command in src/application/commands/create_user_command.py
- [ ] T011 [P] Get user query in src/application/queries/get_user_query.py
- [ ] T012 [P] User command handler in src/application/handlers/user_command_handler.py
- [ ] T013 [P] User query handler in src/application/handlers/user_query_handler.py
- [ ] T014 User repository implementation in src/infrastructure/repositories/user_repository_impl.py
- [ ] T015 POST /api/users controller in src/presentation/controllers/user_controller.py
- [ ] T016 GET /api/users/{id} controller in src/presentation/controllers/user_controller.py

## Phase 3.4: Integration
- [ ] T017 Database configuration and migrations
- [ ] T018 Dependency injection configuration
- [ ] T019 Authentication middleware
- [ ] T020 CORS and security headers configuration
- [ ] T021 Request/response logging middleware

## Phase 3.5: Polish
- [ ] T022 [P] Unit tests for domain entities in tests/unit/domain/test_entities.py
- [ ] T023 [P] Unit tests for application handlers in tests/unit/application/test_handlers.py
- [ ] T024 Performance tests (<200ms) with load testing
- [ ] T025 [P] Update API documentation
- [ ] T026 Code review and refactoring for DDD compliance
- [ ] T027 Run all tests and verify 100% pass rate

## Dependencies
- Tests (T004-T007) before implementation (T008-T016)
- Domain layer (T008-T009) before Application layer (T010-T013)
- Application layer before Infrastructure layer (T014)
- Infrastructure layer before Presentation layer (T015-T016)
- Implementation before Integration (T017-T021)
- Integration before Polish (T022-T027)

## Parallel Example
```
# Launch T004-T007 together:
Task: "Contract test POST /api/users in tests/contract/test_users_post.py"
Task: "Contract test GET /api/users/{id} in tests/contract/test_users_get.py"
Task: "Integration test registration in tests/integration/test_registration.py"
Task: "Integration test auth in tests/integration/test_auth.py"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task
- Avoid: vague tasks, same file conflicts

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - Each contract file → contract test task [P]
   - Each endpoint → implementation task
   
2. **From Data Model**:
   - Each entity → model creation task [P]
   - Relationships → service layer tasks
   
3. **From User Stories**:
   - Each story → integration test [P]
   - Quickstart scenarios → validation tasks

4. **Ordering**:
   - Setup → Tests → Models → Services → Endpoints → Polish
   - Dependencies block parallel execution

## Validation Checklist
*GATE: Checked by main() before returning*

- [ ] All contracts have corresponding tests
- [ ] All entities have model tasks
- [ ] All tests come before implementation
- [ ] Parallel tasks truly independent
- [ ] Each task specifies exact file path
- [ ] No task modifies same file as another [P] task