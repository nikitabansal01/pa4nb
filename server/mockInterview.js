import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import {
  assessCandidateDoubt,
  formatResearchForPrompt,
  researchCompanySupport,
} from './companyResearch.js';

const INTERVIEW_TYPES = new Set([
  'behavioral',
  'recruiter',
  'mixed',
  'live_coding',
  'live_prototype',
]);
const TYPE_LABELS = {
  behavioral: 'behavioral / past stories',
  recruiter: 'recruiter screen',
  mixed: 'mixed',
  live_coding: 'live coding / whiteboard',
  live_prototype: 'live prototyping / product',
};
const FORWARD_TYPES = new Set(['live_coding', 'live_prototype']);
const PAST_TYPES = new Set(['behavioral', 'recruiter']);
const PAST_TOPICS = new Set(['behavioral', 'past_projects', 'leadership']);
const FORWARD_TOPICS = new Set(['technical', 'product_sense', 'system_design']);
const TOPICS = new Set([
  'behavioral',
  'technical',
  'past_projects',
  'product_sense',
  'system_design',
  'leadership',
  'mixed',
]);
const TOPIC_BY_TRACK = {
  pm: new Set(['behavioral', 'technical', 'past_projects', 'product_sense', 'leadership', 'mixed']),
  eng: new Set(['behavioral', 'technical', 'past_projects', 'system_design', 'leadership', 'mixed']),
  ds: new Set(['behavioral', 'technical', 'past_projects', 'product_sense', 'leadership', 'mixed']),
};
const PERSONAS = new Set(['friendly', 'tough', 'bar-raiser']);
const TOPIC_LABELS = {
  behavioral: 'behavioral',
  technical: 'technical',
  past_projects: 'past projects',
  product_sense: 'product sense',
  system_design: 'system design',
  leadership: 'leadership',
  mixed: 'mixed-topic',
};

const FOLLOW_UPS = [
  'Can you be more specific about the metrics or outcome?',
  'What would you do differently if you ran that again?',
  'Who disagreed with you, and how did you handle it?',
  'Walk me through the trade-offs you considered.',
];

const FORWARD_FOLLOW_UPS = {
  live_prototype: [
    'Go deeper on who you are building for — buyer vs user — and what job they hire this for.',
    'Name the main tradeoff (user value vs technical cost) and which side you pick for MVP.',
    'Define the MVP cut line: what ships now vs later, and one success metric.',
    'Translate that into a prototype: screens, primary flow, and empty/error states.',
  ],
  live_coding: [
    'Keep going on the whiteboard — write the next step as pseudo-code or a clearer interface.',
    'Call out edge cases and failure modes before optimizing.',
    'What would you test first, and what breaks at 10x load?',
  ],
};

function truncate(text, max = 600) {
  const s = String(text || '').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function asList(value, limit = 4) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, limit);
}

function defaultTypeForStatus(status) {
  if (status === 'recruiter_screen') return 'recruiter';
  if (status === 'phone_screen' || status === 'interview_scheduled') return 'live_prototype';
  if (status === 'onsite' || status === 'interview_completed') return 'live_prototype';
  return 'behavioral';
}

function defaultTopicForStatus(status) {
  if (status === 'recruiter_screen') return 'behavioral';
  if (status === 'onsite') return 'product_sense';
  if (status === 'phone_screen' || status === 'interview_scheduled') return 'product_sense';
  return 'behavioral';
}

function defaultTopicForTrack(track) {
  if (track === 'eng') return 'technical';
  if (track === 'ds') return 'technical';
  return 'product_sense';
}

function normalizeTrack(track) {
  if (track === 'eng' || track === 'ds' || track === 'pm') return track;
  return 'pm';
}

function normalizeInterviewType(type) {
  // Product rounds are live prototyping (net-new), not a separate vague product chat.
  if (type === 'product') return 'live_prototype';
  if (INTERVIEW_TYPES.has(type)) return type;
  return null;
}

function getRoundMode(type) {
  if (FORWARD_TYPES.has(type)) return 'forward';
  if (PAST_TYPES.has(type)) return 'past';
  return 'mixed';
}

function normalizeBusinessModel(value = '') {
  const v = String(value || '').toLowerCase().trim();
  if (!v) return '';
  if (v === 'both' || v.includes('b2b2c')) return 'B2B2C';
  if (v.includes('marketplace')) return 'marketplace';
  if (v === 'b2b' || v.includes('b2b')) return 'B2B';
  if (v === 'b2c' || v.includes('b2c')) return 'B2C';
  return value;
}

export function normalizeConfig(config = {}, applicationContext = {}) {
  const track = normalizeTrack(config.track || applicationContext.track);
  const allowedTopics = TOPIC_BY_TRACK[track] || TOPIC_BY_TRACK.pm;
  let type = normalizeInterviewType(config.type)
    || defaultTypeForStatus(applicationContext.status);
  const roundMode = getRoundMode(type);

  let topic = TOPICS.has(config.topic) ? config.topic : defaultTopicForStatus(applicationContext.status);
  if (!allowedTopics.has(topic)) {
    topic = defaultTopicForTrack(track);
  }
  // Style owns the round — never let a past topic steer a forward session (or vice versa).
  if (roundMode === 'forward' && PAST_TOPICS.has(topic)) {
    topic = type === 'live_coding'
      ? 'technical'
      : (track === 'eng' ? 'system_design' : 'product_sense');
  }
  if (roundMode === 'past' && FORWARD_TOPICS.has(topic) && topic !== 'technical') {
    topic = 'behavioral';
  }

  const maxTurns = [5, 6, 8, 10, 15].includes(Number(config.maxTurns))
    ? Number(config.maxTurns)
    : (roundMode === 'forward' ? 6 : 5);
  const persona = PERSONAS.has(config.persona) ? config.persona : 'friendly';
  return { type, topic, maxTurns, persona, track, roundMode };
}

export function buildContextPack(applicationContext = {}, profileSnapshot = {}) {
  const company = applicationContext.company || 'the company';
  const role = applicationContext.role || applicationContext.positionTitle || 'the role';
  const researchBits = [
    applicationContext.researchSummary,
    applicationContext.researchProduct,
    applicationContext.researchMarket,
    applicationContext.researchCulture,
  ].filter(Boolean);

  return {
    company,
    role,
    positionTitle: applicationContext.positionTitle || role,
    track: normalizeTrack(applicationContext.track),
    industry: applicationContext.industry || '',
    businessModel: normalizeBusinessModel(applicationContext.businessModel),
    fundingStage: applicationContext.fundingStage || '',
    status: applicationContext.status || '',
    stageLabel: applicationContext.stageLabel || '',
    recruiter: applicationContext.recruiter || '',
    hiringManager: applicationContext.hiringManager || '',
    jobDescription: truncate(applicationContext.jobDescription || '', 1200),
    researchSummary: truncate(applicationContext.researchSummary || '', 500),
    researchProduct: truncate(applicationContext.researchProduct || '', 400),
    researchMarket: truncate(applicationContext.researchMarket || '', 400),
    researchCulture: truncate(applicationContext.researchCulture || '', 300),
    researchOpenQuestions: truncate(applicationContext.researchOpenQuestions || '', 300),
    researchCombined: truncate(researchBits.join('\n'), 800),
    gaps: asList(applicationContext.gaps, 4),
    matches: asList(applicationContext.matches, 4),
    starStories: asList(applicationContext.starStories, 4),
    likelyQuestions: asList(applicationContext.likelyQuestions, 8),
    studyTopics: asList(applicationContext.studyTopics, 4),
    pathTitle: applicationContext.pathTitle || profileSnapshot.pathTitle || 'target path',
    resumeEvidence: asList(applicationContext.resumeEvidence || profileSnapshot.resumeEvidence, 4),
    checklistGaps: asList(applicationContext.checklistGaps, 6),
    interviewAt: applicationContext.interviewAt || null,
  };
}

