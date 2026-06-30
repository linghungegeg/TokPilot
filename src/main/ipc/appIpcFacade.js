
const {
  createValidationError,
  createTaskLockedError,
  createOperationFailedError
} = require('./ipcContract');

function createAppIpcFacade(deps) {
  const {
    getSettings,
    saveSettings,
    getAppInfo,
    getStorageInfo,
    revealStorage,
    getLogPaths,
    accountManager,
    tiktokPlatform,
    taskManager,
    autoReplyManager,
    greetingManager,
    proactiveFollowUp,
    larkBot,
    proxyPool
  } = deps;

  const log = deps.logger || { call: () => {}, ok: () => {}, fail: () => {}, warn: () => {}, info: () => {} };

  return {
    settings: {
      get: async () => getSettings(),
      save: async (payload) => await saveSettings(payload || {}),
      detectProxy: async () => {
        const { autoDetectProxy } = require('../proxyDetector');
        return await autoDetectProxy();
      },
      appInfo: async () => getAppInfo(),
      storageInfo: async () => getStorageInfo(),
      revealStorage: async () => revealStorage(),
      getLogPaths: async () => getLogPaths(),
      openPath: async (payload) => {
        const { shell } = require('electron');
        const path = require('path');
        const targetPath = typeof payload?.path === 'string' ? payload.path : '';
        const allowedPaths = buildAllowedOpenPaths(getStorageInfo, getLogPaths);
        const resolvedPath = path.resolve(targetPath);
        const allowed = allowedPaths.some((allowedPath) => isPathInside(resolvedPath, allowedPath));
        if (!allowed) {
          throw createValidationError('只能打开应用数据或日志目录内的路径。', { field: 'path' });
        }
        return shell.openPath(resolvedPath);
      },
      browser: {
        navigate: async (payload) => {
          const { BrowserWindow } = require('electron');
          const url = normalizeAllowedBrowserUrl(payload?.url);
          const win = BrowserWindow.getFocusedWindow();
          if (win) await win.loadURL(url);
        },
        reload: async () => {
          const { BrowserWindow } = require('electron');
          const win = BrowserWindow.getFocusedWindow();
          if (win) win.webContents.reload();
        },
        devTools: async () => {
          const { BrowserWindow } = require('electron');
          const win = BrowserWindow.getFocusedWindow();
          if (win) win.webContents.openDevTools();
        }
      }
    },
    accounts: {
      list: async () => accountManager ? accountManager.listPublicAccounts() : [],
      save: async (payload) => {
        if (!accountManager) throw createOperationFailedError('账号管理未初始化。', { operation: 'accounts' });
        const slot = payload?.slot;
        if (!slot || slot < 1) throw createValidationError('账号槽位编号无效。', { field: 'slot' });
        log.call('accounts.save', { slot, tiktokUsername: payload?.tiktokUsername });
        const result = await accountManager.saveAccount(payload || {});
        log.ok('accounts.save', null, { slot });
        return accountManager.toPublicAccount(result);
      },
      remove: async (payload) => {
        if (!accountManager) throw createOperationFailedError('账号管理未初始化。', { operation: 'accounts' });
        const slot = payload?.slot;
        if (!slot || slot < 1) throw createValidationError('账号槽位编号无效。', { field: 'slot' });
        log.call('accounts.remove', { slot });
        accountManager.removeAccount(slot);
        log.ok('accounts.remove', null, { slot });
        return accountManager.listPublicAccounts();
      },
      clearAll: async () => {
        if (!accountManager) throw createOperationFailedError('账号管理未初始化。', { operation: 'accounts' });
        log.call('accounts.clearAll');
        accountManager.clearAllAccounts();
        log.ok('accounts.clearAll');
        return accountManager.listPublicAccounts();
      },
      importBatch: async (payload) => {
        if (!accountManager) throw createOperationFailedError('账号管理未初始化。', { operation: 'accounts' });
        const text = typeof payload?.text === 'string' ? payload.text : (payload?.entries || '');
        if (!text) throw createValidationError('没有可导入的账号数据。', { field: 'text' });
        log.call('accounts.importBatch', { lineCount: text.split(/\r?\n/).filter(Boolean).length });
        const result = accountManager.importAccounts(text);
        log.ok('accounts.importBatch', null, { saved: result.saved.length, skipped: result.skipped.length, errors: result.errors.length });
        return {
          ...result,
          accounts: accountManager.listPublicAccounts()
        };
      },
      loginNow: async (payload) => {
        if (!accountManager) throw createOperationFailedError('账号管理未初始化。', { operation: 'accounts' });
        const slot = payload?.slot;
        if (!slot || slot < 1) throw createValidationError('账号槽位编号无效。', { field: 'slot' });
        log.call('accounts.loginNow', { slot });
        const result = await accountManager.loginAccount(slot);
        log.ok('accounts.loginNow', null, { slot, loginState: result?.loginState });
        return accountManager.toPublicAccount(result);
      },
      loginAll: async (_payload) => {
        if (!accountManager) throw createOperationFailedError('账号管理未初始化。', { operation: 'accounts' });
        log.call('accounts.loginAll');
        const result = await accountManager.loginAll();
        log.ok('accounts.loginAll', null, { online: result.online, failed: result.failed });
        return { ...result, accounts: accountManager.listPublicAccounts() };
      },
      cancelBatch: async (_payload) => {
        if (!accountManager) throw createOperationFailedError('账号管理未初始化。', { operation: 'accounts' });
        log.call('accounts.cancelBatch');
        accountManager.cancelBatchOperation();
        log.ok('accounts.cancelBatch');
        return { cancelled: true };
      },
      deduplicate: async (_payload) => {
        if (!accountManager) throw createOperationFailedError('账号管理未初始化。', { operation: 'accounts' });
        log.call('accounts.deduplicate');
        const result = accountManager.deduplicateAccounts();
        log.ok('accounts.deduplicate', null, { removed: result.removed.length });
        return { ...result, accounts: accountManager.listPublicAccounts() };
      },
      login: async (payload) => {
        if (!accountManager) throw createOperationFailedError('账号管理未初始化。', { operation: 'accounts' });
        const slot = payload?.slot;
        if (!slot || slot < 1) throw createValidationError('账号槽位编号无效。', { field: 'slot' });
        log.call('accounts.login', { slot });
        const result = await accountManager.loginAccount(slot);
        log.ok('accounts.login', null, { slot, loginState: result?.loginState });
        return accountManager.toPublicAccount(result);
      },
      restoreSession: async (payload) => {
        if (!accountManager) throw createOperationFailedError('账号管理未初始化。', { operation: 'accounts' });
        const slot = payload?.slot;
        if (!slot || slot < 1) throw createValidationError('账号槽位编号无效。', { field: 'slot' });
        log.call('accounts.restoreSession', { slot });
        const result = await accountManager.restoreSession(slot);
        log.ok('accounts.restoreSession', null, { slot, loginState: result?.loginState });
        return accountManager.toPublicAccount(result);
      },
      restoreAllSessions: async (_payload) => {
        if (!accountManager) throw createOperationFailedError('账号管理未初始化。', { operation: 'accounts' });
        log.call('accounts.restoreAllSessions');
        const results = await accountManager.restoreAllSessions();
        log.ok('accounts.restoreAllSessions', null, { count: results.length });
        return { restored: results.length, accounts: accountManager.listPublicAccounts() };
      },
      logout: async (payload) => {
        if (!accountManager) throw createOperationFailedError('账号管理未初始化。', { operation: 'accounts' });
        const slot = payload?.slot;
        if (!slot || slot < 1) throw createValidationError('账号槽位编号无效。', { field: 'slot' });
        log.call('accounts.logout', { slot });
        const result = accountManager.logout(slot);
        log.ok('accounts.logout', null, { slot });
        return accountManager.toPublicAccount(result);
      },
      logoutAll: async (_payload) => {
        if (!accountManager) throw createOperationFailedError('账号管理未初始化。', { operation: 'accounts' });
        log.call('accounts.logoutAll');
        const results = accountManager.logoutAll();
        log.ok('accounts.logoutAll', null, { count: results.length });
        return { loggedOut: results.length, accounts: accountManager.listPublicAccounts() };
      },
      refresh: async (payload) => {
        if (!accountManager) throw createOperationFailedError('账号管理未初始化。', { operation: 'accounts' });
        const slot = payload?.slot;
        if (!slot || slot < 1) throw createValidationError('账号槽位编号无效。', { field: 'slot' });
        log.call('accounts.refresh', { slot });
        const result = await accountManager.refreshAccount(slot);
        log.ok('accounts.refresh', null, { slot });
        return accountManager.toPublicAccount(result);
      },
      exportAccounts: async (_payload) => {
        if (!accountManager) throw createOperationFailedError('账号管理未初始化。', { operation: 'accounts' });
        const text = accountManager.exportAccounts();
        return { text };
      },
      window: {
        show: async (payload) => {
          if (tiktokPlatform) tiktokPlatform.showWindow(payload?.slot);
        },
        hide: async (payload) => {
          if (tiktokPlatform) tiktokPlatform.hideWindow(payload?.slot);
        },
        openDevTools: async (payload) => {
          if (tiktokPlatform) {
            const ctrl = tiktokPlatform.getController(payload?.slot);
            if (ctrl && !ctrl.isDestroyed()) ctrl.browserWindow.webContents.openDevTools();
          }
        },
        sendDm: async (payload) => {
          if (!tiktokPlatform) throw createOperationFailedError('平台未初始化。', { operation: 'sendDm' });
          log.call('sendDm', { slot: payload?.slot });
          const result = await tiktokPlatform.sendDm(payload?.slot, payload?.message || '');
          log.ok('sendDm');
          return result;
        },
        followUser: async (payload) => {
          if (!tiktokPlatform) throw createOperationFailedError('平台未初始化。', { operation: 'followUser' });
          log.call('followUser', { slot: payload?.slot });
          const result = await tiktokPlatform.followUser(payload?.slot);
          log.ok('followUser');
          return result;
        },
        followBackAll: async (payload) => {
          if (!tiktokPlatform) throw createOperationFailedError('平台未初始化。', { operation: 'followBackAll' });
          log.call('followBackAll', { slot: payload?.slot });
          const result = await tiktokPlatform.followBackAll(payload?.slot);
          log.ok('followBackAll', null, { followed: result?.followed });
          return result;
        },
        searchUsers: async (payload) => {
          if (!tiktokPlatform) throw createOperationFailedError('平台未初始化。', { operation: 'searchUsers' });
          log.call('searchUsers', { slot: payload?.slot, keyword: payload?.keyword });
          const result = await tiktokPlatform.searchUsers(payload?.slot, payload?.keyword || '');
          log.ok('searchUsers', null, { count: result?.count });
          return result;
        },
        navigateTo: async (payload) => {
          if (!tiktokPlatform) throw createOperationFailedError('平台未初始化。', { operation: 'navigateTo' });
          log.call('navigateTo', { slot: payload?.slot, page: payload?.page });
          await tiktokPlatform.navigateTo(payload?.slot, payload?.page || 'foryou');
          log.ok('navigateTo');
          return { navigated: true };
        },
        fillDmDraft: async (payload) => {
          if (!tiktokPlatform) throw createOperationFailedError('平台未初始化。', { operation: 'fillDmDraft' });
          log.call('fillDmDraft', { slot: payload?.slot });
          const result = await tiktokPlatform.fillDmDraft(payload?.slot, payload?.message || '');
          log.ok('fillDmDraft');
          return result;
        },
        warmupSlot: async (payload) => {
          if (!tiktokPlatform) throw createOperationFailedError('平台未初始化。', { operation: 'warmupSlot' });
          log.call('warmupSlot', { slot: payload?.slot, minutes: payload?.minutes });
          await tiktokPlatform.warmupSlot(payload?.slot, payload?.minutes || 5);
          log.ok('warmupSlot');
          return { warmed: true };
        },
        installBridge: async (payload) => {
          if (!tiktokPlatform) throw createOperationFailedError('平台未初始化。', { operation: 'installBridge' });
          const ok = await tiktokPlatform.installBridge(payload?.slot);
          return { installed: ok };
        },
        checkHealth: async (payload) => {
          if (!tiktokPlatform) throw createOperationFailedError('平台未初始化。', { operation: 'checkHealth' });
          log.call('checkHealth', { slot: payload?.slot });
          const result = await tiktokPlatform.checkHealth(payload?.slot);
          log.ok('checkHealth', null, { slot: payload?.slot, score: result?.health?.score });
          return result;
        }
      }
    },
    task: {
      status: async () => taskManager ? taskManager.getState() : { status: 'idle' },
      start: async (payload) => {
        if (!taskManager) throw createOperationFailedError('任务管理未初始化。', { operation: 'task' });
        return taskManager.start(payload || {});
      },
      pause: async () => {
        if (!taskManager) throw createOperationFailedError('任务管理未初始化。', { operation: 'task' });
        return taskManager.pause();
      },
      resume: async () => {
        if (!taskManager) throw createOperationFailedError('任务管理未初始化。', { operation: 'task' });
        return taskManager.resume();
      },
      stop: async () => {
        if (!taskManager) throw createOperationFailedError('任务管理未初始化。', { operation: 'task' });
        return taskManager.stop();
      }
    },
    autoReply: {
      status: async () => autoReplyManager ? autoReplyManager.getStatus() : { running: false },
      start: async () => {
        if (!autoReplyManager) throw createOperationFailedError('自动回复未初始化。', { operation: 'autoReply' });
        log.call('autoReply.start');
        await autoReplyManager.start();
        log.ok('autoReply.start');
        return autoReplyManager.getStatus();
      },
      stop: async () => {
        if (!autoReplyManager) throw createOperationFailedError('自动回复未初始化。', { operation: 'autoReply' });
        log.call('autoReply.stop');
        await autoReplyManager.stop();
        log.ok('autoReply.stop');
        return autoReplyManager.getStatus();
      },
      settings: async () => getSettings(),
      saveSettings: async (payload) => {
        const settings = await saveSettings(payload || {});
        log.ok('autoReply.saveSettings');
        return settings;
      },
      testChat: async (payload) => {
        if (!autoReplyManager) throw createOperationFailedError('自动回复未初始化。', { operation: 'autoReply' });
        log.call('autoReply.testChat');
        const result = await autoReplyManager.testChat(payload?.message || '你好');
        log.ok('autoReply.testChat');
        return result;
      },
      records: async (payload) => {
        if (!autoReplyManager) throw createOperationFailedError('自动回复未初始化。', { operation: 'autoReply' });
        return autoReplyManager.listRecords(payload || {});
      },
      pauseSlot: async (payload) => {
        if (!autoReplyManager) throw createOperationFailedError('自动回复未初始化。', { operation: 'autoReply' });
        const slot = payload?.slot;
        if (!slot) throw createValidationError('账号槽位编号无效。', { field: 'slot' });
        autoReplyManager.pauseSlot(slot);
        return { pausedSlots: autoReplyManager.getStatus().pausedSlots };
      },
      resumeSlot: async (payload) => {
        if (!autoReplyManager) throw createOperationFailedError('自动回复未初始化。', { operation: 'autoReply' });
        const slot = payload?.slot;
        if (!slot) throw createValidationError('账号槽位编号无效。', { field: 'slot' });
        autoReplyManager.resumeSlot(slot);
        return { pausedSlots: autoReplyManager.getStatus().pausedSlots };
      },
      exportRecords: async () => {
        if (!autoReplyManager) throw createOperationFailedError('自动回复未初始化。', { operation: 'autoReply' });
        return autoReplyManager.exportRecords();
      },
      stats: async () => {
        if (!autoReplyManager) throw createOperationFailedError('自动回复未初始化。', { operation: 'autoReply' });
        return autoReplyManager.stats();
      }
    },
    greeting: {
      status: async () => greetingManager ? { running: !!greetingManager._retryTimer } : { running: false },
      start: async () => {
        if (!greetingManager) throw createOperationFailedError('问候管理未初始化。', { operation: 'greeting' });
        greetingManager.start();
        return { running: true };
      },
      stop: async () => {
        if (!greetingManager) throw createOperationFailedError('问候管理未初始化。', { operation: 'greeting' });
        greetingManager.stop();
        return { running: false };
      }
    },
    followUp: {
      status: async () => proactiveFollowUp ? { running: !!proactiveFollowUp._timer } : { running: false },
      start: async () => {
        if (!proactiveFollowUp) throw createOperationFailedError('主动跟进未初始化。', { operation: 'followUp' });
        proactiveFollowUp.start();
        return { running: true };
      },
      stop: async () => {
        if (!proactiveFollowUp) throw createOperationFailedError('主动跟进未初始化。', { operation: 'followUp' });
        proactiveFollowUp.stop();
        return { running: false };
      }
    },
    larkBot: {
      status: async () => larkBot ? larkBot.getStatus() : { connected: false, running: false },
      start: async () => {
        if (!larkBot) throw createOperationFailedError('飞书机器人未初始化。', { operation: 'larkBot' });
        larkBot.start();
        return larkBot.getStatus();
      },
      stop: async () => {
        if (!larkBot) throw createOperationFailedError('飞书机器人未初始化。', { operation: 'larkBot' });
        larkBot.stop();
        return larkBot.getStatus();
      }
    }
  };
}

