const STORAGE_KEY = 'pa-for-nb-applications';
const META_KEY = 'pa-for-nb-meta';
const TOKEN_KEY = 'pa-for-nb-token';
const USER_KEY = 'pa-for-nb-user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuth(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

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

export function clearLocalData() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.setItem(META_KEY, JSON.stringify({ dataSource: 'empty' }));
}

export function authHeaders() {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export function isShowingExamples(applications) {
  return applications.length > 0 && applications.every((a) => a.isExample);
}

export function stripExamples(applications) {
  return applications.filter((a) => !a.isExample);
}
