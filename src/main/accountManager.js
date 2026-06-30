const EventEmitter = require('events');
const { createCipheriv, createDecipheriv, createHash, randomBytes } = require('crypto');

const APP_CIPHER_KEY = createHash('sha256')
  .update('tiktok-account-manager-portable-v1')
  .digest();

class AccountManager extends EventEmitter {
  constructor(store) {
    super();
    this._store = store;
    this._platform = null;
    this._accounts = new Map();
    this._sessions = new Map();
    this._loginJobs = new Map();
    this._generations = new Map();
    this._batchCancelled = false;
    this._batchAbortController = null;
    this._loginQueue = [];
    this._activeLogins = 0;
    this._maxLoginConcurrency = 3;
    this._loadFromStore();
  }

  setPlatform(platform) {
    this._platform = platform;
  }

  setCooldownStrategy(strategy) {
    this._cooldown = strategy;
  }

  setWarmupMinutes(minutes) {
    this._warmupMinutes = Math.max(0, Math.min(Number(minutes) || 0, 60));
  }

  setLoginBatchSize(size) {
    this._loginBatchSize = Math.max(1, Math.min(Number(size) || 3, 10));
  }

  flagCaptchaSlot(slot) {
    if (this._cooldown) this._cooldown.onCaptcha(slot);
  }

  flagSpamSlot(slot) {
    if (this._cooldown) this._cooldown.onSpam(slot);
  }

  markAuthFailure(slot, reason) {
    const account = this._accounts.get(slot);
    if (!account) return;
    account.loginState = 'offline';
    account.status = 'offline';
    account.loginHint = reason || '会话已失效';
    account.sessionCookies = null;
    this._sessions.delete(slot);
    this._persist();
    this._emitState();
  }

  // ── Persistence ──

  _loadFromStore() {
    const raw = this._store.get('accounts') || [];
    this._accounts.clear();
    for (const entry of raw) {
      const account = AccountManager._normalize(entry);
      if (account.loginState === 'logging_in') {
        account.loginState = 'offline';
        account.status = 'offline';
        account.loginHint = '';
        account.lastLoginError = null;
      }
      this._accounts.set(entry.slot, account);
    }
    this._persist();
  }

  _persist() {
    const arr = Array.from(this._accounts.values()).map((a) => toStoredAccount(a));
    this._store.set('accounts', arr);
  }

  static _normalize(entry) {
    const tiktokPassword = decryptSecret(entry.encryptedPassword)
      || entry.tiktokPassword
      || '';
    const outlookPassword = decryptSecret(entry.encryptedOutlookPassword)
      || entry.outlookPassword
      || '';
    const totpSecret = decryptSecret(entry.encryptedTotpSecret)
      || entry.totpSecret
      || '';

    return {
      slot: entry.slot || 0,
      tiktokUsername: entry.tiktokUsername || '',
      tiktokPassword,
      outlookEmail: entry.outlookEmail || '',
      outlookPassword,
      totpSecret,
      // 加密存储字段
      encryptedPassword: entry.encryptedPassword || encryptSecret(tiktokPassword),
      encryptedOutlookPassword: entry.encryptedOutlookPassword || encryptSecret(outlookPassword),
      encryptedTotpSecret: entry.encryptedTotpSecret || encryptSecret(totpSecret),
      // 状态
      status: entry.status || 'empty',
      loginState: entry.loginState || 'empty',
      sessionCookies: entry.sessionCookies || null,
      sessionId: entry.sessionId || null,
      lastLoginAt: entry.lastLoginAt || null,
      lastLoginError: entry.lastLoginError || null,
      loginHint: entry.loginHint || '',
      lastAuthCheckAt: entry.lastAuthCheckAt || null,
      profile: entry.profile || null,
      tiktokWindowAttached: entry.tiktokWindowAttached || false,
      windowVisible: entry.windowVisible || false,
      isEmpty: !entry.tiktokUsername,
      createdAt: entry.createdAt || new Date().toISOString(),
      updatedAt: entry.updatedAt || new Date().toISOString()
    };
  }

  // ── CRUD ──

  listAccounts() {
    return Array.from(this._accounts.values()).map((a) => {
      return {
        ...a,
        tiktokWindowAttached: this.hasLiveSession(a.slot),
        windowVisible: this.isSessionVisible(a.slot)
      };
    });
  }

