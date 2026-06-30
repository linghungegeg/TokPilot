import { createAppApiClient } from '../api/appApiClient.js';
import { createInitialState, replaceSnapshot, mergeAccount } from '../state/appState.js';
import {
  renderAccounts, renderFilterTabs, renderTopbar, renderDmPanel,
  renderTaskPanel, renderSettings, showToast, switchView, appendDmLog, getTaskConfig,
  renderProxyPoolEntries, collectProxyPoolEntriesFromDom, renderLogFiles,
  renderProvidersList, collectProvidersFromDom,
  renderAccountsPanel,
  renderHealthResult,
  renderChatRecords,
  renderGreetingStatus
} from '../views/appView.js';

const state = createInitialState();
let client = null;
let dmLogEntries = [];

state.autoReplyStatus = { running: false };

export async function bootstrapApp() {
  if (!isAppApiAvailable()) {
    document.body.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#e4e4e8;font-family:sans-serif;">' +
      '当前页面未连接 Electron 主进程。请使用 npm start 或安装包中的 exe 启动。</div>';
    return;
  }

  client = createAppApiClient(window.appAPI);
  bindEvents();
  subscribeEvents();
  await refreshAll();
  renderAll();
  startBeijingClock();
}

function isAppApiAvailable() {
  return Boolean(window.appAPI && typeof window.appAPI.onTaskProgress === 'function');
}

async function refreshAll() {
  try {
    const [appInfo, accounts, taskState, settings, storageInfo] = await Promise.all([
      client.settings.appInfo(),
      client.accounts.list(),
      client.task.status(),
      client.settings.get(),
      client.settings.storageInfo()
    ]);

    replaceSnapshot(state, { accounts, taskState, settings, appInfo, storageInfo });
    renderAll();
  } catch (error) {
    console.error('刷新状态失败:', error);
  }
}

function renderAll() {
  renderAccounts({ state });
  renderFilterTabs({ state });
  renderDmPanel({ state });
  renderTaskPanel({ state });
  renderAccountsPanel({ state });
  renderSettings({ state });
  renderTopbar(document.body.dataset.activeView || 'dm');
}

// ═══════════════════════════════════════════
//  IPC Event Subscriptions
// ═══════════════════════════════════════════

function subscribeEvents() {
  const api = window.appAPI;
  if (!api) return;

  if (typeof api.onAccountsState === 'function') {
    api.onAccountsState((payload) => {
      const accounts = Array.isArray(payload) ? payload : (payload?.accounts || []);
      state.accounts = accounts;
      renderAccounts({ state });
      renderFilterTabs({ state });
      renderDmPanel({ state });
    });
  }

  if (typeof api.onTaskState === 'function') {
    api.onTaskState((taskState) => {
      state.taskState = taskState || state.taskState;
      renderAll();
    });
  }

  if (typeof api.onTaskProgress === 'function') {
    api.onTaskProgress((payload) => {
      const taskState = payload?.taskState;
      if (taskState) {
        state.taskState = taskState;
        renderAll();
      }
    });
  }

  if (typeof api.onAutoReplyRecord === 'function') {
    api.onAutoReplyRecord((record) => {
      appendDmLog(`[AI回复] slot=${record.accountSlot} friend=${record.friendName} status=${record.status}`, record.status === 'success' ? 'success' : 'error');
    });
  }

  if (typeof api.onAutoReplyState === 'function') {
    api.onAutoReplyState((arState) => {
      state.autoReplyStatus = arState || { running: false };
      renderSettings({ state });
    });
  }
}

// ═══════════════════════════════════════════
//  Event Bindings
// ═══════════════════════════════════════════

