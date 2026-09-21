const crypto = require('crypto');

function createLogger() {
  const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info');
  const write = (lvl, obj, msg) => {
    if (level === 'silent') return;
    const line = { level: lvl, time: new Date().toISOString(), ...(typeof obj === 'object' ? obj : {}), msg: msg || obj };
    const out = lvl === 'error' ? console.error : console.log;
    out(JSON.stringify(line));
  };
  return {
    info: (obj, msg) => write('info', obj, msg),
    warn: (obj, msg) => write('warn', obj, msg),
    error: (obj, msg) => write('error', obj, msg),
    child: (bindings) => ({
      info: (obj, msg) => write('info', { ...bindings, ...(typeof obj === 'object' ? obj : {}) }, msg),
      warn: (obj, msg) => write('warn', { ...bindings, ...(typeof obj === 'object' ? obj : {}) }, msg),
      error: (obj, msg) => write('error', { ...bindings, ...(typeof obj === 'object' ? obj : {}) }, msg),
    }),
  };
}

const logger = createLogger();

function requestId() {
  return (req, res, next) => {
    req.id = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-Id', req.id);
    const start = Date.now();
    res.on('finish', () => {
      logger.info({ reqId: req.id, method: req.method, url: req.originalUrl, status: res.statusCode, ms: Date.now() - start }, 'request');
    });
    next();
  };
}

module.exports = { logger, requestId };
