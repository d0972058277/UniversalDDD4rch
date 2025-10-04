namespace Architecture.Shell.Cqrs;

/// <summary>
/// Base marker interface for all requests (commands, queries, notifications, jobs).
/// Enables uniform pipeline processing and type-safe mediator registration.
/// </summary>
/// <remarks>
/// All application-layer requests must implement this interface directly or via
/// <see cref="ICommand"/>, <see cref="IQuery{TResult}"/>, or other derived markers.
/// </remarks>
public interface IBaseRequest
{
}
