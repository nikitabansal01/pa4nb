/** Centralized mock / seed data for Career OS personalized flows. */

import { recommendCareerPaths, getLearningTopicsForDirection } from './careerDirections';

export const EMPTY_SNAPSHOT = {
  currentRole: '',
  yearsExperience: '',
  previousRoles: '',
  industries: '',
  skills: '',
  productsBuilt: '',
  leadership: '',
};

export const MOCK_RESUME_SNAPSHOT = {
  currentRole: 'Senior Product Manager',
  yearsExperience: '8',
  previousRoles: 'Product Manager, Associate PM, Business Analyst',
  industries: 'SaaS, Fintech, Marketplace',
  skills: 'Roadmapping, discovery, experimentation, stakeholder alignment, SQL',
  productsBuilt: 'B2B analytics dashboard, onboarding funnel, internal ops tooling',
  leadership: 'Led a cross-functional squad of 7; mentored 2 PMs',
};

/** LinkedIn-style parse: role history is clearer than impact or craft depth. */
export const MOCK_LINKEDIN_SNAPSHOT = {
  currentRole: 'Senior Product Manager',
  yearsExperience: '8',
  previousRoles: 'Product Manager · Associate PM · Business Analyst',
  industries: 'SaaS, Fintech',
  skills: 'Product management, roadmapping, stakeholder management',
  productsBuilt: 'Analytics and onboarding products',
  leadership: 'Managed cross-functional partners',
};

export const DEFAULT_CAREER_PATH = {
  id: 'pm-ai',
  title: 'AI Product Manager',
  focusAreas: ['LLM applications', 'AI copilots', 'Agentic workflows'],
  nextAction: 'Map your strongest AI-adjacent stories from recent work',
  deepen: ['LLM applications', 'AI copilots', 'Agentic workflows'],
  roles: ['AI Product Manager', 'GenAI PM', 'AI Features PM'],
};

export const REFLECTION_QUESTIONS = [
  {
    id: 'energy',
    prompt: 'Which parts of your past work gave you the most energy?',
    type: 'multi',
    options: [
      'Customer discovery',
      '0→1 shipping',
      'Experimentation',
      'Strategy & vision',
      'Cross-functional leadership',
      'Technical depth',
      'GTM / growth',
    ],
  },
  {
    id: 'lessOf',
    prompt: 'Which responsibilities do you want less of?',
    type: 'multi',
    options: [
      'Heavy process',
      'Status reporting',
      'Constant firefighting',
      'Politics / alignment theater',
      'Maintenance-only work',
      'Execution without strategy',
    ],
  },
  {
    id: 'productSurface',
    prompt: 'Do you prefer user-facing products or internal/platform systems?',
    type: 'choice',
    options: ['User-facing products', 'Internal / platform systems', 'A mix of both'],
  },
  {
    id: 'audience',
    prompt: 'B2B, B2C, or both?',
    type: 'choice',
    options: ['B2B', 'B2C', 'Both'],
  },
  {
    id: 'stage',
    prompt: '0→1 building or scaling an existing product?',
    type: 'choice',
    options: ['0→1 building', 'Scaling an existing product', 'Either, depending on the problem'],
  },
  {
    id: 'domains',
    prompt: 'Which domains currently excite you?',
    type: 'multi',
    options: [
      'AI / ML products',
      'Developer platforms',
      'Health / clinical',
      'Fintech',
      'Climate',
      'Marketplace',
      'Consumer',
      'B2B SaaS',
    ],
  },
  {
    id: 'learnNext',
    prompt: 'What do you want your next role to teach you?',
    type: 'multi',
    options: [
      'Deeper technical fluency',
      'GTM ownership',
      'Org leadership',
      'Domain expertise',
      '0→1 craft',
      'Platform thinking',
    ],
  },
];

export const SNAPSHOT_FIELDS = [
  { key: 'currentRole', label: 'Current role', placeholder: 'e.g. Senior Product Manager' },
  { key: 'yearsExperience', label: 'Years of experience', placeholder: 'e.g. 8' },
  { key: 'previousRoles', label: 'Previous roles', placeholder: 'Add a role', pills: true },
  { key: 'industries', label: 'Industries', placeholder: 'Add an industry', pills: true },
  { key: 'skills', label: 'Skills', placeholder: 'Add a skill', pills: true },
  { key: 'productsBuilt', label: 'Products or systems built', placeholder: 'What you shipped + outcome', multiline: true },
  { key: 'leadership', label: 'Leadership experience', placeholder: 'Teams led, mentoring, influence', multiline: true },
];

