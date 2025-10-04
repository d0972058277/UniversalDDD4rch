import 'reflect-metadata';
import { Mediator } from '../../src/Mediator';
import { Command } from '../../src/Command';
import { BaseRequest } from '../../src/BaseRequest';
import { ICommandHandler, ICommandHandlerWithResult } from '../../src/ICommandHandler';
import { UnitOfWorkBehavior, ILogger } from '../../src/behaviors/UnitOfWorkBehavior';
import { InMemoryUnitOfWork } from '../InMemoryUnitOfWork';
import { CommandOnlyMatcher } from '../../src/IBehaviorMatcher';

// Test command without return value
class TestCommand implements Command {
  _isCommand = true as const;
  __phantom?: void;
  constructor(public readonly value: string) {}
}

// Test command with return value
class CreateEntityCommand implements BaseRequest<Result<string>> {
  _isCommand = true as const;
  __phantom?: Result<string>;
  constructor(public readonly name: string) {}
}

// Test command that throws exception
class FailingCommand implements Command {
  _isCommand = true as const;
  __phantom?: void;
  constructor(public readonly shouldFail: boolean) {}
}

// Mock logger
class MockLogger implements ILogger {
  public logs: any[] = [];

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

// Mock Result type for business failures
class Result<T> {
  private constructor(
    public readonly isSuccess: boolean,
    public readonly isFailure: boolean,
    public readonly value: T | undefined,
    public readonly error: string | undefined
  ) {}

  static success<T>(value: T): Result<T> {
    return new Result<T>(true, false, value, undefined);
  }

