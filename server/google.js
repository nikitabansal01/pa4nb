import { createHmac, timingSafeEqual, randomBytes } from 'crypto';

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events.readonly';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

export function isGoogleConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID
    && process.env.GOOGLE_CLIENT_SECRET
    && process.env.GOOGLE_REDIRECT_URI
  );
}

export function getClientRedirectBase() {
  return (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function requireGoogleConfig() {
  if (!isGoogleConfigured()) {
    throw new Error('Google Calendar is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.');
  }
}

function signState(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', process.env.GOOGLE_CLIENT_SECRET)
    .update(body)
    .digest('base64url');
  return `${body}.${sig}`;
}

export function createOAuthState(userId) {
  requireGoogleConfig();
  return signState({
    userId,
    nonce: randomBytes(16).toString('hex'),
    exp: Date.now() + 10 * 60 * 1000,
  });
}

export function verifyOAuthState(state) {
  requireGoogleConfig();
  const [body, sig] = String(state || '').split('.');
  if (!body || !sig) throw new Error('Invalid OAuth state');

  const expected = createHmac('sha256', process.env.GOOGLE_CLIENT_SECRET)
    .update(body)
    .digest('base64url');

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('Invalid OAuth state signature');
  }

  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (!payload?.userId || !payload?.exp || Date.now() > payload.exp) {
    throw new Error('OAuth state expired. Try connecting again.');
  }
  return payload;
}

export function buildGoogleAuthUrl(state) {
  requireGoogleConfig();
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: CALENDAR_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code) {
  requireGoogleConfig();
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Failed to exchange Google auth code');
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || null,
    expiresAt: Date.now() + (Number(data.expires_in || 3600) * 1000),
    scope: data.scope || CALENDAR_SCOPE,
    tokenType: data.token_type || 'Bearer',
  };
}

async function refreshAccessToken(refreshToken) {
  requireGoogleConfig();
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Failed to refresh Google access token');
  }

  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in || 3600) * 1000),
    scope: data.scope,
    tokenType: data.token_type || 'Bearer',
  };
}

export async function getValidAccessToken(stored, onUpdate) {
  if (!stored?.refreshToken && !stored?.accessToken) {
    throw new Error('Google Calendar is not connected');
  }

  if (stored.accessToken && stored.expiresAt && Date.now() < stored.expiresAt - 60_000) {
    return stored.accessToken;
  }

  if (!stored.refreshToken) {
    throw new Error('Google session expired. Disconnect and connect again.');
  }

  const refreshed = await refreshAccessToken(stored.refreshToken);
  const next = {
    ...stored,
    accessToken: refreshed.accessToken,
    expiresAt: refreshed.expiresAt,
    scope: refreshed.scope || stored.scope,
    tokenType: refreshed.tokenType || stored.tokenType,
    updatedAt: new Date().toISOString(),
  };
  if (onUpdate) await onUpdate(next);
  return next.accessToken;
}

export async function listUpcomingEvents(accessToken, { daysBack = 7, daysForward = 21 } = {}) {
  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - daysBack);
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + daysForward);

  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  });

  const res = await fetch(`${EVENTS_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || data.error || 'Failed to load Google Calendar events');
  }

  return (data.items || []).map((event) => ({
    id: event.id,
    title: event.summary || '(No title)',
    description: event.description || '',
    location: event.location || '',
    hangoutLink: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri || '',
    start: event.start?.dateTime || event.start?.date || null,
    end: event.end?.dateTime || event.end?.date || null,
    status: event.status || 'confirmed',
    htmlLink: event.htmlLink || '',
  }));
}

export async function revokeGoogleToken(token) {
  if (!token) return;
  try {
    await fetch(`${REVOKE_URL}?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  } catch {
    // Best-effort revoke; local disconnect still proceeds.
  }
}