function bindEvents() {
  // ── 侧边栏导航 ──
  document.querySelectorAll('.nav-btn[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-nav');
      switchView(view);
      if (view === 'accounts') { renderAccountsPanel({ state }); }
      if (view === 'settings') { renderSettings({ state }); loadLogFiles(); }
      if (view === 'task') renderTaskPanel({ state });
    });
  });

  // ── 账号列表点击 ──
  document.getElementById('accounts-list')?.addEventListener('click', (event) => {
    const loginBtn = event.target.closest('[data-account-login]');
    if (loginBtn) {
      const slot = Number(loginBtn.getAttribute('data-account-login'));
      if (Number.isFinite(slot)) loginAccount(slot);
      return;
    }
  });

  // ── 筛选标签 ──
  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state.accountFilter = btn.getAttribute('data-filter') || 'all';
      renderFilterTabs({ state });
      renderAccounts({ state });
    });
  });

  // ── 快捷操作 ──
  document.getElementById('account-login-all-btn')?.addEventListener('click', loginAll);
  document.getElementById('account-restore-all-btn')?.addEventListener('click', restoreAllSessions);
  document.getElementById('account-dedup-btn')?.addEventListener('click', deduplicateAccounts);

  // ── 导入按钮（侧边栏） ──
  document.getElementById('account-import-btn')?.addEventListener('click', () => {
    switchView('accounts');
    renderAccountsPanel({ state });
    setTimeout(() => document.getElementById('account-import-ta')?.focus(), 200);
  });

  // ── DM 开始 ──
  document.getElementById('dm-start-btn')?.addEventListener('click', startDmTask);

  // ── 任务控制按钮 ──
  document.getElementById('task-pause-btn')?.addEventListener('click', pauseTask);
  document.getElementById('task-stop-btn')?.addEventListener('click', stopTask);
  document.getElementById('task-resume-btn')?.addEventListener('click', resumeTask);
  document.getElementById('task-stop-btn2')?.addEventListener('click', stopTask);

  // ── 设置 ──
  document.getElementById('settings-save-btn')?.addEventListener('click', saveSettings);
  document.getElementById('proxy-detect-btn')?.addEventListener('click', detectProxy);
  document.getElementById('account-import-btn2')?.addEventListener('click', importAccounts);
  document.getElementById('export-accounts-btn')?.addEventListener('click', exportAccounts);
  document.getElementById('storage-open-btn')?.addEventListener('click', () => openPath('config'));
  document.getElementById('storage-userdata-open-btn')?.addEventListener('click', () => openPath('userData'));

  // ── AI 自动回复 ──
  document.getElementById('auto-reply-start-btn')?.addEventListener('click', startAutoReply);
  document.getElementById('auto-reply-stop-btn')?.addEventListener('click', stopAutoReply);
  document.getElementById('auto-reply-save-btn')?.addEventListener('click', saveAutoReplySettings);
  document.getElementById('auto-reply-test-btn')?.addEventListener('click', testAutoReply);

  // ── Per-slot 代理池 ──
  document.getElementById('proxy-pool-add-entry-btn')?.addEventListener('click', addProxyPoolEntry);
  document.getElementById('proxy-pool-save-btn')?.addEventListener('click', saveProxyPoolSettings);
  // Delegate clicks within the entries list for remove buttons
  document.getElementById('proxy-pool-entries-list')?.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.entry-remove-btn');
    if (removeBtn) {
      const entry = removeBtn.closest('.proxy-pool-entry');
      if (entry) entry.remove();
    }
  });

  // ── 日志文件 ──
  document.getElementById('log-dir-open-btn')?.addEventListener('click', openLogsDir);
  document.getElementById('log-files-list')?.addEventListener('click', (e) => {
    const openBtn = e.target.closest('.log-file-open-btn');
    if (openBtn) {
      const logPath = openBtn.getAttribute('data-log-path');
      if (logPath) client.settings.openPath(logPath).catch(() => {});
    }
  });

  // ── AI 接口池 ──
  document.getElementById('auto-reply-add-provider-btn')?.addEventListener('click', addProvider);
  document.getElementById('auto-reply-providers-list')?.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.provider-remove-btn');
    if (removeBtn) {
      const item = removeBtn.closest('.provider-item');
      if (item) item.remove();
    }
  });

  // ── 账号健康检查 ──
  document.getElementById('checkHealthBtn')?.addEventListener('click', checkAccountHealth);
  document.getElementById('checkHealthAllBtn')?.addEventListener('click', checkAllOnlineHealth);

  // ── 问候管理（DM面板内） ──
  document.getElementById('greeting-start-btn')?.addEventListener('click', startGreeting);
  document.getElementById('greeting-stop-btn')?.addEventListener('click', stopGreeting);

  // ── 聊天记录（DM面板内） ──
  document.getElementById('chat-records-refresh-btn')?.addEventListener('click', () => loadChatRecords(1));
  document.getElementById('chat-records-export-btn')?.addEventListener('click', exportChatRecords);
  document.getElementById('chat-records-prev-btn')?.addEventListener('click', () => {
    if (state.chatRecordsPage > 1) loadChatRecords(state.chatRecordsPage - 1);
  });
  document.getElementById('chat-records-next-btn')?.addEventListener('click', () => {
    loadChatRecords(state.chatRecordsPage + 1);
  });

  // ── 飞书机器人 ──
  document.getElementById('larkbot-start-btn')?.addEventListener('click', startLarkBot);
  document.getElementById('larkbot-stop-btn')?.addEventListener('click', stopLarkBot);
  document.getElementById('larkbot-appid')?.addEventListener('change', saveLarkBotSettings);
  document.getElementById('larkbot-secret')?.addEventListener('change', saveLarkBotSettings);
}

