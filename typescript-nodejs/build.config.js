/**
 * Production build configuration for Architecture.Core
 * Optimizes bundle size, tree-shaking, and module output
 */

const path = require('path');
const fs = require('fs');

// Build configuration
const buildConfig = {
  // Input/Output paths
  srcDir: path.resolve(__dirname, 'src'),
  outDir: path.resolve(__dirname, 'dist'),
  typesDir: path.resolve(__dirname, 'dist/types'),

  // TypeScript compiler options for production
  tsConfig: {
    target: 'ES2020',
    module: 'ESNext',
    moduleResolution: 'node',
    declaration: true,
    declarationMap: true,
    sourceMap: false,
    outDir: './dist',
    rootDir: './src',
    removeComments: true,
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    importHelpers: false, // No external helpers to maintain zero dependencies
    preserveConstEnums: false,
    experimentalDecorators: false,
    emitDecoratorMetadata: false
  },

  // Bundle optimization
  optimization: {
    minify: true,
    treeShaking: true,
    deadCodeElimination: true,
    bundleAnalysis: true
  },

  // Output formats
  formats: [
    {
      name: 'esm',
      extension: '.mjs',
      moduleFormat: 'ESNext',
      target: 'ES2020'
    },
    {
      name: 'cjs',
      extension: '.js',
      moduleFormat: 'CommonJS',
      target: 'ES2018'
    },
    {
      name: 'types',
      extension: '.d.ts',
      declarationOnly: true
    }
  ],

  // Performance targets
  targets: {
    maxBundleSize: '50KB', // Gzipped
    maxChunkSize: '25KB',
    maxDependencies: 0, // Zero runtime dependencies
    minificationRatio: 0.7
  }
};

/**
 * Build script execution
 */
async function build() {
  console.log('🚀 Starting Architecture.Core production build...');

  try {
    // Clean output directory
    await cleanOutputDir(buildConfig.outDir);

    // Run TypeScript compiler
    await runTypeScriptCompilation();

    // Generate package exports
    await generatePackageExports();

    // Validate build output
    await validateBuildOutput();

    // Generate build report
    await generateBuildReport();

    console.log('✅ Production build completed successfully!');

  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

/**
 * Clean output directory
 */
async function cleanOutputDir(outDir) {
  console.log('🧹 Cleaning output directory...');

  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }

  fs.mkdirSync(outDir, { recursive: true });
}

/**
 * Run TypeScript compilation
 */
async function runTypeScriptCompilation() {
  console.log('🔨 Compiling TypeScript...');

  const { spawn } = require('child_process');

  return new Promise((resolve, reject) => {
    const tsc = spawn('npx', ['tsc', '--project', 'tsconfig.build.json'], {
      stdio: 'inherit',
      shell: true
    });

    tsc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`TypeScript compilation failed with code ${code}`));
      }
    });
  });
}

/**
 * Generate package.json exports field for modern module resolution
 */
async function generatePackageExports() {
  console.log('📦 Generating package exports...');

  const packageJsonPath = path.resolve(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // Add exports field for better module resolution
  packageJson.exports = {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./functional": {
      "import": "./dist/functional/index.mjs",
      "require": "./dist/functional/index.js",
      "types": "./dist/functional/index.d.ts"
    },
    "./domain": {
      "import": "./dist/domain/index.mjs",
      "require": "./dist/domain/index.js",
      "types": "./dist/domain/index.d.ts"
    },
    "./infrastructure": {
      "import": "./dist/infrastructure/index.mjs",
      "require": "./dist/infrastructure/index.js",
      "types": "./dist/infrastructure/index.d.ts"
    },
    "./package.json": "./package.json"
  };

  // Update main entry points
  packageJson.main = "./dist/index.js";
  packageJson.module = "./dist/index.mjs";
  packageJson.types = "./dist/index.d.ts";

  // Add module and sideEffects fields
  packageJson.type = "module";
  packageJson.sideEffects = false;

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

/**
 * Validate build output
 */
async function validateBuildOutput() {
  console.log('✅ Validating build output...');

  const requiredFiles = [
    'dist/index.js',
    'dist/index.d.ts',
    'dist/functional/index.js',
    'dist/functional/index.d.ts',
    'dist/domain/index.js',
    'dist/domain/index.d.ts'
  ];

  for (const file of requiredFiles) {
    const filePath = path.resolve(__dirname, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Required build output missing: ${file}`);
    }
  }

  // Check bundle sizes
  const indexJsPath = path.resolve(__dirname, 'dist/index.js');
  const stats = fs.statSync(indexJsPath);
  const sizeKB = Math.round(stats.size / 1024);

  console.log(`📊 Main bundle size: ${sizeKB}KB`);

  if (sizeKB > 100) { // Warning threshold
    console.warn(`⚠️  Bundle size ${sizeKB}KB exceeds recommended 100KB`);
  }
}

/**
 * Generate build report
 */
async function generateBuildReport() {
  console.log('📋 Generating build report...');

  const report = {
    timestamp: new Date().toISOString(),
    version: require('./package.json').version,
    target: 'production',
    files: [],
    totalSize: 0,
    gzippedSize: 0
  };

  // Analyze output files
  const distPath = path.resolve(__dirname, 'dist');
  const files = getAllFiles(distPath);

  for (const file of files) {
    const stats = fs.statSync(file);
    const relativePath = path.relative(distPath, file);

    report.files.push({
      path: relativePath,
      size: stats.size,
      sizeKB: Math.round(stats.size / 1024)
    });

    report.totalSize += stats.size;
  }

  report.totalSizeKB = Math.round(report.totalSize / 1024);

  // Write report
  const reportPath = path.resolve(__dirname, 'dist/build-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`📈 Build report saved to: ${reportPath}`);
  console.log(`📦 Total build size: ${report.totalSizeKB}KB`);
}

/**
 * Get all files recursively
 */
function getAllFiles(dir) {
  const files = [];

  function traverse(currentDir) {
    const entries = fs.readdirSync(currentDir);

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        traverse(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

// Export configuration and run build if called directly
module.exports = buildConfig;

if (require.main === module) {
  build();
}