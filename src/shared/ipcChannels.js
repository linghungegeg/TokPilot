
const IPC_CHANNELS = Object.freeze({
  settings: Object.freeze({
    get: 'settings.get',
    save: 'settings.save',
    detectProxy: 'settings.detectProxy',
    appInfo: 'settings.appInfo',
    storageInfo: 'settings.storageInfo',
    openPath: 'settings.openPath',
    revealStorage: 'settings.revealStorage',
    getLogPaths: 'settings.getLogPaths',
    browser: Object.freeze({
      navigate: 'settings.browser.navigate',
      reload: 'settings.browser.reload',
      devTools: 'settings.browser.devTools'
    })
  }),
  accounts: Object.freeze({
    list: 'accounts.list',
    save: 'accounts.save',
    remove: 'accounts.remove',
    clearAll: 'accounts.clearAll',
    loginNow: 'accounts.loginNow',
    loginAll: 'accounts.loginAll',
    cancelBatch: 'accounts.cancelBatch',
    deduplicate: 'accounts.deduplicate',
    restoreSession: 'accounts.restoreSession',
    restoreAllSessions: 'accounts.restoreAllSessions',
    login: 'accounts.login',
    logout: 'accounts.logout',
    logoutAll: 'accounts.logoutAll',
    refresh: 'accounts.refresh',
    importBatch: 'accounts.importBatch',
    exportAccounts: 'accounts.exportAccounts',
    window: Object.freeze({
      show: 'accounts.window.show',
      hide: 'accounts.window.hide',
      openDevTools: 'accounts.window.openDevTools',
      sendDm: 'accounts.window.sendDm',
      followUser: 'accounts.window.followUser',
      followBackAll: 'accounts.window.followBackAll',
      searchUsers: 'accounts.window.searchUsers',
      navigateTo: 'accounts.window.navigateTo',
      fillDmDraft: 'accounts.window.fillDmDraft',
      warmupSlot: 'accounts.window.warmupSlot',
      installBridge: 'accounts.window.installBridge',
      checkHealth: 'accounts.window.checkHealth'
    })
  }),
  task: Object.freeze({
    status: 'task.status',
    start: 'task.start',
    pause: 'task.pause',
    resume: 'task.resume',
    stop: 'task.stop'
  }),
  autoReply: Object.freeze({
    status: 'autoReply.status',
    start: 'autoReply.start',
    stop: 'autoReply.stop',
    settings: 'autoReply.settings',
    saveSettings: 'autoReply.saveSettings',
    testChat: 'autoReply.testChat',
    records: 'autoReply.records',
    exportRecords: 'autoReply.exportRecords',
    stats: 'autoReply.stats',
    pauseSlot: 'autoReply.pauseSlot',
    resumeSlot: 'autoReply.resumeSlot'
  }),
  greeting: Object.freeze({
    status: 'greeting.status',
    start: 'greeting.start',
    stop: 'greeting.stop'
  }),
  followUp: Object.freeze({
    status: 'followUp.status',
    start: 'followUp.start',
    stop: 'followUp.stop'
  }),
  larkBot: Object.freeze({
    status: 'larkBot.status',
    start: 'larkBot.start',
    stop: 'larkBot.stop'
  })
});

const IPC_EVENTS = Object.freeze({
  accountsState: 'accounts-state',
  taskProgress: 'task-progress',
  taskState: 'task-state',
  proxyDetected: 'proxy-detected',
  autoReplyRecord: 'autoReply-record',
  autoReplyState: 'autoReply-state'
});

module.exports = {
  IPC_CHANNELS,
  IPC_EVENTS
};
