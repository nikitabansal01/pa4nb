import { getCareerDirectionSnapshot, getNextInterview } from './todayInsights';
import { getPathLearningTopics } from '../careerMocks';
import { isClosedStatus } from './processSteps';
import {
  getInterviewPrepDefaults,
  getReflectionDefaults,
  getRoleFitDefaults,
  getWorkspace,
} from './companyWorkspace';
import { getUpcomingInterviewCards } from './interviewPrepHub';

const STATUS_OPTIONS = ['not_started', 'in_progress', 'completed'];

export const LEARNING_STATUS_LABELS = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
};

function filled(value) {
  return Boolean(String(value || '').trim());
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function pathTopicLibrary(pathTitle) {
  return getPathLearningTopics(pathTitle).map((item) => ({
    ...item,
    why: item.why || `Relevant to your ${pathTitle} path.`,
  }));
}

export function getCurrentLearningFocus(profileOrSelection) {
  const direction = getCareerDirectionSnapshot(profileOrSelection);
  const library = pathTopicLibrary(direction.primaryTitle);
  const focusAreas = direction.focusAreas?.length
    ? direction.focusAreas
    : library.map((item) => item.topic).slice(0, 2);

  return {
    path: direction.primaryTitle,
    isMockPath: Boolean(direction.isMock),
    nextAction: direction.nextAction,
    focusAreas,
    summary: direction.isMock
      ? `Defaulting to ${direction.primaryTitle} until you select a primary path.`
      : `Your selected path is ${direction.primaryTitle}.`,
  };
}

export function getInterviewDrivenGaps(applications, profile = null) {
  const upcoming = getUpcomingInterviewCards(applications, profile);
  const next = getNextInterview(applications);
  const direction = getCareerDirectionSnapshot(profile);
  const gaps = [];

  for (const topic of profile?.learningTopics || []) {
    if (topic.source !== 'interview_reflection') continue;
    gaps.push({
      id: topic.id,
      topic: topic.topic,
      reason: topic.reason || `From post-interview reflection${topic.company ? ` at ${topic.company}` : ''}.`,
      source: 'Reflection',
      company: topic.company || null,
      appId: topic.appId || null,
    });
  }

  for (const app of applications || []) {
    if (isClosedStatus(app.status)) continue;
    const company = app.company || 'this company';
    const roleFit = getRoleFitDefaults(app, profile);
    const prep = getInterviewPrepDefaults(app, profile);
    const reflection = getReflectionDefaults(app);
    const interviewCard = upcoming.find((item) => item.id === app.id);
    const interviewHint = interviewCard
      ? `upcoming ${company} interview`
      : `${company} loop`;

    for (const gap of (roleFit.gaps || []).filter(filled).slice(0, 2)) {
      gaps.push({
        id: `gap-${app.id}-${gap}`,
        topic: gap,
        reason: `Revealed by role-fit gaps for ${company} vs ${direction.primaryTitle}.`,
        source: 'Role fit',
        company,
        appId: app.id,
      });
    }

    for (const topic of (prep.studyTopics || []).filter(filled).slice(0, 2)) {
      gaps.push({
        id: `study-${app.id}-${topic}`,
        topic,
        reason: `Relevant to prep for ${interviewHint} on your ${direction.primaryTitle} path.`,
        source: 'Interview prep',
        company,
        appId: app.id,
      });
    }

    if (filled(reflection.struggled)) {
      gaps.push({
        id: `struggle-${app.id}`,
        topic: reflection.struggled.trim().slice(0, 90),
        reason: `Surfaced in post-interview reflection for ${company}.`,
        source: 'Reflection',
        company,
        appId: app.id,
      });
    }
  }

  // Personalized mock if pipeline is thin but we have a next interview
  if (gaps.length === 0 && next) {
    gaps.push({
      id: 'mock-eval',
      topic: 'AI evaluation systems',
      reason: `Relevant to your ${direction.primaryTitle} path and upcoming ${next.company} interview.`,
      source: 'Interview activity',
      company: next.company,
      appId: next.id,
    });
  }

  if (gaps.length === 0) {
    gaps.push({
      id: 'mock-path-gap',
      topic: 'Metric storytelling under ambiguity',
      reason: 'Common gap once interviews move past recruiter screens.',
      source: 'Interview patterns',
      company: null,
      appId: null,
    });
  }

  return uniqueById(gaps).slice(0, 6);
}

export function buildLearningPlan(applications, profileOrSelection, savedStatuses = {}) {
  const profile = profileOrSelection?.snapshot || profileOrSelection?.selection
    ? profileOrSelection
    : { selection: profileOrSelection || {} };
  const focus = getCurrentLearningFocus(profile);
  const gaps = getInterviewDrivenGaps(applications, profile);
  const next = getNextInterview(applications);
  const pathLibrary = pathTopicLibrary(focus.path);
  const items = [];

  pathLibrary.forEach((item, index) => {
    const companyHint = next?.company;
    const why = companyHint
      ? `Relevant to your ${focus.path} path and upcoming ${companyHint} interview.`
      : item.why || `Relevant to your ${focus.path} path.`;
    items.push({
      id: `path-${index}-${item.topic}`,
      topic: item.topic,
      why,
      time: item.time,
      exercise: item.exercise,
      origin: 'Career direction',
    });
  });

  gaps.slice(0, 3).forEach((gap, index) => {
    items.push({
      id: `gap-plan-${gap.id}`,
      topic: gap.topic,
      why: gap.reason,
      time: index === 0 ? '30 min' : '25 min',
      exercise: gap.company
        ? `Write a 5-bullet brief connecting this topic to ${gap.company}, then rehearse aloud once.`
        : 'Write a 5-bullet brief, then rehearse a 90-second explanation aloud.',
      origin: 'Interview-driven',
    });
  });

  // Deduplicate by topic text
  const seenTopics = new Set();
  const deduped = [];
  for (const item of items) {
    const key = item.topic.toLowerCase();
    if (seenTopics.has(key)) continue;
    seenTopics.add(key);
    deduped.push({
      ...item,
      status: STATUS_OPTIONS.includes(savedStatuses[item.id])
        ? savedStatuses[item.id]
        : 'not_started',
    });
  }

  return deduped.slice(0, 6);
}

export function getLearningEvidence(applications, practicedQuestions = [], planItems = []) {
  const completedExercises = planItems
    .filter((item) => item.status === 'completed')
    .map((item) => ({
      id: `done-${item.id}`,
      label: item.topic,
      detail: item.exercise,
    }));

  const improvedAnswers = practicedQuestions.slice(0, 4).map((item) => ({
    id: item.id,
    label: item.question,
    detail: item.company
      ? `Practiced for ${item.company}${item.pathHint ? ` · ${item.pathHint}` : ''}`
      : 'Practiced in prep',
  }));

  const topicsUsed = [];
  for (const app of applications || []) {
    if (isClosedStatus(app.status)) continue;
    const reflection = getReflectionDefaults(app);
    const workspace = getWorkspace(app);
    if (filled(reflection.questionsAsked)) {
      topicsUsed.push({
        id: `asked-${app.id}`,
        label: reflection.questionsAsked.trim().slice(0, 100),
        detail: `Asked in ${app.company || 'interview'}`,
      });
    }
    if (filled(reflection.wentWell)) {
      topicsUsed.push({
        id: `well-${app.id}`,
        label: reflection.wentWell.trim().slice(0, 100),
        detail: `Worked well at ${app.company || 'interview'}`,
      });
    }
    if (workspace.interviewPrep?.practiced) {
      const prep = getInterviewPrepDefaults(app);
      const topic = (prep.studyTopics || []).find(filled);
      if (topic) {
        topicsUsed.push({
          id: `used-${app.id}-${topic}`,
          label: topic,
          detail: `Used while prepping ${app.company || 'an interview'}`,
        });
      }
    }
  }

  if (completedExercises.length === 0) {
    completedExercises.push({
      id: 'seed-exercise',
      label: 'No completed exercises yet',
      detail: 'Mark a learning-plan item complete to build evidence here.',
      empty: true,
    });
  }

  if (improvedAnswers.length === 0) {
    improvedAnswers.push({
      id: 'seed-answers',
      label: 'No practiced answers logged yet',
      detail: 'Practice questions from Interview Prep to show improvement here.',
      empty: true,
    });
  }

  if (topicsUsed.length === 0) {
    topicsUsed.push({
      id: 'seed-used',
      label: 'No live interview usage yet',
      detail: 'After interviews, capture questions and what landed in company notes.',
      empty: true,
    });
  }

  return {
    completedExercises: completedExercises.slice(0, 5),
    improvedAnswers: improvedAnswers.slice(0, 5),
    topicsUsed: uniqueById(topicsUsed).slice(0, 5),
  };
}