// ═══════════════════════════════════════════
//  Account Login
// ═══════════════════════════════════════════

async function loginAccount(slot) {
  try {
    showToast(`正在登录槽位 ${slot}...`, 'info');
    const result = await client.accounts.loginNow(slot);
    if (result) {
      mergeAccount(state, result);
      renderAccounts({ state });
      renderFilterTabs({ state });
      if (result.loginState === 'online') {
        showToast(`槽位 ${slot} 登录成功`, 'success');
      } else {
        showToast(`槽位 ${slot} 登录失败: ${result.lastLoginError || '未知错误'}`, 'error');
      }
    }
  } catch (error) {
    showToast(`登录失败: ${error.message}`, 'error');
  }
}

async function loginAll() {
  const btn = document.getElementById('account-login-all-btn');

  // If batch is running, cancel instead
  if (state._batchRunning) {
    if (btn) { btn.disabled = true; btn.textContent = '停止中…'; }
    try {
      await client.accounts.cancelBatch();
      state._batchRunning = false;
      showToast('批量操作已取消', 'info');
    } catch (error) {
      showToast(`取消失败: ${error.message}`, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '全部登录'; }
    }
    return;
  }

  // Start batch login
  state._batchRunning = true;
  if (btn) { btn.textContent = '停止'; btn.classList.add('btn-danger'); btn.classList.remove('btn-primary'); }
  try {
    const result = await client.accounts.loginAll();
    if (result.accounts) {
      state.accounts = result.accounts;
      renderAccounts({ state });
      renderFilterTabs({ state });
    }
    if (result.cancelled) {
      showToast('批量登录已取消', 'info');
    } else {
      showToast(`全部登录: ${result.online} 在线, ${result.failed} 失败`, result.failed > 0 ? 'error' : 'success');
    }
  } catch (error) {
    showToast(`全部登录失败: ${error.message}`, 'error');
  } finally {
    state._batchRunning = false;
    if (btn) { btn.disabled = false; btn.textContent = '全部登录'; btn.classList.remove('btn-danger'); btn.classList.add('btn-primary'); }
  }
}

async function restoreAllSessions() {
  const btn = document.getElementById('account-restore-all-btn');

  if (state._batchRunning) {
    if (btn) { btn.disabled = true; btn.textContent = '停止中…'; }
    try {
      await client.accounts.cancelBatch();
      state._batchRunning = false;
      showToast('批量操作已取消', 'info');
    } catch (error) {
      showToast(`取消失败: ${error.message}`, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '恢复会话'; }
    }
    return;
  }

  state._batchRunning = true;
  if (btn) { btn.textContent = '停止'; btn.classList.add('btn-danger'); btn.classList.remove('btn-secondary'); }
  try {
    const result = await client.accounts.restoreAllSessions();
    if (result.accounts) {
      state.accounts = result.accounts;
      renderAccounts({ state });
      renderFilterTabs({ state });
    }
    showToast(`会话恢复: ${result.restored} 个已处理`, 'success');
  } catch (error) {
    showToast(`会话恢复失败: ${error.message}`, 'error');
  } finally {
    state._batchRunning = false;
    if (btn) { btn.disabled = false; btn.textContent = '恢复会话'; btn.classList.remove('btn-danger'); btn.classList.add('btn-secondary'); }
  }
}

