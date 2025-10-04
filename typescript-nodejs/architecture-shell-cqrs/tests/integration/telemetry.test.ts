import 'reflect-metadata';
import { Mediator } from '../../src/Mediator';
import { Command } from '../../src/Command';
import { Query } from '../../src/Query';
import { ICommandHandler } from '../../src/ICommandHandler';
import { IQueryHandler } from '../../src/IQueryHandler';
import { TelemetryBehavior } from '../../src/behaviors/TelemetryBehavior';
import { ILogger } from '../../src/behaviors/UnitOfWorkBehavior';
import { AllRequestsMatcher } from '../../src/IBehaviorMatcher';
import { IPipelineBehavior } from '../../src/IPipelineBehavior';

// Test command
class ProcessOrderCommand implements Command {
  _isCommand = true as const;
  __phantom?: void;
  constructor(public readonly orderId: string) {}
}

// Test query
class GetOrderQuery implements Query<string> {
  _isQuery = true as const;
  __phantom?: string;
  constructor(public readonly orderId: string) {}
}

interface LogEntry {
  level: 'info' | 'error' | 'warn' | 'debug';
  message: string;
  context?: any;
  metadata?: string;
}

describe('TelemetryTests', () => {
  /**
   * IT-006: Telemetry Logging
   *
   * Validates NFR-002 requirement that TelemetryBehavior logs:
   * - Request type
   * - Duration (milliseconds)
   * - Status (Success/Failure/Error)
   * - Exception details (if thrown)
   */
  it('Should_LogDurationAndStatus_When_RequestProcessed', async () => {
    // Given: Logger with captured logs
    const logs: LogEntry[] = [];
    const logger: ILogger = {
      info: (context: any, message: string) => {
        logs.push({ level: 'info', context, message });
      },
      error: (context: any, message: string) => {
        logs.push({ level: 'error', context, message });
      },
      warn: (context: any, message: string) => {
        logs.push({ level: 'warn', context, message });
      },
      debug: (context: any, message: string) => {
        logs.push({ level: 'debug', context, message });
      },
    };

    const commandHandler: ICommandHandler<ProcessOrderCommand> = {
      async handle(_request: ProcessOrderCommand, _signal: AbortSignal): Promise<void> {
        // Simulate processing delay
        await new Promise((resolve) => setTimeout(resolve, 10));
      },
    };

    const mediator = new Mediator(
      [{ requestType: ProcessOrderCommand, handler: commandHandler }],
      [
        {
          behavior: new TelemetryBehavior(logger) as IPipelineBehavior<any, any>,
          matcher: new AllRequestsMatcher(),
        },
      ]
    );

    // When: Command executes successfully
    const command = new ProcessOrderCommand('order-456');
    const controller = new AbortController();
    await mediator.send(command, controller.signal);

    // Then: Telemetry logs required fields per NFR-002
    expect(logs.length).toBeGreaterThan(0);

    const telemetryLog = logs.find((log) => log.message.includes('completed'));
    expect(telemetryLog).toBeDefined();
    expect(telemetryLog?.context).toBeDefined();

    // Validate required fields per data-model.md:L456-467
    expect(telemetryLog?.context.requestType).toBe('ProcessOrderCommand');
    expect(telemetryLog?.context.duration).toBeGreaterThanOrEqual(10);
    expect(telemetryLog?.context.status).toBe('Success');
  });

  /**
   * Additional test: Telemetry logs exception details
   */
  it('Should_LogExceptionDetails_When_HandlerThrows', async () => {
    // Given: Logger and handler that throws
    const logs: LogEntry[] = [];
    const logger: ILogger = {
      info: (context: any, message: string) => {
        logs.push({ level: 'info', context, message });
      },
      error: (context: any, message: string) => {
        logs.push({ level: 'error', context, message });
      },
      warn: (context: any, message: string) => {
        logs.push({ level: 'warn', context, message });
      },
      debug: (context: any, message: string) => {
        logs.push({ level: 'debug', context, message });
      },
    };

    const commandHandler: ICommandHandler<ProcessOrderCommand> = {
      async handle(_request: ProcessOrderCommand, _signal: AbortSignal): Promise<void> {
        throw new Error('Database connection failed');
      },
    };

    const mediator = new Mediator(
      [{ requestType: ProcessOrderCommand, handler: commandHandler }],
      [
        {
          behavior: new TelemetryBehavior(logger) as IPipelineBehavior<any, any>,
          matcher: new AllRequestsMatcher(),
        },
      ]
    );

    // When: Handler throws exception
    const command = new ProcessOrderCommand('order-789');
    const controller = new AbortController();

    await expect(mediator.send(command, controller.signal)).rejects.toThrow(
      'Database connection failed'
    );

    // Then: Telemetry logs error details
    const errorLog = logs.find((log) => log.level === 'error');
    expect(errorLog).toBeDefined();
    expect(errorLog?.context.requestType).toBe('ProcessOrderCommand');
    expect(errorLog?.context.status).toBe('InfrastructureError'); // Exceptions = infrastructure errors
    expect(errorLog?.context.exception.message).toContain('Database connection failed');
  });

  /**
   * Additional test: Telemetry works for queries
   */
  it('Should_LogTelemetry_When_QueryExecutes', async () => {
    // Given: Logger and query handler
    const logs: LogEntry[] = [];
    const logger: ILogger = {
      info: (context: any, message: string) => {
        logs.push({ level: 'info', context, message });
      },
      error: (context: any, message: string) => {
        logs.push({ level: 'error', context, message });
      },
      warn: (context: any, message: string) => {
        logs.push({ level: 'warn', context, message });
      },
      debug: (context: any, message: string) => {
        logs.push({ level: 'debug', context, message });
      },
    };

    const queryHandler: IQueryHandler<GetOrderQuery, string> = {
      async handle(request: GetOrderQuery, _signal: AbortSignal): Promise<string> {
        return `Order details for ${request.orderId}`;
      },
    };

    const mediator = new Mediator(
      [{ requestType: GetOrderQuery, handler: queryHandler }],
      [
        {
          behavior: new TelemetryBehavior(logger) as IPipelineBehavior<any, any>,
          matcher: new AllRequestsMatcher(),
        },
      ]
    );

    // When: Query executes
    const query = new GetOrderQuery('order-999');
    const controller = new AbortController();
    await mediator.send(query, controller.signal);

    // Then: Telemetry logged for query
    const telemetryLog = logs.find((log) => log.message.includes('completed'));
    expect(telemetryLog).toBeDefined();
    expect(telemetryLog?.context.requestType).toBe('GetOrderQuery');
    expect(telemetryLog?.context.status).toBe('Success');
  });
});
