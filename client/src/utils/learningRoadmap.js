import { CAREER_DIRECTIONS } from '../careerDirections';
import { getCareerDirectionSnapshot } from './todayInsights';

export const ROADMAP_ITEM_STATUS = {
  not_started: 'not_started',
  in_progress: 'in_progress',
  completed: 'completed',
};

export const ROADMAP_STATUS_LABELS = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Done',
};

function item(id, label) {
  return { id, label };
}

function milestone(id, title, { concepts = [], exercises = [], projects = [] }) {
  return { id, title, concepts, exercises, projects };
}

/** Path-specific progressive roadmaps (fundamentals → advanced practice). */
export const PATH_ROADMAPS = {
  'AI Product Manager': [
    milestone('foundations', 'Foundations', {
      concepts: [
        item('llms', 'LLMs & foundation models'),
        item('prompting', 'Prompting patterns'),
        item('evals', 'AI evaluation basics'),
        item('copilots', 'Copilot UX patterns'),
      ],
      exercises: [
        item('prompt-lab', 'Rewrite 5 prompts for clarity and constraints'),
        item('eval-sketch', 'Sketch an eval set for one AI feature'),
      ],
      projects: [
        item('feature-brief', 'Write a one-page AI feature brief with success metrics'),
      ],
    }),
    milestone('systems', 'AI Product Systems', {
      concepts: [
        item('rag', 'RAG architectures'),
        item('agents', 'AI agents & tool use'),
        item('cost', 'Latency, cost, and quality tradeoffs'),
        item('safety', 'Safety, privacy, and trust'),
      ],
      exercises: [
        item('rag-map', 'Map retrieval → generation for a real workflow'),
        item('failure-modes', 'List top failure modes for an agentic flow'),
      ],
      projects: [
        item('system-critique', 'Critique a public AI product’s system design'),
      ],
    }),
    milestone('product-craft', 'AI Product Craft', {
      concepts: [
        item('discovery', 'AI discovery & problem framing'),
        item('metrics', 'Online + offline metrics'),
        item('rollout', 'Launch and ramp strategies'),
        item('positioning', 'When not to use AI'),
      ],
      exercises: [
        item('metric-tree', 'Build a metric tree for an AI surface'),
        item('kill-criteria', 'Define kill criteria for a pilot'),
      ],
      projects: [
        item('prd', 'Draft a lightweight PRD for an AI workflow'),
      ],
    }),
    milestone('advanced', 'Advanced Practice', {
      concepts: [
        item('case-studies', 'AI product case studies'),
        item('critiques', 'Product critiques'),
        item('decisions', 'Mock product decisions'),
        item('storytelling', 'Explaining AI tradeoffs to execs'),
      ],
      exercises: [
        item('mock-decision', 'Run a 20-minute mock AI product decision'),
        item('exec-memo', 'Write a one-page exec memo on a hard tradeoff'),
      ],
      projects: [
        item('portfolio', 'Ship a small AI demo or teardown portfolio piece'),
      ],
    }),
  ],

  'Platform Product Manager': [
    milestone('foundations', 'Foundations', {
      concepts: [
        item('platform-basics', 'What makes a platform'),
        item('apis', 'API design literacy'),
        item('tenancy', 'Multi-tenancy & shared services'),
        item('adoption', 'Adoption vs feature shipping'),
      ],
      exercises: [
        item('api-critique', 'Critique one internal or public API'),
        item('consumer-map', 'Map platform consumers and jobs-to-be-done'),
      ],
      projects: [
        item('capability-brief', 'Write a shared-capability one-pager'),
      ],
    }),
    milestone('systems', 'Platform Systems', {
      concepts: [
        item('contracts', 'Contracts, versioning, and breaking changes'),
        item('observability', 'Observability for platform health'),
        item('slo', 'SLOs and reliability partnerships'),
        item('self-serve', 'Self-serve developer experience'),
      ],
      exercises: [
        item('friction-list', 'Write a friction list from a real onboarding path'),
        item('slo-draft', 'Draft SLOs for one shared service'),
      ],
      projects: [
        item('dx-audit', 'Run a developer experience audit'),
      ],
    }),
    milestone('platform-skills', 'Platform PM Skills', {
      concepts: [
        item('prioritization', 'Internal prioritization & influence'),
        item('metrics', 'Platform adoption metrics'),
        item('governance', 'Standards without bureaucracy'),
        item('roadmap', 'Roadmap communication to product teams'),
      ],
      exercises: [
        item('leading-indicators', 'Define 3 leading adoption indicators'),
        item('rfc', 'Write a short RFC for a platform change'),
      ],
      projects: [
        item('adoption-plan', 'Build an adoption plan for one capability'),
      ],
    }),
    milestone('advanced', 'Advanced Practice', {
      concepts: [
        item('case-studies', 'Platform case studies'),
        item('critiques', 'Platform product critiques'),
        item('decisions', 'Mock platform investment decisions'),
        item('narrative', 'Executive platform narrative'),
      ],
      exercises: [
        item('invest-or-not', 'Mock “build vs buy vs wait” decision'),
        item('narrative-deck', 'Outline a 5-slide platform narrative'),
      ],
      projects: [
        item('mini-platform', 'Prototype a tiny internal platform surface'),
      ],
    }),
  ],

  'Forward Deployed Product Manager': [
    milestone('foundations', 'Foundations', {
      concepts: [
        item('llms', 'LLMs'),
        item('prompting', 'Prompting'),
        item('rag', 'RAG'),
        item('agents', 'AI Agents'),
      ],
      exercises: [
        item('prompt-drill', 'Practice prompting for a customer workflow'),
        item('rag-sketch', 'Sketch a RAG path for one enterprise use case'),
      ],
      projects: [
        item('ai-primer', 'Build a one-page AI systems primer for field work'),
      ],
    }),
    milestone('enterprise', 'Enterprise AI Systems', {
      concepts: [
        item('apis', 'APIs'),
        item('integrations', 'Integrations'),
        item('security', 'Security'),
        item('workflows', 'Enterprise workflows'),
      ],
      exercises: [
        item('integration-map', 'Map systems touched by one deployment'),
        item('security-questions', 'Write the top 10 security questions you’d ask'),
      ],
      projects: [
        item('workflow-teardown', 'Teardown an enterprise workflow end-to-end'),
      ],
    }),
    milestone('fwd-skills', 'Forward Deployed Skills', {
      concepts: [
        item('discovery', 'Customer discovery'),
        item('solution', 'Solution design'),
        item('comms', 'Technical communication'),
        item('impl', 'Implementation planning'),
      ],
      exercises: [
        item('discovery-script', 'Draft a discovery script for a pilot kickoff'),
        item('solution-outline', 'Outline a solution design in one page'),
      ],
      projects: [
        item('pilot-plan', 'Write a pilot → production implementation plan'),
      ],
    }),
    milestone('advanced', 'Advanced Practice', {
      concepts: [
        item('projects', 'Build small projects'),
        item('cases', 'Case studies'),
        item('critiques', 'Product critiques'),
        item('decisions', 'Mock product decisions'),
      ],
      exercises: [
        item('mock-decision', 'Run a mock customer product decision'),
        item('critique', 'Critique a forward-deployed engagement narrative'),
      ],
      projects: [
        item('field-demo', 'Ship a small field demo or deployment playbook'),
      ],
    }),
  ],

  'Growth Product Manager': [
    milestone('foundations', 'Foundations', {
      concepts: [
        item('funnels', 'Funnel literacy'),
        item('activation', 'Activation & aha moments'),
        item('retention', 'Retention basics'),
        item('instrumentation', 'Instrumentation & event quality'),
      ],
      exercises: [
        item('funnel-map', 'Map acquisition → activation → retention for one product'),
        item('event-audit', 'Audit event quality for one critical path'),
      ],
      projects: [
        item('growth-model', 'Draft a simple growth model one-pager'),
      ],
    }),
    milestone('experimentation', 'Experimentation', {
      concepts: [
        item('hypothesis', 'Hypothesis design'),
        item('power', 'Sample size & decision quality'),
        item('guardrails', 'Guardrail metrics'),
        item('qual-quant', 'Qual + quant together'),
      ],
      exercises: [
        item('exp-brief', 'Write an experiment brief for one activation idea'),
        item('readout', 'Practice writing an experiment readout'),
      ],
      projects: [
        item('exp-backlog', 'Build a prioritized experiment backlog'),
      ],
    }),
    milestone('growth-skills', 'Growth PM Skills', {
      concepts: [
        item('loops', 'Growth loops'),
        item('monetization', 'Monetization levers'),
        item('channels', 'Channel and product growth'),
        item('segmentation', 'Segmentation & targeting'),
      ],
      exercises: [
        item('loop-sketch', 'Sketch one growth loop with friction points'),
        item('segment-brief', 'Write a segment hypothesis brief'),
      ],
      projects: [
        item('growth-plan', 'Draft a 90-day growth plan for one metric'),
      ],
    }),
    milestone('advanced', 'Advanced Practice', {
      concepts: [
        item('case-studies', 'Growth case studies'),
        item('critiques', 'Growth product critiques'),
        item('decisions', 'Mock growth investment decisions'),
        item('narrative', 'Metric storytelling under ambiguity'),
      ],
      exercises: [
        item('mock-review', 'Run a mock growth review'),
        item('ambiguous-metric', 'Explain a noisy metric in 90 seconds'),
      ],
      projects: [
        item('mini-experiment', 'Design and instrument a tiny growth experiment'),
      ],
    }),
  ],
};

