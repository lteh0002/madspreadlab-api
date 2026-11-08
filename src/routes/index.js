import { Router } from 'express';
import mongoose from 'mongoose';
import itemRoutes from './item.routes.js';
import jpxCashRoutes from './jpxCash.routes.js';
import { createProduct, listExpiryRules } from '../controllers/product.controller.js';
import { uploadData } from '../controllers/upload.controller.js';
import {
  listFairValues,
  listPriceData,
  listProducts,
  listSpreads,
  updateFairValue,
} from '../controllers/priceData.controller.js';
import { singleFile } from '../middleware/upload.js';

const router = Router();

router.get('/health', (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'degraded', db: dbUp ? 'up' : 'down' });
});

router.use('/items', itemRoutes);
router.use('/jpx-cash', jpxCashRoutes);
router.post('/create-product', createProduct);
router.post('/upload-data', singleFile, uploadData);
router.get('/spreads', listSpreads);
router.get('/price-data', listPriceData);
router.get('/fair-values', listFairValues);
router.get('/products', listProducts);
router.get('/expiry-rules', listExpiryRules);
// NOTE: not protected yet, like the rest of the admin actions
router.patch('/spreads/:id/fair-value', updateFairValue);

export default router;
