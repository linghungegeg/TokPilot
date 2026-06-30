/**
 * Per-slot proxy pool manager.
 * When enabled, each account slot can be bound to a specific proxy.
 * Unbound slots fall back to the global proxy (existing behavior).
 */

function parseSlotRange(rangeStr) {
  if (!rangeStr || typeof rangeStr !== 'string') return [];

  const slots = new Set();
  const parts = rangeStr.split(',').map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = Number.parseInt(startStr, 10);
      const end = Number.parseInt(endStr, 10);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) continue;
      for (let s = start; s <= end; s++) {
        slots.add(s);
      }
    } else {
      const num = Number.parseInt(part, 10);
      if (Number.isInteger(num) && num >= 1) {
        slots.add(num);
      }
    }
  }
  return [...slots].sort((a, b) => a - b);
}

class ProxyPool {
  constructor() {
    this._enabled = false;
    this._entries = [];
    this._slotMap = new Map(); // slot → proxy URL
  }

  load(settings) {
    this._enabled = Boolean(settings.proxyPoolEnabled);
    this._entries = Array.isArray(settings.proxyPoolEntries) ? settings.proxyPoolEntries : [];
    this._rebuildSlotMap();
  }

  _rebuildSlotMap() {
    this._slotMap.clear();
    if (!this._enabled) return;

    for (const entry of this._entries) {
      if (!entry.enabled || !entry.url) continue;
      const slots = parseSlotRange(entry.bindings);
      for (const slot of slots) {
        this._slotMap.set(slot, entry.url);
      }
    }
  }

  isEnabled() {
    return this._enabled;
  }

  getEntries() {
    return this._entries;
  }

  /**
   * @param {number} slot
   * @returns {string|null} proxy URL or null (use global proxy)
   */
  resolveSlotProxy(slot) {
    if (!this._enabled) return null;
    return this._slotMap.get(slot) || null;
  }

  /**
   * @param {number} slot
   * @returns {boolean}
   */
  hasSlotProxy(slot) {
    return this._enabled && this._slotMap.has(slot);
  }
}

module.exports = {
  ProxyPool,
  parseSlotRange
};
