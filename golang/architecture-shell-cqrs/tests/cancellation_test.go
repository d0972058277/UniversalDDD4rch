package tests

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/universalddd/architecture-shell-cqrs"
)

// T049: Should_TerminateEarly_When_CancellationRequested
func TestShould_TerminateEarly_When_CancellationRequested(t *testing.T) {
	// Given: A long-running command handler that respects cancellation
	command := &LongRunningCommand{Duration: 5 * time.Second}
	handler := &LongRunningCommandHandler{}

	handlers := map[string]interface{}{
		"LongRunningCommand": handler,
	}
	behaviors := []interface{}{}

	mediator := cqrs.NewMediator(handlers, behaviors)

	// Create cancellable context
	ctx, cancel := context.WithCancel(context.Background())

	// When: Context is cancelled after short delay
	go func() {
		time.Sleep(100 * time.Millisecond)
		cancel()
	}()

	startTime := time.Now()
	_, err := mediator.Send(ctx, command)
	elapsed := time.Since(startTime)

	// Then: Handler should terminate early with context cancelled error
	assert.Error(t, err)
	assert.True(t, errors.Is(err, context.Canceled), "Error should be context.Canceled")
	assert.Less(t, elapsed, 1*time.Second, "Handler should terminate within 1 second (not wait full 5 seconds)")
}

// Test helper types
type LongRunningCommand struct {
	Duration time.Duration
}

func (c *LongRunningCommand) IsRequest() {}
func (c *LongRunningCommand) IsCommand() {}

type LongRunningCommandHandler struct{}

func (h *LongRunningCommandHandler) Handle(ctx context.Context, cmd *LongRunningCommand) (struct{}, error) {
	// Simulate long-running operation that respects cancellation
	ticker := time.NewTicker(50 * time.Millisecond)
	defer ticker.Stop()

	deadline := time.Now().Add(cmd.Duration)
	for {
		select {
		case <-ctx.Done():
			// Cancellation requested - terminate early
			return struct{}{}, ctx.Err()
		case <-ticker.C:
			if time.Now().After(deadline) {
				// Operation completed normally
				return struct{}{}, nil
			}
		}
	}
}
