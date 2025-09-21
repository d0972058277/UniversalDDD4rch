/**
 * Architecture.Core - Universal DDD Abstractions and Functional Types
 *
 * A comprehensive TypeScript/Node.js library providing domain-driven design abstractions
 * and functional programming types for building robust, maintainable applications.
 *
 * @version 1.0.0
 * @author Universal DDD Architecture
 * @license MIT
 */

// Functional programming types
export * from './functional';

// Domain-driven design abstractions
export * from './domain';

// Infrastructure patterns
export * from './infrastructure';

// Re-export commonly used types for convenience
export type {
  IError,
  IResult,
  IResultOf,
  IMaybe,
} from './functional';

export type {
  IEntity,
  IAggregateRoot,
  IDomainEvent,
  IRepository,
} from './domain';