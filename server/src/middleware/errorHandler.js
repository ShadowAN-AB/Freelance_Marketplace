function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, _req, res, _next) {
  if (err.errors && err.statusCode === 400) {
    return res.status(400).json({ message: err.message, errors: err.errors });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({ message: `${field} already exists` });
  }
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File is too large' });
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ message: err.message });
  }
  const status = err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ message: err.message || 'Server error' });
}

module.exports = { notFound, errorHandler };
