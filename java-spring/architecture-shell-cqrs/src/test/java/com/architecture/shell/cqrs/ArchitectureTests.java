package com.architecture.shell.cqrs;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.*;
import static com.tngtech.archunit.library.Architectures.layeredArchitecture;

/**
 * T207: Architecture compliance tests for CQRS module.
 *
 * <p><b>AT-001: Query Read-Only Semantics Enforcement</b>
 * <br>Per spec.md:L72-73 and CONTRACT_TESTS.md AT-001, query handlers MUST NOT
 * call repository write methods (add, update, delete).
 *
 * <p>This is a BLOCKING GATE per Constitution Section II (CQRS enforcement)
 * and Section III (all tests pass before task completion).
 *
 * <p>Uses ArchUnit to validate architectural constraints at build time.
 *
 * <p>Test naming: Should_ExpectedBehavior_When_StateUnderTest
 */
class ArchitectureTests {

    private static JavaClasses importedClasses;

    @BeforeAll
    static void setUp() {
        // Import all classes from the main source and test source for analysis
        importedClasses = new ClassFileImporter()
            .importPackages("com.architecture.shell.cqrs");
    }

    /**
     * AT-001: Validates query handlers do not call repository write methods.
     *
     * <p><b>Given</b>: CQRS architecture with query handlers
     * <p><b>When</b>: Analyzing query handler implementations
     * <p><b>Then</b>: Query handlers MUST NOT depend on repository packages
     *
     * <p><b>Rationale</b>: Queries are read-only operations (spec.md:L72-73).
     * This test ensures query handlers don't depend on repository write operations.
     *
     * <p><b>Note</b>: In this initial implementation with no query handlers yet,
     * the test validates the architecture rule exists. Future query handlers
     * will be validated against this rule.
     */
    @Test
    void should_NotCallRepositoryWriteMethods_When_QueryHandlerExecutes() {
        // Given: Architecture rule for query handlers
        ArchRule queryHandlersMustBeReadOnly = classes()
            .that().implement(QueryHandler.class)
            .or().haveSimpleNameEndingWith("QueryHandler")
            .should().onlyAccessClassesThat()
            .resideOutsideOfPackages("..repository..", "..repositories..")
            .because("Query handlers must be read-only and not access repository write operations per CQRS principles (spec.md:L72-73, AT-001)");

        // When/Then: Validate architecture rule
        // Note: Currently passes as no QueryHandler implementations exist in test codebase
        queryHandlersMustBeReadOnly.check(importedClasses);
    }

    /**
     * Validates query handlers only implement QueryHandler interface.
     *
     * <p><b>Given</b>: Classes implementing QueryHandler
     * <p><b>When</b>: Analyzing handler implementations
     * <p><b>Then</b>: Query handlers MUST NOT also implement CommandHandler
     *
     * <p>Ensures command/query separation at the handler level.
     */
    @Test
    void should_NotImplementCommandHandler_When_ClassIsQueryHandler() {
        ArchRule queryHandlersShouldNotBeCommandHandlers = classes()
            .that().implement(QueryHandler.class)
            .should().notImplement(CommandHandler.class)
            .because("Handlers must implement either CommandHandler or QueryHandler, not both (CQRS separation)");

        queryHandlersShouldNotBeCommandHandlers.check(importedClasses);
    }

    /**
     * Validates command handlers only implement CommandHandler interface.
     *
     * <p><b>Given</b>: Classes implementing CommandHandler
     * <p><b>When</b>: Analyzing handler implementations
     * <p><b>Then</b>: Command handlers MUST NOT also implement QueryHandler
     *
     * <p>Ensures command/query separation at the handler level.
     */
    @Test
    void should_NotImplementQueryHandler_When_ClassIsCommandHandler() {
        ArchRule commandHandlersShouldNotBeQueryHandlers = classes()
            .that().implement(CommandHandler.class)
            .should().notImplement(QueryHandler.class)
            .because("Handlers must implement either CommandHandler or QueryHandler, not both (CQRS separation)");

        commandHandlersShouldNotBeQueryHandlers.check(importedClasses);
    }

