/**
 * BaseRequest - Base type for all application-layer requests
 *
 * Common ancestor for commands, queries, and other request types,
 * enabling uniform pipeline processing.
 *
 * @typeParam TResponse - The response type (defaults to void)
 *
 * @remarks
 * All requests (commands, queries, notifications, jobs) must extend this type
 * to enable type-safe mediator registration and resolution.
 *
 * @see {@link Command} - State-changing operations
 * @see {@link Query} - Read-only operations
 */
export interface BaseRequest<TResponse = void> {
  // Marker interface - TResponse is a phantom type for compile-time type safety
  __phantom?: TResponse;
}
