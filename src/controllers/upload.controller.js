import * as spreadBarService from '../services/spreadBar.service.js';
import { badRequest } from '../utils/httpError.js';

/**
 * POST /api/upload-data   (multipart/form-data)
 * Field `file`: a .csv or .xlsx named like "MCA Oct26-Nov26 Calendar_15min.csv",
 * with columns Timestamp (UTC), Open, High, Low, Close, and optionally AVol, BVol
 * (other columns are ignored).
 *
 * 200 { message, data: { product, exchange, spreadId, spreadName, near, far, structure, interval_min, rows, volumeColumns, inserted, existing, from, to } }
 * 400 bad file name / missing columns / bad rows (nothing imported) · 404 unknown product · 413 too large
 */
export async function uploadData(req, res) {
  if (!req.file) throw badRequest('Attach a file in the form field "file".');

  const data = await spreadBarService.importSpreadBars({
    originalName: req.file.originalname,
    buffer: req.file.buffer,
  });

  const parts = [`${data.inserted} new`, ...(data.existing ? [`${data.existing} already stored, refreshed`] : [])];
  const withVolumes = data.volumeColumns.length ? ` with ${data.volumeColumns.join(' and ')}` : '';
  res.json({
    message: `Imported ${data.rows} bars${withVolumes} for ${data.product} ${data.near}-${data.far} ${data.structure} (${data.interval_min} min): ${parts.join(', ')}.`,
    data,
  });
}
