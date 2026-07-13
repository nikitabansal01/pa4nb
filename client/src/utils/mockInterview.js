import {
  getInterviewPrepDefaults,
  getOverviewDefaults,
  getResearchDefaults,
  getRoleFitDefaults,
  getWorkspace,
} from './companyWorkspace';
import { getPrepChecklist } from './interviewPrepHub';
import { getResumeEvidenceList, getDirectionSnapshot } from '../careerProfile';
import { CAREER_DIRECTIONS, inferCareerTrack } from '../careerDirections';

export const MOCK_INTERVIEW_TYPES = [
  {
    id: 'recruiter',
    label: 'Recruiter screen',
    blurb: 'Fit and motivation screen — light past context, not a deep project autopsy.',
    roundMode: 'past',
  },
  {
    id: 'behavioral',
    label: 'Behavioral / past stories',
    blurb: 'STARR and past achievements. Use only when the real round is about prior work.',
    roundMode: 'past',
  },
  {
    id: 'live_coding',
    label: 'Live coding / whiteboard',
    blurb: 'Net-new problem: think aloud, code or whiteboard for this company’s domain. Not past projects.',
    roundMode: 'forward',
  },
  {
    id: 'live_prototype',
    label: 'Live prototyping / product',
    blurb: 'Net-new problem: analyze → who/what to build → tradeoffs → MVP & metrics → prototype (Figma / Figma Make / Claude Design).',
    roundMode: 'forward',
  },
  {
    id: 'mixed',
    label: 'Mixed',
    blurb: 'Blend only when the real loop mixes styles — still confirm before starting.',
    roundMode: 'mixed',
  },
];

/** past = stories/achievements; forward = net-new build/ideate/code; mixed = blend */
export function getRoundMode(type) {
  const normalized = type === 'product' ? 'live_prototype' : type;
  const found = MOCK_INTERVIEW_TYPES.find((t) => t.id === normalized);
  return found?.roundMode || 'mixed';
}

export function defaultTopicForInterviewType(type, track = 'pm') {
  const normalized = type === 'product' ? 'live_prototype' : type;
  const mode = getRoundMode(normalized);
  if (mode === 'forward') {
    if (normalized === 'live_coding') return 'technical';
    return track === 'eng' ? 'system_design' : 'product_sense';
  }
  if (normalized === 'recruiter' || normalized === 'behavioral') return 'behavioral';
  return defaultTopicForTrack(track);
}

export const MOCK_TOPICS = [
  { id: 'behavioral', label: 'Behavioral', tracks: ['pm', 'eng', 'ds'], modes: ['past', 'mixed'] },
  { id: 'technical', label: 'Technical', tracks: ['eng', 'ds', 'pm'], modes: ['forward', 'mixed', 'past'] },
  { id: 'past_projects', label: 'Past projects', tracks: ['pm', 'eng', 'ds'], modes: ['past'] },
  { id: 'product_sense', label: 'Product sense', tracks: ['pm', 'ds'], modes: ['forward', 'mixed'] },
  { id: 'system_design', label: 'System design', tracks: ['eng'], modes: ['forward', 'mixed'] },
  { id: 'leadership', label: 'Leadership', tracks: ['pm', 'eng', 'ds'], modes: ['past', 'mixed'] },
  { id: 'mixed', label: 'Mixed topics', tracks: ['pm', 'eng', 'ds'], modes: ['mixed'] },
];

/** Topics allowed for this style — forward styles never include past_projects. */
export function getMockTopicsForStyle(type, track = 'pm') {
  const mode = getRoundMode(type);
  return MOCK_TOPICS.filter(
    (topic) => topic.tracks.includes(track) && topic.modes.includes(mode)
  );
}

export function showsTopicPicker(type) {
  // Style is source of truth for forward rounds — no conflicting topic control.
  return getRoundMode(type) !== 'forward';
}

function upcomingInterviewAt(app) {
  const now = Date.now() - 60 * 60 * 1000;
  const dates = (app?.interviewDates || [])
    .map((value) => new Date(value))
    .filter((d) => !Number.isNaN(d.getTime()) && d.getTime() >= now)
    .sort((a, b) => a - b);
  return dates[0]?.toISOString() || null;
}

function trackFromRoleTitle(title = '') {
  const text = String(title || '').toLowerCase();
  if (!text.trim()) return null;
  if (
    /data scien|machine learning|\bml\b|analytics|statistic|data engineer|research scientist/.test(text)
  ) {
    return 'ds';
  }
  if (
    /software|engineer|developer|\bswe\b|sre|frontend|backend|full.?stack|platform eng|mobile eng/.test(text)
  ) {
    return 'eng';
  }
  if (/product manager|product owner|\bpm\b|product lead/.test(text)) {
    return 'pm';
  }
  return null;
}

