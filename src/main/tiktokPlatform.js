const { BrowserWindow, session } = require('electron');
const { fetchVerificationCode } = require('./mailReceiver');
const { getTikTokAutomationBootstrapScript } = require('./tiktokAutomationScript');
const {
  getChromeUserAgent,
  getFingerprintPageScript,
  getHttpHeaderMods
} = require('./browserFingerprint');

/**
 * TikTok 单槽位登录窗口。
 * 对标 Discord 的 DiscordSessionController。
 */
class TikTokSessionController {
  constructor(slot, opts = {}) {
    this.slot = slot;
    this._sessionNonce = opts.sessionNonce || 0;
    this._proxyUrl = opts.proxyUrl || '';
    this._proxyPool = opts.proxyPool || null;
    this.browserWindow = null;
    this._loginResolve = null;
    this._loginPromise = null;
    this._headerHooksInstalled = false;
  }

  isDestroyed() {
    return !this.browserWindow || this.browserWindow.isDestroyed();
  }

  isVisible() {
    return !this.isDestroyed() && this.browserWindow.isVisible();
  }

  ensureWindow() {
    if (!this.isDestroyed()) return this.browserWindow;

    const partition = `persist:tiktok-slot-${this.slot}`;
    const ses = session.fromPartition(partition);

    this.browserWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      show: false,
      title: `[TikTok ${this.slot}] 登录窗口`,
      backgroundColor: '#000000',
      autoHideMenuBar: true,
      webPreferences: {
        partition,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        backgroundThrottling: false
      }
    });

    // ── Browser fingerprint: Chrome UA pool (640 versions) ──
    const ua = getChromeUserAgent(this.slot, this._sessionNonce);
    this.browserWindow.webContents.setUserAgent(ua);

    // ── Permission blocking: deny media/microphone/camera ──
    ses.setPermissionRequestHandler((_wc, permission, callback) => {
      if (permission === 'media' || permission === 'mediaKeySystem') {
        return callback(false);
      }
      callback(true);
    });

    // ── HTTP header interception: align HTTP-level headers with JS fingerprint ──
    if (!this._headerHooksInstalled) {
      this._headerHooksInstalled = true;
      const hdrMods = getHttpHeaderMods(this.slot, this._sessionNonce);
      ses.webRequest.onBeforeSendHeaders((details, callback) => {
        details.requestHeaders['Accept-Language'] = hdrMods['Accept-Language'];
        details.requestHeaders['sec-ch-ua'] = hdrMods['sec-ch-ua'];
        details.requestHeaders['sec-ch-ua-mobile'] = hdrMods['sec-ch-ua-mobile'];
        details.requestHeaders['sec-ch-ua-platform'] = hdrMods['sec-ch-ua-platform'];
        callback({ requestHeaders: details.requestHeaders });
      });
    }

    // ── Per-slot proxy (from proxyPool, takes precedence over global) ──
    if (this._proxyPool && this._proxyPool.hasSlotProxy(this.slot)) {
      const slotProxy = this._proxyPool.resolveSlotProxy(this.slot);
      if (slotProxy) {
        try {
          const url = new URL(slotProxy.includes('://') ? slotProxy : `http://${slotProxy}`);
          const rules = `${url.protocol.replace(':', '')}=${url.hostname}:${url.port || 80}`;
          ses.setProxy({ proxyRules: rules, proxyBypassRules: 'localhost,127.0.0.1,<local>' }).catch(() => {});
        } catch (_) {}
      }
    } else if (this._proxyUrl) {
      this._applySessionProxy(this._proxyUrl);
    }

    // ── Block popups ──
    this.browserWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

    // ── Inject fingerprint on did-start-navigation (BEFORE TikTok's scripts) ──
    const slotNonce = this._sessionNonce;
    this.browserWindow.webContents.on('did-start-navigation', (_event, navUrl) => {
      if (!this.browserWindow || this.browserWindow.isDestroyed()) return;
      if (!navUrl || !/^https?:\/\/([^/]*\.)?tiktok\.com(\/|$)/.test(navUrl)) return;
      const fpScript = getFingerprintPageScript(this.slot, slotNonce);
      this.browserWindow.webContents.executeJavaScript(fpScript).catch(() => {});
    });

    this.browserWindow.on('closed', () => {
      this.browserWindow = null;
    });

    // 调试：监听页面加载失败
    this.browserWindow.webContents.on('did-fail-load', (_event, code, desc, validatedURL) => {
      console.error(`[tiktokPlatform] slot ${this.slot} page load FAILED: code=${code} desc="${desc}" url=${validatedURL}`);
    });
    this.browserWindow.webContents.on('did-navigate', (_event, url) => {
      console.log(`[tiktokPlatform] slot ${this.slot} did-navigate: ${url}`);
    });

    return this.browserWindow;
  }

  showWindow() {
    if (this.isDestroyed()) return;
    this.browserWindow.show();
    this.browserWindow.focus();
  }

  hideWindow() {
    if (this.isDestroyed()) return;
    this.browserWindow.hide();
  }

  applyProxy(proxyUrl) {
    this._proxyUrl = (proxyUrl || '').trim();
    if (!this.isDestroyed()) {
      this._applySessionProxy(this._proxyUrl);
    }
  }

  _applySessionProxy(proxyUrl) {
    const partition = `persist:tiktok-slot-${this.slot}`;
    const ses = session.fromPartition(partition);
    if (proxyUrl) {
      try {
        const url = new URL(proxyUrl.includes('://') ? proxyUrl : `http://${proxyUrl}`);
        const rules = `${url.protocol.replace(':', '')}=${url.hostname}:${url.port || 80}`;
        ses.setProxy({ proxyRules: rules });
        console.log(`[tiktokPlatform] slot ${this.slot} session proxy → ${rules}`);
      } catch (err) {
        console.error(`[tiktokPlatform] slot ${this.slot} proxy parse error:`, err.message);
      }
    } else {
      ses.setProxy({ proxyRules: '' });
      console.log(`[tiktokPlatform] slot ${this.slot} session proxy → direct (cleared)`);
    }
  }

  async eval(script) {
    if (this.isDestroyed()) throw new Error('登录窗口已关闭');
    // Re-inject fingerprint before eval (ensures protection even if did-start-navigation skipped)
    try {
      await this.browserWindow.webContents.executeJavaScript(
        getFingerprintPageScript(this.slot, this._sessionNonce)
      );
    } catch (_) { /* non-critical */ }
    return this.browserWindow.webContents.executeJavaScript(script, true);
  }

  async navigate(url) {
    if (this.isDestroyed()) throw new Error('登录窗口已关闭');
    await this.browserWindow.loadURL(url);
  }

  /**
   * 注入自动化桥接脚本到页面
   */
  async installAutomationBridge() {
    if (this.isDestroyed()) return false;
    try {
      const installed = await this.eval(getTikTokAutomationBootstrapScript());
      return installed === true;
    } catch (err) {
      console.error(`[tiktokPlatform] slot ${this.slot} bridge install error:`, err.message);
      return false;
    }
  }

  /**
   * 调用自动化桥接方法
   */
  async callAutomation(method, ...args) {
    if (this.isDestroyed()) throw new Error('窗口已关闭');
    const serializedArgs = JSON.stringify(args);
    const script = `window.__tk_automation && window.__tk_automation['${method}'] ? window.__tk_automation['${method}'].apply(null, ${serializedArgs}) : Promise.reject(new Error('bridge not available'))`;
    return this.eval(script);
  }

  /**
   * 执行登录流程：
   * 1. 打开窗口并导航到 TikTok 登录页
   * 2. 注入脚本填写账号密码
   * 3. 等待用户手动过 CAPTCHA
   * 4. 如果需要邮箱验证码，自动获取并填写
   * 5. 返回登录结果
   */
  async login(account) {
    const { tiktokUsername, tiktokPassword, outlookEmail, outlookPassword } = account;

    this.ensureWindow();
    // 登录时先让用户看到窗口
    this.showWindow();

    // Step 1: 导航到登录页
    const loginUrl = 'https://www.tiktok.com/login/phone-or-email/email';
    console.log(`[tiktokPlatform] slot ${this.slot} navigating to: ${loginUrl}`);
    await this.navigate(loginUrl);
    await sleep(5000);

    // 检查实际 URL（可能被重定向到错误页）
    try {
      const actualUrl = this.browserWindow.webContents.getURL();
      const title = this.browserWindow.webContents.getTitle();
      console.log(`[tiktokPlatform] slot ${this.slot} after navigate → URL: ${actualUrl}, title: "${title}"`);
    } catch (e) {
      console.error(`[tiktokPlatform] slot ${this.slot} URL check error:`, e.message);
    }

    // Step 2: 注入阶段一脚本（填写账号密码 + 点击登录）
    await this.eval(buildPhaseOneScript({ username: tiktokUsername, password: tiktokPassword }));

    // Step 3: 轮询阶段一结果（最长达 120s，给人手动过 CAPTCHA 的时间）
    let phase1Result = null;
    for (let i = 0; i < 60; i++) {
      await sleep(2000);
      try {
        phase1Result = await this.eval('window.__tk_phase1_result');
      } catch (_) { /* not set yet */ }
      if (phase1Result) {
        console.log(`[tiktokPlatform] slot ${this.slot} phase1 result (iteration ${i}):`, JSON.stringify(phase1Result));
        break;
      }
    }

    if (!phase1Result) {
      // 超时，抓取当前页面状态
      try {
        const domInfo = await this.eval(`(function() {
          return { url: window.location.href, title: document.title, bodyText: document.body.innerText.substring(0, 500), hasLoginForm: !!document.querySelector('input[type="password"]') };
        })()`);
        console.log(`[tiktokPlatform] slot ${this.slot} timeout page DOM:`, JSON.stringify(domInfo));
      } catch (_) {}
      return { success: false, error: 'login_timeout_no_result' };
    }

    // 直接登录成功
    if (phase1Result.success) {
      return {
        success: true,
        cookies: phase1Result.cookies,
        state: 'direct_login'
      };
    }

    // 登录错误
    if (phase1Result.phase === 'login_error') {
      // 抓取错误时页面 DOM 的关键信息
      try {
        const domInfo = await this.eval(`(function() {
          var errs = document.querySelectorAll('[data-e2e="error-msg"], [role="alert"], .error-message, .tux-notification, [class*="error"], [class*="server-error"]');
          var texts = [];
          for (var i = 0; i < Math.min(errs.length, 5); i++) {
            texts.push(errs[i].textContent.trim().substring(0, 300));
          }
          return { errors: texts, url: window.location.href, title: document.title };
        })()`);
        console.log(`[tiktokPlatform] slot ${this.slot} error page DOM:`, JSON.stringify(domInfo));
      } catch (_) {}
      return { success: false, error: phase1Result.reason };
    }

    // 表单未找到
    if (phase1Result.phase === 'timeout') {
      return { success: false, error: phase1Result.reason || 'login_timeout' };
    }

    // Step 4: 需要验证码
    if (phase1Result.phase === 'need_verify_code') {
      if (!outlookEmail || !outlookPassword) {
        return { success: false, error: '需要邮箱验证码但未配置邮箱' };
      }

      const emailCode = await fetchVerificationCode(outlookEmail, outlookPassword, 120000);
      if (!emailCode) {
        return { success: false, error: '获取邮箱验证码超时' };
      }

      // 注入阶段二脚本（填写验证码）
      await this.eval(buildPhaseTwoScript({ code: emailCode }));

      // 轮询阶段二结果
      let phase2Result = null;
      for (let i = 0; i < 30; i++) {
        await sleep(2000);
        try {
          phase2Result = await this.eval('window.__tk_phase2_result');
        } catch (_) { /* not set yet */ }
        if (phase2Result) break;
      }

      if (!phase2Result) {
        return { success: false, error: '验证码提交超时' };
      }
      if (phase2Result.success) {
        return {
          success: true,
          cookies: phase2Result.cookies,
          state: 'logged_in'
        };
      }
      return { success: false, error: phase2Result.reason || '验证码登录失败' };
    }

    return { success: false, error: phase1Result.reason || '未知错误' };
  }
}

