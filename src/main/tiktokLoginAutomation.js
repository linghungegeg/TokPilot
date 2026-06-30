const { BrowserWindow, session } = require('electron');
const { fetchVerificationCode } = require('./mailReceiver');

function buildPhaseOneScript({ username, password }) {
  return `
(async function tiktokLoginPhaseOne() {
  var ACCOUNT = ${JSON.stringify(username)};
  var PASSWORD = ${JSON.stringify(password)};

  function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

  function dispatchInput(el, value) {
    var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Wait for login form elements
  var deadline = Date.now() + 30000;
  var userInput, passInput;
  while (Date.now() < deadline) {
    userInput = document.querySelector('input[name="username"], input[type="text"][autocomplete="username"], input[placeholder*="email" i], input[placeholder*="phone" i]');
    passInput = document.querySelector('input[type="password"]');
    if (userInput && passInput) break;
    await sleep(1500);
  }
  if (!userInput || !passInput) {
    window.__tk_phase1_result = { success: false, phase: 'timeout', reason: 'form_not_found' };
    return;
  }

  // Fill credentials
  dispatchInput(userInput, ACCOUNT);
  await sleep(500);
  dispatchInput(passInput, PASSWORD);
  await sleep(800);

  // Click login button
  var loginBtn = document.querySelector('[data-e2e="login-button"]')
    || document.querySelector('button[type="submit"]');
  if (!loginBtn) {
    var buttons = document.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) {
      var t = (buttons[i].textContent || '').toLowerCase().trim();
      if (t === 'log in' || t === 'login') { loginBtn = buttons[i]; break; }
    }
  }
  if (!loginBtn) {
    window.__tk_phase1_result = { success: false, phase: 'timeout', reason: 'no_submit_button' };
    return;
  }
  loginBtn.click();

  // Poll for outcome (longer wait for CAPTCHA)
  for (var j = 0; j < 45; j++) {
    await sleep(2000);

    // Direct login success
    if (document.cookie.indexOf('sessionid') !== -1
        || window.location.href.indexOf('/foryou') !== -1
        || window.location.href.indexOf('/following') !== -1) {
      window.__tk_phase1_result = { success: true, phase: 'direct_login', cookies: document.cookie };
      return;
    }

    // Verification code input appeared
    var codeInput = document.querySelector('input[placeholder*="code" i], input[name="code"], input[inputmode="numeric"][maxlength="6"]');
    if (codeInput) {
      window.__tk_phase1_result = { success: false, phase: 'need_verify_code' };
      return;
    }

    // CAPTCHA visible - wait for user to solve
    var captchaEl = document.querySelector('#captcha-verify-image, .captcha_verify_img_slide, [class*="captcha-verify"], [id*="captcha"]');
    if (captchaEl && captchaEl.offsetParent !== null) {
      window.__tk_captcha_visible = true;
      continue;
    }
    window.__tk_captcha_visible = false;

    // TOTP input appeared
    var totpInput = document.querySelector('input[placeholder*="2-step" i], input[placeholder*="authenticator" i], input[placeholder*="verification" i]');
    if (totpInput) {
      window.__tk_phase1_result = { success: false, phase: 'need_verify_code' };
      return;
    }

    // Error message
    var errEl = document.querySelector('[data-e2e="error-msg"], [role="alert"], .error-message');
    if (errEl && errEl.textContent && errEl.textContent.trim().length > 2) {
      window.__tk_phase1_result = { success: false, phase: 'login_error', reason: errEl.textContent.trim().substring(0, 200) };
      return;
    }
  }

  window.__tk_phase1_result = { success: false, phase: 'timeout', reason: 'no_redirect_no_code' };
})();
`.trim();
}

