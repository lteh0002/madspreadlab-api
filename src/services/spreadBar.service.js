import ExcelJS from 'exceljs';
import { Product } from '../models/Product.js';
import { Spread } from '../models/Spread.js';
import { SpreadBar } from '../models/SpreadBar.js';
import { parseDataFileName, toFuturesContract } from '../utils/dataFileName.js';
import { parseCsv } from '../utils/csv.js';
import { badRequest, httpError, notFound } from '../utils/httpError.js';

/** Columns every file must have (case-insensitive). Any other columns (indicators) are ignored. */
const PRICE_COLUMNS = ['open', 'high', 'low', 'close'];
/**
 * Optional columns, stored when the file has them: accepted header names (see volumeKey) → field.
 * A blank cell means "not given" for that bar, not 0.
 */
const VOLUME_COLUMNS = [
  { headers: ['avol', 'askvol', 'askvolume', 'askqty'], field: 'aVol', label: 'AVol' },
  { headers: ['bvol', 'bidvol', 'bidvolume', 'bidqty'], field: 'bVol', label: 'BVol' },
];

/**
 * A header reduced to compare with VOLUME_COLUMNS. Charting exports label study columns like
 * "FCPO May27-Jun27 Calendar: AVol ‌avol‌ (…)", so this drops the "<instrument>: "
 * prefix, the zero-width-joiner-wrapped tag, any "(params)", then case and non-alphanumerics.
 */
function volumeKey(header) {
  return String(header ?? '')
    .replace(/‌[^‌]*‌/g, '')
    .replace(/[​-‍﻿]/g, '')
    .replace(/\([^)]*\)/g, '')
    .split(':')
    .pop()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}
/** How many row problems to spell out in the error message */
const MAX_LISTED_ERRORS = 5;

/** Header + data rows as arrays of raw cell values (strings for CSV, typed values for Excel) */
export async function readTable(buffer, ext) {
  if (ext === '.csv') return parseCsv(buffer.toString('utf8'));
  if (ext === '.xlsx') {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return [];
    const rows = [];
    // includeEmpty keeps row numbers aligned with what the admin sees in Excel
    sheet.eachRow({ includeEmpty: true }, (row) => {
      const values = row.values.slice(1); // exceljs row.values is 1-based
      rows.push(values.map((v) => (v && typeof v === 'object' && 'result' in v ? v.result : v)));
    });
    return rows;
  }
  throw badRequest('Unsupported file type. Upload a .csv or .xlsx file.');
}

/** "2026-09-28 02:15:00", "2026-09-28T02:15", "…Z" (all read as UTC), or an Excel date cell */
function toTimestamp(cell) {
  if (cell instanceof Date) return Number.isNaN(cell.getTime()) ? null : cell;
  const m = String(cell ?? '')
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?Z?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s = 0] = m.map((x) => (x === undefined ? undefined : Number(x)));
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi, s));
  // Reject roll-overs like 2026-02-30
  return date.getUTCMonth() === mo - 1 && date.getUTCDate() === d ? date : null;
}

