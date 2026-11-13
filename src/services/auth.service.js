import { createHash, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';
import { Session } from '../models/Session.js';
import { User } from '../models/User.js';
import { badRequest, httpError } from '../utils/httpError.js';
import { DUMMY_HASH, hashPassword, verifyPassword } from '../utils/password.js';

export const MIN_PASSWORD_LENGTH = 8;

/** What the database stores for a session token */
export const hashSessionToken = (token) => createHash('sha256').update(String(token)).digest('hex');

/** What clients see of a user */
const publicUser = (user) => ({ id: String(user._id), email: user.email, name: user.name });

/** { token, user } for a correct email + password; 401 otherwise (same message either way) */
export async function login({ email, password } = {}) {
  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
    throw badRequest('Email and password are required');
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw httpError(401, 'Incorrect email or password');

  const token = randomBytes(32).toString('base64url');
  await Promise.all([
    Session.create({
      tokenHash: hashSessionToken(token),
      userId: user._id,
      expiresAt: new Date(Date.now() + env.sessionTtl * 1000),
    }),
    User.updateOne({ _id: user._id }, { lastLoginAt: new Date() }),
  ]);

  return { token, user: publicUser(user) };
}

/** The live session for a token, or null if it's unknown or expired */
export async function findSession(token) {
  return Session.findOne({ tokenHash: hashSessionToken(token), expiresAt: { $gt: new Date() } }).lean();
}

export async function endSession(sessionId) {
  await Session.deleteOne({ _id: sessionId });
}

export async function createUser({ email, password, name } = {}) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw badRequest(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  const user = await User.create({ email, name, passwordHash: await hashPassword(password) });
  return publicUser(user);
}