  listPublicAccounts() {
    return this.listAccounts().map((account) => toPublicAccount(account));
  }

  toPublicAccount(account) {
    return account ? toPublicAccount(account) : account;
  }

  saveAccount(payload) {
    const slot = payload.slot;
    const existing = this._accounts.get(slot) || { slot };

    // 加密新密码
    const encryptedPassword = payload.tiktokPassword
      ? encryptSecret(payload.tiktokPassword)
      : existing.encryptedPassword;
    const encryptedOutlookPassword = payload.outlookPassword
      ? encryptSecret(payload.outlookPassword)
      : existing.encryptedOutlookPassword;
    const encryptedTotpSecret = payload.totpSecret
      ? encryptSecret(payload.totpSecret)
      : existing.encryptedTotpSecret;

    const merged = AccountManager._normalize({
      ...existing,
      ...payload,
      slot,
      encryptedPassword,
      encryptedOutlookPassword,
      encryptedTotpSecret,
      isEmpty: !(payload.tiktokUsername || existing.tiktokUsername),
      updatedAt: new Date().toISOString()
    });
    this._accounts.set(slot, merged);
    this._persist();
    this._emitState();
    return merged;
  }

  removeAccount(slot) {
    this._accounts.delete(slot);
    this._sessions.delete(slot);
    this._generations.delete(slot);
    this._persist();
    this._emitState();
  }

  clearAllAccounts() {
    const slots = Array.from(this._accounts.keys());
    for (const slot of slots) {
      this._platform?.removeController(slot);
      this._sessions.delete(slot);
    }
    this._accounts.clear();
    this._persist();
    this._emitState();
  }

  // ── Import / Export ──

  importAccounts(text) {
    const lines = text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);

    const entries = [];
    for (const line of lines) {
      const parsed = this._parseAccountLine(line);
      if (parsed) entries.push(parsed);
    }

    if (entries.length === 0) {
      return { saved: [], skipped: [], errors: [{ error: '没有解析到有效的账号数据' }] };
    }

    const result = { saved: [], skipped: [], errors: [] };
    const MAX_SLOTS = 100;

    for (const entry of entries) {
      let emptySlot = null;
      for (let s = 1; s <= MAX_SLOTS; s++) {
        if (!this._accounts.has(s) || this._accounts.get(s).isEmpty) {
          emptySlot = s;
          break;
        }
      }
      if (!emptySlot) {
        result.skipped.push({ ...entry, reason: '所有槽位已满' });
        break;
      }

      try {
        const saved = this.saveAccount({ slot: emptySlot, ...entry });
        result.saved.push({ slot: emptySlot, tiktokUsername: entry.tiktokUsername });
      } catch (err) {
        result.errors.push({ slot: emptySlot, error: err.message });
      }
    }

