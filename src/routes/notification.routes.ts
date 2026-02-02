import { Router } from 'express';
import { param } from 'express-validator';
import { notificationController } from '../controllers/notification.controller.js';
import { authenticate, validate } from '../middlewares/index.js';

const router = Router();

// Validation schemas
const notificationIdValidation = [
  param('id').isUUID().withMessage('Valid notification ID is required'),
];

// All routes require authentication
router.use(authenticate);

// Routes
router.get('/unread-count', notificationController.getUnreadCount.bind(notificationController));

router.get('/', notificationController.getAll.bind(notificationController));

router.post('/read-all', notificationController.markAllAsRead.bind(notificationController));

router.post(
  '/:id/read',
  validate(notificationIdValidation),
  notificationController.markAsRead.bind(notificationController)
);

router.delete(
  '/:id',
  validate(notificationIdValidation),
  notificationController.delete.bind(notificationController)
);

export default router;
