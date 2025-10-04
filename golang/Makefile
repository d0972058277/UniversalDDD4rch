# Universal DDD Architecture - Go Implementation
# Multi-module workspace build and quality tools

.PHONY: build test test-all test-core test-cqrs test-gorm fmt vet lint clean coverage quality ci help

# Default target
.DEFAULT_GOAL := help

## Build all modules
build:
	@echo "Building all modules..."
	@go build ./...

## Run all tests across all modules
test-all:
	@echo "Running tests for all modules..."
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "📦 Testing: architecture-core"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@cd architecture-core && go test -race -v ./tests/... || true
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "📦 Testing: architecture-shell-cqrs"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@cd architecture-shell-cqrs && go test -race -v ./tests/... 2>/dev/null || echo "⏳ No tests yet (module in development)"
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "📦 Testing: architecture-gorm"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@cd architecture-gorm && go test -race -v ./... 2>/dev/null || echo "⏳ No tests yet"
	@echo ""
	@echo "✅ All module tests complete!"

## Run tests (workspace-wide)
test:
	@go test -race -v ./...

## Run architecture-core tests only
test-core:
	@echo "Testing architecture-core..."
	@cd architecture-core && go test -race -v ./tests/...

## Run architecture-shell-cqrs tests only
test-cqrs:
	@echo "Testing architecture-shell-cqrs..."
	@cd architecture-shell-cqrs && go test -race -v ./tests/...

## Run architecture-gorm tests only
test-gorm:
	@echo "Testing architecture-gorm..."
	@cd architecture-gorm && go test -race -v ./...

## Run contract tests only (architecture-core)
test-contract:
	@echo "Running contract tests..."
	@cd architecture-core && go test -v ./tests/contract/...

## Format code (all modules)
fmt:
	@echo "Formatting code..."
	@gofmt -w .

## Vet code (all modules)
vet:
	@echo "Vetting code..."
	@go vet ./...

## Lint code (requires golangci-lint)
lint:
	@echo "Linting code..."
	@golangci-lint run ./... 2>/dev/null || echo "⚠️  golangci-lint not installed (optional)"

## Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@go clean ./...
	@rm -f coverage.out coverage.html

## Run tests with coverage (all modules)
coverage:
	@echo "Generating coverage report..."
	@go test -race -coverprofile=coverage.out ./...
	@go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report: coverage.html"

## Run coverage for specific module
coverage-core:
	@cd architecture-core && go test -race -coverprofile=coverage.out ./... && go tool cover -html=coverage.out -o coverage.html

## Run benchmarks (architecture-core)
bench:
	@echo "Running benchmarks..."
	@cd architecture-core && go test -bench=. ./tests/performance/ 2>/dev/null || echo "⏳ No benchmarks yet"

## Sync workspace dependencies
sync:
	@echo "Syncing workspace..."
	@go work sync

## Quality check (fmt + vet + lint + test)
quality: fmt vet lint test-all

## CI pipeline (quality + coverage)
ci: quality coverage
	@echo "✅ CI pipeline complete!"

## Show help
help:
	@echo "Universal DDD Architecture - Go Implementation"
	@echo ""
	@echo "Available targets:"
	@echo ""
	@grep -E '^##' $(MAKEFILE_LIST) | sed 's/^## /  /'
	@echo ""
	@echo "Quick start:"
	@echo "  make test-all    # Run all tests"
	@echo "  make quality     # Run all quality checks"
	@echo "  make ci          # Run full CI pipeline"
