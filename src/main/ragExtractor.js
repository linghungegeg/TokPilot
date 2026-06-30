const fs = require('fs');
const path = require('path');
const { cleanFromFile } = require('./ragCleaner');

const DEFAULT_BASE_URL = 'https://uuapi.net/v1';
const DEFAULT_MODEL = 'gpt-5.5';
const BATCH_SIZE = 2;
const DELAY_MS = 3000;

const EXTRACTION_PROMPT = `你是一个对话策略分析专家。请分析以下聊天对话，提炼出可复用的经验策略。

每段对话提炼 1-3 条策略经验，格式为 JSON 数组：
[
  {
    "scenario": "场景描述（简明扼要）",
    "strategy": "有效的应对策略（具体可操作）",
    "outcome": "success/rejected/neutral",
    "tags": ["标签1", "标签2"],
    "image_context": {
      "should_send": true/false,
      "timing": "什么时机发图",
      "image_type": "selfie/none"
    }
  }
]

提炼要点：
- 什么场景下什么策略有效（如何自然引导用户互动）
- 失败案例的教训（如 AI 回复不连贯被用户发现、用户拒绝的原因）
- 不同语言/文化用户的适配策略
- 转化节点（什么时机推荐效果好）
- 用户拒绝/犹豫时的处理方式

只输出 JSON 数组，不要输出其他内容。`;

function formatConversation(conv) {
  return conv.messages.map((msg) => {
    const dir = msg.direction === 'outgoing' ? '[己方]' : '[对方]';
    return `${dir} ${msg.sender}: ${msg.content}`;
  }).join('\n');
}

async function callGPT(conversations, apiKey, baseURL, model) {
  const conversationTexts = conversations.map((conv, i) => {
    return `--- 对话 ${i + 1} ---\n${formatConversation(conv)}`;
  }).join('\n\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  const normalizedBaseURL = String(baseURL || '').trim().replace(/\/+$/, '');

  try {
    const response = await fetch(`${normalizedBaseURL}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        input: [
          { role: 'developer', content: EXTRACTION_PROMPT },
          { role: 'user', content: conversationTexts }
        ],
        temperature: 0.3,
        max_output_tokens: 4096
      }),
      signal: controller.signal
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`GPT 接口失败：HTTP ${response.status} ${text.slice(0, 200)}`);
    }
    const data = JSON.parse(text);
    const content = extractResponseText(data);
    if (!content) {
      throw new Error('GPT 接口没有返回内容');
    }
    return content.trim();
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw new Error('GPT 接口请求超时（60s）');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
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

function parseGPTResponse(responseText) {
  let jsonStr = responseText;
  const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }
  const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    jsonStr = arrayMatch[0];
  }
  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) =>
      item && typeof item.scenario === 'string' && typeof item.strategy === 'string'
    );
  } catch {
    console.warn('[ragExtractor] 解析 GPT 返回 JSON 失败，跳过该批次');
    return [];
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function extractAll(conversations, options = {}) {
  const apiKey = options.apiKey;
  const baseURL = options.baseURL || DEFAULT_BASE_URL;
  const model = options.model || DEFAULT_MODEL;
  const batchSize = options.batchSize || BATCH_SIZE;

  if (!apiKey) throw new Error('请提供 apiKey');

  const allKnowledge = [];
  const totalBatches = Math.ceil(conversations.length / batchSize);

  for (let i = 0; i < conversations.length; i += batchSize) {
    const batch = conversations.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    console.log(`[ragExtractor] 处理批次 ${batchNum}/${totalBatches}（${batch.length} 段对话）`);

    try {
      const responseText = await callGPT(batch, apiKey, baseURL, model);
      const knowledge = parseGPTResponse(responseText);
      allKnowledge.push(...knowledge);
      console.log(`[ragExtractor] 批次 ${batchNum} 提炼出 ${knowledge.length} 条策略`);
    } catch (error) {
      console.error(`[ragExtractor] 批次 ${batchNum} 失败: ${error.message}`);
    }

    if (i + batchSize < conversations.length) {
      await delay(DELAY_MS);
    }
  }

  return allKnowledge;
}

async function run(options = {}) {
  const inputPath = options.inputPath;
  const outputPath = options.outputPath || path.resolve(__dirname, '..', '..', 'knowledge.json');

  if (!inputPath) throw new Error('请提供 inputPath');

  console.log(`[ragExtractor] 读取数据: ${inputPath}`);
  let conversations;

  if (inputPath.endsWith('.json')) {
    const raw = fs.readFileSync(inputPath, 'utf-8');
    conversations = JSON.parse(raw);
  } else {
    conversations = cleanFromFile(inputPath);
  }

  console.log(`[ragExtractor] 共 ${conversations.length} 段对话`);
  console.log('[ragExtractor] 开始 GPT 提炼...');
  const knowledge = await extractAll(conversations, options);
  console.log(`[ragExtractor] 共提炼出 ${knowledge.length} 条策略经验`);

  fs.writeFileSync(outputPath, JSON.stringify(knowledge, null, 2), 'utf-8');
  console.log(`[ragExtractor] 知识库已保存: ${outputPath}`);

  return knowledge;
}

if (require.main === module) {
  const apiKey = process.argv[2] || process.env.RAG_API_KEY;
  if (!apiKey) {
    console.error('用法: node ragExtractor.js <apiKey> [inputPath] [baseURL] [model]');
    console.error('或设置环境变量 RAG_API_KEY');
    process.exit(1);
  }
  const inputPath = process.argv[3];
  if (!inputPath) {
    console.error('请提供 inputPath（聊天数据文件或 clean 后的 JSON）');
    process.exit(1);
  }
  const baseURL = process.argv[4] || DEFAULT_BASE_URL;
  const model = process.argv[5] || DEFAULT_MODEL;

  run({ apiKey, inputPath, baseURL, model }).catch((error) => {
    console.error(`[ragExtractor] 错误: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { extractAll, run, callGPT, parseGPTResponse, formatConversation };
