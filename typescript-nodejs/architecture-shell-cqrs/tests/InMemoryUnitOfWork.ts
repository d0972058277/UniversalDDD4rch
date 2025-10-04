import { IUnitOfWork } from '../src/IUnitOfWork';
import { randomUUID } from 'crypto';

/**
 * InMemoryUnitOfWork - In-memory transaction implementation for testing
 *
 * Simulates transaction behavior without actual database connections.
 * Tracks transaction state for test verification.
 *
 * @remarks
 * Used by integration tests to validate transaction lifecycle:
 * - Begin/commit/rollback call sequences
 * - Nested transaction reuse
 * - TransactionId generation
 *
 * @example
 * ```typescript
 * const unitOfWork = new InMemoryUnitOfWork();
 * await unitOfWork.beginTransaction(signal);
 * // ... execute commands
 * await unitOfWork.commit(signal);
 * expect(unitOfWork.commitCallCount).toBe(1);
 * ```
 */
export class InMemoryUnitOfWork implements IUnitOfWork {
  private _transactionId: string | null = null;
  private _hasActiveTransaction = false;

  // Test instrumentation properties
  public beginTransactionCallCount = 0;
  public commitCallCount = 0;
  public rollbackCallCount = 0;

  get transactionId(): string {
    return this._transactionId ?? '';
  }

  get hasActiveTransaction(): boolean {
    return this._hasActiveTransaction;
  }

  async beginTransaction(_signal: AbortSignal): Promise<void> {
    if (this._hasActiveTransaction) {
      // Nested transaction attempt - reuse existing
      return;
    }

    this._transactionId = randomUUID();
    this._hasActiveTransaction = true;
    this.beginTransactionCallCount++;
  }

  async commit(_signal: AbortSignal): Promise<void> {
    if (!this._hasActiveTransaction) {
      throw new Error('No active transaction to commit');
    }

    this._hasActiveTransaction = false;
    this._transactionId = null;
    this.commitCallCount++;
  }

  async rollback(_signal: AbortSignal): Promise<void> {
    if (!this._hasActiveTransaction) {
      // Rollback on non-active transaction is a no-op
      return;
    }

    this._hasActiveTransaction = false;
    this._transactionId = null;
    this.rollbackCallCount++;
  }

  /**
   * Resets call counts for test isolation
   */
  reset(): void {
    this._transactionId = null;
    this._hasActiveTransaction = false;
    this.beginTransactionCallCount = 0;
    this.commitCallCount = 0;
    this.rollbackCallCount = 0;
  }
}
