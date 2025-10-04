package com.architecture.shell.cqrs;

/**
 * Marker interface for all application-layer requests.
 * Enables uniform pipeline processing for commands, queries, and future request types.
 *
 * Requirements:
 * - FR-001: All requests must implement this interface for mediator routing
 * - FR-002: Supports command/query distinction through specialized subtypes
 *
 * DDD Layer: Application Layer
 *
 * @see Command
 * @see Query
 */
public interface BaseRequest {
    // Marker interface - no methods required
    // Provides common type for mediator's routing mechanism
}
