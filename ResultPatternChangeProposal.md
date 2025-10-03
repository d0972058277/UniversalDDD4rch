# Result Pattern Change Proposal

## Context
- The C# implementation models both a non-generic `Result` and a generic `Result<T>`, enabling void-return operations to use a dedicated type instead of carrying a dummy payload.
- Goal: ensure every language variant mirrors this split so consumers across platforms share the same semantic contract.

## Findings
- **Go (`golang/pkg/functional/result.go:7`)**: only defines the generic `Result[T]` struct. Void semantics are achieved implicitly by using `Result[struct{}]`, `Result[interface{}]`, or leaving the value unset. There is no dedicated non-generic wrapper to express "no payload" operations, so the API diverges from the C# contract.
- **Java (`java-spring/architecture-core/src/main/java/com/architecture/core/functional/Result.java:14`)**: implements a single `Result<T>` class. Void operations reuse the same class through `Result.success()` returning `Result<Void>`. This still requires a type argument and leaks `Void` into call sites, violating the expected split between `Result` and `Result<T>`.
- **Python (`python-django/src/architecture_core/functional/result.py:16`)**: exposes just one generic `Result[T]` (via typing generics). Callers rely on `None` to mimic void semantics, again missing the dedicated non-generic result shape.
- **TypeScript (`typescript-nodejs/src/functional/result.ts:9`, `typescript-nodejs/src/functional/result.ts:124`)**: already aligned; it ships both `Result` (non-generic) and `ResultOf<T>` (generic) and overloads factory methods accordingly.

## Recommendations
### Go
- Introduce a distinct `Result` struct for void operations that wraps the common state (`isOk`, `Error`) without a value field.
- Provide factory helpers `ResultOk()` / `ResultFail()` and conversion utilities between `Result` and `Result[T]` for shared logic.
- Adjust domain/infrastructure layers and tests to consume the new type for commands that currently use `Result[struct{}]` or similar placeholders.

### Java
- Add a non-generic `Result` class (or sealed interface hierarchy) that encapsulates success/failure for void operations and delegates to the existing `Result<T>` implementation for the generic case.
- Deprecate or refactor `Result.success()` overload that returns `Result<Void>` in favor of the new type, updating Spring converters and contract tests accordingly.

### Python
- Define a separate `Result` class dedicated to void operations (optionally backed by a shared mixin/base class with `ResultGeneric[T]`).
- Update factory helpers (`Result.success`, `Result.failure`) so that void operations return the non-generic type, and ensure serializers/validators understand both variants.

### Cross-language consistency
- Once the new void-specific types exist, align naming and factory conventions to use `Success`/`Failure` (and `Success<T>`/`Failure<T>`) across language implementations, replacing variants such as `Ok`/`Fail` so they match the C# baseline and desired Result pattern semantics.
