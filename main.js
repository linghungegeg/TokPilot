const fs = require('fs');
const os = require('os');
const path = require('path');
const { app, BrowserWindow, ipcMain, shell, session, dialog, Menu } = require('electron');
const Store = require('electron-store');

const { IPC_EVENTS } = require('./src/shared/ipcChannels');
const { createAppIpcFacade } = require('./src/main/ipc/appIpcFacade');
const { registerAppIpcHandlers } = require('./src/main/ipc/registerIpcHandlers');
const { initLogger, createLogger } = require('./src/main/logger');
const { autoDetectProxy } = require('./src/main/proxyDetector');
const { ProxyPool } = require('./src/main/proxyPool');
const AccountManager = require('./src/main/accountManager');
const { TikTokPlatform } = require('./src/main/tiktokPlatform');
const TaskManager = require('./src/main/taskManager');
const { SmartCooldownStrategy } = require('./src/main/smartCooldown');
const { AutoReplyManager } = require('./src/main/autoReplyManager');
const GreetingManager = require('./src/main/greetingManager');
const { ProactiveFollowUp } = require('./src/main/proactiveFollowUp');
const LarkBot = require('./src/main/larkBot');
const { MAX_SLOTS } = require('./src/buildConfig');

const packageInfo = require('./package.json');

const isDev = process.env.NODE_ENV === 'development';
const APP_ID = 'com.tiktok.accountmanager';
const APP_DISPLAY_NAME = packageInfo.build?.productName || 'TikTok 全自动加好友';
const APP_ICON_PATH = path.join(__dirname, 'build', 'icon-app.ico');
const CHROMIUM_CACHE_DIR = path.join(os.tmpdir(), 'tiktok-chromium-cache');

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disk-cache-dir', CHROMIUM_CACHE_DIR);
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', 'default_public_interface_only');

let mainWindow = null;
let store = null;
let settings = null;
let proxyPool = null;
let accountManager = null;
let tiktokPlatform = null;
let taskManager = null;
let smartCooldown = null;
let autoReplyManager = null;
let greetingManager = null;
let proactiveFollowUp = null;
let larkBot = null;
let logger = null;
let storagePaths = null;

storagePaths = configureStoragePaths();

function configureStoragePaths() {
  const userDataPath = app.getPath('userData');
  const baseDir = path.join(userDataPath, 'data');
  const configPath = path.join(baseDir, 'config');

  try {
    fs.mkdirSync(configPath, { recursive: true });
  } catch (_error) {}

  return { baseDir, configPath, userDataPath };
}

function resolveStorageBaseDir() {
  return app.getPath('userData');
}

function initStore() {
  const configPath = path.join(storagePaths.configPath, 'tiktok-settings.json');
  store = new Store({ cwd: storagePaths.configPath, name: 'tiktok-settings' });
  settings = Object.assign({
    delayMs: 20000,
    httpProxy: '',
    warmupMinutes: 10,
    maxPerHour: 10,
    loginBatchSize: 3,
    proxyPoolEnabled: false,
    proxyPoolEntries: [],
    autoReplyEnabled: false,
    autoReplyBaseUrl: '',
    autoReplyApiKey: '',
    autoReplyModel: '',
    autoReplySystemPrompt: '',
    autoReplyProviders: [],
    autoReplyContextMessages: 15,
    autoReplyMaxHourly: 20,
    autoReplyAccountDelayMinMs: 5000,
    autoReplyAccountDelayMaxMs: 5000,
    autoReplyFriendDelayMinMs: 10000,
    autoReplyFriendDelayMaxMs: 10000,
    autoReplyTimeoutMs: 30000,
    autoReplyRetryAttempts: 3,
    autoReplyTemperature: 0.7,
    autoReplyMaxTokens: 500,
    greetingEnabled: false,
    greetingTemplates: [],
    greetingLanguage: '',
    larkBotEnabled: false,
    larkAppId: '',
    larkAppSecret: '',
    larkNotifyEnabled: false,
    larkNotifyLevel: 'abnormal',
    larkNotifyChatId: '',
    larkNotifyAtUser: ''
  }, store.store);
}

