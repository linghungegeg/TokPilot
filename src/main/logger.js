
'use strict';

const fs = require('fs');
const path = require('path');

let logsDir = '';

function initLogger(baseDir) {
  logsDir = path.join(baseDir, 'logs');
  try {
    fs.mkdirSync(logsDir, { recursive: true });
  } catch (error) {
    console.error('[logger] 创建日志目录失败:', error);
  }
}

function createLogger(name) {
  const filePath = () => logsDir ? path.join(logsDir, `${name}.log`) : '';

  

  function write(level, method, data = {}) {
    const timestamp = new Date().toISOString();
    const entry = { timestamp, level, module: name, method, ...data };

    
    const tag = `[${name}]`;
    const summary = data.error
      ? `${data.error}`
      : data.result !== undefined
        ? truncate(JSON.stringify(data.result), 120)
        : data.hint || '';
    const consoleLine = `${tag} ${method}${summary ? ' → ' + summary : ''}`;

    if (level === 'error') {
      console.error(consoleLine);
    } else if (level === 'warn') {
      console.warn(consoleLine);
    } else if (level === 'debug') {
      
    } else {
      console.info(consoleLine);
    }

    
    const fp = filePath();
    if (!fp) return;
    try {
      fs.appendFileSync(fp, JSON.stringify(entry) + '\n', 'utf8');
    } catch (_err) {
      
    }
  }

  return {
    

    call(method, args) {
      write('debug', method, { args: safeSerialize(args, 200) });
    },

    

    ok(method, result, extra = {}) {
      write('info', method, { result: safeSerialize(result, 300), ...extra });
    },

    

    fail(method, err, extra = {}) {
      const error = err instanceof Error ? err.message : String(err);
      write('error', method, { error, ...extra });
    },

    

    warn(method, message, extra = {}) {
      write('warn', method, { hint: message, ...extra });
    },

    

    info(method, message, extra = {}) {
      write('info', method, { hint: message, ...extra });
    }
  };
}

function safeSerialize(value, maxLen) {
  if (value === undefined || value === null) return value;
  try {
    const s = JSON.stringify(value);
    return s.length > maxLen ? s.slice(0, maxLen) + '…' : JSON.parse(s);
  } catch (_err) {
    return String(value).slice(0, maxLen);
  }
}

function truncate(str, maxLen) {
  if (typeof str !== 'string') return str;
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

module.exports = { initLogger, createLogger };