function slug(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
}

function fallbackRoadmap(pathTitle, focusAreas = []) {
  const areas = focusAreas.length
    ? focusAreas
    : ['Core craft', 'Domain fluency', 'Execution', 'Communication'];

  return [
    milestone('foundations', 'Foundations', {
      concepts: areas.slice(0, 4).map((label, i) => item(`c-${i}`, label)),
      exercises: [
        item('ex-1', `Write a crisp overview of ${areas[0] || 'your craft'}`),
        item('ex-2', 'Teach one concept aloud in 3 minutes'),
      ],
      projects: [
        item('proj-1', `Build a one-page primer for ${pathTitle}`),
      ],
    }),
    milestone('depth', 'Role Depth', {
      concepts: (areas.slice(0, 3).length ? areas.slice(0, 3) : ['Systems thinking', 'Tradeoffs', 'Stakeholders']).map(
        (label, i) => item(`d-c-${i}`, label)
      ),
      exercises: [
        item('d-ex-1', 'Map the systems and stakeholders in one recent project'),
        item('d-ex-2', 'Write the hard tradeoff you would defend in an interview'),
      ],
      projects: [
        item('d-proj-1', 'Create a case study from your strongest work'),
      ],
    }),
    milestone('practice', 'Applied Skills', {
      concepts: [
        item('p-c-1', 'Customer / user discovery'),
        item('p-c-2', 'Solution design'),
        item('p-c-3', 'Technical communication'),
        item('p-c-4', 'Implementation planning'),
      ],
      exercises: [
        item('p-ex-1', 'Draft a discovery script for a target problem'),
        item('p-ex-2', 'Outline a solution and rollout plan on one page'),
      ],
      projects: [
        item('p-proj-1', 'Ship a small project that proves the skill'),
      ],
    }),
    milestone('advanced', 'Advanced Practice', {
      concepts: [
        item('a-c-1', 'Build small projects'),
        item('a-c-2', 'Case studies'),
        item('a-c-3', 'Product critiques'),
        item('a-c-4', 'Mock product decisions'),
      ],
      exercises: [
        item('a-ex-1', 'Run a mock product decision in 20 minutes'),
        item('a-ex-2', 'Critique a product in your target space'),
      ],
      projects: [
        item('a-proj-1', 'Assemble a portfolio artifact for this direction'),
      ],
    }),
  ];
}

