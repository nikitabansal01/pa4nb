import { readFile, writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
  assertStorageReady,
  usePostgresStorage,
  getDatabaseUrl,
} from './store.js';
import { neon } from '@neondatabase/serverless';

const __dirname = dirname(fileURLToPath(import.meta.url));
const USERS_DATA_DIR = join(__dirname, '..', 'data', 'accounts');

let sqlClient = null;
let schemaReady = false;

function getSql() {
  if (!sqlClient) {
    sqlClient = neon(getDatabaseUrl());
  }
  return sqlClient;
}

async function ensureSchema() {
  if (schemaReady || !usePostgresStorage()) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS user_google (
      user_id TEXT PRIMARY KEY,
      tokens JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  schemaReady = true;
}

function googlePath(userId) {
  return join(USERS_DATA_DIR, userId, 'google.json');
}

export async function readGoogleTokens(userId) {
  assertStorageReady();

  if (usePostgresStorage()) {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT tokens
      FROM user_google
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    const raw = rows[0]?.tokens;
    if (!raw) return null;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return raw && typeof raw === 'object' ? raw : null;
  }

  try {
    const raw = await readFile(googlePath(userId), 'utf8');
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

export async function writeGoogleTokens(userId, tokens) {
  assertStorageReady();
  const payload = {
    ...tokens,
    updatedAt: new Date().toISOString(),
  };

  if (usePostgresStorage()) {
    await ensureSchema();
    const sql = getSql();
    await sql`
      INSERT INTO user_google (user_id, tokens, updated_at)
      VALUES (${userId}, ${JSON.stringify(payload)}::jsonb, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        tokens = EXCLUDED.tokens,
        updated_at = NOW()
    `;
    return payload;
  }

  const userDir = join(USERS_DATA_DIR, userId);
  await mkdir(userDir, { recursive: true });
  await writeFile(googlePath(userId), JSON.stringify(payload, null, 2));
  return payload;
}

export async function deleteGoogleTokens(userId) {
  assertStorageReady();

  if (usePostgresStorage()) {
    await ensureSchema();
    const sql = getSql();
    await sql`DELETE FROM user_google WHERE user_id = ${userId}`;
    return;
  }

  try {
    await unlink(googlePath(userId));
  } catch {
    // already gone
  }
}

export function publicGoogleStatus(tokens) {
  if (!tokens?.refreshToken && !tokens?.accessToken) {
    return { connected: false };
  }
  return {
    connected: true,
    connectedAt: tokens.connectedAt || tokens.updatedAt || null,
    scope: tokens.scope || null,
  };
}
