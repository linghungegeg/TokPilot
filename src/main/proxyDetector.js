
'use strict';

const { execFile } = require('child_process');
const net = require('net');

const COMMON_PROXY_PORTS = [7890, 7891, 7897, 1080, 10809, 8080];
const TCP_TIMEOUT_MS = 1000;
const VALIDATE_TIMEOUT_MS = 3000;

async function detectSystemProxy() {
  try {
    const regPath = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings';
    const enableValue = await regQuery(regPath, 'ProxyEnable');
    if (enableValue !== '0x1' && enableValue !== '1') {
      return null;
    }
    const proxyServer = await regQuery(regPath, 'ProxyServer');
    if (!proxyServer) {
      return null;
    }
    return parseRegistryProxyServer(proxyServer);
  } catch {
    return null;
  }
}

function regQuery(regPath, valueName) {
  return new Promise((resolve) => {
    execFile('reg', ['query', regPath, '/v', valueName], { timeout: 3000 }, (err, stdout) => {
      if (err || !stdout) {
        resolve(null);
        return;
      }
      const match = stdout.match(new RegExp(`${valueName}\\s+REG_(?:SZ|DWORD)\\s+(.+)`, 'i'));
      resolve(match ? match[1].trim() : null);
    });
  });
}

function parseRegistryProxyServer(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (!trimmed.includes('=')) {
    return trimmed.includes('://') ? trimmed : `http://${trimmed}`;
  }

  const parts = trimmed.split(';').map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    const [protocol, addr] = part.split('=');
    if (!addr) continue;
    const p = protocol.toLowerCase();
    if (p === 'http' || p === 'https') {
      return `http://${addr}`;
    }
    if (p === 'socks') {
      return `socks5://${addr}`;
    }
  }

  const first = parts[0];
  if (first && first.includes('=')) {
    const addr = first.split('=')[1];
    if (addr) return `http://${addr}`;
  }
  return null;
}

function tcpConnect(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, TCP_TIMEOUT_MS);

    socket.connect(port, host, () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(false);
    });
  });
}

async function validateProxy(proxyUrl) {
  try {
    const url = new URL(proxyUrl.includes('://') ? proxyUrl : `http://${proxyUrl}`);
    const host = url.hostname || '127.0.0.1';
    const port = Number(url.port) || (url.protocol === 'socks5:' ? 1080 : 8080);

    if (url.protocol === 'socks5:') {
      return await validateSocks5(host, port);
    }
    return await validateHttpProxy(host, port);
  } catch {
    return false;
  }
}

function validateHttpProxy(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, VALIDATE_TIMEOUT_MS);

    socket.connect(port, host, () => {
      const request = `CONNECT tiktok.com:443 HTTP/1.1\r\nHost: tiktok.com:443\r\n\r\n`;
      socket.write(request);
    });

    socket.once('data', (data) => {
      clearTimeout(timer);
      socket.destroy();
      const response = data.toString();
      resolve(response.includes('200'));
    });

    socket.on('error', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(false);
    });
  });
}

function validateSocks5(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, VALIDATE_TIMEOUT_MS);

    socket.connect(port, host, () => {
      socket.write(Buffer.from([0x05, 0x01, 0x00]));
    });

    socket.once('data', (data) => {
      clearTimeout(timer);
      socket.destroy();
      resolve(data.length >= 2 && data[0] === 0x05);
    });

    socket.on('error', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(false);
    });
  });
}

async function scanCommonPorts() {
  const results = await Promise.all(
    COMMON_PROXY_PORTS.map(async (port) => {
      const open = await tcpConnect(port);
      return open ? port : null;
    })
  );

  const openPorts = results.filter((p) => p !== null);
  for (const port of openPorts) {
    const httpUrl = `http://127.0.0.1:${port}`;
    if (await validateProxy(httpUrl)) {
      return httpUrl;
    }
    const socksUrl = `socks5://127.0.0.1:${port}`;
    if (await validateProxy(socksUrl)) {
      return socksUrl;
    }
  }
  return null;
}

async function autoDetectProxy() {
  const systemProxy = await detectSystemProxy();
  if (systemProxy) {
    const valid = await validateProxy(systemProxy);
    if (valid) {
      return { source: 'registry', proxyUrl: systemProxy };
    }
  }

  const scanned = await scanCommonPorts();
  if (scanned) {
    return { source: 'portscan', proxyUrl: scanned };
  }

  return null;
}

module.exports = { detectSystemProxy, scanCommonPorts, validateProxy, autoDetectProxy };
