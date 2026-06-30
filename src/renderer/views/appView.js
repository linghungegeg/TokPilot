const STATUS_LABELS = {
  empty: '空',
  offline: '离线',
  logging_in: '登录中',
  online: '在线',
  error: '错误'
};

const TASk_STATUS_LABELS = {
  idle: '待机中',
  running: '运行中',
  paused: '已暂停',
  stopping: '停止中'
};

const MODE_LABELS = {
  dm: '引流私信',
  follow: '涨粉关注'
};

const VIEW_TITLES = {
  accounts: '账号管理',
  dm: '引流私信',
  task: '任务控制',
  settings: '设置'
};

const VIEW_SUBTITLES = {
  accounts: '管理账号导入导出和健康检测',
  dm: '搜索 TikTok 用户并自动发送私信',
  task: '查看和管理任务执行状态',
  settings: '配置代理、延迟和 AI 自动回复'
};

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

// ═══════════════════════════════════════════
//  Sidebar — Account List
// ═══════════════════════════════════════════

export function renderAccounts(ctx) {
  const { state } = ctx;
  const listEl = document.getElementById('accounts-list');
  if (!listEl) return;

  const accounts = state.accounts || [];
  if (accounts.length === 0) {
    listEl.innerHTML = '<div class="empty-hint">暂无账号，请先在设置页导入</div>';
    updateFilterCounts(accounts);
    return;
  }

  const filter = state.accountFilter || 'all';
  const filtered = accounts.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'online') return a.loginState === 'online';
    if (filter === 'offline') return a.loginState !== 'online';
    return true;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = '<div class="empty-hint">没有匹配的账号</div>';
    updateFilterCounts(accounts);
    return;
  }

  listEl.innerHTML = filtered.map(a => {
    const stateClass = a.loginState || 'empty';
    const label = a.isEmpty ? `槽位 ${a.slot}` : (a.tiktokUsername || `槽位 ${a.slot}`);
    const hint = a.loginHint || '';

    return `
      <div class="account-item" data-account-slot="${a.slot}">
        <span class="account-slot">#${a.slot}</span>
        <span class="account-name" title="${escHtml(label)}">${escHtml(label)}</span>
        <span class="account-state state-${stateClass}">${STATUS_LABELS[stateClass] || stateClass}</span>
        <div class="account-actions">
          ${!a.isEmpty ? `<button class="btn btn-xs btn-primary" data-account-login="${a.slot}">${a.loginState === 'online' ? '重登' : '登录'}</button>` : ''}
        </div>
      </div>
    `;
  }).join('');

  updateFilterCounts(accounts);
}

function updateFilterCounts(accounts) {
  const all = accounts.length;
  const online = accounts.filter(a => a.loginState === 'online').length;
  const offline = accounts.filter(a => a.loginState !== 'online').length;

  setText('filter-count-all', String(all));
  setText('filter-count-online', String(online));
  setText('filter-count-offline', String(offline));
}

// ═══════════════════════════════════════════
//  Sidebar — Filter Tabs
// ═══════════════════════════════════════════

export function renderFilterTabs(ctx) {
  const filter = ctx.state.accountFilter || 'all';
  document.querySelectorAll('.filter-tab').forEach(el => {
    el.classList.toggle('is-active', el.getAttribute('data-filter') === filter);
  });
}

// ═══════════════════════════════════════════
//  Topbar
// ═══════════════════════════════════════════

export function renderTopbar(view) {
  setText('topbar-title', VIEW_TITLES[view] || '');
  setText('topbar-subtitle', VIEW_SUBTITLES[view] || '');
}

// ═══════════════════════════════════════════
//  DM Panel
// ═══════════════════════════════════════════

