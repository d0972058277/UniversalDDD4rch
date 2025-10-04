package behaviors

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"time"
)

// CacheStore is the cache abstraction for storing query results
//
// Integrate with caching libraries (go-cache, redis, memcached, etc.)
type CacheStore interface {
	// Get retrieves a value from cache
	//
	// Returns the cached value and true if found, nil and false otherwise
	Get(ctx context.Context, key string) (interface{}, bool)

	// Set stores a value in cache with TTL
	//
	// TTL of 0 means no expiration
	Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error
}

// ICacheable is an optional interface for queries that support caching
//
// Queries implementing this interface can specify custom cache TTL.
type ICacheable interface {
	// CacheTTL returns the time-to-live for cached results
	//
	// Return 0 to disable caching for this query
	CacheTTL() time.Duration
}

// CachingBehavior is a pipeline behavior that caches query results
//
// Checks cache for queries and returns cached value on hit.
// Executes handler on cache miss and stores result in cache.
// Skips caching for commands.
//
// Recommended order: 50 (after telemetry, for queries only)
//
// Cache key strategy:
//   - Serialize query properties to deterministic string (JSON with sorted keys)
//   - Include type name to prevent collisions
//   - Example: "GetUserQuery:{'userId':'123'}"
//
// Example:
//
//	behavior := &CachingBehavior{CacheStore: myCacheStore, DefaultTTL: 5 * time.Minute}
//	mediator := NewMediator(handlers, []interface{}{behavior})
type CachingBehavior struct {
	CacheStore CacheStore
	DefaultTTL time.Duration
}

// Handle executes the caching behavior
func (b *CachingBehavior) Handle(ctx context.Context, request interface{}, next func() (interface{}, error)) (interface{}, error) {
	// Skip caching for commands
	if b.isCommand(request) {
		return next()
	}

	// Generate cache key
	cacheKey, err := b.generateCacheKey(request)
	if err != nil {
		// If cache key generation fails, execute handler without caching
		return next()
	}

	// Check cache
	if cachedValue, found := b.CacheStore.Get(ctx, cacheKey); found {
		return cachedValue, nil
	}

	// Cache miss - execute handler
	response, err := next()
	if err != nil {
		// Don't cache errors
		return nil, err
	}

	// Determine TTL
	ttl := b.DefaultTTL
	if cacheable, ok := request.(ICacheable); ok {
		customTTL := cacheable.CacheTTL()
		if customTTL == 0 {
			// Caching disabled for this query
			return response, nil
		}
		ttl = customTTL
	}

	// Store in cache
	_ = b.CacheStore.Set(ctx, cacheKey, response, ttl)

	return response, nil
}

// Order returns the execution order for this behavior
func (b *CachingBehavior) Order() int {
	return 50
}

// isCommand checks if request is a command
func (b *CachingBehavior) isCommand(request interface{}) bool {
	_, ok := request.(interface{ IsCommand() })
	return ok
}

// generateCacheKey creates a deterministic cache key from the request
func (b *CachingBehavior) generateCacheKey(request interface{}) (string, error) {
	// Get type name
	typeName := fmt.Sprintf("%T", request)

	// Serialize request to JSON
	jsonBytes, err := json.Marshal(request)
	if err != nil {
		return "", err
	}

	// Hash JSON for deterministic key
	hash := sha256.Sum256(jsonBytes)
	hashStr := fmt.Sprintf("%x", hash[:8]) // Use first 8 bytes of hash

	// Format: TypeName:Hash
	return fmt.Sprintf("%s:%s", typeName, hashStr), nil
}
