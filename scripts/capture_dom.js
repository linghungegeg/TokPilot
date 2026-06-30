// Capture TikTok login page DOM using Electron
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const OUTPUT = path.join(__dirname, 'tiktok_dom_capture.txt');
const LOGIN_URL = 'https://www.tiktok.com/login/phone-or-email/email';
const WAIT_MS = 8000;

app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');

async function capture() {
  await app.whenReady();

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const results = [];

  win.webContents.on('did-finish-load', async () => {
    const url = win.webContents.getURL();
    results.push(`=== URL: ${url} ===`);

    try {
      const dom = await win.webContents.executeJavaScript(`
        (function() {
          const out = [];
          out.push('=== TITLE ===');
          out.push(document.title);

          out.push('');
          out.push('=== LOGIN FORM ELEMENTS ===');

          // Find all input elements
          const inputs = document.querySelectorAll('input');
          out.push('--- Inputs (' + inputs.length + ') ---');
          inputs.forEach((el, i) => {
            out.push('  [' + i + '] type=' + (el.type || '') +
              ' name=' + (el.name || '') +
              ' placeholder=' + (el.placeholder || '') +
              ' autocomplete=' + (el.autocomplete || '') +
              ' class=' + (el.className || '').slice(0, 80) +
              ' id=' + (el.id || '') +
              ' aria-label=' + (el.getAttribute('aria-label') || '') +
              ' data-e2e=' + (el.getAttribute('data-e2e') || '') +
              ' parent=' + (el.parentElement?.tagName || '') +
              ' visible=' + (el.offsetHeight > 0));

            // Show parent HTML snippet
            const parent = el.closest('div[class*="css-"], form, div[class*="container"], div[class*="wrapper"]');
            if (parent) {
              out.push('    parent-snippet: ' + parent.tagName + '.' + (parent.className || '').slice(0, 100));
            }
          });

          out.push('');
          out.push('--- Buttons ---');
          const buttons = document.querySelectorAll('button');
          buttons.forEach((el, i) => {
            out.push('  [' + i + '] text=' + (el.textContent || '').trim().slice(0, 60) +
              ' type=' + (el.type || '') +
              ' class=' + (el.className || '').slice(0, 80) +
              ' data-e2e=' + (el.getAttribute('data-e2e') || '') +
              ' aria-label=' + (el.getAttribute('aria-label') || '') +
              ' disabled=' + el.disabled +
              ' visible=' + (el.offsetHeight > 0));
          });

          out.push('');
          out.push('--- Links ---');
          const links = document.querySelectorAll('a[href]');
          links.forEach((el, i) => {
            const href = el.getAttribute('href') || '';
            if (href.includes('login') || href.includes('password') || href.includes('sign') || href.includes('phone')) {
              out.push('  [' + i + '] text=' + (el.textContent || '').trim().slice(0, 40) + ' href=' + href);
            }
          });

          out.push('');
          out.push('=== ALL DATA-E2E ELEMENTS ===');
          document.querySelectorAll('[data-e2e]').forEach(el => {
            out.push('  tag=' + el.tagName +
              ' data-e2e=' + el.getAttribute('data-e2e') +
              ' text=' + (el.textContent || '').trim().slice(0, 40) +
              ' visible=' + (el.offsetHeight > 0));
          });

          out.push('');
          out.push('=== COOKIES ===');
          out.push(document.cookie || '(none)');

          out.push('');
          out.push('=== BODY CLASSES ===');
          out.push(document.body.className || '(none)');

          out.push('');
          out.push('=== #app / #root STRUCTURE (first 3 levels) ===');
          const root = document.querySelector('#app, #root, [id*="root"], [id*="app"]');
          if (root) {
            function walk(el, depth) {
              if (depth > 3) return;
              let line = '  '.repeat(depth) + '<' + el.tagName.toLowerCase();
              const cls = (el.className && typeof el.className === 'string') ? el.className.slice(0, 60) : '';
              const id = el.id || '';
              const e2e = el.getAttribute('data-e2e') || '';
              if (id) line += ' id="' + id + '"';
              if (cls) line += ' class="' + cls + '"';
              if (e2e) line += ' data-e2e="' + e2e + '"';
              out.push(line + '>');
              for (const child of el.children) {
                walk(child, depth + 1);
              }
            }
            walk(root, 0);
          }

          return out.join('\\n');
        })()
      `);

      results.push(dom);
    } catch (err) {
      results.push('ERROR: ' + err.message);
    }

    // Also capture from search page and explore page
    fs.writeFileSync(OUTPUT, results.join('\n'), 'utf-8');
    console.log('Capture written to:', OUTPUT);
    app.quit();
  });

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    results.push('FAIL: ' + errorDescription + ' URL: ' + validatedURL);
  });

  console.log('Loading:', LOGIN_URL);
  await win.loadURL(LOGIN_URL);

  // Safety timeout
  setTimeout(() => {
    if (!win.isDestroyed()) {
      fs.writeFileSync(OUTPUT, results.join('\n') + '\n[TIMEOUT after ' + WAIT_MS + 'ms]', 'utf-8');
      console.log('Timeout, partial capture written to:', OUTPUT);
      app.quit();
    }
  }, WAIT_MS * 2);
}

capture().catch(err => {
  console.error(err);
  app.quit();
});
