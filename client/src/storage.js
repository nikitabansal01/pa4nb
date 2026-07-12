import {
  createEmptyCareerProfile,
  normalizeCareerProfile,
  selectionFromLegacyDirection,
} from './careerProfile';

const STORAGE_KEY = 'pa-for-nb-applications';
const LABELS_KEY = 'pa-for-nb-labels';
const META_KEY = 'pa-for-nb-meta';
const DIRECTION_KEY = 'career-os-direction';
const PROFILE_KEY = 'career-os-profile';
const STORY_BANK_KEY = 'career-os-story-bank';
const PRACTICED_QUESTIONS_KEY = 'career-os-practiced-questions';
const LEARNING_PLAN_KEY = 'career-os-learning-plan';

export const DEFAULT_LABEL_NAME = 'Referral requested';

export function getLocalApplications() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveLocalApplications(applications) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
}

export function getLocalLabels() {
  const raw = localStorage.getItem(LABELS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveLocalLabels(labels) {
  localStorage.setItem(LABELS_KEY, JSON.stringify(labels));
}

export function createDefaultLocalLabel() {
  const now = new Date().toISOString();
  return {
    id: `label-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: DEFAULT_LABEL_NAME,
    createdAt: now,
    updatedAt: now,
  };
}

export function ensureLocalLabels() {
  const existing = getLocalLabels();
  if (existing && existing.length > 0) return existing;
  const seeded = [createDefaultLocalLabel()];
  saveLocalLabels(seeded);
  return seeded;
}

export function getLocalMeta() {
  const raw = localStorage.getItem(META_KEY);
  if (!raw) return { dataSource: null };
  try {
    return JSON.parse(raw);
  } catch {
    return { dataSource: null };
  }
}

export function setLocalMeta(meta) {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

export function clearLocalData() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LABELS_KEY);
  localStorage.setItem(META_KEY, JSON.stringify({ dataSource: 'empty' }));
}

export async function authHeaders(getToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (getToken) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export function isShowingExamples(applications) {
  return applications.length > 0 && applications.every((a) => a.isExample);
}

export function stripExamples(applications) {
  return Array.isArray(applications) ? applications.filter((a) => !a.isExample) : [];
}

export function getCareerProfile() {
  const raw = localStorage.getItem(PROFILE_KEY);
  if (raw) {
    try {
      return normalizeCareerProfile(JSON.parse(raw));
    } catch {
      // fall through
    }
  }

  const legacyRaw = localStorage.getItem(DIRECTION_KEY);
  if (legacyRaw) {
    try {
      const legacy = JSON.parse(legacyRaw);
      const selection = selectionFromLegacyDirection(legacy);
      if (selection) {
        const migrated = normalizeCareerProfile({ selection });
        saveCareerProfile(migrated);
        return migrated;
      }
    } catch {
      // ignore
    }
  }

  return createEmptyCareerProfile();
}

export function saveCareerProfile(profile) {
  const normalized = normalizeCareerProfile(profile);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(normalized));
  if (normalized.selection?.primaryTitle) {
    localStorage.setItem(DIRECTION_KEY, JSON.stringify(normalized.selection));
  }
  return normalized;
}

/** Prefer getCareerProfile().selection via useCareerProfile. */
export function getDirectionSelection() {
  const selection = getCareerProfile().selection;
  return selection?.primaryTitle ? selection : null;
}

/** Prefer useCareerProfile path selection helpers. */
export function saveDirectionSelection(selection) {
  const profile = getCareerProfile();
  saveCareerProfile({
    ...profile,
    selection: { ...profile.selection, ...selection },
  });
}

export function getStoryBank() {
  const raw = localStorage.getItem(STORY_BANK_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveStoryBank(bank) {
  localStorage.setItem(STORY_BANK_KEY, JSON.stringify(bank));
}

export function getPracticedQuestions() {
  const raw = localStorage.getItem(PRACTICED_QUESTIONS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePracticedQuestions(questions) {
  localStorage.setItem(PRACTICED_QUESTIONS_KEY, JSON.stringify(questions));
}

export function getLearningPlanStatuses() {
  const raw = localStorage.getItem(LEARNING_PLAN_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveLearningPlanStatuses(statuses) {
  localStorage.setItem(LEARNING_PLAN_KEY, JSON.stringify(statuses));
}

export function mergeApplications(existing, incoming) {
  const map = new Map();

  for (const app of stripExamples(existing)) {
    if (app?.id) map.set(app.id, app);
  }

  for (const app of stripExamples(incoming)) {
    if (!app?.id) continue;
    const byCompany = [...map.values()].find(
      (candidate) =>
        candidate.company &&
        app.company &&
        candidate.company.toLowerCase().replace(/[^a-z0-9]/g, '') ===
          app.company.toLowerCase().replace(/[^a-z0-9]/g, '')
    );
    if (byCompany) {
      map.set(byCompany.id, { ...byCompany, ...app, id: byCompany.id, isExample: false });
    } else {
      map.set(app.id, { ...app, isExample: false });
    }
  }

  return [...map.values()].sort(
    (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
  );
}