function getSettings() {
  return settings;
}

async function saveSettings(payload) {
  const prevProxy = String(settings.httpProxy || '').trim();
  Object.assign(settings, payload);
  try {
    store.set(settings);
  } catch (err) {
    logger.warn('settings.save', `写入配置失败: ${err.message}`);
  }

  const nextProxy = String(settings.httpProxy || '').trim();
  if (nextProxy !== prevProxy) {
    applyProxyToElectron(nextProxy);
  }

  if (proxyPool) {
    proxyPool.load(settings);
  }

  if (tiktokPlatform) {
    tiktokPlatform.setProxy(nextProxy);
  }

  if (accountManager && typeof payload.warmupMinutes === 'number') {
    accountManager.setWarmupMinutes(payload.warmupMinutes);
  }

  if (accountManager && typeof payload.loginBatchSize === 'number') {
    accountManager.setLoginBatchSize(payload.loginBatchSize);
  }

  return settings;
}

function applyProxyToElectron(proxyUrl) {
  const trimmed = (proxyUrl || '').trim();
  if (!trimmed) {
    if (logger) logger.info('main', '清除代理，使用直连');
    return;
  }
  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `http://${trimmed}`);
    const proxyRules = `${url.protocol.replace(':', '')}=${url.hostname}:${url.port || 80}`;
    app.commandLine.appendSwitch('proxy-server', proxyRules);
    if (logger) logger.info('main', `代理已设置: ${proxyRules}`);
  } catch (err) {
    if (logger) logger.warn('main', `代理 URL 解析失败: ${err.message}`);
  }
}

function getAppInfo() {
  return {
    name: APP_DISPLAY_NAME,
    version: packageInfo.version,
    description: packageInfo.description || '',
    windowTitle: `${APP_DISPLAY_NAME} v${packageInfo.version}`
  };
}

function getStorageInfo() {
  return {
    baseDir: storagePaths.baseDir,
    configPath: storagePaths.configPath,
    userDataPath: storagePaths.userDataPath,
    sessionDataPath: storagePaths.userDataPath,
    logsDir: path.join(storagePaths.baseDir, 'logs'),
    encryptionMode: 'fallback'
  };
}

function revealStorage() {
  const configFile = path.join(storagePaths.configPath, 'tiktok-settings.json');
  if (fs.existsSync(configFile)) {
    shell.showItemInFolder(configFile);
  } else {
    shell.openPath(storagePaths.configPath);
  }
  return getStorageInfo();
}