// ── Phase One: 填写账号密码、点击登录 ──

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

  // 等待登录表单出现
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

  // 填写账号密码
  dispatchInput(userInput, ACCOUNT);
  await sleep(500);
  dispatchInput(passInput, PASSWORD);
  await sleep(800);

  // 点击登录按钮
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

  // 轮询结果（最长 2 分钟，给人手动过 CAPTCHA 的时间）
  for (var j = 0; j < 60; j++) {
    await sleep(2000);

    // 直接登录成功
    var url = window.location.href;
    if (document.cookie.indexOf('sessionid') !== -1
        || url.indexOf('/foryou') !== -1
        || url.indexOf('/following') !== -1) {
      window.__tk_phase1_result = { success: true, phase: 'direct_login', cookies: document.cookie };
      return;
    }

    // 验证码输入框出现
    var codeInput = document.querySelector('input[placeholder*="code" i], input[name="code"], input[inputmode="numeric"][maxlength="6"]');
    if (codeInput) {
      window.__tk_phase1_result = { success: false, phase: 'need_verify_code' };
      return;
    }

    // CAPTCHA 可见 — 设置标记，继续等待
    var captchaEl = document.querySelector('#captcha-verify-image, .captcha_verify_img_slide, [class*="captcha-verify"], [id*="captcha"]');
    if (captchaEl && captchaEl.offsetParent !== null) {
      window.__tk_captcha_visible = true;
      continue;
    }
    window.__tk_captcha_visible = false;

    // 错误信息
    var errEl = document.querySelector('[data-e2e="error-msg"], [role="alert"], .error-message');
    if (errEl && errEl.textContent && errEl.textContent.trim().length > 2) {
      window.__tk_phase1_result = { success: false, phase: 'login_error', reason: errEl.textContent.trim().substring(0, 200) };
      return;
    }
  }

  window.__tk_phase1_result = { success: false, phase: 'timeout', reason: 'no_result_after_2min' };
})();
`.trim();
}

// ── Phase Two: 填写邮箱验证码 ──

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

  var codeInput = document.querySelector('input[placeholder*="code" i], input[name="code"], input[inputmode="numeric"][maxlength="6"]');
  if (!codeInput) {
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

  var submitBtn = document.querySelector('[data-e2e="submit-btn"], button[type="submit"]');
  if (submitBtn) submitBtn.click();

  for (var k = 0; k < 30; k++) {
    await sleep(2000);
    var url = window.location.href;
    if (document.cookie.indexOf('sessionid') !== -1
        || url.indexOf('/foryou') !== -1
        || url.indexOf('/following') !== -1) {
      window.__tk_phase2_result = { success: true, phase: 'logged_in', cookies: document.cookie };
      return;
    }
  }

  window.__tk_phase2_result = { success: false, phase: 'timeout', reason: 'no_session_after_code' };
})();
`.trim();
}

