/**
 * Domain-Driven Design Abstractions for Architecture.Core
 *
 * This module provides the core DDD building blocks including entities,
 * value objects, aggregate roots, domain events, and repository interfaces.
 */

// Core DDD interfaces
export { IEntity } from './interfaces/i-entity';
export { IAggregateRoot } from './interfaces/i-aggregate-root';
export { IDomainEvent } from './interfaces/i-domain-event';
export { IRepository } from './interfaces/i-repository';

// Base classes for domain modeling
export { ValueObject } from './value-object';
export { Entity } from './entity';
export { AggregateRoot } from './aggregate-root';
export { DomainEventBase } from './domain-event-base';