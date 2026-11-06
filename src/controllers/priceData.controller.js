import * as priceDataService from '../services/priceData.service.js';

/**
 * GET /api/spreads?product=MCA[&exchange=HKEX]
 * 200 { product: { _id, name, exchange, currency }, data: [{ id, spreadName, front, back, intervals: [{ interval, bars, from, to }] }] }
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
