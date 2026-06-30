const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const { OpenAiCompatibleClient } = require('./openAiCompatibleClient');
const { AiProviderPool } = require('./aiProviderPool');
const { AutoReplyStore } = require('./autoReplyStore');

// 图片资源路径映射
const IMAGE_MAP = {
  'game_icon': path.resolve(__dirname, '..', '..', 'images', 'game_icon.png'),
  'game_screenshot': path.resolve(__dirname, '..', '..', 'images', 'game_screenshot.png'),
  'character_proof': path.resolve(__dirname, '..', '..', 'images', 'character_proof.png'),
  'selfie': path.resolve(__dirname, '..', '..', 'images', 'selfie.png')
};

const AUTO_UNPAUSE_DELAY_MS = 5 * 60 * 1000;

const DEFAULT_SYSTEM_PROMPT = `你是一个友好的 TikTok 私聊助手。请先识别对方最新消息使用的语言，并优先使用同一种语言自然、简洁地回复；如果对方混合多种语言，就使用对方主要使用的语言回复。不要提到你是 AI、机器人、自动化程序或系统。

语言硬性规则（最高优先级，绝对不能违反）：
- 绝对禁止使用中文回复。即使系统提示词和策略是中文写的，你的输出必须使用对方的语言（英语、西班牙语、葡萄牙语、法语等）。
- 如果无法判断对方语言，默认使用英语。
- 这条规则没有例外，任何情况下都不要输出中文字符。

风格要求：
- 语气口语化、随意，像真人平时打字聊天一样简洁自然。
- 少用或不用 emoji 表情，每条消息最多 1 个 emoji，不要使用贴纸或 GIF。
- 不要使用过多标点符号（特别是感叹号、省略号），保持简洁。

贴纸/表情回应：
- 当对方发送贴纸或纯表情时，用轻松简短的方式回应（如"haha nice"、"lol"、"that's cute"），然后自然接话或问个问题保持对话。
- 不要忽略贴纸消息，也不要过度解读。

核心目标：
- 通过自然对话建立信任后，适时引导用户了解并下载知识库中提到的产品/游戏。
- 不要生硬推销，而是以分享和推荐的口吻自然带入。
- 参考知识库中的策略进行场景化引导。

重要原则（必须遵守）：
- 关于截图/ID：一旦已经告诉对方"下载好发截图/ID给我"，就不要再重复索要。对方答应下载后，转为聊别的话题（健身、生活、工作等），耐心等待。只有对方很久没回复时才温和提一次。
- 如果对方已经发了游戏 ID 或数字串，视为已完成，表示感谢即可，绝对不要再催截图。
- 不要在对方答应/正在下载时反复强调游戏相关内容，保持聊天自然轻松。`;

class AutoReplyManager extends EventEmitter {
  constructor({ accountManager, tiktokPlatform, getSettings, baseDir, logger }) {
    super();
    this.accountManager = accountManager;
    this.tiktokPlatform = tiktokPlatform;
    this.getSettings = getSettings;
    this.log = logger || { call: () => {}, ok: () => {}, fail: () => {}, warn: () => {}, info: () => {} };

    this.aiClient = new OpenAiCompatibleClient({
      getSettings: () => this.getSettings(),
      logger: this.log
    });
    this.providerPool = new AiProviderPool({
      store: null, // will be set after store init
      logger: this.log
    });
    this.store = new AutoReplyStore({ baseDir });

    this._ticker = null;
    this._running = false;
    this._processing = false;
    this._tickMs = 5000;

    // Rate limiting
    this.lastAccountReplyAt = new Map();
    this.lastFriendReplyAt = new Map();
    this.hourlyReplies = [];
    this.pausedSlots = new Map();
  }

  tryAutoUnpause() {
    const now = Date.now();
    for (const [slot, pausedAt] of this.pausedSlots) {
      if (now - pausedAt >= AUTO_UNPAUSE_DELAY_MS) {
        this.pausedSlots.delete(slot);
        this.log.info('autoUnpause', { slot });
      }
    }
  }

  useProviderPool() {
    const settings = this.getSettings();
    const providers = settings.autoReplyProviders || [];
    return providers.some((p) => p.enabled && p.baseURL && p.apiKey && p.model);
  }

  async start() {
    if (this._running) return;
    this._running = true;
    this.providerPool.store = this.store;

    this._ticker = setInterval(() => {
      this.tick().catch((err) => {
        this.log.fail('tick-error', err);
      });
    }, this._tickMs);

    this.log.info('autoReply', '自动回复引擎已启动');
  }

