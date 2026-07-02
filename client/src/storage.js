const STORAGE_KEY = 'pa-for-nb-applications';
const LIFE_DESIGN_KEY = 'pa-for-nb-life-design';
const META_KEY = 'pa-for-nb-meta';

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

export function getLocalLifeDesign() {
  const raw = localStorage.getItem(LIFE_DESIGN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveLocalLifeDesign(data) {
  localStorage.setItem(LIFE_DESIGN_KEY, JSON.stringify(data));
}

export function clearLocalData() {
  localStorage.removeItem(STORAGE_KEY);
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
  return applications.filter((a) => !a.isExample);
}