/** Resolve pm | eng | ds from the job title, career path, or resume snapshot. */
export function resolveMockTrack(app = {}, profile = null) {
  const fromTitle = trackFromRoleTitle(app.positionTitle || '');
  if (fromTitle) return fromTitle;

  const pathId = profile?.selection?.primaryPathId;
  if (pathId) {
    const direction = CAREER_DIRECTIONS.find((d) => d.id === pathId);
    if (direction?.track) return direction.track;
  }

  const pathTitle = profile?.selection?.primaryTitle || '';
  const fromPathTitle = trackFromRoleTitle(pathTitle);
  if (fromPathTitle) return fromPathTitle;

  if (profile?.snapshot) {
    const inferred = inferCareerTrack(profile.snapshot);
    if (inferred?.track) return inferred.track;
  }

  return 'pm';
}

export function getMockTopicsForTrack(track = 'pm') {
  const allowed = MOCK_TOPICS.filter((topic) => topic.tracks.includes(track));
  return allowed.length ? allowed : MOCK_TOPICS.filter((t) => t.id === 'mixed' || t.id === 'behavioral');
}

export function defaultTopicForTrack(track = 'pm') {
  if (track === 'eng') return 'technical';
  if (track === 'ds') return 'technical';
  return 'product_sense';
}

export function buildMockApplicationContext(app, profile = null) {
  const overview = getOverviewDefaults(app);
  const research = getResearchDefaults(app);
  const roleFit = getRoleFitDefaults(app, profile);
  const prep = getInterviewPrepDefaults(app, profile);
  const direction = getDirectionSnapshot(profile);
  const checklist = getPrepChecklist(app, profile);
  const checklistGaps = checklist.filter((item) => !item.done).map((item) => item.label);
  const track = resolveMockTrack(
    { ...app, positionTitle: overview.role || app.positionTitle },
    profile
  );

  return {
    company: overview.company,
    role: overview.role || app.positionTitle || '',
    positionTitle: app.positionTitle || '',
    track,
    industry: app.industry || '',
    businessModel: app.businessModel || '',
    fundingStage: app.fundingStage || '',
    status: app.status || '',
    stageLabel: overview.stageLabel || '',
    recruiter: overview.recruiter || '',
    hiringManager: overview.hiringManager || '',
    jobDescription: overview.jobDescription || '',
    researchSummary: research.summary || '',
    researchProduct: research.product || '',
    researchMarket: research.market || '',
    researchCulture: research.culture || '',
    researchOpenQuestions: research.openQuestions || '',
    gaps: roleFit.gaps || [],
    matches: roleFit.matches || [],
    starStories: prep.starStories || [],
    likelyQuestions: prep.likelyQuestions || [],
    studyTopics: prep.studyTopics || [],
    pathTitle: direction.primaryTitle || prep.pathTitle || '',
    resumeEvidence: getResumeEvidenceList(profile, { limit: 4 }),
    checklistGaps,
    interviewAt: upcomingInterviewAt(app),
  };
}

export function getMockInterviewState(app) {
  const workspace = getWorkspace(app);
  const mock = workspace.mockInterview && typeof workspace.mockInterview === 'object'
    ? workspace.mockInterview
    : {};
  return {
    sessions: Array.isArray(mock.sessions) ? mock.sessions : [],
    activeSessionId: mock.activeSessionId || null,
  };
}

export function getActiveMockSession(app) {
  const state = getMockInterviewState(app);
  if (!state.activeSessionId) return null;
  return state.sessions.find((s) => s.id === state.activeSessionId) || null;
}

export function getStudyPlan(app) {
  const workspace = getWorkspace(app);
  return workspace.studyPlan && typeof workspace.studyPlan === 'object'
    ? workspace.studyPlan
    : null;
}

export function defaultMockConfig(app, profile = null) {
  const track = resolveMockTrack(app, profile);
  const status = app?.status || '';
  if (status === 'recruiter_screen') {
    return { type: 'recruiter', topic: 'behavioral', maxTurns: 5, persona: 'friendly', track };
  }
  if (status === 'onsite') {
    const type = track === 'eng' ? 'live_coding' : 'live_prototype';
    return {
      type,
      topic: defaultTopicForInterviewType(type, track),
      maxTurns: 6,
      persona: 'bar-raiser',
      track,
    };
  }
  if (status === 'phone_screen' || status === 'interview_scheduled') {
    const type = track === 'eng' ? 'live_coding' : 'live_prototype';
    return {
      type,
      topic: defaultTopicForInterviewType(type, track),
      maxTurns: 6,
      persona: 'friendly',
      track,
    };
  }
  return {
    type: 'behavioral',
    topic: 'behavioral',
    maxTurns: 5,
    persona: 'friendly',
    track,
  };
}

export function mergeDrillIntoPrep(app, drillQuestions = []) {
  const workspace = getWorkspace(app);
  const prep = workspace.interviewPrep || {};
  const existing = Array.isArray(prep.likelyQuestions) ? prep.likelyQuestions : [];
  const merged = [...drillQuestions, ...existing]
    .map((q) => String(q || '').trim())
    .filter(Boolean);
  const unique = [...new Set(merged)].slice(0, 12);
  return {
    ...prep,
    likelyQuestions: unique,
    practiced: true,
    lastPracticedAt: new Date().toISOString(),
  };
}
