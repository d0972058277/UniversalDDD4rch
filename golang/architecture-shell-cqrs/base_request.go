package cqrs

// BaseRequest is the common ancestor for all application-layer requests.
// Enables uniform pipeline processing for commands, queries, and future request types.
// All commands, queries, notifications, and jobs must implement this interface.
type BaseRequest interface {
	// IsRequest is a marker method to identify base requests.
	// This method provides type-safe mediator registration and resolution.
	IsRequest()
}