async function deduplicateAccounts() {
  const btn = document.getElementById('account-dedup-btn');
  if (btn) { btn.disabled = true; btn.textContent = '...'; }
  try {
    const result = await client.accounts.deduplicate();
    const removed = result.removed?.length || 0;
    state.accounts = result.accounts || [];
    renderAccounts({ state });
    renderFilterTabs({ state });
    if (removed > 0) {
      showToast(`去重完成，移除 ${removed} 个重复账号`, 'success');
    } else {
      showToast('没有发现重复账号', 'info');
    }
  } catch (error) {
    showToast(`去重失败: ${error.message}`, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '去重'; }
  }
}

// ═══════════════════════════════════════════
//  DM Task
// ═══════════════════════════════════════════

async function startDmTask() {
  const config = getTaskConfig();
  if (config.keywords.length === 0) {
    showToast('请输入至少一个搜索关键词', 'error');
    return;
  }
  if (!config.template) {
    showToast('请输入私信模板', 'error');
    return;
  }

  const btn = document.getElementById('dm-start-btn');
  if (btn) { btn.disabled = true; btn.textContent = '启动中...'; }

  try {
    const taskPayload = {
      mode: 'dm',
      keywords: config.keywords,
      messageTemplate: config.template,
      maxResults: config.maxResults,
      delayMs: state.settings?.delayMs || 20000,
      maxPerHour: state.settings?.maxPerHour || 10
    };

    appendDmLog(`开始任务: ${config.keywords.length} 个关键词, 模板: "${config.template}"`, 'info');
    const result = await client.task.start(taskPayload);
    state.taskState = result;
    appendDmLog(`任务已启动, 共 ${result.progress?.total || 0} 个目标`, 'info');
    renderAll();
  } catch (error) {
    appendDmLog(`启动失败: ${error.message}`, 'error');
    showToast(`启动失败: ${error.message}`, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '开始发送'; }
  }
}

async function pauseTask() {
  try {
    await client.task.pause();
    showToast('任务已暂停', 'info');
    appendDmLog('任务已暂停', 'info');
  } catch (error) {
    showToast(`暂停失败: ${error.message}`, 'error');
  }
}

async function resumeTask() {
  try {
    const result = await client.task.resume();
    state.taskState = result;
    showToast('任务已继续', 'success');
    appendDmLog('任务已继续', 'info');
    renderAll();
  } catch (error) {
    showToast(`继续失败: ${error.message}`, 'error');
  }
}

async function stopTask() {
  try {
    await client.task.stop();
    showToast('任务已停止', 'info');
    appendDmLog('任务已停止', 'info');
  } catch (error) {
    showToast(`停止失败: ${error.message}`, 'error');
  }
}

// ═══════════════════════════════════════════
//  Settings
// ═══════════════════════════════════════════

async function saveSettings() {
  const httpProxy = document.getElementById('settings-http-proxy')?.value?.trim() || '';
  const delayMs = parseInt(document.getElementById('settings-delay-input')?.value, 10) || 20000;
  const warmupMinutes = parseInt(document.getElementById('settings-warmup-minutes')?.value, 10) ?? 10;
  const maxPerHour = parseInt(document.getElementById('settings-maxperhour-input')?.value, 10) || 10;
  const loginBatchSize = parseInt(document.getElementById('settings-batch-size')?.value, 10) || 3;

  try {
    await client.settings.save({ httpProxy, delayMs, warmupMinutes, maxPerHour, loginBatchSize });
    state.settings.httpProxy = httpProxy;
    state.settings.delayMs = delayMs;
    state.settings.warmupMinutes = warmupMinutes;
    state.settings.maxPerHour = maxPerHour;
    state.settings.loginBatchSize = loginBatchSize;
    showSettingsStatus('设置已保存', 'success');
  } catch (error) {
    showSettingsStatus(`保存失败: ${error.message}`, 'error');
  }
}

