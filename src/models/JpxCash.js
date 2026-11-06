import mongoose from 'mongoose';

export const SESSIONS = ['10:30', '14:30'];

const jpxCashSchema = new mongoose.Schema(
  {
    // Calendar date, stored as UTC midnight (time-of-day lives in `session`).
    date: { type: Date, required: true },
    session: { type: String, required: true, enum: SESSIONS },
    value: { type: Number, required: true },
    spread_name: { type: String, required: true, default: '1x6' },
    source: { type: String, required: true, default: 'import' },
  },
  // createdAt = when the row was first added; updatedAt = when its value last changed.
  { versionKey: false, timestamps: true },
);

// One reading per date + session. Also serves date-range queries (date is the prefix).
jpxCashSchema.index({ date: 1, session: 1 }, { unique: true, name: 'date_session_unique' });

export const JpxCash = mongoose.model('JpxCash', jpxCashSchema, 'jpx_cash');
