// Core Types Contract Specification
// This file defines the public API contracts for Architecture.Core types

namespace Architecture.Core.Contracts
{
    using System;
    using System.Collections.Generic;
    using System.Threading;
    using System.Threading.Tasks;

    // DDD Abstractions Contracts

    public interface IAggregateRoot<TId> : IEntity<TId>
        where TId : class
    {
        long Version { get; }
        IReadOnlyCollection<IDomainEvent> Events { get; }
        void ClearEvents();
    }

    public interface IEntity<TId>
        where TId : class
    {
        TId Id { get; }
    }

    public interface IDomainEvent
    {
        Guid Id { get; }
        DateTimeOffset OccurredAt { get; }
        string? CorrelationId { get; }
        string? CausationId { get; }
        IReadOnlyDictionary<string, object> Metadata { get; }
    }

    public interface IRepository<TAggregate, TId>
        where TAggregate : class, IAggregateRoot<TId>
        where TId : class
    {
        Task<Maybe<TAggregate>> GetByIdAsync(TId id, CancellationToken cancellationToken = default);
        Task<Result> AddAsync(TAggregate aggregate, CancellationToken cancellationToken = default);
        Task<Result> UpdateAsync(TAggregate aggregate, CancellationToken cancellationToken = default);
        Task<Result> DeleteAsync(TId id, CancellationToken cancellationToken = default);
        Task<Result<bool>> ExistsAsync(TId id, CancellationToken cancellationToken = default);
    }

    // Functional Types Contracts

    public readonly struct Result
    {
        public bool IsSuccess { get; }
        public bool IsFailure { get; }
        public Error Error { get; }

        public static Result Ok();
        public static Result Fail(Error error);

        public Result<T> Map<T>(Func<T> func);
        public Result Bind(Func<Result> func);
        public T Match<T>(Func<T> onSuccess, Func<Error, T> onFailure);

        public static implicit operator Result(Error error);
    }

    public readonly struct Result<T>
    {
        public bool IsSuccess { get; }
        public bool IsFailure { get; }
        public T Value { get; }
        public Error Error { get; }

        public static Result<T> Ok(T value);
        public static Result<T> Fail(Error error);

        public Result<TResult> Map<TResult>(Func<T, TResult> func);
        public Result<TResult> Bind<TResult>(Func<T, Result<TResult>> func);
        public TOut Match<TOut>(Func<T, TOut> onSuccess, Func<Error, TOut> onFailure);

        public static implicit operator Result<T>(T value);
        public static implicit operator Result<T>(Error error);
        public static Result<T> From(Maybe<T> maybe, Error errorWhenNone);
    }

    public readonly struct Error
    {
        public string Code { get; }
        public string Message { get; }
        public ErrorCategory Category { get; }
        public IReadOnlyDictionary<string, object> Metadata { get; }

        public static Error Domain(string code, string message, IDictionary<string, object>? metadata = null);
        public static Error Validation(string code, string message, IDictionary<string, object>? metadata = null);
        public static Error Infrastructure(string code, string message, IDictionary<string, object>? metadata = null);
        public static Error Concurrency(string code, string message, IDictionary<string, object>? metadata = null);
        public static Error Security(string code, string message, IDictionary<string, object>? metadata = null);
    }

    public enum ErrorCategory
    {
        Domain,
        Validation,
        Infrastructure,
        Concurrency,
        Security
    }

    public readonly struct Maybe<T>
    {
        public bool HasValue { get; }
        public T Value { get; }

        public static Maybe<T> Some(T value);
        public static Maybe<T> None();

        public Maybe<TResult> Map<TResult>(Func<T, TResult> func);
        public Maybe<TResult> Bind<TResult>(Func<T, Maybe<TResult>> func);
        public T OrElse(T defaultValue);
        public T OrElse(Func<T> defaultFactory);
        public TOut Match<TOut>(Func<T, TOut> onSome, Func<TOut> onNone);

        public static implicit operator Maybe<T>(T value);
        public Result<T> ToResult(Error errorWhenNone);
    }

    // Abstract Base Classes Contracts

    public abstract class AggregateRoot<TId> : Entity<TId>, IAggregateRoot<TId>
        where TId : class
    {
        public long Version { get; protected set; }
        public IReadOnlyCollection<IDomainEvent> Events { get; }

        protected AggregateRoot(TId id);
        protected void AddEvent(IDomainEvent domainEvent);
        public void ClearEvents();
    }

    public abstract class Entity<TId> : IEntity<TId>
        where TId : class
    {
        public TId Id { get; protected init; }

        protected Entity(TId id);

        public override bool Equals(object? obj);
        public override int GetHashCode();
        public static bool operator ==(Entity<TId>? left, Entity<TId>? right);
        public static bool operator !=(Entity<TId>? left, Entity<TId>? right);
    }

    public abstract class ValueObject
    {
        protected abstract IEnumerable<object?> GetEqualityComponents();

        public override bool Equals(object? obj);
        public override int GetHashCode();
        public static bool operator ==(ValueObject? left, ValueObject? right);
        public static bool operator !=(ValueObject? left, ValueObject? right);
    }

    public abstract class DomainEventBase : IDomainEvent
    {
        public Guid Id { get; }
        public DateTimeOffset OccurredAt { get; }
        public string? CorrelationId { get; init; }
        public string? CausationId { get; init; }
        public IReadOnlyDictionary<string, object> Metadata { get; init; }

        protected DomainEventBase();
        protected DomainEventBase(string? correlationId, string? causationId, IDictionary<string, object>? metadata = null);
    }
}