export function renderDmPanel(ctx) {
  const ts = ctx.state.taskState || {};
  const counts = ts.counts || {};
  const progress = ts.progress || {};

  setText('dm-stat-online', String(ctx.state.accounts.filter(a => a.loginState === 'online').length));
  setText('dm-stat-sent', String((counts.success || 0) + (counts.failed || 0)));
  setText('dm-stat-success', String(counts.success || 0));
  setText('dm-stat-failed', String(counts.failed || 0));
  setText('dm-stat-skipped', String(counts.skipped || 0));
  setText('dm-stat-progress', `${progress.completed || 0}/${progress.total || 0}`);

  const isRunning = ts.status === 'running';
  const isPaused = ts.status === 'paused';

  const startBtn = document.getElementById('dm-start-btn');
  if (startBtn) {
    if (isRunning) {
      startBtn.textContent = '运行中...';
      startBtn.disabled = true;
    } else if (isPaused) {
      startBtn.textContent = '已暂停';
      startBtn.disabled = true;
    } else {
      startBtn.textContent = '开始发送';
      startBtn.disabled = false;
    }
  }

  // Progress bar
  const total = progress.total || 0;
  const completed = progress.completed || 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const bar = document.getElementById('dm-progress-bar');
  if (bar) bar.style.width = `${pct}%`;
  setText('dm-progress-text', `${completed} / ${total}`);

  // Task buttons
  const pauseBtn = document.getElementById('task-pause-btn');
  const stopBtn = document.getElementById('task-stop-btn');
  if (pauseBtn) pauseBtn.style.display = isRunning ? '' : 'none';
  if (stopBtn) stopBtn.style.display = (isRunning || isPaused) ? '' : 'none';
  if (pauseBtn && isRunning) pauseBtn.textContent = '暂停';

  // Greeting status
  renderGreetingStatus(ctx.state);
}

// ═══════════════════════════════════════════
//  DM Log
// ═══════════════════════════════════════════

export function appendDmLog(message, kind = 'info') {
  const list = document.getElementById('dm-log-list');
  if (!list) return;

  // Remove empty hint
  const hint = list.querySelector('.empty-hint');
  if (hint) hint.remove();

  const item = document.createElement('div');
  item.className = `log-item ${kind}`;
  const now = new Date();
  const ts = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  item.textContent = `[${ts}] ${message}`;
  list.appendChild(item);
  list.scrollTop = list.scrollHeight;

  // Keep max 100 items
  while (list.children.length > 100) list.firstChild.remove();
}

// ═══════════════════════════════════════════
//  Task Panel
// ═══════════════════════════════════════════

export function renderTaskPanel(ctx) {
  const ts = ctx.state.taskState || {};
  const counts = ts.counts || {};
  const progress = ts.progress || {};

  setText('task-stat-status', TASk_STATUS_LABELS[ts.status] || ts.status || '待机中');
  setText('task-stat-mode', MODE_LABELS[ts.mode] || ts.mode || '-');
  setText('task-stat-success', String(counts.success || 0));
  setText('task-stat-failed', String(counts.failed || 0));
  setText('task-stat-skipped', String(counts.skipped || 0));
  setText('task-stat-progress', `${progress.completed || 0}/${progress.total || 0}`);

  setText('task-detail-status', TASk_STATUS_LABELS[ts.status] || ts.status || '待机中');
  setText('task-detail-runid', ts.runId ? ts.runId.substring(0, 8) + '...' : '-');
  setText('task-detail-error', ts.lastError || '-');

  const isRunning = ts.status === 'running';
  const isPaused = ts.status === 'paused';

  const resumeBtn = document.getElementById('task-resume-btn');
  const stopBtn2 = document.getElementById('task-stop-btn2');
  if (resumeBtn) resumeBtn.style.display = isPaused ? '' : 'none';
  if (stopBtn2) stopBtn2.style.display = (isRunning || isPaused) ? '' : 'none';
}

// ═══════════════════════════════════════════
//  Accounts Panel
// ═══════════════════════════════════════════

export function renderAccountsPanel(ctx) {
  const { state } = ctx;
  const s = state.settings || {};

  // Account management fields
  const maxPerHourEl = document.getElementById('settings-maxperhour-input');
  if (maxPerHourEl && !maxPerHourEl.matches(':focus')) {
    maxPerHourEl.value = s.maxPerHour || 10;
  }

  const batchSizeEl = document.getElementById('settings-batch-size');
  if (batchSizeEl && !batchSizeEl.matches(':focus')) {
    batchSizeEl.value = s.loginBatchSize || 3;
  }

  const warmupEl = document.getElementById('settings-warmup-minutes');
  if (warmupEl && !warmupEl.matches(':focus')) {
    warmupEl.value = s.warmupMinutes ?? 10;
  }
}