    return result;
  }

  exportAccounts() {
    const accounts = Array.from(this._accounts.values())
      .filter(a => !a.isEmpty)
      .sort((a, b) => a.slot - b.slot);

    return accounts.map(a => {
      const parts = [
        a.tiktokUsername,
        a.tiktokPassword,
        a.outlookEmail,
        a.outlookPassword,
        a.totpSecret
      ];
      return parts.join('----');
    }).join('\n');
  }

  _parseAccountLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return null;

    const dashParts = trimmed.split(/-{4,}/).map(p => p.trim()).filter(Boolean);
    if (dashParts.length >= 2) {
      return this._buildAccountEntry(dashParts);
    }

    for (const delim of ['|', '\t', ';']) {
      if (trimmed.includes(delim)) {
        const parts = trimmed.split(delim).map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2) return this._buildAccountEntry(parts);
      }
    }

    if (trimmed.includes(' ') && trimmed.includes('@')) {
      const parts = trimmed.split(/\s+/).map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) return this._buildAccountEntry(parts);
    }

    return null;
  }

  _buildAccountEntry(parts) {
    return {
      tiktokUsername: parts[0] || '',
      tiktokPassword: parts[1] || '',
      outlookEmail: parts[2] || '',
      outlookPassword: parts[3] || '',
      totpSecret: parts[4] || ''
    };
  }

  // ── Login ──

  async loginAccount(slot) {
    const account = this._accounts.get(slot);
    if (!account || account.isEmpty) {
      throw new Error(`槽位 ${slot} 没有配置账号`);
    }

    if (!this._platform) {
      throw new Error('登录平台未初始化');
    }

    // 已有活跃登录任务则直接返回
    const existingJob = this._loginJobs.get(slot);
    if (existingJob) {
      this._platform.showWindow(slot);
      return account;
    }

    // 队列控制：超过并发上限则排队
    if (this._activeLogins >= this._maxLoginConcurrency) {
      return this._enqueueLogin(slot);
    }

    return this._executeLogin(slot, account);
  }

  _enqueueLogin(slot) {
    const account = this._accounts.get(slot);
    account.loginState = 'logging_in';
    account.loginHint = '登录任务排队中…';
    account.updatedAt = new Date().toISOString();
    this._persist();
    this._emitState();

    return new Promise((resolve, reject) => {
      this._loginQueue.push({ slot, resolve, reject });
    });
  }

  _pumpLoginQueue() {
    while (this._activeLogins < this._maxLoginConcurrency && this._loginQueue.length > 0) {
      const task = this._loginQueue.shift();
      this._executeLogin(task.slot, this._accounts.get(task.slot))
        .then(task.resolve)
        .catch(task.reject);
    }
  }

  async _executeLogin(slot, account) {
    this._activeLogins++;
    const generation = this._bumpGeneration(slot);

    account.loginState = 'logging_in';
    account.status = 'logging_in';
    account.lastLoginError = null;
    account.loginHint = '正在打开登录窗口…';
    account.updatedAt = new Date().toISOString();
    this._persist();
    this._emitState();

    const loginPromise = this._platform.login(slot, {
      tiktokUsername: account.tiktokUsername,
      tiktokPassword: account.tiktokPassword,
      outlookEmail: account.outlookEmail,
      outlookPassword: account.outlookPassword,
      totpSecret: account.totpSecret
    }).then((result) => {
      if (!this._isCurrentGeneration(slot, generation)) return account;

      if (result.success) {
        account.loginState = 'online';
        account.status = 'online';
        account.sessionCookies = result.cookies;
        account.sessionId = result.sessionId || `tiktok-${slot}-${Date.now()}`;
        account.lastLoginAt = new Date().toISOString();
        account.lastLoginError = null;
        account.loginHint = '';

        this._sessions.set(slot, {
          sessionId: account.sessionId,
          cookies: result.cookies
        });

        this._platform.hideWindow(slot);

        // Fire-and-forget warmup browsing after login
        const warmupMinutes = this._warmupMinutes ?? 10;
        if (warmupMinutes > 0) {
          this._platform.warmupSlot(slot, warmupMinutes).catch((e) => {
            // warmup is best-effort, non-blocking
          });
        }
      } else {
        account.loginState = 'error';
        account.status = 'offline';
        account.lastLoginError = result.error || '登录失败';
        account.loginHint = result.error || '';
      }
      return account;
    }).catch((err) => {
      if (!this._isCurrentGeneration(slot, generation)) return account;
      account.loginState = 'error';
      account.status = 'offline';
      account.lastLoginError = err.message;
      account.loginHint = err.message;
      return account;
    }).finally(() => {
      account.updatedAt = new Date().toISOString();
      this._loginJobs.delete(slot);
      this._persist();
      this._emitState();
      this._activeLogins = Math.max(0, this._activeLogins - 1);
      this._pumpLoginQueue();
    });

    this._loginJobs.set(slot, { generation, promise: loginPromise });
    return loginPromise;
  }

  // ── Session Restore（Cookie 恢复，跳过重登） ──

  async restoreSession(slot) {
    const account = this._accounts.get(slot);
    if (!account || account.isEmpty) return account;

    if (!this._platform) return account;

    if (!account.sessionCookies) {
      account.loginState = 'offline';
      account.status = 'offline';
      account.loginHint = '没有已保存的会话，需要重新登录';
      account.updatedAt = new Date().toISOString();
      this._persist();
      this._emitState();
      return account;
    }

    account.loginState = 'logging_in';
    account.loginHint = '正在恢复会话…';
    account.updatedAt = new Date().toISOString();
    this._persist();
    this._emitState();

    try {
      const result = await this._platform.restoreSession(slot, account.sessionCookies);
      if (result.success) {
        account.loginState = 'online';
        account.status = 'online';
        account.sessionCookies = result.cookies || account.sessionCookies;
        account.sessionId = account.sessionId || `tiktok-${slot}-${Date.now()}`;
        account.lastLoginError = null;
        account.loginHint = '';
        account.lastAuthCheckAt = new Date().toISOString();

        this._sessions.set(slot, {
          sessionId: account.sessionId,
          cookies: account.sessionCookies
        });
      } else {
        account.loginState = 'offline';
        account.status = 'offline';
        account.loginHint = result.error || '会话已过期，需要重新登录';
        account.sessionCookies = null;
      }
    } catch (err) {
      account.loginState = 'offline';
      account.status = 'offline';
      account.loginHint = `会话恢复失败: ${err.message}`;
      account.sessionCookies = null;
    }

    account.updatedAt = new Date().toISOString();
    this._persist();
    this._emitState();
    return account;
  }

  /**
   * 批量恢复所有已保存会话的账号
   */
  async restoreAllSessions() {
    const entries = Array.from(this._accounts.entries())
      .filter(([, a]) => !a.isEmpty && a.sessionCookies);

    if (entries.length === 0) return [];

    this._batchCancelled = false;
    this._batchAbortController = new AbortController();
    const signal = this._batchAbortController.signal;
    const results = [];

    for (const [slot] of entries) {
      if (signal.aborted) break;
      try {
        results.push(await this.restoreSession(slot));
      } catch (_) {
        results.push(null);
      }
    }

    this._batchAbortController = null;
    return results;
  }

  // ── Batch Login（全量登录，支持并发和取消）──

  async loginAll() {
    const accounts = Array.from(this._accounts.values())
      .filter(a => !a.isEmpty && a.loginState !== 'online');

    if (accounts.length === 0) {
      return { processed: [], message: '所有已配置账号均已在线' };
    }

    this._batchCancelled = false;
    this._batchAbortController = new AbortController();
    const signal = this._batchAbortController.signal;
    const results = [];
    const BATCH_SIZE = this._loginBatchSize || 3;
    let index = 0;

    const drain = async () => {
      while (index < accounts.length) {
        if (signal.aborted) break;
        const account = accounts[index++];
        if (index > 1) {
          // stagger logins within the batch
          await sleep(5000);
          if (signal.aborted) break;
        }
        try {
          const result = await this.loginAccount(account.slot);
          results.push({ slot: account.slot, ok: result.loginState === 'online', error: result.lastLoginError });
        } catch (err) {
          results.push({ slot: account.slot, ok: false, error: err.message });
        }
      }
    };

    // Run concurrency-limited batches
    const workers = Array.from({ length: Math.min(BATCH_SIZE, accounts.length) }, () => drain());
    await Promise.all(workers);

    this._batchAbortController = null;

    if (signal.aborted) {
      return {
        processed: results,
        online: results.filter(r => r.ok).length,
        failed: results.filter(r => !r.ok).length,
        cancelled: true
      };
    }

    return {
      processed: results,
      online: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok).length
    };
  }

  // ── Logout ──

  logout(slot) {
    const account = this._accounts.get(slot);
    if (!account) return null;

    this._bumpGeneration(slot);
    this._loginJobs.delete(slot);
    this._sessions.delete(slot);

    try {
      this._platform?.removeController(slot);
    } catch (_) {}

    account.loginState = 'offline';
    account.status = 'offline';
    account.sessionCookies = null;
    account.sessionId = null;
    account.tiktokWindowAttached = false;
    account.windowVisible = false;
    account.lastAuthCheckAt = new Date().toISOString();
    account.updatedAt = new Date().toISOString();
    this._persist();
    this._emitState();
    return account;
  }

  logoutAll() {
    const results = [];
    for (const [slot] of this._accounts) {
      const result = this.logout(slot);
      if (result) results.push(result);
    }
    return results;
  }

  // ── Refresh ──

  async refreshAccount(slot) {
    const account = this._accounts.get(slot);
    if (!account) throw new Error('账号不存在');

    const now = new Date().toISOString();

    if (account.loginState === 'online' && this._sessions.has(slot)) {
      const valid = await this._platform?.checkSession(slot);
      if (valid) {
        account.lastAuthCheckAt = now;
        account.updatedAt = now;
        this._emitState();
        return account;
      }
      // 会话已失效
      account.loginState = 'offline';
      account.status = 'offline';
      account.loginHint = '会话已失效，需要重新登录';
      account.lastAuthCheckAt = now;
      account.updatedAt = now;
      this._sessions.delete(slot);
      this._persist();
      this._emitState();
      return account;
    }

    this._emitState();
    return account;
  }

  // ── Session helpers ──

  hasLiveSession(slot) {
    const session = this._sessions.get(slot);
    if (!session) return false;
    return this._platform?.getController(slot) && !this._platform.getController(slot).isDestroyed();
  }

  isSessionVisible(slot) {
    if (!this.hasLiveSession(slot)) return false;
    return this._platform?.getController(slot)?.isVisible() || false;
  }

  getOnlineAccounts() {
    return Array.from(this._accounts.values())
      .filter(a => a.loginState === 'online' && this.hasLiveSession(a.slot))
      .sort((a, b) => a.slot - b.slot);
  }

  // ── Generation tracking ──

  _bumpGeneration(slot) {
    const next = (this._generations.get(slot) || 0) + 1;
    this._generations.set(slot, next);
    return next;
  }

  _isCurrentGeneration(slot, generation) {
    return this._generations.get(slot) === generation;
  }

  // ── Batch control ──

  cancelBatchOperation() {
    this._batchCancelled = true;
    if (this._batchAbortController) {
      this._batchAbortController.abort();
    }
  }

  isBatchCancelled() {
    return this._batchCancelled;
  }

  // ── State emission ──

  _emitState() {
    this.emit('accounts-state', this.listPublicAccounts());
  }

  emitAccountsState() {
    this._emitState();
  }

  // ── Cleanup ──

  deduplicateAccounts() {
    const seen = new Map(); // key: normalized username, value: slot
    const duplicates = [];
    const accounts = Array.from(this._accounts.entries())
      .filter(([, a]) => !a.isEmpty)
      .sort(([a], [b]) => a - b); // lowest slot first = kept

    for (const [slot, account] of accounts) {
      const key = (account.tiktokUsername || '').trim().toLowerCase();
      if (!key) continue;
      if (seen.has(key)) {
        duplicates.push({ slot, tiktokUsername: account.tiktokUsername, keptSlot: seen.get(key) });
      } else {
        seen.set(key, slot);
      }
    }

    // Remove duplicates
    for (const dup of duplicates) {
      this.removeAccount(dup.slot);
    }

    return { removed: duplicates, kept: seen.size };
  }

  async closeAll() {
    for (const [slot] of this._sessions) {
      try {
        this._platform?.removeController(slot);
      } catch (_) {}
    }
    this._sessions.clear();
    this._loginJobs.clear();
  }
}

