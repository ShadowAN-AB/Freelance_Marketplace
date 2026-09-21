const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { pickBackend } = require('../src/services/gatewayRoute');

describe('gateway routing', () => {
  it('sends auth, reviews, chat, and everything else to the right service', () => {
    assert.equal(pickBackend('/api/auth/login'), 'auth');
    assert.equal(pickBackend('/api/users/me'), 'auth');
    assert.equal(pickBackend('/api/users/abc/reviews'), 'marketplace');
    assert.equal(pickBackend('/api/projects'), 'marketplace');
    assert.equal(pickBackend('/api/conversations'), 'realtime');
    assert.equal(pickBackend('/socket.io/?EIO=4'), 'realtime');
    assert.equal(pickBackend('/uploads/scan-mvp-notes.txt'), 'marketplace');
    assert.equal(pickBackend('/health'), 'gateway');
  });
});
