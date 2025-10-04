import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Architecture Compliance Test AT-001
 *
 * Validates CQRS separation constraint per spec.md:L72-73 and CONTRACT_TESTS.md AT-001:
 * Query handlers MUST NOT call repository write methods (Add, Update, Delete, Save, etc.)
 *
 * Detection strategy using TypeScript Compiler API:
 * 1. Parse all query handler files
 * 2. Find method call expressions within handle() method
 * 3. Check if any calls match write method patterns
 * 4. Fail test if write methods detected
 */

// Repository write method patterns to detect
const WRITE_METHOD_PATTERNS = [
  /\.add(Async)?\(/i,
  /\.update(Async)?\(/i,
  /\.delete(Async)?\(/i,
  /\.remove(Async)?\(/i,
  /\.save(Async)?\(/i,
  /\.insert(Async)?\(/i,
  /\.upsert(Async)?\(/i,
  /\.create(Async)?\(/i,
];

interface ArchitectureViolation {
  file: string;
  line: number;
  column: number;
  methodCall: string;
  handlerName: string;
}

/**
 * Recursively finds all TypeScript files in directory
 */
function findTypeScriptFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findTypeScriptFiles(filePath, fileList);
    } else if (file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Checks if a file contains a query handler
 */
function isQueryHandler(sourceFile: ts.SourceFile): boolean {
  let hasQueryHandler = false;

  function visit(node: ts.Node) {
    // Check for class implementing IQueryHandler
    if (ts.isClassDeclaration(node)) {
      const className = node.name?.getText(sourceFile) || '';
      const heritage = node.heritageClauses
        ?.map((clause) => clause.types.map((t) => t.expression.getText(sourceFile)).join(', '))
        .join(', ');

      if (heritage?.includes('IQueryHandler') || className.includes('QueryHandler')) {
        hasQueryHandler = true;
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return hasQueryHandler;
}

/**
 * Finds write method calls within handle() method of query handlers
 */
function findWriteMethodCalls(sourceFile: ts.SourceFile): ArchitectureViolation[] {
  const violations: ArchitectureViolation[] = [];
  let currentHandlerName = '';
  let insideHandleMethod = false;

  function visit(node: ts.Node) {
    // Track current handler class name
    if (ts.isClassDeclaration(node)) {
      currentHandlerName = node.name?.getText(sourceFile) || 'UnknownHandler';
    }

    // Track when inside handle() method
    if (ts.isMethodDeclaration(node)) {
      const methodName = node.name.getText(sourceFile);
      if (methodName === 'handle') {
        insideHandleMethod = true;
        ts.forEachChild(node, visit);
        insideHandleMethod = false;
        return;
      }
    }

    // Check for write method calls inside handle()
    if (insideHandleMethod && ts.isCallExpression(node)) {
      const callText = node.expression.getText(sourceFile);

      // Check if call matches write patterns
      for (const pattern of WRITE_METHOD_PATTERNS) {
        if (pattern.test(callText)) {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          violations.push({
            file: sourceFile.fileName,
            line: line + 1,
            column: character + 1,
            methodCall: callText,
            handlerName: currentHandlerName,
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

/**
 * Analyzes all query handlers for architecture violations
 */
function analyzeQueryHandlers(srcDir: string): ArchitectureViolation[] {
  const allViolations: ArchitectureViolation[] = [];
  const files = findTypeScriptFiles(srcDir);

  files.forEach((file) => {
    const sourceCode = fs.readFileSync(file, 'utf-8');
    const sourceFile = ts.createSourceFile(file, sourceCode, ts.ScriptTarget.ES2020, true);

    // Only analyze query handlers
    if (isQueryHandler(sourceFile)) {
      const violations = findWriteMethodCalls(sourceFile);
      allViolations.push(...violations);
    }
  });

  return allViolations;
}

describe('ArchitectureTests', () => {
  /**
   * AT-001: Query Handler Read-Only Constraint
   *
   * Validates that query handlers maintain CQRS separation by NOT calling
   * repository write methods (Add, Update, Delete, Save, etc.)
   *
   * This test uses TypeScript Compiler API for static analysis per
   * CONTRACT_TESTS.md AT-001 specification.
   */
  it('Should_NotCallRepositoryWriteMethods_When_QueryHandlerExecutes', () => {
    // Given: Source directory containing handlers
    const srcDir = path.resolve(__dirname, '../../src');

    // When: Analyze all query handlers for write method calls
    const violations = analyzeQueryHandlers(srcDir);

    // Then: No violations found (queries are read-only)
    if (violations.length > 0) {
      const violationReport = violations
        .map(
          (v) =>
            `\n  - ${v.handlerName} at ${path.relative(process.cwd(), v.file)}:${v.line}:${v.column}\n    Illegal write call: ${v.methodCall}`
        )
        .join('');

      fail(
        `AT-001 VIOLATION: Query handlers MUST NOT call repository write methods.\n` +
          `Found ${violations.length} violation(s):${violationReport}\n\n` +
          `Fix: Move state modifications to command handlers. Queries must be read-only.\n` +
          `See: /specs/003-architecture-shell-cqrs/contracts/CONTRACT_TESTS.md (AT-001)`
      );
    }

    expect(violations).toHaveLength(0);
  });

  /**
   * Informational test: Report all query handlers found
   */
  it('Should_ReportQueryHandlers_ForInformationalPurposes', () => {
    const srcDir = path.resolve(__dirname, '../../src');
    const files = findTypeScriptFiles(srcDir);
    const queryHandlers: string[] = [];

    files.forEach((file) => {
      const sourceCode = fs.readFileSync(file, 'utf-8');
      const sourceFile = ts.createSourceFile(file, sourceCode, ts.ScriptTarget.ES2020, true);

      if (isQueryHandler(sourceFile)) {
        queryHandlers.push(path.relative(process.cwd(), file));
      }
    });

    console.log('\n=== Query Handlers Analyzed ===');
    if (queryHandlers.length === 0) {
      console.log('  (No query handlers found - this is expected for core module without domain examples)');
    } else {
      queryHandlers.forEach((handler) => console.log(`  - ${handler}`));
    }
    console.log('===============================\n');

    // This test always passes (informational only)
    expect(true).toBe(true);
  });
});
