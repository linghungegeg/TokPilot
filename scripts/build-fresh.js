const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

function pad(value) {
  return String(value).padStart(2, '0');
}

const now = new Date();
const stamp = [
  now.getFullYear(),
  pad(now.getMonth() + 1),
  pad(now.getDate())
].join('') + '-' + [
  pad(now.getHours()),
  pad(now.getMinutes()),
  pad(now.getSeconds())
].join('');

function normalizeMaxSlots(value) {
  const n = Number.parseInt(String(value || ''), 10);
  if (!Number.isInteger(n) || n <= 0) {
    return 100;
  }
  if (n !== 100 && n !== 200) {
    console.error('[build] BUILD_MAX_SLOTS only supports 100 or 200.');
    process.exit(1);
  }
  return n;
}

const MAX_SLOTS = normalizeMaxSlots(process.env.BUILD_MAX_SLOTS);
const unsupportedSlotsArg = process.argv.find((a) => a.startsWith('--slots='));
if (unsupportedSlotsArg) {
  console.error('[build] --slots is no longer supported.');
  process.exit(1);
}

const pkg = require('../package.json');
const productName = pkg.build?.productName || pkg.description || pkg.name;
const outDir = `dist-build/${stamp}-${MAX_SLOTS}slots`;

console.log(`[build] maxSlots: ${MAX_SLOTS}`);
console.log(`[build] output: ${outDir}`);

const variantFilePath = path.join(process.cwd(), 'src', 'buildVariant.js');
const buildConfigPath = path.join(process.cwd(), 'src', 'buildConfig.js');
const defaultVariantSource = `module.exports = 'self';\n`;
const defaultBuildConfigSource = `module.exports = { MAX_SLOTS: 100 };\n`;

const builderBin = process.platform === 'win32'
  ? path.join(process.cwd(), 'node_modules', '.bin', 'electron-builder.cmd')
  : path.join(process.cwd(), 'node_modules', '.bin', 'electron-builder');

if (!fs.existsSync(builderBin)) {
  console.error('[build] electron-builder not found. Run npm install first.');
  process.exit(1);
}

let result;
try {
  fs.writeFileSync(variantFilePath, `module.exports = 'self';\n`, 'utf8');
  fs.writeFileSync(buildConfigPath, `module.exports = { MAX_SLOTS: ${MAX_SLOTS} };\n`, 'utf8');

  result = spawnSync(
    builderBin,
    [
      `--config.directories.output=${outDir}`,
      `--config.productName=${productName}`,
      `--config.artifactName="${productName}-${MAX_SLOTS}slots \${version}.\${ext}"`
    ],
    {
      stdio: 'inherit',
      shell: process.platform === 'win32'
    }
  );
} finally {
  fs.writeFileSync(variantFilePath, defaultVariantSource, 'utf8');
  fs.writeFileSync(buildConfigPath, defaultBuildConfigSource, 'utf8');
}

if (result?.error) {
  console.error('[build] spawn error:', result.error.message || result.error);
  process.exit(1);
}
if (typeof result?.status === 'number') {
  process.exit(result.status);
}
console.error('[build] failed with unknown status');
process.exit(1);
