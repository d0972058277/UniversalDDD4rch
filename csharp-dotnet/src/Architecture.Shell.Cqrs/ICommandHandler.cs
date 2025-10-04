using Architecture.Core.Functional;

namespace Architecture.Shell.Cqrs;

/// <summary>
/// Handler for commands that modify state without return values (void commands).
/// </summary>
/// <typeparam name="TCommand">The command type.</typeparam>
/// <remarks>
/// Returns <see cref="Result"/> to support business validation errors.
/// Use <see cref="Result.Success()"/> for successful completion or
/// <see cref="Result.Failure"/> for business rule violations.
/// </remarks>
public interface ICommandHandler<in TCommand> : IRequestHandler<TCommand, Result>
    where TCommand : ICommand
{
}

/// <summary>
/// Handler for commands that modify state and return a value.
/// </summary>
/// <typeparam name="TCommand">The command type.</typeparam>
/// <typeparam name="TResult">
/// The return type, commonly <see cref="Result{T}"/> for mixed error handling.
/// </typeparam>
public interface ICommandHandler<in TCommand, TResult> : IRequestHandler<TCommand, TResult>
    where TCommand : ICommand<TResult>
{
}
