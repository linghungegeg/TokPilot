// capture_layout.js — standalone Electron script to diagnose TikTok layout
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    show: false
  });

  // Use a desktop user agent
  win.webContents.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
  );

  const outputFile = path.join(__dirname, 'tiktok_layout_diag.txt');

  win.webContents.on('did-finish-load', async () => {
    await sleep(5000); // wait for React to render

    try {
      const diag = await win.webContents.executeJavaScript(`
        (function() {
          var r = [];
          r.push('URL=' + window.location.href);
          r.push('innerW=' + window.innerWidth + ' innerH=' + window.innerHeight);
          r.push('');
          r.push('--- BODY ---');
          var bs = getComputedStyle(document.body);
          r.push('body w=' + document.body.offsetWidth + ' h=' + document.body.offsetHeight + ' maxW=' + bs.maxWidth);
          r.push('');
          r.push('--- ALL TOP-LEVEL DIVS (body children) ---');
          for (var i = 0; i < Math.min(document.body.children.length, 10); i++) {
            var c = document.body.children[i];
            var cs = getComputedStyle(c);
            r.push('[' + i + '] ' + c.tagName + (c.id ? '#' + c.id : '') + ' class="' + (c.className || '').substring(0, 120) + '"');
            r.push('    w=' + c.offsetWidth + ' maxW=' + cs.maxWidth + ' display=' + cs.display);
          }
          r.push('');
          r.push('--- #app / #root ---');
          var app = document.getElementById('app') || document.getElementById('root');
          if (app) {
            var as = getComputedStyle(app);
            r.push('app w=' + app.offsetWidth + ' maxW=' + as.maxWidth + ' display=' + as.display);
            for (var i = 0; i < Math.min(app.children.length, 8); i++) {
              var ac = app.children[i];
              var acs = getComputedStyle(ac);
              r.push('  child[' + i + '] ' + ac.tagName + ' class="' + (ac.className || '').substring(0, 120) + '"');
              r.push('    w=' + ac.offsetWidth + ' maxW=' + acs.maxWidth + ' display=' + acs.display);
            }
          }
          r.push('');
          r.push('--- ELEMENTS WITH max-width < 600px (first 20) ---');
          var all = document.querySelectorAll('*');
          var cnt = 0;
          for (var i = 0; i < all.length && cnt < 20; i++) {
            var el = all[i];
            var cs = getComputedStyle(el);
            var mw = parseInt(cs.maxWidth);
            if (mw > 0 && mw < 600) {
              r.push('tag=' + el.tagName + ' class="' + (el.className || '').substring(0, 100) + '" maxW=' + cs.maxWidth + ' offsetW=' + el.offsetWidth);
              cnt++;
            }
          }
          return r.join('\\n');
        })();
      `);

      fs.writeFileSync(outputFile, diag, 'utf-8');
      console.log('Layout diagnostic written to:', outputFile);
      console.log('');
      console.log(diag);
    } catch (err) {
      console.error('Diagnostic failed:', err.message);
    }

    app.quit();
  });

  // Navigate directly to TikTok login page - same URL the app uses
  win.loadURL('https://www.tiktok.com/login/phone-or-email/email');

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
});
