import { User } from '../models/User.js';
import { httpError } from '../utils/httpError.js';

/**
 * Use after requireAuth: only users with userType "admin" in the database get through; others get 403.
 * Checked against the database on every request, so changing someone's userType takes effect at once.
 */
export async function requireAdmin(req, res, next) {
  const user = await User.findById(req.auth?.userId).select('userType').lean();
  if (user?.userType !== 'admin') return next(httpError(403, 'Only admins can do this'));
  next();
}
