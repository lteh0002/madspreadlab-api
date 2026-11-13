import * as priceDataService from '../services/priceData.service.js';

/**
 * Lets the browser reuse a response for 60s. `private`: these need a login, so a shared CDN must
 * never store them (it could hand them to someone who isn't signed in). Set only just before a
 * successful response, so errors are never cached.
 */
const BROWSER_CACHE = 'private, max-age=60';

/**
 * GET /api/spreads?product=MCA[&exchange=HKEX]
 * 200 { product: { _id, name, exchange, currency }, data: [{ id, spreadName, front, back, fairValue (number or null), intervals: [{ interval, bars, from, to }] }] }
 */
export async function listSpreads(req, res) {
  const body = await priceDataService.listSpreads(req.query);
  res.set('Cache-Control', BROWSER_CACHE).json(body);
}

/**
 * GET /api/price-data?spreadId=…&interval=15[&from=…&to=…&limit=…]
 * 200 { data: [{ timestamp, open, high, low, close, aVol?, bVol? }], interval, limit, truncated }
 */
export async function listPriceData(req, res) {
  const body = await priceDataService.listPriceData(req.query);
  res.set('Cache-Control', BROWSER_CACHE).json(body);
}

/**
 * GET /api/fair-values
 * 200 { data: [{ product: { _id, name, exchange, currency }, spreads: [{ id, spreadName, front, back, months, fairValue }] }] }
 * Every spread with a fair value (expired ones too), grouped by product, oldest contracts first.
 */
export async function listFairValues(req, res) {
  res.json({ data: await priceDataService.listFairValues() });
}

/**
 * GET /api/products[?productType=indices]
 * 200 { data: [{ _id, name, exchange, currency, spreads: [{ id, spreadName, front, back, months, fairValue, bars }] }] }
 */
export async function listProducts(req, res) {
  res.json({ data: await priceDataService.listProductsWithSpreads(req.query) });
}

/**
 * PATCH /api/spreads/:id/fair-value
 * Body: { fairValue: number | null }  (null or "" clears it)
 * 200 { data: { id, fairValue } }
 */
export async function updateFairValue(req, res) {
  res.json({ data: await priceDataService.setFairValue(req.params.id, req.body ?? {}) });
}

/**
 * DELETE /api/spreads/:id
 * Removes the spread and its price_data bars.
 * 200 { data: { id, barsDeleted } }
 */
export async function deleteSpread(req, res) {
  res.json({ data: await priceDataService.deleteSpread(req.params.id) });
}