async function detectProxy() {
  const statusEl = document.getElementById('settings-proxy-status');
  if (statusEl) { statusEl.style.display = ''; statusEl.textContent = '检测中...'; statusEl.className = 'status-msg info'; }
  try {
    const result = await client.settings.detectProxy();
    if (result?.proxyUrl) {
      const input = document.getElementById('settings-http-proxy');
      if (input) input.value = result.proxyUrl;
      if (statusEl) { statusEl.textContent = `已检测到: ${result.proxyUrl} (${result.source})`; statusEl.className = 'status-msg success'; }
    } else {
      if (statusEl) { statusEl.textContent = '未检测到代理'; statusEl.className = 'status-msg error'; }
    }
  } catch (error) {
    if (statusEl) { statusEl.textContent = `检测失败: ${error.message}`; statusEl.className = 'status-msg error'; }
  }
}

async function importAccounts() {
  const textarea = document.getElementById('account-import-ta');
  const statusEl = document.getElementById('account-import-status');
  const btn = document.getElementById('account-import-btn2');

  const text = (textarea?.value || '').trim();
  if (!text) {
    if (statusEl) { statusEl.style.display = ''; statusEl.textContent = '请先粘贴账号数据'; statusEl.className = 'status-msg error'; }
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = '导入中...'; }
  if (statusEl) { statusEl.style.display = ''; statusEl.textContent = '正在导入...'; statusEl.className = 'status-msg info'; }

  try {
    const result = await client.accounts.importBatch(text);
    const saved = result.saved?.length || 0;
    const skipped = result.skipped?.length || 0;
    const errors = result.errors?.length || 0;
    let msg = `成功导入 ${saved} 个`;
    if (skipped > 0) msg += `，${skipped} 个跳过`;
    if (errors > 0) msg += `，${errors} 个失败`;

    if (statusEl) {
      statusEl.textContent = msg;
      statusEl.className = errors > 0 ? 'status-msg error' : 'status-msg success';
    }
    state.accounts = result.accounts || [];
    renderAccounts({ state });
    renderFilterTabs({ state });
    if (textarea) textarea.value = '';
    showToast(msg, errors > 0 ? 'error' : 'success');
  } catch (error) {
    if (statusEl) { statusEl.textContent = `导入失败: ${error.message}`; statusEl.className = 'status-msg error'; }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '批量导入'; }
  }
}

async function exportAccounts() {
  try {
    const result = await client.accounts.exportAccounts();
    const output = document.getElementById('export-accounts-output');
    if (output) output.value = result.text || '';
    if (result.text) {
      showToast('账号已导出', 'success');
    } else {
      showToast('没有可导出的账号', 'info');
    }
  } catch (error) {
    showToast(`导出失败: ${error.message}`, 'error');
  }
}

function openPath(type) {
  const info = state.storageInfo;
  const p = type === 'config' ? info.configPath : info.userDataPath;
  if (p) client.settings.openPath(p).catch(() => {});
}

async function loadLogFiles() {
  try {
    const result = await client.settings.getLogPaths();
    state.logsDir = result?.logsDir || '';
    renderLogFiles(state.logsDir);
  } catch (_) {
    renderLogFiles('');
  }
}

async function openLogsDir() {
  const dir = state.logsDir;
  if (dir) {
    client.settings.openPath(dir).catch(() => {});
  }
}

function showSettingsStatus(msg, kind) {
  const el = document.getElementById('settings-status');
  if (!el) return;
  el.style.display = '';
  el.textContent = msg;
  el.className = `status-msg ${kind}`;
}

// ═══════════════════════════════════════════
//  Health Check
// ═══════════════════════════════════════════

/**
 * 解析槽位范围字符串，返回槽位数组
 * 支持: "1-5" → [1,2,3,4,5], "1,3,5" → [1,3,5], "1-3,7,10-12" → [1,2,3,7,10,11,12]
 */
function parseSlotRange(input) {
  const raw = (input || '').trim();
  if (!raw) return [];
  const slots = new Set();
  const parts = raw.split(/[,，\s]+/);
  for (const part of parts) {
    if (!part) continue;
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end) && start > 0 && end > 0) {
        const lo = Math.min(start, end);
        const hi = Math.max(start, end);
        for (let s = lo; s <= Math.min(hi, 50); s++) {
          slots.add(s);
        }
      }
    } else {
      const s = parseInt(part, 10);
      if (!isNaN(s) && s > 0 && s <= 50) slots.add(s);
    }
  }
  return Array.from(slots).sort((a, b) => a - b);
}

