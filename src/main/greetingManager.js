const { EventEmitter } = require('events');

const RETRY_INTERVAL_MS = 30000;
const MAX_RETRY_DURATION_MS = 24 * 60 * 60 * 1000;

class GreetingManager extends EventEmitter {
  constructor({ tiktokPlatform, accountManager, getSettings, store, logger }) {
    super();
    this.tiktokPlatform = tiktokPlatform;
    this.accountManager = accountManager;
    this.getSettings = getSettings;
    this.store = store;
    this.log = logger || { call: () => {}, ok: () => {}, fail: () => {}, warn: () => {}, info: () => {} };
    this._pendingQueue = new Map();
    this._retryTimer = null;
    this._manualCheckTimer = null;
  }

  start() {
    if (this._retryTimer) return;
    this._retryTimer = setInterval(() => {
      this._processPendingQueue().catch((err) => {
        this.log.fail('greeting-retry', err.message || String(err));
      });
    }, RETRY_INTERVAL_MS);
    this._manualCheckTimer = setInterval(() => {
      this._checkManualFriends().catch((err) => {
        this.log.fail('greeting-manual-check', err.message || String(err));
      });
    }, 60000);
  }

  stop() {
    if (this._retryTimer) {
      clearInterval(this._retryTimer);
      this._retryTimer = null;
    }
    if (this._manualCheckTimer) {
      clearInterval(this._manualCheckTimer);
      this._manualCheckTimer = null;
    }
  }

  async handleTaskProgress(request) {
    const settings = this.getSettings();
    if (!settings.greetingEnabled) {
      this.log.info('greeting-check', 'greetingEnabled=false');
      return;
    }
    const code = request?.resultCode;
    if (code !== 'dm_sent' && code !== 'success_sent') {
      return;
    }

    const accountSlot = request.assignedSlot;
    const username = request.username || '';
    const friendId = request.targetUserId || request.friendId || username;
    if (!friendId) {
      this.log.fail('greeting-check', `friendId 为空: targetUserId=${request.targetUserId} friendId=${request.friendId} username=${username}`);
      return;
    }

    try {
      const alreadySent = await this.store.hasSentGreeting(accountSlot, friendId);
      if (alreadySent) {
        this.log.info('greeting-check', `已发送过打招呼 (slot=${accountSlot}, friendId=${friendId})`);
        return;
      }

      const template = this.selectTemplate(settings, request);
      if (!template) {
        this.log.warn('greeting-check', '未找到匹配的打招呼模板');
        return;
      }

      const text = this.renderTemplate(template.content, { request, accountSlot, settings });

      try {
        await this.sendGreetingMessage(accountSlot, friendId, text);
        await this.store.recordGreeting(accountSlot, friendId, template.id);
        this.log.ok('greeting', `Slot${accountSlot} → ${friendId}`);
        this.emit('greeting-sent', { accountSlot, friendId, templateId: template.id });
        return;
      } catch (sendErr) {
        const errCode = sendErr?.code;
        if (errCode === 'risk_captcha_response') {
          try { this.accountManager.flagCaptchaSlot(accountSlot); } catch (_) { }
          this.log.warn('greeting-captcha', `Slot${accountSlot} → ${friendId} 触发人机验证，已标记跳过`);
        }
        this.log.info('greeting-queued', `Slot${accountSlot} → ${friendId} (等待重试)`);
      }

      const key = `${accountSlot}:${friendId}`;
      if (!this._pendingQueue.has(key)) {
        this._pendingQueue.set(key, {
          accountSlot,
          friendId,
          request,
          templateId: template.id,
          text,
          enqueuedAt: Date.now()
        });
      }
    } catch (err) {
      this.log.fail('greeting', `${friendId}: ${err.message}`);
      this.emit('greeting-failed', { accountSlot, friendId, error: err.message });
    }
  }

  async sendGreetingMessage(slot, friendId, text) {
    const ctrl = this.tiktokPlatform.ensureController(slot);
    await ctrl.installAutomationBridge();
    await ctrl.navigate('https://www.tiktok.com/messages');
    await sleep(4000);
    return ctrl.callAutomation('sendDmToUser', { friendId, text });
  }