export const COMPARISON_DIMENSIONS = [
  { key: 'surface', label: 'User-facing vs infrastructure' },
  { key: 'audience', label: 'B2B vs B2C' },
  { key: 'stage', label: '0→1 vs scale' },
  { key: 'technicalDepth', label: 'Technical depth' },
  { key: 'gtmExposure', label: 'GTM exposure' },
  { key: 'domainSpecialization', label: 'Domain specialization' },
];

export const ASSUMPTION_FIELDS = [
  { key: 'surface', label: 'Product surface' },
  { key: 'audience', label: 'Audience' },
  { key: 'stage', label: 'Stage preference' },
  { key: 'domains', label: 'Exciting domains' },
  { key: 'energy', label: 'Energy sources' },
  { key: 'learnNext', label: 'What to learn next' },
];

export const STORY_GROUPS = [
  { id: 'leadership', label: 'Leadership' },
  { id: 'conflict', label: 'Conflict' },
  { id: 'prioritization', label: 'Prioritization' },
  { id: 'zeroToOne', label: '0→1 product building' },
  { id: 'failure', label: 'Failure' },
  { id: 'technical', label: 'Technical depth' },
  { id: 'stakeholders', label: 'Stakeholder management' },
];

export const PATH_LEARNING_TOPICS = {
  'AI Product Manager': [
    {
      topic: 'AI evaluation systems',
      time: '45 min',
      exercise: 'Design a lightweight eval set for one AI feature you have shipped or studied.',
    },
    {
      topic: 'LLM product sense',
      time: '40 min',
      exercise: 'Compare two AI workflows and score them on usefulness, reliability, and cost.',
    },
  ],
  'Platform Product Manager': [
    {
      topic: 'Platform adoption metrics',
      time: '45 min',
      exercise: 'Draft 3 leading indicators for a shared capability your last team shipped.',
    },
    {
      topic: 'API / developer UX critique',
      time: '40 min',
      exercise: 'Review one internal or public API and write a one-page friction list.',
    },
  ],
  'Growth Product Manager': [
    {
      topic: 'Experiment design',
      time: '40 min',
      exercise: 'Write an experiment brief for one activation or retention idea.',
    },
    {
      topic: 'Growth loop mapping',
      time: '35 min',
      exercise: 'Sketch the acquisition → activation → retention loop for a product you know.',
    },
  ],
};

export const TODAY_PRIORITY_DEFAULTS = [
  { id: 'default-follow', label: 'Follow up with recruiter', meta: 'Suggested' },
  { id: 'default-mock', label: 'Complete mock interview', meta: 'Suggested' },
  { id: 'default-research', label: 'Review company research', meta: 'Suggested' },
  { id: 'default-pipeline', label: 'Update pipeline status', meta: 'Suggested' },
];

function firstSentence(text, fallback) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return fallback;
  return trimmed.length > 110 ? `${trimmed.slice(0, 107)}…` : trimmed;
}

function fieldText(snapshot, key) {
  return String(snapshot?.[key] || '').trim();
}

function hasOutcomeSignal(text) {
  // Strip common role/product labels that contain digits (B2B, B2C) so they
  // don't count as impact evidence.
  const cleaned = String(text || '').replace(/\bb2[bc]\b/gi, '');
  return /\d|%|\bx\b|growth|retention|revenue|users|nps|conversion|arr|mrr|latency|adoption/i.test(
    cleaned
  );
}

/**
 * After resume/LinkedIn import, surface what we understood and where
 * more context would improve career-path quality.
 */
