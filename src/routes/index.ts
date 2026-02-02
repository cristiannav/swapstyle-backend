import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import garmentRoutes from './garment.routes.js';
import swipeRoutes from './swipe.routes.js';
import matchRoutes from './match.routes.js';
import chatRoutes from './chat.routes.js';
import notificationRoutes from './notification.routes.js';
import eventRoutes from './event.routes.js';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'swapstyle-api',
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/garments', garmentRoutes);
router.use('/swipes', swipeRoutes);
router.use('/matches', matchRoutes);
router.use('/chat', chatRoutes);
router.use('/notifications', notificationRoutes);
router.use('/events', eventRoutes);

export default router;