export function resolvePathMeta(profileOrSelection) {
  const direction = getCareerDirectionSnapshot(profileOrSelection);
  const catalog = CAREER_DIRECTIONS.find((d) => d.title === direction.primaryTitle)
    || CAREER_DIRECTIONS.find((d) => d.id === direction.primaryPathId)
    || null;

  return {
    pathId: catalog?.id || direction.primaryPathId || slug(direction.primaryTitle) || 'default',
    pathTitle: direction.primaryTitle || 'Your career path',
    focusAreas: direction.focusAreas?.length
      ? direction.focusAreas
      : catalog?.focusAreas || [],
    isMockPath: Boolean(direction.isMock),
    nextAction: direction.nextAction || '',
  };
}

function enrichMilestone(pathId, milestoneDef) {
  const sections = [
    { key: 'concepts', label: 'Concepts', items: milestoneDef.concepts },
    { key: 'exercises', label: 'Exercises', items: milestoneDef.exercises },
    { key: 'projects', label: 'Mini projects', items: milestoneDef.projects },
  ];

  return {
    ...milestoneDef,
    sections: sections.map((section) => ({
      ...section,
      items: section.items.map((entry) => ({
        ...entry,
        fullId: `${pathId}:${milestoneDef.id}:${section.key}:${entry.id}`,
      })),
    })),
  };
}

