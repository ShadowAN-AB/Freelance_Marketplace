function llmConfig() {
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '';
  const baseUrl = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.LLM_MODEL || 'gpt-4o-mini';
  const enabled = Boolean(apiKey) && process.env.NODE_ENV !== 'test';
  return { apiKey, baseUrl, model, enabled };
}

function freelancerRationale(row) {
  const name = row.freelancer?.name || 'This freelancer';
  const hit = row.matched?.length ? row.matched.join(', ') : 'none of the required skills';
  const miss = row.missing?.length ? ` Still missing ${row.missing.join(', ')}.` : '';
  return `${name} covers ${hit}.${miss}`;
}

function projectRationale(row) {
  const title = row.project?.title || 'This brief';
  const hit = row.matched?.length ? row.matched.join(', ') : 'no overlapping skills';
  const miss = row.missing?.length ? ` Gaps: ${row.missing.join(', ')}.` : '';
  return `${title} matches on ${hit}.${miss}`;
}

function withHeuristic(rows, kind) {
  return rows.map((row) => ({
    ...row,
    rationale: kind === 'freelancer' ? freelancerRationale(row) : projectRationale(row),
  }));
}

async function completeChat(config, system, user) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`llm ${res.status}`);
    const body = await res.json();
    const text = body.choices?.[0]?.message?.content || '{}';
    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}

function applyLlmMap(rows, map, idOf) {
  return rows.map((row) => {
    const id = String(idOf(row));
    const extra = map[id];
    if (!extra || typeof extra !== 'string') return row;
    return { ...row, rationale: extra.slice(0, 280) };
  });
}

async function decorateFreelancers(project, rows) {
  const ranked = withHeuristic(rows, 'freelancer');
  const config = llmConfig();
  if (!config.enabled || !ranked.length) return { data: ranked, engine: 'heuristic' };
  try {
    const payload = {
      project: {
        title: project.title,
        description: String(project.description || '').slice(0, 600),
        skills: project.skills || [],
      },
      talent: ranked.slice(0, 8).map((row) => ({
        id: String(row.freelancer._id),
        name: row.freelancer.name,
        title: row.freelancer.freelancerProfile?.title || '',
        skills: row.freelancer.freelancerProfile?.skills || [],
        score: row.score,
      })),
    };
    const parsed = await completeChat(
      config,
      'You rank freelance talent. Reply JSON {"reasons":{"<id>":"<one sentence>"}} only. Be concrete about skills. No markdown.',
      JSON.stringify(payload)
    );
    const map = parsed.reasons || parsed;
    return { data: applyLlmMap(ranked, map, (row) => row.freelancer._id), engine: 'llm' };
  } catch {
    return { data: ranked, engine: 'heuristic' };
  }
}

async function decorateProjects(freelancer, rows) {
  const ranked = withHeuristic(rows, 'project');
  const config = llmConfig();
  if (!config.enabled || !ranked.length) return { data: ranked, engine: 'heuristic' };
  try {
    const payload = {
      freelancer: {
        name: freelancer.name,
        title: freelancer.freelancerProfile?.title || '',
        skills: freelancer.freelancerProfile?.skills || [],
      },
      projects: ranked.slice(0, 8).map((row) => ({
        id: String(row.project._id),
        title: row.project.title,
        skills: row.project.skills || [],
        score: row.score,
      })),
    };
    const parsed = await completeChat(
      config,
      'You recommend open freelance briefs. Reply JSON {"reasons":{"<id>":"<one sentence>"}} only. Be concrete about skills. No markdown.',
      JSON.stringify(payload)
    );
    const map = parsed.reasons || parsed;
    return { data: applyLlmMap(ranked, map, (row) => row.project._id), engine: 'llm' };
  } catch {
    return { data: ranked, engine: 'heuristic' };
  }
}

module.exports = {
  llmConfig,
  freelancerRationale,
  projectRationale,
  decorateFreelancers,
  decorateProjects,
};
