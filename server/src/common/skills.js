function slugSkill(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeSkills(skills = []) {
  return [...new Set((skills || []).map(slugSkill).filter(Boolean))];
}

function matchScore(projectSkills, freelancerSkills) {
  const required = new Set(normalizeSkills(projectSkills));
  const have = new Set(normalizeSkills(freelancerSkills));
  if (required.size === 0) {
    return { score: 0, matched: [], missing: [], extraBonus: 0 };
  }
  const matched = [...required].filter((skill) => have.has(skill));
  const missing = [...required].filter((skill) => !have.has(skill));
  const extra = [...have].filter((skill) => !required.has(skill)).length;
  const overlap = matched.length / required.size;
  const extraBonus = Math.min(0.05, extra * 0.01);
  const score = Math.round(100 * Math.min(1, overlap + extraBonus));
  return { score, matched, missing, extraBonus };
}

module.exports = { slugSkill, normalizeSkills, matchScore };
