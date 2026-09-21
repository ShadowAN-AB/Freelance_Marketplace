function pathOnly(url) {
  return String(url || '/').split('?')[0];
}

function pickBackend(url) {
  const path = pathOnly(url);
  if (path === '/health' || path === '/health/') return 'gateway';
  if (path.startsWith('/socket.io')) return 'realtime';
  if (path.startsWith('/api/conversations') || path.startsWith('/api/notifications')) return 'realtime';
  if (/^\/api\/users\/[^/]+\/reviews/.test(path)) return 'marketplace';
  if (path.startsWith('/api/auth') || path.startsWith('/api/users')) return 'auth';
  return 'marketplace';
}

module.exports = { pathOnly, pickBackend };