export function buildLearningRoadmap(profileOrSelection, savedProgress = {}) {
  const meta = resolvePathMeta(profileOrSelection);
  const defs = PATH_ROADMAPS[meta.pathTitle] || fallbackRoadmap(meta.pathTitle, meta.focusAreas);
  const pathProgress = savedProgress?.[meta.pathId] || {};

  const milestones = defs.map((def) => {
    const enriched = enrichMilestone(meta.pathId, def);
    const allItems = enriched.sections.flatMap((s) => s.items);
    const withStatus = enriched.sections.map((section) => ({
      ...section,
      items: section.items.map((entry) => {
        const status = pathProgress[entry.fullId];
        return {
          ...entry,
          status: ROADMAP_ITEM_STATUS[status] ? status : ROADMAP_ITEM_STATUS.not_started,
        };
      }),
    }));
    const completed = withStatus
      .flatMap((s) => s.items)
      .filter((i) => i.status === ROADMAP_ITEM_STATUS.completed).length;
    const total = allItems.length;
    const inProgress = withStatus
      .flatMap((s) => s.items)
      .some((i) => i.status === ROADMAP_ITEM_STATUS.in_progress);

    let state = 'upcoming';
    if (completed === total && total > 0) state = 'complete';
    else if (completed > 0 || inProgress) state = 'active';

    return {
      ...enriched,
      sections: withStatus,
      progress: {
        completed,
        total,
        percent: total ? Math.round((completed / total) * 100) : 0,
      },
      state,
    };
  });

  // Unlock feel: first incomplete is active if none marked yet
  const hasActive = milestones.some((m) => m.state === 'active');
  if (!hasActive) {
    const firstOpen = milestones.find((m) => m.state !== 'complete');
    if (firstOpen) firstOpen.state = 'active';
  }

  const overallCompleted = milestones.reduce((sum, m) => sum + m.progress.completed, 0);
  const overallTotal = milestones.reduce((sum, m) => sum + m.progress.total, 0);

  return {
    ...meta,
    milestones,
    progress: {
      completed: overallCompleted,
      total: overallTotal,
      percent: overallTotal ? Math.round((overallCompleted / overallTotal) * 100) : 0,
      milestonesComplete: milestones.filter((m) => m.state === 'complete').length,
      milestoneCount: milestones.length,
    },
  };
}

export function setRoadmapItemStatus(savedProgress, pathId, itemFullId, status) {
  const nextStatus = ROADMAP_ITEM_STATUS[status] ? status : ROADMAP_ITEM_STATUS.not_started;
  return {
    ...savedProgress,
    [pathId]: {
      ...(savedProgress?.[pathId] || {}),
      [itemFullId]: nextStatus,
    },
  };
}
