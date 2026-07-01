import { verifyToken, getUserById } from './auth.js';

export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  try {
    const payload = verifyToken(header.slice(7));
    req.user = { id: payload.sub, email: payload.email };
  } catch {
    req.user = null;
  }
  next();
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sign in required' });
  }

  try {
    const payload = verifyToken(header.slice(7));
    const user = await getUserById(payload.sub);
    if (!user) return res.status(401).json({ error: 'Invalid session' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}
