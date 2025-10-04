import 'reflect-metadata';
import { Mediator } from '../../src/Mediator';
import { Command } from '../../src/Command';
import { ICommandHandler } from '../../src/ICommandHandler';
import { UnitOfWorkBehavior, ILogger } from '../../src/behaviors/UnitOfWorkBehavior';
import { InMemoryUnitOfWork } from '../InMemoryUnitOfWork';
import { CommandOnlyMatcher } from '../../src/IBehaviorMatcher';

/**
 * UT-005: UnitOfWork Transaction Behavior - Isolated
 * UT-006: Nested Command Transaction Reuse
 *
 * These tests verify UnitOfWork behavior in isolation using mocked transactions.
 * End-to-end transaction lifecycle is validated in IT-001/IT-002.
 * Following TDD principles: tests MUST fail before implementation.
 */

// Test command
class TestCommand implements Command {
  _isCommand = true as const;
  __phantom?: void;
  constructor(public readonly value: string) {}
}

// Mock logger
class MockLogger implements ILogger {
  logs: any[] = [];
  error(context: any, message: string): void {
    this.logs.push({ level: 'error', context, message });
  }
  warn(context: any, message: string): void {
    this.logs.push({ level: 'warn', context, message });
  }
  info(context: any, message: string): void {
    this.logs.push({ level: 'info', context, message });
  }
  debug(context: any, message: string): void {
    this.logs.push({ level: 'debug', context, message });
  }
}

describe('UnitOfWorkBehaviorTests', () => {
  // UT-005: T055
  test('Should_CallBeginTransaction_When_CommandExecutes', async () => {
    // Given: A command handler with mocked IUnitOfWork
    const unitOfWork = new InMemoryUnitOfWork();
    const logger = new MockLogger();
    const handler: ICommandHandler<TestCommand> = {
      async handle(_request: TestCommand, _signal: AbortSignal): Promise<void> {},
    };

    const mediator = new Mediator(
      [{ requestType: TestCommand, handler }],
      [
        {
          behavior: new UnitOfWorkBehavior(unitOfWork, logger),
          matcher: new CommandOnlyMatcher(),
        },
      ]
    );

    // When: Command is sent through mediator
    const signal = new AbortController().signal;
    await mediator.send(new TestCommand('test'), signal);

    // Then: Should call mock IUnitOfWork.beginTransaction()
    expect(unitOfWork.beginTransactionCallCount).toBe(1);
    expect(unitOfWork.commitCallCount).toBe(1);
  });

  // UT-006: T060
  test('Should_ReuseTransaction_When_NestedCommandExecuted', async () => {
    // Given: Outer command handler that calls mediator.send(innerCommand)
    const unitOfWork = new InMemoryUnitOfWork();
    const logger = new MockLogger();

    class InnerCommand implements Command {
      _isCommand = true as const;
      __phantom?: void;
      constructor(public readonly value: string) {}
    }

    const innerHandler: ICommandHandler<InnerCommand> = {
      async handle(_request: InnerCommand, _signal: AbortSignal): Promise<void> {},
    };

    let mediator: Mediator;

    const outerHandler: ICommandHandler<TestCommand> = {
      async handle(_request: TestCommand, signal: AbortSignal): Promise<void> {
        // Call nested command
        await mediator.send(new InnerCommand('nested'), signal);
      },
    };

    mediator = new Mediator(
      [
        { requestType: TestCommand, handler: outerHandler },
        { requestType: InnerCommand, handler: innerHandler },
      ],
      [
        {
          behavior: new UnitOfWorkBehavior(unitOfWork, logger),
          matcher: new CommandOnlyMatcher(),
        },
      ]
    );

    // When: Outer command executes and calls inner command
    const signal = new AbortController().signal;
    await mediator.send(new TestCommand('outer'), signal);

    // Then: Should reuse active transaction (only one BeginTransaction call)
    expect(unitOfWork.beginTransactionCallCount).toBe(1);
    expect(unitOfWork.commitCallCount).toBe(1);
  });
});
