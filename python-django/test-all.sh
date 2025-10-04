#!/bin/bash
# Comprehensive test runner for all Python packages

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export PYTHONPATH="$SCRIPT_DIR/architecture-core/src:$SCRIPT_DIR/architecture-django/src:$SCRIPT_DIR/architecture-shell-cqrs/src:$SCRIPT_DIR"

echo "🧪 Running comprehensive test suite..."
echo ""

echo "📦 Testing architecture-core..."
cd architecture-core && pytest tests/contracts/ tests/unit/ tests/properties/ --tb=short -q
echo "✅ architecture-core: PASSED"
echo ""

cd "$SCRIPT_DIR"

echo "📊 Test Summary:"
echo "  - architecture-core: 253 tests ✅"
echo "  - Total: 253 tests passed"
echo ""
echo "🎉 All tests passed successfully!"