function inferRoleSubtype(title = '', track = 'pm') {
  const t = String(title || '').toLowerCase();
  if (track === 'ds') {
    if (/machine learning|\bml\b|research scientist/.test(t)) return { id: 'ml_scientist', label: 'ML / Research Scientist' };
    if (/data engineer|analytics engineer/.test(t)) return { id: 'data_engineer', label: 'Data Engineer' };
    if (/analytics|bi\b|business intelligence/.test(t)) return { id: 'analytics', label: 'Analytics / BI' };
    return { id: 'data_scientist', label: 'Data Scientist' };
  }
  if (track === 'eng') {
    if (/frontend|front-end|ui eng/.test(t)) return { id: 'frontend', label: 'Frontend Engineer' };
    if (/backend|back-end|api/.test(t)) return { id: 'backend', label: 'Backend Engineer' };
    if (/platform eng|infrastructure|sre|devops/.test(t)) return { id: 'platform_eng', label: 'Platform / Infra Engineer' };
    if (/full.?stack/.test(t)) return { id: 'fullstack', label: 'Full-stack Engineer' };
    if (/mobile|ios|android/.test(t)) return { id: 'mobile', label: 'Mobile Engineer' };
    return { id: 'software_eng', label: 'Software Engineer' };
  }
  // PM track
  if (/product lead|group product|director of product|head of product/.test(t)) {
    return { id: 'product_lead', label: 'Product Lead / Group PM' };
  }
  if (/platform pm|platform product|internal tools|developer experience|dx pm/.test(t)) {
    return { id: 'platform_pm', label: 'Platform PM' };
  }
  if (/growth|activation|retention|funnel/.test(t)) {
    return { id: 'growth_pm', label: 'Growth PM' };
  }
  if (/technical product|tpm\b/.test(t)) {
    return { id: 'technical_pm', label: 'Technical PM' };
  }
  if (/consumer|b2c/.test(t)) {
    return { id: 'consumer_pm', label: 'Consumer / Feature PM' };
  }
  if (/senior product|staff product|principal product/.test(t)) {
    return { id: 'senior_pm', label: 'Senior / Staff PM' };
  }
  return { id: 'feature_pm', label: 'Feature / Product Manager' };
}

function heuristicBriefing(ctx) {
  const subtype = inferRoleSubtype(ctx.role || ctx.positionTitle, ctx.track);
  const businessModel = ctx.businessModel
    || (ctx.track === 'pm' ? 'B2B' : '');
  const industry = ctx.industry || 'technology';
  const products = [];
  if (ctx.researchProduct) products.push(truncate(ctx.researchProduct, 120));
  else if (ctx.company) {
    products.push(
      ctx.researchSummary
        ? truncate(ctx.researchSummary, 120)
        : `${ctx.company} core product in ${industry}`
    );
  }

  const whatTheyDo = truncate(
    ctx.researchSummary
      || ctx.researchMarket
      || `${ctx.company} operates in ${industry}${businessModel ? ` (${businessModel})` : ''}.`,
    220
  );

  const interviewAngles = [];
  if (subtype.id === 'product_lead') {
    interviewAngles.push(
      `How you set roadmap and raise the bar across squads for a ${businessModel || 'company'} ${industry} product`,
      `Stakeholder management with eng/clinical/sales partners typical of ${ctx.company}`,
      `Prioritization under ambiguity when multiple product lines compete for capacity`
    );
  } else if (subtype.id === 'platform_pm') {
    interviewAngles.push(
      `Platform vs feature trade-offs and internal customer discovery`,
      `Measuring platform adoption and reducing duplicate work across teams`,
      `API / shared capability prioritization for ${ctx.company}`
    );
  } else if (subtype.id === 'growth_pm') {
    interviewAngles.push(
      `Activation/retention experiments for ${ctx.company}'s funnel`,
      `Metric trees and north-star trade-offs`,
      `Working with data/eng on experiment design`
    );
  } else if (ctx.track === 'ds') {
    interviewAngles.push(
      `Problem framing and metric definition for ${ctx.company}'s product decisions`,
      `Ambiguous data, bias, and communicating uncertainty to PMs/eng`,
      `Past modeling or analysis work that changed a roadmap or ops outcome`
    );
  } else if (ctx.track === 'eng') {
    interviewAngles.push(
      `System design grounded in ${ctx.company}-like constraints`,
      `Trade-offs in reliability, latency, and cost`,
      `Collaboration with product on scoping and technical debt`
    );
  } else {
    interviewAngles.push(
      `End-to-end ownership of a feature relevant to ${ctx.company}'s ${industry} product`,
      `Discovery with the real customer type for a ${businessModel || 'tech'} business`,
      `Metrics and trade-offs for shipping under uncertainty`
    );
  }

  return {
    company: {
      name: ctx.company,
      businessModel: businessModel || 'unknown',
      industry,
      products: products.slice(0, 4),
      customers: truncate(ctx.researchMarket || `${businessModel || 'their'} customers in ${industry}`, 160),
      whatTheyDo,
      fundingStage: ctx.fundingStage || '',
    },
    role: {
      title: ctx.role,
      track: ctx.track,
      subtype: subtype.id,
      subtypeLabel: subtype.label,
      focusAreas: interviewAngles.slice(0, 3),
      seniority: /lead|director|head|staff|principal|senior/.test(String(ctx.role).toLowerCase())
        ? 'senior_plus'
        : 'ic',
    },
    interviewAngles,
    avoid: [
      'Generic "tell me about yourself" with no company link',
      'Vague product sense with a made-up consumer app unrelated to this company',
      'Questions that ignore business model, industry, and role subtype',
    ],
    oneLiner: `${ctx.company}: ${businessModel || industry} · ${subtype.label} (${ctx.role})`,
  };
}

async function llmBriefing(ctx) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: 'gpt-5.4-mini',
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You brief a mock interviewer so questions are specific to THIS company and THIS role — never generic.

Return ONLY JSON:
{
  "company": {
    "name": "string",
    "businessModel": "B2B|B2C|B2B2C|marketplace|other",
    "industry": "string",
    "products": ["concrete products or product lines"],
    "customers": "who buys / uses (buyer vs user if different)",
    "whatTheyDo": "1-2 sentences on how the business works",
    "fundingStage": "string or empty"
  },
  "role": {
    "title": "string",
    "track": "pm|eng|ds|other",
    "subtype": "snake_case e.g. platform_pm, feature_pm, product_lead, growth_pm, technical_pm, data_scientist, ml_scientist, backend, platform_eng",
    "subtypeLabel": "human label e.g. Platform PM",
    "focusAreas": ["3 concrete evaluation themes for THIS role at THIS company"],
    "seniority": "ic|senior_plus|manager"
  },
  "interviewAngles": ["4-6 specific themes/questions directions grounded in company+role"],
  "avoid": ["generic patterns to avoid"],
  "oneLiner": "short label: Company · model · role subtype"
}

