import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readUserApplications, writeUserApplications } from './store.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function getUserApplications(userId) {
  const applications = await readUserApplications(userId);
  return applications.sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );
}

export async function saveUserApplications(userId, applications) {
  await writeUserApplications(userId, applications);
}

export async function migrateUserApplications(userId, incomingApps) {
  const existing = await getUserApplications(userId);
  const map = new Map(existing.map((app) => [app.id, app]));

  for (const app of incomingApps) {
    if (app.isExample) continue;
    const cleaned = { ...app, isExample: false };
    map.set(cleaned.id, cleaned);
  }

  const merged = [...map.values()].sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );
  await saveUserApplications(userId, merged);
  return merged;
}

export async function loadExampleData() {
  const path = join(__dirname, 'example-data.json');
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw).applications;
}
