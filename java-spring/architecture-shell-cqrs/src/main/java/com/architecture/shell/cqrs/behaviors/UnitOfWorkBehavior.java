package com.architecture.shell.cqrs.behaviors;

import com.architecture.core.functional.Result;
import com.architecture.shell.cqrs.PipelineBehavior;
import com.architecture.shell.cqrs.RequestHandlerDelegate;
import com.architecture.shell.cqrs.UnitOfWork;
import com.architecture.shell.cqrs.BaseRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Pipeline behavior that manages transaction boundaries for commands.
 * Opens transactions, commits on success, rolls back on exceptions.
 *
 * Requirements:
 * - BR-001: Commands execute within transactions
 * - BR-003: Queries skip transaction management
 * - BR-005: Nested commands reuse active transaction
 * - BR-006: Fail fast when transaction provider unavailable
 * - BR-007/BR-008: Result.failure() commits, exceptions rollback
 * - data-model.md:L491-L516: Log TransactionId BEFORE rollback
 *
 * Transaction Semantics:
 * - Command + no active tx → begin, execute, commit/rollback
 * - Command + active tx → reuse, execute, outer command commits/rolls back
 * - Query → skip transaction logic entirely
 * - Result.failure() → COMMIT (business rejection is valid state)
 * - Exception thrown → ROLLBACK (infrastructure failure)
 *
 * DDD Layer: Application Layer Infrastructure
 */
public class UnitOfWorkBehavior<TRequest extends BaseRequest, TResponse>
    implements PipelineBehavior<TRequest, TResponse> {

    private static final Logger logger = LoggerFactory.getLogger(UnitOfWorkBehavior.class);

    private final UnitOfWork unitOfWork;

    public UnitOfWorkBehavior(UnitOfWork unitOfWork) {
        this.unitOfWork = unitOfWork;
    }

    @Override
    public TResponse handle(TRequest request, RequestHandlerDelegate<TResponse> next) {
        // Skip transaction for queries (BR-003)
        if (!(request instanceof com.architecture.shell.cqrs.Command)) {
            return next.handle();
        }

        // Check if transaction already active (nested command scenario per BR-005)
        boolean isOuterCommand = !unitOfWork.hasActiveTransaction();

        if (isOuterCommand) {
            // Outer command: open new transaction (may throw per BR-006 fail-fast)
            try {
                unitOfWork.beginTransaction();
                logger.debug("Transaction started: TransactionId={}", unitOfWork.getTransactionId());
            } catch (Exception ex) {
                logger.error("Failed to begin transaction (BR-006 fail-fast): {}", ex.getMessage());
                throw ex; // Propagate to caller
            }
        } else {
            // Nested command: reuse existing transaction
            logger.debug("Reusing active transaction: TransactionId={}", unitOfWork.getTransactionId());
        }

        try {
            // Execute handler
            TResponse response = next.handle();

            // Only commit if this is the outer command
            if (isOuterCommand) {
                // Check if response is Result.failure() - still commits per BR-007/BR-008
                if (response instanceof Result<?> result && result.isFailure()) {
                    logger.debug("Command returned Result.failure() - committing transaction (business rejection): TransactionId={}",
                        unitOfWork.getTransactionId());
                } else {
                    logger.debug("Command succeeded - committing transaction: TransactionId={}",
                        unitOfWork.getTransactionId());
                }
                unitOfWork.commit();
            }

            return response;

        } catch (Exception ex) {
            // Only rollback if this is the outer command
            if (isOuterCommand) {
                // Log BEFORE rollback per data-model.md:L491-L516
                logger.error("Command failed - TransactionId={} RequestType={} Duration={}ms Exception={}",
                    unitOfWork.getTransactionId(),
                    request.getClass().getSimpleName(),
                    "N/A", // Duration tracked by TelemetryBehavior
                    ex.getMessage(),
                    ex);

                try {
                    unitOfWork.rollback();
                    logger.debug("Transaction rolled back: TransactionId={}", unitOfWork.getTransactionId());
                } catch (Exception rollbackEx) {
                    logger.error("Rollback failed for TransactionId={}: {}",
                        unitOfWork.getTransactionId(),
                        rollbackEx.getMessage(),
                        rollbackEx);
                    // Don't throw rollback exception - preserve original exception
                }
            }
            throw ex; // Propagate original exception
        }
    }
}