// ── Helpers ──

function toStoredAccount(account) {
  // 持久化时不存明文密码
  const { tiktokPassword, outlookPassword, totpSecret, ...rest } = account;
  return {
    ...rest,
    status: account.loginState === 'online' ? 'online' : 'offline'
  };
}

function toPublicAccount(account) {
  const {
    tiktokPassword,
    outlookPassword,
    totpSecret,
    encryptedPassword,
    encryptedOutlookPassword,
    encryptedTotpSecret,
    sessionCookies,
    ...safeAccount
  } = account;

  return {
    ...safeAccount,
    hasPassword: Boolean(tiktokPassword || encryptedPassword),
    hasOutlookPassword: Boolean(outlookPassword || encryptedOutlookPassword),
    hasTotpSecret: Boolean(totpSecret || encryptedTotpSecret),
    hasSession: Boolean(sessionCookies),
    sessionId: account.sessionId || null
  };
}

function encryptSecret(value) {
  if (!value) return null;
  try {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-ctr', APP_CIPHER_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return `aes:${iv.toString('hex')}:${encrypted.toString('base64')}`;
  } catch (_) {
    return `plain:${Buffer.from(value, 'utf8').toString('base64')}`;
  }
}

function decryptSecret(value) {
  if (!value) return '';
  try {
    if (value.startsWith('aes:')) {
      const rest = value.slice(4);
      const sepIdx = rest.indexOf(':');
      if (sepIdx === -1) return '';
      const iv = Buffer.from(rest.slice(0, sepIdx), 'hex');
      const encrypted = Buffer.from(rest.slice(sepIdx + 1), 'base64');
      const decipher = createDecipheriv('aes-256-ctr', APP_CIPHER_KEY, iv);
      return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    }
    if (value.startsWith('plain:')) {
      return Buffer.from(value.slice(6), 'base64').toString('utf8');
    }
  } catch (_) {
    return '';
  }
  return value;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = AccountManager;
