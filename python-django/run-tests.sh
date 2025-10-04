#!/bin/bash
# Test runner for Universal DDD Architecture Python packages

set -e

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Setup PYTHONPATH to include all package sources and examples
export PYTHONPATH="$SCRIPT_DIR/architecture-core/src:$SCRIPT_DIR/architecture-django/src:$SCRIPT_DIR/architecture-shell-cqrs/src:$SCRIPT_DIR"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Running tests for Universal DDD Architecture - Python${NC}"
echo "PYTHONPATH: $PYTHONPATH"
echo ""

# Parse command line arguments
if [ $# -eq 0 ]; then
    # Run all tests
    echo -e "${GREEN}Running all tests...${NC}"
    pytest
elif [ "$1" == "contract" ]; then
    echo -e "${GREEN}Running contract tests...${NC}"
    pytest -m contract
elif [ "$1" == "unit" ]; then
    echo -e "${GREEN}Running unit tests...${NC}"
    pytest -m unit
elif [ "$1" == "integration" ]; then
    echo -e "${GREEN}Running integration tests...${NC}"
    pytest -m integration
elif [ "$1" == "performance" ]; then
    echo -e "${GREEN}Running performance tests...${NC}"
    pytest -m performance
elif [ "$1" == "coverage" ]; then
    echo -e "${GREEN}Running tests with coverage...${NC}"
    pytest --cov=architecture-core/src \
           --cov=architecture-django/src \
           --cov=architecture-shell-cqrs/src \
           --cov-report=term-missing \
           --cov-report=html
    echo ""
    echo -e "${GREEN}Coverage report generated in htmlcov/index.html${NC}"
elif [ "$1" == "core" ]; then
    echo -e "${GREEN}Running architecture-core tests...${NC}"
    cd architecture-core && pytest tests/contracts/ tests/unit/ tests/properties/ -v
elif [ "$1" == "django" ]; then
    echo -e "${GREEN}Running architecture-django tests...${NC}"
    cd architecture-django && pytest
elif [ "$1" == "cqrs" ]; then
    echo -e "${GREEN}Running architecture-shell-cqrs tests...${NC}"
    cd architecture-shell-cqrs && pytest
else
    # Pass through to pytest
    pytest "$@"
fi
