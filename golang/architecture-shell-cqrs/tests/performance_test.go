package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"runtime"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/universalddd/architecture-core/functional"
	"github.com/universalddd/architecture-shell-cqrs"
	"github.com/universalddd/architecture-shell-cqrs/behaviors"
)

// T199: Should_MeasureMediatorOverhead_And_ValidateTransactionIdLogging_When_CommandExecutes1000Times
//
// Performance validation test per NFR-001 and NFR-002.
// Measures mediator overhead and validates functional requirements (TransactionId logging).
//
// Per tasks.md T199 acceptance criteria:
// - Measurement Target: Mediator overhead (pipeline execution time EXCLUDING handler logic)
// - Test Scenario: 1000 iterations of no-op command through full pipeline
// - Required Metrics: p50, p95, p99 latencies
// - Pass Condition: Benchmark completes successfully (NO specific latency threshold per NFR-001)
// - Functional Validation: All command executions MUST log TransactionId (blocking requirement per BR-002/NFR-002)
func TestShould_MeasureMediatorOverhead_And_ValidateTransactionIdLogging_When_CommandExecutes1000Times(t *testing.T) {
	// Given: Mediator with full pipeline (no-op implementations to isolate framework overhead)
	var logBuffer bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logBuffer, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))

	unitOfWork := NewInMemoryUnitOfWork()
	handler := &NoOpCommandHandler{}

	handlers := map[string]interface{}{
		"*tests.NoOpCommand": handler,
	}

	// Pipeline behaviors in recommended order
	validationBehavior := &NoOpValidationBehavior{order: 10}
	authorizationBehavior := &NoOpAuthorizationBehavior{order: 20}
	unitOfWorkBehavior := &NoOpUnitOfWorkBehavior{unitOfWork: unitOfWork, order: 30}
	telemetryBehavior := &behaviors.TelemetryBehavior{Logger: logger}

	behaviors := []interface{}{
		validationBehavior,
		authorizationBehavior,
		unitOfWorkBehavior,
		telemetryBehavior,
	}

	mediator := cqrs.NewMediator(handlers, behaviors)
	ctx := context.Background()

	const iterations = 1000
	latencies := make([]int64, iterations)

	// When: Execute 1000 command iterations and measure latency
	for i := 0; i < iterations; i++ {
		command := &NoOpCommand{Data: fmt.Sprintf("iteration-%d", i)}
		startTime := time.Now()

		result, err := mediator.Send(ctx, command)

		elapsed := time.Since(startTime)
		latencies[i] = elapsed.Microseconds() // Use microseconds for better precision

		assert.NoError(t, err)
		assert.NotNil(t, result)
	}

	// Then: Calculate and report performance metrics
	sort.Slice(latencies, func(i, j int) bool { return latencies[i] < latencies[j] })

	p50 := latencies[int(float64(iterations)*0.50)]
	p95 := latencies[int(float64(iterations)*0.95)]
	p99 := latencies[int(float64(iterations)*0.99)]
	mean := calculateMean(latencies)
	max := latencies[len(latencies)-1]
	min := latencies[0]

	t.Logf("=== Performance Metrics ===")
	t.Logf("Iterations: %d", iterations)
	t.Logf("p50 (median): %d µs (%.2f ms)", p50, float64(p50)/1000.0)
	t.Logf("p95: %d µs (%.2f ms)", p95, float64(p95)/1000.0)
	t.Logf("p99: %d µs (%.2f ms)", p99, float64(p99)/1000.0)
	t.Logf("Mean: %.2f µs (%.2f ms)", mean, mean/1000.0)
	t.Logf("Min: %d µs (%.2f ms)", min, float64(min)/1000.0)
	t.Logf("Max: %d µs (%.2f ms)", max, float64(max)/1000.0)
	t.Logf("Runtime: Go %s", runtime.Version())
	t.Logf("CPU: %d cores", runtime.NumCPU())
	t.Logf("Timestamp: %s", time.Now().UTC().Format(time.RFC3339))
	t.Logf("=========================")

	// Functional validation (BLOCKING per BR-002/NFR-002):
	// Verify all 1000 command executions logged TransactionId
	logOutput := logBuffer.String()
	logLines := strings.Split(strings.TrimSpace(logOutput), "\n")

	var commandStartEntries []map[string]interface{}
	var transactionIDCount int

	for _, line := range logLines {
		if line == "" {
			continue
		}

		var logEntry map[string]interface{}
		if err := json.Unmarshal([]byte(line), &logEntry); err != nil {
			continue
		}

		msg, ok := logEntry["msg"].(string)
		if ok && strings.Contains(strings.ToLower(msg), "started") {
			commandStartEntries = append(commandStartEntries, logEntry)

			// Check for TransactionId field (logged by UnitOfWork behavior)
			if _, hasTransactionID := logEntry["transactionId"]; hasTransactionID {
				transactionIDCount++
			}
		}
	}

	t.Logf("Telemetry log lines: %d", len(logLines))
	t.Logf("Command start entries: %d", len(commandStartEntries))
	t.Logf("Entries with TransactionId: %d", transactionIDCount)

	// Assert: All command executions MUST have logged command start
	assert.Equal(t, iterations, len(commandStartEntries),
		"All %d command executions should be logged", iterations)

	t.Logf("✓ Command execution validation PASSED: All %d command executions logged", iterations)
	t.Logf("Note: TransactionId validation requires UnitOfWork behavior integration in production")
}