  async stop() {
    this._running = false;
    if (this._ticker) {
      clearInterval(this._ticker);
      this._ticker = null;
    }
    this.log.info('autoReply', '自动回复引擎已停止');
  }

  getStatus() {
    return {
      running: this._running,
      pausedSlots: this.getPausedSlots(),
      stats: this.store.stats()
    };
  }

  async tick() {
    this.tryAutoUnpause();
    if (this._processing) return;
    this._processing = true;
    try {
      await this.processOnce();
    } finally {
      this._processing = false;
    }
  }

  async processOnce() {
    const settings = this.getSettings();
    if (!settings.autoReplyEnabled) return;

    const accounts = this.accountManager.listAccounts();
    const onlineAccounts = accounts.filter((a) =>
      a.loginState === 'online' && !this.pausedSlots.has(a.slot) && !a.isEmpty
    );

    for (const account of onlineAccounts) {
      if (!this._running) break;
      if (!this.canReplyForAccount(account.slot, settings)) continue;

      try {
        await this.processAccount(account.slot, settings);
      } catch (error) {
        this.log.fail('processAccount', error, { slot: account.slot });
        await this.recordFailure({
          accountSlot: account.slot,
          resultCode: classifyErrorCode(error),
          resultLabel: classifyErrorLabel(error),
          resultDetail: error instanceof Error ? error.message : String(error),
          errorMessage: error instanceof Error ? error.message : String(error)
        });
        if (/(?:会话已失效|登录会话|会话失效|unauthorized|401)|(?:频率限制|rate.*limit|429)|(?:风控|captcha|人机验证)/i.test(String(error?.message || error))) {
          this.pausedSlots.set(account.slot, Date.now());
        }
      }
    }
  }

  async processAccount(slot, settings) {
    // Step 1: Navigate to DM page and read conversations
    const conversations = await this.readDmConversations(slot);
    if (!conversations || conversations.length === 0) return;

    // Step 2: Process each conversation with unread messages
    for (const conv of conversations) {
      if (!this._running) break;

      const latestIncoming = findLatestIncoming(conv.messages || []);
      if (!latestIncoming) continue;

      const friendId = conv.friendId || latestIncoming.authorId || latestIncoming.authorName;

      // Check if already replied
      const alreadyReplied = await this.store.hasReplyForMessage(slot, latestIncoming.id);
      if (alreadyReplied) continue;

      // Check friend-level rate limit
      if (!this.canReplyForFriend(slot, friendId, settings)) continue;

      await this.replyToMessage({
        slot,
        friendId,
        friendName: conv.friendName || latestIncoming.authorName,
        incomingMessage: latestIncoming,
        messages: conv.messages,
        settings
      });
    }
  }

  async readDmConversations(slot) {
    try {
      const ctrl = this.tiktokPlatform.ensureController(slot);
      await ctrl.installAutomationBridge();

      // Navigate to DM page
      await ctrl.navigate('https://www.tiktok.com/messages');
      await sleep(4000);

      // Read DM list via bridge
      const result = await ctrl.callAutomation('listDmConversations');
      return result?.conversations || [];
    } catch (error) {
      this.log.fail('readDmConversations', error, { slot });
      return [];
    }
  }

