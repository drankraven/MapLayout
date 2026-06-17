import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const libDir = join('src', 'lib');
const sourceFiles = readdirSync(libDir)
  .filter((file) => file.endsWith('.ts'))
  .map((file) => join(libDir, file));

const requestedTests = process.argv.slice(2);
const testFiles = requestedTests.length > 0
  ? requestedTests
  : readdirSync(libDir)
    .filter((file) => file.endsWith('.test.mjs'))
    .map((file) => join(libDir, file));

if (sourceFiles.length > 0) {
  const tsc = spawnSync(process.execPath, [
    join('node_modules', 'typescript', 'bin', 'tsc'),
    ...sourceFiles,
    '--outDir',
    '.test-build',
    '--module',
    'ESNext',
    '--moduleResolution',
    'bundler',
    '--target',
    'ES2022',
    '--lib',
    'ES2022,DOM,DOM.Iterable',
    '--skipLibCheck',
    '--allowJs',
    '--jsx',
    'react-jsx',
  ], { stdio: 'inherit' });

  if (tsc.error) {
    console.error(tsc.error);
  }

  if (tsc.status !== 0) {
    process.exit(tsc.status ?? 1);
  }
}

const nodeTest = spawnSync(process.execPath, ['--test', ...testFiles], {
  stdio: 'inherit',
});

if (nodeTest.error) {
  console.error(nodeTest.error);
}

process.exit(nodeTest.status ?? 1);
