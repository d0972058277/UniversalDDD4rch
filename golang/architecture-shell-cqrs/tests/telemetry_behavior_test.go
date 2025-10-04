package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/universalddd/architecture-shell-cqrs"
	"github.com/universalddd/architecture-shell-cqrs/behaviors"
)

// T174: Should_LogDurationAndStatus_When_RequestProcessed
// Validates telemetry behavior logs request metrics
func TestShould_LogDurationAndStatus_When_RequestProcessed(t *testing.T) {
	// Given: Mediator with telemetry behavior and test handler
	var logBuffer bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logBuffer, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))

	handler := &TelemetryTestCommandHandler{}

	handlers := map[string]interface{}{
		"*tests.TelemetryTestCommand": handler,
	}

	telemetryBehavior := &behaviors.TelemetryBehavior{
		Logger: logger,
	}

	behaviors := []interface{}{telemetryBehavior}

	mediator := cqrs.NewMediator(handlers, behaviors)
	ctx := context.Background()

	command := &TelemetryTestCommand{Value: "test"}

	// When: Command is executed
	result, err := mediator.Send(ctx, command)

	// Then: Should log duration and status
	assert.NoError(t, err)
	assert.NotNil(t, result)

	logOutput := logBuffer.String()
	assert.NotEmpty(t, logOutput, "Should log telemetry output")

	// Verify log contains required fields
	assert.Contains(t, logOutput, "Request started", "Should log request start")
	assert.Contains(t, logOutput, "Request completed successfully", "Should log request completion")
	assert.Contains(t, logOutput, "requestType", "Should log request type")
	assert.Contains(t, logOutput, "duration", "Should log duration")
	assert.Contains(t, logOutput, "status", "Should log status")
	assert.Contains(t, logOutput, "*tests.TelemetryTestCommand", "Should include command type name")

	// Parse log entries to verify structured logging
	logLines := strings.Split(strings.TrimSpace(logOutput), "\n")
	assert.GreaterOrEqual(t, len(logLines), 2, "Should have at least 2 log entries (start + completion)")

	// Verify start log entry
	var startLog map[string]interface{}
	err = json.Unmarshal([]byte(logLines[0]), &startLog)
	assert.NoError(t, err, "Start log should be valid JSON")
	assert.Equal(t, "Request started", startLog["msg"])
	assert.Contains(t, startLog, "requestType")
	assert.Contains(t, startLog, "timestamp")

	// Verify completion log entry
	var completionLog map[string]interface{}
	err = json.Unmarshal([]byte(logLines[1]), &completionLog)
	assert.NoError(t, err, "Completion log should be valid JSON")
	assert.Equal(t, "Request completed successfully", completionLog["msg"])
	assert.Contains(t, completionLog, "requestType")
	assert.Contains(t, completionLog, "duration")
	assert.Equal(t, "Success", completionLog["status"])
}

// Test helper types for telemetry tests

// TelemetryTestCommand is a test command for telemetry validation
type TelemetryTestCommand struct {
	Value string
}

func (c *TelemetryTestCommand) IsRequest() {}
func (c *TelemetryTestCommand) IsCommand() {}

// TelemetryTestCommandHandler handles telemetry test commands
type TelemetryTestCommandHandler struct{}

func (h *TelemetryTestCommandHandler) Handle(ctx context.Context, command *TelemetryTestCommand) (string, error) {
	return "processed-" + command.Value, nil
}
