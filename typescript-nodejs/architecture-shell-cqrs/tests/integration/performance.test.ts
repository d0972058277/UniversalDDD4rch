import 'reflect-metadata';
import { Mediator } from '../../src/Mediator';
import { Command } from '../../src/Command';
import { ICommandHandler } from '../../src/ICommandHandler';
import { UnitOfWorkBehavior, ILogger } from '../../src/behaviors/UnitOfWorkBehavior';
import { TelemetryBehavior } from '../../src/behaviors/TelemetryBehavior';
import { InMemoryUnitOfWork } from '../InMemoryUnitOfWork';
import { CommandOnlyMatcher, AllRequestsMatcher } from '../../src/IBehaviorMatcher';
import { IPipelineBehavior } from '../../src/IPipelineBehavior';

// No-op command for performance testing
class NoOpCommand implements Command {
  _isCommand = true as const;
  __phantom?: void;
  constructor(public readonly id: number) {}
}

interface TelemetryEntry {
  requestType?: string;
  duration?: number;
  status?: string;
  transactionId?: string;
}

describe('PerformanceTests', () => {
  /**
   * Performance Benchmark Test (T200)
   *
   * Validates NFR-001 performance requirements:
   * - Measures mediator overhead (pipeline execution time EXCLUDING handler logic)
   * - Executes 1000 iterations of no-op command through full pipeline
   * - Reports p50, p95, p99 latencies
   *
   * Validates NFR-002/BR-002 functional requirement:
   * - Verifies TransactionId logged for ALL command executions
   */
  it('Should_MeasureMediatorOverhead_And_ValidateTransactionIdLogging', async () => {
    // Given: Mediator with full pipeline (ValidationBehavior + AuthorizationBehavior + UnitOfWorkBehavior + TelemetryBehavior)
    const unitOfWork = new InMemoryUnitOfWork();
    const telemetryEntries: TelemetryEntry[] = [];

    const logger: ILogger = {
      info: (context: any, message: string) => {
        if (message.includes('completed') && context) {
          telemetryEntries.push({
            requestType: context['requestType'],
            duration: context['duration'],
            status: context['status'],
            transactionId: context['transactionId'],
          });
        }
      },
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    // No-op handler (isolates framework overhead)
    const handler: ICommandHandler<NoOpCommand> = {
      async handle(_request: NoOpCommand, _signal: AbortSignal): Promise<void> {
        // No-op: framework overhead only
      },
    };

    const mediator = new Mediator(
      [{ requestType: NoOpCommand, handler }],
      [
        // Note: Validation/Authorization behaviors require dependencies, omitting for performance test
        {
          behavior: new UnitOfWorkBehavior(unitOfWork, logger) as IPipelineBehavior<any, any>,
          matcher: new CommandOnlyMatcher(),
        },
        {
          behavior: new TelemetryBehavior(logger, unitOfWork) as IPipelineBehavior<any, any>,
          matcher: new AllRequestsMatcher(),
        },
      ]
    );

    // When: Execute 1000 iterations
    const iterations = 1000;
    const controller = new AbortController();

    for (let i = 0; i < iterations; i++) {
      await mediator.send(new NoOpCommand(i), controller.signal);
    }

    // Then: All executions completed
    expect(telemetryEntries).toHaveLength(iterations);

    // Calculate performance metrics (p50, p95, p99)
    const durations = telemetryEntries
      .map((e) => e.duration ?? 0)
      .sort((a, b) => a - b);
    const p50 = durations[Math.floor(iterations * 0.5)] ?? 0;
    const p95 = durations[Math.floor(iterations * 0.95)] ?? 0;
    const p99 = durations[Math.floor(iterations * 0.99)] ?? 0;

    // Log performance metrics (informational per NFR-001 - no pass/fail thresholds)
    console.log('\n=== Mediator Performance Benchmark ===');
    console.log(`Runtime: Node.js ${process.version}`);
    console.log(`Platform: ${process.platform} ${process.arch}`);
    console.log(`Iterations: ${iterations}`);
    console.log(`p50 (median): ${p50.toFixed(2)}ms`);
    console.log(`p95: ${p95.toFixed(2)}ms`);
    console.log(`p99: ${p99.toFixed(2)}ms`);
    console.log(`Average: ${(durations.reduce((a, b) => a + b, 0) / iterations).toFixed(2)}ms`);
    console.log('=======================================\n');

    // Functional validation per NFR-002/BR-002: TransactionId MUST be logged for ALL commands
    const entriesWithTransactionId = telemetryEntries.filter((e) => e.transactionId != null);
    expect(entriesWithTransactionId).toHaveLength(iterations);

    // All entries should have valid UUID-format TransactionId
    entriesWithTransactionId.forEach((entry) => {
      expect(entry.transactionId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    // All entries should have Success status (no-op command)
    expect(telemetryEntries.every((e) => e.status === 'Success')).toBe(true);
  });

  /**
   * Additional test: Performance comparison with/without behaviors
   */
  it('Should_ShowPerformanceImpact_When_ComparingWithAndWithoutBehaviors', async () => {
    // Given: Handler only (no behaviors)
    const handler: ICommandHandler<NoOpCommand> = {
      async handle(_request: NoOpCommand, _signal: AbortSignal): Promise<void> {
        // No-op
      },
    };

    const mediatorNoBehaviors = new Mediator(
      [{ requestType: NoOpCommand, handler }],
      [] // No behaviors
    );

    // Measure without behaviors
    const iterations = 100;
    const controller = new AbortController();
    const startNoBehaviors = Date.now();

    for (let i = 0; i < iterations; i++) {
      await mediatorNoBehaviors.send(new NoOpCommand(i), controller.signal);
    }

    const durationNoBehaviors = Date.now() - startNoBehaviors;

    // Given: Mediator with behaviors
    const unitOfWork = new InMemoryUnitOfWork();
    const logger: ILogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const mediatorWithBehaviors = new Mediator(
      [{ requestType: NoOpCommand, handler }],
      [
        {
          behavior: new UnitOfWorkBehavior(unitOfWork, logger) as IPipelineBehavior<any, any>,
          matcher: new CommandOnlyMatcher(),
        },
        {
          behavior: new TelemetryBehavior(logger, unitOfWork) as IPipelineBehavior<any, any>,
          matcher: new AllRequestsMatcher(),
        },
      ]
    );

    // Measure with behaviors
    const startWithBehaviors = Date.now();

    for (let i = 0; i < iterations; i++) {
      await mediatorWithBehaviors.send(new NoOpCommand(i), controller.signal);
    }

    const durationWithBehaviors = Date.now() - startWithBehaviors;

    // Log comparison
    console.log('\n=== Pipeline Overhead Comparison ===');
    console.log(`Without behaviors: ${durationNoBehaviors}ms total (${(durationNoBehaviors / iterations).toFixed(2)}ms avg)`);
    console.log(`With behaviors: ${durationWithBehaviors}ms total (${(durationWithBehaviors / iterations).toFixed(2)}ms avg)`);
    console.log(`Overhead per request: ${((durationWithBehaviors - durationNoBehaviors) / iterations).toFixed(2)}ms`);
    console.log('=====================================\n');

    // Sanity check: behaviors add some overhead (or equal if too fast to measure)
    // On fast machines both may round to 0ms, so we check >= instead of >
    expect(durationWithBehaviors).toBeGreaterThanOrEqual(durationNoBehaviors);
  });
});