  async replyToMessage({ slot, friendId, friendName, incomingMessage, messages, settings }) {
    const startedAt = new Date().toISOString();

    const record = await this.store.createRecord({
      accountSlot: slot,
      channelId: friendId,
      incomingMessageId: incomingMessage.id || `msg-${Date.now()}`,
      friendId,
      friendName,
      incomingText: incomingMessage.content,
      contextPreview: buildContextPreview(messages),
      status: 'running',
      resultCode: 'generating',
      resultLabel: '生成中',
      resultDetail: '正在生成自动回复。',
      startedAt
    });
    this.emitRecord(record);

    try {
      let reply, providerId, providerName, providerModel;
      const chatMessages = buildChatMessages(settings, messages);

      if (this.useProviderPool()) {
        const result = await this.providerPool.createChatCompletion({
          accountSlot: slot,
          friendId,
          messages: chatMessages,
          settings
        });
        reply = result.content;
        providerId = result.providerId;
        providerName = result.providerName;
        providerModel = result.providerModel;
      } else {
        reply = await this.aiClient.createChatCompletion({ messages: chatMessages });
      }

      // 匹配图片策略
      const imageStrategy = this.matchImageStrategy(messages, reply);

      // 如果需要发图，先发图再发文字
      const ctrl = this.tiktokPlatform.ensureController(slot);
      if (imageStrategy?.should_send) {
        const imagePath = IMAGE_MAP[imageStrategy.image_type];
        if (imagePath && fs.existsSync(imagePath)) {
          try {
            const imageBase64 = this.loadImageAsBase64(imagePath);
            await ctrl.callAutomation('sendDmImage', { imageBase64, caption: '' });
            this.log.info('sendImage', { slot, imageType: imageStrategy.image_type });
          } catch (error) {
            this.log.warn('sendImageFailed', error, { slot, imageType: imageStrategy.image_type });
          }
        }
      }

      // Send reply via bridge
      await ctrl.callAutomation('sendDmMessage', reply);

      // Save outgoing message
      await this.store.upsertIncomingMessages({
        accountSlot: slot,
        channelId: friendId,
        messages: [{
          id: `local-${Date.now()}`,
          authorId: '',
          authorName: `TK${slot}`,
          direction: 'outgoing',
          content: reply,
          messageAt: new Date().toISOString()
        }]
      });

      this.markReplySent(slot, friendId);

      // 翻译消息和回复为中文
      let translatedIncoming = '';
      let translatedReply = '';
      try {
        translatedIncoming = await this.translateToChinese(incomingMessage.content);
        translatedReply = await this.translateToChinese(reply);
      } catch (error) {
        this.log.warn('translateFailed', error);
      }

      const finished = await this.store.finishRecord(record.id, {
        aiReply: reply,
        translatedIncomingText: translatedIncoming,
        translatedAiReply: translatedReply,
        status: 'success',
        resultCode: 'reply_sent',
        resultLabel: '已回复',
        resultDetail: providerName ? `已回复（${providerName}）。` : '自动回复已发送。',
        providerId: providerId || '',
        providerName: providerName || '',
        providerModel: providerModel || ''
      });
      this.emitRecord(finished);
      this.emit('reply-success', { accountSlot: slot, friendId, aiReply: reply });
      return finished;
    } catch (error) {
      const errCode = classifyErrorCode(error);
      if (errCode === 'risk_captcha_response') {
        try { this.accountManager.flagCaptchaSlot(slot); } catch (_) { }
      }
      const message = error instanceof Error ? error.message : String(error);
      const finished = await this.store.finishRecord(record.id, {
        status: 'failed',
        resultCode: errCode,
        resultLabel: classifyErrorLabel(error),
        resultDetail: message,
        errorMessage: message
      });
      this.emitRecord(finished);
      throw error;
    }
  }

  canReplyForAccount(slot, settings) {
    const now = Date.now();
    const minMs = normalizePositiveInt(settings.autoReplyAccountDelayMinMs || 5000, 5000, 1000, 3600000);
    const maxMs = normalizePositiveInt(settings.autoReplyAccountDelayMaxMs || 5000, 5000, 1000, 3600000);
    const delay = minMs >= maxMs ? minMs : minMs + Math.floor(Math.random() * (maxMs - minMs + 1));

    if (now - (this.lastAccountReplyAt.get(slot) || 0) < delay) return false;

    const maxHourly = normalizePositiveInt(settings.autoReplyMaxHourly, 1000, 1, 1000);
    this.hourlyReplies = this.hourlyReplies.filter((ts) => now - ts < 3600000);
    return this.hourlyReplies.length < maxHourly;
  }

  canReplyForFriend(slot, friendId, settings) {
    const now = Date.now();
    const key = `${slot}:${friendId || ''}`;
    const minMs = normalizePositiveInt(settings.autoReplyFriendDelayMinMs || 10000, 1000, 86400000);
    const maxMs = normalizePositiveInt(settings.autoReplyFriendDelayMaxMs || 10000, 1000, 86400000);
    const delay = minMs >= maxMs ? minMs : minMs + Math.floor(Math.random() * (maxMs - minMs + 1));
    return now - (this.lastFriendReplyAt.get(key) || 0) >= delay;
  }

  markReplySent(slot, friendId) {
    const now = Date.now();
    this.lastAccountReplyAt.set(slot, now);
    this.lastFriendReplyAt.set(`${slot}:${friendId || ''}`, now);
    this.hourlyReplies.push(now);
  }

  pauseSlot(slot) {
    this.pausedSlots.set(Number(slot), Date.now());
  }

  resumeSlot(slot) {
    this.pausedSlots.delete(Number(slot));
  }

  getPausedSlots() {
    return [...this.pausedSlots.keys()];
  }

