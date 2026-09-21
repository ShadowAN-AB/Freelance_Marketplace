const AuditLog = require('../models/AuditLog');
const { logger } = require('./logger');

async function audit({ actorId, action, targetType = '', targetId = '', meta = {} }) {
  try {
    await AuditLog.create({ actorId, action, targetType, targetId: String(targetId || ''), meta });
  } catch (err) {
    logger.error({ err: err.message, action }, 'audit write failed');
  }
}

module.exports = { audit };
