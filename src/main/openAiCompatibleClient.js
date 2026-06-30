// 已知 baseURL 对应的 API 格式缓存，避免每次探测
const _formatCache = new Map();

class OpenAiCompatibleClient {
  constructor({ getSettings, logger }) {
    this.getSettings = getSettings;
    this.log = logger || { call: () => {}, ok: () => {}, fail: () => {} };
  }

  async createChatCompletion({ messages }) {
    const settings = this.getSettings();
    const baseURL = String(settings.autoReplyBaseUrl || '').trim().replace(/\/+$/, '');
    const apiKey = String(settings.autoReplyApiKey || '').trim();
    const model = String(settings.autoReplyModel || '').trim();
    if (!baseURL) throw new Error('请先配置 AI 接口 baseURL。');
    if (!apiKey) throw new Error('请先配置 AI 接口 apiKey。');
    if (!model) throw new Error('请先配置 AI 模型 model。');

    const timeoutMs = normalizePositiveInt(settings.autoReplyTimeoutMs, 50000, 5000, 120000);
    const maxAttempts = normalizePositiveInt(settings.autoReplyRetryAttempts, 3, 1, 10);
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const content = await this.createResponse({
          baseURL,
          apiKey,
          model,
          messages,
          timeoutMs,
          temperature: normalizeNumber(settings.autoReplyTemperature, 0.7),
          maxOutputTokens: normalizePositiveInt(settings.autoReplyMaxTokens, 500, 64, 4096),
          attempt
        });
        this.log.ok('ai-reply', null, { model, attempt });
        return content;
      } catch (error) {
        lastError = error;
        this.log.fail('ai-reply', error, { attempt, maxAttempts });
        if (attempt < maxAttempts) await delay(1000 * attempt);
      }
    }

    throw lastError || new Error('AI 接口失败。');
  }

  async createResponse({ baseURL, apiKey, model, messages, timeoutMs, temperature, maxOutputTokens, attempt }) {
    const format = detectApiFormat(baseURL);

    if (format === 'responses') {
      return this._callResponsesApi({ baseURL, apiKey, model, messages, timeoutMs, temperature, maxOutputTokens, attempt });
    }
    if (format === 'chat') {
      return this._callChatCompletionsApi({ baseURL, apiKey, model, messages, timeoutMs, temperature, maxOutputTokens, attempt });
    }

    // 未知格式：先试 chat completions（通用标准），404 则回退 responses
    try {
      const result = await this._callChatCompletionsApi({ baseURL, apiKey, model, messages, timeoutMs, temperature, maxOutputTokens, attempt });
      _formatCache.set(baseURL, 'chat');
      return result;
    } catch (error) {
      if (error && error.httpStatus === 404) {
        this.log.call('format-fallback', { baseURL, from: 'chat', to: 'responses' });
        const result = await this._callResponsesApi({ baseURL, apiKey, model, messages, timeoutMs, temperature, maxOutputTokens, attempt });
        _formatCache.set(baseURL, 'responses');
        return result;
      }
      throw error;
    }
  }

  async _callChatCompletionsApi({ baseURL, apiKey, model, messages, timeoutMs, temperature, maxOutputTokens, attempt }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const endpoint = baseURL.endsWith('/v1')
      ? `${baseURL}/chat/completions`
      : `${baseURL}/v1/chat/completions`;
    try {
      this.log.call('chat-completions', { baseURL, model, messageCount: messages.length, attempt });
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: messages.map((m) => ({ role: m.role, content: String(m.content || '') })),
          temperature,
          max_tokens: maxOutputTokens
        }),
        signal: controller.signal
      });
      const text = await response.text();
      if (response.status === 404) {
        const err = new Error(`API endpoint not found: ${endpoint}`);
        err.httpStatus = 404;
        throw err;
      }
      if (!response.ok) {
        throw new Error(`AI 接口失败：HTTP ${response.status} ${text.slice(0, 200)}`);
      }
      const data = JSON.parse(text);
      const content = extractChatContent(data);
      if (!content) {
        throw new Error('AI 接口没有返回可用回复。');
      }
      return content.trim();
    } catch (error) {
      if (error && error.name === 'AbortError') {
        throw new Error('AI 接口请求超时。');
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async _callResponsesApi({ baseURL, apiKey, model, messages, timeoutMs, temperature, maxOutputTokens, attempt }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      this.log.call('responses', { baseURL, model, messageCount: messages.length, attempt });
      const response = await fetch(`${baseURL}/responses`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          input: messages.map((m) => ({
            role: m.role === 'system' ? 'developer' : m.role,
            content: String(m.content || '')
          })),
          temperature,
          max_output_tokens: maxOutputTokens
        }),
        signal: controller.signal
      });
      const text = await response.text();
      if (response.status === 404) {
        const err = new Error(`API endpoint not found: ${baseURL}/responses`);
        err.httpStatus = 404;
        throw err;
      }
      if (!response.ok) {
        throw new Error(`AI 接口失败：HTTP ${response.status} ${text.slice(0, 200)}`);
      }
      const data = JSON.parse(text);
      const content = extractResponseText(data);
      if (!content) {
        throw new Error('AI 接口没有返回可用回复。');
      }
      return content.trim();
    } catch (error) {
      if (error && error.name === 'AbortError') {
        throw new Error('AI 接口请求超时。');
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

function detectApiFormat(baseURL) {
  if (_formatCache.has(baseURL)) return _formatCache.get(baseURL);

  const lower = baseURL.toLowerCase();
  if (lower.includes('api.openai.com') && !lower.endsWith('/v1')) return 'responses';
  if (lower.endsWith('/v1')) return 'chat';
  if (lower.includes('deepseek')) return 'chat';
  if (lower.includes('groq')) return 'chat';
  if (lower.includes('mistral')) return 'chat';
  if (lower.includes('together')) return 'chat';
  if (lower.includes('ollama')) return 'chat';
  if (lower.includes('moonshot')) return 'chat';
  if (lower.includes('zhipu') || lower.includes('bigmodel')) return 'chat';
  if (lower.includes('dashscope') || lower.includes('aliyun')) return 'chat';
  if (lower.includes('baichuan')) return 'chat';
  if (lower.includes('minimax')) return 'chat';
  if (lower.includes('localhost') || lower.includes('127.0.0.1')) return 'chat';

  return null;
}

function extractChatContent(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string' && content.trim()) return content;
  const delta = data?.choices?.[0]?.delta?.content;
  if (typeof delta === 'string' && delta.trim()) return delta;
  return '';
}

function extractResponseText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text;
  const output = Array.isArray(data?.output) ? data.output : [];
  const parts = [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (typeof part?.text === 'string') parts.push(part.text);
    }
  }
  const text = parts.join('').trim();
  if (text) return text;
  return data?.choices?.[0]?.message?.content || '';
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePositiveInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function normalizeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

module.exports = { OpenAiCompatibleClient };