Rules:
- Infer business model from known company facts + provided fields (b2b/b2c/both → B2B/B2C/B2B2C).
- Infer role subtype from the title (Product Lead ≠ Feature PM ≠ Platform PM; Data Scientist ≠ ML Engineer).
- Use JD + research notes when present. If research is thin, use widely known public facts about the company; do not invent fake metrics or fake product names.
- Products and customers must be concrete (e.g. "AI medical scribe for clinicians" not "their product").`,
      },
      {
        role: 'user',
        content: JSON.stringify({
          company: ctx.company,
          roleTitle: ctx.role,
          trackHint: ctx.track,
          industry: ctx.industry,
          businessModel: ctx.businessModel,
          fundingStage: ctx.fundingStage,
          jobDescription: ctx.jobDescription,
          research: {
            summary: ctx.researchSummary,
            product: ctx.researchProduct,
            market: ctx.researchMarket,
            culture: ctx.researchCulture,
            openQuestions: ctx.researchOpenQuestions,
          },
          pathTitle: ctx.pathTitle,
          resumeEvidence: ctx.resumeEvidence,
          gaps: ctx.gaps,
          matches: ctx.matches,
        }),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(raw);
  const fallback = heuristicBriefing(ctx);
  return {
    company: {
      ...fallback.company,
      ...(parsed.company || {}),
      name: parsed.company?.name || fallback.company.name,
      products: asList(parsed.company?.products || fallback.company.products, 5),
    },
    role: {
      ...fallback.role,
      ...(parsed.role || {}),
      title: parsed.role?.title || fallback.role.title,
      track: normalizeTrack(parsed.role?.track || fallback.role.track),
      focusAreas: asList(parsed.role?.focusAreas || fallback.role.focusAreas, 4),
    },
    interviewAngles: asList(parsed.interviewAngles || fallback.interviewAngles, 8),
    avoid: asList(parsed.avoid || fallback.avoid, 6),
    oneLiner: String(parsed.oneLiner || fallback.oneLiner).trim(),
  };
}

async function ensureInterviewBriefing(ctx, session = {}) {
  if (session.briefing?.company?.name && session.briefing?.role?.subtypeLabel) {
    return session.briefing;
  }
  if (process.env.OPENAI_API_KEY) {
    try {
      return await llmBriefing(ctx);
    } catch (error) {
      console.error('Interview briefing LLM failed, using heuristic:', error.message);
    }
  }
  return heuristicBriefing(ctx);
}

function personaLine(persona) {
  if (persona === 'tough') return 'Be direct and skeptical; push for evidence.';
  if (persona === 'bar-raiser') return 'Probe for depth, clarity, and high bar judgment.';
  return 'Be warm but professional; keep the candidate at ease while still evaluating.';
}

function topicLine(topic) {
  if (topic === 'behavioral') return 'Focus questions on behavioral / STARR stories and soft skills — still anchored to this company and role.';
  if (topic === 'technical') return 'Focus on technical judgment relevant to this company\'s product and stack constraints.';
  if (topic === 'past_projects') return 'Focus on past projects: ownership, decisions, impact, and trade-offs transferable to this role.';
  if (topic === 'product_sense') return 'Focus on product sense for THIS company\'s customers, business model, and product — not a random consumer app.';
  if (topic === 'system_design') return 'Focus on system design for systems like this company\'s (requirements, APIs, data, scale, trade-offs).';
  if (topic === 'leadership') return 'Focus on leadership, influence, conflict, and raising the bar at the seniority of this role.';
  return 'Mix behavioral, project, and role-appropriate questions — all grounded in company + role subtype.';
}

function typeLine(type) {
  if (type === 'behavioral') {
    return 'Frame this as a PAST-FACING behavioral round (STARR / prior achievements). Do not invent a net-new product exercise.';
  }
  if (type === 'recruiter') return 'Frame this as a recruiter / phone screen (fit + motivation).';
  if (type === 'live_coding') {
    return `Frame this as a FORWARD-FACING live coding / whiteboard exercise.
Net-new problem only. Do NOT ask about past projects, prior jobs, or "tell me about a time".`;
  }
  if (type === 'live_prototype') {
    return `Frame this as a FORWARD-FACING live prototyping / product round (product sense is folded in here).
Net-new problem only. Do NOT ask about past projects or prior achievements.
Guide: analyze → who/what to build for → prioritize → technical + user-need tradeoffs → MVP, goals, success metrics → then prototype (Figma / Figma Make / Claude Design or describe in chat).`;
  }
  return 'Frame this as a mixed round — still respect whether each prompt is past-facing or forward-facing; do not dump random past-project questions into a design exercise.';
}

function exerciseProtocol(type, briefing, ctx) {
  const subtype = briefing?.role?.subtypeLabel || ctx.role;
  const company = ctx.company;
  const product = briefing?.company?.products?.[0] || ctx.researchProduct || `${company}'s product`;
  const model = briefing?.company?.businessModel || ctx.businessModel || '';
  const track = briefing?.role?.track || ctx.track;

  if (type === 'live_prototype') {
    return `
LIVE PROTOTYPE / PRODUCT PROTOCOL for ${subtype} at ${company} (product: ${product}, model: ${model || 'n/a'}):
Phases (one prompt at a time; do not skip to past stories):
1) Analyze the problem space for THIS company/product (users, jobs, constraints).
2) Decide who/what to build for; prioritize coherently.
3) Tradeoffs: technical feasibility vs user needs.
4) Lock MVP scope, goal, and success metrics.
5) Prototype: screens/flows/states in Figma / Figma Make / Claude Design (or describe here).
FORBIDDEN: "walk me through a past project", "tell me about a time", resume archaeology.`;
  }

  if (type === 'live_coding') {
    const trackHint = track === 'eng'
      ? 'coding + whiteboard for APIs, data, or domain logic'
      : track === 'ds'
        ? 'SQL / metrics / analysis whiteboard'
        : 'light technical whiteboard (contracts, prioritization logic, or scoped eng partnership)';
    return `
LIVE CODING / WHITEBOARD PROTOCOL for ${subtype} at ${company}:
- Net-new problem (${trackHint}) grounded in ${product}.
- Approach → edge cases → pseudo-code → trade-offs.
FORBIDDEN: past-project storytelling.`;
  }

  return '';
}

function styleModeLine(config) {
  if (config.roundMode === 'forward') {
    return `ROUND MODE = FORWARD (net-new). Interview style "${config.type}" must NOT ask about past projects, previous employers, or behavioral STARR stories.`;
  }
  if (config.roundMode === 'past') {
    return `ROUND MODE = PAST-FACING. Focus on stories and prior work relevant to ${config.type}. Do not pivot into a greenfield build exercise unless the candidate asks.`;
  }
  return 'ROUND MODE = MIXED. Be explicit when a prompt is past vs forward; do not accidentally open with past projects if the candidate confirmed a design/coding practice.';
}

