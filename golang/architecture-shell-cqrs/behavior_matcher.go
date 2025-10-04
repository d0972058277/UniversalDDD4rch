package cqrs

// BehaviorMatcher determines which behaviors apply to which request types.
// Enables selective application of cross-cutting concerns (e.g., transactions only for commands).
type BehaviorMatcher interface {
	// Matches returns true if this behavior should execute for the given request type.
	Matches(request BaseRequest) bool
}

// CommandOnlyMatcher is a predefined matcher for commands only.
// Used for behaviors that only apply to state-changing operations (e.g., UnitOfWorkBehavior).
type CommandOnlyMatcher struct{}

// Matches implements BehaviorMatcher.
func (m *CommandOnlyMatcher) Matches(request BaseRequest) bool {
	return IsCommand(request)
}

// QueryOnlyMatcher is a predefined matcher for queries only.
// Used for behaviors that only apply to read-only operations (e.g., CachingBehavior).
type QueryOnlyMatcher struct{}

// Matches implements BehaviorMatcher.
func (m *QueryOnlyMatcher) Matches(request BaseRequest) bool {
	return IsQuery(request)
}

// AllRequestsMatcher is a predefined matcher for all requests.
// Used for behaviors that apply to all request types (e.g., TelemetryBehavior, ValidationBehavior).
type AllRequestsMatcher struct{}

// Matches implements BehaviorMatcher.
func (m *AllRequestsMatcher) Matches(request BaseRequest) bool {
	return true
}

// IsCommand checks if a request is a command (state-changing operation).
func IsCommand(request BaseRequest) bool {
	_, ok := request.(interface{ IsCommand() })
	return ok
}

// IsQuery checks if a request is a query (read-only operation).
func IsQuery(request BaseRequest) bool {
	_, ok := request.(interface{ IsQuery() })
	return ok
}