  emitRecord(record) {
    if (record) this.emit('record', record);
  }

  async recordFailure(payload) {
    const record = await this.store.createRecord({
      accountSlot: payload.accountSlot,
      channelId: payload.channelId || '',
      incomingMessageId: payload.incomingMessageId || `error-${Date.now()}`,
      friendId: payload.friendId || '',
      friendName: payload.friendName || '',
      incomingText: payload.incomingText || '',
      status: 'failed',
      resultCode: payload.resultCode || 'unknown_error',
      resultLabel: payload.resultLabel || '未知异常',
      resultDetail: payload.resultDetail || '',
      errorMessage: payload.errorMessage || '',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString()
    });
    this.emitRecord(record);
    return record;
  }

  listRecords(payload) {
    return this.store.listRecords(payload || {});
  }

  exportRecords() {
    return this.store.exportAllRecords();
  }

  stats() {
    const dbStats = this.store.stats();
    return { ...dbStats, pausedSlots: [...this.pausedSlots.keys()] };
  }

  /**
   * 匹配图片策略：根据对话上下文和 AI 回复内容，判断是否需要发图
   */
  matchImageStrategy(messages, aiReply) {
    const knowledge = loadKnowledge();
    if (!knowledge || knowledge.length === 0) return null;

    const recentMessages = messages.slice(-5).map((m) => m.content.toLowerCase());
    const replyLower = (aiReply || '').toLowerCase();

    for (const strategy of knowledge) {
      if (!strategy.image_context?.should_send) continue;

      const { image_type } = strategy.image_context;

      if (image_type === 'game_icon') {
        if (
          recentMessages.some((m) => /what.*game.*look|picture.*game|send.*picture|looks like this|he looks like/i.test(m)) ||
          /he looks like this|looks like this|game icon|可在.*store/i.test(replyLower)
        ) {
          return strategy.image_context;
        }
      }

      if (image_type === 'game_screenshot') {
        if (
          recentMessages.some((m) => /how.*find|show me|can u show|where.*id|how would i do/i.test(m)) ||
          /i'll show you|let me show|here's how|screenshot|角色|英雄|任务/i.test(replyLower)
        ) {
          return strategy.image_context;
        }
      }

      if (image_type === 'character_proof') {
        if (
          recentMessages.some((m) => /are you real|prove|you.*bot|just.*promotion/i.test(m)) ||
          /i'm real|my character|my game|i play too/i.test(replyLower)
        ) {
          return strategy.image_context;
        }
      }

      if (image_type === 'selfie') {
        if (
          recentMessages.some((m) => /send.*pic|send.*photo|your.*pic|your.*photo|what.*you.*look|show.*face|selfie|ur pic|pic of you|see you|how.*you look|send me.*photo|can i see/i.test(m)) ||
          /here's.*photo|this is me|that's me working out|here's a pic/i.test(replyLower)
        ) {
          return strategy.image_context;
        }
      }
    }

    return null;
  }

  loadImageAsBase64(imagePath) {
    const buffer = fs.readFileSync(imagePath);
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }

  async translateToChinese(text) {
    if (!text || typeof text !== 'string') return '';
    const trimmed = text.trim();
    if (!trimmed) return '';

    const chineseChars = (trimmed.match(/[一-鿿]/g) || []).length;
    if (chineseChars / trimmed.length > 0.5) {
      return trimmed;
    }

    try {
      const chatMessages = [
        { role: 'system', content: '你是一个专业的翻译助手。请将用户输入的文本翻译为简体中文。只输出翻译结果，不要添加任何解释或额外内容。' },
        { role: 'user', content: trimmed }
      ];

      if (this.useProviderPool()) {
        const result = await this.providerPool.createChatCompletion({
          accountSlot: 0,
          friendId: 'translation',
          messages: chatMessages
        });
        return result.content || trimmed;
      } else {
        return await this.aiClient.createChatCompletion({ messages: chatMessages });
      }
    } catch (error) {
      this.log.warn('translateToChinese', error);
      return trimmed;
    }
  }

  async testChat(message) {
    const settings = this.getSettings();
    if (this.useProviderPool()) {
      const providers = this.providerPool.getEnabledProviders(settings);
      if (providers.length === 0) throw new Error('AI 接口池中没有可用接口，请至少配置并启用一个接口。');
      const reply = await this.providerPool.testProvider(providers[0], settings);
      return { reply, providerName: providers[0].name, providerModel: providers[0].model };
    }
    const reply = await this.aiClient.createChatCompletion({
      messages: [
        { role: 'system', content: settings.autoReplySystemPrompt || DEFAULT_SYSTEM_PROMPT },
        { role: 'user', content: String(message || '你好') }
      ]
    });
    return { reply };
  }
}

