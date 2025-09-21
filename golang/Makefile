# Architecture.Core Go - Build and Quality Tools

.PHONY: build test fmt vet lint clean coverage

# Build the project
build:
	go build ./...

# Run all tests
test:
	go test -race -v ./...

# Format code
fmt:
	gofmt -w .

# Vet code
vet:
	go vet ./...

# Lint code (requires golangci-lint)
lint:
	golangci-lint run

# Clean build artifacts
clean:
	go clean ./...

# Run tests with coverage
coverage:
	go test -race -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

# Run benchmarks
bench:
	go test -bench=. ./tests/performance/

# Quality check (fmt + vet + lint + test)
quality: fmt vet lint test

# CI pipeline
ci: quality coverage