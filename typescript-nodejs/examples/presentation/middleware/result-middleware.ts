import { Request, Response, NextFunction } from 'express';
import { Result, Error as DomainError } from '../../../src/functional';

/**
 * Express middleware for handling Result<T> return values
 * Demonstrates integration between functional error handling and Express.js
 */

/**
 * Middleware that wraps async route handlers to automatically handle Result<T> responses
 */
export function resultHandler<T>(
    handler: (req: Request, res: Response, next: NextFunction) => Promise<Result<T>>
) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await handler(req, res, next);

            if (result.isSuccess) {
                // Success case - send the data
                const statusCode = getSuccessStatusCode(req.method);

                if (result.value === undefined || result.value === null) {
                    res.status(statusCode).send();
                } else {
                    res.status(statusCode).json({
                        success: true,
                        data: result.value,
                        timestamp: new Date().toISOString()
                    });
                }
            } else {
                // Failure case - convert error to HTTP response
                const errorResponse = mapErrorToHttpResponse(result.error);
                res.status(errorResponse.statusCode).json(errorResponse.body);
            }
        } catch (error) {
            // Unhandled exception - convert to 500 error
            console.error('Unhandled error in route handler:', error);

            const errorResponse = {
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An unexpected error occurred',
                    category: 'Infrastructure'
                },
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id'] as string || generateRequestId()
            };

            res.status(500).json(errorResponse);
        }
    };
}

/**
 * Middleware that wraps synchronous route handlers to automatically handle Result<T> responses
 */
export function syncResultHandler<T>(
    handler: (req: Request, res: Response, next: NextFunction) => Result<T>
) {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            const result = handler(req, res, next);

            if (result.isSuccess) {
                const statusCode = getSuccessStatusCode(req.method);

                if (result.value === undefined || result.value === null) {
                    res.status(statusCode).send();
                } else {
                    res.status(statusCode).json({
                        success: true,
                        data: result.value,
                        timestamp: new Date().toISOString()
                    });
                }
            } else {
                const errorResponse = mapErrorToHttpResponse(result.error);
                res.status(errorResponse.statusCode).json(errorResponse.body);
            }
        } catch (error) {
            console.error('Unhandled error in sync route handler:', error);

            const errorResponse = {
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An unexpected error occurred',
                    category: 'Infrastructure'
                },
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id'] as string || generateRequestId()
            };

            res.status(500).json(errorResponse);
        }
    };
}

/**
 * Express middleware for global error handling of Domain Errors
 */
export function domainErrorHandler(
    error: any,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // If response already sent, delegate to default Express error handler
    if (res.headersSent) {
        return next(error);
    }

    // Handle domain errors
    if (isDomainError(error)) {
        const errorResponse = mapErrorToHttpResponse(error);
        res.status(errorResponse.statusCode).json(errorResponse.body);
        return;
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
        const errorResponse = {
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: error.message,
                category: 'Validation',
                details: error.details || []
            },
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] as string || generateRequestId()
        };

        res.status(400).json(errorResponse);
        return;
    }

    // Handle other known error types
    if (error.name === 'CastError' || error.name === 'ValidationError') {
        const errorResponse = {
            success: false,
            error: {
                code: 'INVALID_INPUT',
                message: 'Invalid input data',
                category: 'Validation'
            },
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] as string || generateRequestId()
        };

        res.status(400).json(errorResponse);
        return;
    }

    // Default error handling
    console.error('Unhandled error:', error);

    const errorResponse = {
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
            category: 'Infrastructure'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || generateRequestId()
    };

    res.status(500).json(errorResponse);
}

/**
 * Middleware to add request ID for tracking
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
    const requestId = req.headers['x-request-id'] as string || generateRequestId();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
}

/**
 * Middleware to validate request body against a schema
 */