function buildAllowedOpenPaths(getStorageInfo, getLogPaths) {
  const path = require('path');
  const storageInfo = typeof getStorageInfo === 'function' ? getStorageInfo() : {};
  const logPaths = typeof getLogPaths === 'function' ? getLogPaths() : {};
  return [
    storageInfo.baseDir,
    storageInfo.configPath,
    storageInfo.userDataPath,
    storageInfo.sessionDataPath,
    storageInfo.logsDir,
    logPaths.logsDir
  ]
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => path.resolve(value));
}

function isPathInside(targetPath, allowedPath) {
  const path = require('path');
  if (!targetPath || !allowedPath) return false;
  const relative = path.relative(allowedPath, targetPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function normalizeAllowedBrowserUrl(value) {
  if (!value) return 'https://www.tiktok.com';
  let url;
  try {
    url = new URL(value);
  } catch (_) {
    throw createValidationError('浏览器导航地址无效。', { field: 'url' });
  }
  if (url.protocol !== 'https:' || !isAllowedBrowserHost(url.hostname)) {
    throw createValidationError('只能导航到 TikTok 官方页面。', { field: 'url' });
  }
  return url.toString();
}

function isAllowedBrowserHost(hostname) {
  const normalizedHost = String(hostname || '').toLowerCase();
  return normalizedHost === 'tiktok.com' || normalizedHost.endsWith('.tiktok.com');
}

function wrapOperationFailure(error, operation) {
  if (error && typeof error === 'object') {
    const typedError = (error);
    if (typeof typedError.code === 'string') {
      throw error;
    }
  }

  if (error instanceof Error) {
    throw createOperationFailedError(error.message, { operation });
  }

  throw createOperationFailedError('操作失败。', { operation });
}

module.exports = {
  createAppIpcFacade,
  wrapOperationFailure
};
