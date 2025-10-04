package com.architecture.shell.cqrs;

import com.architecture.core.functional.Result;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for BehaviorMatcher Type Guards.
 * Tests follow TDD approach - written before implementation exists.
 * Naming: Should_ExpectedBehavior_When_StateUnderTest
 */
class BehaviorMatcherTests {

    /**
     * T061c: UT-007 - BehaviorMatcher Type Guards (IsCommand)
     * Given: BehaviorMatcher with IsCommand guard
     * When: Request types (commands and queries) are tested
     * Then: Should match only command types
     */
    @Test
    void should_MatchCommands_When_IsCommandGuardUsed() {
        // Given: Command-only matcher
        BehaviorMatcher commandMatcher = request -> request instanceof Command;

        // When/Then: Should match commands
        assertThat(commandMatcher.matches(new TestCommand())).isTrue();
        assertThat(commandMatcher.matches(new TestCommandWithResult())).isTrue();

        // When/Then: Should NOT match queries
        assertThat(commandMatcher.matches(new TestQuery())).isFalse();
    }

    /**
     * UT-007 - BehaviorMatcher Type Guards (IsQuery)
     * Given: BehaviorMatcher with IsQuery guard
     * When: Request types (commands and queries) are tested
     * Then: Should match only query types
     */
    @Test
    void should_MatchQueries_When_IsQueryGuardUsed() {
        // Given: Query-only matcher
        BehaviorMatcher queryMatcher = request -> request instanceof Query;

        // When/Then: Should match queries
        assertThat(queryMatcher.matches(new TestQuery())).isTrue();

        // When/Then: Should NOT match commands
        assertThat(queryMatcher.matches(new TestCommand())).isFalse();
        assertThat(queryMatcher.matches(new TestCommandWithResult())).isFalse();
    }

    /**
     * UT-007 - BehaviorMatcher Type Guards (AllRequests)
     * Given: BehaviorMatcher that matches all requests
     * When: Any request type is tested
     * Then: Should match all request types
     */
    @Test
    void should_MatchAllRequests_When_AllRequestsGuardUsed() {
        // Given: All-requests matcher
        BehaviorMatcher allRequestsMatcher = request -> request instanceof BaseRequest;

        // When/Then: Should match all request types
        assertThat(allRequestsMatcher.matches(new TestCommand())).isTrue();
        assertThat(allRequestsMatcher.matches(new TestCommandWithResult())).isTrue();
        assertThat(allRequestsMatcher.matches(new TestQuery())).isTrue();
    }

    // Test fixtures

    private static class TestCommand implements Command<Result<Void>> {
    }

    private static class TestCommandWithResult implements Command<Result<String>> {
    }

    private static class TestQuery implements Query<String> {
    }
}
