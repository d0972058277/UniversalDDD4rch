package tests

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/universalddd/architecture-shell-cqrs"
	"github.com/universalddd/architecture-shell-cqrs/behaviors"
)

// T169: Should_ReturnCachedResult_When_QueryExecutedTwice
// Validates caching behavior for queries
func TestShould_ReturnCachedResult_When_QueryExecutedTwice(t *testing.T) {
	// Given: Mediator with caching behavior and cacheable query handler
	handler := &CacheableQueryHandler{
		InvocationCount: 0,
	}

	handlers := map[string]interface{}{
		"*tests.CacheableQuery": handler,
	}

	cacheStore := NewInMemoryCacheStore()
	cachingBehavior := &behaviors.CachingBehavior{
		CacheStore: cacheStore,
		DefaultTTL: 5 * time.Minute,
	}

	behaviors := []interface{}{cachingBehavior}

	mediator := cqrs.NewMediator(handlers, behaviors)
	ctx := context.Background()

	query := &CacheableQuery{Key: "key1"}

	// When: Query is executed twice
	result1, err1 := mediator.Send(ctx, query)
	result2, err2 := mediator.Send(ctx, query)

	// Then: Handler is invoked only once (second call uses cache)
	assert.NoError(t, err1)
	assert.NoError(t, err2)
	assert.NotNil(t, result1)
	assert.NotNil(t, result2)
	assert.Equal(t, result1, result2)

	// Verify handler was only called once due to caching
	assert.Equal(t, 1, handler.InvocationCount, "Handler should only be invoked once (second call should use cache)")
}

// Test helper types for caching tests

// CacheableQuery is a test query that supports caching
type CacheableQuery struct {
	Key string `json:"key"`
}

func (q *CacheableQuery) IsRequest() {}
func (q *CacheableQuery) IsQuery()   {}

// CacheTTL implements ICacheable interface
func (q *CacheableQuery) CacheTTL() time.Duration {
	return 5 * time.Minute
}

// CacheableQueryHandler handles cacheable queries
type CacheableQueryHandler struct {
	InvocationCount int
	mu              sync.Mutex
}

func (h *CacheableQueryHandler) Handle(ctx context.Context, query *CacheableQuery) (string, error) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.InvocationCount++
	return "result-" + query.Key, nil
}

// InMemoryCacheStore is a simple in-memory cache for testing
type InMemoryCacheStore struct {
	data map[string]cacheEntry
	mu   sync.RWMutex
}

type cacheEntry struct {
	value      interface{}
	expiration time.Time
}

func NewInMemoryCacheStore() *InMemoryCacheStore {
	return &InMemoryCacheStore{
		data: make(map[string]cacheEntry),
	}
}

func (c *InMemoryCacheStore) Get(ctx context.Context, key string) (interface{}, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	entry, exists := c.data[key]
	if !exists {
		return nil, false
	}

	// Check expiration
	if !entry.expiration.IsZero() && time.Now().After(entry.expiration) {
		return nil, false
	}

	return entry.value, true
}

func (c *InMemoryCacheStore) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	entry := cacheEntry{
		value: value,
	}

	if ttl > 0 {
		entry.expiration = time.Now().Add(ttl)
	}

	c.data[key] = entry
	return nil
}
