import * as authService from '../services/auth.service.js';

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
