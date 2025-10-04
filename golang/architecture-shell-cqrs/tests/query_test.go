package tests

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/universalddd/architecture-shell-cqrs"
)

// T039: Should_ReturnCorrectType_When_QueryHandlerExecutes
func TestShould_ReturnCorrectType_When_QueryHandlerExecutes(t *testing.T) {
	// Given: A query and its handler
	query := &GetTestDataQuery{ID: "test-123"}
	handler := &GetTestDataQueryHandler{}

	handlers := map[string]interface{}{
		"GetTestDataQuery": handler,
	}
	behaviors := []interface{}{}

	mediator := cqrs.NewMediator(handlers, behaviors)
	ctx := context.Background()

	// When: Query is executed through mediator
	result, err := mediator.Send(ctx, query)

	// Then: Should return correct result type
	assert.NoError(t, err)
	assert.NotNil(t, result)

	// Verify the result is of expected type
	dto, ok := result.(*TestDataDto)
	assert.True(t, ok, "Result should be of type *TestDataDto")
	assert.Equal(t, "test-123", dto.ID)
	assert.Equal(t, "Test Data", dto.Name)
}

// Test helper types for query tests
type GetTestDataQuery struct {
	ID string
}

func (q *GetTestDataQuery) IsRequest() {}
func (q *GetTestDataQuery) IsQuery()   {}

type TestDataDto struct {
	ID   string
	Name string
}

type GetTestDataQueryHandler struct{}

func (h *GetTestDataQueryHandler) Handle(ctx context.Context, query *GetTestDataQuery) (*TestDataDto, error) {
	return &TestDataDto{
		ID:   query.ID,
		Name: "Test Data",
	}, nil
}