// ── TikTok 平台适配器 ──

class TikTokPlatform {
  constructor(opts = {}) {
    /** @type {Map<number, TikTokSessionController>} */
    this._controllers = new Map();
    this._proxyUrl = '';
    this._proxyPool = opts.proxyPool || null;

    // Warmup concurrency control
    this._warmupMaxConcurrency = 10;
    this._warmupActiveCount = 0;
    this._warmupQueue = [];
  }

  /**
   * 设置代理并应用到所有已有 session
   */
  setProxy(proxyUrl) {
    this._proxyUrl = (proxyUrl || '').trim();
    for (const [slot, ctrl] of this._controllers) {
      if (!ctrl.isDestroyed()) {
        ctrl.applyProxy(this._proxyUrl);
      }
    }
  }

  getController(slot) {
    return this._controllers.get(slot);
  }

  ensureController(slot, opts) {
    let ctrl = this._controllers.get(slot);
    if (!ctrl || ctrl.isDestroyed()) {
      ctrl = new TikTokSessionController(slot, { ...(opts || {}), proxyUrl: this._proxyUrl, proxyPool: this._proxyPool });
      this._controllers.set(slot, ctrl);
    }
    return ctrl;
  }

  removeController(slot) {
    const ctrl = this._controllers.get(slot);
    if (ctrl && !ctrl.isDestroyed()) {
      ctrl.browserWindow.close();
    }
    this._controllers.delete(slot);
  }

