/** Centralized mock / seed data for Career OS personalized flows. */

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

export const DEFAULT_CAREER_PATH = {
  id: 'ai-pm',
  title: 'AI Product PM',
  focusAreas: ['LLM product sense', 'Eval frameworks', 'AI trust & safety basics'],
  nextAction: 'Map your strongest AI-adjacent stories from recent work',
  deepen: ['LLM product sense', 'Eval frameworks', 'AI trust & safety basics'],
  roles: ['AI Product Manager', 'GenAI PM', 'AI Features PM'],
};

export const REFLECTION_QUESTIONS = [
  {
    id: 'energy',
    prompt: 'Which parts of your past work gave you the most energy?',
    type: 'text',
    placeholder: 'e.g. early discovery with customers, shipping 0→1 bets…',
  },
  {
    id: 'lessOf',
    prompt: 'Which responsibilities do you want less of?',
    type: 'text',
    placeholder: 'e.g. heavy process overhead, pure status reporting…',
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
    type: 'text',
    placeholder: 'e.g. AI tooling, climate, health, developer platforms…',
  },
  {
    id: 'learnNext',
    prompt: 'What do you want your next role to teach you?',
    type: 'text',
    placeholder: 'e.g. deeper technical fluency, GTM ownership, org leadership…',
  },
];

export const SNAPSHOT_FIELDS = [
  { key: 'currentRole', label: 'Current role', placeholder: 'e.g. Senior Product Manager' },
  { key: 'yearsExperience', label: 'Years of experience', placeholder: 'e.g. 8' },
  { key: 'previousRoles', label: 'Previous roles', placeholder: 'Comma-separated roles', multiline: true },
  { key: 'industries', label: 'Industries', placeholder: 'e.g. SaaS, Fintech', multiline: true },
  { key: 'skills', label: 'Skills', placeholder: 'Skills that show up in your work', multiline: true },
  { key: 'productsBuilt', label: 'Products or systems built', placeholder: 'What you shipped or owned', multiline: true },
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
  'AI Product PM': [
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
  'Platform PM': [
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
  'Healthcare AI Product Lead': [
    {
      topic: 'Clinical workflow mapping',
      time: '50 min',
      exercise: 'Map a patient or clinician journey for one workflow and mark decision points.',
    },
    {
      topic: 'Responsible AI in regulated settings',
      time: '35 min',
      exercise: 'Write a go/no-go checklist for an AI feature touching clinical notes.',
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

export function buildAssumptionsFromAnswers(answers = {}, snapshot = {}) {
  return {
    surface: answers.productSurface || 'A mix of both',
    audience: answers.audience || 'Both',
    stage: answers.stage || 'Either, depending on the problem',
    domains: answers.domains || snapshot.industries || 'AI, platform, health',
    energy: answers.energy || 'Discovery and shipping meaningful product bets',
    learnNext: answers.learnNext || 'Deeper technical fluency and domain ownership',
  };
}

/** Generate comparable career paths from resume snapshot + preferences. */
export function buildCareerPaths(snapshot = {}, assumptions = {}) {
  const skills = firstSentence(snapshot.skills, 'Roadmapping, discovery, stakeholder alignment');
  const products = firstSentence(snapshot.productsBuilt, 'Analytics and internal tooling');
  const role = snapshot.currentRole || 'Product Manager';
  const years = snapshot.yearsExperience || 'several';
  const leadership = firstSentence(snapshot.leadership, 'Cross-functional leadership');
  const domains = firstSentence(assumptions.domains, 'AI and platform');
  const audience = assumptions.audience || 'Both';

  return [
    {
      id: 'ai-pm',
      title: 'AI Product PM',
      whyFits: `Matches ${years}+ yrs as ${role} with discovery strength and interest in ${domains}.`,
      evidence: [skills, products, leadership].filter(Boolean),
      exciting: 'Shaping model-powered workflows users feel day to day.',
      tradeoffs: 'Ambiguous roadmaps; eval quality often moves slower than demos.',
      deepen: DEFAULT_CAREER_PATH.deepen,
      roles: DEFAULT_CAREER_PATH.roles,
      dimensions: {
        surface: 'User-facing',
        audience: audience.includes('B2C') && !audience.includes('B2B') ? 'B2C' : 'B2B-leaning',
        stage: '0→1 + early scale',
        technicalDepth: 'Medium-high',
        gtmExposure: 'Medium',
        domainSpecialization: 'AI product',
      },
    },
    {
      id: 'platform-pm',
      title: 'Platform PM',
      whyFits: 'Your internal systems work and stakeholder alignment translate well to platform leverage.',
      evidence: [products, skills, `Prior roles: ${firstSentence(snapshot.previousRoles, 'PM track')}`],
      exciting: 'Building shared capabilities that multiply many product teams.',
      tradeoffs: 'Success is indirect; less visible user love, more enablement politics.',
      deepen: ['Platform strategy', 'API / developer UX', 'Adoption metrics'],
      roles: ['Platform PM', 'Internal Tools PM', 'Developer Experience PM'],
      dimensions: {
        surface: 'Infrastructure',
        audience: 'B2B / internal',
        stage: 'Scale systems',
        technicalDepth: 'High',
        gtmExposure: 'Low-medium',
        domainSpecialization: 'Platform',
      },
    },
    {
      id: 'health-ai',
      title: 'Healthcare AI Product Lead',
      whyFits: `Leadership signal plus domain curiosity around ${domains} supports a specialized lead path.`,
      evidence: [leadership, skills, firstSentence(snapshot.industries, 'Regulated or complex domains')],
      exciting: 'High-stakes problems where product judgment clearly changes outcomes.',
      tradeoffs: 'Longer cycles, compliance load, and slower experimentation.',
      deepen: ['Healthcare workflows', 'Clinical stakeholder mapping', 'Responsible AI'],
      roles: ['Healthcare AI Product Lead', 'Clinical Product Lead', 'HealthTech Group PM'],
      dimensions: {
        surface: 'Mixed',
        audience: 'B2B',
        stage: 'Scale with care',
        technicalDepth: 'Medium',
        gtmExposure: 'Medium-high',
        domainSpecialization: 'Healthcare',
      },
    },
  ];
}

export function getPathLearningTopics(pathTitle) {
  if (PATH_LEARNING_TOPICS[pathTitle]) return PATH_LEARNING_TOPICS[pathTitle];
  const lower = (pathTitle || '').toLowerCase();
  if (lower.includes('platform')) return PATH_LEARNING_TOPICS['Platform PM'];
  if (lower.includes('health')) return PATH_LEARNING_TOPICS['Healthcare AI Product Lead'];
  return PATH_LEARNING_TOPICS['AI Product PM'];
}
