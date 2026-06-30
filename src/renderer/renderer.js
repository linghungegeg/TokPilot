import { bootstrapApp } from './controllers/appController.js';

let isBootstrapped = false;

export function startRendererApp() {
  if (isBootstrapped) {
    return;
  }
  isBootstrapped = true;
  bootstrapApp();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', startRendererApp, { once: true });
} else {
  startRendererApp();
}
