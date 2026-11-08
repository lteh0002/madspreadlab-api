import * as priceDataService from '../services/priceData.service.js';

/**
 * Lets the CDN answer repeat requests without waking the server. Fresh for 60s, then served stale
 * for up to an hour while it refreshes in the background. Set only just before a successful
 * response, so errors are never cached.
 */
const CDN_CACHE = 'public, max-age=0, s-maxage=60, stale-while-revalidate=3600';

/**
 * GET /api/spreads?product=MCA[&exchange=HKEX]
 * 200 { product: { _id, name, exchange, currency }, data: [{ id, spreadName, front, back, fairValue (number or null), intervals: [{ interval, bars, from, to }] }] }
 */
export async function listSpreads(req, res) {
  const body = await priceDataService.listSpreads(req.query);
  res.set('Cache-Control', CDN_CACHE).json(body);
}

/**
 * GET /api/price-data?spreadId=…&interval=15[&from=…&to=…&limit=…]
 * 200 { data: [{ timestamp, open, high, low, close, aVol?, bVol? }], interval, limit, truncated }
 */
export async function listPriceData(req, res) {
  const body = await priceDataService.listPriceData(req.query);
  res.set('Cache-Control', CDN_CACHE).json(body);
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
