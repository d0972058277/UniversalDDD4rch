/**
 * Categories of errors that can occur in domain-driven applications.
 * These categories help classify and handle different types of failures appropriately.
 */
export enum ErrorCategory {
  /**
   * Domain logic errors - business rule violations, invariant failures
   */
  Domain = 'Domain',

  /**
   * Input validation errors - invalid data, missing required fields
   */
  Validation = 'Validation',

  /**
   * Infrastructure errors - database failures, network issues, external service problems
   */
  Infrastructure = 'Infrastructure',

  /**
   * Concurrency errors - version conflicts, optimistic locking failures
   */
  Concurrency = 'Concurrency',

  /**
   * Security errors - unauthorized access, authentication failures
   */
  Security = 'Security',
}