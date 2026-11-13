import mongoose from 'mongoose';

/** A portal login. Created with `npm run user:create`; there is no public sign-up. */
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    name: { type: String, trim: true, maxlength: 200 },
    userType: { type: String, enum: ['admin', 'user'], default: 'user' },
    /** scrypt hash from utils/password.js; never sent to clients */
    passwordHash: { type: String, required: true, select: false },
    lastLoginAt: { type: Date },
  },
  { versionKey: false, timestamps: true },
);

// Duplicates return 409 via errorHandler.
userSchema.index({ email: 1 }, { unique: true, name: 'email_unique' });

export const User = mongoose.model('User', userSchema, 'users');
