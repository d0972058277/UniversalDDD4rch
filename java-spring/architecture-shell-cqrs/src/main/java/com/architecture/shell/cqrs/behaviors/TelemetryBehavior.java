package com.architecture.shell.cqrs.behaviors;

import com.architecture.shell.cqrs.BaseRequest;
import com.architecture.shell.cqrs.PipelineBehavior;
import com.architecture.shell.cqrs.RequestHandlerDelegate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Pipeline behavior for telemetry and logging.
 * Logs request type, duration, status, and exceptions.
 *
 * Recommended Order: 40 (after transaction, measures handler execution)
 */
public class TelemetryBehavior<TRequest extends BaseRequest, TResponse>
    implements PipelineBehavior<TRequest, TResponse> {

    private static final Logger logger = LoggerFactory.getLogger(TelemetryBehavior.class);

    @Override
    public TResponse handle(TRequest request, RequestHandlerDelegate<TResponse> next) {
        long startTime = System.currentTimeMillis();
        logger.info("Request started: {}", request.getClass().getSimpleName());

        try {
            TResponse response = next.handle();
            long duration = System.currentTimeMillis() - startTime;
            logger.info("Request completed: {} Duration={}ms Status=Success",
                request.getClass().getSimpleName(), duration);
            return response;
        } catch (Exception ex) {
            long duration = System.currentTimeMillis() - startTime;
            logger.error("Request failed: {} Duration={}ms Status=Error Exception={}",
                request.getClass().getSimpleName(), duration, ex.getMessage(), ex);
            throw ex;
        }
    }
}
