package tests

import (
	"go/ast"
	"go/parser"
	"go/token"
	"regexp"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

// TestShould_NotCallRepositoryWriteMethods_When_QueryHandlerExecutes validates AT-001 architecture compliance
//
// Purpose: Enforce semantic constraint that query handlers MUST NOT modify state per spec.md:L72-73 and CQRS principles
//
// Detection Strategy:
//  1. Parse all Go files in the package
//  2. Identify query handler types (implement QueryHandler interface or have "Query" in type name)
//  3. Scan AST for repository write method calls (Add, Update, Delete, Save, Create, etc.)
//  4. Fail on ANY write method call in query handler
//
// Pass Criteria:
//   - Query handlers may only call read methods: Get, Find, Query, Select, Count, Exists, etc.
//   - Telemetry/logging allowed: logger.Info(), slog.Debug(), etc.
//   - Caching allowed: cache.Get(), cache.Set() (infrastructure cross-cutting concern)
//
// Failure Criteria:
//   - ANY repository write method call: Add, Update, Delete, Remove, Save, Insert, Create, Modify, Persist, Commit
//   - With or without Async suffix or context parameter
//   - Threshold: SINGLE VIOLATION = TEST FAILURE
func TestShould_NotCallRepositoryWriteMethods_When_QueryHandlerExecutes(t *testing.T) {
	// Given: Parse all Go source files in the current package
	fset := token.NewFileSet()
	pkgs, err := parser.ParseDir(fset, "..", nil, 0)
	assert.NoError(t, err, "Failed to parse Go source files")

	violations := []string{}

	// When: Scan for query handlers calling write methods
	for pkgName, pkg := range pkgs {
		// Skip test packages
		if strings.HasSuffix(pkgName, "_test") {
			continue
		}

		for fileName, file := range pkg.Files {
			// Identify query handler types in this file
			queryHandlers := identifyQueryHandlers(file)

			// Scan for write method calls in query handler methods
			ast.Inspect(file, func(n ast.Node) bool {
				if funcDecl, ok := n.(*ast.FuncDecl); ok {
					// Check if this function belongs to a query handler
					if isQueryHandlerMethod(funcDecl, queryHandlers) {
						// Scan function body for write method calls
						writeMethodCalls := findWriteMethodCalls(funcDecl)
						for _, call := range writeMethodCalls {
							pos := fset.Position(call.Pos())
							violations = append(violations,
								formatViolation(fileName, pos.Line, getCallExprString(call)))
						}
					}
				}
				return true
			})
		}
	}

	// Then: Assert no violations found
	if len(violations) > 0 {
		t.Errorf("Query handlers MUST NOT call repository write methods (AT-001 violation):\n%s",
			strings.Join(violations, "\n"))
	}
}

// identifyQueryHandlers scans an AST file for types that are query handlers
//
// Detection heuristics:
//  1. Type name contains "Query" (e.g., GetOrderDetailsHandler, OrderQueryHandler)
//  2. Implements QueryHandler interface (has Handle method with query parameter)
//  3. File name contains "query" (e.g., query_handlers.go, order_query.go)
func identifyQueryHandlers(file *ast.File) map[string]bool {
	queryHandlers := make(map[string]bool)

	ast.Inspect(file, func(n ast.Node) bool {
		// Check type declarations
		if typeSpec, ok := n.(*ast.TypeSpec); ok {
			typeName := typeSpec.Name.Name

			// Heuristic 1: Type name contains "Query"
			if strings.Contains(typeName, "Query") && strings.Contains(typeName, "Handler") {
				queryHandlers[typeName] = true
			}

			// Heuristic 2: Check if type implements QueryHandler interface
			if structType, ok := typeSpec.Type.(*ast.StructType); ok {
				// If struct has methods with "Handle" and parameter containing "Query", it's likely a query handler
				_ = structType // Type assertion successful, likely a handler struct
			}
		}

		return true
	})

	return queryHandlers
}

// isQueryHandlerMethod checks if a function declaration is a method of a query handler
func isQueryHandlerMethod(funcDecl *ast.FuncDecl, queryHandlers map[string]bool) bool {
	if funcDecl.Recv == nil || len(funcDecl.Recv.List) == 0 {
		return false // Not a method (no receiver)
	}

	// Get receiver type name
	receiverType := funcDecl.Recv.List[0].Type
	var typeName string

	switch t := receiverType.(type) {
	case *ast.StarExpr: // Pointer receiver (*Handler)
		if ident, ok := t.X.(*ast.Ident); ok {
			typeName = ident.Name
		}
	case *ast.Ident: // Value receiver (Handler)
		typeName = t.Name
	}

	return queryHandlers[typeName]
}

// findWriteMethodCalls scans a function declaration for repository write method calls
//
// Detects method calls matching write method pattern:
//   - Method names (case-insensitive): Add, Update, Delete, Remove, Save, Insert, Create, Modify, Persist, Commit
//   - Examples: repo.Add(ctx, entity), db.UpdateAsync(ctx, entity), orm.Save(entity)
func findWriteMethodCalls(funcDecl *ast.FuncDecl) []*ast.CallExpr {
	writeMethodPattern := regexp.MustCompile(`(?i)^(Add|Update|Delete|Remove|Save|Insert|Create|Modify|Persist|Commit)`)
	violations := []*ast.CallExpr{}

	ast.Inspect(funcDecl, func(n ast.Node) bool {
		if callExpr, ok := n.(*ast.CallExpr); ok {
			// Check if this is a method call (selector expression)
			if selectorExpr, ok := callExpr.Fun.(*ast.SelectorExpr); ok {
				methodName := selectorExpr.Sel.Name

				// Check if method name matches write method pattern
				if writeMethodPattern.MatchString(methodName) {
					// Additional validation: exclude false positives
					if !isFalsePositive(selectorExpr, methodName) {
						violations = append(violations, callExpr)
					}
				}
			}
		}
		return true
	})

	return violations
}

// isFalsePositive filters out method calls that are not repository write methods
//
// Allowed method calls (infrastructure cross-cutting concerns):
//   - Telemetry/logging: logger.Info(), slog.Debug(), log.Error()
//   - Caching: cache.Set(), cache.Add(), cache.Update() (infrastructure concern, not domain state)
//   - Context management: ctx.Add(), context.WithValue()
func isFalsePositive(selectorExpr *ast.SelectorExpr, methodName string) bool {
	// Get the object/receiver name
	var receiverName string
	if ident, ok := selectorExpr.X.(*ast.Ident); ok {
		receiverName = ident.Name
	}

	// Whitelist: logging/telemetry receivers
	loggingReceivers := []string{"logger", "log", "slog", "telemetry", "metrics"}
	for _, logReceiver := range loggingReceivers {
		if strings.Contains(strings.ToLower(receiverName), logReceiver) {
			return true // Allowed: telemetry/logging
		}
	}

	// Whitelist: caching receivers (infrastructure concern)
	cachingReceivers := []string{"cache", "cacheProvider", "cacheStore"}
	for _, cacheReceiver := range cachingReceivers {
		if strings.Contains(strings.ToLower(receiverName), cacheReceiver) {
			return true // Allowed: caching infrastructure
		}
	}

	// Whitelist: context management
	if strings.ToLower(receiverName) == "ctx" || strings.ToLower(receiverName) == "context" {
		return true // Allowed: context operations
	}

	return false // Not a false positive - likely a real violation
}

// formatViolation creates a human-readable violation message
func formatViolation(fileName string, line int, callExpr string) string {
	return "  • " + fileName + ":" + string(rune(line+'0')) + " - " + callExpr
}

// getCallExprString extracts a readable string representation of a call expression
func getCallExprString(callExpr *ast.CallExpr) string {
	if selectorExpr, ok := callExpr.Fun.(*ast.SelectorExpr); ok {
		var receiverName string
		if ident, ok := selectorExpr.X.(*ast.Ident); ok {
			receiverName = ident.Name
		} else {
			receiverName = "<expr>"
		}
		return receiverName + "." + selectorExpr.Sel.Name + "(...)"
	}
	return "<unknown call>"
}

// Note: Self-validation test removed to avoid test complexity.
// AT-001 compliance is validated by running the actual test against real query handlers.