function getLogPaths() {
  const logsDir = path.join(storagePaths.baseDir, 'logs');
  return { logsDir };
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: `${APP_DISPLAY_NAME} v${packageInfo.version}`,
    icon: APP_ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true
    }
  });

  mainWindow.webContents.on('console-message', (_event, level, message) => {
    const prefix = level === 3 ? 'RENDERER-ERR' : 'RENDERER';
    console.log(`[${prefix}] ${message}`);
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile('index.html');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createFacade() {
  return createAppIpcFacade({
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
    smartCooldown,
    proxyPool,
    logger
  });
}

async function onWindowAllClosed() {
  if (process.platform !== 'darwin') {
    app.quit();
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  initLogger(storagePaths.baseDir);
  logger = createLogger('main');
  logger.info('main', `启动 ${APP_DISPLAY_NAME} v${packageInfo.version}`);

  initStore();

  proxyPool = new ProxyPool();
  proxyPool.load(settings);

  accountManager = new AccountManager(store);
  tiktokPlatform = new TikTokPlatform({ proxyPool });
  accountManager.setPlatform(tiktokPlatform);
  accountManager.setWarmupMinutes(settings.warmupMinutes ?? 10);
  accountManager.setLoginBatchSize(settings.loginBatchSize ?? 3);

  taskManager = new TaskManager({ store, accountManager, tiktokPlatform, logger });
  smartCooldown = new SmartCooldownStrategy({ accountManager, logger });
  accountManager.setCooldownStrategy(smartCooldown);

  autoReplyManager = new AutoReplyManager({
    accountManager,
    tiktokPlatform,
    getSettings,
    baseDir: storagePaths.baseDir,
    logger: createLogger('autoReply')
  });

  greetingManager = new GreetingManager({
    tiktokPlatform,
    accountManager,
    getSettings,
    store: autoReplyManager.store,
    logger: createLogger('greeting')
  });

  proactiveFollowUp = new ProactiveFollowUp({
    tiktokPlatform,
    accountManager,
    store: autoReplyManager.store,
    getSettings,
    logger: createLogger('followup')
  });

  larkBot = new LarkBot({
    getSettings,
    logger: createLogger('larkBot'),
    commandHandler: async (cmd, args) => {
      if (cmd === '/status') {
        const arStatus = autoReplyManager ? autoReplyManager.getStatus() : {};
        const activeSlots = accountManager ? accountManager.getOnlineAccounts().length : 0;
        return `自动回复: ${arStatus.running ? '运行中' : '已停止'}\n在线账号: ${activeSlots}\n暂停槽位: ${JSON.stringify(arStatus.pausedSlots || [])}`;
      }
      if (cmd === '/stats') {
        const stats = autoReplyManager ? autoReplyManager.stats() : {};
        return `总记录: ${stats.total || 0}\n成功: ${stats.success || 0}\n失败: ${stats.failed || 0}`;
      }
      if (cmd === '/pause' && args[0]) {
        const slot = Number(args[0]);
        if (autoReplyManager) autoReplyManager.pauseSlot(slot);
        return `已暂停槽位 ${slot}`;
      }
      if (cmd === '/resume' && args[0]) {
        const slot = Number(args[0]);
        if (autoReplyManager) autoReplyManager.resumeSlot(slot);
        return `已恢复槽位 ${slot}`;
      }
      return `未知命令: ${cmd}`;
    }
  });

  accountManager.on('accounts-state', (accounts) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_EVENTS.accountsState, accounts);
    }
  });

  taskManager.on('task-state', (state) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_EVENTS.taskState, state);
    }
  });

  taskManager.on('task-progress', (payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_EVENTS.taskProgress, payload);
    }
    // 转发给招呼管理器
    if (greetingManager) {
      greetingManager.handleTaskProgress(payload).catch((err) => {
        console.error('[main] greetingManager.handleTaskProgress error:', err.message);
      });
    }
  });

  autoReplyManager.on('record', (record) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_EVENTS.autoReplyRecord, record);
    }
  });

  autoReplyManager.on('reply-success', (data) => {
    if (proactiveFollowUp) {
      proactiveFollowUp.analyzeConversation({
        accountSlot: data.accountSlot,
        channelId: data.channelId || data.friendId,
        friendId: data.friendId,
        messages: data.messages || [],
        aiReply: data.aiReply
      }).catch((err) => {
        console.error('[main] proactiveFollowUp.analyzeConversation error:', err.message);
      });
    }
  });

  // 启动问候管理和主动跟进（它们有独立定时器）
  greetingManager.start();
  proactiveFollowUp.start();
  if (settings.larkBotEnabled) {
    larkBot.start();
  }

  // 启动后自动恢复已保存的会话（静默，不弹窗）
  accountManager.restoreAllSessions().catch((err) => {
    console.error('[main] auto restore sessions error:', err.message);
  });

  if (settings.httpProxy) {
    applyProxyToElectron(settings.httpProxy);
    tiktokPlatform.setProxy(settings.httpProxy);
  }

  createMainWindow();

  const facade = createFacade();
  registerAppIpcHandlers(ipcMain, facade);

  app.on('window-all-closed', onWindowAllClosed);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });

  logger.info('main', 'Electron 壳启动完成');
});
