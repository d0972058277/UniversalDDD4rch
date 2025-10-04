package behaviors

import (
	"context"
	"errors"
)

// IAuthorizationService is the authorization abstraction for request authorization
//
// Integrate with authorization libraries or implement custom authorization logic.
type IAuthorizationService interface {
	// Authorize checks if the current user is authorized to execute the request
	//
	// Returns authorization result indicating if access is granted
	Authorize(ctx context.Context, request interface{}) (*AuthorizationResult, error)
}

// AuthorizationResult represents the result of authorization check
type AuthorizationResult struct {
	IsAuthorized bool
	Reason       string
}

// UnauthorizedError is the error type returned when authorization fails
//
// Signals that user is not authorized to execute the request and pipeline should short-circuit.
var UnauthorizedError = errors.New("unauthorized access")

// AuthorizationBehavior is a pipeline behavior that checks authorization for requests
//
// Executes after validation to verify user has permission to execute the request.
// Short-circuits pipeline by returning UnauthorizedError on authorization failure.
//
// Recommended order: 20 (after validation, before transaction)
//
// Example:
//
//	behavior := &AuthorizationBehavior{AuthService: myAuthService}
//	mediator := NewMediator(handlers, []interface{}{behavior})
type AuthorizationBehavior struct {
	AuthService IAuthorizationService
}

// Handle executes the authorization behavior
func (b *AuthorizationBehavior) Handle(ctx context.Context, request interface{}, next func() (interface{}, error)) (interface{}, error) {
	// Pre-handler authorization check
	authResult, err := b.AuthService.Authorize(ctx, request)
	if err != nil {
		return nil, err
	}

	if !authResult.IsAuthorized {
		return nil, UnauthorizedError
	}

	// Continue pipeline
	return next()
}

// Order returns the execution order for this behavior
func (b *AuthorizationBehavior) Order() int {
	return 20
}
