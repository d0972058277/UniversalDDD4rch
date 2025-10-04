package com.architecture.shell.cqrs.behaviors;

import com.architecture.shell.cqrs.BaseRequest;
import com.architecture.shell.cqrs.PipelineBehavior;
import com.architecture.shell.cqrs.RequestHandlerDelegate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Pipeline behavior for authorization checks.
 * Verifies user permissions before handler execution.
 *
 * Recommended Order: 20 (after validation, before transaction)
 */
public class AuthorizationBehavior<TRequest extends BaseRequest, TResponse>
    implements PipelineBehavior<TRequest, TResponse> {

    private static final Logger logger = LoggerFactory.getLogger(AuthorizationBehavior.class);

    @Override
    public TResponse handle(TRequest request, RequestHandlerDelegate<TResponse> next) {
        logger.debug("Authorizing request: {}", request.getClass().getSimpleName());
        // Authorization logic here
        return next.handle();
    }
}