export function validateBody<T>(
    validator: (body: any) => Result<T>
) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const validationResult = validator(req.body);

        if (validationResult.isFailure) {
            const errorResponse = mapErrorToHttpResponse(validationResult.error);
            res.status(errorResponse.statusCode).json(errorResponse.body);
            return;
        }

        // Replace body with validated/parsed data
        req.body = validationResult.value;
        next();
    };
}

/**
 * Middleware to validate query parameters
 */
export function validateQuery<T>(
    validator: (query: any) => Result<T>
) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const validationResult = validator(req.query);

        if (validationResult.isFailure) {
            const errorResponse = mapErrorToHttpResponse(validationResult.error);
            res.status(errorResponse.statusCode).json(errorResponse.body);
            return;
        }

        // Replace query with validated/parsed data
        req.query = validationResult.value as any;
        next();
    };
}

/**
 * Type guard to check if an error is a domain error
 */
function isDomainError(error: any): error is DomainError {
    return error &&
           typeof error.code === 'string' &&
           typeof error.message === 'string' &&
           typeof error.category === 'string';
}

/**
 * Map domain error to HTTP response
 */
function mapErrorToHttpResponse(error: DomainError): { statusCode: number; body: any } {
    const statusCode = getHttpStatusCode(error);

    const body = {
        success: false,
        error: {
            code: error.code,
            message: error.message,
            category: error.category,
            metadata: Object.keys(error.metadata).length > 0 ? error.metadata : undefined
        },
        timestamp: new Date().toISOString()
    };

    return { statusCode, body };
}

/**
 * Get HTTP status code based on error category
 */
function getHttpStatusCode(error: DomainError): number {
    switch (error.category) {
        case 'Domain':
            // Business rule violations
            if (error.code.includes('NotFound')) return 404;
            if (error.code.includes('Conflict')) return 409;
            if (error.code.includes('Forbidden')) return 403;
            return 422; // Unprocessable Entity for business rule violations

        case 'Validation':
            return 400; // Bad Request

        case 'Infrastructure':
            if (error.code.includes('NotFound')) return 404;
            if (error.code.includes('Timeout')) return 408;
            if (error.code.includes('Unavailable')) return 503;
            return 500; // Internal Server Error

        case 'Concurrency':
            return 409; // Conflict

        case 'Security':
            if (error.code.includes('Unauthorized')) return 401;
            if (error.code.includes('Forbidden')) return 403;
            return 403; // Forbidden by default

        default:
            return 500;
    }
}

/**
 * Get success status code based on HTTP method
 */
function getSuccessStatusCode(method: string): number {
    switch (method.toUpperCase()) {
        case 'POST':
            return 201; // Created
        case 'PUT':
        case 'PATCH':
            return 200; // OK
        case 'DELETE':
            return 204; // No Content
        case 'GET':
        case 'HEAD':
        case 'OPTIONS':
        default:
            return 200; // OK
    }
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Response format interfaces
 */
export interface SuccessResponse<T> {
    success: true;
    data: T;
    timestamp: string;
}

export interface ErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        category: string;
        metadata?: Record<string, any>;
    };
    timestamp: string;
    requestId?: string;
}

/**
 * Utility functions for creating consistent responses
 */
export class ResponseUtils {
    public static success<T>(data: T): SuccessResponse<T> {
        return {
            success: true,
            data,
            timestamp: new Date().toISOString()
        };
    }

    public static error(
        code: string,
        message: string,
        category: string = 'Infrastructure',
        metadata?: Record<string, any>
    ): ErrorResponse {
        return {
            success: false,
            error: {
                code,
                message,
                category,
                metadata
            },
            timestamp: new Date().toISOString()
        };
    }

    public static fromDomainError(error: DomainError): ErrorResponse {
        return {
            success: false,
            error: {
                code: error.code,
                message: error.message,
                category: error.category,
                metadata: Object.keys(error.metadata).length > 0 ? error.metadata : undefined
            },
            timestamp: new Date().toISOString()
        };
    }
}