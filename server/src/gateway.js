const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pickBackend } = require('./infra/gatewayRoute');
const { logger } = require('./infra/logger');

function requiredUrl(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value.replace(/\/$/, '');
}

function backends() {
  return {
    auth: requiredUrl('AUTH_URL'),
    marketplace: requiredUrl('MARKETPLACE_URL'),
    realtime: requiredUrl('REALTIME_URL'),
  };
}

function probe(url) {
  return new Promise((resolve) => {
    const dest = new URL('/health', url);
    const req = http.request(
      {
        protocol: dest.protocol,
        hostname: dest.hostname,
        port: dest.port,
        path: dest.pathname,
        method: 'GET',
        timeout: 1500,
      },
      (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

function proxyHttp(req, res, target) {
  const dest = new URL(req.url, target);
  const headers = { ...req.headers, host: dest.host };
  const upstream = http.request(
    {
      protocol: dest.protocol,
      hostname: dest.hostname,
      port: dest.port,
      path: dest.pathname + dest.search,
      method: req.method,
      headers,
    },
    (incoming) => {
      res.writeHead(incoming.statusCode || 502, incoming.headers);
      incoming.pipe(res);
    }
  );
  upstream.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
    }
    res.end(JSON.stringify({ message: 'Upstream unavailable' }));
  });
  req.pipe(upstream);
}

function proxyUpgrade(req, socket, head, target) {
  const dest = new URL(req.url, target);
  const headers = { ...req.headers, host: dest.host };
  const upstream = http.request({
    protocol: dest.protocol,
    hostname: dest.hostname,
    port: dest.port,
    path: dest.pathname + dest.search,
    method: req.method,
    headers,
  });
  upstream.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    const lines = [`HTTP/1.1 ${proxyRes.statusCode} Switching Protocols`];
    for (const [key, value] of Object.entries(proxyRes.headers)) {
      lines.push(`${key}: ${value}`);
    }
    socket.write(`${lines.join('\r\n')}\r\n\r\n`);
    if (proxyHead && proxyHead.length) socket.write(proxyHead);
    proxySocket.pipe(socket).pipe(proxySocket);
  });
  upstream.on('error', () => socket.destroy());
  upstream.end();
  if (head && head.length) upstream.write(head);
}

async function healthPayload(urls) {
  const auth = await probe(urls.auth);
  const marketplace = await probe(urls.marketplace);
  const realtime = await probe(urls.realtime);
  const ok = auth && marketplace && realtime;
  return {
    ok,
    service: 'freelancehub-gateway',
    backends: { auth, marketplace, realtime },
    env: process.env.NODE_ENV || 'development',
  };
}

function startGateway() {
  const urls = backends();
  const PORT = process.env.PORT || 5001;
  const server = http.createServer(async (req, res) => {
    const backend = pickBackend(req.url);
    if (backend === 'gateway') {
      const body = await healthPayload(urls);
      res.writeHead(body.ok ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
      return;
    }
    proxyHttp(req, res, urls[backend]);
  });
  server.on('upgrade', (req, socket, head) => {
    const backend = pickBackend(req.url);
    if (backend === 'gateway') {
      socket.destroy();
      return;
    }
    proxyUpgrade(req, socket, head, urls[backend]);
  });
  server.listen(PORT, () => {
    logger.info({ port: PORT, urls }, 'FreelanceHub gateway listening');
  });
  return server;
}

if (require.main === module) {
  startGateway();
}

module.exports = { startGateway, healthPayload };
