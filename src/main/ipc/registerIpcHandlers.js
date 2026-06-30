
const { IPC_CHANNELS } = require('../../shared/ipcChannels');
const { toIpcSuccess, toIpcFailure } = require('./ipcContract');
const { wrapOperationFailure } = require('./appIpcFacade');

function registerAppIpcHandlers(ipcMain, facade) {
  const handlers = {
    [IPC_CHANNELS.settings.get]: facade.settings.get,
    [IPC_CHANNELS.settings.save]: facade.settings.save,
    [IPC_CHANNELS.settings.detectProxy]: facade.settings.detectProxy,
    [IPC_CHANNELS.settings.appInfo]: facade.settings.appInfo,
    [IPC_CHANNELS.settings.storageInfo]: facade.settings.storageInfo,
    [IPC_CHANNELS.settings.revealStorage]: facade.settings.revealStorage,
    [IPC_CHANNELS.settings.getLogPaths]: facade.settings.getLogPaths,
    [IPC_CHANNELS.settings.openPath]: facade.settings.openPath,
    [IPC_CHANNELS.settings.browser.navigate]: facade.settings.browser.navigate,
    [IPC_CHANNELS.settings.browser.reload]: facade.settings.browser.reload,
    [IPC_CHANNELS.settings.browser.devTools]: facade.settings.browser.devTools,

    [IPC_CHANNELS.accounts.list]: facade.accounts.list,
    [IPC_CHANNELS.accounts.save]: facade.accounts.save,
    [IPC_CHANNELS.accounts.remove]: facade.accounts.remove,
    [IPC_CHANNELS.accounts.clearAll]: facade.accounts.clearAll,
    [IPC_CHANNELS.accounts.loginNow]: facade.accounts.loginNow,
    [IPC_CHANNELS.accounts.loginAll]: facade.accounts.loginAll,
    [IPC_CHANNELS.accounts.cancelBatch]: facade.accounts.cancelBatch,
    [IPC_CHANNELS.accounts.deduplicate]: facade.accounts.deduplicate,
    [IPC_CHANNELS.accounts.restoreSession]: facade.accounts.restoreSession,
    [IPC_CHANNELS.accounts.restoreAllSessions]: facade.accounts.restoreAllSessions,
    [IPC_CHANNELS.accounts.login]: facade.accounts.login,
    [IPC_CHANNELS.accounts.logout]: facade.accounts.logout,
    [IPC_CHANNELS.accounts.logoutAll]: facade.accounts.logoutAll,
    [IPC_CHANNELS.accounts.refresh]: facade.accounts.refresh,
    [IPC_CHANNELS.accounts.importBatch]: facade.accounts.importBatch,
    [IPC_CHANNELS.accounts.exportAccounts]: facade.accounts.exportAccounts,
    [IPC_CHANNELS.accounts.window.show]: facade.accounts.window.show,
    [IPC_CHANNELS.accounts.window.hide]: facade.accounts.window.hide,
    [IPC_CHANNELS.accounts.window.openDevTools]: facade.accounts.window.openDevTools,
    [IPC_CHANNELS.accounts.window.sendDm]: facade.accounts.window.sendDm,
    [IPC_CHANNELS.accounts.window.followUser]: facade.accounts.window.followUser,
    [IPC_CHANNELS.accounts.window.followBackAll]: facade.accounts.window.followBackAll,
    [IPC_CHANNELS.accounts.window.searchUsers]: facade.accounts.window.searchUsers,
    [IPC_CHANNELS.accounts.window.navigateTo]: facade.accounts.window.navigateTo,
    [IPC_CHANNELS.accounts.window.fillDmDraft]: facade.accounts.window.fillDmDraft,
    [IPC_CHANNELS.accounts.window.warmupSlot]: facade.accounts.window.warmupSlot,
    [IPC_CHANNELS.accounts.window.installBridge]: facade.accounts.window.installBridge,
    [IPC_CHANNELS.accounts.window.checkHealth]: facade.accounts.window.checkHealth,

    [IPC_CHANNELS.task.status]: facade.task.status,
    [IPC_CHANNELS.task.start]: facade.task.start,
    [IPC_CHANNELS.task.pause]: facade.task.pause,
    [IPC_CHANNELS.task.resume]: facade.task.resume,
    [IPC_CHANNELS.task.stop]: facade.task.stop,

    [IPC_CHANNELS.autoReply.status]: facade.autoReply.status,
    [IPC_CHANNELS.autoReply.start]: facade.autoReply.start,
    [IPC_CHANNELS.autoReply.stop]: facade.autoReply.stop,
    [IPC_CHANNELS.autoReply.settings]: facade.autoReply.settings,
    [IPC_CHANNELS.autoReply.saveSettings]: facade.autoReply.saveSettings,
    [IPC_CHANNELS.autoReply.testChat]: facade.autoReply.testChat,
    [IPC_CHANNELS.autoReply.records]: facade.autoReply.records,
    [IPC_CHANNELS.autoReply.pauseSlot]: facade.autoReply.pauseSlot,
    [IPC_CHANNELS.autoReply.resumeSlot]: facade.autoReply.resumeSlot,
    [IPC_CHANNELS.autoReply.exportRecords]: facade.autoReply.exportRecords,
    [IPC_CHANNELS.autoReply.stats]: facade.autoReply.stats,

    [IPC_CHANNELS.greeting.status]: facade.greeting.status,
    [IPC_CHANNELS.greeting.start]: facade.greeting.start,
    [IPC_CHANNELS.greeting.stop]: facade.greeting.stop,

    [IPC_CHANNELS.followUp.status]: facade.followUp.status,
    [IPC_CHANNELS.followUp.start]: facade.followUp.start,
    [IPC_CHANNELS.followUp.stop]: facade.followUp.stop,

    [IPC_CHANNELS.larkBot.status]: facade.larkBot.status,
    [IPC_CHANNELS.larkBot.start]: facade.larkBot.start,
    [IPC_CHANNELS.larkBot.stop]: facade.larkBot.stop
  };

  Object.entries(handlers).forEach(([channel, handler]) => {
    ipcMain.handle(channel, async (_event, payload) => {
      try {
        const data = await handler(payload);
        return toIpcSuccess(data);
      } catch (error) {
        return toIpcFailure(convertHandlerError(error, channel));
      }
    });
  });
}

function convertHandlerError(error, channel) {
  try {
    wrapOperationFailure(error, channel);
  } catch (wrappedError) {
    return wrappedError;
  }
  return error;
}

module.exports = {
  registerAppIpcHandlers
};