// ═══════════════════════════════════════════
//  Settings Panel
// ═══════════════════════════════════════════

export function renderSettings(ctx) {
  const { state } = ctx;
  const s = state.settings || {};

  const proxyEl = document.getElementById('settings-http-proxy');
  if (proxyEl && !proxyEl.matches(':focus')) {
    proxyEl.value = s.httpProxy || '';
  }

  const delayEl = document.getElementById('settings-delay-input');
  if (delayEl && !delayEl.matches(':focus')) {
    delayEl.value = s.delayMs || 20000;
  }

  // AI auto-reply settings
  const enabledCb = document.getElementById('auto-reply-enabled');
  if (enabledCb && !enabledCb.matches(':focus')) {
    enabledCb.checked = !!s.autoReplyEnabled;
  }

  const baseUrlEl = document.getElementById('auto-reply-baseurl');
  if (baseUrlEl && !baseUrlEl.matches(':focus')) {
    baseUrlEl.value = s.autoReplyBaseUrl || '';
  }

  const apiKeyEl = document.getElementById('auto-reply-apikey');
  if (apiKeyEl && !apiKeyEl.matches(':focus')) {
    apiKeyEl.value = s.autoReplyApiKey || '';
  }

  const modelEl = document.getElementById('auto-reply-model');
  if (modelEl && !modelEl.matches(':focus')) {
    modelEl.value = s.autoReplyModel || '';
  }

  const promptEl = document.getElementById('auto-reply-prompt');
  if (promptEl && !promptEl.matches(':focus')) {
    promptEl.value = s.autoReplySystemPrompt || DEFAULT_SYSTEM_PROMPT;
  }

  const maxHourlyEl = document.getElementById('auto-reply-maxhourly');
  if (maxHourlyEl && !maxHourlyEl.matches(':focus')) {
    maxHourlyEl.value = s.autoReplyMaxHourly || 20;
  }

  const ctxMsgsEl = document.getElementById('auto-reply-context-msgs');
  if (ctxMsgsEl && !ctxMsgsEl.matches(':focus')) {
    ctxMsgsEl.value = s.autoReplyContextMessages || 15;
  }

  const accDelayMinEl = document.getElementById('auto-reply-account-delay-min');
  if (accDelayMinEl && !accDelayMinEl.matches(':focus')) {
    accDelayMinEl.value = s.autoReplyAccountDelayMinMs || 5000;
  }

  const accDelayMaxEl = document.getElementById('auto-reply-account-delay-max');
  if (accDelayMaxEl && !accDelayMaxEl.matches(':focus')) {
    accDelayMaxEl.value = s.autoReplyAccountDelayMaxMs || 5000;
  }

  const friendDelayMinEl = document.getElementById('auto-reply-friend-delay-min');
  if (friendDelayMinEl && !friendDelayMinEl.matches(':focus')) {
    friendDelayMinEl.value = s.autoReplyFriendDelayMinMs || 10000;
  }

  const friendDelayMaxEl = document.getElementById('auto-reply-friend-delay-max');
  if (friendDelayMaxEl && !friendDelayMaxEl.matches(':focus')) {
    friendDelayMaxEl.value = s.autoReplyFriendDelayMaxMs || 10000;
  }

  const timeoutEl = document.getElementById('auto-reply-timeout');
  if (timeoutEl && !timeoutEl.matches(':focus')) {
    timeoutEl.value = s.autoReplyTimeoutMs || 30000;
  }

  const retryEl = document.getElementById('auto-reply-retry');
  if (retryEl && !retryEl.matches(':focus')) {
    retryEl.value = s.autoReplyRetryAttempts ?? 3;
  }

  const temperatureEl = document.getElementById('auto-reply-temperature');
  if (temperatureEl && !temperatureEl.matches(':focus')) {
    temperatureEl.value = s.autoReplyTemperature ?? 0.7;
  }

  const maxTokensEl = document.getElementById('auto-reply-max-tokens');
  if (maxTokensEl && !maxTokensEl.matches(':focus')) {
    maxTokensEl.value = s.autoReplyMaxTokens || 500;
  }

  // AI status
  const arStatus = state.autoReplyStatus || {};
  const statusEl = document.getElementById('auto-reply-status');
  if (statusEl) {
    statusEl.textContent = arStatus.running ? '运行中' : '已停止';
    statusEl.style.color = arStatus.running ? 'var(--success)' : 'var(--muted)';
  }

  // AI provider pool
  renderProvidersList(s.autoReplyProviders || []);

  // Per-slot proxy pool
  const proxyPoolToggle = document.getElementById('proxy-pool-enabled-toggle');
  if (proxyPoolToggle && !proxyPoolToggle.matches(':focus')) {
    proxyPoolToggle.checked = Boolean(s.proxyPoolEnabled);
  }
  renderProxyPoolEntries(s.proxyPoolEntries || []);

  const startBtn = document.getElementById('auto-reply-start-btn');
  const stopBtn = document.getElementById('auto-reply-stop-btn');
  if (startBtn) startBtn.style.display = arStatus.running ? 'none' : '';
  if (stopBtn) stopBtn.style.display = arStatus.running ? '' : 'none';

  const configEl = document.getElementById('storage-config-path');
  if (configEl) configEl.value = state.storageInfo?.configPath || '';

  const userDataEl = document.getElementById('storage-userdata-path');
  if (userDataEl) userDataEl.value = state.storageInfo?.userDataPath || '';

  setText('app-version', `v${state.appInfo?.version || '1.0.0'}`);

  // LarkBot settings
  const larkAppId = document.getElementById('larkbot-appid');
  if (larkAppId && !larkAppId.matches(':focus')) larkAppId.value = s.larkAppId || '';
  const larkSecret = document.getElementById('larkbot-secret');
  if (larkSecret && !larkSecret.matches(':focus')) larkSecret.value = s.larkAppSecret || '';

  // LarkBot status
  if (state.larkBotRunning !== undefined) {
    const lStatus = document.getElementById('larkbot-status');
    if (lStatus) {
      lStatus.textContent = state.larkBotConnected ? '已连接' : state.larkBotRunning ? '启动中' : '待启动';
      lStatus.style.color = state.larkBotConnected ? 'var(--success)' : state.larkBotRunning ? 'var(--warning)' : 'var(--muted)';
    }
    const lStart = document.getElementById('larkbot-start-btn');
    const lStop = document.getElementById('larkbot-stop-btn');
    if (lStart) lStart.style.display = state.larkBotRunning ? 'none' : '';
    if (lStop) lStop.style.display = state.larkBotRunning ? '' : 'none';
  }
}