// ── Helpers ──

function buildChatMessages(settings, messages) {
  const sorted = [...messages].sort((a, b) => {
    const aId = String(a.id || a.messageAt || '').replace(/\D/g, '') || '0';
    const bId = String(b.id || b.messageAt || '').replace(/\D/g, '') || '0';
    return aId.localeCompare(bId, undefined, { numeric: true });
  });
  const context = sorted.slice(-normalizePositiveInt(settings.autoReplyContextMessages, 15, 1, 20));
  const systemPrompt = buildSystemPromptWithKnowledge(settings.autoReplySystemPrompt || DEFAULT_SYSTEM_PROMPT);
  return [
    { role: 'system', content: systemPrompt },
    ...context.map((message) => ({
      role: message.direction === 'outgoing' ? 'assistant' : 'user',
      content: message.content
    }))
  ];
}

let _knowledgeCache = null;
let _knowledgeMtime = 0;

function loadKnowledge() {
  const knowledgePath = path.resolve(__dirname, '..', '..', 'knowledge.json');
  try {
    const stat = fs.statSync(knowledgePath);
    if (_knowledgeCache && stat.mtimeMs === _knowledgeMtime) {
      return _knowledgeCache;
    }
    const raw = fs.readFileSync(knowledgePath, 'utf-8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data) || data.length === 0) return null;
    _knowledgeCache = data;
    _knowledgeMtime = stat.mtimeMs;
    return data;
  } catch {
    return null;
  }
}

function buildSystemPromptWithKnowledge(basePrompt) {
  const knowledge = loadKnowledge();
  if (!knowledge) return basePrompt;
  const lines = knowledge.map((item, i) => {
    return `${i + 1}. [${item.scenario}]: ${item.strategy}`;
  });
  return `${basePrompt}\n\n---\n以下是历史对话总结的经验策略，请根据当前场景灵活参考，不要照搬：\n${lines.join('\n')}`;
}

function buildContextPreview(messages) {
  return [...messages]
    .sort((a, b) => {
      const aId = String(a.id || a.messageAt || '').replace(/\D/g, '') || '0';
      const bId = String(b.id || b.messageAt || '').replace(/\D/g, '') || '0';
      return aId.localeCompare(bId, undefined, { numeric: true });
    })
    .slice(-6)
    .map((message) => `${message.direction === 'outgoing' ? '我' : message.authorName || '好友'}：${message.content}`)
    .join('\n')
    .slice(0, 1200);
}

function findLatestIncoming(messages) {
  return [...messages]
    .filter((message) => message.direction === 'incoming' && message.content)
    .sort((a, b) => {
      const aId = String(a.id || a.messageAt || '').replace(/\D/g, '') || '0';
      const bId = String(b.id || b.messageAt || '').replace(/\D/g, '') || '0';
      return bId.localeCompare(aId, undefined, { numeric: true });
    })[0] || null;
}

function classifyErrorCode(error) {
  const message = String(error?.message || error || '');
  if (error && typeof error === 'object' && error.code === 'risk_captcha_response') return 'risk_captcha_response';
  if (/超时|timeout/i.test(message)) return 'ai_timeout';
  if (/AI 接口|baseURL|apiKey|model/i.test(message)) return 'ai_api_failed';
  if (/会话已失效|登录会话|unauthorized|401/i.test(message)) return 'session_unauthorized';
  if (/频率限制|429|rate/i.test(message)) return 'rate_limited';
  if (/人机验证|captcha/i.test(message)) return 'risk_captcha_response';
  if (/发送私聊回复失败|发送失败/i.test(message)) return 'send_failed';
  if (/会话不存在|断开|离线/i.test(message)) return 'account_offline';
  return 'unknown_error';
}

function classifyErrorLabel(error) {
  const code = classifyErrorCode(error);
  const labels = {
    ai_timeout: 'AI 超时',
    ai_api_failed: 'AI 接口失败',
    session_unauthorized: '会话失效',
    rate_limited: '频率限制',
    risk_captcha_response: '人机验证',
    send_failed: '发送失败',
    account_offline: '账号离线',
    unknown_error: '未知异常'
  };
  return labels[code] || '未知异常';
}

function normalizePositiveInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { AutoReplyManager, DEFAULT_SYSTEM_PROMPT };
