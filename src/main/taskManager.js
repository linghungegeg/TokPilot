const { EventEmitter } = require('events');
const { randomUUID } = require('crypto');

class TaskManager extends EventEmitter {
  constructor({ store, accountManager, tiktokPlatform, logger }) {
    super();
    this.store = store;
    this.accountManager = accountManager;
    this.platform = tiktokPlatform;
    this.log = logger || { info: () => {}, warn: () => {}, error: () => {} };

    this.pauseRequested = false;
    this.stopRequested = false;
    this._runPromise = null;
    this._saveTimer = null;

    this._maxPerHour = 10;
    this._perSlotTimestamps = new Map();

    this.state = this._normalizeState(this.store.get('taskState'));
    this.store.set('taskState', this.state);
  }

  // ═══════════════════════════════════════════
  //  Public API
  // ═══════════════════════════════════════════

  getState() {
    return {
      status: this.state.status,
      runId: this.state.runId,
      mode: this.state.mode,
      currentSlot: this.state.currentSlot,
      currentTarget: this.state.currentTarget,
      delayMs: this.state.delayMs,
      progress: { ...this.state.progress },
      counts: { ...this.state.counts },
      lastOutcome: this.state.lastOutcome,
      lastError: this.state.lastError
    };
  }

  canMutateData() {
    return this.state.status !== 'running' && this.state.status !== 'stopping';
  }

  start(config = {}) {
    if (this.state.status === 'running' || this.state.status === 'stopping') {
      throw new Error('任务已在运行中。');
    }
    if (this.state.status === 'paused') {
      throw new Error('任务处于暂停状态，请先继续或停止后再重新开始。');
    }

    const online = this.accountManager.getOnlineAccounts();
    if (online.length === 0) {
      throw new Error('至少需要一个在线账号才能执行任务。');
    }

    const mode = config.mode || 'dm';
    if (!['dm', 'follow'].includes(mode)) {
      throw new Error('不支持的任务模式: ' + mode);
    }

    if (config.maxPerHour != null) {
      const n = Number.parseInt(config.maxPerHour, 10);
      if (!Number.isNaN(n) && n > 0) this._maxPerHour = n;
    }

    const targets = this._buildTargets(config);
    if (targets.length === 0) {
      throw new Error('没有可执行的任务目标。请提供关键词或目标用户列表。');
    }

    this.pauseRequested = false;
    this.stopRequested = false;
    this._perSlotTimestamps.clear();

    this.state = {
      status: 'running',
      runId: randomUUID(),
      mode,
      currentSlot: null,
      currentTarget: null,
      delayMs: normalizeDelay(config.delayMs),
      messageTemplate: config.messageTemplate || '',
      progress: { completed: 0, total: targets.length },
      counts: { success: 0, failed: 0, skipped: 0, pending: targets.length },
      targets,
      cursor: 0,
      lastOutcome: null,
      lastError: null
    };

    this._saveState();
    this._emitState();
    this._runLoop().catch((err) => this._failRun(err));

    return this.getState();
  }

  pause() {
    if (this.state.status !== 'running') {
      throw new Error('当前没有可暂停的任务。');
    }
    this.pauseRequested = true;
    return this.getState();
  }

  resume() {
    if (this.state.status !== 'paused') {
      throw new Error('当前没有可继续的暂停任务。');
    }
    if (this.state.cursor >= this.state.targets.length) {
      this._finishAsIdle('completed');
      return this.getState();
    }

    this.pauseRequested = false;
    this.stopRequested = false;
    this.state.status = 'running';
    this.state.lastError = null;
    this._recalculateProgress();
    this._saveState();
    this._emitState();
    this._runLoop().catch((err) => this._failRun(err));

    return this.getState();
  }

  stop() {
    if (this.state.status === 'idle') return this.getState();
    if (this.state.status === 'paused') {
      this._finishAsIdle('stopped');
      return this.getState();
    }
    this.stopRequested = true;
    this.state.status = 'stopping';
    this._saveState();
    this._emitState();
    return this.getState();
  }

  // ═══════════════════════════════════════════
  //  Target Queue
  // ═══════════════════════════════════════════

  _buildTargets(config) {
    if (Array.isArray(config.targetUsers) && config.targetUsers.length > 0) {
      return config.targetUsers.map((u) => {
        if (typeof u === 'string') return { type: 'dm', username: u };
        return { type: 'dm', username: u.username, url: u.url || null };
      });
    }
    if (typeof config.keyword === 'string' && config.keyword.trim()) {
      return [{ type: 'search_dm', keyword: config.keyword.trim(), maxResults: config.maxResults || 20 }];
    }
    if (Array.isArray(config.keywords) && config.keywords.length > 0) {
      return config.keywords.map((k) => {
        if (typeof k === 'string') return { type: 'search_dm', keyword: k, maxResults: config.maxResults || 20 };
        return { type: 'search_dm', keyword: k.keyword, maxResults: k.maxResults || config.maxResults || 20 };
      });
    }
    return [];
  }

