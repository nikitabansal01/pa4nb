import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const USERS_FILE = join(DATA_DIR, 'users.json');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-me';
const TOKEN_TTL = '30d';

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readUsers() {
  await ensureDataDir();
  try {
    const raw = await readFile(USERS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { users: [] };
  }
}

async function writeUsers(data) {
  await ensureDataDir();
  await writeFile(USERS_FILE, JSON.stringify(data, null, 2));
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export async function registerUser(email, password) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !password) {
    throw new Error('Email and password are required');
  }
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const store = await readUsers();
  if (store.users.some((u) => u.email === normalized)) {
    throw new Error('An account with this email already exists');
  }

  const user = {
    id: uuidv4(),
    email: normalized,
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: new Date().toISOString(),
  };

  store.users.push(user);
  await writeUsers(store);

  return { id: user.id, email: user.email };
}

export async function loginUser(email, password) {
  const normalized = email.trim().toLowerCase();
  const store = await readUsers();
  const user = store.users.find((u) => u.email === normalized);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new Error('Invalid email or password');
  }
  return { id: user.id, email: user.email };
}

export async function getUserById(id) {
  const store = await readUsers();
  const user = store.users.find((u) => u.id === id);
  if (!user) return null;
  return { id: user.id, email: user.email };
}
