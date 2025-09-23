package main

import (
	"fmt"

	"github.com/universalddd/architecture-core-go/pkg/domain"
	"github.com/universalddd/architecture-core-go/pkg/functional"
)

func main() {
	fmt.Println("Testing Architecture.Core Go Implementation")

	// Test functional types
	fmt.Println("\n=== Testing Functional Types ===")

	// Test Result
	result := functional.Ok("Hello World")
	fmt.Printf("Result.IsOk(): %v\n", result.IsOk())
	fmt.Printf("Result.Value(): %s\n", result.Value())

	// Test Maybe
	maybe := functional.Some("Test Value")
	fmt.Printf("Maybe.HasValue(): %v\n", maybe.HasValue())
	fmt.Printf("Maybe.Value(): %s\n", maybe.Value())

	// Test Error
	err := functional.DomainError("TEST_ERROR", "This is a test error")
	fmt.Printf("Error.Code(): %s\n", err.Code())
	fmt.Printf("Error.Message(): %s\n", err.Message())
	fmt.Printf("Error.Category(): %v\n", err.Category())

	// Test domain types
	fmt.Println("\n=== Testing Domain Types ===")

	// Test Entity
	entity := domain.NewTestEntity("entity-001")
	fmt.Printf("Entity.ID(): %s\n", entity.ID())

	// Test Aggregate
	aggregate := domain.NewTestAggregate("agg-001")
	fmt.Printf("Aggregate.ID(): %s\n", aggregate.ID())
	fmt.Printf("Aggregate.Version(): %d\n", aggregate.Version())

	// Test Event
	event := domain.NewTestEvent("TestEvent")
	fmt.Printf("Event.ID(): %s\n", event.ID())
	fmt.Printf("Event.EventType(): %s\n", event.EventType())

	// Add event to aggregate
	aggregate.AddDomainEvent(event)
	events := aggregate.DomainEvents()
	fmt.Printf("Aggregate events count: %d\n", len(events))

	// Test Value Object
	vo := domain.NewTestValueObject("test", 42)
	fmt.Printf("ValueObject.GetValue1(): %s\n", vo.GetValue1())
	fmt.Printf("ValueObject.GetValue2(): %d\n", vo.GetValue2())

	fmt.Println("\n=== All basic tests completed successfully! ===")
}