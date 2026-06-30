const { ImapFlow } = require('imapflow');

const IMAP_CONFIG = {
  host: 'outlook.office365.com',
  port: 993,
  secure: true
};

/**
 * 从 Outlook 收件箱获取 TikTok 验证码
 * @param {string} email - Outlook 邮箱地址
 * @param {string} password - Outlook 邮箱密码
 * @param {number} timeoutMs - 超时时间 (ms)
 * @returns {Promise<string|null>} 6位验证码，超时返回 null
 */
async function fetchVerificationCode(email, password, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const client = new ImapFlow({
        host: IMAP_CONFIG.host,
        port: IMAP_CONFIG.port,
        secure: IMAP_CONFIG.secure,
        auth: {
          user: email,
          pass: password
        },
        logger: false
      });

      try {
        await client.connect();
        const lock = await client.getMailboxLock('INBOX');

        try {
          const messages = [];
          const searchResult = client.fetch(
            { unseen: true },
            {
              uid: true,
              envelope: true,
              internalDate: true,
              bodyStructure: true
            }
          );

          for await (const msg of searchResult) {
            messages.push({
              uid: msg.uid,
              subject: msg.envelope.subject,
              date: msg.internalDate,
              from: msg.envelope.from?.[0]?.address || ''
            });
          }

          if (messages.length === 0) {
            await client.logout();
            await sleep(5000);
            continue;
          }

          // 按时间倒序取最近 10 封
          messages.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
          const recent = messages.slice(0, 10);

          for (const { uid } of recent) {
            const download = await client.download({ uid: String(uid) });
            let body = '';
            for await (const chunk of download.content) {
              body += chunk.toString('utf-8');
              if (body.length > 50000) break;
            }

            const match = body.match(/\b(\d{6})\b/);
            if (match) {
              await client.logout();
              return match[1];
            }
          }

          await client.logout();
          await sleep(5000);
        } finally {
          if (lock) lock.release();
        }
      } catch (err) {
        try { await client.logout(); } catch (_) {}
        await sleep(5000);
      }
    } catch (err) {
      // 连接失败，retry
      await sleep(5000);
    }
  }

  return null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { fetchVerificationCode };
