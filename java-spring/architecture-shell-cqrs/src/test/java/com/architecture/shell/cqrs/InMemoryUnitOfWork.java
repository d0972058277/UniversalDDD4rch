package com.architecture.shell.cqrs;

import java.util.UUID;

/**
 * In-memory implementation of UnitOfWork for testing.
 * Simulates transaction lifecycle without actual database connections.
 *
 * DDD Layer: Application Layer Infrastructure (Test)
 */
public class InMemoryUnitOfWork implements UnitOfWork {

    private UUID transactionId;
    private boolean isActive;
    private boolean wasCommitted;
    private boolean wasRolledBack;

    @Override
    public UUID getTransactionId() {
        return transactionId;
    }

    @Override
    public boolean hasActiveTransaction() {
        return isActive;
    }

    @Override
    public void beginTransaction() {
        if (isActive) {
            throw new IllegalStateException("Transaction already active");
        }
        this.transactionId = UUID.randomUUID();
        this.isActive = true;
        this.wasCommitted = false;
        this.wasRolledBack = false;
    }

    @Override
    public void commit() {
        if (!isActive) {
            throw new IllegalStateException("No active transaction to commit");
        }
        this.wasCommitted = true;
        this.isActive = false;
    }

    @Override
    public void rollback() {
        if (!isActive) {
            throw new IllegalStateException("No active transaction to rollback");
        }
        this.wasRolledBack = true;
        this.isActive = false;
    }

    // Test helper methods
    public boolean wasCommitted() {
        return wasCommitted;
    }

    public boolean wasRolledBack() {
        return wasRolledBack;
    }

    public void reset() {
        this.transactionId = null;
        this.isActive = false;
        this.wasCommitted = false;
        this.wasRolledBack = false;
    }
}
