const COOLDOWN_MS = 5 * 60 * 1000;
const WEEKLY_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CONSECUTIVE_CAPTCHA = 3;
const MAX_SPAM_STRIKES = 3;

class SmartCooldownStrategy {
  constructor({ accountManager, logger }) {
    this._am = accountManager;
    this._log = logger || { info: () => {}, warn: () => {}, error: () => {} };
    this.reset();
  }

  reset(startSlot = 1) {
    this._ordinal = 0;
    this._startSlot = Math.max(1, Number(startSlot) || 1);
    this._cooldownMap = new Map();
    this._weeklyCooldownMap = new Map();
    this._consecutiveCaptcha = new Map();
    this._spamStrikes = new Map();
    this._permanentExcluded = new Set();
  }

  onCaptcha(slot) {
    const s = this._normalizeSlot(slot);
    if (!s) return;

    const count = (this._consecutiveCaptcha.get(s) || 0) + 1;
    this._consecutiveCaptcha.set(s, count);

    if (count >= MAX_CONSECUTIVE_CAPTCHA) {
      this._permanentExcluded.add(s);
      this._cooldownMap.delete(s);
      this._log.info('smartCooldown', `TK${s} 连续 ${count} 次触发 CAPTCHA，永久排除`);
    } else {
      const until = Date.now() + COOLDOWN_MS;
      this._cooldownMap.set(s, until);
      this._log.info('smartCooldown', `TK${s} 第 ${count} 次 CAPTCHA，冷却 ${COOLDOWN_MS / 60000} 分钟`);
    }
  }

  onSuccess(slot) {
    const s = this._normalizeSlot(slot);
    if (!s) return;
    this._consecutiveCaptcha.delete(s);
    this._cooldownMap.delete(s);
  }

  onCaptchaClear(slot) {
    const s = this._normalizeSlot(slot);
    if (!s) return;
    this._consecutiveCaptcha.delete(s);
    this._cooldownMap.delete(s);
    this._permanentExcluded.delete(s);
    this._log.info('smartCooldown', `TK${s} CAPTCHA 已手动清除`);
  }

  onSpam(slot) {
    const s = this._normalizeSlot(slot);
    if (!s) return;

    const strikes = (this._spamStrikes.get(s) || 0) + 1;
    this._spamStrikes.set(s, strikes);

    if (strikes >= MAX_SPAM_STRIKES) {
      const until = Date.now() + WEEKLY_COOLDOWN_MS;
      this._weeklyCooldownMap.set(s, until);
      this._log.info('smartCooldown', `TK${s} 累计 ${strikes} 次风控，7 天冷却`);
    } else {
      this._log.info('smartCooldown', `TK${s} 第 ${strikes} 次风控（${MAX_SPAM_STRIKES - strikes} 次后触发周冷却）`);
    }
  }

  onSpamClear(slot) {
    const s = this._normalizeSlot(slot);
    if (!s) return;
    this._spamStrikes.delete(s);
    this._weeklyCooldownMap.delete(s);
    this._log.info('smartCooldown', `TK${s} 风控标记已清除`);
  }

  resolveSlot(request) {
    const now = Date.now();

    // Expire stale cooldowns
    for (const [slot, until] of this._cooldownMap) {
      if (now >= until) { this._cooldownMap.delete(slot); }
    }
    for (const [slot, until] of this._weeklyCooldownMap) {
      if (now >= until) {
        this._weeklyCooldownMap.delete(slot);
        this._spamStrikes.delete(slot);
      }
    }

    const slot = request.assignedSlot || request.slot;
    if (slot) {
      const account = this._am.accounts?.get(slot);
      if (!account || account.loginState !== 'online') {
        throw new Error(`TK${slot} 未在线，无法执行请求。`);
      }
      if (this._permanentExcluded.has(slot)) {
        throw new Error(`TK${slot} 多次触发人机验证，已被永久排除。`);
      }
      if (this._weeklyCooldownMap.has(slot)) {
        const remaining = Math.ceil((this._weeklyCooldownMap.get(slot) - now) / 3600000);
        throw new Error(`TK${slot} 处于周冷却中（剩余约 ${remaining} 小时）。`);
      }
      if (this._cooldownMap.has(slot)) {
        const remaining = Math.ceil((this._cooldownMap.get(slot) - now) / 1000);
        throw new Error(`TK${slot} 处于验证冷却中（剩余约 ${remaining} 秒）。`);
      }
      return { slot, account };
    }

    // Auto-assign: round-robin through online, non-excluded, non-cooldown slots
    const ordinal = this._ordinal++;
    const online = this._am.getOnlineAccounts ? this._am.getOnlineAccounts() : [];

    const candidates = online.filter((a) => {
      return !this._permanentExcluded.has(a.slot)
        && !this._cooldownMap.has(a.slot)
        && !this._weeklyCooldownMap.has(a.slot);
    });

    if (candidates.length === 0) {
      throw new Error('没有可用的在线账号（全部处于冷却或排除状态）。');
    }

    const picked = candidates[ordinal % candidates.length];
    return { slot: picked.slot, account: picked };
  }

  getProgress() {
    return {
      cooldownSlots: Array.from(this._cooldownMap.keys()),
      weeklyCooldownSlots: Array.from(this._weeklyCooldownMap.keys()),
      excludedSlots: Array.from(this._permanentExcluded)
    };
  }

  _normalizeSlot(slot) {
    const s = typeof slot === 'number' ? slot : Number.parseInt(slot, 10);
    return Number.isInteger(s) && s > 0 ? s : null;
  }
}

module.exports = { SmartCooldownStrategy };
