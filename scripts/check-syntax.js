const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const sourceRoots = [
  'main.js',
  'preload.js',
  'scripts',
  'src',
  'core',
  'popup'
];
const ignoredDirectories = new Set([
  'node_modules',
  'dist',
  'dist-build',
  '.git',
  '.linghun',
  '.codebase-memory'
]);

function collectJavaScriptFiles(entryPath, files) {
  const stats = fs.statSync(entryPath);
  if (stats.isDirectory()) {
    const directoryName = path.basename(entryPath);
    if (ignoredDirectories.has(directoryName)) {
      return;
    }
    for (const child of fs.readdirSync(entryPath)) {
      collectJavaScriptFiles(path.join(entryPath, child), files);
    }
    return;
  }
  if (stats.isFile() && entryPath.endsWith('.js')) {
    files.push(entryPath);
  }
}

const files = [];
for (const sourceRoot of sourceRoots) {
  const entryPath = path.join(projectRoot, sourceRoot);
  if (fs.existsSync(entryPath)) {
    collectJavaScriptFiles(entryPath, files);
  }
}

let failed = false;
for (const file of files.sort()) {
  const relativeFile = path.relative(projectRoot, file);
  const result = spawnSync(process.execPath, ['--check', relativeFile], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: false
  });
  if (result.status !== 0) {
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(`[check:syntax] ${files.length} JavaScript files passed syntax check.`);