  async _processPendingQueue() {
    if (this._pendingQueue.size === 0) return;

    const settings = this.getSettings();
    if (!settings.greetingEnabled) return;

    const now = Date.now();
    const expired = [];

    for (const [key, item] of this._pendingQueue) {
      if (now - item.enqueuedAt > MAX_RETRY_DURATION_MS) {
        expired.push(key);
        continue;
      }

      try {
        const alreadySent = await this.store.hasSentGreeting(item.accountSlot, item.friendId);
        if (alreadySent) {
          expired.push(key);
          continue;
        }

        await this.sendGreetingMessage(item.accountSlot, item.friendId, item.text);
        await this.store.recordGreeting(item.accountSlot, item.friendId, item.templateId);
        this.log.ok('greeting-retry', `Slot${item.accountSlot} → ${item.friendId}`);
        this.emit('greeting-sent', { accountSlot: item.accountSlot, friendId: item.friendId, templateId: item.templateId });
        expired.push(key);
      } catch (_err) {
        const errCode = _err?.code;
        if (errCode === 'risk_captcha_response') {
          try { this.accountManager.flagCaptchaSlot(item.accountSlot); } catch (_) { }
          this.log.warn('greeting-retry-captcha', `Slot${item.accountSlot} → ${item.friendId} 触发人机验证，已标记跳过`);
          expired.push(key);
          continue;
        }
      }
    }

    for (const key of expired) {
      this._pendingQueue.delete(key);
    }
  }

  async _checkManualFriends() {
    const settings = this.getSettings();
    if (!settings.greetingEnabled) return;

    let accounts;
    try {
      accounts = this.accountManager ? this.accountManager.getOnlineAccounts() : [];
    } catch (_e) {
      accounts = [];
    }
    if (!accounts.length) return;

    for (const account of accounts) {
      let conversations;
      try {
        const ctrl = this.tiktokPlatform.ensureController(account.slot);
        await ctrl.installAutomationBridge();
        await ctrl.navigate('https://www.tiktok.com/messages');
        await sleep(4000);
        const result = await ctrl.callAutomation('listDmConversations');
        conversations = result?.conversations || [];
      } catch (_e) {
        continue;
      }
      if (!conversations || !conversations.length) continue;

      let sent = 0;
      for (const conv of conversations) {
        if (sent >= 1) break;
        const friendId = conv.friendId;
        if (!friendId) continue;

        try {
          const alreadySent = await this.store.hasSentGreeting(account.slot, friendId);
          if (alreadySent) continue;

          const template = this.selectTemplate(settings, { tag: '', assignedSlot: account.slot });
          if (!template) continue;

          const text = this.renderTemplate(template.content, {
            request: { displayName: conv.friendName, username: conv.friendName, tag: '', note: '' },
            accountSlot: account.slot,
            settings
          });

          await this.sendGreetingMessage(account.slot, friendId, text);
          await this.store.recordGreeting(account.slot, friendId, template.id);
          this.log.ok('greeting-manual', `Slot${account.slot} → ${friendId} (${conv.friendName}) 手动补发`);
          this.emit('greeting-sent', { accountSlot: account.slot, friendId, templateId: template.id });
          sent += 1;
        } catch (_err) {
          const errCode = _err?.code;
          if (errCode === 'risk_captcha_response') {
            try { this.accountManager.flagCaptchaSlot(account.slot); } catch (_) { }
            this.log.warn('greeting-manual-captcha', `Slot${account.slot} 手动补发触发人机验证，已标记跳过`);
          }
        }
      }
    }
  }

  selectTemplate(settings, request) {
    const templates = settings.greetingTemplates || [];
    if (templates.length === 0) return null;

    const tag = request.tag || '';
    const slot = request.assignedSlot;

    const byTag = tag ? templates.find((t) => t.matchTag === tag && t.enabled !== false) : null;
    if (byTag) return byTag;

    const bySlot = templates.find((t) => t.matchSlot === slot && !t.matchTag && t.enabled !== false);
    if (bySlot) return bySlot;

    const defaultTpl = templates.find((t) => !t.matchTag && !t.matchSlot && t.enabled !== false);
    return defaultTpl || null;
  }

  renderTemplate(content, { request, accountSlot, settings }) {
    const now = new Date();
    const vars = {
      friendName: request.displayName || request.username || '',
      username: request.username || '',
      displayName: request.displayName || '',
      tag: request.tag || '',
      note: request.note || '',
      accountSlot: String(accountSlot),
      date: now.toLocaleDateString('zh-CN'),
      time: now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      language: settings.greetingLanguage || ''
    };
    return content.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = GreetingManager;
