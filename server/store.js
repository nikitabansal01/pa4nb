import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const USERS_DATA_DIR = join(DATA_DIR, 'accounts');

const userAppsKey = (userId) => `pa:user:${userId}:applications`;

export function isVercelRuntime() {
  return process.env.VERCEL === '1';
}

export function useKvStorage() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export function getStorageMode() {
  if (useKvStorage()) return 'kv';
  if (isVercelRuntime()) return 'unconfigured';
  return 'filesystem';
}

export function assertStorageReady() {
  if (isVercelRuntime() && !useKvStorage()) {
    throw new Error(
      'Cloud accounts need a Vercel KV database. In the Vercel dashboard, open Storage → Create Database → KV, connect it to this project, then redeploy.'
    );
  }
}

let kvClient = null;

async function getKv() {
  if (!kvClient) {
    const { kv } = await import('@vercel/kv');
    kvClient = kv;
  }
  return kvClient;
}

export async function readUserApplications(userId) {
  assertStorageReady();

  if (useKvStorage()) {
    const kv = await getKv();
    const apps = await kv.get(userAppsKey(userId));
    return apps || [];
  }

  const userDir = join(USERS_DATA_DIR, userId);
  await mkdir(userDir, { recursive: true });
  const dbPath = join(userDir, 'db.json');
  try {
    const raw = await readFile(dbPath, 'utf8');
    const data = JSON.parse(raw);
    return data.applications || [];
  } catch {
    return [];
  }
}

export async function writeUserApplications(userId, applications) {
  assertStorageReady();

  if (useKvStorage()) {
    const kv = await getKv();
    await kv.set(userAppsKey(userId), applications);
    return;
  }

  const userDir = join(USERS_DATA_DIR, userId);
  await mkdir(userDir, { recursive: true });
  const dbPath = join(userDir, 'db.json');
  await writeFile(dbPath, JSON.stringify({ applications }, null, 2));
}
