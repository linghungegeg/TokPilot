const { TIKTOK_SELECTORS } = require('./automation/tiktokSelectors');

function getTikTokAutomationBootstrapScript() {
  const serializedSelectors = JSON.stringify(TIKTOK_SELECTORS);
  return String.raw`
(() => {
  const BRIDGE_VERSION = 1;
  if (window.__tk_automation && window.__tk_automation.version === BRIDGE_VERSION) {
    return true;
  }

  const SELECTORS = ${serializedSelectors};

  // ═══════════════════════════════════════════
  //  Human Simulation Helpers
  // ═══════════════════════════════════════════

  function sleep(ms) {
    return new Promise(function(r) { setTimeout(r, ms); });
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randGauss(mean, stddev) {
    var u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    var n = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return Math.round(mean + stddev * n);
  }

  function jitter(baseMs) {
    var factor = 0.7 + Math.random() * 0.6;
    return Math.max(30, Math.round(Number(baseMs) * factor));
  }

  function getTypingDelay() {
    if (Math.random() < 0.08) return randInt(200, 450);
    return Math.max(35, randGauss(90, 30));
  }

  function getInputPrototypeSetter(input) {
    var ctor = input instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement : window.HTMLInputElement;
    var descriptor = Object.getOwnPropertyDescriptor(ctor.prototype, 'value');
    return descriptor && typeof descriptor.set === 'function' ? descriptor.set : null;
  }

  function getElementClickPos(el) {
    try {
      var rect = el.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      cx += (Math.random() - 0.5) * rect.width * 0.6;
      cy += (Math.random() - 0.5) * rect.height * 0.6;
      var sx = window.screenX || 0;
      var sy = window.screenY || 0;
      return { clientX: Math.round(cx), clientY: Math.round(cy), screenX: Math.round(cx + sx), screenY: Math.round(cy + sy) };
    } catch(e) {
      return { clientX: randInt(300,600), clientY: randInt(200,400), screenX: randInt(300,600), screenY: randInt(200,400) };
    }
  }

  function generateMousePath(targetPos, steps) {
    var points = [];
    var startX = targetPos.clientX + (Math.random() > 0.5 ? 1 : -1) * randInt(80, 300);
    var startY = targetPos.clientY + (Math.random() > 0.5 ? 1 : -1) * randInt(60, 200);
    var cpX = (startX + targetPos.clientX) / 2 + (Math.random() - 0.5) * 100;
    var cpY = (startY + targetPos.clientY) / 2 + (Math.random() - 0.5) * 80;
    var count = steps || randInt(5, 12);
    var sx = window.screenX || 0;
    var sy = window.screenY || 0;
    for (var i = 0; i <= count; i++) {
      var t = i / count;
      var invT = 1 - t;
      var x = Math.round(invT * invT * startX + 2 * invT * t * cpX + t * t * targetPos.clientX);
      var y = Math.round(invT * invT * startY + 2 * invT * t * cpY + t * t * targetPos.clientY);
      points.push({ clientX: x, clientY: y, screenX: x + sx, screenY: y + sy });
    }
    return points;
  }

  async function simulateHumanClick(el) {
    if (!el) return;
    var pos = getElementClickPos(el);
    var path = generateMousePath(pos);
    for (var i = 0; i < path.length; i++) {
      try { el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: path[i].clientX, clientY: path[i].clientY, screenX: path[i].screenX, screenY: path[i].screenY })); } catch(e) {}
      await sleep(randInt(8, 25));
    }
    try { el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false, clientX: pos.clientX, clientY: pos.clientY })); } catch(e) {}
    try { el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, clientX: pos.clientX, clientY: pos.clientY })); } catch(e) {}
    await sleep(randInt(30, 80));
    var opts = { bubbles: true, cancelable: true, button: 0, clientX: pos.clientX, clientY: pos.clientY, screenX: pos.screenX, screenY: pos.screenY };
    try { el.dispatchEvent(new MouseEvent('mousedown', opts)); } catch(e) {}
    await sleep(randInt(50, 130));
    try { el.dispatchEvent(new MouseEvent('mouseup', opts)); } catch(e) {}
    await sleep(randInt(5, 15));
    try { el.dispatchEvent(new MouseEvent('click', opts)); } catch(e) {}
  }

  function dispatchKeystroke(input, char, setter) {
    var code;
    if (char >= '0' && char <= '9') code = 'Digit' + char;
    else if (char >= 'a' && char <= 'z') code = 'Key' + char.toUpperCase();
    else if (char >= 'A' && char <= 'Z') code = 'Key' + char;
    else code = 'Key' + char.toUpperCase();
    var ki = { key: char, code: code, bubbles: true, cancelable: true };
    input.dispatchEvent(new KeyboardEvent('keydown', ki));
    if (char.length === 1) input.dispatchEvent(new KeyboardEvent('keypress', ki));
    if (setter) setter.call(input, input.value + char);
    else input.value += char;
    input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', ki));
  }

  async function typeIntoInput(input, value) {
    if (!input) return;
    await simulateHumanClick(input);
    await sleep(jitter(80));
    try { input.focus(); } catch(e) {}
    input.dispatchEvent(new FocusEvent('focus', { bubbles: true, cancelable: true }));
    await sleep(jitter(120));
    var setter = getInputPrototypeSetter(input);
    if (setter) setter.call(input, '');
    else input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(jitter(60));
    for (var i = 0; i < value.length; i++) {
      dispatchKeystroke(input, value.charAt(i), setter);
      await sleep(getTypingDelay());
    }
    input.dispatchEvent(new FocusEvent('blur', { bubbles: true, cancelable: true }));
    await sleep(jitter(80));
  }

  // ═══════════════════════════════════════════
  //  DOM Helpers
  // ═══════════════════════════════════════════

  function isVisible(el) {
    if (!el || el.hidden || el.disabled || el.type === 'hidden') return false;
    var style = window.getComputedStyle(el);
    if (!style || style.display === 'none' || style.visibility === 'hidden') return false;
    var rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function querySelector(config) {
    // Try primary first
    var el = document.querySelector(config.primary);
    if (el && isVisible(el)) return el;
    // Try fallbacks
    for (var i = 0; i < (config.fallback || []).length; i++) {
      var f = config.fallback[i];
      // Handle :has-text() pseudo-selector
      if (f.indexOf(':has-text(') !== -1) {
        var match = f.match(/:has-text\("([^"]*)"\)/i);
        if (match) {
          var baseSelector = f.replace(/:has-text\("[^"]*"\)/i, '');
          var text = match[1].toLowerCase();
          var candidates = document.querySelectorAll(baseSelector);
          for (var j = 0; j < candidates.length; j++) {
            if ((candidates[j].textContent || '').toLowerCase().indexOf(text) !== -1 && isVisible(candidates[j])) {
              return candidates[j];
            }
          }
        }
        continue;
      }
      try {
        el = document.querySelector(f);
        if (el && isVisible(el)) return el;
      } catch(e) {}
    }
    return null;
  }

  function extractUsernameFromUrl(url) {
    if (!url) return '';
    var match = String(url).match(/\/\/[^/]+\/@([^/?#]+)/);
    return match ? decodeURIComponent(match[1]).replace(/^@/, '') : '';
  }

  function findBySelectorText(selector, texts) {
    var candidates = document.querySelectorAll(selector);
    for (var i = 0; i < candidates.length; i++) {
      var text = (candidates[i].textContent || '').toLowerCase().trim();
      for (var j = 0; j < texts.length; j++) {
        if (text.indexOf(String(texts[j]).toLowerCase()) !== -1 && isVisible(candidates[i])) {
          return candidates[i];
        }
      }
    }
    return null;
  }

  function dispatchInput(el, value) {
    var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // ═══════════════════════════════════════════
  //  Page State Detection
  // ═══════════════════════════════════════════

  function detectPageState() {
    var url = window.location.href;
    if (url.indexOf('/login') !== -1) return 'login_page';
    if (url.indexOf('/foryou') !== -1 || url.indexOf('/following') !== -1) return 'authenticated';
    if (url.indexOf('/@') !== -1 && url.indexOf('/video') === -1) return 'profile_page';
    if (url.indexOf('/messages') !== -1) return 'dm_page';
    if (url.indexOf('/search') !== -1) return 'search_page';
    if (url.indexOf('/notifications') !== -1) return 'notification_page';
    if (document.cookie.indexOf('sessionid') !== -1) return 'authenticated';
    return 'unknown';
  }

  function hasSession() {
    return document.cookie.indexOf('sessionid') !== -1;
  }

  function pageText() {
    return (document.body ? document.body.innerText : '').toLowerCase();
  }

  // ═══════════════════════════════════════════
  //  Authentication State Check
  // ═══════════════════════════════════════════

  function inspectAuthState() {
    var state = detectPageState();
    if (state === 'authenticated') return { authenticated: true, state: state };
    if (state === 'login_page') return { authenticated: false, state: state, loginFormFound: !!querySelector(SELECTORS.login.usernameInput) };
    if (hasSession()) return { authenticated: true, state: state };
    return { authenticated: false, state: state };
  }

  // ═══════════════════════════════════════════
  //  DM Automation
  // ═══════════════════════════════════════════

  /**
   * 在私信页面填入消息内容（不发送）
   */
  async function fillDmDraft(message) {
    var state = detectPageState();
    if (state !== 'dm_page') {
      return { success: false, error: 'not_on_dm_page', state: state };
    }
    // Wait for chat input
    var chatInput = null;
    for (var i = 0; i < 15; i++) {
      chatInput = querySelector(SELECTORS.dm.chatInput);
      if (chatInput) break;
      await sleep(1000);
    }
    if (!chatInput) {
      return { success: false, error: 'dm_input_not_found' };
    }
    await simulateHumanClick(chatInput);
    await sleep(jitter(200));

    // For contenteditable divs
    if (chatInput.getAttribute('contenteditable') === 'true' || chatInput.isContentEditable) {
      chatInput.focus();
      chatInput.textContent = message;
      chatInput.dispatchEvent(new Event('input', { bubbles: true }));
      // Simulate typing for draft (don't send)
      await sleep(jitter(100));
      return { success: true, draftFilled: true };
    }

    // For regular inputs
    dispatchInput(chatInput, message);
    return { success: true, draftFilled: true };
  }

  /**
   * 发送私信消息
   */
  async function sendDmMessage(message) {
    var state = detectPageState();
    if (state !== 'dm_page') {
      return { success: false, error: 'not_on_dm_page', state: state };
    }
    // Fill message
    var fillResult = await fillDmDraft(message);
    if (!fillResult.success) return fillResult;

    await sleep(jitter(300));
    // Click send button
    var sendBtn = querySelector(SELECTORS.dm.sendButton);
    if (!sendBtn) {
      return { success: false, error: 'send_button_not_found' };
    }
    await simulateHumanClick(sendBtn);
    await sleep(jitter(500));
    return { success: true, sent: true };
  }

  // ═══════════════════════════════════════════
  //  Follow Automation
  // ═══════════════════════════════════════════

  /**
   * 在用户主页点击关注
   */
  async function followCurrentUser() {
    var state = detectPageState();
    if (state !== 'profile_page') {
      return { success: false, error: 'not_on_profile_page', state: state };
    }
    // Check if already following
    var followingBtn = querySelector(SELECTORS.profile.followingButton);
    if (followingBtn) {
      return { success: false, error: 'already_following' };
    }
    var followBtn = null;
    for (var i = 0; i < 10; i++) {
      followBtn = querySelector(SELECTORS.profile.followButton);
      if (followBtn) break;
      await sleep(1000);
    }
    if (!followBtn) {
      return { success: false, error: 'follow_button_not_found' };
    }
    await simulateHumanClick(followBtn);
    await sleep(jitter(1500));
    // Verify
    var confirmBtn = querySelector(SELECTORS.profile.followingButton);
    if (confirmBtn) {
      return { success: true, followed: true };
    }
    return { success: true, followed: true, unconfirmed: true };
  }

  /**
   * 通知页批量回关
   */
  async function followBackAll() {
    var state = detectPageState();
    if (state !== 'notification_page') {
      return { success: false, error: 'not_on_notification_page', state: state };
    }
    var buttons = document.querySelectorAll('button');
    var followed = 0;
    for (var i = 0; i < buttons.length; i++) {
      var text = (buttons[i].textContent || '').toLowerCase().trim();
      if ((text === 'follow back' || text === '回关') && isVisible(buttons[i])) {
        await simulateHumanClick(buttons[i]);
        await sleep(jitter(1500));
        followed++;
      }
    }
    return { success: true, followed: followed };
  }

  // ═══════════════════════════════════════════
  //  Search Automation
  // ═══════════════════════════════════════════

  /**
   * 搜索用户并返回结果列表
   */
  async function searchUsers(keyword) {
    // Navigate to search if not there
    var state = detectPageState();
    if (state !== 'search_page') {
      window.location.href = 'https://www.tiktok.com/search/user?q=' + encodeURIComponent(keyword);
      await sleep(4000);
    } else {
      // Already on search page - enter keyword
      var searchInput = querySelector(SELECTORS.nav.searchInput);
      if (searchInput) {
        await typeIntoInput(searchInput, keyword);
        await sleep(jitter(500));
        // Press Enter
        searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        await sleep(3000);
      }
    }
    // Collect results
    var cards = document.querySelectorAll(SELECTORS.search.userResultCard.primary);
    if (cards.length === 0) {
      // Try fallback
      var links = document.querySelectorAll('a[href*="/@"]');
      cards = Array.from(links).filter(function(a) { return a.href.indexOf('/video/') === -1 && isVisible(a); });
    }
    var users = [];
    for (var i = 0; i < Math.min(cards.length, 20); i++) {
      var card = cards[i];
      var link = card.tagName === 'A' ? card : card.querySelector('a[href*="/@"]');
      var nameEl = card.querySelector('[data-e2e="search-user-item"] span, [class*="title"], [class*="nickname"], p');
      var profileUrl = link ? link.href : null;
      var username = extractUsernameFromUrl(profileUrl) || (nameEl ? nameEl.textContent.trim().replace(/^@/, '') : '');
      users.push({
        url: profileUrl,
        username: username,
        name: nameEl ? nameEl.textContent.trim() : username || 'unknown'
      });
    }
    return { success: true, users: users, count: users.length };
  }

  // ═══════════════════════════════════════════
  //  Navigation
  // ═══════════════════════════════════════════

  async function navigateToDmPage() {
    window.location.href = 'https://www.tiktok.com/messages';
    await sleep(4000);
    var state = detectPageState();
    return { success: state === 'dm_page', state: state };
  }

  async function navigateToProfile(usernameOrUrl) {
    var target = String(usernameOrUrl || '').trim();
    if (!target) return { success: false, error: 'profile_target_required' };
    if (/^https:\/\/(www\.)?tiktok\.com\/@[^\s/?#]+/i.test(target)) {
      window.location.href = target;
    } else {
      window.location.href = 'https://www.tiktok.com/@' + encodeURIComponent(target.replace(/^@/, ''));
    }
    await sleep(4000);
    var state = detectPageState();
    return { success: state === 'profile_page', state: state };
  }

  async function openMessageFromProfile() {
    var selectors = [
      '[data-e2e="message-button"]',
      'button[aria-label*="Message" i]',
      'button[aria-label*="私信" i]',
      'a[href*="/messages"]'
    ];
    var btn = null;
    for (var i = 0; i < selectors.length; i++) {
      try {
        btn = document.querySelector(selectors[i]);
        if (btn && isVisible(btn)) break;
      } catch(e) {}
    }
    if (!btn || !isVisible(btn)) {
      btn = findBySelectorText('button, a', ['message', '私信', '发消息']);
    }
    if (!btn) return { success: false, error: 'message_button_not_found', state: detectPageState() };
    await simulateHumanClick(btn);
    await sleep(2500);
    return { success: true, state: detectPageState(), url: window.location.href };
  }

  async function navigateToNotifications() {
    window.location.href = 'https://www.tiktok.com/notifications';
    await sleep(4000);
    return { success: true, state: detectPageState() };
  }

  // ═══════════════════════════════════════════
  //  Video / Interaction
  // ═══════════════════════════════════════════

  async function likeCurrentVideo() {
    var btn = querySelector(SELECTORS.foryou.likeButton);
    if (!btn) return { success: false, error: 'like_button_not_found' };
    await simulateHumanClick(btn);
    return { success: true, liked: true };
  }

  async function scrollForYouPage(scrollCount) {
    var count = scrollCount || 3;
    for (var i = 0; i < count; i++) {
      var scrollAmount = randInt(600, 900);
      window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
      await sleep(jitter(2500));
      // Random micro-scroll
      if (Math.random() < 0.3) {
        window.scrollBy({ top: randInt(-50, 50), behavior: 'smooth' });
        await sleep(jitter(400));
      }
    }
    return { success: true, scrolled: count };
  }

  // ═══════════════════════════════════════════
  //  Session / Health Check
  // ═══════════════════════════════════════════

  function probeSessionHealth() {
    return {
      hasSession: hasSession(),
      cookies: document.cookie,
      url: window.location.href,
      state: detectPageState()
    };
  }

  // ═══════════════════════════════════════════
  //  Health Check — SSR + Account + Shadowban
  // ═══════════════════════════════════════════

  function readSSRData() {
    try {
      var el = document.querySelector('#__UNIVERSAL_DATA_FOR_REHYDRATION__');
      if (!el || !el.textContent) return null;
      var data = JSON.parse(el.textContent);
      var scope = (data && data.__DEFAULT_SCOPE__) || {};
      return {
        appContext: scope['webapp.app-context'] || null,
        userData: scope['webapp.user-detail'] || null,
        raw: data
      };
    } catch(e) {
      return null;
    }
  }

  function checkAccountHealth() {
    var ssrData = readSSRData();
    var result = {
      score: 100,
      status: 'healthy',
      signals: {},
      warnings: [],
      tips: []
    };

    // Dimension 1: SSR data availability (10 pts)
    var hasSSR = !!(ssrData && ssrData.userData);
    result.signals.ssrAvailable = hasSSR;
    if (!hasSSR) {
      result.score -= 10;
      result.warnings.push('SSR数据不可用，可能页面加载异常或被限制');
    }

    // Dimension 2: Page state (15 pts)
    var url = window.location.href;
    var pageSignals = {
      isProfilePage: /\/@[\\w.-]+/.test(url),
      isSearchPage: /\/search/.test(url),
      isNotificationPage: /\/notifications/.test(url),
      isMessagesPage: /\/messages/.test(url),
      isForYouPage: url === 'https://www.tiktok.com/' || /\/foryou/.test(url),
      hasCaptcha: !!document.querySelector('[class*="captcha"], [id*="captcha"]'),
      hasVerify: !!document.querySelector('[class*="verify"], [id*="verify"]'),
      has403: document.title && document.title.indexOf('Access Denied') !== -1
    };
    result.signals.page = pageSignals;

    if (pageSignals.hasCaptcha || pageSignals.hasVerify) {
      result.score -= 30;
      result.warnings.push('检测到验证码/CAPTCHA，可能触发风控');
    }
    if (pageSignals.has403) {
      result.score -= 50;
      result.warnings.push('检测到403/Access Denied，IP或账号可能被限制');
    }

    // Dimension 3: Profile completeness (15 pts)
    var user = ssrData && ssrData.userData && ssrData.userData.userInfo ? ssrData.userData.userInfo.user : null;
    var stats = ssrData && ssrData.userData && ssrData.userData.userInfo ? ssrData.userData.userInfo.stats : null;
    var profileSignals = {
      hasAvatar: !!(user && user.avatarLarger),
      hasBio: !!(user && user.signature),
      hasNickname: !!(user && user.nickname),
      isVerified: !!(user && user.verified),
      followerCount: (stats && stats.followerCount) || 0,
      followingCount: (stats && stats.followingCount) || 0,
      videoCount: (stats && stats.videoCount) || 0,
      uniqueId: (user && user.uniqueId) || '',
      nickname: (user && user.nickname) || '',
      secUid: (user && user.secUid) || ''
    };
    result.signals.profile = profileSignals;

    if (!profileSignals.hasAvatar) {
      result.score -= 5;
      result.tips.push('建议上传头像，提高账号可信度');
    }
    if (!profileSignals.hasBio) {
      result.score -= 3;
      result.tips.push('建议填写个人简介');
    }
    if (profileSignals.followerCount < 10 && profileSignals.videoCount === 0) {
      result.score -= 5;
      result.tips.push('新号建议先发布几个视频，积累基础粉丝再操作');
    }

    // Dimension 4: Follow ratio (20 pts)
    var frRatio = profileSignals.followerCount > 0
      ? profileSignals.followingCount / profileSignals.followerCount
      : (profileSignals.followingCount > 0 ? 999 : 0);
    result.signals.followRatio = Math.round(frRatio * 100) / 100;

    if (frRatio > 10) {
      result.score -= 15;
      result.warnings.push('关注/粉丝比异常 (' + result.signals.followRatio + ':1)，大量关注但粉丝少会触发风控');
      result.tips.push('建议暂停关注操作，先提升粉丝数');
    } else if (frRatio > 5) {
      result.score -= 8;
      result.warnings.push('关注/粉丝比偏高 (' + result.signals.followRatio + ':1)，建议降低关注频率');
    }

    // Dimension 5: Page function availability (20 pts)
    var funcSignals = {
      followBtnVisible: !!document.querySelector('[data-e2e="follow-button"], button:has-text("Follow")'),
      messageBtnVisible: !!document.querySelector('[data-e2e="message-button"], button:has-text("Message")'),
      searchInputVisible: !!document.querySelector('input[placeholder*="Search"], [data-e2e="search-box"]'),
      navMessagesVisible: !!document.querySelector('[data-e2e="nav-messages"], a[href*="/messages"]'),
      fypVideosVisible: document.querySelectorAll('[data-e2e="recommend-list"] > *, video').length > 0
    };
    result.signals.functions = funcSignals;

    if (!funcSignals.fypVideosVisible && pageSignals.isForYouPage) {
      result.score -= 15;
      result.warnings.push('FYP页面无视频加载，可能被限流或网络异常');
    }

    // Final judgment
    if (result.score >= 80) {
      result.status = 'healthy';
    } else if (result.score >= 60) {
      result.status = 'caution';
      result.tips.push('账号处于观察期，建议降低操作频率，增加正常浏览行为');
    } else if (result.score >= 30) {
      result.status = 'restricted';
      result.tips.push('账号可能已被部分限制，建议暂停自动化操作24-48小时');
    } else {
      result.status = 'shadowbanned';
      result.tips.push('严重疑似被限流/Shadowban，建议停止所有自动化操作至少7天');
    }

    return result;
  }

  function detectVideoRestrictionSignals() {
    var el = document.querySelector('#__UNIVERSAL_DATA_FOR_REHYDRATION__');
    if (!el) return { isRestricted: false, signals: [] };

    try {
      var data = JSON.parse(el.textContent);
      var itemList = data && data.__DEFAULT_SCOPE__ && data.__DEFAULT_SCOPE__['webapp.item-detail']
        ? data.__DEFAULT_SCOPE__['webapp.item-detail'].itemInfo && data.__DEFAULT_SCOPE__['webapp.item-detail'].itemInfo.itemStruct
        : null;
      if (!itemList) return { isRestricted: false, signals: [] };

      var checks = {
        isTakenDown: itemList.takeDown === true,
        hasWarning: !!itemList.warnInfo,
        divertedToPrivate: itemList.divertedToPrivate === true,
        isSecret: itemList.secret === true,
        isPrivateItem: itemList.privateItem === true,
        isReviewing: itemList.isReviewing === true,
        forFriendOnly: itemList.forFriend === true,
        indexDisabled: itemList.indexEnabled === false,
        commentDisabled: itemList.commentDisabled === true,
        duetDisabled: itemList.duetDisabled === true,
        stitchDisabled: itemList.stitchDisabled === true,
        downloadDisabled: itemList.downloadDisabled === true,
        shareDisabled: itemList.shareDisabled === true
      };

      var signals = [];
      for (var key in checks) {
        if (checks.hasOwnProperty(key) && checks[key]) signals.push(key);
      }

      return {
        isRestricted: signals.length > 0,
        signals: signals,
        videoHealthScore: itemList.videoHealthScore != null ? itemList.videoHealthScore : null
      };
    } catch(e) {
      return { isRestricted: false, signals: [], error: e.message };
    }
  }

  function runFullHealthCheck() {
    var health = checkAccountHealth();
    var videoRestriction = detectVideoRestrictionSignals();
    var ssrData = readSSRData();
    var user = null;
    if (ssrData && ssrData.userData && ssrData.userData.userInfo) {
      user = {
        uniqueId: ssrData.userData.userInfo.user && ssrData.userData.userInfo.user.uniqueId || '',
        nickname: ssrData.userData.userInfo.user && ssrData.userData.userInfo.user.nickname || '',
        secUid: ssrData.userData.userInfo.user && ssrData.userData.userInfo.user.secUid || '',
        followerCount: ssrData.userData.userInfo.stats && ssrData.userData.userInfo.stats.followerCount || 0,
        followingCount: ssrData.userData.userInfo.stats && ssrData.userData.userInfo.stats.followingCount || 0
      };
    }
    return {
      health: health,
      videoRestriction: videoRestriction,
      ssrUser: user,
      hasSession: hasSession(),
      pageState: detectPageState(),
      url: window.location.href
    };
  }

  // ═══════════════════════════════════════════
  //  Warmup Browsing
  // ═══════════════════════════════════════════

  async function performWarmupAction() {
    var vw = window.innerWidth || 800;
    var vh = window.innerHeight || 600;
    var actions = randInt(2, 4);
    for (var i = 0; i < actions; i++) {
      var choice = Math.random();
      if (choice < 0.35) {
        // Scroll
        var scrollAmount = randInt(-200, 400);
        try { window.scrollBy({ top: scrollAmount, left: 0, behavior: 'smooth' }); } catch(e) {}
      } else if (choice < 0.6) {
        // Random mouse move
        var x = randInt(80, vw - 80);
        var y = randInt(80, vh - 80);
        var sx = window.screenX || 0;
        var sy = window.screenY || 0;
        try {
          document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: x, clientY: y, screenX: x + sx, screenY: y + sy }));
        } catch(e) {}
      } else if (choice < 0.85) {
        // Hover random element
        try {
          var targets = document.querySelectorAll('a, button, [role="button"], video');
          if (targets.length > 0) {
            var t = targets[randInt(0, Math.min(targets.length - 1, 20))];
            var rect = t.getBoundingClientRect();
            t.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false, clientX: rect.left + rect.width/2, clientY: rect.top + rect.height/2 }));
            t.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, clientX: rect.left + rect.width/2, clientY: rect.top + rect.height/2 }));
          }
        } catch(e) {}
      }
      await sleep(randInt(1000, 4000));
    }
    return { success: true, warmed: true };
  }

  // ═══════════════════════════════════════════
  //  DM Conversations Listing
  // ═══════════════════════════════════════════

  /**
   * 读取 DM 列表中的对话，可选读取每个对话的最近消息
   */
  async function listDmConversations() {
    var state = detectPageState();
    if (state !== 'dm_page') {
      return { success: false, error: 'not_on_dm_page', state: state };
    }

    await sleep(2000);

    // Try common conversation list selectors
    var conversationItems = document.querySelectorAll(
      '[data-e2e="message-item"], [class*="conversation"], [class*="chat-item"], [class*="message-thread"], [class*="inbox-item"]'
    );

    if (conversationItems.length === 0) {
      // Fallback: find links to individual DMs
      var links = document.querySelectorAll('a[href*="/messages"]');
      conversationItems = Array.from(links).filter(function(a) {
        return a.href.indexOf('/messages?') !== -1 && isVisible(a);
      });
    }

    if (conversationItems.length === 0) {
      return { success: true, conversations: [], state: state };
    }

    var conversations = [];

    for (var i = 0; i < Math.min(conversationItems.length, 10); i++) {
      var item = conversationItems[i];
      if (!isVisible(item)) continue;

      // Extract friend name
      var nameEl = item.querySelector('[class*="name"], [class*="nickname"], [class*="title"], span');
      var name = nameEl ? nameEl.textContent.trim() : 'unknown';

      // Extract last message preview
      var previewEl = item.querySelector('[class*="preview"], [class*="last-message"], [class*="subtitle"], p');
      var preview = previewEl ? previewEl.textContent.trim() : '';

      // Extract unread indicator
      var unreadEl = item.querySelector('[class*="unread"], [class*="badge"], [class*="count"]');
      var hasUnread = !!unreadEl;

      // Try to get friend ID from link
      var link = item.tagName === 'A' ? item : item.querySelector('a[href*="/messages"]');
      var friendId = name.toLowerCase().replace(/\s+/g, '_');

      conversations.push({
        friendId: friendId,
        friendName: name,
        preview: preview,
        hasUnread: hasUnread,
        messages: [{
          id: 'dm-' + i + '-' + Date.now(),
          authorId: friendId,
          authorName: name,
          direction: 'incoming',
          content: preview,
          messageAt: new Date().toISOString()
        }]
      });

      if (conversations.length >= 5) break;
    }

    return { success: true, conversations: conversations, count: conversations.length, state: state };
  }

  // ═══════════════════════════════════════════
  //  Expose Automation Bridge
  // ═══════════════════════════════════════════

  window.__tk_automation = {
    version: BRIDGE_VERSION,
    // State
    detectPageState: detectPageState,
    inspectAuthState: inspectAuthState,
    probeSessionHealth: probeSessionHealth,
    hasSession: hasSession,
    // Health Check
    checkAccountHealth: checkAccountHealth,
    detectVideoRestrictionSignals: detectVideoRestrictionSignals,
    runFullHealthCheck: runFullHealthCheck,
    readSSRData: readSSRData,
    // DM
    fillDmDraft: fillDmDraft,
    sendDmMessage: sendDmMessage,
    navigateToDmPage: navigateToDmPage,
    listDmConversations: listDmConversations,
    // Follow
    followCurrentUser: followCurrentUser,
    followBackAll: followBackAll,
    // Search
    searchUsers: searchUsers,
    navigateToProfile: navigateToProfile,
    openMessageFromProfile: openMessageFromProfile,
    // Navigation
    navigateToNotifications: navigateToNotifications,
    // Interaction
    likeCurrentVideo: likeCurrentVideo,
    scrollForYouPage: scrollForYouPage,
    // Warmup
    performWarmupAction: performWarmupAction,
    // Helpers
    simulateHumanClick: simulateHumanClick,
    typeIntoInput: typeIntoInput,
    sleep: sleep,
    jitter: jitter
  };

  return true;
})();
`.trim();
}

module.exports = { getTikTokAutomationBootstrapScript };