  // ═══════════════════════════════════════════
  //  Main Loop
  // ═══════════════════════════════════════════

  async _runLoop() {
    if (this._runPromise) return this._runPromise;

    this._runPromise = this._processLoop()
      .finally(() => { this._runPromise = null; });

    return this._runPromise;
  }

  async _processLoop() {
    while (this.state.cursor < this.state.targets.length) {
      if (this.stopRequested) { this._finishAsIdle('stopped'); return; }

      const target = this.state.targets[this.state.cursor];
      const slot = this._pickSlot();
      if (!slot) {
        this._finishAsIdle('completed');
        return;
      }

      // Rate check
      const rateCheck = this._checkSlotRate(slot);
      if (rateCheck.blocked) {
        // Try next slot instead of failing
        const nextSlot = this._pickAlternativeSlot(slot);
        if (!nextSlot) {
          this.state.counts.skipped += 1;
          this.state.cursor += 1;
          this._recalculateProgress();
          this._saveState();
          continue;
        }
        // Use alternative slot
        await this._executeTarget(target, nextSlot);
      } else {
        await this._executeTarget(target, slot);
      }

      this.state.cursor += 1;
      this._recalculateProgress();
      this._emitState();

      if (await this._handleAfterItem()) return;
    }

    this._finishAsIdle('completed');
  }

  async _executeTarget(target, slot) {
    this.state.currentSlot = slot;
    this.state.currentTarget = target.username || target.keyword || `#${this.state.cursor + 1}`;
    this._saveState();
    this._emitState();

    try {
      if (target.type === 'search_dm') {
        // Search → collect users → send DM to each
        const result = await this._executeSearchDm(slot, target);
        this._recordSlotRequest(slot);
        if (result.success) {
          this.state.counts.success += 1;
        } else {
          this.state.counts.failed += 1;
        }
      } else {
        // Direct DM to a known username
        const result = await this._executeDirectDm(slot, target);
        this._recordSlotRequest(slot);
        if (result.success) {
          this.state.counts.success += 1;
        } else {
          this.state.counts.failed += 1;
        }
      }
    } catch (err) {
      this.state.counts.failed += 1;
      this.log.error('taskManager:_executeTarget', err.message, { slot, target });
    }
  }

  async _executeSearchDm(slot, keywordTarget) {
    const { keyword, maxResults } = keywordTarget;
    this.log.info('taskManager:search', `TK${slot} 搜索关键词: ${keyword}`);

    // Search users
    const searchResult = await this.platform.searchUsers(slot, keyword);
    if (!searchResult || !Array.isArray(searchResult.users) || searchResult.users.length === 0) {
      return { success: false, error: 'no_users_found', keyword };
    }

    const users = searchResult.users.slice(0, maxResults);
    this.log.info('taskManager:search', `TK${slot} 找到 ${users.length} 个用户`);

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      if (this.stopRequested || this.pauseRequested) break;

      const message = this._renderTemplate(user.name || user.username || '');
      try {
        // Navigate to profile → message → send
        const dmResult = await this._sendDmToUser(slot, user, message);
        if (dmResult.success) sent++;
        else failed++;
      } catch (_) {
        failed++;
      }

      // Delay between users within same search batch (3-8s)
      await sleep(randInt(3000, 8000));
    }

