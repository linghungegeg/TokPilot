// Capture multiple TikTok pages DOM
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const CAPTURE_SCRIPT = `
(function() {
  const out = [];
  out.push('=== URL: ' + window.location.href);

  out.push('');
  out.push('=== ALL DATA-E2E ELEMENTS ===');
  document.querySelectorAll('[data-e2e]').forEach(el => {
    const text = (el.textContent || '').trim().slice(0, 50);
    if (el.offsetHeight > 0 || text) {
      out.push('  ' + el.tagName +
        ' data-e2e="' + el.getAttribute('data-e2e') + '"' +
        ' text="' + text + '"' +
        ' class="' + (el.className || '').slice(0, 60) + '"');
    }
  });

  out.push('');
  out.push('=== ALL INPUTS ===');
  document.querySelectorAll('input, textarea, [contenteditable="true"]').forEach(el => {
    out.push('  ' + el.tagName +
      ' type=' + (el.type || '') +
      ' name=' + (el.name || '') +
      ' placeholder=' + (el.placeholder || '') +
      ' data-e2e="' + (el.getAttribute('data-e2e') || '') + '"' +
      ' aria-label="' + (el.getAttribute('aria-label') || '') + '"' +
      ' visible=' + (el.offsetHeight > 0));
  });

  out.push('');
  out.push('=== ALL BUTTONS (visible) ===');
  document.querySelectorAll('button').forEach(el => {
    if (el.offsetHeight > 0) {
      out.push('  text="' + (el.textContent || '').trim().slice(0, 60) + '"' +
        ' data-e2e="' + (el.getAttribute('data-e2e') || '') + '"' +
        ' aria-label="' + (el.getAttribute('aria-label') || '') + '"' +
        ' disabled=' + el.disabled +
        ' class="' + (el.className || '').slice(0, 80) + '"');
    }
  });

  out.push('');
  out.push('=== LINKS (href contains @ or user or follow) ===');
  document.querySelectorAll('a[href]').forEach(el => {
    const href = el.getAttribute('href') || '';
    if (href.includes('@') || href.includes('user') || href.includes('follow') || href.includes('search')) {
      out.push('  text="' + (el.textContent || '').trim().slice(0, 40) + '" href="' + href.slice(0, 80) + '" visible=' + (el.offsetHeight > 0));
    }
  });

  return out.join('\\n');
})()
`;

const PAGES = [
  { name: 'explore', url: 'https://www.tiktok.com/explore' },
  { name: 'search_user', url: 'https://www.tiktok.com/search/user?q=test' },
  { name: 'user_profile', url: 'https://www.tiktok.com/@tiktok' },
];

const OUTPUT_DIR = 'F:\\dc\\tiktok';
const WAIT_MS = 10000;

app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.commandLine.appendSwitch('disable-features', 'TranslateUI');

// Set a realistic user agent
app.commandLine.appendSwitch('user-agent',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
);

async function capture() {
  await app.whenReady();

  const results = [];

  for (const page of PAGES) {
    console.log('Loading page:', page.name, page.url);
    const win = new BrowserWindow({
      width: 1400, height: 900, show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    });

    // Set cookies to avoid some bot detection
    try {
      await win.webContents.session.defaultSession.cookies.set({
        url: 'https://www.tiktok.com',
        name: 'tt_webid_v2',
        value: '7323690746797573637',
        domain: '.tiktok.com'
      });
    } catch (_) {}

    const pageResult = await new Promise((resolve) => {
      let resolved = false;

      win.webContents.on('did-finish-load', async () => {
        if (resolved) return;
        // Small extra delay for JS to render
        await new Promise(r => setTimeout(r, 3000));
        const url = win.webContents.getURL();
        console.log('  loaded:', url);
        try {
          const dom = await win.webContents.executeJavaScript(CAPTURE_SCRIPT);
          resolve('=== PAGE: ' + page.name + ' ===\n' + dom + '\n\n');
        } catch (err) {
          resolve('=== PAGE: ' + page.name + ' ===\nERROR: ' + err.message + '\n\n');
        }
        resolved = true;
        win.close();
      });

      win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        if (resolved) return;
        resolve('=== PAGE: ' + page.name + ' ===\nFAIL: ' + errorDescription + '\n\n');
        resolved = true;
        win.close();
      });

      win.loadURL(page.url);

      setTimeout(() => {
        if (!resolved) {
          const url = win.webContents.getURL();
          resolve('=== PAGE: ' + page.name + ' ===\nTIMEOUT after ' + (WAIT_MS * 2) + 'ms, URL=' + url + '\n\n');
          resolved = true;
          if (!win.isDestroyed()) win.close();
        }
      }, WAIT_MS * 2);
    });

    results.push(pageResult);
    // small gap between page loads
    await new Promise(r => setTimeout(r, 2000));
  }

  const outPath = path.join(OUTPUT_DIR, 'tiktok_pages_dom.txt');
  fs.writeFileSync(outPath, results.join('\n'), 'utf-8');
  console.log('Written to:', outPath);
  app.quit();
}

capture().catch(err => { console.error(err); app.quit(); });
