import 'reflect-metadata';
import { Mediator } from '../../src/Mediator';
import { Command } from '../../src/Command';
import { ICommandHandler } from '../../src/ICommandHandler';

/**
 * UT-001: Handler Registration Uniqueness Tests
 * UT-001c: Handler Uniqueness at Constructor Time Tests
 *
 * These tests follow TDD principles: they MUST fail before implementation exists.
 */

// Test command
class TestCommand implements Command {
  _isCommand = true as const;
  __phantom?: void;
  constructor(public readonly value: string) {}
}

describe('MediatorTests', () => {
  // UT-001: T029
  test('Should_ThrowException_When_ZeroHandlersRegistered', async () => {
    // Given: Mediator with no handlers registered
    const mediator = new Mediator([]);
    const signal = new AbortController().signal;

    // When: Attempting to send command with no handler
    const command = new TestCommand('test');

    // Then: Should throw exception indicating no handler found
    await expect(mediator.send(command, signal)).rejects.toThrow(
      'No handler registered for request type: TestCommand'
    );
  });

  // UT-001: T034
  test('Should_ThrowException_When_MultipleHandlersRegistered', async () => {
    // Given: Multiple handlers registered for same command type
    const handler1: ICommandHandler<TestCommand> = {
      async handle(_request: TestCommand, _signal: AbortSignal): Promise<void> {},
    };

    const handler2: ICommandHandler<TestCommand> = {
      async handle(_request: TestCommand, _signal: AbortSignal): Promise<void> {},
    };

    // When/Then: Mediator constructor should throw on ambiguous registration
    expect(() => {
      new Mediator([
        { requestType: TestCommand, handler: handler1 },
        { requestType: TestCommand, handler: handler2 },
      ]);
    }).toThrow('Multiple handlers registered for request types: TestCommand');
  });

  // UT-001c: T039b
  test('Should_ThrowException_When_ConstructorDetectsAmbiguousHandlers', () => {
    // Given: Mediator configuration with 2+ handlers for same command type
    const handler1: ICommandHandler<TestCommand> = {
      async handle(_request: TestCommand, _signal: AbortSignal): Promise<void> {},
    };

    const handler2: ICommandHandler<TestCommand> = {
      async handle(_request: TestCommand, _signal: AbortSignal): Promise<void> {},
    };

    // When: Mediator constructor is called
    // Then: Should throw with handler names in error message
    expect(() => {
      new Mediator([
        { requestType: TestCommand, handler: handler1 },
        { requestType: TestCommand, handler: handler2 },
      ]);
    }).toThrow(/Multiple handlers.*TestCommand/);
  });
});
