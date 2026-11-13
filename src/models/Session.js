import mongoose from 'mongoose';

/**
 * A signed-in browser. The client holds a random token; only its SHA-256 hash is stored here,
 * so a leaked database doesn't hand out working logins. Deleting a row signs that browser out.
 */
const sessionSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false, timestamps: { createdAt: true, updatedAt: false } },
);

sessionSchema.index({ tokenHash: 1 }, { unique: true, name: 'token_hash_unique' });
// MongoDB deletes each session once expiresAt passes
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'expires_at_ttl' });

export const Session = mongoose.model('Session', sessionSchema, 'sessions');
