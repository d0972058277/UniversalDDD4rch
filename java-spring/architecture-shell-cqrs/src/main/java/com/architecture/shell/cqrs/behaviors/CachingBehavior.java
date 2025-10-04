package com.architecture.shell.cqrs.behaviors;

import com.architecture.shell.cqrs.BaseRequest;
import com.architecture.shell.cqrs.PipelineBehavior;
import com.architecture.shell.cqrs.RequestHandlerDelegate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Pipeline behavior for query result caching.
 * Caches query results to improve performance.
 *
 * Recommended Order: 50 (queries only)
 */
public class CachingBehavior<TRequest extends BaseRequest, TResponse>
    implements PipelineBehavior<TRequest, TResponse> {

    private static final Logger logger = LoggerFactory.getLogger(CachingBehavior.class);

    @Override
    public TResponse handle(TRequest request, RequestHandlerDelegate<TResponse> next) {
        // Cache logic here
        logger.debug("Checking cache for: {}", request.getClass().getSimpleName());
        return next.handle();
    }
}
