import * as productService from '../services/product.service.js';

/**
 * POST /api/create-product
 * Body: { name, exchange, currency, productType } – all required strings;
 * productType is "indices" or "commodities".
 */
export async function createProduct(req, res) {
  const product = await productService.createProduct(req.body ?? {});
  res.status(201).json(product);
}

/**
 * Expiry rules only change when db:set-expiry is run, so they can be cached for a long time:
 * 1 hour in the browser, 1 day on the CDN, then served stale for up to 7 days while it refreshes.
 * Redeploying clears the CDN's copy.
 */
const EXPIRY_RULES_CACHE = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';

/** GET /api/expiry-rules – products with an expiry rule, for the calendar */
export async function listExpiryRules(req, res) {
  const data = await productService.listExpiryRules();
  res.set('Cache-Control', EXPIRY_RULES_CACHE).json({ data });
}