    /**
     * Validates requests implement either Command or Query, not both.
     *
     * <p><b>Given</b>: Request classes
     * <p><b>When</b>: Analyzing request implementations
     * <p><b>Then</b>: Requests MUST be either Command OR Query, never both
     */
    @Test
    void should_ImplementEitherCommandOrQuery_When_DefiningRequests() {
        ArchRule commandsAreNotQueries = classes()
            .that().implement(Command.class)
            .should().notImplement(Query.class)
            .because("A request cannot be both a Command and a Query (CQRS separation)");

        commandsAreNotQueries.check(importedClasses);
    }

    /**
     * Validates behaviors implement PipelineBehavior interface correctly.
     *
     * <p><b>Given</b>: Pipeline behavior classes
     * <p><b>When</b>: Analyzing behavior implementations
     * <p><b>Then</b>: Behaviors in behaviors package MUST implement PipelineBehavior
     */
    @Test
    void should_ImplementPipelineBehavior_When_ClassInBehaviorsPackage() {
        ArchRule behaviorsImplementInterface = classes()
            .that().resideInAPackage("..behaviors")
            .and().areNotInterfaces()
            .and().haveSimpleNameEndingWith("Behavior")
            .should().implement(PipelineBehavior.class)
            .because("All behavior implementations must implement PipelineBehavior interface");

        behaviorsImplementInterface.check(importedClasses);
    }

    /**
     * Validates layered architecture structure.
     *
     * <p><b>Given</b>: CQRS module with behaviors and core components
     * <p><b>When</b>: Analyzing dependencies
     * <p><b>Then</b>: Behaviors depend only on core interfaces
     */
    @Test
    void should_RespectLayeredArchitecture_When_DefiningDependencies() {
        ArchRule behaviorsOnlyDependOnCore = classes()
            .that().resideInAPackage("..behaviors..")
            .should().onlyDependOnClassesThat()
            .resideInAnyPackage(
                "com.architecture.shell.cqrs..",
                "com.architecture.core..",
                "java..",
                "org.slf4j.."
            )
            .because("Behaviors should only depend on core CQRS interfaces and standard libraries");

        behaviorsOnlyDependOnCore.check(importedClasses);
    }

    /**
     * Validates pipeline behaviors are stateless (no mutable fields).
     *
     * <p><b>Given</b>: Pipeline behavior implementations
     * <p><b>When</b>: Analyzing field declarations
     * <p><b>Then</b>: Behaviors should not have non-final fields (stateless design)
     *
     * <p>Ensures behaviors can be safely reused across concurrent requests.
     */
    @Test
    void should_BeStateless_When_ImplementingPipelineBehavior() {
        ArchRule behaviorsAreStateless = classes()
            .that().implement(PipelineBehavior.class)
            .should().haveOnlyFinalFields()
            .because("Pipeline behaviors must be stateless for thread-safety");

        behaviorsAreStateless.check(importedClasses);
    }

    /**
     * Validates mediator is only constructed via dependency injection.
     *
     * <p><b>Given</b>: Application code
     * <p><b>When</b>: Analyzing Mediator instantiation
     * <p><b>Then</b>: Mediator should not be directly instantiated (use DI)
     *
     * <p>Ensures consistent mediator configuration through DI container.
     */
    @Test
    void should_NotDirectlyInstantiateMediator_When_InApplicationCode() {
        ArchRule mediatorViaConstructorOnly = noClasses()
            .that().resideOutsideOfPackages("..test..", "..config..")
            .should().callConstructor(MediatorImpl.class)
            .because("Mediator should be injected via DI, not directly instantiated");

        mediatorViaConstructorOnly.check(importedClasses);
    }
}