// ═══════════════════════════════════════════
//  Toast
// ═══════════════════════════════════════════

export function showToast(message, kind = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${kind}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ═══════════════════════════════════════════
//  Navigation
// ═══════════════════════════════════════════

export function switchView(view) {
  document.body.dataset.activeView = view;

  document.querySelectorAll('.app-view').forEach(v => {
    v.classList.toggle('is-active', v.getAttribute('data-view') === view);
  });

  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('is-active', b.getAttribute('data-nav') === view);
  });

  renderTopbar(view);
}

// ═══════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ═══════════════════════════════════════════
//  DM Panel — Chat Records (DC-style)
// ═══════════════════════════════════════════

export function renderChatRecords(records, stats, pageInfo) {
  const listEl = document.getElementById('chat-records-list');
  if (!listEl) return;

  if (!records || records.length === 0) {
    listEl.innerHTML = '<div class="empty-hint">暂无聊天记录</div>';
  } else {
    listEl.innerHTML = records.map(r => {
      const time = (r.startedAt || r.createdAt || '').replace('T', ' ').slice(0, 19);
      const statusClass = r.status === 'success' ? 'success' : r.status === 'running' ? 'info' : 'error';
      const statusLabel = r.resultLabel || r.status;
      const friend = r.friendName || r.friendId || '-';
      const slot = r.accountSlot;
      const incoming = (r.incomingText || '').slice(0, 80);
      const reply = (r.aiReply || '').slice(0, 80);
      const incomingTr = r.translatedIncomingText || '';
      const replyTr = r.translatedAiReply || '';

      let translateBlock = '';
      if (incomingTr || replyTr) {
        translateBlock = `<div class="chat-translate">
          <span>收译: ${escapeHtml(incomingTr).slice(0, 50)}</span>
          <span> | 回译: ${escapeHtml(replyTr).slice(0, 50)}</span>
        </div>`;
      }

      return `<div class="chat-record-item">
        <div class="chat-record-meta">
          <span class="chat-record-time">${time}</span>
          <span class="chat-record-slot">Slot${slot}</span>
          <span class="chat-record-friend">${escapeHtml(friend)}</span>
          <span class="chat-record-tag tag-${statusClass}">${statusLabel}</span>
        </div>
        <div class="chat-bubble incoming">
          <span class="chat-bubble-label">收</span>
          <span class="chat-bubble-text">${escapeHtml(incoming)}</span>
        </div>
        <div class="chat-bubble outgoing">
          <span class="chat-bubble-label">回</span>
          <span class="chat-bubble-text">${escapeHtml(reply)}</span>
        </div>
        ${translateBlock}
      </div>`;
    }).join('');
  }

  // Stats
  if (stats) {
    setText('chat-records-stats',
      `总计: ${stats.total || 0} | 成功: ${stats.success || 0} | 失败: ${stats.failed || 0}`);
  }

  // Pagination
  if (pageInfo) {
    setText('chat-records-page', `第 ${pageInfo.page || 1} 页 (共 ${pageInfo.total || 0} 条)`);
    const prevBtn = document.getElementById('chat-records-prev-btn');
    const nextBtn = document.getElementById('chat-records-next-btn');
    if (prevBtn) prevBtn.disabled = pageInfo.page <= 1;
    if (nextBtn) nextBtn.disabled = pageInfo.page * pageInfo.limit >= pageInfo.total;
  }
}