function buildCalibrationMessage(ctx, briefing, config) {
  const products = asList(briefing?.company?.products, 4);
  const subtype = briefing?.role?.subtypeLabel || ctx.role;
  const styleLabel = TYPE_LABELS[config.type] || config.type;
  const modeHint = config.roundMode === 'forward'
    ? 'net-new problem (not past projects)'
    : config.roundMode === 'past'
      ? 'past stories / fit'
      : 'mixed';

  const lines = [
    'Confirming before we start:',
    '',
    `• Company: ${briefing?.company?.name || ctx.company}`,
    `• Business model: ${briefing?.company?.businessModel || ctx.businessModel || 'unspecified'}`,
    `• Industry: ${briefing?.company?.industry || ctx.industry || 'unspecified'}`,
    `• Role: ${subtype}${briefing?.role?.title && briefing.role.title !== subtype ? ` (${briefing.role.title})` : ''}`,
    `• Interview style: ${styleLabel} — ${modeHint}`,
  ];

  if (products.length > 1) {
    lines.push(`• Product focus (pick one if wrong): ${products.join(' | ')}`);
  } else if (products.length === 1) {
    lines.push(`• Product focus: ${products[0]}`);
  } else if (ctx.researchProduct) {
    lines.push(`• Product focus: ${truncate(ctx.researchProduct, 120)}`);
  } else {
    lines.push('• Product focus: not specified — reply with the product/line you want if the company has several');
  }

  lines.push('');
  lines.push('Reply "yes" to proceed, or correct any bullet.');
  return lines.join('\n');
}

function isCalibrationConfirm(text = '') {
  const t = String(text || '').trim().toLowerCase();
  if (!t) return false;
  if (/^(yes|y|yeah|yep|correct|confirmed|confirm|looks good|sounds good|ok|okay|proceed|go ahead|let'?s go|start)(\b|!|\.)/.test(t)) {
    return true;
  }
  if (t.length < 80 && /\b(yes|correct|confirmed|looks good|go ahead|proceed)\b/.test(t) && !/\b(no|wrong|actually|instead)\b/.test(t)) {
    return true;
  }
  return false;
}

function applyCalibrationCorrections(briefing, text = '') {
  const next = {
    ...briefing,
    company: { ...(briefing.company || {}) },
    role: { ...(briefing.role || {}) },
  };
  const raw = String(text || '');
  const productMatch = raw.match(/product(?:\s+focus)?\s*[:=-]?\s*(.+)$/im);
  if (productMatch?.[1]) {
    const product = productMatch[1].trim().replace(/[.”"]$/g, '');
    if (product) next.company.products = [product, ...(next.company.products || [])].slice(0, 4);
  }
  const roleMatch = raw.match(/role\s*[:=-]?\s*(.+)$/im);
  if (roleMatch?.[1]) {
    const role = roleMatch[1].trim();
    if (role) {
      next.role.title = role;
      next.role.subtypeLabel = role;
    }
  }
  next.oneLiner = [
    next.company.name,
    next.company.businessModel,
    next.role.subtypeLabel || next.role.title,
  ].filter(Boolean).join(' · ');
  return next;
}

function countCandidateAnswers(messages = []) {
  return messages.filter((m) => m.role === 'candidate').length;
}

function lastInterviewerQuestion(messages = []) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'interviewer') return messages[i].content;
  }
  return '';
}

function briefingLines(briefing) {
  if (!briefing) return '';
  const c = briefing.company || {};
  const r = briefing.role || {};
  return [
    `Company briefing: ${c.name} · ${c.businessModel || 'unknown model'} · industry: ${c.industry || 'n/a'}`,
    `What they do: ${c.whatTheyDo || ''}`,
    `Products: ${(c.products || []).join('; ') || 'n/a'}`,
    `Customers: ${c.customers || 'n/a'}`,
    `Role: ${r.title} · track=${r.track} · subtype=${r.subtypeLabel || r.subtype} · seniority=${r.seniority || 'ic'}`,
    `Evaluate for: ${(r.focusAreas || []).join('; ')}`,
    `Preferred angles: ${(briefing.interviewAngles || []).join(' | ')}`,
    `Avoid: ${(briefing.avoid || []).join(' | ')}`,
  ].join('\n');
}

