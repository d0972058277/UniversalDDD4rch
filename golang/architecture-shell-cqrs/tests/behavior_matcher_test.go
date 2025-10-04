package tests

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/universalddd/architecture-shell-cqrs"
)

// T061d: Should_MatchCommands_When_IsCommandGuardUsed
func TestShould_MatchCommands_When_IsCommandGuardUsed(t *testing.T) {
	// Given: Command matcher and various request types
	matcher := &CommandOnlyMatcher{}

	command := &MatcherTestCommand{ID: "cmd-1"}
	query := &MatcherTestQuery{ID: "query-1"}

	// When: Matcher is applied to command
	commandMatches := matcher.Matches(command)

	// Then: Should match command
	assert.True(t, commandMatches, "Matcher should match commands")

	// When: Matcher is applied to query
	queryMatches := matcher.Matches(query)

	// Then: Should NOT match query
	assert.False(t, queryMatches, "Matcher should NOT match queries")
}

// Test that behavior only executes for commands when using CommandOnlyMatcher
func TestShould_ExecuteBehaviorOnlyForCommands_When_CommandMatcherUsed(t *testing.T) {
	// Given: Behavior with command-only matcher
	behaviorExecuted := false
	commandBehavior := &ConditionalBehaviorForCommand{
		matcher: &CommandOnlyMatcher{},
		onExecute: func() {
			behaviorExecuted = true
		},
	}

	command := &MatcherTestCommand{ID: "cmd-2"}
	commandHandler := &MatcherTestCommandHandler{}

	handlers := map[string]interface{}{
		"MatcherTestCommand": commandHandler,
	}
	behaviors := []interface{}{commandBehavior}

	mediator := cqrs.NewMediator(handlers, behaviors)
	ctx := context.Background()

	// When: Command is sent
	behaviorExecuted = false
	_, err := mediator.Send(ctx, command)

	// Then: Behavior should execute for command
	assert.NoError(t, err)
	assert.True(t, behaviorExecuted, "Behavior should execute for commands")

	// Given: Query with matcher behavior
	queryBehaviorExecuted := false
	queryBehavior := &ConditionalBehaviorForQuery{
		matcher: &CommandOnlyMatcher{},
		onExecute: func() {
			queryBehaviorExecuted = true
		},
	}

	query := &MatcherTestQuery{ID: "query-2"}
	queryHandler := &MatcherTestQueryHandler{}

	handlers2 := map[string]interface{}{
		"MatcherTestQuery": queryHandler,
	}
	behaviors2 := []interface{}{queryBehavior}

	mediator2 := cqrs.NewMediator(handlers2, behaviors2)

	// When: Query is sent
	_, err = mediator2.Send(ctx, query)

	// Then: Behavior should NOT execute for query
	assert.NoError(t, err)
	assert.False(t, queryBehaviorExecuted, "Behavior should NOT execute for queries")
}

// Test helper types
type MatcherTestCommand struct {
	ID string
}

func (c *MatcherTestCommand) IsRequest() {}
func (c *MatcherTestCommand) IsCommand() {}

type MatcherTestCommandHandler struct{}

func (h *MatcherTestCommandHandler) Handle(ctx context.Context, cmd *MatcherTestCommand) (struct{}, error) {
	return struct{}{}, nil
}

type MatcherTestQuery struct {
	ID string
}

func (q *MatcherTestQuery) IsRequest() {}
func (q *MatcherTestQuery) IsQuery()   {}

type MatcherTestQueryHandler struct{}

func (h *MatcherTestQueryHandler) Handle(ctx context.Context, query *MatcherTestQuery) (string, error) {
	return "result", nil
}

// CommandOnlyMatcher implementation
type CommandOnlyMatcher struct{}

func (m *CommandOnlyMatcher) Matches(request interface{}) bool {
	_, isCommand := request.(interface{ IsCommand() })
	return isCommand
}

// ConditionalBehavior that checks matcher before executing (for commands)
type ConditionalBehaviorForCommand struct {
	matcher   *CommandOnlyMatcher
	onExecute func()
}

func (b *ConditionalBehaviorForCommand) Handle(ctx context.Context, request *MatcherTestCommand, next func() (interface{}, error)) (interface{}, error) {
	if b.matcher.Matches(request) {
		b.onExecute()
	}
	return next()
}

func (b *ConditionalBehaviorForCommand) Order() int {
	return 100
}

// ConditionalBehavior for queries
type ConditionalBehaviorForQuery struct {
	matcher   *CommandOnlyMatcher
	onExecute func()
}

func (b *ConditionalBehaviorForQuery) Handle(ctx context.Context, request *MatcherTestQuery, next func() (interface{}, error)) (interface{}, error) {
	if b.matcher.Matches(request) {
		b.onExecute()
	}
	return next()
}

func (b *ConditionalBehaviorForQuery) Order() int {
	return 100
}
