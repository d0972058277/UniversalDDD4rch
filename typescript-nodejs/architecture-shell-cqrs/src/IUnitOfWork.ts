/**
 * IUnitOfWork - Transaction boundary abstraction for commands
 *
 * Provides transaction management for state-changing operations.
 * Integrates with database-specific transaction mechanisms (e.g., TypeORM, Sequelize).
 *
 * @remarks
 * Behavior:
 * - beginTransaction(): Opens new transaction if none active; throws if transaction provider unavailable (fail fast per BR-006)
 * - hasActiveTransaction: Returns true if transaction currently active (prevents nested transaction attempts)
 * - commit(): Persists changes; called by UnitOfWork behavior on successful handler completion (including Result.Failure business errors)
 * - rollback(): Discards changes; called by UnitOfWork behavior on exception
 *
 * Constraints:
 * - UnitOfWork behavior MUST check hasActiveTransaction before calling beginTransaction()
 * - Transaction context propagates via AsyncLocalStorage<Transaction>
 * - Query handlers MUST NOT trigger transaction opening
 *
 * @example
 * ```typescript
 * export class TypeOrmUnitOfWork implements IUnitOfWork {
 *   private queryRunner?: QueryRunner;
 *
 *   get transactionId(): string {
 *     return this.queryRunner?.connection.driver.transactionId ?? '';
 *   }
 *
 *   get hasActiveTransaction(): boolean {
 *     return this.queryRunner?.isTransactionActive ?? false;
 *   }
 *
 *   async beginTransaction(signal: AbortSignal): Promise<void> {
 *     if (this.hasActiveTransaction) return; // Reuse existing
 *     this.queryRunner = this.connection.createQueryRunner();
 *     await this.queryRunner.connect();
 *     await this.queryRunner.startTransaction();
 *   }
 *
 *   async commit(signal: AbortSignal): Promise<void> {
 *     if (!this.hasActiveTransaction) return;
 *     await this.queryRunner!.commitTransaction();
 *     await this.queryRunner!.release();
 *   }
 *
 *   async rollback(signal: AbortSignal): Promise<void> {
 *     if (!this.hasActiveTransaction) return;
 *     await this.queryRunner!.rollbackTransaction();
 *     await this.queryRunner!.release();
 *   }
 * }
 * ```
 *
 * @see {@link UnitOfWorkBehavior} - Pipeline behavior that manages transaction lifecycle
 */
export interface IUnitOfWork {
  /**
   * Unique identifier for the current transaction
   * Used for correlation in logs and telemetry per NFR-002
   */
  readonly transactionId: string;

  /**
   * Indicates whether a transaction is currently active
   * Used to prevent nested transaction attempts
   */
  readonly hasActiveTransaction: boolean;

  /**
   * Opens a new transaction if none is active
   *
   * @param signal - Cancellation signal
   * @throws If transaction provider is unavailable (e.g., connection pool exhausted, database down)
   */
  beginTransaction(signal: AbortSignal): Promise<void>;

  /**
   * Commits the active transaction, persisting all changes
   *
   * @param signal - Cancellation signal
   * @throws If commit fails (e.g., constraint violation, deadlock)
   */
  commit(signal: AbortSignal): Promise<void>;

  /**
   * Rolls back the active transaction, discarding all changes
   *
   * @param signal - Cancellation signal
   */
  rollback(signal: AbortSignal): Promise<void>;
}
