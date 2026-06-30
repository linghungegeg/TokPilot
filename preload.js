const { contextBridge, ipcRenderer } = require('electron');
const { IPC_CHANNELS, IPC_EVENTS } = require('./src/shared/ipcChannels');
const { MAX_SLOTS } = require('./src/buildConfig');
const BUILD_VARIANT = require('./src/buildVariant');

function buildInvokeTree(channelTree) {
  return Object.fromEntries(
    Object.entries(channelTree).map(([key, value]) => {
      if (typeof value === 'string') {
        return [key, (payload) => invoke(value, payload)];
      }
      return [key, buildInvokeTree(value)];
    })
  );
}

function invoke(channel, payload) {
  return ipcRenderer.invoke(channel, payload);
}

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

const appAPI = {
  ...buildInvokeTree(IPC_CHANNELS),
  onAccountsState: (callback) => subscribe(IPC_EVENTS.accountsState, callback),
  onTaskProgress: (callback) => subscribe(IPC_EVENTS.taskProgress, callback),
  onTaskState: (callback) => subscribe(IPC_EVENTS.taskState, callback),
  onProxyDetected: (callback) => subscribe(IPC_EVENTS.proxyDetected, callback),
  onAutoReplyRecord: (callback) => subscribe(IPC_EVENTS.autoReplyRecord, callback),
  onAutoReplyState: (callback) => subscribe(IPC_EVENTS.autoReplyState, callback)
};

contextBridge.exposeInMainWorld('appAPI', appAPI);
contextBridge.exposeInMainWorld('buildConfig', { MAX_SLOTS, BUILD_VARIANT });
