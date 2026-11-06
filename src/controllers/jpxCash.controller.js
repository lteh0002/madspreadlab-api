import { JpxCash, SESSIONS } from '../models/JpxCash.js';

const badRequest = (message) => Object.assign(new Error(message), { status: 400 });

// Accepts YYYY-MM-DD; dates are stored as UTC midnight.
function parseDate(value, name) {
  if (value === undefined) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw badRequest(`Invalid ${name}: expected YYYY-MM-DD`);
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw badRequest(`Invalid ${name}: ${value}`);
  return d;
}

/**
 * GET /api/jpx-cash
 * Query params (all optional):
 *   from, to  – inclusive date range, YYYY-MM-DD
 *   session   – '10:30' or '14:30'
 *   latest_days – N: only the N most recent dates that have data (counted back from the
 *                 latest available date, so weekends/holidays are skipped)
 *   sort      – 'asc' (default) or 'desc' by date, then session
 *   page      – default 1
 *   limit     – default 500 (5000 when latest_days is set), max 5000
 */
export async function listJpxCash(req, res) {
  const { session, sort = 'asc' } = req.query;
  const from = parseDate(req.query.from, 'from');
  const to = parseDate(req.query.to, 'to');

  if (session !== undefined && !SESSIONS.includes(session)) {
    throw badRequest(`Invalid session: expected one of ${SESSIONS.join(', ')}`);
  }
  if (!['asc', 'desc'].includes(sort)) throw badRequest("Invalid sort: expected 'asc' or 'desc'");

  let latestDays;
  if (req.query.latest_days !== undefined) {
    latestDays = Number(req.query.latest_days);
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

  const page = Math.max(1, Number(req.query.page) || 1);
  const defaultLimit = latestDays ? 5000 : 500;
  const limit = Math.min(5000, Math.max(1, Number(req.query.limit) || defaultLimit));
  const dir = sort === 'desc' ? -1 : 1;

  const [data, total] = await Promise.all([
    JpxCash.find(filter)
      .sort({ date: dir, session: dir })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    JpxCash.countDocuments(filter),
  ]);

  console.log(data)

  res.json({ data, page, limit, total });
}
