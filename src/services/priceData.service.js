import mongoose from 'mongoose';
import { PRODUCT_TYPES, Product } from '../models/Product.js';
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

/** A spread's fairValue as a finite number, else null (missing, empty, or not a number) */
function toFairValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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

  const spreads = await Spread.find({ productId: product._id, 'intervals.0': { $exists: true } }).lean();

  const data = spreads
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
      fairValue: toFairValue(s.fairValue),
      intervals: s.intervals,
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
    .select({ _id: 0, timestamp: 1, open: 1, high: 1, low: 1, close: 1, aVol: 1, bVol: 1 })
    .lean();
  bars.reverse();

  return { data: bars, interval, limit, truncated: bars.length === limit };
}

/** Contract as months since year 0, so Dec26 → Jan27 is +1 */
const monthNumber = (code, year) => year * 12 + FUTURES_MONTH_CODES.indexOf(code);

/**
 * Every spread that has a fair value, grouped by product (by name), oldest contracts first.
 * Unlike listSpreads, a spread doesn't need price data to be listed.
 */
export async function listFairValues() {
  const spreads = await Spread.find({ fairValue: { $exists: true, $ne: null } }).lean();
  const productIds = [...new Set(spreads.map((s) => String(s.productId)))];
  const products = await Product.find({ _id: { $in: productIds } })
    .select('_id name exchange currency')
    .lean();
  const byId = new Map(products.map((p) => [String(p._id), { product: p, spreads: [] }]));

  for (const s of spreads) {
    const fairValue = toFairValue(s.fairValue);
    const entry = byId.get(String(s.productId));
    if (fairValue === null || !entry) continue;
    const front = monthNumber(s.frontMonth, s.frontYear);
    const back = monthNumber(s.backMonth, s.backYear);
    entry.spreads.push({
      id: s._id,
      spreadName: s.spreadName,
      front: contractLabel(s.frontMonth, s.frontYear),
      back: contractLabel(s.backMonth, s.backYear),
      months: back - front,
      fairValue,
      _n: front,
    });
  }

  return [...byId.values()]
    .filter((p) => p.spreads.length > 0)
    .sort((a, b) => a.product.name.localeCompare(b.product.name))
    .map(({ product, spreads: list }) => ({
      product,
      spreads: list.sort((a, b) => a._n - b._n || a.months - b.months).map(({ _n, ...s }) => s),
    }));
}

/**
 * Every product, by name, with all its spreads (newest contracts first) and how many price
 * bars each has across all intervals. For the admin page, so spreads without bars are included.
 * Options: productType (optional, "indices" or "commodities") lists only products of that type.
 */
export async function listProductsWithSpreads({ productType } = {}) {
  let filter = {};
  if (productType !== undefined) {
    const t = String(productType).trim().toLowerCase();
    if (!PRODUCT_TYPES.includes(t)) {
      throw badRequest(`Invalid productType: expected ${PRODUCT_TYPES.join(' or ')}`);
    }
    filter = { productType: t };
  }
  const products = await Product.find(filter)
    .select('_id name exchange currency productType')
    .sort({ name: 1 })
    .lean();
  const productIds = products.map((p) => p._id);
  const spreads = await Spread.find({ productId: { $in: productIds } }).lean();
  const byProduct = new Map(products.map((p) => [String(p._id), { ...p, spreads: [] }]));

  for (const s of spreads) {
    const entry = byProduct.get(String(s.productId));
    if (!entry) continue;
    entry.spreads.push({
      id: s._id,
      spreadName: s.spreadName,
      front: contractLabel(s.frontMonth, s.frontYear),
      back: contractLabel(s.backMonth, s.backYear),
      months: monthNumber(s.backMonth, s.backYear) - monthNumber(s.frontMonth, s.frontYear),
      fairValue: toFairValue(s.fairValue),
      bars: (s.intervals ?? []).reduce((sum, i) => sum + i.bars, 0),
      _n: monthNumber(s.frontMonth, s.frontYear),
    });
  }

  return [...byProduct.values()].map(({ spreads: list, ...p }) => ({
    ...p,
    spreads: list.sort((a, b) => b._n - a._n || b.months - a.months).map(({ _n, ...s }) => s),
  }));
}

/**
 * Set a spread's fair value, or clear it with null. Accepts a number or a numeric string.
 * Resolves with { id, fairValue }.
 */
export async function setFairValue(spreadId, body = {}) {
  if (!mongoose.isValidObjectId(spreadId)) throw badRequest('Invalid spread id');
  if (!('fairValue' in body)) throw badRequest('Missing fairValue: a number, or null to clear it');

  const raw = body.fairValue;
  let update;
  if (raw === null || raw === '') {
    update = { $unset: { fairValue: 1 } };
  } else {
    const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw.trim()) : NaN;
    if (!Number.isFinite(n)) throw badRequest('fairValue must be a number, or null to clear it');
    update = { $set: { fairValue: n } };
  }

  const spread = await Spread.findByIdAndUpdate(spreadId, update, { new: true }).lean();
  if (!spread) throw notFound("That spread doesn't exist.");
  return { id: spread._id, fairValue: toFairValue(spread.fairValue) };
}

/**
 * Permanently delete a spread and all its price bars. The bars go first, so if this fails
 * part-way the spread is still listed and the delete can be retried.
 * Resolves with { id, barsDeleted }.
 */
export async function deleteSpread(spreadId) {
  if (!mongoose.isValidObjectId(spreadId)) throw badRequest('Invalid spread id');
  if (!(await Spread.exists({ _id: spreadId }))) throw notFound("That spread doesn't exist.");

  const { deletedCount } = await SpreadBar.deleteMany({ spreadId });
  await Spread.deleteOne({ _id: spreadId });
  return { id: spreadId, barsDeleted: deletedCount };
}