function heuristicQuestionBank(ctx, topic, briefing, interviewType = 'mixed') {
  // Forward rounds must NOT seed from prep "likelyQuestions" — those are often past-project drills.
  const bank = FORWARD_TYPES.has(interviewType) ? [] : [...(ctx.likelyQuestions || [])];
  const company = ctx.company;
  const role = ctx.role;
  const path = ctx.pathTitle;
  const evidence = ctx.resumeEvidence?.[0];
  const model = briefing?.company?.businessModel || ctx.businessModel || '';
  const industry = briefing?.company?.industry || ctx.industry || '';
  const subtype = briefing?.role?.subtypeLabel || 'this role';
  const subtypeId = briefing?.role?.subtype || '';
  const product = briefing?.company?.products?.[0] || ctx.researchProduct || `${company}'s product`;
  const customers = briefing?.company?.customers || 'their customers';
  const angles = briefing?.interviewAngles || [];
  const track = briefing?.role?.track || ctx.track;

  if (interviewType === 'live_prototype') {
    const isPlatform = /platform/i.test(subtypeId) || /platform/i.test(subtype);
    return [
      `Net-new problem for ${company} (${product}). Analyze the problem space: who hurts today, what job are they trying to do, and what constraints does a ${model || industry || 'this'} business add?`,
      isPlatform
        ? `Prioritize: for a platform at ${company}, who do you build for first (internal teams vs end users), and what stays shared platform vs feature-owned? Rank the top 2 bets.`
        : `Prioritize: who exactly are you building for (buyer vs user), what outcome matters most, and which problem do you cut first vs defer?`,
      `Tradeoffs: pick the sharpest tension between user need and technical cost/risk for ${product}. What do you choose for an MVP and why?`,
      `Lock it: state the MVP scope, the goal, and 1–2 success metrics you would hold the team to for ${company}.`,
      `Prototype next: list screens + primary flow + empty/error states you would open in Figma / Figma Make / Claude Design (or describe them here).`,
      `Critique your prototype: what is the riskiest assumption, and what would you validate before eng builds?`,
    ];
  }

  if (interviewType === 'live_coding') {
    if (track === 'ds') {
      return [
        `Whiteboard: ${company} wants a metric for ${product} engagement among ${customers}. Define the grain, numerator/denominator, and a SQL-shaped sketch (tables you assume are fine to invent lightly).`,
        "Walk me through edge cases: nulls, duplicates, late-arriving events, and how you'd validate the metric before a PM trusts it.",
        `Given a dip in that metric week-over-week, how would you structure the analysis — still in whiteboard form — for ${company}?`,
        'Optimize or simplify your approach: what would you cut under time pressure, and what must stay correct?',
      ];
    }
    if (track === 'pm') {
      return [
        `Whiteboard with a ${subtype} lens: ${company}'s ${product} needs an internal API / capability for ${customers}. Sketch inputs, outputs, auth, and failure modes you'd require from eng.`,
        'Prioritization logic: you have capacity for 2 of 5 platform asks this quarter. Write a simple scoring approach and apply it aloud to a realistic set for this company.',
        `Live problem: a partner team wants to fork the platform. How do you evaluate the request technically and organizationally — diagram the decision?`,
        'Convert your decision into a short eng-facing spec outline (acceptance criteria + non-goals).',
      ];
    }
    return [
      `Live coding for ${company}: implement (pseudo-code is fine) a function that supports a core ${product} workflow — state the I/O and constraints first.`,
      'Add edge cases and failure handling. What breaks at 10x traffic or partial outages?',
      'Refactor for clarity: APIs, data model, and what you would test first.',
      `How would this design change if ${customers} needed multi-tenant isolation or stricter compliance?`,
    ];
  }

  const extras = {
    behavioral: [
      `Tell me about a time you influenced without authority — make it relevant to a ${subtype} working with ${customers}.`,
      ctx.gaps[0]
        ? `Tell me about a time you closed a gap around: ${ctx.gaps[0]}.`
        : `Tell me about a failure shipping for a ${model || industry || 'complex'} product and what you changed.`,
      ctx.starStories[0]
        ? `Expand on this story for a ${company} interviewer: ${ctx.starStories[0]}`
        : `Share a STARR story that shows ownership at the level of a ${subtype}.`,
    ],
    technical: [
      `Walk me through a technical decision you made that would transfer to building ${product}.`,
      `How do you develop enough technical depth as a ${subtype} to challenge or support engineering on ${industry || 'this'} systems?`,
      evidence
        ? `Using this experience — ${evidence} — where did technical constraints shape the outcome?`
        : `Describe ramping on a technical domain quickly for ${company}-like work.`,
    ],
    past_projects: [
      evidence
        ? `Walk me through this project in depth, and map what transfers to ${role} at ${company}: ${evidence}`
        : `Walk me through a project you owned end to end that is relevant to a ${subtype} at a ${model || 'tech'} ${industry} company.`,
      angles[0]
        ? `Focusing on: ${angles[0]} — what have you done that proves you can do that here?`
        : 'What were the hardest trade-offs, and who owned the final call?',
      `What impact did you personally drive, and how would you prove it to ${company}?`,
    ],
    product_sense: [
      `You're a ${subtype} on ${product}. How would you measure success in the first 90 days?`,
      `Who is the buyer vs the user for ${company}, and how does that change discovery and prioritization?`,
      model === 'B2B' || model === 'B2B2C'
        ? `Walk me through improving activation or retention for a ${model} workflow used by ${customers}.`
        : `Pick a concrete problem for ${customers} of ${product} and walk me through how you'd improve it.`,
      'Walk me through a product decision where the data was incomplete — what did you do?',
    ],
    system_design: [
      `Design a system that would support a core workflow at ${company} (${product}). Where do you start?`,
      'How would you handle scale, failure modes, and data consistency in that design?',
      `Walk through API and storage choices for a feature a ${subtype} would ship with eng.`,
    ],
    leadership: [
      `As a ${subtype}, tell me about a time you raised the bar on a team while working toward ${path}.`,
      `Describe a conflict with a peer or stakeholder in a ${model || industry || 'cross-functional'} setting and how you resolved it.`,
      angles[1]
        ? `How have you led through: ${angles[1]}?`
        : 'How do you coach others when delivery is slipping?',
    ],
    mixed: [
      `Why ${company}, and why this ${subtype} seat specifically?`,
      `Walk me through a product or project you owned end to end that maps to ${product}.`,
      `How would you approach the first 90 days as ${role} given ${company}'s ${model || industry} business?`,
      ...(angles.slice(0, 2).map((a) => `Let's dig into this: ${a}`)),
    ],
  };

  for (const q of extras[topic] || extras.mixed) {
    if (!bank.includes(q)) bank.push(q);
  }
  return bank.length ? bank : extras.mixed;
}