    return { success: sent > 0, sent, failed, keyword };
  }

  async _executeDirectDm(slot, target) {
    const message = this._renderTemplate(target.username);
    this.log.info('taskManager:dm', `TK${slot} 发送私信给 @${target.username}`);

    const result = await this._sendDmToUser(slot, { name: target.username, url: target.url }, message);
    return result;
  }

  async _sendDmToUser(slot, user, message) {
    const username = user.username || user.name;
    const profileTarget = user.url || username;
    if (!profileTarget) {
      return { success: false, error: 'profile_target_missing' };
    }

    await this.platform.navigateTo(slot, profileTarget);
    await sleep(3000);

    const ctrl = this.platform.getController(slot);
    if (ctrl) {
      await ctrl.installAutomationBridge();
      const msgResult = await ctrl.callAutomation('openMessageFromProfile');
      if (!msgResult?.success) {
        return { success: false, error: msgResult?.error || 'message_button_not_found' };
      }
    }

    await sleep(2000);

    return this.platform.sendDm(slot, message);
  }

  _renderTemplate(username) {
    return this.state.messageTemplate
      .replace(/\{username\}/g, username)
      .replace(/\{name\}/g, username);
  }

  // ═══════════════════════════════════════════
  //  Slot Selection
  // ═══════════════════════════════════════════

  _pickSlot() {
    const online = this.accountManager.getOnlineAccounts();
    if (online.length === 0) return null;

    // Simple round-robin based on cursor
    return online[this.state.cursor % online.length].slot;
  }

  _pickAlternativeSlot(excludeSlot) {
    const online = this.accountManager.getOnlineAccounts();
    const candidates = online.filter((a) => a.slot !== excludeSlot);
    if (candidates.length === 0) return null;

    // Pick the one with lowest rate count
    let best = candidates[0];
    let bestCount = Infinity;
    for (const a of candidates) {
      const ts = this._perSlotTimestamps.get(a.slot) || [];
      const count = ts.filter((t) => t > Date.now() - 3600000).length;
      if (count < bestCount) { bestCount = count; best = a; }
    }
    return best.slot;
  }

  // ═══════════════════════════════════════════
  //  Rate Limiting
  // ═══════════════════════════════════════════

  _checkSlotRate(slot) {
    const threshold = Date.now() - 3600000;
    let timestamps = this._perSlotTimestamps.get(slot);
    if (!timestamps) return { blocked: false, count: 0, waitMs: 0 };

    timestamps = timestamps.filter((ts) => ts > threshold);
    this._perSlotTimestamps.set(slot, timestamps);

    const count = timestamps.length;
    if (count >= this._maxPerHour) {
      const oldest = timestamps[0];
      const waitMs = Math.max(0, oldest - threshold);
      return { blocked: true, count, waitMs };
    }
    return { blocked: false, count, waitMs: 0 };
  }

  _recordSlotRequest(slot) {
    let timestamps = this._perSlotTimestamps.get(slot);
    if (!timestamps) timestamps = [];
    timestamps.push(Date.now());
    this._perSlotTimestamps.set(slot, timestamps);
  }

  // ═══════════════════════════════════════════
  //  Lifecycle
  // ═══════════════════════════════════════════

  async _handleAfterItem() {
    if (this.stopRequested) { this._finishAsIdle('stopped'); return true; }
    if (this.pauseRequested) {
      this.pauseRequested = false;
      this.state.status = 'paused';
      this._saveState();
      this._emitState();
      return true;
    }

    const interrupted = await interruptibleDelay(this.state.delayMs, () => ({
      pauseRequested: this.pauseRequested,
      stopRequested: this.stopRequested
    }));

    if (interrupted === 'stop') { this._finishAsIdle('stopped'); return true; }
    if (interrupted === 'pause') {
      this.pauseRequested = false;
      this.state.status = 'paused';
      this._saveState();
      this._emitState();
      return true;
    }
    return false;
  }

  _finishAsIdle(outcome) {
    const progress = { ...this.state.progress };
    const counts = { ...this.state.counts };
    this.pauseRequested = false;
    this.stopRequested = false;
    this.state.status = 'idle';
    this.state.runId = null;
    this.state.currentSlot = null;
    this.state.currentTarget = null;
    this.state.targets = [];
    this.state.cursor = 0;
    this.state.lastOutcome = outcome;
    this.state.progress = progress;
    this.state.counts = counts;
    this._saveState();
    this._emitState();
  }

  _failRun(error) {
    const progress = { ...this.state.progress };
    const counts = { ...this.state.counts };
    this.pauseRequested = false;
    this.stopRequested = false;
    this.state.status = 'idle';
    this.state.runId = null;
    this.state.currentSlot = null;
    this.state.currentTarget = null;
    this.state.targets = [];
    this.state.cursor = 0;
    this.state.lastOutcome = 'failed';
    this.state.lastError = error instanceof Error ? error.message : '未知错误';
    this.state.progress = progress;
    this.state.counts = counts;
    this._saveState();
    this._emitState();
  }

  // ═══════════════════════════════════════════
  //  State Persistence
  // ═══════════════════════════════════════════

  _normalizeState(raw) {
    return {
      status: 'idle',
      runId: null,
      mode: 'dm',
      currentSlot: null,
      currentTarget: null,
      delayMs: normalizeDelay(raw?.delayMs),
      messageTemplate: '',
      progress: { completed: 0, total: 0 },
      counts: { success: 0, failed: 0, skipped: 0, pending: 0 },
      targets: [],
      cursor: 0,
      lastOutcome: null,
      lastError: null
    };
  }

  _recalculateProgress() {
    const total = this.state.targets.length;
    const completed = this.state.cursor;
    this.state.progress = { completed, total };
    this.state.counts.pending = Math.max(0, total - completed);
  }

  _saveState() {
    if (this._saveTimer) return;
    this._saveTimer = setImmediate(() => {
      this._saveTimer = null;
      this.store.set('taskState', this.state);
    });
  }

  _emitState() {
    this.emit('task-state', this.getState());
    this.emit('task-progress', {
      taskState: this.getState()
    });
  }
}

// ═══════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════

function normalizeDelay(delayMs) {
  const parsed = Number.parseInt(delayMs, 10);
  if (Number.isNaN(parsed)) return 20000;
  return Math.max(100, Math.min(60000, parsed));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function interruptibleDelay(delayMs, getSignals) {
  let elapsed = 0;
  while (elapsed < delayMs) {
    const step = Math.min(100, delayMs - elapsed);
    await sleep(step);
    elapsed += step;
    const { pauseRequested, stopRequested } = getSignals();
    if (stopRequested) return 'stop';
    if (pauseRequested) return 'pause';
  }
  return null;
}

module.exports = TaskManager;
