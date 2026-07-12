import { getCareerDirectionSnapshot } from './todayInsights';

export const STORY_COMPETENCIES = [
  { id: 'leadership', label: 'Leadership' },
  { id: 'product-strategy', label: 'Product Strategy' },
  { id: 'product-sense', label: 'Product Sense' },
  { id: 'prioritization', label: 'Prioritization' },
  { id: 'execution', label: 'Execution' },
  { id: 'ambiguity', label: 'Ambiguity' },
  { id: 'conflict', label: 'Conflict' },
  { id: 'failure', label: 'Failure' },
  { id: 'influence', label: 'Influence without authority' },
  { id: 'technical', label: 'Technical collaboration' },
  { id: 'customer', label: 'Customer obsession' },
];

export const STORY_TAG_OPTIONS = [
  'Healthcare',
  'B2B',
  'AI',
  'Platform',
  'Growth',
  'Consumer',
  'Enterprise',
  '0→1',
  'Scale',
];

export const STORY_CONFIDENCE = [
  { id: 'draft', label: 'Draft' },
  { id: 'developing', label: 'Developing' },
  { id: 'ready', label: 'Ready' },
  { id: 'strong', label: 'Strong' },
];

const LEGACY_GROUP_MAP = {
  leadership: 'leadership',
  conflict: 'conflict',
  prioritization: 'prioritization',
  zeroToOne: 'product-sense',
  failure: 'failure',
  technical: 'technical',
  stakeholders: 'influence',
};

function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function filled(value) {
  return Boolean(String(value || '').trim());
}

function emptyStar() {
  return { situation: '', task: '', action: '', result: '' };
}

export function createStoryVersion(partial = {}) {
  const star = { ...emptyStar(), ...partial };
  return {
    id: partial.id || uid('ver'),
    situation: star.situation || '',
    task: star.task || '',
    action: star.action || '',
    result: star.result || '',
    feedback: partial.feedback || '',
    feedbackAt: partial.feedbackAt || null,
    updatedAt: partial.updatedAt || new Date().toISOString(),
  };
}