  showWindow(slot) {
    const ctrl = this._controllers.get(slot);
    if (ctrl) ctrl.showWindow();
  }

  hideWindow(slot) {
    const ctrl = this._controllers.get(slot);
    if (ctrl) ctrl.hideWindow();
  }

  /**
   * 执行登录（账号密码）
   */
  async login(slot, account) {
    const ctrl = this.ensureController(slot);
    return ctrl.login(account);
  }

  /**
   * 用已保存的 cookie 恢复会话（无需重输密码）
   */
  async restoreSession(slot, cookies) {
    const ctrl = this.ensureController(slot);

    try {
      ctrl.ensureWindow();
      ctrl.showWindow();

      // 导航到 TikTok 首页
      console.log(`[tiktokPlatform] slot ${slot} restoring session via cookies...`);
      await ctrl.navigate('https://www.tiktok.com/');
      await sleep(3000);

      // 注入保存的 cookies
      if (cookies) {
        const cookieScript = `
          (function() {
            var cookies = ${JSON.stringify(cookies)};
            if (typeof cookies === 'string') {
              var pairs = cookies.split(/;\\s*/);
              pairs.forEach(function(p) {
                var idx = p.indexOf('=');
                if (idx > 0) {
                  document.cookie = p.substring(0, idx) + '=' + p.substring(idx + 1) + ';path=/;domain=.tiktok.com';
                }
              });
            }
          })();
        `;
        await ctrl.eval(cookieScript);
        await sleep(1000);
        // 刷新页面让 cookie 生效
        await ctrl.navigate('https://www.tiktok.com/foryou');
        await sleep(4000);
      }

      // 检查 session 是否有效
      const hasSession = await ctrl.eval(
        `document.cookie.indexOf('sessionid') !== -1`
      );

      if (hasSession) {
        console.log(`[tiktokPlatform] slot ${slot} session restore SUCCESS`);
        // 获取最新 cookie
        const latestCookies = await ctrl.eval('document.cookie');
        ctrl.hideWindow();
        return { success: true, cookies: latestCookies };
      } else {
        console.log(`[tiktokPlatform] slot ${slot} session restore FAILED - no sessionid cookie`);
        ctrl.hideWindow();
        return { success: false, error: '已保存的会话已过期，需要重新登录' };
      }
    } catch (err) {
      console.error(`[tiktokPlatform] slot ${slot} session restore error:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * 检查 session 是否有效（使用桥接）
   */
  async checkSession(slot) {
    const ctrl = this._controllers.get(slot);
    if (!ctrl || ctrl.isDestroyed()) return false;

    try {
      // 先确保桥接已安装
      await ctrl.installAutomationBridge();
      const result = await ctrl.callAutomation('hasSession');
      return result === true;
    } catch (_) {
      // Fallback: 直接检查 cookie
      try {
        const hasSession = await ctrl.eval(
          `document.cookie.indexOf('sessionid') !== -1`
        );
        return hasSession;
      } catch (__) {
        return false;
      }
    }
  }

  /**
   * 安装自动化桥接
   */
  async installBridge(slot) {
    const ctrl = this._controllers.get(slot);
    if (!ctrl || ctrl.isDestroyed()) return false;
    return ctrl.installAutomationBridge();
  }

  /**
   * 运行完整健康检查（需 slot 已登录并加载 TikTok 页面）
   */
  async checkHealth(slot) {
    const ctrl = this.ensureController(slot);
    await ctrl.installAutomationBridge();
    return ctrl.callAutomation('runFullHealthCheck');
  }

  /**
   * 调用自动化桥接方法
   */
  async callAutomation(slot, method, ...args) {
    const ctrl = this.ensureController(slot);
    return ctrl.callAutomation(method, ...args);
  }

  // ── 自动化高级方法 ──

  /**
   * 发送私信到当前打开的对话
   */
  async sendDm(slot, message) {
    const ctrl = this.ensureController(slot);
    await ctrl.installAutomationBridge();
    ctrl.showWindow();
    return ctrl.callAutomation('sendDmMessage', message);
  }

  /**
   * 在私信框填入草稿（不发送）
   */
  async fillDmDraft(slot, message) {
    const ctrl = this.ensureController(slot);
    await ctrl.installAutomationBridge();
    return ctrl.callAutomation('fillDmDraft', message);
  }

  /**
   * 在用户主页点击关注
   */
  async followUser(slot) {
    const ctrl = this.ensureController(slot);
    await ctrl.installAutomationBridge();
    return ctrl.callAutomation('followCurrentUser');
  }

  /**
   * 通知页批量回关
   */
  async followBackAll(slot) {
    const ctrl = this.ensureController(slot);
    await ctrl.installAutomationBridge();
    return ctrl.callAutomation('followBackAll');
  }

  /**
   * 搜索用户
   */
  async searchUsers(slot, keyword) {
    const ctrl = this.ensureController(slot);
    await ctrl.installAutomationBridge();
    return ctrl.callAutomation('searchUsers', keyword);
  }

  /**
   * 导航到指定页面
   */
  async navigateTo(slot, page) {
    const ctrl = this.ensureController(slot);
    ctrl.showWindow();
    const urls = {
      dm: 'https://www.tiktok.com/messages',
      notifications: 'https://www.tiktok.com/notifications',
      foryou: 'https://www.tiktok.com/foryou',
      search: 'https://www.tiktok.com/search/user'
    };
    const url = urls[page] || normalizeTikTokNavigationTarget(page);
    await ctrl.navigate(url);
    await sleep(4000);
    await ctrl.installAutomationBridge();
    return true;
  }

  /**
   * 账号预热浏览（模拟人类浏览行为）
   */
  _acquireWarmupSlot() {
    if (this._warmupActiveCount < this._warmupMaxConcurrency) {
      this._warmupActiveCount++;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this._warmupQueue.push(resolve);
    });
  }

  _releaseWarmupSlot() {
    this._warmupActiveCount = Math.max(0, this._warmupActiveCount - 1);
    const next = this._warmupQueue.shift();
    if (next) {
      this._warmupActiveCount++;
      next();
    }
  }

  async warmupSlot(slot, minutes) {
    const warmupMs = (minutes || 0) * 60000;
    if (warmupMs <= 0) return;

    const ctrl = this.ensureController(slot);
    await ctrl.installAutomationBridge();

    let slotAcquired = false;
    try {
      // Navigate to TikTok home if not on an authenticated page
      try {
        const state = await ctrl.callAutomation('detectPageState');
        if (state !== 'authenticated') {
          await ctrl.navigate('https://www.tiktok.com/foryou');
          await sleep(3000);
        }
      } catch (_) {
        await ctrl.navigate('https://www.tiktok.com/foryou');
        await sleep(3000);
      }

      await this._acquireWarmupSlot();
      slotAcquired = true;

      const deadline = Date.now() + warmupMs;
      while (Date.now() < deadline) {
        if (ctrl.isDestroyed()) break;
        try {
          await ctrl.callAutomation('performWarmupAction');
          await sleep(randInt(8000, 12000));
        } catch (err) {
          console.error(`[tiktokPlatform] slot ${slot} warmup error:`, err.message);
          break;
        }
      }
    } finally {
      if (slotAcquired) {
        this._releaseWarmupSlot();
      }
    }
  }

  /**
   * 自动注入桥接到所有在线会话
   */
  async installBridgeOnAll() {
    const results = [];
    for (const [slot, ctrl] of this._controllers) {
      if (!ctrl.isDestroyed()) {
        const ok = await ctrl.installAutomationBridge();
        results.push({ slot, ok });
      }
    }
    return results;
  }
}

function normalizeTikTokNavigationTarget(target) {
  const value = String(target || '').trim();
  if (!value) return 'https://www.tiktok.com/foryou';

  if (/^https:\/\//i.test(value)) {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    if (hostname !== 'tiktok.com' && !hostname.endsWith('.tiktok.com')) {
      throw new Error('只允许导航到 TikTok 官方页面');
    }
    return url.toString();
  }

  if (value.startsWith('@')) {
    return `https://www.tiktok.com/${encodeURIComponent(value)}`;
  }

  return value;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = { TikTokPlatform, TikTokSessionController };