function clearHealthUI() {
  const scoreEl = document.getElementById('healthScore');
  if (scoreEl) { scoreEl.textContent = '...'; scoreEl.className = 'health-badge health-loading'; }
  const barEl = document.getElementById('healthBar');
  if (barEl) { barEl.style.width = '20%'; barEl.className = 'health-bar'; }
  document.getElementById('healthStatus') && (document.getElementById('healthStatus').textContent = '检测中...');
  document.getElementById('healthDetail') && (document.getElementById('healthDetail').innerHTML = '');
  document.getElementById('healthSummary') && (document.getElementById('healthSummary').innerHTML = '');
  document.getElementById('healthWarnings') && (document.getElementById('healthWarnings').innerHTML = '');
  document.getElementById('healthTips') && (document.getElementById('healthTips').innerHTML = '');
  document.getElementById('healthSignals') && (document.getElementById('healthSignals').innerHTML = '');
}

async function checkAccountHealth() {
  const slotInput = document.getElementById('health-slot-input');
  const slots = parseSlotRange(slotInput?.value);
  if (slots.length === 0) {
    showToast('请输入有效的槽位范围，如 1-5, 7, 10-12', 'error');
    return;
  }

  const btn = document.getElementById('checkHealthBtn');
  const allBtn = document.getElementById('checkHealthAllBtn');
  clearHealthUI();
  if (btn) { btn.disabled = true; btn.textContent = `检测中 0/${slots.length}...`; }
  if (allBtn) allBtn.disabled = true;

  const results = [];
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (btn) btn.textContent = `检测中 ${i + 1}/${slots.length}...`;
    document.getElementById('healthStatus') && (document.getElementById('healthStatus').textContent =
      `正在检测槽位 ${slot} (${i + 1}/${slots.length})...`);

    try {
      const result = await client.accounts.checkHealth(slot);
      results.push({ slot, ok: true, ...result });
    } catch (error) {
      results.push({ slot, ok: false, error: error.message });
    }

    // Brief pause between slots to avoid hammering
    if (i < slots.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  renderHealthResult(results);

  const okCount = results.filter(r => r.ok).length;
  const failCount = results.length - okCount;
  if (failCount === 0) {
    showToast(`${slots.length} 个槽位检测完成`, 'success');
  } else {
    showToast(`${slots.length} 个槽位: ${okCount} 成功, ${failCount} 失败`, failCount > 0 ? 'error' : 'success');
  }

  if (btn) { btn.disabled = false; btn.textContent = '检测健康'; }
  if (allBtn) allBtn.disabled = false;
}

async function checkAllOnlineHealth() {
  // Get all online accounts from sidebar state
  const onlineAccounts = (state.accounts || []).filter(a => a.loginState === 'online');
  if (onlineAccounts.length === 0) {
    showToast('没有在线账号', 'error');
    return;
  }

  // Fill the input with online slots
  const slotInput = document.getElementById('health-slot-input');
  if (slotInput) slotInput.value = onlineAccounts.map(a => a.slot).join(', ');

  // Run the check
  await checkAccountHealth();
}

// ═══════════════════════════════════════════
//  Beijing Clock
// ═══════════════════════════════════════════

function startBeijingClock() {
  const el = document.getElementById('beijing-clock');
  if (!el) return;

  const fmt = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });

  function tick() { el.textContent = fmt.format(new Date()); }
  tick();
  setInterval(tick, 1000);
}

// ═══════════════════════════════════════════
//  AI Auto-Reply
// ═══════════════════════════════════════════

async function startAutoReply() {
  try {
    const result = await client.autoReply.start();
    state.autoReplyStatus = result;
    showToast('自动回复已启动', 'success');
    appendDmLog('AI 自动回复引擎已启动', 'info');
    renderSettings({ state });
  } catch (error) {
    showToast(`启动失败: ${error.message}`, 'error');
  }
}

