/**
 * Architecture.Shell.Cqrs - CQRS Module for TypeScript/Node.js
 *
 * Provides unified mediator pattern implementation for routing commands and queries
 * to their handlers while applying cross-cutting concerns through a composable pipeline.
 *
 * @packageDocumentation
 */

// Core request types
export { BaseRequest } from './BaseRequest';
export { Command } from './Command';
export { Query } from './Query';

// Handler interfaces
export { IRequestHandler } from './IRequestHandler';
export { ICommandHandler, ICommandHandlerWithResult } from './ICommandHandler';
export { IQueryHandler } from './IQueryHandler';

// Mediator
export { IMediator } from './IMediator';
export { Mediator } from './Mediator';

// Pipeline behaviors
export {
  IPipelineBehavior,
  RequestHandlerDelegate,
} from './IPipelineBehavior';
export {
  IBehaviorMatcher,
  CommandOnlyMatcher,
  QueryOnlyMatcher,
  AllRequestsMatcher,
} from './IBehaviorMatcher';

// UnitOfWork
export { IUnitOfWork } from './IUnitOfWork';

// Re-export behaviors when implemented
export * from './behaviors';