function toNumber(cell) {
  if (typeof cell === 'number') return Number.isFinite(cell) ? cell : null;
  const text = String(cell ?? '').trim();
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/** Turn a table into validated bars, or throw a 400 listing the bad rows */
export function toBars(table) {
  const header = (table[0] ?? []).map((h) => String(h ?? '').trim().toLowerCase());
  const tsCol = header.findIndex((h) => h.startsWith('timestamp'));
  const priceCols = PRICE_COLUMNS.map((name) => header.indexOf(name));
  const keys = header.map(volumeKey);
  const volumeCols = VOLUME_COLUMNS.map((v) => ({ ...v, col: keys.findIndex((k) => v.headers.includes(k)) })).filter(
    (v) => v.col >= 0,
  );
  const missing = [
    ...(tsCol < 0 ? ['Timestamp (UTC)'] : []),
    ...PRICE_COLUMNS.filter((_, i) => priceCols[i] < 0).map((c) => c[0].toUpperCase() + c.slice(1)),
  ];
  if (missing.length) {
    throw badRequest(`The file is missing column(s): ${missing.join(', ')}. The first row must be the header.`);
  }

  const bars = [];
  const errors = [];
  const seen = new Map(); // timestamp ms -> row number

  table.slice(1).forEach((row, i) => {
    const rowNumber = i + 2; // 1-based, after the header
    if (!row || row.every((c) => c == null || String(c).trim() === '')) return; // blank line

    const timestamp = toTimestamp(row[tsCol]);
    if (!timestamp) {
      errors.push(`row ${rowNumber}: timestamp "${row[tsCol] ?? ''}" isn't YYYY-MM-DD HH:MM:SS`);
      return;
    }
    const [open, high, low, close] = priceCols.map((c) => toNumber(row[c]));
    const bad = PRICE_COLUMNS.filter((_, k) => [open, high, low, close][k] === null);
    if (bad.length) {
      errors.push(`row ${rowNumber}: ${bad.join(', ')} ${bad.length > 1 ? "aren't numbers" : "isn't a number"}`);
      return;
    }
    const volumes = {};
    const badVol = [];
    for (const v of volumeCols) {
      const cell = row[v.col];
      if (cell == null || String(cell).trim() === '') continue; // not given for this bar
      const n = toNumber(cell);
      if (n === null || n < 0) badVol.push(v.label);
      else volumes[v.field] = n;
    }
    if (badVol.length) {
      errors.push(
        `row ${rowNumber}: ${badVol.join(', ')} ${badVol.length > 1 ? "aren't" : "isn't"} a number of 0 or more`,
      );
      return;
    }
    const prev = seen.get(timestamp.getTime());
    if (prev) {
      errors.push(`row ${rowNumber}: same timestamp as row ${prev}`);
      return;
    }
    seen.set(timestamp.getTime(), rowNumber);
    bars.push({ timestamp, open, high, low, close, ...volumes });
  });

  if (errors.length) {
    const listed = errors.slice(0, MAX_LISTED_ERRORS).join('; ');
    const more = errors.length > MAX_LISTED_ERRORS ? `; and ${errors.length - MAX_LISTED_ERRORS} more` : '';
    throw Object.assign(
      badRequest(`Nothing was imported: ${errors.length} row(s) have problems. ${listed}${more}.`),
      { details: errors },
    );
  }
  if (!bars.length) throw badRequest('Nothing was imported: the file has no data rows.');
  return { bars, volumeColumns: volumeCols.map((v) => v.label) };
}

/**
 * Recount a spread's bars and save the result on the spread (its `intervals`).
 * Safe to repeat. Call it after anything that adds or removes bars.
 *
 * @param {import('mongoose').Types.ObjectId} spreadId
 */
export async function refreshSpreadIntervals(spreadId) {
  const intervals = await SpreadBar.aggregate([
    { $match: { spreadId } },
    {
      $group: {
        _id: '$interval',
        bars: { $sum: 1 },
        from: { $min: '$timestamp' },
        to: { $max: '$timestamp' },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, interval: '$_id', bars: 1, from: 1, to: 1 } },
  ]);
  await Spread.updateOne({ _id: spreadId }, { $set: { intervals } });
  return intervals;
}

/**
 * Import an uploaded price file. The file name says which product and series it is.
 * All-or-nothing: if any row is invalid, nothing is written.
 * Re-uploading is safe: bars are upserted on (spreadId, interval, timestamp).
 *
 * @param {{ originalName: string, buffer: Buffer }} file
 */
export async function importSpreadBars({ originalName, buffer }) {
  const parsed = parseDataFileName(originalName);
  if (!parsed.ok) throw badRequest(parsed.reason);
  const { product: productName, near, far, structure, minutes } = parsed.info;

  const ext = (originalName.match(/\.[^.]+$/)?.[0] ?? '').toLowerCase();

  // Product names are unique per exchange, so a name alone could match several
  const products = await Product.find({ name: productName }).select('_id exchange').limit(2).lean();
  if (!products.length) {
    throw notFound(`Product "${productName}" doesn't exist. Add it under Admin › Add new product first.`);
  }
  if (products.length > 1) {
    throw httpError(409, `More than one product is named "${productName}" (on different exchanges). Rename one so uploads can tell them apart.`);
  }
  const product = products[0];

  const { bars, volumeColumns } = toBars(await readTable(buffer, ext));

  // Make sure the spread itself is recorded (created on first upload, left alone after)
  const front = toFuturesContract(near);
  const back = toFuturesContract(far);
  const spreadKey = {
    productId: product._id,
    frontMonth: front.month,
    frontYear: front.year,
    backMonth: back.month,
    backYear: back.year,
  };
  await Spread.createIndexes();
  const spread = await Spread.findOneAndUpdate(
    spreadKey,
    { $setOnInsert: { ...spreadKey, spreadName: `${front.month}-${back.month}` } },
    { upsert: true, new: true, lean: true },
  );

  const series = { spreadId: spread._id, interval: minutes };
  // Volumes are only written when given, so re-uploading a file without them keeps stored ones
  const ops = bars.map(({ timestamp, ...values }) => ({
    updateOne: {
      filter: { ...series, timestamp },
      update: { $set: { productId: product._id, ...values } },
      upsert: true,
    },
  }));

  // Ensure the unique series+timestamp index exists before upserting (idempotent)
  await SpreadBar.createIndexes();
  const res = await SpreadBar.collection.bulkWrite(ops, { ordered: false });
  await refreshSpreadIntervals(spread._id);
  // New bars are upserts; bars already stored (same series + timestamp) are matched and refreshed
  const inserted = res.upsertedCount;
  const matched = res.matchedCount;

  const first = bars.reduce((a, b) => (a.timestamp < b.timestamp ? a : b)).timestamp;
  const last = bars.reduce((a, b) => (a.timestamp > b.timestamp ? a : b)).timestamp;

  return {
    product: productName,
    exchange: product.exchange,
    spreadId: spread._id,
    spreadName: spread.spreadName,
    near,
    far,
    structure,
    interval_min: minutes,
    rows: bars.length,
    /** Optional columns found in the file, e.g. ["AVol", "BVol"] */
    volumeColumns,
    inserted,
    existing: matched,
    from: first.toISOString(),
    to: last.toISOString(),
  };
}