export function buildResumeInsights(snapshot = {}, { source = 'upload' } = {}) {
  const signals = [];
  const gaps = [];

  const role = fieldText(snapshot, 'currentRole');
  const years = fieldText(snapshot, 'yearsExperience');
  const previous = fieldText(snapshot, 'previousRoles');
  const industries = fieldText(snapshot, 'industries');
  const skills = fieldText(snapshot, 'skills');
  const products = fieldText(snapshot, 'productsBuilt');
  const leadership = fieldText(snapshot, 'leadership');

  if (role && years) {
    signals.push({
      id: 'trajectory',
      title: 'Clear role trajectory',
      detail: `${role} with about ${years} years of experience.`,
    });
  } else if (role) {
    signals.push({
      id: 'role',
      title: 'Current role detected',
      detail: role,
    });
  }

  if (previous) {
    signals.push({
      id: 'history',
      title: 'Career path history',
      detail: firstSentence(previous, previous),
    });
  }

  if (industries) {
    signals.push({
      id: 'domains',
      title: 'Domain exposure',
      detail: firstSentence(industries, industries),
    });
  }

  if (skills && skills.split(/[,;]/).filter(Boolean).length >= 3) {
    signals.push({
      id: 'skills',
      title: 'Skill signal',
      detail: firstSentence(skills, skills),
    });
  }

  if (leadership && leadership.length > 40) {
    signals.push({
      id: 'leadership',
      title: 'Leadership evidence',
      detail: firstSentence(leadership, leadership),
    });
  }

  if (!products || products.length < 36) {
    gaps.push({
      id: 'thin-products',
      field: 'productsBuilt',
      title: 'Products shipped',
      hint: 'Name 1–2 products + the outcome.',
      detail: '',
      action: 'Name 1–2 products + the outcome.',
    });
  } else if (!hasOutcomeSignal(products)) {
    gaps.push({
      id: 'product-outcomes',
      field: 'productsBuilt',
      title: 'Impact',
      hint: 'Add a metric or clear outcome.',
      detail: '',
      action: 'Add a metric or clear outcome.',
    });
  }

  if (!skills || skills.length < 24) {
    gaps.push({
      id: 'thin-skills',
      field: 'skills',
      title: 'Skills',
      hint: 'List the skills you want to be known for.',
      detail: '',
      action: 'List the skills you want to be known for.',
    });
  }

  if (!leadership || leadership.length < 28) {
    gaps.push({
      id: 'thin-leadership',
      field: 'leadership',
      title: 'Leadership',
      hint: 'Team size, mentoring, or a decision you owned.',
      detail: '',
      action: 'Team size, mentoring, or a decision you owned.',
    });
  }

  if (!industries) {
    gaps.push({
      id: 'missing-industries',
      field: 'industries',
      title: 'Industries',
      hint: 'Where have you worked?',
      detail: '',
      action: 'Where have you worked?',
    });
  }

  if (!role) {
    gaps.push({
      id: 'missing-role',
      field: 'currentRole',
      title: 'Current role',
      hint: 'Confirm your latest title.',
      detail: '',
      action: 'Confirm your latest title.',
    });
  }

  if (!years) {
    gaps.push({
      id: 'missing-years',
      field: 'yearsExperience',
      title: 'Experience',
      hint: 'Approx years of experience.',
      detail: '',
      action: 'Approx years of experience.',
    });
  }

  // One reflection nudge only — preferences live in the next section.
  gaps.push({
    id: 'energy-pref',
    field: null,
    reflectionId: 'energy',
    title: 'What gives you energy',
    detail: '',
    action: '',
  });
  const sourceLabel = source === 'linkedin' ? 'LinkedIn' : 'resume';
  const fieldGaps = gaps.filter((g) => g.field).slice(0, 3);
  const reflectionGap = gaps.find((g) => g.reflectionId) || null;
  const fieldHints = Object.fromEntries(
    fieldGaps.map((g) => [g.field, g.hint || g.action || g.detail])
  );

  return {
    headline: `Pulled from your ${sourceLabel}`,
    source,
    signals: signals.slice(0, 4).map((s) => ({
      id: s.id,
      label: s.title,
    })),
    fieldGaps: fieldGaps.map((g) => ({
      id: g.id,
      field: g.field,
      label: g.title,
      hint: g.hint || g.action,
    })),
    reflectionGap: reflectionGap
      ? {
          id: reflectionGap.id,
          reflectionId: reflectionGap.reflectionId,
          label: reflectionGap.title,
        }
      : null,
    fieldHints,
    highlightedFields: fieldGaps.map((g) => g.field),
    // legacy shape kept for safety
    gaps: fieldGaps,
    summary: '',
  };
}

export function buildAssumptionsFromAnswers(answers = {}, snapshot = {}) {
  return {
    surface: answers.productSurface || 'A mix of both',
    audience: answers.audience || 'Both',
    stage: answers.stage || 'Either, depending on the problem',
    domains: answers.domains || snapshot.industries || 'AI, platform, health',
    energy: answers.energy || 'Discovery and shipping meaningful product bets',
    learnNext: answers.learnNext || 'Deeper technical fluency and domain ownership',
    lessOf: answers.lessOf || '',
  };
}

/** Generate top-3 career routes from resume snapshot + reflection preferences. */
export function buildCareerPaths(snapshot = {}, assumptions = {}, options = {}) {
  return recommendCareerPaths(snapshot, assumptions, {
    answers: options.answers || {},
    limit: options.limit || 3,
  });
}

export function getPathLearningTopics(pathTitle) {
  if (PATH_LEARNING_TOPICS[pathTitle]) return PATH_LEARNING_TOPICS[pathTitle];
  return getLearningTopicsForDirection(pathTitle);
}
