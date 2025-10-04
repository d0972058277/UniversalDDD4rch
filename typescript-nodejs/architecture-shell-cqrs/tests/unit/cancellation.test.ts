import 'reflect-metadata';
import { Mediator } from '../../src/Mediator';
import { Command } from '../../src/Command';
import { ICommandHandler } from '../../src/ICommandHandler';

/**
 * UT-004: Cancellation Token Propagation
 *
 * These tests verify that cancellation signals (AbortSignal) propagate through
 * the mediator pipeline and terminate execution early when requested.
 * Following TDD principles: tests MUST fail before implementation.
 */

// Test command
class LongRunningCommand implements Command {
  _isCommand = true as const;
  __phantom?: void;
  constructor(public readonly duration: number) {}
}

describe('CancellationTests', () => {
  // UT-004: T050
  test('Should_TerminateEarly_When_CancellationRequested', async () => {
    // Given: A long-running command handler that checks cancellation signal
    const abortController = new AbortController();
    let handlerCompleted = false;

    const handler: ICommandHandler<LongRunningCommand> = {
      async handle(_request: LongRunningCommand, signal: AbortSignal): Promise<void> {
        // Simulate long-running operation with cancellation check
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            handlerCompleted = true;
            resolve();
          }, 1000);

          signal.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new Error('Operation cancelled'));
          });
        });
      },
    };

    const mediator = new Mediator(
      [{ requestType: LongRunningCommand, handler }]
    );

    // When: AbortSignal is triggered during handler execution
    setTimeout(() => abortController.abort(), 100);

    // Then: Handler should terminate early and throw appropriate error
    await expect(
      mediator.send(new LongRunningCommand(1000), abortController.signal)
    ).rejects.toThrow('Operation cancelled');

    expect(handlerCompleted).toBe(false); // Handler did not complete
  });
});