function buildPhaseTwoScript({ code }) {
  return `
(async function tiktokLoginPhaseTwo() {
  var CODE = ${JSON.stringify(code)};

  function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

  function dispatchInput(el, value) {
    var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Find verification code input
  var codeInput = document.querySelector('input[placeholder*="code" i], input[name="code"], input[inputmode="numeric"][maxlength="6"]');
  if (!codeInput) {
    // Fallback: smallest visible text/number input
    var inputs = document.querySelectorAll('input[type="text"], input[type="number"], input:not([type])');
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].offsetParent !== null && (!inputs[i].maxLength || inputs[i].maxLength <= 8)) {
        codeInput = inputs[i];
        break;
      }
    }
  }
  if (!codeInput) {
    window.__tk_phase2_result = { success: false, phase: 'no_code_input' };
    return;
  }

  dispatchInput(codeInput, CODE);
  await sleep(600);

  // Click submit
  var submitBtn = document.querySelector('[data-e2e="submit-btn"], button[type="submit"]');
  if (submitBtn) submitBtn.click();

  // Poll for session cookie (up to 40s)
  for (var k = 0; k < 20; k++) {
    await sleep(2000);
    if (document.cookie.indexOf('sessionid') !== -1) {
      window.__tk_phase2_result = { success: true, phase: 'logged_in', cookies: document.cookie };
      return;
    }
    var url = window.location.href;
    if (url.indexOf('/foryou') !== -1 || url.indexOf('/following') !== -1) {
      window.__tk_phase2_result = { success: true, phase: 'logged_in', cookies: document.cookie };
      return;
    }
  }

  window.__tk_phase2_result = { success: false, phase: 'timeout', reason: 'no_session_after_code' };
})();
`.trim();
}

async function loginTikTok(webContents, account) {
  const { tiktokUsername, tiktokPassword, outlookEmail, outlookPassword } = account;

  // Step 1: Navigate to login page (direct to email/username login)
  await webContents.loadURL('https://www.tiktok.com/login/phone-or-email/email');
  await sleep(5000);

  // Step 2: Inject phase one
  webContents.executeJavaScript(buildPhaseOneScript({ username: tiktokUsername, password: tiktokPassword })).catch(() => {});

  // Step 3: Poll for phase one result every 2s
  let phase1Result = null;
  for (let i = 0; i < 20; i++) {
    await sleep(2000);
    try {
      phase1Result = await webContents.executeJavaScript('window.__tk_phase1_result');
    } catch (_) { /* not set yet */ }
    if (phase1Result) break;
  }

  if (!phase1Result) return { success: false, error: 'phase1_timeout' };
  if (phase1Result.success) return { success: true, cookies: phase1Result.cookies, state: 'direct_login' };
  if (phase1Result.phase === 'login_error') return { success: false, error: phase1Result.reason };

  // Step 4: Need verification code
  if (phase1Result.phase === 'need_verify_code') {
    let emailCode = null;

    if (outlookEmail && outlookPassword) {
      emailCode = await fetchVerificationCode(outlookEmail, outlookPassword, 120000);
      if (!emailCode) return { success: false, error: 'email_code_timeout' };
    }

    if (!emailCode) return { success: false, error: 'no_code_source' };

    // Step 5: Inject phase two
    webContents.executeJavaScript(buildPhaseTwoScript({ code: emailCode || '' })).catch(() => {});

    // Step 6: Poll for phase two result every 2s
    let phase2Result = null;
    for (let i = 0; i < 25; i++) {
      await sleep(2000);
      try {
        phase2Result = await webContents.executeJavaScript('window.__tk_phase2_result');
      } catch (_) { /* not set yet */ }
      if (phase2Result) break;
    }

    if (!phase2Result) return { success: false, error: 'phase2_timeout' };
    if (phase2Result.success) return { success: true, cookies: phase2Result.cookies, state: 'logged_in' };
    return { success: false, error: phase2Result.reason || 'phase2_failed' };
  }

  return { success: false, error: phase1Result.reason || 'unknown_phase1_result' };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { buildPhaseOneScript, buildPhaseTwoScript, loginTikTok };
