export function createAppApiClient(appAPI = window.appAPI) {
  return Object.freeze({
    settings: Object.freeze({
      get: () => unwrap(appAPI.settings.get()),
      save: (payload) => unwrap(appAPI.settings.save(payload)),
      detectProxy: () => unwrap(appAPI.settings.detectProxy()),
      appInfo: () => unwrap(appAPI.settings.appInfo()),
      storageInfo: () => unwrap(appAPI.settings.storageInfo()),
      revealStorage: () => unwrap(appAPI.settings.revealStorage()),
      getLogPaths: () => unwrap(appAPI.settings.getLogPaths()),
      openPath: (path) => unwrap(appAPI.settings.openPath({ path })),
      browser: Object.freeze({
        navigate: (url) => unwrap(appAPI.settings.browser.navigate({ url })),
        reload: () => unwrap(appAPI.settings.browser.reload()),
        devTools: () => unwrap(appAPI.settings.browser.devTools())
      })
    }),
    accounts: Object.freeze({
      list: () => unwrap(appAPI.accounts.list()),
      save: (payload) => unwrap(appAPI.accounts.save(payload)),
      remove: (slot) => unwrap(appAPI.accounts.remove({ slot })),
      clearAll: () => unwrap(appAPI.accounts.clearAll()),
      loginNow: (slot) => unwrap(appAPI.accounts.loginNow({ slot })),
      loginAll: () => unwrap(appAPI.accounts.loginAll()),
      cancelBatch: () => unwrap(appAPI.accounts.cancelBatch()),
      deduplicate: () => unwrap(appAPI.accounts.deduplicate()),
      restoreSession: (slot) => unwrap(appAPI.accounts.restoreSession({ slot })),
      restoreAllSessions: () => unwrap(appAPI.accounts.restoreAllSessions()),
      login: (slot) => unwrap(appAPI.accounts.login({ slot })),
      logout: (slot) => unwrap(appAPI.accounts.logout({ slot })),
      logoutAll: () => unwrap(appAPI.accounts.logoutAll()),
      refresh: (slot) => unwrap(appAPI.accounts.refresh({ slot })),
      importBatch: (text) => unwrap(appAPI.accounts.importBatch({ text })),
      exportAccounts: () => unwrap(appAPI.accounts.exportAccounts()),
      showWindow: (slot) => unwrap(appAPI.accounts.window.show({ slot })),
      hideWindow: (slot) => unwrap(appAPI.accounts.window.hide({ slot })),
      openDevTools: (slot) => unwrap(appAPI.accounts.window.openDevTools({ slot })),
      sendDm: (slot, message) => unwrap(appAPI.accounts.window.sendDm({ slot, message })),
      followUser: (slot) => unwrap(appAPI.accounts.window.followUser({ slot })),
      followBackAll: (slot) => unwrap(appAPI.accounts.window.followBackAll({ slot })),
      searchUsers: (slot, keyword) => unwrap(appAPI.accounts.window.searchUsers({ slot, keyword })),
      navigateTo: (slot, page) => unwrap(appAPI.accounts.window.navigateTo({ slot, page })),
      fillDmDraft: (slot, message) => unwrap(appAPI.accounts.window.fillDmDraft({ slot, message })),
      warmupSlot: (slot, minutes) => unwrap(appAPI.accounts.window.warmupSlot({ slot, minutes })),
      installBridge: (slot) => unwrap(appAPI.accounts.window.installBridge({ slot })),
      checkHealth: (slot) => unwrap(appAPI.accounts.window.checkHealth({ slot }))
    }),
    task: Object.freeze({
      status: () => unwrap(appAPI.task.status()),
      start: (payload) => unwrap(appAPI.task.start(payload)),
      pause: () => unwrap(appAPI.task.pause()),
      resume: () => unwrap(appAPI.task.resume()),
      stop: () => unwrap(appAPI.task.stop())
    }),
    autoReply: Object.freeze({
      status: () => unwrap(appAPI.autoReply.status()),
      start: () => unwrap(appAPI.autoReply.start()),
      stop: () => unwrap(appAPI.autoReply.stop()),
      settings: () => unwrap(appAPI.autoReply.settings()),
      saveSettings: (payload) => unwrap(appAPI.autoReply.saveSettings(payload)),
      testChat: (message) => unwrap(appAPI.autoReply.testChat({ message })),
      records: (payload) => unwrap(appAPI.autoReply.records(payload || {})),
      exportRecords: () => unwrap(appAPI.autoReply.exportRecords()),
      stats: () => unwrap(appAPI.autoReply.stats()),
      pauseSlot: (slot) => unwrap(appAPI.autoReply.pauseSlot({ slot })),
      resumeSlot: (slot) => unwrap(appAPI.autoReply.resumeSlot({ slot }))
    }),
    greeting: Object.freeze({
      status: () => unwrap(appAPI.greeting.status()),
      start: () => unwrap(appAPI.greeting.start()),
      stop: () => unwrap(appAPI.greeting.stop())
    }),
    followUp: Object.freeze({
      status: () => unwrap(appAPI.followUp.status()),
      start: () => unwrap(appAPI.followUp.start()),
      stop: () => unwrap(appAPI.followUp.stop())
    }),
    larkBot: Object.freeze({
      status: () => unwrap(appAPI.larkBot.status()),
      start: () => unwrap(appAPI.larkBot.start()),
      stop: () => unwrap(appAPI.larkBot.stop())
    }),
    onAccountsState: (callback) => appAPI.onAccountsState(callback),
    onTaskProgress: (callback) => appAPI.onTaskProgress(callback),
    onTaskState: (callback) => appAPI.onTaskState(callback),
    onProxyDetected: (callback) => appAPI.onProxyDetected(callback),
    onAutoReplyRecord: (callback) => appAPI.onAutoReplyRecord(callback),
    onAutoReplyState: (callback) => appAPI.onAutoReplyState(callback)
  });
}

async function unwrap(promise) {
  const result = await promise;
  if (result.success) {
    return result.data;
  }

  const failure = (result);
  const error = (
    new Error(failure.error?.message || '操作失败')
  );
  error.code = failure.error?.code || 'IPC_ERROR';
  error.details = failure.error?.details || null;
  throw error;
}
