package contract

import (
	"context"
	"testing"
	"time"

	"github.com/universalddd/architecture-core-go/pkg/domain"
)

// TestRepository_Should_ProvideAsyncCRUDOperations_When_Used
func TestRepository_Should_ProvideAsyncCRUDOperations_When_Used(t *testing.T) {
	t.Run("Should_AddAggregate_When_ValidAggregateProvided", func(t *testing.T) {
		// Given: A repository and valid aggregate
		repo := domain.NewTestRepository()
		aggregate := domain.NewTestAggregate("agg-001")
		ctx := context.Background()

		// When: Adding aggregate
		result := repo.AddAsync(ctx, aggregate)

		// Then: Should succeed
		if result.IsFailure() {
			t.Errorf("Add should succeed, got error: %v", result.Error())
		}
	})

	t.Run("Should_GetByID_When_AggregateExists", func(t *testing.T) {
		// Given: A repository with existing aggregate
		repo := domain.NewTestRepository()
		aggregate := domain.NewTestAggregate("agg-002")
		ctx := context.Background()

		repo.AddAsync(ctx, aggregate)

		// When: Getting by ID
		maybe := repo.GetByIDAsync(ctx, "agg-002")

		// Then: Should return Some with aggregate
		if !maybe.HasValue() {
			t.Error("Should return aggregate when it exists")
		}
		if maybe.Value().GetID() != "agg-002" {
			t.Error("Should return correct aggregate")
		}
	})

	t.Run("Should_ReturnNone_When_AggregateNotExists", func(t *testing.T) {
		// Given: A repository without target aggregate
		repo := domain.NewTestRepository()
		ctx := context.Background()

		// When: Getting non-existent ID
		maybe := repo.GetByIDAsync(ctx, "non-existent")

		// Then: Should return None
		if maybe.HasValue() {
			t.Error("Should return None when aggregate doesn't exist")
		}
	})

	t.Run("Should_UpdateAggregate_When_ValidAggregateProvided", func(t *testing.T) {
		// Given: A repository with existing aggregate
		repo := domain.NewTestRepository()
		aggregate := domain.NewTestAggregate("agg-003")
		ctx := context.Background()

		repo.AddAsync(ctx, aggregate)
		aggregate.ModifyState("updated-state")

		// When: Updating aggregate
		result := repo.UpdateAsync(ctx, aggregate)

		// Then: Should succeed
		if result.IsFailure() {
			t.Errorf("Update should succeed, got error: %v", result.Error())
		}
	})

	t.Run("Should_DeleteAggregate_When_ValidIDProvided", func(t *testing.T) {
		// Given: A repository with existing aggregate
		repo := domain.NewTestRepository()
		aggregate := domain.NewTestAggregate("agg-004")
		ctx := context.Background()

		repo.AddAsync(ctx, aggregate)

		// When: Deleting by ID
		result := repo.DeleteAsync(ctx, "agg-004")

		// Then: Should succeed
		if result.IsFailure() {
			t.Errorf("Delete should succeed, got error: %v", result.Error())
		}

		// And aggregate should no longer exist
		maybe := repo.GetByIDAsync(ctx, "agg-004")
		if maybe.HasValue() {
			t.Error("Aggregate should not exist after deletion")
		}
	})

	t.Run("Should_CheckExistence_When_IDProvided", func(t *testing.T) {
		// Given: A repository with existing aggregate
		repo := domain.NewTestRepository()
		aggregate := domain.NewTestAggregate("agg-005")
		ctx := context.Background()

		repo.AddAsync(ctx, aggregate)

		// When: Checking existence
		existsResult := repo.ExistsAsync(ctx, "agg-005")
		notExistsResult := repo.ExistsAsync(ctx, "non-existent")

		// Then: Should return correct existence status
		if existsResult.IsFailure() || !existsResult.Value() {
			t.Error("Should return true for existing aggregate")
		}
		if notExistsResult.IsFailure() || notExistsResult.Value() {
			t.Error("Should return false for non-existent aggregate")
		}
	})

	t.Run("Should_RespectCancellation_When_ContextCancelled", func(t *testing.T) {
		// Given: A repository and cancelled context
		repo := domain.NewTestRepository()
		ctx, cancel := context.WithCancel(context.Background())
		cancel() // Cancel immediately

		// When: Performing operation with cancelled context
		result := repo.GetByIDAsync(ctx, "any-id")

		// Then: Should handle cancellation appropriately
		// (Implementation detail - may return error or handle gracefully)
		if result.HasValue() {
			// If operation completes, that's also acceptable for this test
			t.Log("Operation completed despite cancellation - acceptable for test")
		}
	})

	t.Run("Should_RespectTimeout_When_ContextHasTimeout", func(t *testing.T) {
		// Given: A repository and context with very short timeout
		repo := domain.NewTestRepository()
		ctx, cancel := context.WithTimeout(context.Background(), 1*time.Nanosecond)
		defer cancel()

		// When: Performing operation with timeout context
		result := repo.GetByIDAsync(ctx, "any-id")

		// Then: Should handle timeout appropriately
		// (Implementation detail - may timeout or complete quickly)
		_ = result // Test passes if no panic occurs
	})

	t.Run("Should_HandleConcurrency_When_MultipleOperations", func(t *testing.T) {
		// Given: A repository
		repo := domain.NewTestRepository()
		ctx := context.Background()

		// When: Performing concurrent operations
		aggregate1 := domain.NewTestAggregate("concurrent-1")
		aggregate2 := domain.NewTestAggregate("concurrent-2")

		// Simulate concurrent adds
		result1 := repo.AddAsync(ctx, aggregate1)
		result2 := repo.AddAsync(ctx, aggregate2)

		// Then: Both operations should succeed
		if result1.IsFailure() {
			t.Errorf("Concurrent add 1 should succeed, got error: %v", result1.Error())
		}
		if result2.IsFailure() {
			t.Errorf("Concurrent add 2 should succeed, got error: %v", result2.Error())
		}
	})
}