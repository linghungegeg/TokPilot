const { OpenAiCompatibleClient } = require('./openAiCompatibleClient');

class AiProviderPool {
  constructor({ store, logger }) {
    this.store = store;
    this.log = logger || { call: () => {}, ok: () => {}, fail: () => {}, warn: () => {} };
    this.roundRobinIndex = 0;
  }

  getEnabledProviders(settings) {
    const providers = settings.autoReplyProviders || [];
    return providers.filter((p) => p.enabled && p.baseURL && p.apiKey && p.model);
  }

  async getProviderForFriend(accountSlot, friendId, settings) {
    const enabled = this.getEnabledProviders(settings);
    if (enabled.length === 0) return null;

    // 如果有 SQL store，查绑定
    if (this.store && typeof this.store.getBinding === 'function') {
      const binding = await this.store.getBinding(accountSlot, friendId);
      if (binding) {
        const bound = enabled.find((p) => p.id === binding.providerId);
        if (bound) return bound;
      }
    }

    const provider = enabled[this.roundRobinIndex % enabled.length];
    this.roundRobinIndex = (this.roundRobinIndex + 1) % enabled.length;

    if (this.store && typeof this.store.setBinding === 'function') {
      await this.store.setBinding(accountSlot, friendId, provider.id);
    }
    return provider;
  }

  async rebindFriend(accountSlot, friendId, failedProviderId, settings) {
    const enabled = this.getEnabledProviders(settings).filter((p) => p.id !== failedProviderId);
    if (enabled.length === 0) return null;
    const provider = enabled[this.roundRobinIndex % enabled.length];
    this.roundRobinIndex = (this.roundRobinIndex + 1) % enabled.length;
    if (this.store && typeof this.store.setBinding === 'function') {
      await this.store.setBinding(accountSlot, friendId, provider.id);
    }
    return provider;
  }

  async createChatCompletion({ accountSlot, friendId, messages, settings }) {
    const timeoutMs = normalizePositiveInt(settings.autoReplyTimeoutMs, 50000, 5000, 120000);

    const provider = await this.getProviderForFriend(accountSlot, friendId, settings);
    if (!provider) throw new Error('AI 接口池中没有可用接口，请至少配置并启用一个接口。');

    const tried = new Set();
    let current = provider;

    while (current && !tried.has(current.id)) {
      tried.add(current.id);
      try {
        const client = new OpenAiCompatibleClient({
          getSettings: () => ({
            autoReplyBaseUrl: current.baseURL,
            autoReplyApiKey: current.apiKey,
            autoReplyModel: current.model,
            autoReplyTimeoutMs: timeoutMs,
            autoReplyTemperature: settings.autoReplyTemperature,
            autoReplyMaxTokens: settings.autoReplyMaxTokens
          }),
          logger: this.log
        });
        const result = await client.createChatCompletion({ messages });
        return { content: result, providerId: current.id, providerName: current.name, providerModel: current.model };
      } catch (error) {
        this.log.warn('providerFailed', { providerId: current.id, name: current.name, error: error?.message });
        current = await this.rebindFriend(accountSlot, friendId, current.id, settings);
      }
    }

    throw new Error('AI 接口池所有接口均失败。');
  }

  testProvider(provider, settings) {
    const client = new OpenAiCompatibleClient({
      getSettings: () => ({
        autoReplyBaseUrl: provider.baseURL,
        autoReplyApiKey: provider.apiKey,
        autoReplyModel: provider.model,
        autoReplyTimeoutMs: normalizePositiveInt(settings.autoReplyTimeoutMs, 30000, 5000, 120000),
        autoReplyTemperature: settings.autoReplyTemperature,
        autoReplyMaxTokens: settings.autoReplyMaxTokens
      }),
      logger: this.log
    });
    return client.createChatCompletion({
      messages: [
        { role: 'system', content: '你是一个测试助手。' },
        { role: 'user', content: '请用一句话回复：你好' }
      ]
    });
  }
}

function normalizePositiveInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

module.exports = { AiProviderPool };
