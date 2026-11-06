import { JpxCash, SESSIONS } from '../models/JpxCash.js';
import { badRequest } from '../utils/httpError.js';

// Accepts YYYY-MM-DD; dates are stored as UTC midnight.
function parseDate(value, name) {
  if (value === undefined) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw badRequest(`Invalid ${name}: expected YYYY-MM-DD`);
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw badRequest(`Invalid ${name}: ${value}`);
  return d;
}

/**
 * Options (all optional, typically straight from the query string):
 *   from, to    – inclusive date range, YYYY-MM-DD
 *   session     – '10:30' or '14:30'
 *   latest_days – N: only the N most recent dates that have data (counted back from the
 *                 latest available date, so weekends/holidays are skipped)
 *   sort        – 'asc' (default) or 'desc' by date, then session
 *   page        – default 1
 *   limit       – default 500 (5000 when latest_days is set), max 5000
 */
export async function listJpxCash(options = {}) {
  const { session, sort = 'asc' } = options;
  const from = parseDate(options.from, 'from');
  const to = parseDate(options.to, 'to');

  if (session !== undefined && !SESSIONS.includes(session)) {
    throw badRequest(`Invalid session: expected one of ${SESSIONS.join(', ')}`);
  }
  if (!['asc', 'desc'].includes(sort)) throw badRequest("Invalid sort: expected 'asc' or 'desc'");

  let latestDays;
  if (options.latest_days !== undefined) {
    latestDays = Number(options.latest_days);
    if (!Number.isInteger(latestDays) || latestDays < 1) {
      throw badRequest('Invalid latest_days: expected a positive integer');
    }
  }

  const filter = {};
  if (from || to) filter.date = { ...(from && { $gte: from }), ...(to && { $lte: to }) };
  if (session) filter.session = session;

  if (latestDays) {
    // Find the Nth most recent distinct date among matching rows; everything on or after it is in range.
    const [cutoff] = await JpxCash.aggregate([
      { $match: filter },
      { $group: { _id: '$date' } },
      { $sort: { _id: -1 } },
      { $limit: latestDays },
      { $group: { _id: null, start: { $min: '$_id' } } },
    ]);
    if (cutoff) filter.date = { ...filter.date, $gte: cutoff.start };
  }

  const page = Math.max(1, Number(options.page) || 1);
  const defaultLimit = latestDays ? 5000 : 500;
  const limit = Math.min(5000, Math.max(1, Number(options.limit) || defaultLimit));
  const dir = sort === 'desc' ? -1 : 1;

  const [data, total] = await Promise.all([
    JpxCash.find(filter)
      .sort({ date: dir, session: dir })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    JpxCash.countDocuments(filter),
  ]);

  return { data, page, limit, total };
}

/**
 * Upserts already-validated rows of { date (UTC midnight Date), session, value } on (date, session).
 * Safe to re-run: createdAt is set once on insert; updatedAt bumps only if the value changes.
 */
export async function upsertJpxCash(rows, { source = 'import' } = {}) {
  if (!rows.length) return { inserted: 0, updated: 0, unchanged: 0 };

  const now = new Date();
  const ops = rows.map(({ date, session, value }) => ({
    updateOne: {
      filter: { date, session },
      update: [
        {
          $set: {
            createdAt: { $ifNull: ['$createdAt', now] },
            updatedAt: {
              $cond: [{ $eq: ['$value', { $literal: value }] }, { $ifNull: ['$updatedAt', now] }, now],
            },
          },
        },
        { $set: { value: { $literal: value }, spread_name: '1x6', source } },
      ],
      upsert: true,
    },
  }));

  // Runs createIndex for each index declared on the schema (idempotent), so the
  // unique (date, session) index exists before upserting.
  await JpxCash.createIndexes();
  // Native driver bulkWrite: Mongoose's automatic timestamps would otherwise
  // bump updatedAt on every re-import.
  const res = await JpxCash.collection.bulkWrite(ops, { ordered: false });
  return {
    inserted: res.upsertedCount,
    updated: res.modifiedCount,
    unchanged: res.matchedCount - res.modifiedCount,
  };
}