/**
 * 渲染问候管理状态（DM面板内）
 */
export function renderGreetingStatus(state) {
  const gStatus = document.getElementById('greeting-status');
  if (gStatus) {
    gStatus.textContent = state.greetingRunning ? '运行中' : '待启动';
    gStatus.style.color = state.greetingRunning ? 'var(--success)' : 'var(--muted)';
  }
  const gStart = document.getElementById('greeting-start-btn');
  const gStop = document.getElementById('greeting-stop-btn');
  if (gStart) gStart.style.display = state.greetingRunning ? 'none' : '';
  if (gStop) gStop.style.display = state.greetingRunning ? '' : 'none';
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pad(n) {
  return String(n).padStart(2, '0');
}

// ═══════════════════════════════════════════
//  Per-slot Proxy Pool
// ═══════════════════════════════════════════

export function renderProxyPoolEntries(entries) {
  const list = document.getElementById('proxy-pool-entries-list');
  if (!list) return;
  if (!entries || entries.length === 0) {
    list.innerHTML = '<div class="muted" style="font-size:12px;padding:6px 0">尚未添加代理条目，请点击"+ 添加代理"。</div>';
    return;
  }
  list.innerHTML = entries.map((e, i) => `
    <div class="proxy-pool-entry" data-entry-id="${escHtml(e.id)}" data-entry-index="${i}">
      <div class="proxy-pool-entry-head">
        <span class="entry-label">代理 ${i + 1}</span>
        <div class="proxy-pool-entry-actions">
          <label><input type="checkbox" class="entry-enabled-cb" ${e.enabled !== false ? 'checked' : ''}> 启用</label>
          <button class="btn-danger-text entry-remove-btn" type="button">删除</button>
        </div>
      </div>
      <div class="proxy-pool-entry-fields">
        <div class="form-group">
          <label>代理地址</label>
          <input type="text" class="entry-url-input" value="${escHtml(e.url || '')}" placeholder="http://1.2.3.4:8080">
        </div>
        <div class="form-group">
          <label>绑定槽位</label>
          <input type="text" class="entry-bindings-input" value="${escHtml(e.bindings || '')}" placeholder="1-20, 35, 40-50">
        </div>
      </div>
    </div>
  `).join('');
}

export function collectProxyPoolEntriesFromDom() {
  const list = document.getElementById('proxy-pool-entries-list');
  if (!list) return [];
  const items = list.querySelectorAll('.proxy-pool-entry');
  return Array.from(items).map((item) => ({
    id: item.dataset.entryId || '',
    enabled: item.querySelector('.entry-enabled-cb')?.checked !== false,
    url: item.querySelector('.entry-url-input')?.value?.trim() || '',
    bindings: item.querySelector('.entry-bindings-input')?.value?.trim() || ''
  }));
}

// ═══════════════════════════════════════════
//  AI Provider Pool
// ═══════════════════════════════════════════

export function renderProvidersList(providers) {
  const list = document.getElementById('auto-reply-providers-list');
  if (!list) return;
  if (!providers || providers.length === 0) {
    list.innerHTML = '<div class="muted" style="font-size:12px;padding:6px 0">尚未添加接口，请点击"+ 添加接口"。</div>';
    return;
  }
  list.innerHTML = providers.map((p, i) => `
    <div class="provider-item" data-provider-index="${i}">
      <div class="provider-item-header">
        <span class="provider-item-label">接口 ${i + 1}</span>
        <div class="provider-item-actions">
          <label style="font-size:11px;display:flex;align-items:center;gap:4px;cursor:pointer">
            <input type="checkbox" class="provider-enabled-cb" ${p.enabled !== false ? 'checked' : ''}> 启用
          </label>
          <button class="btn-danger-text provider-remove-btn" type="button">删除</button>
        </div>
      </div>
      <div class="provider-item-fields">
        <input type="text" class="provider-name-input" value="${escHtml(p.name || '')}" placeholder="接口名称（如 GPT-4o）">
        <input type="text" class="provider-baseurl-input" value="${escHtml(p.baseURL || '')}" placeholder="Base URL">
        <input type="password" class="provider-apikey-input" value="${escHtml(p.apiKey || '')}" placeholder="API Key">
        <input type="text" class="provider-model-input" value="${escHtml(p.model || '')}" placeholder="Model（如 gpt-4o-mini）">
      </div>
    </div>
  `).join('');
}

export function collectProvidersFromDom() {
  const list = document.getElementById('auto-reply-providers-list');
  if (!list) return [];
  const items = list.querySelectorAll('.provider-item');
  return Array.from(items).map((item, i) => ({
    id: `provider_${Date.now()}_${i}`,
    name: item.querySelector('.provider-name-input')?.value?.trim() || '',
    enabled: item.querySelector('.provider-enabled-cb')?.checked !== false,
    baseURL: item.querySelector('.provider-baseurl-input')?.value?.trim() || '',
    apiKey: item.querySelector('.provider-apikey-input')?.value?.trim() || '',
    model: item.querySelector('.provider-model-input')?.value?.trim() || ''
  }));
}

// ═══════════════════════════════════════════
//  Log Files
// ═══════════════════════════════════════════

const KNOWN_LOG_FILES = [
  { label: '主进程日志', file: 'main.log' },
  { label: '自动回复日志', file: 'autoReply.log' }
];

export function renderLogFiles(logsDir) {
  const list = document.getElementById('log-files-list');
  if (!list) return;

  if (!logsDir) {
    list.innerHTML = '<div class="muted" style="font-size:12px;padding:6px 0">日志目录未就绪</div>';
    return;
  }

  list.innerHTML = KNOWN_LOG_FILES.map(lf => {
    const fullPath = `${logsDir}/${lf.file}`.replace(/\\/g, '/');
    return `
      <div class="log-file-row">
        <span class="log-file-label">${escHtml(lf.label)}</span>
        <span class="log-file-name">${escHtml(lf.file)}</span>
        <button class="btn btn-secondary btn-xs log-file-open-btn" data-log-path="${escHtml(fullPath)}">打开</button>
      </div>
    `;
  }).join('');
}

export function getTaskConfig() {
  const keywordRaw = document.getElementById('dm-keyword-input')?.value || '';
  const template = document.getElementById('dm-template-input')?.value || '';
  const maxResults = parseInt(document.getElementById('dm-maxresults-input')?.value, 10) || 20;

  const keywords = keywordRaw
    .split(/[\n,]+/)
    .map(k => k.trim())
    .filter(Boolean);

  return { keywords, template, maxResults };
}

// ═══════════════════════════════════════════
//  Health Check
// ═══════════════════════════════════════════

const HEALTH_STATUS_TEXT = {
  healthy: '正常',
  caution: '注意',
  restricted: '受限',
  shadowbanned: '疑似Shadowban',
  error: '检测失败'
};

const HEALTH_STATUS_COLOR = {
  healthy: 'health-green',
  caution: 'health-orange',
  restricted: 'health-red',
  shadowbanned: 'health-critical',
  error: 'health-error'
};

const HEALTH_BAR_COLOR = {
  healthy: 'bar-green',
  caution: 'bar-orange',
  restricted: 'bar-red',
  shadowbanned: 'bar-critical',
  error: ''
};

export function renderHealthResult(results) {
  // Normalize to array
  const list = Array.isArray(results) ? results : (results ? [{ slot: null, ok: true, ...results }] : null);

  if (!list || list.length === 0) {
    setText('healthScore', '--');
    document.getElementById('healthScore').className = 'health-badge health-error';
    document.getElementById('healthBar').style.width = '0%';
    setText('healthStatus', '检测失败，请确认账号已登录');
    document.getElementById('healthDetail').innerHTML = '';
    document.getElementById('healthSummary').innerHTML = '';
    document.getElementById('healthWarnings').innerHTML = '';
    document.getElementById('healthTips').innerHTML = '';
    document.getElementById('healthSignals').innerHTML = '';
    return;
  }

  const isBatch = list.length > 1;
  const allOk = list.filter(r => r.ok);
  const allFailed = allOk.length === 0;

  if (allFailed) {
    setText('healthScore', 'ERR');
    document.getElementById('healthScore').className = 'health-badge health-error';
    document.getElementById('healthBar').style.width = '0%';
    setText('healthStatus', list.length + ' 个槽位全部检测失败');
    document.getElementById('healthDetail').innerHTML = '';
    document.getElementById('healthSummary').innerHTML = '';
    document.getElementById('healthWarnings').innerHTML = '';
    document.getElementById('healthTips').innerHTML = '';
    document.getElementById('healthSignals').innerHTML = '';
    return;
  }

  // Aggregate
  const scores = allOk.map(r => r.health?.score ?? 0);
  const minScore = Math.min(...scores);
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const worstStatus = allOk.reduce((worst, r) => {
    const s = r.health?.status || 'healthy';
    const order = { healthy: 0, caution: 1, restricted: 2, shadowbanned: 3 };
    return (order[s] || 0) > (order[worst] || 0) ? s : worst;
  }, 'healthy');

  // Top-level badge shows worst score (most conservative)
  const badge = document.getElementById('healthScore');
  if (badge) {
    badge.textContent = isBatch ? avgScore : minScore;
    badge.className = 'health-badge ' + (HEALTH_STATUS_COLOR[worstStatus] || 'health-error');
  }

  // Progress bar
  const bar = document.getElementById('healthBar');
  if (bar) {
    bar.style.width = Math.min(100, Math.max(0, isBatch ? avgScore : minScore)) + '%';
    bar.className = 'health-bar ' + (HEALTH_BAR_COLOR[worstStatus] || '');
  }

  // Status text
  if (isBatch) {
    const counts = { healthy: 0, caution: 0, restricted: 0, shadowbanned: 0 };
    allOk.forEach(r => { const s = r.health?.status || 'healthy'; if (counts[s] !== undefined) counts[s]++; });
    const parts = [];
    if (counts.healthy) parts.push(counts.healthy + ' 正常');
    if (counts.caution) parts.push(counts.caution + ' 注意');
    if (counts.restricted) parts.push(counts.restricted + ' 受限');
    if (counts.shadowbanned) parts.push(counts.shadowbanned + ' 疑似SB');
    setText('healthStatus', list.length + ' 槽位 | 均分 ' + avgScore + ' | 最低 ' + minScore + ' | ' + parts.join(' / '));
  } else {
    setText('healthStatus', (HEALTH_STATUS_TEXT[worstStatus] || worstStatus) + ' (' + minScore + '分)');
  }

  // Detail: SSR user for single slot; summary table for batch
  const detailEl = document.getElementById('healthDetail');
  if (detailEl) {
    if (!isBatch) {
      const r = allOk[0];
      const user = r.ssrUser;
      if (user && user.nickname) {
        detailEl.innerHTML = '账号: <strong>' + escHtml(user.nickname) + '</strong>' +
          (user.uniqueId ? ' (@' + escHtml(user.uniqueId) + ')' : '') +
          ' | 粉丝: <strong>' + (user.followerCount || 0) + '</strong>' +
          ' | 关注: <strong>' + (user.followingCount || 0) + '</strong>' +
          (r.hasSession ? ' | <span style="color:var(--success)">已登录</span>' : ' | <span style="color:var(--danger)">未登录</span>');
      } else {
        detailEl.innerHTML = r.hasSession
          ? '<span style="color:var(--success)">会话正常</span>，未获取到SSR用户数据'
          : '<span style="color:var(--danger)">未检测到登录会话</span>';
      }
    } else {
      detailEl.innerHTML = '';
    }
  }

  // Summary table for batch mode
  const summaryEl = document.getElementById('healthSummary');
  if (summaryEl) {
    if (isBatch) {
      var tableRows = allOk.map(function(r) {
        var h = r.health || {};
        var u = r.ssrUser;
        var name = u && u.nickname ? escHtml(u.nickname) : '槽位 ' + r.slot;
        var score = h.score != null ? h.score : '?';
        var statusText = HEALTH_STATUS_TEXT[h.status] || h.status || '?';
        var colorClass = HEALTH_STATUS_COLOR[h.status] || 'health-error';
        return '<div class="health-slot-row-item">' +
          '<span class="slot-num">#' + r.slot + '</span>' +
          '<span class="slot-name">' + name + '</span>' +
          '<span class="slot-score health-badge ' + colorClass + '">' + score + '</span>' +
          '<span class="slot-status">' + statusText + '</span>' +
          '</div>';
      }).join('');

      // Failed slots
      var failedRows = list.filter(function(r) { return !r.ok; }).map(function(r) {
        return '<div class="health-slot-row-item failed">' +
          '<span class="slot-num">#' + r.slot + '</span>' +
          '<span class="slot-name">错误: ' + escHtml(r.error || '未知') + '</span>' +
          '<span class="slot-score health-badge health-error">ERR</span>' +
          '</div>';
      }).join('');

      summaryEl.innerHTML = '<div class="health-slot-list">' + tableRows + failedRows + '</div>';
    } else {
      summaryEl.innerHTML = '';
    }
  }

  // Warnings: show unique warnings across all slots
  const warningsEl = document.getElementById('healthWarnings');
  if (warningsEl) {
    var allWarnings = [];
    var seen = {};
    allOk.forEach(function(r) {
      (r.health?.warnings || []).forEach(function(w) {
        if (!seen[w]) { seen[w] = true; allWarnings.push(w); }
      });
    });
    warningsEl.innerHTML = allWarnings.map(function(w) {
      return '<div class="warning-item">' + escHtml(w) + '</div>';
    }).join('');
  }

  // Tips: show unique tips
  const tipsEl = document.getElementById('healthTips');
  if (tipsEl) {
    var allTips = [];
    var seenTips = {};
    allOk.forEach(function(r) {
      (r.health?.tips || []).forEach(function(t) {
        if (!seenTips[t]) { seenTips[t] = true; allTips.push(t); }
      });
    });
    tipsEl.innerHTML = allTips.map(function(t) {
      return '<div class="tip-item">' + escHtml(t) + '</div>';
    }).join('');
  }

  // Video restriction signals: only for single slot
  const signalsEl = document.getElementById('healthSignals');
  if (signalsEl) {
    if (!isBatch && allOk[0].videoRestriction) {
      var vr = allOk[0].videoRestriction;
      var html = '';
      if (vr.isRestricted && vr.signals && vr.signals.length > 0) {
        html += '<div class="signal-row"><span>视频限制信号</span><span class="signal-warn">' + vr.signals.length + ' 个</span></div>';
        vr.signals.forEach(function(s) {
          html += '<div class="signal-row"><span>' + escHtml(s) + '</span><span class="signal-warn">⚠</span></div>';
        });
      } else {
        html += '<div class="signal-row"><span>视频限制信号</span><span>未检测到</span></div>';
      }
      if (vr.videoHealthScore != null) {
        html += '<div class="signal-row"><span>视频健康分</span><span>' + vr.videoHealthScore + '</span></div>';
      }
      signalsEl.innerHTML = html;
    } else {
      signalsEl.innerHTML = '';
    }
  }
}