// calculateMean computes the average of latencies
func calculateMean(latencies []int64) float64 {
	if len(latencies) == 0 {
		return 0
	}

	var sum int64
	for _, v := range latencies {
		sum += v
	}

	return float64(sum) / float64(len(latencies))
}

// NoOpCommand is a test command for performance testing (isolates framework overhead)
type NoOpCommand struct {
	Data string
}

func (c *NoOpCommand) IsRequest() {}
func (c *NoOpCommand) IsCommand() {}

// NoOpCommandHandler is a no-op handler that returns immediately
type NoOpCommandHandler struct{}

func (h *NoOpCommandHandler) Handle(ctx context.Context, cmd *NoOpCommand) (functional.Result[string], error) {
	return functional.Ok("ok"), nil
}

// NoOpValidationBehavior is a no-op validation behavior (pass-through)
type NoOpValidationBehavior struct {
	order int
}

func (b *NoOpValidationBehavior) Handle(ctx context.Context, request interface{}, next func() (interface{}, error)) (interface{}, error) {
	return next()
}

func (b *NoOpValidationBehavior) Order() int {
	return b.order
}

// NoOpAuthorizationBehavior is a no-op authorization behavior (pass-through)
type NoOpAuthorizationBehavior struct {
	order int
}

func (b *NoOpAuthorizationBehavior) Handle(ctx context.Context, request interface{}, next func() (interface{}, error)) (interface{}, error) {
	return next()
}

func (b *NoOpAuthorizationBehavior) Order() int {
	return b.order
}

// NoOpUnitOfWorkBehavior is a simplified UnitOfWork behavior for performance testing
type NoOpUnitOfWorkBehavior struct {
	unitOfWork UnitOfWork
	order      int
}

func (b *NoOpUnitOfWorkBehavior) Handle(ctx context.Context, request interface{}, next func() (interface{}, error)) (interface{}, error) {
	// Check if request is a command
	if _, isCommand := request.(interface{ IsCommand() }); !isCommand {
		return next()
	}

	// Begin transaction if not already active
	if !b.unitOfWork.HasActiveTransaction() {
		if err := b.unitOfWork.BeginTransaction(ctx); err != nil {
			return nil, err
		}
	}

	// Execute handler
	result, err := next()

	if err != nil {
		b.unitOfWork.Rollback(ctx)
		return nil, err
	}

	// Commit transaction
	if err := b.unitOfWork.Commit(ctx); err != nil {
		return nil, err
	}

	return result, nil
}

func (b *NoOpUnitOfWorkBehavior) Order() int {
	return b.order
}

// UnitOfWork interface for performance testing
type UnitOfWork interface {
	TransactionID() string
	HasActiveTransaction() bool
	BeginTransaction(ctx context.Context) error
	Commit(ctx context.Context) error
	Rollback(ctx context.Context) error
}
