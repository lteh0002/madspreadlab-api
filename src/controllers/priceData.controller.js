import * as priceDataService from '../services/priceData.service.js';

/**
 * GET /api/spreads?product=MCA[&exchange=HKEX]
 * 200 { product: { _id, name, exchange, currency }, data: [{ id, spreadName, front, back, fairValue (number or null), intervals: [{ interval, bars, from, to }] }] }
 */
export async function listSpreads(req, res) {
  res.json(await priceDataService.listSpreads(req.query));
}

/**
 * GET /api/price-data?spreadId=…&interval=15[&from=…&to=…&limit=…]
 * 200 { data: [{ timestamp, open, high, low, close }], interval, limit, truncated }
 */
export async function listPriceData(req, res) {
  res.json(await priceDataService.listPriceData(req.query));
}

/**
 * GET /api/fair-values
 * 200 { data: [{ product: { _id, name, exchange, currency }, spreads: [{ id, spreadName, front, back, months, fairValue }] }] }
 * Every spread with a fair value (expired ones too), grouped by product, oldest contracts first.
 */
export async function listFairValues(req, res) {
  res.json({ data: await priceDataService.listFairValues() });
}
