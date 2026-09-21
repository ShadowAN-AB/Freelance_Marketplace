function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function clientUrl() {
  return requireEnv('CLIENT_URL');
}

function isProd() {
  return process.env.NODE_ENV === 'production';
}

module.exports = { requireEnv, clientUrl, isProd };