async function stopAutoReply() {
  try {
    await client.autoReply.stop();
    state.autoReplyStatus = { running: false };
    showToast('自动回复已停止', 'info');
    appendDmLog('AI 自动回复引擎已停止', 'info');
    renderSettings({ state });
  } catch (error) {
    showToast(`停止失败: ${error.message}`, 'error');
  }
}

async function saveAutoReplySettings() {
  try {
    const enabled = document.getElementById('auto-reply-enabled')?.checked || false;
    const baseUrl = document.getElementById('auto-reply-baseurl')?.value?.trim() || '';
    const apiKey = document.getElementById('auto-reply-apikey')?.value?.trim() || '';
    const model = document.getElementById('auto-reply-model')?.value?.trim() || '';
    const systemPrompt = document.getElementById('auto-reply-prompt')?.value?.trim() || '';
    const maxHourly = parseInt(document.getElementById('auto-reply-maxhourly')?.value, 10) || 20;
    const contextMsgs = parseInt(document.getElementById('auto-reply-context-msgs')?.value, 10) || 15;
    const accountDelayMin = parseInt(document.getElementById('auto-reply-account-delay-min')?.value, 10) || 5000;
    const accountDelayMax = parseInt(document.getElementById('auto-reply-account-delay-max')?.value, 10) || 5000;
    const friendDelayMin = parseInt(document.getElementById('auto-reply-friend-delay-min')?.value, 10) || 10000;
    const friendDelayMax = parseInt(document.getElementById('auto-reply-friend-delay-max')?.value, 10) || 10000;
    const timeoutMs = parseInt(document.getElementById('auto-reply-timeout')?.value, 10) || 30000;
    const retryAttempts = parseInt(document.getElementById('auto-reply-retry')?.value, 10) ?? 3;
    const temperature = parseFloat(document.getElementById('auto-reply-temperature')?.value) ?? 0.7;
    const maxTokens = parseInt(document.getElementById('auto-reply-max-tokens')?.value, 10) || 500;

    let providers = collectProvidersFromDom();

    const saved = await client.autoReply.saveSettings({
      autoReplyEnabled: enabled,
      autoReplyBaseUrl: baseUrl,
      autoReplyApiKey: apiKey,
      autoReplyModel: model,
      autoReplySystemPrompt: systemPrompt,
      autoReplyProviders: providers,
      autoReplyMaxHourly: maxHourly,
      autoReplyContextMessages: contextMsgs,
      autoReplyAccountDelayMinMs: accountDelayMin,
      autoReplyAccountDelayMaxMs: accountDelayMax,
      autoReplyFriendDelayMinMs: friendDelayMin,
      autoReplyFriendDelayMaxMs: friendDelayMax,
      autoReplyTimeoutMs: timeoutMs,
      autoReplyRetryAttempts: retryAttempts,
      autoReplyTemperature: temperature,
      autoReplyMaxTokens: maxTokens
    });

    state.settings = saved;
    showToast('AI 设置已保存', 'success');
    renderSettings({ state });
  } catch (error) {
    showToast(`保存失败: ${error.message}`, 'error');
  }
}

async function testAutoReply() {
  const input = document.getElementById('auto-reply-test-input')?.value?.trim();
  if (!input) {
    showToast('请输入测试消息', 'error');
    return;
  }

  const resultEl = document.getElementById('auto-reply-test-result');
  const btn = document.getElementById('auto-reply-test-btn');
  if (btn) { btn.disabled = true; btn.textContent = '测试中...'; }
  if (resultEl) { resultEl.style.display = ''; resultEl.textContent = '正在生成...'; resultEl.className = 'status-msg info'; }

  try {
    const result = await client.autoReply.testChat(input);
    if (resultEl) {
      const providerInfo = result.providerName ? ` [${result.providerName} / ${result.providerModel}]` : '';
      resultEl.textContent = `回复${providerInfo}: ${result.reply}`;
      resultEl.className = 'status-msg success';
    }
  } catch (error) {
    if (resultEl) {
      resultEl.textContent = `测试失败: ${error.message}`;
      resultEl.className = 'status-msg error';
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '测试'; }
  }
}

