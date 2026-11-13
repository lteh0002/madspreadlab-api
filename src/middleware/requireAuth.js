import { findSession } from '../services/auth.service.js';
import { httpError } from '../utils/httpError.js';

/**
 * Rejects requests without a live session token in `Authorization: Bearer <token>`
 * (from POST /api/login). On success, req.auth is { userId, sessionId }.
 */
export async function requireAuth(req, res, next) {
  const [scheme, token] = (req.get('authorization') ?? '').split(' ');
  const session = scheme === 'Bearer' && token ? await findSession(token) : null;
  if (!session) return next(httpError(401, 'Sign in required'));
  req.auth = { userId: String(session.userId), sessionId: String(session._id) };
  next();
}