export function createEmptyStory(competencyId = 'leadership') {
  const version = createStoryVersion();
  const competency = STORY_COMPETENCIES.find((c) => c.id === competencyId);
  return {
    id: uid('story'),
    competencyId,
    title: competency ? `${competency.label} story` : 'New story',
    versions: [version],
    activeVersionId: version.id,
    tags: [],
    pinned: false,
    confidence: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function starFromLegacy(saved = {}) {
  const prompt = String(saved.prompt || '').trim();
  const angle = String(saved.angle || '').trim();
  const evidence = String(saved.evidence || '').trim();
  return createStoryVersion({
    situation: prompt,
    task: angle,
    action: evidence,
    result: '',
  });
}

/** Migrate Interview Prep keyed bank → story list. */
export function normalizeStoryBank(raw) {
  if (!raw) return { stories: [], version: 2 };

  if (Array.isArray(raw.stories)) {
    return {
      version: 2,
      stories: raw.stories.map((story) => normalizeStory(story)).filter(Boolean),
    };
  }

  // Legacy shape: { leadership: { prompt, angle, evidence }, ... }
  const stories = [];
  for (const [key, value] of Object.entries(raw)) {
    if (!value || typeof value !== 'object') continue;
    const competencyId = LEGACY_GROUP_MAP[key] || key;
    if (!STORY_COMPETENCIES.some((c) => c.id === competencyId)) continue;
    const version = starFromLegacy(value);
    const competency = STORY_COMPETENCIES.find((c) => c.id === competencyId);
    stories.push({
      id: uid(`legacy-${competencyId}`),
      competencyId,
      title: competency?.label || key,
      versions: [version],
      activeVersionId: version.id,
      tags: [],
      pinned: false,
      confidence: filled(value.prompt) || filled(value.evidence) ? 'developing' : 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return { version: 2, stories };
}

function normalizeStory(story) {
  if (!story || typeof story !== 'object') return null;
  const competencyId = STORY_COMPETENCIES.some((c) => c.id === story.competencyId)
    ? story.competencyId
    : 'leadership';
  let versions = Array.isArray(story.versions) && story.versions.length
    ? story.versions.map((v) => createStoryVersion(v))
    : [createStoryVersion({
        situation: story.situation,
        task: story.task,
        action: story.action,
        result: story.result,
        feedback: story.feedback,
      })];
  const activeVersionId = versions.some((v) => v.id === story.activeVersionId)
    ? story.activeVersionId
    : versions[0].id;
  const confidence = STORY_CONFIDENCE.some((c) => c.id === story.confidence)
    ? story.confidence
    : 'draft';

  return {
    id: story.id || uid('story'),
    competencyId,
    title: filled(story.title)
      ? story.title
      : (STORY_COMPETENCIES.find((c) => c.id === competencyId)?.label || 'Story'),
    versions,
    activeVersionId,
    tags: Array.isArray(story.tags) ? story.tags.filter(Boolean) : [],
    pinned: Boolean(story.pinned),
    confidence,
    createdAt: story.createdAt || new Date().toISOString(),
    updatedAt: story.updatedAt || new Date().toISOString(),
  };
}

export function getActiveVersion(story) {
  if (!story?.versions?.length) return createStoryVersion();
  return story.versions.find((v) => v.id === story.activeVersionId) || story.versions[0];
}

export function starCompleteness(version) {
  const fields = ['situation', 'task', 'action', 'result'];
  const filledCount = fields.filter((f) => filled(version?.[f])).length;
  return { filledCount, total: fields.length, percent: Math.round((filledCount / 4) * 100) };
}

/** Lightweight local “AI” feedback on STAR quality. */
export function generateStoryFeedback(story, version) {
  const tips = [];
  const s = version || getActiveVersion(story);
  const competency = STORY_COMPETENCIES.find((c) => c.id === story.competencyId)?.label || 'this competency';

  if (!filled(s.situation)) tips.push('Add a concrete Situation: company, stakes, and timeframe.');
  else if (s.situation.trim().split(/\s+/).length < 12) {
    tips.push('Situation is thin — add enough context that a stranger could follow.');
  }

  if (!filled(s.task)) tips.push('Clarify your Task / ownership — what were you specifically responsible for?');
  if (!filled(s.action)) tips.push('Spell out Actions you took, not the team in aggregate.');
  else if (!/\b(i|my)\b/i.test(s.action)) {
    tips.push('Actions should center on what you did (“I…”) so ownership is clear.');
  }

  if (!filled(s.result)) tips.push('Close with a Result: outcome, metric, or learning.');
  else if (!/\d|%|x\b|retained|grew|reduced|shipped|launched|saved|improved/i.test(s.result)) {
    tips.push('Result could be sharper — add a metric, decision, or lasting change.');
  }

  if (tips.length === 0) {
    tips.push(`Solid STAR skeleton for ${competency}. Tighten the turning point and rehearse a 90-second cut.`);
    tips.push('Optional: add a one-line “so what” that maps this story to your target direction.');
  }

  return {
    summary: tips[0],
    tips,
    generatedAt: new Date().toISOString(),
  };
}

export function seedStoriesForPath(profileOrSelection, existingStories = []) {
  if (existingStories.length > 0) return existingStories;

  const direction = getCareerDirectionSnapshot(profileOrSelection);
  const path = direction.primaryTitle || 'your target path';
  const focus = (direction.focusAreas || [])[0];
  const seeds = [
    {
      competencyId: 'leadership',
      title: 'Led a cross-functional outcome',
      situation: `On a ${path}-relevant initiative, the team needed clearer direction under time pressure.`,
      task: 'Own the decision path and keep engineering, design, and stakeholders aligned.',
      tags: focus ? [guessTag(focus), 'B2B'].filter(Boolean) : ['B2B'],
    },
    {
      competencyId: 'prioritization',
      title: 'Said no to protect the roadmap',
      situation: 'A loud stakeholder request threatened focus on the highest-leverage work.',
      task: 'Re-sequence work without damaging trust.',
      tags: ['Platform', 'Growth'],
    },
    {
      competencyId: 'failure',
      title: 'Missed outcome and recovery',
      situation: 'A bet missed its goal and created follow-on risk.',
      task: 'Diagnose, communicate, and change the operating approach.',
      tags: ['0→1'],
    },
  ];

  return seeds.map((seed) => {
    const version = createStoryVersion({
      situation: seed.situation,
      task: seed.task,
      action: '',
      result: '',
    });
    return {
      id: uid('seed'),
      competencyId: seed.competencyId,
      title: seed.title,
      versions: [version],
      activeVersionId: version.id,
      tags: seed.tags,
      pinned: false,
      confidence: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

function guessTag(focusArea) {
  const text = String(focusArea || '').toLowerCase();
  if (/ai|llm|agent|model/.test(text)) return 'AI';
  if (/platform|api|developer/.test(text)) return 'Platform';
  if (/growth|retention|activation|experiment/.test(text)) return 'Growth';
  if (/enterprise|b2b|customer/.test(text)) return 'Enterprise';
  if (/health|care/.test(text)) return 'Healthcare';
  return null;
}

export function groupStoriesByCompetency(stories) {
  return STORY_COMPETENCIES.map((competency) => {
    const items = stories
      .filter((s) => s.competencyId === competency.id)
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || String(b.updatedAt).localeCompare(String(a.updatedAt)));
    return { ...competency, stories: items };
  }).filter((group) => group.stories.length > 0);
}

export function updateStoryInBank(bank, storyId, updater) {
  const normalized = normalizeStoryBank(bank);
  const stories = normalized.stories.map((story) => {
    if (story.id !== storyId) return story;
    const next = typeof updater === 'function' ? updater(story) : { ...story, ...updater };
    return normalizeStory({ ...next, updatedAt: new Date().toISOString() });
  });
  return { version: 2, stories };
}

export function upsertStoryInBank(bank, story) {
  const normalized = normalizeStoryBank(bank);
  const existing = normalized.stories.findIndex((s) => s.id === story.id);
  const nextStory = normalizeStory({ ...story, updatedAt: new Date().toISOString() });
  if (existing === -1) {
    return { version: 2, stories: [nextStory, ...normalized.stories] };
  }
  const stories = [...normalized.stories];
  stories[existing] = nextStory;
  return { version: 2, stories };
}

export function removeStoryFromBank(bank, storyId) {
  const normalized = normalizeStoryBank(bank);
  return {
    version: 2,
    stories: normalized.stories.filter((s) => s.id !== storyId),
  };
}
