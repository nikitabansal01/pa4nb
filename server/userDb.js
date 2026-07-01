import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { JSONFilePreset } from 'lowdb/node';

const __dirname = dirname(fileURLToPath(import.meta.url));
const USERS_DATA_DIR = join(__dirname, '..', 'data', 'accounts');

const dbCache = new Map();

function userDbPath(userId) {
  return join(USERS_DATA_DIR, userId, 'db.json');
}

async function getUserDb(userId) {
  if (!dbCache.has(userId)) {
    await mkdir(join(USERS_DATA_DIR, userId), { recursive: true });
    const db = await JSONFilePreset(userDbPath(userId), { applications: [] });
    dbCache.set(userId, db);
  }
  return dbCache.get(userId);
}

export async function getUserApplications(userId) {
  const db = await getUserDb(userId);
  await db.read();
  return db.data.applications.sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );
}

export async function saveUserApplications(userId, applications) {
  const db = await getUserDb(userId);
  db.data.applications = applications;
  await db.write();
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