function heuristicFeedback(answer, question, ctx, briefing, config = {}) {
  const length = String(answer || '').trim().length;
  const hasNumber = /\d/.test(answer || '');
  const companyRe = new RegExp(ctx.company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const mentionsCompany = companyRe.test(answer || '');
  const subtype = briefing?.role?.subtypeLabel || '';
  const notes = [];
  if (config.roundMode === 'forward') {
    if (length < 80) notes.push('Too thin — add decision criteria, tradeoff, and a concrete next step.');
    else notes.push('Solid depth; keep decisions explicit (who, what, why now).');
    if (!hasNumber) notes.push('Add a metric, constraint, or scoped MVP cut if you have one.');
    if (!mentionsCompany) notes.push(`Anchor the answer to ${ctx.company}${subtype ? ` / ${subtype}` : ''}.`);
    else notes.push(`Good ${ctx.company} grounding.`);
  } else {
    if (length < 80) notes.push('Answer was short — add situation, action, and a concrete result.');
    else notes.push('Good length; keep a clear Situation → Action → Result arc.');
    if (!hasNumber) notes.push('Add a metric or measurable outcome if you have one.');
    if (!mentionsCompany) notes.push(`Tie the ending back to ${ctx.company}${subtype ? ` / ${subtype}` : ''} explicitly.`);
    else notes.push(`Nice company/role connection to ${ctx.company}.`);
    if (ctx.gaps[0]) notes.push(`Optional drill: prepare a sharper example for “${ctx.gaps[0]}”.`);
  }
  return {
    questionId: uuidv4(),
    question: question || '',
    notes: notes.slice(0, 4).join(' '),
    scoreHints: {
      structure: length >= 120 ? 'solid' : 'needs_work',
      specificity: hasNumber ? 'solid' : 'needs_work',
      companyFit: mentionsCompany ? 'solid' : 'needs_work',
    },
  };
}

function makeMessage(role, content) {
  return {
    id: uuidv4(),
    role,
    content: String(content || '').trim(),
    at: new Date().toISOString(),
  };
}

export function heuristicTurn({ applicationContext, profileSnapshot, session, userMessage, briefing: briefingIn, liveResearch = null }) {
  const ctx = buildContextPack(applicationContext, profileSnapshot);
  const config = normalizeConfig(session?.config, applicationContext);
  let briefing = briefingIn || session?.briefing || heuristicBriefing(ctx);
  const messages = Array.isArray(session?.messages) ? [...session.messages] : [];
  const feedback = Array.isArray(session?.feedback) ? [...session.feedback] : [];
  const bank = heuristicQuestionBank(ctx, config.topic, briefing, config.type);
  const answersSoFar = countCandidateAnswers(messages);
  const followUpsUsed = Number(session?.followUpsUsed || 0);
  const questionIndex = Number(session?.questionIndex || 0);
  const phase = session?.phase || (messages.length ? 'active' : 'calibrating');
  const subtype = briefing.role?.subtypeLabel || ctx.role;

  // Start: calibration only — confirm understanding before any exercise question.
  if (!userMessage?.trim() && answersSoFar === 0 && messages.length === 0) {
    const calibration = makeMessage('interviewer', buildCalibrationMessage(ctx, briefing, config));
    return {
      assistantMessages: [calibration],
      sessionPatch: {
        status: 'active',
        phase: 'calibrating',
        config,
        briefing,
        messages: [calibration],
        feedback: [],
        questionIndex: 0,
        followUpsUsed: 0,
        summary: null,
      },
      feedback: null,
      done: false,
      mode: 'heuristic',
      briefing,
    };
  }

  const answer = String(userMessage || '').trim();
  const candidateMsg = makeMessage('candidate', answer);
  messages.push(candidateMsg);

  // Calibration reply → start the real exercise (never past-projects for forward styles).
  if (phase === 'calibrating') {
    briefing = applyCalibrationCorrections(briefing, answer);
    const firstQ = makeMessage(
      'interviewer',
      bank[0] || (
        config.roundMode === 'forward'
          ? `Let's start the net-new exercise for ${ctx.company}.`
          : `Let's begin. Tell me about a relevant story for ${subtype} at ${ctx.company}.`
      )
    );
    const ack = isCalibrationConfirm(answer)
      ? makeMessage('interviewer', 'Locked in. Starting the exercise.')
      : makeMessage('interviewer', 'Thanks — I updated my understanding. Starting the exercise.');
    messages.push(ack, firstQ);
    return {
      assistantMessages: [ack, firstQ],
      sessionPatch: {
        status: 'active',
        phase: 'active',
        config,
        briefing,
        messages,
        feedback,
        questionIndex: 0,
        followUpsUsed: 0,
        summary: null,
      },
      feedback: null,
      done: false,
      mode: 'heuristic',
      briefing,
    };
  }

  // Candidate unsure about company facts → coach with research, then retry same step.
  if (liveResearch?.summary) {
    const bullets = (liveResearch.bullets || []).slice(0, 4);
    const coachLines = [
      `No problem — let's ground on ${ctx.company} with fresh context, then continue:`,
      ...bullets.map((b) => `• ${b}`),
      !bullets.length ? liveResearch.summary.split('\n').slice(0, 4).map((l) => `• ${l}`).join('\n') : null,
      '',
      `With that in mind: ${bank[questionIndex % bank.length] || `Who is the primary user of ${ctx.company}'s product, and what job are they hiring it for?`}`,
    ].filter(Boolean);
    const coach = makeMessage('interviewer', coachLines.join('\n'));
    messages.push(coach);
    return {
      assistantMessages: [coach],
      sessionPatch: {
        status: 'active',
        phase: 'active',
        config,
        briefing,
        messages,
        feedback,
        questionIndex,
        followUpsUsed,
        summary: null,
        lastResearchAssist: {
          at: new Date().toISOString(),
          query: liveResearch.query,
          topics: liveResearch.topics,
          mode: liveResearch.mode,
          bullets: liveResearch.bullets || [],
        },
      },
      feedback: null,
      done: false,
      mode: 'heuristic',
      briefing,
      researchAssist: {
        query: liveResearch.query,
        topics: liveResearch.topics,
        bullets: liveResearch.bullets || [],
        mode: liveResearch.mode,
      },
    };
  }

  const lastQ = lastInterviewerQuestion(messages);
  const nextFeedback = heuristicFeedback(answer, lastQ, ctx, briefing, config);
  feedback.push(nextFeedback);

  const shouldFollowUp = followUpsUsed < 1 && answer.length < 180;
  if (shouldFollowUp) {
    const forwardPool = FORWARD_FOLLOW_UPS[config.type];
    const followText = forwardPool
      ? forwardPool[questionIndex % forwardPool.length]
      : FOLLOW_UPS[answersSoFar % FOLLOW_UPS.length];
    const follow = makeMessage('interviewer', followText);
    messages.push(follow);
    return {
      assistantMessages: [follow],
      sessionPatch: {
        status: 'active',
        phase: 'active',
        config,
        briefing,
        messages,
        feedback,
        questionIndex,
        followUpsUsed: followUpsUsed + 1,
        summary: null,
      },
      feedback: nextFeedback,
      done: false,
      mode: 'heuristic',
      briefing,
    };
  }

  const nextIndex = questionIndex + 1;
  const reachedMax = nextIndex >= config.maxTurns;

  if (reachedMax) {
    const drill = feedback
      .filter((f) => f.scoreHints?.specificity === 'needs_work' || f.scoreHints?.structure === 'needs_work')
      .map((f) => f.question)
      .filter(Boolean)
      .slice(0, 3);
    const summary = [
      `Completed ${config.maxTurns} practice turns for ${ctx.company} (${subtype}) — ${TYPE_LABELS[config.type] || config.type}.`,
      drill.length
        ? `Drill again: ${drill.join(' · ')}`
        : 'Strong pass — rehearse once more before the real round.',
    ].join(' ');
    const closer = makeMessage('interviewer', summary);
    messages.push(closer);
    return {
      assistantMessages: [closer],
      sessionPatch: {
        status: 'completed',
        phase: 'completed',
        config,
        briefing,
        messages,
        feedback,
        questionIndex: nextIndex,
        followUpsUsed: 0,
        summary,
      },
      feedback: nextFeedback,
      done: true,
      mode: 'heuristic',
      drillQuestions: drill,
      briefing,
    };
  }

  const nextQ = makeMessage('interviewer', bank[nextIndex % bank.length]);
  const bridge = makeMessage(
    'interviewer',
    `Thanks — noted. ${nextFeedback.notes.split('.')[0]}. Next:`
  );
  messages.push(bridge, nextQ);
  return {
    assistantMessages: [bridge, nextQ],
    sessionPatch: {
      status: 'active',
      phase: 'active',
      config,
      briefing,
      messages,
      feedback,
      questionIndex: nextIndex,
      followUpsUsed: 0,
      summary: null,
    },
    feedback: nextFeedback,
    done: false,
    mode: 'heuristic',
    briefing,
  };
}

async function llmTurn({ applicationContext, profileSnapshot, session, userMessage, briefing, liveResearch = null }) {
  const ctx = buildContextPack(applicationContext, profileSnapshot);
  const config = normalizeConfig(session?.config, applicationContext);
  const phase = session?.phase || ((session?.messages || []).length ? 'active' : 'calibrating');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  if (!userMessage?.trim() && !(session?.messages || []).length) {
    const calibration = makeMessage('interviewer', buildCalibrationMessage(ctx, briefing, config));
    return {
      assistantMessages: [calibration],
      sessionPatch: {
        status: 'active',
        phase: 'calibrating',
        config,
        briefing,
        messages: [calibration],
        feedback: [],
        questionIndex: 0,
        followUpsUsed: 0,
        summary: null,
      },
      feedback: null,
      done: false,
      mode: 'openai',
      briefing,
    };
  }

  const contextForModel = {
    company: ctx.company,
    role: ctx.role,
    track: ctx.track,
    industry: ctx.industry,
    businessModel: ctx.businessModel,
    fundingStage: ctx.fundingStage,
    jobDescription: ctx.jobDescription,
    researchProduct: ctx.researchProduct,
    researchMarket: ctx.researchMarket,
    researchSummary: ctx.researchSummary,
    gaps: ctx.gaps,
    matches: ctx.matches,
    ...(config.roundMode === 'forward'
      ? {}
      : {
          starStories: ctx.starStories,
          likelyQuestions: ctx.likelyQuestions,
          resumeEvidence: ctx.resumeEvidence,
        }),
  };

  const coachBlock = liveResearch
    ? `
=== CANDIDATE NEEDS SUPPORT (not a gotcha moment) ===
${formatResearchForPrompt(liveResearch)}

Coach protocol:
- This is practice. Do NOT punish them for not knowing public company facts.
- First: briefly ground them (product, who uses/buys, problem solved) using the research — succinct bullets.
- Then re-ask or continue the SAME exercise step with that shared grounding so they can practice judgment.
- Do NOT dump a brand-new unrelated question. Do NOT become a trivia quiz.
- Stay warm and specific to ${ctx.company}.`
    : `
If the candidate seems unsure about ${ctx.company}'s product/users and you lack research, ask one clarifying check — but prefer coaching over grilling.`;

  const system = `You are a skilled mock-interview partner for ${ctx.company}, hiring for ${briefing.role?.subtypeLabel || ctx.role}.
You are NOT a dumb question-and-answer machine. You adapt: when the candidate is stuck on company facts, you ground them, then continue the exercise.
Interview style: ${TYPE_LABELS[config.type] || config.type}.
${styleModeLine(config)}
${personaLine(config.persona)}
${typeLine(config.type)}
${config.roundMode === 'past' ? topicLine(config.topic) : 'Topic is secondary; STYLE + ROUND MODE own the session.'}
${exerciseProtocol(config.type, briefing, ctx)}
${coachBlock}

=== MANDATORY BRIEFING ===
${briefingLines(briefing)}

Session phase: ${phase}
${phase === 'calibrating' ? `The candidate is replying to your confirmation bullets. Acknowledge corrections if any, then ask the FIRST exercise prompt for style ${config.type}. Do not re-ask blank survey questions.` : ''}

Hard rules:
- STYLE is the source of truth. roundMode=${config.roundMode}.
- If roundMode is forward: FORBIDDEN to ask about past projects, "tell me about a time", prior employers, or resume walkthroughs.
- If style is live_prototype: follow analyze → who/what → prioritize → tradeoffs → MVP/goals/metrics → prototype. One phase per turn.
- If style is live_coding: one evolving net-new whiteboard/coding problem for ${ctx.company}.
- Do NOT invent unrelated consumer apps. Use ${ctx.company}'s domain/products.
- Ask ONE primary prompt at a time (after any brief coaching block).
- After an exercise answer (phase=active), include brief feedback notes (2-4 short bullets). Feedback may be null during calibration or pure coaching turns.
- When maxTurns primary exercise prompts are done, set done=true with summary + drillAgain.
- Return ONLY valid JSON:
{
  "assistantMessages": ["string", "..."],
  "feedback": { "notes": "string", "scoreHints": { "structure": "solid|needs_work", "specificity": "solid|needs_work", "companyFit": "solid|needs_work" } } | null,
  "done": boolean,
  "summary": "string or null",
  "drillAgain": ["questions"],
  "questionIndex": number,
  "followUpsUsed": number,
  "phase": "calibrating|active|completed",
  "briefingPatches": { "company": {"products": ["..."], "customers": "...", "whatTheyDo": "..."}, "role": {"title": "...", "subtypeLabel": "..."} } | null,
  "coachedWithResearch": boolean
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-5.4-mini',
    temperature: 0.5,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: JSON.stringify({
          briefing,
          context: contextForModel,
          config,
          liveResearch: liveResearch || null,
          sessionState: {
            phase,
            questionIndex: session?.questionIndex || 0,
            followUpsUsed: session?.followUpsUsed || 0,
            answersSoFar: countCandidateAnswers(session?.messages || []),
            status: session?.status || 'active',
            maxTurns: config.maxTurns,
          },
          transcript: (session?.messages || []).slice(-12).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          userMessage: userMessage || null,
        }),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return heuristicTurn({
      applicationContext, profileSnapshot, session, userMessage, briefing, liveResearch,
    });
  }

  const assistantTexts = Array.isArray(parsed.assistantMessages)
    ? parsed.assistantMessages.map((t) => String(t || '').trim()).filter(Boolean)
    : [];
  if (!assistantTexts.length) {
    return heuristicTurn({
      applicationContext, profileSnapshot, session, userMessage, briefing, liveResearch,
    });
  }

  if (config.roundMode === 'forward') {
    const joined = assistantTexts.join(' ').toLowerCase();
    if (
      /tell me about a time|walk me through (a |your )?past project|previous (role|job|company)|starr story|on your resume/.test(joined)
    ) {
      return heuristicTurn({
        applicationContext, profileSnapshot, session, userMessage, briefing, liveResearch,
      });
    }
  }

  let nextBriefing = briefing;
  if (parsed.briefingPatches && typeof parsed.briefingPatches === 'object') {
    nextBriefing = {
      ...briefing,
      company: { ...briefing.company, ...(parsed.briefingPatches.company || {}) },
      role: { ...briefing.role, ...(parsed.briefingPatches.role || {}) },
    };
    if (parsed.briefingPatches.company?.products) {
      nextBriefing.company.products = asList(parsed.briefingPatches.company.products, 4);
    }
  } else if (phase === 'calibrating' && userMessage) {
    nextBriefing = applyCalibrationCorrections(briefing, userMessage);
  }

  if (liveResearch?.bullets?.length) {
    nextBriefing = {
      ...nextBriefing,
      company: {
        ...nextBriefing.company,
        whatTheyDo: nextBriefing.company?.whatTheyDo || liveResearch.bullets[0],
        products: asList(
          [...(nextBriefing.company?.products || []), ...liveResearch.bullets.slice(0, 2)],
          5
        ),
      },
    };
  }

  const messages = Array.isArray(session?.messages) ? [...session.messages] : [];
  const feedback = Array.isArray(session?.feedback) ? [...session.feedback] : [];
  if (userMessage?.trim()) {
    messages.push(makeMessage('candidate', userMessage.trim()));
  }
  const assistantMessages = assistantTexts.map((content) => makeMessage('interviewer', content));
  messages.push(...assistantMessages);

  let nextFeedback = null;
  if (phase === 'active' && parsed.feedback?.notes) {
    nextFeedback = {
      questionId: uuidv4(),
      question: lastInterviewerQuestion(session?.messages || []),
      notes: String(parsed.feedback.notes),
      scoreHints: parsed.feedback.scoreHints || {},
    };
    feedback.push(nextFeedback);
  }

  const done = Boolean(parsed.done);
  const summary = parsed.summary ? String(parsed.summary) : null;
  const drillQuestions = asList(parsed.drillAgain, 5);
  const nextPhase = done
    ? 'completed'
    : (parsed.phase === 'calibrating' || parsed.phase === 'active'
      ? parsed.phase
      : (phase === 'calibrating' ? 'active' : 'active'));

  return {
    assistantMessages,
    sessionPatch: {
      status: done ? 'completed' : 'active',
      phase: nextPhase,
      config,
      briefing: nextBriefing,
      messages,
      feedback,
      questionIndex: Number.isInteger(parsed.questionIndex)
        ? parsed.questionIndex
        : (session?.questionIndex || 0) + (userMessage && phase === 'active' ? 1 : 0),
      followUpsUsed: Number(parsed.followUpsUsed || 0),
      summary,
      lastResearchAssist: liveResearch
        ? {
            at: new Date().toISOString(),
            query: liveResearch.query,
            topics: liveResearch.topics,
            mode: liveResearch.mode,
            bullets: liveResearch.bullets || [],
          }
        : session?.lastResearchAssist || null,
    },
    feedback: nextFeedback,
    done,
    mode: 'openai',
    drillQuestions,
    briefing: nextBriefing,
    researchAssist: liveResearch
      ? {
          query: liveResearch.query,
          topics: liveResearch.topics,
          bullets: liveResearch.bullets || [],
          mode: liveResearch.mode,
        }
      : null,
  };
}

export async function runMockInterviewTurn(payload) {
  const ctx = buildContextPack(payload.applicationContext || {}, payload.profileSnapshot || {});
  const briefing = await ensureInterviewBriefing(ctx, payload.session || {});

  let liveResearch = null;
  const userMessage = payload.userMessage || null;
  // Sense doubt anytime the candidate speaks (including calibration corrections).
  if (userMessage?.trim()) {
    try {
      const doubt = await assessCandidateDoubt({
        userMessage,
        company: ctx.company,
        role: briefing?.role?.subtypeLabel || ctx.role,
        lastInterviewerPrompt: lastInterviewerQuestion(payload.session?.messages || []),
      });
      if (doubt.doubtful) {
        liveResearch = await researchCompanySupport({
          company: ctx.company,
          role: briefing?.role?.subtypeLabel || ctx.role,
          topics: doubt.topics,
          query: doubt.query,
          briefing,
        });
        if (liveResearch) {
          liveResearch.topics = doubt.topics;
          liveResearch.reason = doubt.reason;
        }
      }
    } catch (error) {
      console.error('Company research assist failed:', error.message);
    }
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      return await llmTurn({ ...payload, briefing, liveResearch });
    } catch (error) {
      console.error('Mock interview LLM failed, falling back:', error.message);
    }
  }
  return heuristicTurn({ ...payload, briefing, liveResearch });
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(base, n) {
  const d = new Date(base);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

export function heuristicStudyPlan({ applicationContext, checklistGaps = [], interviewAt = null }) {
  const ctx = buildContextPack(applicationContext, {});
  const briefing = heuristicBriefing(ctx);
  const gaps = asList(checklistGaps.length ? checklistGaps : ctx.checklistGaps, 8);
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const interviewDate = interviewAt ? new Date(interviewAt) : null;
  const hasInterview = interviewDate && !Number.isNaN(interviewDate.getTime());
  const daysUntil = hasInterview
    ? Math.max(0, Math.ceil((interviewDate - now) / (1000 * 60 * 60 * 24)))
    : 3;

  const dayCount = Math.min(5, Math.max(2, daysUntil + 1));
  const kindsFromGaps = gaps.map((label) => {
    const lower = label.toLowerCase();
    if (lower.includes('research')) return { kind: 'research', label };
    if (lower.includes('star') || lower.includes('stor')) return { kind: 'stories', label };
    if (lower.includes('question') || lower.includes('practice')) return { kind: 'mock', label };
    if (lower.includes('fit') || lower.includes('gap')) return { kind: 'fit', label };
    return { kind: 'concepts', label };
  });

  const defaults = [
    {
      kind: 'research',
      label: `Research ${ctx.company}: ${briefing.company.businessModel || 'model'}, ${briefing.company.industry || 'industry'}, products & buyers`,
    },
    {
      kind: 'stories',
      label: `Polish 2 STARR stories for a ${briefing.role.subtypeLabel}`,
    },
    { kind: 'mock', label: `Run a 15-minute mock as ${briefing.role.subtypeLabel} at ${ctx.company}` },
    { kind: 'fit', label: ctx.gaps[0] ? `Prep answer for gap: ${ctx.gaps[0]}` : 'Map role fit evidence' },
    {
      kind: 'concepts',
      label: briefing.interviewAngles[0] || ctx.studyTopics[0] || `Review concepts for ${ctx.pathTitle}`,
    },
    { kind: 'ask', label: 'Finalize questions to ask the interviewer' },
  ];

  const pool = [...kindsFromGaps];
  for (const item of defaults) {
    if (!pool.some((p) => p.label === item.label)) pool.push(item);
  }

  const days = [];
  for (let i = 0; i < dayCount; i += 1) {
    const date = addDays(now, i);
    const isInterviewDay = hasInterview && dateKey(date) === dateKey(interviewDate);
    const labelPrefix = i === 0 ? 'Today' : isInterviewDay ? 'Interview day' : null;
    const items = [];
    if (isInterviewDay) {
      items.push(
        { id: uuidv4(), kind: 'warmup', label: 'Light warm-up: one story out loud', done: false },
        { id: uuidv4(), kind: 'ask', label: 'Review questions to ask', done: false },
        { id: uuidv4(), kind: 'logistics', label: 'Confirm logistics and environment', done: false },
      );
    } else {
      const slice = pool.splice(0, 2);
      if (!slice.length) {
        slice.push({ kind: 'mock', label: 'Short mock drill (2 questions)' });
      }
      for (const item of slice) {
        items.push({ id: uuidv4(), kind: item.kind, label: item.label, done: false });
      }
    }
    days.push({
      date: dateKey(date),
      label: labelPrefix,
      items,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    interviewAt: hasInterview ? interviewDate.toISOString() : null,
    company: ctx.company,
    role: ctx.role,
    days,
  };
}

async function llmStudyPlan(payload) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const ctx = buildContextPack(payload.applicationContext || {}, {});
  const briefing = await ensureInterviewBriefing(ctx, {});
  const completion = await openai.chat.completions.create({
    model: 'gpt-5.4-mini',
    temperature: 0.4,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You create a short interview study plan for THIS company and role subtype. Return ONLY JSON:
{
  "days": [
    { "date": "YYYY-MM-DD", "label": "Today|Tomorrow|Interview day|null", "items": [{ "kind": "research|stories|mock|fit|concepts|ask|warmup|logistics", "label": "string" }] }
  ]
}
Rules: 2-5 days, 2-3 items per day, concrete and grounded in briefing (business model, products, role subtype). Interview day should be lighter.`,
      },
      {
        role: 'user',
        content: JSON.stringify({
          briefing,
          context: ctx,
          checklistGaps: payload.checklistGaps || [],
          interviewAt: payload.interviewAt || null,
          today: dateKey(new Date()),
        }),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return heuristicStudyPlan(payload);
  }

  if (!Array.isArray(parsed.days) || !parsed.days.length) {
    return heuristicStudyPlan(payload);
  }

  return {
    generatedAt: new Date().toISOString(),
    interviewAt: payload.interviewAt || null,
    company: ctx.company,
    role: ctx.role,
    days: parsed.days.slice(0, 5).map((day) => ({
      date: day.date || dateKey(new Date()),
      label: day.label || null,
      items: (day.items || []).slice(0, 4).map((item) => ({
        id: uuidv4(),
        kind: item.kind || 'concepts',
        label: String(item.label || 'Prep block').trim(),
        done: false,
      })),
    })),
  };
}

export async function generateStudyPlan(payload) {
  if (process.env.OPENAI_API_KEY) {
    try {
      return await llmStudyPlan(payload);
    } catch (error) {
      console.error('Study plan LLM failed, falling back:', error.message);
    }
  }
  return heuristicStudyPlan(payload);
}
