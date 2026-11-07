import { Router } from 'express';
import mongoose from 'mongoose';
import itemRoutes from './item.routes.js';
import jpxCashRoutes from './jpxCash.routes.js';
import { createProduct } from '../controllers/product.controller.js';
import { uploadData } from '../controllers/upload.controller.js';
import { listFairValues, listPriceData, listSpreads } from '../controllers/priceData.controller.js';
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

export default router;
