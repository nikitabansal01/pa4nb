import { STATUS_LABELS } from '../constants';
import { getProcess } from './processSteps';
import { formatInterviewWhen } from './todayInsights';
import { getDirectionSnapshot, getResumeEvidenceList } from '../careerProfile';

function upcomingInterviewAt(app) {
  const now = Date.now() - 60 * 60 * 1000;
  const dates = (app?.interviewDates || [])
    .map((value) => new Date(value))
    .filter((d) => !Number.isNaN(d.getTime()) && d.getTime() >= now)
    .sort((a, b) => a - b);
  return dates[0]?.toISOString() || null;
}

export function getWorkspace(app = {}) {
  return app.workspace && typeof app.workspace === 'object' ? app.workspace : {};
}

export function buildStageTimeline(app) {
  const workspace = getWorkspace(app);
  if (Array.isArray(workspace.stageHistory) && workspace.stageHistory.length > 0) {
    return [...workspace.stageHistory].sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0));
  }

  const { currentLabel } = getProcess(app);
  const items = [];
  if (app.createdAt) {
    items.push({
      id: 'seed-applied',
      label: 'Applied',
      status: 'applied',
      at: app.createdAt,
    });
  }
  if (app.status && app.status !== 'applied' && app.updatedAt) {
    items.push({
      id: 'seed-current',
      label: currentLabel || STATUS_LABELS[app.status] || app.status,
      status: app.status,
      at: app.updatedAt,
    });
  }
  return items;
}

export function appendStageHistory(app, { label, status }) {
  const workspace = getWorkspace(app);
  const history = Array.isArray(workspace.stageHistory) ? [...workspace.stageHistory] : buildStageTimeline(app);
  const last = history[history.length - 1];
  if (last && last.status === status && last.label === label) {
    return workspace;
  }
  history.push({
    id: `stage-${Date.now()}`,
    label,
    status,
    at: new Date().toISOString(),
  });
  return { ...workspace, stageHistory: history };
}

export function getOverviewDefaults(app) {
  const at = upcomingInterviewAt(app);
  const workspace = getWorkspace(app);
  return {
    company: app.company || 'Unknown company',
    role: app.positionTitle || '',
    stageLabel: getProcess(app).currentLabel,
    status: app.status || 'applied',
    upcomingInterview: at ? formatInterviewWhen(at) : 'None scheduled',
    upcomingInterviewAt: at,
    recruiter: workspace.recruiter || '',
    hiringManager: workspace.hiringManager || '',
    source: workspace.source || '',
    jobDescription: workspace.jobDescription || app.notes || '',
  };
}

export function getRoleFitDefaults(app, profile = null) {
  const workspace = getWorkspace(app);
  const saved = workspace.roleFit || {};
  const role = app.positionTitle || 'this role';
  const company = app.company || 'the company';
  const direction = getDirectionSnapshot(profile);
  const resumeEvidence = getResumeEvidenceList(profile, { limit: 4 });
  const pathTitle = direction.primaryTitle;
  const focus = direction.focusAreas?.[0];

  return {
    requirements: saved.requirements || [
      `Own roadmap and discovery for ${role}`,
      'Partner with engineering and design on delivery',
      focus
        ? `Demonstrate strength in ${focus} aligned with ${pathTitle}`
        : 'Use data to prioritize and measure outcomes',
    ],
    evidence: saved.evidence || [
      ...resumeEvidence.slice(0, 3),
      app.notes?.trim() || `Prior work relevant to ${company}`,
      ...(app.nextSteps || []).slice(0, 1),
    ].filter(Boolean).slice(0, 5),
    matches: saved.matches || [
      `Background that supports ${pathTitle}`,
      resumeEvidence[0] || 'Cross-functional leadership and stakeholder alignment',
      'Shipped product work in a related domain',
    ].filter(Boolean).slice(0, 4),
    gaps: saved.gaps || [
      focus
        ? `Sharpen ${focus} examples for ${company}`
        : 'Deeper domain vocabulary for this market',
      'A crisp metric story for recent impact',
    ],
    stories: saved.stories || [
      `0→1 discovery story angled toward ${pathTitle}`,
      'Influence without authority across teams',
      'Trade-off call under ambiguity',
    ],
    pathTitle,
  };
}

export function getInterviewPrepDefaults(app, profile = null) {
  const workspace = getWorkspace(app);
  const saved = workspace.interviewPrep || {};
  const company = app.company || 'this company';
  const role = app.positionTitle || 'the role';
  const direction = getDirectionSnapshot(profile);
  const jd = workspace.jobDescription || app.notes || '';
  const resumeEvidence = getResumeEvidenceList(profile, { limit: 3 });
  const pathTitle = direction.primaryTitle;

  return {
    likelyQuestions: saved.likelyQuestions || [
      `Why ${company}, and why ${pathTitle}?`,
      `Walk me through a product you owned end to end.`,
      `How would you approach the first 90 days in ${role}?`,
      jd
        ? `How would you tackle the core problem in this JD at ${company}?`
        : 'Tell me about a time you disagreed with engineering.',
    ],
    starStories: saved.starStories || [
      resumeEvidence[0] || 'Customer insight that changed the roadmap',
      resumeEvidence[1] || 'Shipping under a hard deadline',
      `Failure/recovery story useful for ${pathTitle}`,
    ],
    questionsToAsk: saved.questionsToAsk || [
      'How does this team define success this half?',
      `Where does ${pathTitle}-shaped work show up on the roadmap?`,
      'What would make someone thrive in this role?',
    ],
    studyTopics: saved.studyTopics || [
      `${company} product and business model`,
      ...(direction.focusAreas || []).slice(0, 2),
      jd ? 'JD requirements mapped to your strongest evidence' : 'Competitors and differentiation',
    ].filter(Boolean),
    pathTitle,
  };
}

export function getReflectionDefaults(app) {
  const workspace = getWorkspace(app);
  const saved = workspace.reflection || {};
  return {
    preNotes: saved.preNotes || '',
    postNotes: saved.postNotes || '',
    questionsAsked: saved.questionsAsked || '',
    wentWell: saved.wentWell || '',
    struggled: saved.struggled || '',
    followUp: saved.followUp || (app.nextSteps || [])[0] || '',
  };
}

export function getResearchDefaults(app) {
  const workspace = getWorkspace(app);
  const saved = workspace.research || {};
  return {
    summary: saved.summary || '',
    product: saved.product || '',
    market: saved.market || '',
    culture: saved.culture || '',
    openQuestions: saved.openQuestions || '',
  };
}
