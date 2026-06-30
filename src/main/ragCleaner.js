const fs = require('fs');
const path = require('path');

// 己方账号名（不区分大小写匹配 — 可在 TikTok 场景自定义）
const OWN_ACCOUNTS = [];

// 两种时间格式的正则
const TIME_PATTERN_1 = /^(.+?)\s*—\s*(\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2}\s*(?:AM|PM))$/;
const TIME_PATTERN_2 = /^(.+?)\s*—\s*(\d{4}\/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2})$/;

function parseTime(timeStr) {
  const m1 = timeStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (m1) {
    let year = parseInt(m1[3], 10);
    if (year < 100) year += 2000;
    let hour = parseInt(m1[4], 10);
    if (m1[6] === 'PM' && hour !== 12) hour += 12;
    if (m1[6] === 'AM' && hour === 12) hour = 0;
    return new Date(year, parseInt(m1[1], 10) - 1, parseInt(m1[2], 10), hour, parseInt(m1[5], 10));
  }
  const m2 = timeStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})$/);
  if (m2) {
    return new Date(parseInt(m2[1], 10), parseInt(m2[2], 10) - 1, parseInt(m2[3], 10), parseInt(m2[4], 10), parseInt(m2[5], 10));
  }
  return null;
}

function isOwnAccount(name) {
  if (OWN_ACCOUNTS.length === 0) return false;
  const lower = name.toLowerCase().trim();
  return OWN_ACCOUNTS.some((own) => lower === own || lower.startsWith(own));
}

function shouldFilter(content) {
  return !content.trim();
}

function normalizeImagePlaceholder(content, direction) {
  const trimmed = content.trim();
  if (trimmed === 'Image' || trimmed === '图片') {
    return direction === 'outgoing' ? '[己方发送了图片]' : '[用户发送了截图]';
  }
  return content;
}

function parseConversations(rawText) {
  const segments = rawText.split(/(?:\r?\n){3,}/);
  const conversations = [];

  for (const segment of segments) {
    const lines = segment.split(/\r?\n/);
    const messages = [];
    let currentSender = null;
    let currentTime = null;
    let currentDirection = null;
    let contentLines = [];

    for (const line of lines) {
      const match1 = line.match(TIME_PATTERN_1);
      const match2 = line.match(TIME_PATTERN_2);
      const match = match1 || match2;

      if (match) {
        if (currentSender !== null) {
          let content = contentLines.join('\n');
          content = normalizeImagePlaceholder(content, currentDirection);
          if (!shouldFilter(content)) {
            messages.push({
              sender: currentSender,
              time: currentTime,
              direction: currentDirection,
              content
            });
          }
        }
        currentSender = match[1].trim();
        currentTime = parseTime(match[2].trim());
        currentDirection = isOwnAccount(currentSender) ? 'outgoing' : 'incoming';
        contentLines = [];
      } else {
        contentLines.push(line);
      }
    }

    if (currentSender !== null) {
      let content = contentLines.join('\n');
      content = normalizeImagePlaceholder(content, currentDirection);
      if (!shouldFilter(content)) {
        messages.push({
          sender: currentSender,
          time: currentTime,
          direction: currentDirection,
          content
        });
      }
    }

    if (messages.length >= 2) {
      conversations.push({ messages });
    }
  }

  return conversations;
}

function cleanFromFile(filePath) {
  const rawText = fs.readFileSync(filePath, 'utf-8');
  return parseConversations(rawText);
}

if (require.main === module) {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3] || path.resolve(__dirname, 'cleaned_conversations.json');
  if (!inputPath) {
    console.error('用法: node ragCleaner.js <聊天数据文件路径> [输出路径]');
    process.exit(1);
  }
  console.log(`[ragCleaner] 读取: ${inputPath}`);
  const conversations = cleanFromFile(inputPath);
  console.log(`[ragCleaner] 解析出 ${conversations.length} 段对话`);
  let totalMessages = 0;
  for (const conv of conversations) totalMessages += conv.messages.length;
  console.log(`[ragCleaner] 共 ${totalMessages} 条有效消息`);
  fs.writeFileSync(outputPath, JSON.stringify(conversations, null, 2), 'utf-8');
  console.log(`[ragCleaner] 输出: ${outputPath}`);
}

module.exports = { parseConversations, cleanFromFile, isOwnAccount, OWN_ACCOUNTS };
