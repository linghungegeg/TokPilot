const fs = require('fs');
const path = require('path');

let SQL = null;

async function getSql() {
  if (SQL) return SQL;
  let wasmPath;
  try {
    wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');
  } catch (_error) {
    wasmPath = path.join(path.dirname(require.resolve('sql.js')), 'dist', 'sql-wasm.wasm');
  }
  SQL = await require('sql.js')({ locateFile: () => wasmPath });
  return SQL;
}

class AutoReplyStore {
  constructor({ baseDir }) {
    this.baseDir = baseDir;
  }

  getDbPath() {
    const dbDir = path.join(this.baseDir, 'db');
    fs.mkdirSync(dbDir, { recursive: true });
    return path.join(dbDir, 'auto_reply.db');
  }

  async openDb() {
    const sql = await getSql();
    const dbPath = this.getDbPath();
    const fileBuffer = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;
    const db = fileBuffer ? new sql.Database(fileBuffer) : new sql.Database();
    db.run(`
      CREATE TABLE IF NOT EXISTS ChatMessages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        accountSlot INTEGER NOT NULL,
        channelId TEXT NOT NULL,
        messageId TEXT NOT NULL,
        authorId TEXT DEFAULT '',
        authorName TEXT DEFAULT '',
        direction TEXT NOT NULL,
        content TEXT DEFAULT '',
        messageAt TEXT DEFAULT '',
        createdAt TEXT NOT NULL,
        UNIQUE(accountSlot, messageId)
      );
      CREATE TABLE IF NOT EXISTS AutoReplyRecords (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        accountSlot INTEGER NOT NULL,
        channelId TEXT NOT NULL,
        incomingMessageId TEXT DEFAULT '',
        friendId TEXT DEFAULT '',
        friendName TEXT DEFAULT '',
        incomingText TEXT DEFAULT '',
        contextPreview TEXT DEFAULT '',
        aiReply TEXT DEFAULT '',
        status TEXT NOT NULL,
        resultCode TEXT DEFAULT '',
        resultLabel TEXT DEFAULT '',
        resultDetail TEXT DEFAULT '',
        errorMessage TEXT DEFAULT '',
        providerId TEXT DEFAULT '',
        providerName TEXT DEFAULT '',
        providerModel TEXT DEFAULT '',
        startedAt TEXT DEFAULT '',
        finishedAt TEXT DEFAULT '',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        UNIQUE(accountSlot, incomingMessageId)
      );
      CREATE INDEX IF NOT EXISTS idx_chat_slot_channel ON ChatMessages(accountSlot, channelId, messageAt);
      CREATE INDEX IF NOT EXISTS idx_reply_created ON AutoReplyRecords(createdAt);
      CREATE TABLE IF NOT EXISTS FriendProviderBindings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        accountSlot INTEGER NOT NULL,
        friendId TEXT NOT NULL,
        providerId TEXT NOT NULL,
        lastUsedAt TEXT NOT NULL,
        UNIQUE(accountSlot, friendId)
      );
      CREATE TABLE IF NOT EXISTS Greetings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        accountSlot INTEGER NOT NULL,
        friendId TEXT NOT NULL,
        templateId TEXT DEFAULT '',
        createdAt TEXT NOT NULL,
        UNIQUE(accountSlot, friendId)
      );
    `);
    migrateProviderColumns(db);
    migrateTranslatedColumns(db);
    this.saveDb(db);
    return db;
  }

  saveDb(db) {
    const dbPath = this.getDbPath();
    const tmp = `${dbPath}.tmp`;
    fs.writeFileSync(tmp, Buffer.from(db.export()));

    const maxRetries = 3;
    const retryDelay = 50;
    for (let i = 0; i < maxRetries; i++) {
      try {
        fs.renameSync(tmp, dbPath);
        return;
      } catch (e) {
        if (e.code === 'EPERM' && i < maxRetries - 1) {
          const start = Date.now();
          while (Date.now() - start < retryDelay) { /* busy wait */ }
        } else if (e.code === 'EPERM') {
          try {
            fs.copyFileSync(tmp, dbPath);
            fs.unlinkSync(tmp);
            return;
          } catch (_) { throw e; }
        } else {
          throw e;
        }
      }
    }
  }

  async listRecords({ limit = 200, offset = 0 } = {}) {
    const db = await this.openDb();
    const rows = queryAll(db, `
      SELECT id, accountSlot, channelId, incomingMessageId, friendId, friendName,
             incomingText, translatedIncomingText, contextPreview, aiReply, translatedAiReply,
             status, resultCode, resultLabel, resultDetail, errorMessage,
             providerId, providerName, providerModel,
             startedAt, finishedAt, createdAt, updatedAt
      FROM AutoReplyRecords
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `, [normalizeLimit(limit), Math.max(0, Number.parseInt(offset, 10) || 0)]);
    const total = queryOne(db, 'SELECT COUNT(1) as c FROM AutoReplyRecords')?.c || 0;
    db.close();
    return { records: rows, total, limit: normalizeLimit(limit), offset };
  }

