import * as jpxCashService from '../services/jpxCash.service.js';

/** GET /api/jpx-cash – see jpxCashService.listJpxCash for query params. */
export async function listJpxCash(req, res) {
  res.json(await jpxCashService.listJpxCash(req.query));
}
