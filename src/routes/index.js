import { Router } from 'express';
import mongoose from 'mongoose';
import itemRoutes from './item.routes.js';

const router = Router();

router.get('/health', (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'degraded', db: dbUp ? 'up' : 'down' });
});

router.use('/items', itemRoutes);

export default router;
