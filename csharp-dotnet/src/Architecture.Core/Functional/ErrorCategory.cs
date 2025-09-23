namespace Architecture.Core.Functional;

/// <summary>
/// Categorizes errors by their domain of origin and handling strategy.
/// </summary>
public enum ErrorCategory
{
    /// <summary>
    /// Business logic violations and domain rule failures.
    /// These errors represent business constraints that prevent operations from proceeding.
    /// </summary>
    Domain,

    /// <summary>
    /// Input validation failures and format errors.
    /// These errors indicate that user input or data does not meet required criteria.
    /// </summary>
    Validation,

    /// <summary>
    /// External system failures and infrastructure issues.
    /// These errors represent problems with databases, APIs, file systems, or other external dependencies.
    /// </summary>
    Infrastructure,

    /// <summary>
    /// Optimistic concurrency conflicts and state inconsistencies.
    /// These errors occur when multiple operations attempt to modify the same data simultaneously.
    /// </summary>
    Concurrency,

    /// <summary>
    /// Authentication, authorization, and security policy violations.
    /// These errors represent security-related access restrictions or policy breaches.
    /// </summary>
    Security
}