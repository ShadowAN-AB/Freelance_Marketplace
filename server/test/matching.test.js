process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { freelancerRationale, llmConfig } = require('../src/services/matching');

describe('LLM matching fallback', () => {
  it('writes a skill-overlap rationale without calling a model', () => {
    const text = freelancerRationale({
      freelancer: { name: 'Aisha Khan' },
      matched: ['react', 'node.js'],
      missing: ['mongodb'],
    });
    assert.match(text, /Aisha Khan/);
    assert.match(text, /react/);
    assert.match(text, /mongodb/);
  });

  it('disables the LLM in tests even if a key is present', () => {
    const prev = process.env.LLM_API_KEY;
    process.env.LLM_API_KEY = 'sk-test';
    try {
      assert.equal(llmConfig().enabled, false);
    } finally {
      if (prev == null) delete process.env.LLM_API_KEY;
      else process.env.LLM_API_KEY = prev;
    }
  });
});
