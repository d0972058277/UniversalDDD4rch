import 'reflect-metadata';
import { Command } from '../../src/Command';
import { Query } from '../../src/Query';
import { CommandOnlyMatcher, QueryOnlyMatcher } from '../../src/IBehaviorMatcher';

/**
 * UT-007: BehaviorMatcher Type Guards
 *
 * These tests verify that BehaviorMatcher provides type guards (isCommand, isQuery)
 * to selectively apply behaviors to request types per FR-007.
 * Following TDD principles: tests MUST fail before implementation.
 */

// Test command
class TestCommand implements Command {
  _isCommand = true as const;
  __phantom?: void;
  constructor(public readonly value: string) {}
}

// Test query
class TestQuery implements Query<string> {
  _isQuery = true as const;
  __phantom?: string;
  constructor(public readonly id: string) {}
}

describe('BehaviorMatcherTests', () => {
  // UT-007: T061e
  test('Should_MatchCommands_When_IsCommandGuardUsed', async () => {
    // Given: BehaviorMatcher with isCommand type guard
    const commandMatcher = new CommandOnlyMatcher();
    const queryMatcher = new QueryOnlyMatcher();

    const command = new TestCommand('test');
    const query = new TestQuery('123');

    // When: Matcher is evaluated against Command and Query instances
    const commandMatchesCommandMatcher = commandMatcher.matches(command);
    const queryMatchesCommandMatcher = commandMatcher.matches(query);
    const commandMatchesQueryMatcher = queryMatcher.matches(command);
    const queryMatchesQueryMatcher = queryMatcher.matches(query);

    // Then: Should return true for commands, false for queries
    expect(commandMatchesCommandMatcher).toBe(true);
    expect(queryMatchesCommandMatcher).toBe(false);
    expect(commandMatchesQueryMatcher).toBe(false);
    expect(queryMatchesQueryMatcher).toBe(true);
  });
});
