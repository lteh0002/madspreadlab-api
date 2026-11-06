import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { Spread } from '../models/Spread.js';
import { SpreadBar } from '../models/SpreadBar.js';
import { badRequest, httpError, notFound } from '../utils/httpError.js';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FUTURES_MONTH_CODES = ['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V', 'X', 'Z'];

/** "V", 2026 → "Oct26" */
function contractLabel(code, year) {
  const i = FUTURES_MONTH_CODES.indexOf(code);
  return `${i < 0 ? code : MONTH_NAMES[i]}${String(year).slice(-2)}`;
}

/** Find one product by name (optionally narrowed by exchange, since names are unique per exchange) */
async function findProduct(name, exchange) {
  if (!name) throw badRequest('Missing product, e.g. ?product=MCA');
  const filter = { name, ...(exchange && { exchange }) };
  const products = await Product.find(filter).select('_id name exchange currency').limit(2).lean();
  if (!products.length) throw notFound(`Product "${name}"${exchange ? ` on ${exchange}` : ''} doesn't exist.`);
  if (products.length > 1) {
    throw httpError(409, `More than one product is named "${name}". Add &exchange=… to pick one.`);
  }
  return products[0];
}

/**
 * Spreads of a product that have price data, newest contracts first, each with the bar
 * intervals available and their date range.
 * Options: product (required), exchange (optional)
 */
export async function listSpreads({ product: name, exchange } = {}) {
  const product = await findProduct(name, exchange);

  const [spreads, series] = await Promise.all([
    Spread.find({ productId: product._id }).lean(),
    SpreadBar.aggregate([
      { $match: { productId: product._id } },
      {
        $group: {
          _id: { spreadId: '$spreadId', interval: '$interval' },
          bars: { $sum: 1 },
          from: { $min: '$timestamp' },
          to: { $max: '$timestamp' },
        },
      },
      { $sort: { '_id.interval': 1 } },
    ]),
  ]);

  const intervalsBySpread = new Map();
  for (const s of series) {
    const key = String(s._id.spreadId);
    if (!intervalsBySpread.has(key)) intervalsBySpread.set(key, []);
    intervalsBySpread.get(key).push({ interval: s._id.interval, bars: s.bars, from: s.from, to: s.to });
  }

  const data = spreads
    .filter((s) => intervalsBySpread.has(String(s._id)))
    // Nearest-expiring first: by front contract year, then month code order
    .sort(
      (a, b) =>
        a.frontYear - b.frontYear ||
        FUTURES_MONTH_CODES.indexOf(a.frontMonth) - FUTURES_MONTH_CODES.indexOf(b.frontMonth),
    )
    .map((s) => ({
      id: s._id,
      spreadName: s.spreadName,
      front: contractLabel(s.frontMonth, s.frontYear),
      back: contractLabel(s.backMonth, s.backYear),
      intervals: intervalsBySpread.get(String(s._id)),
    }));

  return { product, data };
}

function parseIsoDate(value, name) {
  if (value === undefined) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw badRequest(`Invalid ${name}: expected an ISO date, e.g. 2026-10-01`);
  return d;
}

/**
 * OHLC bars of one spread at one interval, oldest first.
 * Options: spreadId (required), interval (required, minutes),
 *          from / to (optional, inclusive ISO dates or timestamps),
 *          limit (optional, default 5000, max 20000 — the most recent bars are kept)
 */
export async function listPriceData(options = {}) {
  const { spreadId } = options;
  if (!spreadId || !mongoose.isValidObjectId(spreadId)) throw badRequest('Invalid or missing spreadId');
  const interval = Number(options.interval);
  if (!Number.isInteger(interval) || interval < 1) {
    throw badRequest('Invalid or missing interval: expected minutes, e.g. 15');
  }
  const from = parseIsoDate(options.from, 'from');
  const to = parseIsoDate(options.to, 'to');
  const limit = Math.min(20000, Math.max(1, Number(options.limit) || 5000));

  const filter = { spreadId: new mongoose.Types.ObjectId(String(spreadId)), interval };
  if (from || to) filter.timestamp = { ...(from && { $gte: from }), ...(to && { $lte: to }) };

  // Newest `limit` bars (uses the spread+interval+timestamp index), returned oldest first
  const bars = await SpreadBar.find(filter)
    .sort({ timestamp: -1 })
    .limit(limit)
    .select({ _id: 0, timestamp: 1, open: 1, high: 1, low: 1, close: 1 })
    .lean();
  bars.reverse();

  return { data: bars, interval, limit, truncated: bars.length === limit };
}
