const { spawn } = require('node:child_process');
const path = require('node:path');

const electronBinary = process.platform === 'win32'
  ? path.join(process.cwd(), 'node_modules', 'electron', 'dist', 'electron.exe')
  : path.join(process.cwd(), 'node_modules', 'electron', 'dist', 'electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBinary, process.argv.slice(2), {
  stdio: 'inherit',
  windowsHide: false,
  env
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error('[run-electron] failed to launch Electron:', error);
  process.exit(1);
});
