const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
    show: false
  });

  win.webContents.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
  );

  const outputFile = path.join(__dirname, 'tiktok_layout_diag2.txt');

  win.webContents.on('did-finish-load', async () => {
    await sleep(6000);

    try {
      const diag = await win.webContents.executeJavaScript(`
        (function() {
          var r = [];
          r.push('URL=' + window.location.href);
          r.push('');

          // Find all dialog/modal elements
          r.push('--- DIALOG/MODAL ELEMENTS ---');
          var dialogs = document.querySelectorAll('[class*="dialog" i], [class*="modal" i], [class*="tux-dialog" i], [role="dialog"]');
          r.push('count=' + dialogs.length);
          for (var i = 0; i < Math.min(dialogs.length, 5); i++) {
            var d = dialogs[i];
            var ds = getComputedStyle(d);
            r.push('[' + i + '] tag=' + d.tagName + ' class="' + (d.className||'').substring(0,120) + '"');
            r.push('    w=' + d.offsetWidth + ' h=' + d.offsetHeight + ' maxW=' + ds.maxWidth + ' display=' + ds.display + ' position=' + ds.position);
            // children
            for (var j = 0; j < Math.min(d.children.length, 6); j++) {
              var dc = d.children[j];
              var dcs = getComputedStyle(dc);
              r.push('    child[' + j + '] ' + dc.tagName + ' class="' + (dc.className||'').substring(0,100) + '" w=' + dc.offsetWidth + ' maxW=' + dcs.maxWidth);
            }
          }

          r.push('');
          r.push('--- ELEMENTS WITH max-width < 1000px (up to 30) ---');
          var all = document.querySelectorAll('*');
          var cnt = 0;
          for (var i = 0; i < all.length && cnt < 30; i++) {
            var el = all[i];
            var cs = getComputedStyle(el);
            var mw = parseInt(cs.maxWidth);
            if (mw > 0 && mw < 1000) {
              r.push('tag=' + el.tagName + ' class="' + (el.className||'').substring(0,100) + '" maxW=' + cs.maxWidth + ' offsetW=' + el.offsetWidth + ' offsetH=' + el.offsetHeight);
              cnt++;
            }
          }

          r.push('');
          r.push('--- ALL FORMS and INPUT containers ---');
          var forms = document.querySelectorAll('form');
          r.push('form count=' + forms.length);
          for (var i = 0; i < Math.min(forms.length, 3); i++) {
            var f = forms[i];
            var fs = getComputedStyle(f);
            r.push('form[' + i + '] w=' + f.offsetWidth + ' maxW=' + fs.maxWidth);
          }

          r.push('');
          r.push('--- DIVs with tiktok- class ---');
          var tk = document.querySelectorAll('div[class*="tiktok-"]');
          r.push('count=' + tk.length);
          for (var i = 0; i < Math.min(tk.length, 12); i++) {
            var d = tk[i];
            var ds = getComputedStyle(d);
            r.push('[' + i + '] "' + d.className.substring(0,100) + '" w=' + d.offsetWidth + ' maxW=' + ds.maxWidth + ' display=' + ds.display);
          }

          return r.join('\\n');
        })();
      `);

      fs.writeFileSync(outputFile, diag, 'utf-8');
      console.log('Written to:', outputFile);
      console.log('');
      console.log(diag);
    } catch (err) {
      console.error('Failed:', err.message);
    }

    app.quit();
  });

  win.loadURL('https://www.tiktok.com/login/phone-or-email/email');

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
});
