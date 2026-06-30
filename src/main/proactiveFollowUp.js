const { EventEmitter } = require('events');

// 检测用户表达了下载/注册意向的关键词
const DOWNLOAD_INTENT_PATTERNS = [
  /i('ll| will)?\s*(try|download|install|get|check).*(?:it|game|out)/i,
  /let me (try|download|check|look)/i,
  /i('m| am) (going to|gonna) (try|download|install)/i,
  /ok.*i('ll| will).*try/i,
  /sounds? (good|cool|interesting|fun).*i('ll| will)/i,
  /where (can|do) i (download|get|find)/i,
  /what('s| is) (it|the game) called/i,
  /i('ll| will) look (it|for it) up/i,
  /give me a (sec|minute|moment)/i,
  /downloading/i,
  /installing/i
];

// 检测用户已经下载/注册完成的关键词
const DOWNLOADED_PATTERNS = [
  /i (downloaded|installed|got) (it|the game)/i,
  /i('m| am) (in|playing|on)/i,
  /just (downloaded|installed|started)/i,
  /i (made|created) (an? )?(account|character)/i,
  /what('s| is) (next|my next step|now)/i,
  /i('m| am) (in|at) (the|a) (tutorial|server|game)/i,
  /ok (i('m| am)|done)/i
];

// 检测用户已经发了截图或游戏 ID（含多语言变体）
const SCREENSHOT_SENT_PATTERNS = [
  /here.*id/i,
  /my.*id/i,
  /screenshot/i,
  /server.*\d/i,
  /servidor.*\d/i,
  /serveur.*\d/i,
  /\bid\b[:\s]*\d{6,}/i,
  /^\d{10,}$/m,
  /game.*id[:\s]*\d/i
];

// 检测用户发送了图片附件（仅在 STAGE_DOWNLOADED 阶段视为截图）
const IMAGE_ATTACHMENT_PATTERN = /\[attachment: image/i;

const FOLLOW_UP_DELAY_MS = 2 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const MAX_FOLLOW_UPS_PER_FRIEND = 1;

const STAGE_INTENT = 'intent';
const STAGE_DOWNLOADED = 'downloaded';

const INTENT_FOLLOW_UP_TEMPLATES = [
  'Hey, by the way, did you get a chance to check out that game? No rush, just curious',
  'Hi! Just wondering how things are going. Let me know if you need help finding the game later',
];

const SCREENSHOT_FOLLOW_UP_TEMPLATES = [
  'Hey, how\'s the game going? If you want to play together just send me your game ID whenever you get a chance',
  'Hi! Hope you\'re having fun with the game. Send me your ID when you\'re free and I\'ll add you',
];

class ProactiveFollowUp extends EventEmitter {
  constructor({ tiktokPlatform, accountManager, store, getSettings, logger }) {
    super();
    this.tiktokPlatform = tiktokPlatform;
    this.accountManager = accountManager;
    this.store = store;
    this.getSettings = getSettings;
    this.log = logger || { call: () => {}, ok: () => {}, fail: () => {}, warn: () => {}, info: () => {} };

    this._intents = new Map();
    this._timer = null;
  }

  start() {
    if (this._timer) return;
    this._timer = setInterval(() => {
      this._processFollowUps().catch((err) => {
        this.log.fail('proactive-followup', err.message || String(err));
      });
    }, CHECK_INTERVAL_MS);
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  /**
   * 每次 AI 回复成功后调用，检测对话中是否有下载意向或已下载完成
   */
  async analyzeConversation({ accountSlot, channelId, friendId, messages, aiReply }) {
    const settings = this.getSettings();
    if (!settings.autoReplyEnabled) return;

    const key = `${accountSlot}:${friendId}`;

    const latestIncoming = [...messages]
      .filter((m) => m.direction === 'incoming')
      .sort((a, b) => String(b.id || '').localeCompare(String(a.id || '')))
      .slice(0, 3);

    // 双重确认：用户消息含 ID/截图特征 + AI 回复确认收到 → 标记请求列表
    for (const msg of latestIncoming) {
      if (SCREENSHOT_SENT_PATTERNS.some((p) => p.test(msg.content)) && this._isIdConfirmationReply(aiReply || '')) {
        this.emit('id-received', { accountSlot, friendId });
        break;
      }
    }

    // 检测用户是否发了截图（任务完成，移除队列）
    for (const msg of latestIncoming) {
      if (SCREENSHOT_SENT_PATTERNS.some((p) => p.test(msg.content))) {
        if (this._intents.has(key)) {
          this.log.ok('screenshot-received', `Slot${accountSlot} → ${friendId}: 收到截图`);
          this._intents.delete(key);
        }
        return;
      }
      const existing = this._intents.get(key);
      if (existing && existing.stage === STAGE_DOWNLOADED && IMAGE_ATTACHMENT_PATTERN.test(msg.content)) {
        this.log.ok('screenshot-received', `Slot${accountSlot} → ${friendId}: 收到图片附件（视为截图）`);
        this._intents.delete(key);
        return;
      }
    }

    // 检测用户是否已经下载完成 → 进入催截图阶段
    for (const msg of latestIncoming) {
      if (DOWNLOADED_PATTERNS.some((p) => p.test(msg.content))) {
        const existing = this._intents.get(key);
        if (existing && existing.stage === STAGE_DOWNLOADED) return;
        this._intents.set(key, {
          accountSlot,
          friendId,
          channelId,
          detectedAt: Date.now(),
          followUpCount: 0,
          stage: STAGE_DOWNLOADED
        });
        this.log.info('downloaded-detected', `Slot${accountSlot} → ${friendId}: 检测到已下载，进入催截图阶段`);
        return;
      }
    }

    // 检测用户是否表达了下载意向
    for (const msg of latestIncoming) {
      if (DOWNLOAD_INTENT_PATTERNS.some((p) => p.test(msg.content))) {
        if (!this._intents.has(key)) {
          this._intents.set(key, {
            accountSlot,
            friendId,
            channelId,
            detectedAt: Date.now(),
            followUpCount: 0,
            stage: STAGE_INTENT
          });
          this.log.info('intent-detected', `Slot${accountSlot} → ${friendId}: 检测到下载意向`);
        }
        return;
      }
    }

    // 检测 AI 回复中是否包含下载引导（对方积极回应）
    if (aiReply && /download|install|app store|google play|play store/i.test(aiReply)) {
      for (const msg of latestIncoming) {
        if (/ok|sure|yeah|yes|alright|cool|sounds good/i.test(msg.content)) {
          if (!this._intents.has(key)) {
            this._intents.set(key, {
              accountSlot,
              friendId,
              channelId,
              detectedAt: Date.now(),
              followUpCount: 0,
              stage: STAGE_INTENT
            });
            this.log.info('intent-detected', `Slot${accountSlot} → ${friendId}: 积极回应下载引导`);
          }
          return;
        }
      }
    }
  }

  _isIdConfirmationReply(aiReply) {
    return /got it|i'll add you|adding you|add you now|let me add|thanks|thank you|awesome|great to meet/i.test(aiReply)
      && /add|id|got|thanks|great|awesome|meet/i.test(aiReply);
  }

  async _processFollowUps() {
    if (this._intents.size === 0) return;

    const settings = this.getSettings();
    if (!settings.autoReplyEnabled) return;

    const now = Date.now();
    const toRemove = [];

    for (const [key, intent] of this._intents) {
      const elapsed = now - intent.detectedAt;
      if (elapsed < FOLLOW_UP_DELAY_MS) continue;

      if (intent.followUpCount >= MAX_FOLLOW_UPS_PER_FRIEND) {
        this.log.info('followup-maxed', `Slot${intent.accountSlot} → ${intent.friendId}: 已催${MAX_FOLLOW_UPS_PER_FRIEND}次无回应，停止`);
        toRemove.push(key);
        continue;
      }

      const account = this.accountManager.getOnlineAccounts().find((a) => a.slot === intent.accountSlot);
      if (!account) continue;

      try {
        const ctrl = this.tiktokPlatform.ensureController(intent.accountSlot);
        await ctrl.installAutomationBridge();
        await ctrl.navigate('https://www.tiktok.com/messages');
        await sleep(4000);
        const result = await ctrl.callAutomation('listDmConversations');
        const channels = result?.conversations || [];
        const channel = channels.find((c) => c.friendId === intent.friendId);

        if (channel) {
          const messages = (await ctrl.callAutomation('readDmMessages', { friendId: intent.friendId, limit: 3 }))?.messages || [];
          const latestIncoming = messages.find((m) => m.direction === 'incoming');
          if (latestIncoming) {
            const msgTime = new Date(latestIncoming.messageAt).getTime();
            if (msgTime > intent.detectedAt) {
              if (DOWNLOADED_PATTERNS.some((p) => p.test(latestIncoming.content))) {
                intent.stage = STAGE_DOWNLOADED;
                intent.detectedAt = now;
                intent.followUpCount = 0;
                continue;
              }
              if (SCREENSHOT_SENT_PATTERNS.some((p) => p.test(latestIncoming.content))) {
                toRemove.push(key);
                continue;
              }
              if (intent.stage === STAGE_DOWNLOADED && IMAGE_ATTACHMENT_PATTERN.test(latestIncoming.content)) {
                toRemove.push(key);
                continue;
              }
              intent.detectedAt = now;
              continue;
            }
          }
        }

        const templates = intent.stage === STAGE_DOWNLOADED
          ? SCREENSHOT_FOLLOW_UP_TEMPLATES
          : INTENT_FOLLOW_UP_TEMPLATES;
        const template = templates[intent.followUpCount % templates.length];
        await ctrl.callAutomation('sendDmMessage', template);

        intent.followUpCount += 1;
        intent.detectedAt = now;
        this.log.ok('proactive-followup', `Slot${intent.accountSlot} → ${intent.friendId} [${intent.stage}] (第${intent.followUpCount}次跟进)`);
        this.emit('followup-sent', { accountSlot: intent.accountSlot, friendId: intent.friendId, count: intent.followUpCount, stage: intent.stage });
      } catch (err) {
        this.log.warn('proactive-followup', `${intent.friendId}: ${err.message || String(err)}`);
      }
    }

    for (const key of toRemove) {
      this._intents.delete(key);
    }
  }

  getStatus() {
    const items = [];
    for (const [key, intent] of this._intents) {
      items.push({
        key,
        accountSlot: intent.accountSlot,
        friendId: intent.friendId,
        stage: intent.stage,
        detectedAt: new Date(intent.detectedAt).toISOString(),
        followUpCount: intent.followUpCount,
        waitingMs: Date.now() - intent.detectedAt
      });
    }
    return { pending: items.length, items };
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { ProactiveFollowUp };
