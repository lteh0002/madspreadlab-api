import * as authService from '../services/auth.service.js';
import { httpError } from '../utils/httpError.js';

/**
 * POST /api/login
 * Body: { email, password }
 * 200: { token, user: { id, email, name } }; 400 if either is missing; 401 if they don't match.
 */
export async function login(req, res) {
  res.set('Cache-Control', 'no-store').json(await authService.login(req.body ?? {}));
}

/** POST /api/logout (signed in) – ends this session; its token stops working at once */
export async function logout(req, res) {
  await authService.endSession(req.auth.sessionId);
  res.status(204).end();
}

/** GET /api/me (signed in) – the current user, e.g. to pick up a changed userType */
export async function me(req, res) {
  const user = await authService.getUser(req.auth.userId);
  if (!user) throw httpError(401, 'Sign in required');
  res.set('Cache-Control', 'no-store').json({ user });
}
