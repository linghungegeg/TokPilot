/**
 * TikTok 页面元素选择器配置
 * 多层选择器结构：primary + fallback，可远程更新
 */
const TIKTOK_SELECTORS = {
  // ── 登录页 ──
  login: {
    usernameInput: {
      primary: 'input[name="username"]',
      fallback: [
        'input[type="text"][autocomplete="username"]',
        'input[placeholder*="email" i]',
        'input[placeholder*="phone" i]',
        'input[placeholder*="username" i]'
      ]
    },
    passwordInput: {
      primary: 'input[type="password"]',
      fallback: [
        'input[placeholder*="password" i]',
        'input[autocomplete="current-password"]'
      ]
    },
    submitButton: {
      primary: '[data-e2e="login-button"]',
      fallback: [
        'button[type="submit"]',
        'button:has-text("Log in")'
      ]
    },
    verificationCodeInput: {
      primary: 'input[placeholder*="code" i]',
      fallback: [
        'input[name="code"]',
        'input[inputmode="numeric"][maxlength="6"]',
        'input[type="text"]:not([placeholder]):not([name="username"])'
      ]
    },
    captchaContainer: {
      primary: '#captcha-verify-image',
      fallback: [
        '.captcha_verify_img_slide',
        '[class*="captcha-verify"]',
        '[id*="captcha"]',
        'iframe[src*="captcha"]'
      ]
    }
  },

  // ── 导航栏 ──
  nav: {
    messageButton: {
      primary: 'a[href="/messages"]',
      fallback: [
        '[data-e2e="message-icon"]',
        'div[role="button"][aria-label*="message" i]'
      ]
    },
    notificationButton: {
      primary: 'a[href="/notifications"]',
      fallback: [
        '[data-e2e="notification-icon"]',
        'div[role="button"][aria-label*="notification" i]'
      ]
    },
    profileButton: {
      primary: 'a[href*="/@"]',
      fallback: [
        '[data-e2e="profile-icon"]',
        'div[role="button"][aria-label*="profile" i]'
      ]
    },
    searchInput: {
      primary: 'input[data-e2e="search-user-input"]',
      fallback: [
        'input[placeholder*="Search" i]',
        'input[type="search"]',
        'input[aria-label*="search" i]'
      ]
    }
  },

  // ── 用户主页 ──
  profile: {
    followButton: {
      primary: '[data-e2e="follow-button"]',
      fallback: [
        'button:has-text("Follow")',
        'button:has-text("关注")',
        '.css-1p5e7qn-DivFollowButton button',
        '[class*="follow" i] button'
      ]
    },
    followingButton: {
      primary: '[data-e2e="following-button"]',
      fallback: [
        'button:has-text("Following")',
        'button:has-text("正在关注")'
      ]
    },
    messageButton: {
      primary: '[data-e2e="message-button"]',
      fallback: [
        'button:has-text("Message")',
        'button:has-text("私信")',
        'a[href*="/messages"] button',
        '[class*="message" i] button'
      ]
    },
    usernameDisplay: {
      primary: '[data-e2e="user-title"]',
      fallback: [
        'h2[data-e2e="user-title"]',
        '[class*="shareTitle"] h2',
        'h2'
      ]
    },
    bioText: {
      primary: '[data-e2e="user-bio"]',
      fallback: ['h2 + div > span']
    }
  },

  // ── 私信页 ──
  dm: {
    chatInput: {
      primary: '[data-e2e="chat-input"]',
      fallback: [
        '[contenteditable="true"][role="textbox"]',
        '.DraftEditor-root [contenteditable="true"]',
        'div[data-e2e="dm-text-input"] div[contenteditable="true"]',
        '[class*="chat"] [contenteditable="true"]',
        '[class*="message"] [contenteditable="true"]'
      ]
    },
    sendButton: {
      primary: '[data-e2e="chat-send-button"]',
      fallback: [
        'button[type="submit"]',
        'div[role="button"]:has(svg)',
        '[class*="send" i]'
      ]
    },
    conversationList: {
      primary: '[data-e2e="chat-list-item"]',
      fallback: [
        '[class*="conversation"]',
        '[class*="chat-item"]'
      ]
    },
    messageBubble: {
      primary: '[data-e2e="chat-message"]',
      fallback: [
        '[class*="message-bubble"]',
        '[class*="chat-message"]'
      ]
    }
  },

  // ── 搜索结果页 ──
  search: {
    userResultCard: {
      primary: '[data-e2e="search-user-item"]',
      fallback: [
        '[class*="search-result"] a[href*="/@"]',
        '[data-e2e="search-result-item"]'
      ]
    },
    userLink: {
      primary: 'a[href*="/@"]',
      fallback: ['a[href*="user"]']
    }
  },

  // ── 通知页 ──
  notification: {
    followBackButton: {
      primary: 'button:has-text("Follow back")',
      fallback: [
        'button:has-text("回关")',
        '[data-e2e="follow-back-button"]',
        '[class*="follow-back"] button'
      ]
    },
    notificationItem: {
      primary: '[data-e2e="notification-item"]',
      fallback: [
        '[class*="notification-item"]',
        '[class*="inbox-item"]'
      ]
    }
  },

  // ── For You 视频页 ──
  foryou: {
    videoContainer: {
      primary: '[data-e2e="feed-video"]',
      fallback: [
        '[class*="video-container"]',
        '[class*="feed-item"]',
        'video'
      ]
    },
    likeButton: {
      primary: '[data-e2e="like-button"]',
      fallback: [
        'button[aria-label*="like" i]',
        'span[data-e2e="like-icon"]'
      ]
    },
    commentInput: {
      primary: '[data-e2e="comment-input"]',
      fallback: [
        'div[contenteditable="true"][data-e2e="comment-box"]',
        '[class*="comment"] [contenteditable="true"]'
      ]
    },
    followButtonOnVideo: {
      primary: '[data-e2e="follow-button"]',
      fallback: [
        'button:has-text("Follow")',
        'button:has-text("关注")'
      ]
    }
  },

  // ── 通用弹窗/错误 ──
  general: {
    errorMessage: {
      primary: '[data-e2e="error-msg"]',
      fallback: [
        '[role="alert"]',
        '.error-message',
        '[class*="error"]',
        '[class*="server-error"]',
        '.tux-notification'
      ]
    },
    modalClose: {
      primary: '[data-e2e="modal-close-button"]',
      fallback: [
        '[aria-label="Close"]',
        'button:has(svg.close-icon)',
        '.modal button:first-child'
      ]
    },
    loadingSpinner: {
      primary: '[data-e2e="spinner"]',
      fallback: [
        '[class*="spinner"]',
        '[class*="loading"]',
        'svg[class*="rotate"]'
      ]
    }
  }
};

// ── Page state detection ──
function detectPageState() {
  const url = window.location.href;
  const bodyText = (document.body?.innerText || '').toLowerCase();

  if (url.includes('/login')) return 'login_page';
  if (url.includes('/foryou') || url.includes('/following')) return 'authenticated';
  if (url.includes('/@') && !url.includes('/video')) return 'profile_page';
  if (url.includes('/messages')) return 'dm_page';
  if (url.includes('/search')) return 'search_page';
  if (url.includes('/notifications')) return 'notification_page';
  if (url.includes('/video')) return 'video_page';
  if (document.cookie.indexOf('sessionid') !== -1) return 'authenticated';

  // Text-based fallback
  if (bodyText.includes('log in') || bodyText.includes('登录')) return 'login_page';

  return 'unknown';
}

function looksLikeAuthenticated() {
  const state = detectPageState();
  if (state === 'authenticated' || state === 'profile_page' || state === 'dm_page') return true;
  return document.cookie.indexOf('sessionid') !== -1;
}

function looksLikeLoginPage() {
  return detectPageState() === 'login_page';
}

module.exports = {
  TIKTOK_SELECTORS,
  detectPageState,
  looksLikeAuthenticated,
  looksLikeLoginPage
};
