package com.architecture.shell.cqrs;

import java.util.UUID;

/**
 * Transaction boundary abstraction for commands.
 * Manages database transactions with support for nested command detection.
 *
 * Requirements:
 * - BR-001: Commands execute within transaction boundaries
 * - BR-002: TransactionId logged for all command executions (telemetry requirement)
 * - BR-003: Queries do NOT open transactions
 * - BR-005: Nested commands reuse active transaction (no nested transaction opening)
 * - BR-006: Fail fast when transaction provider unavailable (BeginTransaction throws)
 * - BR-007: Result.failure() commits transaction, exceptions rollback
 *
 * Transaction Lifecycle:
 * 1. UnitOfWorkBehavior checks hasActiveTransaction()
 * 2. If no active transaction: beginTransaction()
 * 3. Handler executes within transaction context
 * 4. If Result.failure() or success: commit()
 * 5. If exception thrown: rollback()
 *
 * Nested Command Pattern:
 * <pre>
 * Outer Command:
 *   1. UnitOfWork.beginTransaction() → TransactionId = ABC
 *   2. Handler calls Mediator.send(InnerCommand)
 *
 * Inner Command:
 *   1. UnitOfWork.hasActiveTransaction() → true
 *   2. Skip beginTransaction(), reuse ABC
 *   3. Handler executes in ABC transaction
 *
 * Outer Command (continued):
 *   4. commit() or rollback() based on outer command result
 * </pre>
 *
 * DDD Layer: Application Layer Infrastructure
 *
 * @see UnitOfWorkBehavior
 */
public interface UnitOfWork {

    /**
     * Gets the current transaction ID.
     * Required for telemetry logging per BR-002 and NFR-002.
     *
     * @return The transaction ID, or null if no active transaction
     */
    UUID getTransactionId();

    /**
     * Checks if a transaction is currently active.
     * Used to detect nested commands per BR-005.
     *
     * @return true if transaction is active in current context
     */
    boolean hasActiveTransaction();

    /**
     * Begins a new transaction.
     * MUST be called only when hasActiveTransaction() returns false.
     *
     * @throws IllegalStateException if transaction provider unavailable (BR-006 fail-fast)
     * @throws IllegalStateException if transaction already active (caller violated BR-005 check)
     */
    void beginTransaction();

    /**
     * Commits the current transaction.
     * Called on successful handler completion, including Result.failure() per BR-007/BR-008.
     *
     * @throws IllegalStateException if no active transaction
     * @throws RuntimeException if commit fails (infrastructure error)
     */
    void commit();

    /**
     * Rolls back the current transaction.
     * Called when handler or behavior throws exception per BR-007.
     *
     * @throws IllegalStateException if no active transaction
     * @throws RuntimeException if rollback fails (logged but not rethrown to preserve original exception)
     */
    void rollback();
}