// ═══════════════════════════════════════════
//  AI Provider Pool
// ═══════════════════════════════════════════

function addProvider() {
  const providers = collectProvidersFromDom();
  providers.push({
    id: `provider_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    enabled: true,
    baseURL: '',
    apiKey: '',
    model: ''
  });
  renderProvidersList(providers);
}

// ═══════════════════════════════════════════
//  Per-slot Proxy Pool
// ═══════════════════════════════════════════

function addProxyPoolEntry() {
  const entries = collectProxyPoolEntriesFromDom();
  entries.push({
    id: `proxy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    enabled: true,
    url: '',
    bindings: ''
  });
  renderProxyPoolEntries(entries);
}

async function saveProxyPoolSettings() {
  try {
    const entries = collectProxyPoolEntriesFromDom();
    const enabled = document.getElementById('proxy-pool-enabled-toggle')?.checked || false;
    const saved = await client.settings.save({
      proxyPoolEnabled: enabled,
      proxyPoolEntries: entries
    });
    state.settings = saved;
    showToast('代理池设置已保存', 'success');
    renderSettings({ state });
  } catch (error) {
    showToast(`保存失败: ${error.message}`, 'error');
  }
}

// ═══════════════════════════════════════════
//  Chat Records (DM Panel)
// ═══════════════════════════════════════════

async function loadChatRecords(page = 1) {
  const limit = 20;
  try {
    const [recordsResult, statsResult] = await Promise.all([
      client.autoReply.records({ limit, offset: (page - 1) * limit }),
      client.autoReply.stats()
    ]);
    const records = recordsResult?.records || [];
    state.chatRecordsPage = page;
    renderChatRecords(records, statsResult, { page, limit, total: statsResult?.total || 0 });
  } catch (error) {
    showToast(`加载聊天记录失败: ${error.message}`, 'error');
  }
}

async function exportChatRecords() {
  try {
    const result = await client.autoReply.exportRecords();
    if (result?.path) {
      showToast(`聊天记录已导出到: ${result.path}`, 'success');
      if (result.count !== undefined) {
        appendDmLog(`导出 ${result.count} 条聊天记录 → ${result.path}`, 'info');
      }
    } else {
      showToast('导出完成', 'success');
    }
  } catch (error) {
    showToast(`导出失败: ${error.message}`, 'error');
  }
}

// ═══════════════════════════════════════════
//  Greeting Manager
// ═══════════════════════════════════════════

async function startGreeting() {
  try {
    await client.greeting.start();
    state.greetingRunning = true;
    showToast('问候管理已启动', 'success');
    renderGreetingStatus(state);
  } catch (error) {
    showToast(`启动失败: ${error.message}`, 'error');
  }
}

async function stopGreeting() {
  try {
    await client.greeting.stop();
    state.greetingRunning = false;
    showToast('问候管理已停止', 'info');
    renderGreetingStatus(state);
  } catch (error) {
    showToast(`停止失败: ${error.message}`, 'error');
  }
}

// ═══════════════════════════════════════════
//  Lark Bot
// ═══════════════════════════════════════════

async function startLarkBot() {
  try {
    await client.larkBot.start();
    state.larkBotRunning = true;
    showToast('飞书机器人已启动', 'success');
    renderSettings({ state });
  } catch (error) {
    showToast(`启动失败: ${error.message}`, 'error');
  }
}

async function stopLarkBot() {
  try {
    await client.larkBot.stop();
    state.larkBotRunning = false;
    state.larkBotConnected = false;
    showToast('飞书机器人已停止', 'info');
    renderSettings({ state });
  } catch (error) {
    showToast(`停止失败: ${error.message}`, 'error');
  }
}

async function saveLarkBotSettings() {
  try {
    const appId = document.getElementById('larkbot-appid')?.value?.trim() || '';
    const appSecret = document.getElementById('larkbot-secret')?.value?.trim() || '';
    const saved = await client.settings.save({ larkAppId: appId, larkAppSecret: appSecret });
    state.settings = saved;
    renderSettings({ state });
  } catch (error) {
    showToast(`保存飞书设置失败: ${error.message}`, 'error');
  }
}
