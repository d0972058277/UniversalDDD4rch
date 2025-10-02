// This file is used by Code Analysis to maintain SuppressMessage
// attributes that are applied to this project.
using System.Diagnostics.CodeAnalysis;

// CA1040: Empty interfaces are intentional for marker-based type discrimination in CQRS pattern
[assembly: SuppressMessage("Design", "CA1040:Avoid empty interfaces", Justification = "Marker interfaces required for CQRS type discrimination and mediator routing", Scope = "type", Target = "~T:Architecture.Shell.Cqrs.IBaseRequest")]
[assembly: SuppressMessage("Design", "CA1040:Avoid empty interfaces", Justification = "Marker interfaces required for CQRS command/query separation", Scope = "type", Target = "~T:Architecture.Shell.Cqrs.ICommand")]
[assembly: SuppressMessage("Design", "CA1040:Avoid empty interfaces", Justification = "Marker interfaces required for CQRS command/query separation", Scope = "type", Target = "~T:Architecture.Shell.Cqrs.ICommand`1")]
[assembly: SuppressMessage("Design", "CA1040:Avoid empty interfaces", Justification = "Marker interfaces required for CQRS command/query separation", Scope = "type", Target = "~T:Architecture.Shell.Cqrs.IQuery`1")]

// CA1711: Delegate naming convention - RequestHandlerDelegate is descriptive and commonly used in mediator patterns
[assembly: SuppressMessage("Naming", "CA1711:Identifiers should not have incorrect suffix", Justification = "RequestHandlerDelegate naming is conventional in mediator pipeline patterns", Scope = "type", Target = "~T:Architecture.Shell.Cqrs.RequestHandlerDelegate`1")]

// CA1716: Parameter naming - 'continuation' is semantically clearer than alternatives for pipeline pattern
[assembly: SuppressMessage("Naming", "CA1716:Identifiers should not match keywords", Justification = "'continuation' is semantically appropriate for pipeline continuation delegate", Scope = "member", Target = "~M:Architecture.Shell.Cqrs.IPipelineBehavior`2.HandleAsync(`0,Architecture.Shell.Cqrs.RequestHandlerDelegate{`1},System.Threading.CancellationToken)~System.Threading.Tasks.Task{`1}")]

// CA1848: LoggerMessage - Standard ILogger extension methods are acceptable for behaviors (low-frequency hot path)
[assembly: SuppressMessage("Performance", "CA1848:Use the LoggerMessage delegates", Justification = "Behavior logging is not on critical hot path; standard ILogger extensions provide adequate performance", Scope = "type", Target = "~T:Architecture.Shell.Cqrs.Behaviors.UnitOfWorkBehavior`2")]
