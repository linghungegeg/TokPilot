const { EventEmitter } = require('events');
const https = require('https');
const WebSocket = require('ws');

const LARK_BASE = 'open.feishu.cn';

class LarkBot extends EventEmitter {
  constructor({ getSettings, commandHandler, logger }) {
    super();
    this.getSettings = getSettings;
    this.commandHandler = commandHandler;
    this.log = logger || { call: () => {}, ok: () => {}, fail: () => {}, warn: () => {}, info: () => {} };
    this.ws = null;
    this.token = null;
    this.tokenExpiresAt = 0;
    this.reconnectTimer = null;
    this.pingTimer = null;
    this.running = false;
  }

  start() {
    const settings = this.getSettings();
    if (!settings.larkBotEnabled) return;
    if (!settings.larkAppId || !settings.larkAppSecret) {
      this.log.warn('larkBot', '缺少 appId 或 appSecret，无法启动');
      return;
    }
    this.running = true;
    this.connect();
  }

  stop() {
    this.running = false;
    clearTimeout(this.reconnectTimer);
    clearInterval(this.pingTimer);
    if (this.ws) {
      this.ws.close(1000);
      this.ws = null;
    }
  }

  async connect() {
    if (!this.running) return;
    try {
      await this.ensureToken();
      const wsUrl = await this.getWsEndpoint();
      this.openSocket(wsUrl);
    } catch (err) {
      this.log.fail('larkBot', `连接失败: ${err.message}`);
      this.emit('lark-bot-error', { error: err.message });
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (!this.running) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), 10000);
  }

  async ensureToken() {
    if (this.token && Date.now() < this.tokenExpiresAt - 60000) return;
    const settings = this.getSettings();
    const body = JSON.stringify({ app_id: settings.larkAppId, app_secret: settings.larkAppSecret });
    const res = await this.request('POST', '/open-apis/auth/v3/tenant_access_token/internal', body);
    if (res.code !== 0) throw new Error(res.msg || 'token 获取失败');
    this.token = res.tenant_access_token;
    this.tokenExpiresAt = Date.now() + (res.expire - 300) * 1000;
  }

  async getWsEndpoint() {
    const res = await this.request('POST', '/open-apis/callback/ws/endpoint', '{}', true);
    if (res.code !== 0) throw new Error(res.msg || 'ws endpoint 获取失败');
    const ep = res.data?.endpoint;
    if (!ep?.url) throw new Error('ws endpoint 无 URL');
    return ep.url;
  }

  openSocket(url) {
    if (this.ws) { this.ws.close(); this.ws = null; }
    clearInterval(this.pingTimer);
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on('open', () => {
      this.log.ok('larkBot', '长连接已建立');
      this.emit('lark-bot-connected');
      this.pingTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.ping();
      }, 30000);
    });

    ws.on('message', (raw) => {
      try { this.handleMessage(JSON.parse(raw.toString())); }
      catch (e) { this.log.warn('larkBot', `消息解析失败: ${e.message}`); }
    });

    ws.on('close', (code) => {
      this.log.warn('larkBot', `连接关闭 code=${code}`);
      clearInterval(this.pingTimer);
      this.ws = null;
      this.scheduleReconnect();
    });

    ws.on('error', (err) => {
      this.log.fail('larkBot', `ws error: ${err.message}`);
    });
  }

  handleMessage(msg) {
    const header = msg.header;
    if (!header) return;
    if (header.event_type === 'im.message.receive_v1') {
      this.handleImMessage(msg.event);
    }
  }

  async handleImMessage(event) {
    if (!event?.message) return;
    const msgType = event.message.message_type;
    if (msgType !== 'text') return;
    let text = '';
    try { text = JSON.parse(event.message.content).text || ''; }
    catch { return; }
    text = text.trim();
    if (!text.startsWith('/')) return;

    const messageId = event.message.message_id;
    const result = await this.executeCommand(text);
    await this.replyText(messageId, result);
  }

  async executeCommand(text) {
    const parts = text.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    try {
      return await this.commandHandler(cmd, args);
    } catch (err) {
      return `执行失败: ${err.message}`;
    }
  }

  async replyText(messageId, text) {
    try {
      await this.ensureToken();
      const body = JSON.stringify({ msg_type: 'text', content: JSON.stringify({ text }) });
      await this.request('POST', `/open-apis/im/v1/messages/${messageId}/reply`, body, true);
    } catch (err) {
      this.log.fail('larkBot', `回复失败: ${err.message}`);
    }
  }

  request(method, path, body, auth = false) {
    return new Promise((resolve, reject) => {
      const headers = { 'Content-Type': 'application/json; charset=utf-8' };
      if (auth && this.token) headers['Authorization'] = `Bearer ${this.token}`;
      const req = https.request({ hostname: LARK_BASE, path, method, headers }, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
          catch { reject(new Error('响应解析失败')); }
        });
      });
      req.on('error', reject);
      req.setTimeout(15000, () => { req.destroy(); reject(new Error('请求超时')); });
      if (body) req.write(body);
      req.end();
    });
  }

  getStatus() {
    return {
      connected: this.ws?.readyState === WebSocket.OPEN,
      running: this.running,
      hasToken: Boolean(this.token)
    };
  }

  async sendNotification(level, text) {
    const settings = this.getSettings();
    if (!settings.larkBotEnabled || !settings.larkNotifyEnabled) return;
    if (!this.shouldNotify(settings.larkNotifyLevel, level)) return;
    const chatId = settings.larkNotifyChatId;
    if (!chatId) return;
    try {
      await this.ensureToken();
      const atUser = settings.larkNotifyAtUser || '';
      const content = atUser ? `${text}\n<at user_id="${atUser}"></at>` : text;
      const body = JSON.stringify({
        receive_id: chatId,
        msg_type: 'text',
        content: JSON.stringify({ text: content })
      });
      await this.request('POST', '/open-apis/im/v1/messages?receive_id_type=chat_id', body, true);
    } catch (err) {
      this.log.fail('larkBot', `通知发送失败: ${err.message}`);
    }
  }

  shouldNotify(configLevel, eventLevel) {
    if (configLevel === 'all') return true;
    if (configLevel === 'critical') return eventLevel === 'critical';
    if (configLevel === 'abnormal') return eventLevel === 'abnormal' || eventLevel === 'critical';
    return true;
  }
}

module.exports = LarkBot;
