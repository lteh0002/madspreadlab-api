/**
 * Upload files are named so we can tell which product they belong to:
 *
 *   MCA Oct26-Nov26 Calendar_15min.csv
 *   └┬┘ └─┬─┘ └─┬─┘ └──┬───┘ └─┬─┘
 *  product near   far  structure interval
 *
 * Same rules as the portal's src/api/dataFileName.ts (kept in sync by hand); the server
 * re-checks because the browser's check can be bypassed.
 */
export const DATA_FILE_EXAMPLE = 'MCA Oct26-Nov26 Calendar_15min';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PATTERN = /^([A-Za-z0-9]+) ([A-Za-z]{3})(\d{2})-([A-Za-z]{3})(\d{2}) ([A-Za-z]+)_(\d+)min$/;

const monthIndex = (m) => MONTHS.findIndex((x) => x.toLowerCase() === m.toLowerCase());

/**
 * @returns {{ ok: true, info: { product, near, far, structure, minutes } } | { ok: false, reason: string }}
 */
export function parseDataFileName(fileName) {
  const base = String(fileName).replace(/\.[^.]+$/, '');
  const m = PATTERN.exec(base);
  if (!m) {
    return { ok: false, reason: `"${fileName}" doesn't match the naming format "${DATA_FILE_EXAMPLE}".` };
  }
  const [, product, nm, ny, fm, fy, structure, mins] = m;

  const nearIdx = monthIndex(nm);
  const farIdx = monthIndex(fm);
  if (nearIdx < 0 || farIdx < 0) {
    return { ok: false, reason: `"${nearIdx < 0 ? nm : fm}" isn't a month. Use Jan, Feb, … Dec.` };
  }
  // Compare as months since 2000 so Dec26-Jan27 is in order
  if (Number(fy) * 12 + farIdx <= Number(ny) * 12 + nearIdx) {
    return {
      ok: false,
      reason: `The second month (${MONTHS[farIdx]}${fy}) must be after the first (${MONTHS[nearIdx]}${ny}).`,
    };
  }
  const minutes = Number(mins);
  if (minutes <= 0) return { ok: false, reason: 'The interval must be at least 1min.' };

  return {
    ok: true,
    info: {
      product,
      near: `${MONTHS[nearIdx]}${ny}`,
      far: `${MONTHS[farIdx]}${fy}`,
      structure,
      minutes,
    },
  };
}

/** Standard futures month codes, Jan → F … Dec → Z */
const FUTURES_MONTH_CODES = ['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V', 'X', 'Z'];

/**
 * "Apr27" (as returned in parseDataFileName's near/far) → { month: "J", year: 2027 }
 */
export function toFuturesContract(monthYear) {
  const idx = monthIndex(monthYear.slice(0, 3));
  return { month: FUTURES_MONTH_CODES[idx], year: 2000 + Number(monthYear.slice(3)) };
}
