// Usage: npm run import:jpx -- "/path/to/sheet.xlsx"
// Expects columns: Date | Time | 1x6 Cash. Safe to re-run: rows are upserted on (date, session).
import ExcelJS from 'exceljs';
import { connectDB, disconnectDB } from '../config/db.js';
import { SESSIONS } from '../models/JpxCash.js';
import { upsertJpxCash } from '../services/jpxCash.service.js';

const file = process.argv[2];
if (!file) {
  console.error('Usage: npm run import:jpx -- "<path to .xlsx>"');
  process.exit(1);
}

const pad = (n) => String(n).padStart(2, '0');

// Excel dates arrive as JS Dates in UTC; keep only the calendar day.
function toDate(cell) {
  const d = cell instanceof Date ? cell : new Date(cell);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// Excel times arrive as Dates on 1899-12-30 (UTC), or possibly as "10:30" text.
function toSession(cell) {
  if (cell instanceof Date) return `${pad(cell.getUTCHours())}:${pad(cell.getUTCMinutes())}`;
  const m = String(cell ?? '').trim().match(/^(\d{1,2}):(\d{2})/);
  return m ? `${pad(m[1])}:${m[2]}` : null;
}

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);
  const sheet = workbook.worksheets[0];

  const rows = [];
  const errors = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header
    const [dateCell, timeCell, valueCell] = [1, 2, 3].map((c) => row.getCell(c).value);
    if (dateCell == null && timeCell == null && valueCell == null) return;

    const date = toDate(dateCell);
    const session = toSession(timeCell);
    const value = typeof valueCell === 'number' ? valueCell : Number(valueCell);

    if (!date) errors.push(`row ${rowNumber}: bad date ${JSON.stringify(dateCell)}`);
    else if (!SESSIONS.includes(session)) errors.push(`row ${rowNumber}: bad session ${JSON.stringify(timeCell)}`);
    else if (valueCell == null || Number.isNaN(value)) errors.push(`row ${rowNumber}: bad value ${JSON.stringify(valueCell)}`);
    else rows.push({ date, session, value });
  });

  if (errors.length) {
    console.error(`Aborting: ${errors.length} invalid row(s):\n  ${errors.join('\n  ')}`);
    process.exitCode = 1;
    return;
  }

  await connectDB();
  try {
    const { inserted, updated, unchanged } = await upsertJpxCash(rows);
    console.log(`Parsed ${rows.length} rows -> inserted ${inserted}, updated ${updated}, unchanged ${unchanged}`);
  } finally {
    await disconnectDB();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
