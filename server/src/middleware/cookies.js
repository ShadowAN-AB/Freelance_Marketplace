function parseCookies(req, _res, next) {
  req.cookies = req.cookies || {};
  const header = req.headers.cookie;
  if (!header) return next();
  for (const part of String(header).split(';')) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey) continue;
    try {
      req.cookies[rawKey] = decodeURIComponent(rest.join('='));
    } catch {
      req.cookies[rawKey] = rest.join('=');
    }
  }
  next();
}

module.exports = { parseCookies };