  async exportAllRecords() {
    const db = await this.openDb();
    const rows = queryAll(db, `
      SELECT id, accountSlot, channelId, incomingMessageId, friendId, friendName,
             incomingText, translatedIncomingText, contextPreview, aiReply, translatedAiReply,
             status, resultCode, resultLabel, resultDetail, errorMessage,
             providerId, providerName, providerModel,
             startedAt, finishedAt, createdAt, updatedAt
      FROM AutoReplyRecords
      ORDER BY id ASC
    `, []);
    db.close();
    return rows;
  }

  async stats() {
    const db = await this.openDb();
    const total = queryOne(db, 'SELECT COUNT(1) as c FROM AutoReplyRecords')?.c || 0;
    const success = queryOne(db, "SELECT COUNT(1) as c FROM AutoReplyRecords WHERE status = 'success'")?.c || 0;
    const failed = queryOne(db, "SELECT COUNT(1) as c FROM AutoReplyRecords WHERE status = 'failed'")?.c || 0;
    const running = queryOne(db, "SELECT COUNT(1) as c FROM AutoReplyRecords WHERE status = 'running'")?.c || 0;
    db.close();
    return { total, success, failed, running };
  }

  async upsertIncomingMessages({ accountSlot, channelId, messages = [] }) {
    if (!Array.isArray(messages) || messages.length === 0) return { inserted: 0 };
    const db = await this.openDb();
    let inserted = 0;
    db.run('BEGIN');
    try {
      for (const message of messages) {
        const before = db.getRowsModified();
        db.run(
          `INSERT OR IGNORE INTO ChatMessages
           (accountSlot, channelId, messageId, authorId, authorName, direction, content, messageAt, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            accountSlot,
            channelId,
            String(message.id || ''),
            String(message.authorId || ''),
            String(message.authorName || ''),
            message.direction === 'outgoing' ? 'outgoing' : 'incoming',
            String(message.content || ''),
            String(message.messageAt || ''),
            new Date().toISOString()
          ]
        );
        if (db.getRowsModified() > before) inserted += 1;
      }
      db.run('COMMIT');
    } catch (error) {
      db.run('ROLLBACK');
      db.close();
      throw error;
    }
    this.saveDb(db);
    db.close();
    return { inserted };
  }

  async hasReplyForMessage(accountSlot, messageId) {
    if (!messageId) return false;
    const db = await this.openDb();
    const row = queryOne(
      db,
      `SELECT id FROM AutoReplyRecords
       WHERE accountSlot = ? AND incomingMessageId = ?
         AND (status = 'success' OR resultCode NOT IN ('ai_api_failed', 'ai_timeout'))
       LIMIT 1`,
      [accountSlot, String(messageId)]
    );
    db.close();
    return Boolean(row);
  }

  async createRecord(payload) {
    const db = await this.openDb();
    const now = new Date().toISOString();
    db.run(
      `INSERT OR IGNORE INTO AutoReplyRecords
       (accountSlot, channelId, incomingMessageId, friendId, friendName, incomingText, contextPreview,
        aiReply, status, resultCode, resultLabel, resultDetail, errorMessage, startedAt, finishedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.accountSlot,
        payload.channelId || '',
        payload.incomingMessageId || '',
        payload.friendId || '',
        payload.friendName || '',
        payload.incomingText || '',
        payload.contextPreview || '',
        payload.aiReply || '',
        payload.status || 'running',
        payload.resultCode || '',
        payload.resultLabel || '',
        payload.resultDetail || '',
        payload.errorMessage || '',
        payload.startedAt || now,
        payload.finishedAt || '',
        now,
        now
      ]
    );

    let row = queryOne(db, 'SELECT * FROM AutoReplyRecords WHERE accountSlot = ? AND incomingMessageId = ? LIMIT 1', [payload.accountSlot, payload.incomingMessageId || '']);
    if (row && payload.status === 'running' && isRetryableAiFailure(row)) {
      db.run(
        `UPDATE AutoReplyRecords
         SET channelId = ?, friendId = ?, friendName = ?, incomingText = ?, contextPreview = ?, aiReply = '',
             status = ?, resultCode = ?, resultLabel = ?, resultDetail = ?, errorMessage = '',
             providerId = '', providerName = '', providerModel = '', startedAt = ?, finishedAt = '', updatedAt = ?
         WHERE id = ?`,
        [
          payload.channelId || '',
          payload.friendId || '',
          payload.friendName || '',
          payload.incomingText || '',
          payload.contextPreview || '',
          payload.status || 'running',
          payload.resultCode || '',
          payload.resultLabel || '',
          payload.resultDetail || '',
          payload.startedAt || now,
          now,
          row.id
        ]
      );
      row = queryOne(db, 'SELECT * FROM AutoReplyRecords WHERE id = ?', [row.id]);
    }

    this.saveDb(db);
    db.close();
    return row;
  }

  async finishRecord(id, patch = {}) {
    const db = await this.openDb();
    const now = new Date().toISOString();
    db.run(
      `UPDATE AutoReplyRecords
       SET aiReply = ?, status = ?, resultCode = ?, resultLabel = ?, resultDetail = ?, errorMessage = ?,
           translatedIncomingText = ?, translatedAiReply = ?,
           providerId = ?, providerName = ?, providerModel = ?,
           finishedAt = ?, updatedAt = ?
       WHERE id = ?`,
      [
        patch.aiReply || '',
        patch.status || 'failed',
        patch.resultCode || '',
        patch.resultLabel || '',
        patch.resultDetail || '',
        patch.errorMessage || '',
        patch.translatedIncomingText || '',
        patch.translatedAiReply || '',
        patch.providerId || '',
        patch.providerName || '',
        patch.providerModel || '',
        patch.finishedAt || now,
        now,
        id
      ]
    );
    this.saveDb(db);
    const row = queryOne(db, 'SELECT * FROM AutoReplyRecords WHERE id = ?', [id]);
    db.close();
    return row;
  }

  async getBinding(accountSlot, friendId) {
    const db = await this.openDb();
    const row = queryOne(db, 'SELECT providerId, lastUsedAt FROM FriendProviderBindings WHERE accountSlot = ? AND friendId = ?', [accountSlot, String(friendId)]);
    db.close();
    return row;
  }

  async setBinding(accountSlot, friendId, providerId) {
    const db = await this.openDb();
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO FriendProviderBindings (accountSlot, friendId, providerId, lastUsedAt)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(accountSlot, friendId) DO UPDATE SET providerId = excluded.providerId, lastUsedAt = excluded.lastUsedAt`,
      [accountSlot, String(friendId), String(providerId), now]
    );
    this.saveDb(db);
    db.close();
  }

  async hasSentGreeting(accountSlot, friendId) {
    const db = await this.openDb();
    const row = queryOne(db,
      'SELECT id FROM Greetings WHERE accountSlot = ? AND friendId = ? LIMIT 1',
      [accountSlot, String(friendId)]
    );
    db.close();
    return Boolean(row);
  }

  async recordGreeting(accountSlot, friendId, templateId = '') {
    const db = await this.openDb();
    const now = new Date().toISOString();
    db.run(
      `INSERT OR IGNORE INTO Greetings (accountSlot, friendId, templateId, createdAt)
       VALUES (?, ?, ?, ?)`,
      [accountSlot, String(friendId), templateId, now]
    );
    this.saveDb(db);
    db.close();
  }
}

function queryAll(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function queryOne(db, sql, params = []) {
  return queryAll(db, sql, params)[0] || null;
}

function normalizeLimit(limit) {
  const parsed = Number.parseInt(limit, 10);
  return Number.isInteger(parsed) ? Math.max(1, Math.min(500, parsed)) : 200;
}

function isRetryableAiFailure(row) {
  return row.status === 'failed' && ['ai_api_failed', 'ai_timeout'].includes(String(row.resultCode || ''));
}

function migrateProviderColumns(db) {
  const cols = queryAll(db, "PRAGMA table_info(AutoReplyRecords)").map((r) => r.name);
  if (!cols.includes('providerId')) {
    db.run("ALTER TABLE AutoReplyRecords ADD COLUMN providerId TEXT DEFAULT ''");
  }
  if (!cols.includes('providerName')) {
    db.run("ALTER TABLE AutoReplyRecords ADD COLUMN providerName TEXT DEFAULT ''");
  }
  if (!cols.includes('providerModel')) {
    db.run("ALTER TABLE AutoReplyRecords ADD COLUMN providerModel TEXT DEFAULT ''");
  }
}

function migrateTranslatedColumns(db) {
  const cols = queryAll(db, "PRAGMA table_info(AutoReplyRecords)").map((r) => r.name);
  if (!cols.includes('translatedIncomingText')) {
    db.run("ALTER TABLE AutoReplyRecords ADD COLUMN translatedIncomingText TEXT DEFAULT ''");
  }
  if (!cols.includes('translatedAiReply')) {
    db.run("ALTER TABLE AutoReplyRecords ADD COLUMN translatedAiReply TEXT DEFAULT ''");
  }
}

module.exports = { AutoReplyStore };