  static failure<T>(error: string): Result<T> {
    return new Result<T>(false, true, undefined, error);
  }
}

/**
 * IT-001: Command Execution Lifecycle
 * IT-002: Command Execution Rollback
 * IT-008: Transaction Commit on Business Failure
 * IT-008b: Transaction Commit on Business Failure (Void Commands)
 * IT-009: Transaction Provider Failure
 * IT-010: Behavior Exception Rollback
 */
describe('CommandExecutionTests', () => {
  let unitOfWork: InMemoryUnitOfWork;
  let logger: MockLogger;
  let signal: AbortSignal;

  beforeEach(() => {
    unitOfWork = new InMemoryUnitOfWork();
    logger = new MockLogger();
    signal = new AbortController().signal;
  });

  // IT-001: T150
  test('Should_CommitTransaction_When_CommandSucceeds', async () => {
    // Given: Command handler that succeeds
    let handlerExecuted = false;
    const handler: ICommandHandler<TestCommand> = {
      async handle(_request: TestCommand, _signal: AbortSignal): Promise<void> {
        handlerExecuted = true;
      },
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

    // When: Command is sent
    const command = new TestCommand('test');
    await mediator.send(command, signal);

    // Then: Transaction should be committed
    expect(handlerExecuted).toBe(true);
    expect(unitOfWork.beginTransactionCallCount).toBe(1);
    expect(unitOfWork.commitCallCount).toBe(1);
    expect(unitOfWork.rollbackCallCount).toBe(0);
    expect(unitOfWork.hasActiveTransaction).toBe(false);
  });

  // IT-002: T155
  test('Should_RollbackTransaction_When_CommandThrowsException', async () => {
    // Given: Command handler that throws exception
    const handler: ICommandHandler<FailingCommand> = {
      async handle(_request: FailingCommand, _signal: AbortSignal): Promise<void> {
        throw new Error('Infrastructure failure');
      },
    };

    const mediator = new Mediator(
      [{ requestType: FailingCommand, handler }],
      [
        {
          behavior: new UnitOfWorkBehavior(unitOfWork, logger),
          matcher: new CommandOnlyMatcher(),
        },
      ]
    );

    // When: Command is sent and throws
    const command = new FailingCommand(true);

    // Then: Should rollback transaction
    await expect(mediator.send(command, signal)).rejects.toThrow(
      'Infrastructure failure'
    );
    expect(unitOfWork.beginTransactionCallCount).toBe(1);
    expect(unitOfWork.commitCallCount).toBe(0);
    expect(unitOfWork.rollbackCallCount).toBe(1);
    expect(unitOfWork.hasActiveTransaction).toBe(false);
  });

  // IT-008: T214
  test('Should_CommitTransaction_When_HandlerReturnsResultFailure', async () => {
    // Given: Command handler that returns Result.Failure (business error)
    const handler: ICommandHandlerWithResult<CreateEntityCommand, Result<string>> = {
      async handle(
        _request: CreateEntityCommand,
        _signal: AbortSignal
      ): Promise<Result<string>> {
        // Business validation failure
        return Result.failure('Invalid entity name');
      },
    };

    const mediator = new Mediator(
      [{ requestType: CreateEntityCommand, handler }],
      [
        {
          behavior: new UnitOfWorkBehavior(unitOfWork, logger),
          matcher: new CommandOnlyMatcher(),
        },
      ]
    );

    // When: Command returns business failure
    const command = new CreateEntityCommand('');
    const result = await mediator.send(command, signal);

    // Then: Transaction should commit (business failure is valid state per BR-008)
    expect(result.isFailure).toBe(true);
    expect(unitOfWork.beginTransactionCallCount).toBe(1);
    expect(unitOfWork.commitCallCount).toBe(1);
    expect(unitOfWork.rollbackCallCount).toBe(0);
  });

  // IT-008b: T214b
  test('Should_CommitTransaction_When_VoidCommandHandlerReturnsResultFailure', async () => {
    // Given: Command that returns Result<void>
    class VoidResultCommand implements BaseRequest<Result<void>> {
      _isCommand = true as const;
      __phantom?: Result<void>;
      constructor(public readonly value: string) {}
    }

    // Void command handler that returns Result<void>.Failure
    const handler: ICommandHandlerWithResult<VoidResultCommand, Result<void>> = {
      async handle(
        _request: VoidResultCommand,
        _signal: AbortSignal
      ): Promise<Result<void>> {
        return Result.failure('Validation failed');
      },
    };

    const mediator = new Mediator(
      [{ requestType: VoidResultCommand, handler }],
      [
        {
          behavior: new UnitOfWorkBehavior(unitOfWork, logger),
          matcher: new CommandOnlyMatcher(),
        },
      ]
    );

    // When: Void command returns business failure
    const command = new VoidResultCommand('invalid');
    const result = await mediator.send(command, signal);

    // Then: Transaction should commit per BR-008
    expect(result.isFailure).toBe(true);
    expect(unitOfWork.commitCallCount).toBe(1);
    expect(unitOfWork.rollbackCallCount).toBe(0);
  });

  // IT-009: T219
  test('Should_ThrowException_When_TransactionProviderFails', async () => {
    // Given: UnitOfWork that throws on BeginTransaction (simulates connection pool exhaustion)
    const failingUnitOfWork: any = {
      get transactionId() {
        return '';
      },
      get hasActiveTransaction() {
        return false;
      },
      async beginTransaction(_signal: AbortSignal): Promise<void> {
        throw new Error('Connection pool exhausted');
      },
      async commit(_signal: AbortSignal): Promise<void> {},
      async rollback(_signal: AbortSignal): Promise<void> {},
    };

    const handler: ICommandHandler<TestCommand> = {
      async handle(_request: TestCommand, _signal: AbortSignal): Promise<void> {
        // Should not reach here
        throw new Error('Handler should not execute');
      },
    };

    const mediator = new Mediator(
      [{ requestType: TestCommand, handler }],
      [
        {
          behavior: new UnitOfWorkBehavior(failingUnitOfWork, logger),
          matcher: new CommandOnlyMatcher(),
        },
      ]
    );

    // When/Then: Should fail fast on transaction provider failure per BR-006
    const command = new TestCommand('test');
    await expect(mediator.send(command, signal)).rejects.toThrow(
      'Connection pool exhausted'
    );
  });

  // IT-010: T224
  test('Should_RollbackTransaction_When_BehaviorThrowsException', async () => {
    // Given: Behavior that throws exception (not handler)
    // FailingBehavior must have higher order than UnitOfWorkBehavior so transaction is started first
    class FailingBehavior {
      order = 35; // After UnitOfWork (30) so transaction is already started
      async handle(_request: any, _next: any, _signal: AbortSignal): Promise<any> {
        // Behavior throws before handler executes
        throw new Error('Behavior validation failed');
      }
    }

    let handlerExecuted = false;
    const handler: ICommandHandler<TestCommand> = {
      async handle(_request: TestCommand, _signal: AbortSignal): Promise<void> {
        handlerExecuted = true;
      },
    };

    const mediator = new Mediator(
      [{ requestType: TestCommand, handler }],
      [
        {
          behavior: new UnitOfWorkBehavior(unitOfWork, logger) as any,
          matcher: new CommandOnlyMatcher(),
        },
        {
          behavior: new FailingBehavior(),
          matcher: new CommandOnlyMatcher(),
        },
      ]
    );

    // When: Behavior throws exception
    const command = new TestCommand('test');

    // Then: Should rollback transaction per spec.md:L68-69
    await expect(mediator.send(command, signal)).rejects.toThrow(
      'Behavior validation failed'
    );
    expect(handlerExecuted).toBe(false); // Handler should not execute
    expect(unitOfWork.rollbackCallCount).toBe(1);
    expect(unitOfWork.commitCallCount).toBe(0);

    // Verify TransactionId was logged before rollback per BR-002
    const errorLogs = logger.logs.filter((l) => l.level === 'error');
    expect(errorLogs.length).toBeGreaterThan(0);
    expect(errorLogs[0].context.transactionId).toBeDefined();
  });
});
