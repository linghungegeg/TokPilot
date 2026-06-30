export function createInitialState() {
  return {
    accounts: [],
    taskState: {
      status: 'idle',
      runId: null,
      queueIds: [],
      cursor: 0,
      delayMs: 20000,
      progress: { completed: 0, total: 0 },
      counts: { success: 0, failed: 0, rejected: 0, pending: 0 },
      lastOutcome: null,
      lastError: null
    },
    settings: {
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
      autoReplyTimeoutMs: 30000,
      autoReplyRetryAttempts: 3,
      autoReplyTemperature: 0.7,
      autoReplyMaxTokens: 500,
      autoReplyAccountDelayMinMs: 5000,
      autoReplyAccountDelayMaxMs: 5000,
      autoReplyFriendDelayMinMs: 10000,
      autoReplyFriendDelayMaxMs: 10000
    },
    appInfo: {
      name: 'TikTok全自动加好友',
      version: '1.0.0',
      description: 'TikTok全自动加好友',
      windowTitle: 'TikTok全自动加好友 v1.0.0'
    },
    storageInfo: {
      configPath: '',
      userDataPath: '',
      sessionDataPath: '',
      baseDir: '',
      encryptionMode: 'fallback'
    },
    activeSlot: null
  };
}

export function replaceSnapshot(state, snapshot) {
  state.accounts = snapshot.accounts;
  state.taskState = snapshot.taskState;
  state.settings = snapshot.settings;
  state.appInfo = snapshot.appInfo;
  state.storageInfo = snapshot.storageInfo;
}

export function mergeAccount(state, account) {
  const index = state.accounts.findIndex((item) => item.slot === account.slot);
  if (index === -1) {
    state.accounts.push(account);
  } else {
    state.accounts[index] = account;
  }
  state.accounts.sort((left, right) => left.slot - right.slot);
}

export function getActiveAccount(state) {
  if (!state.activeSlot) {
    return null;
  }
  return state.accounts.find((account) => account.slot === state.activeSlot) || createEmptyAccount(state.activeSlot);
}

export function createEmptyAccount(slot) {
  return {
    slot,
    tiktokUsername: '',
    tiktokPassword: '',
    outlookEmail: '',
    outlookPassword: '',
    totpSecret: '',
    authMode: 'password',
    email: '',
    hasPassword: false,
    hasToken: false,
    hasTotpSecret: false,
    status: 'empty',
    loginState: 'empty',
    loginHint: '',
    lastLoginError: null,
    sessionId: null,
    sessionCookies: null,
    profile: null,
    lastLoginAt: null,
    createdAt: null,
    updatedAt: null,
    isEmpty: true,
    tiktokWindowAttached: false,
    windowVisible: false
  };
}
