import { Router } from 'express';
import { body, query } from 'express-validator';
import { swipeController } from '../controllers/swipe.controller.js';
import { authenticate, validate, swipeRateLimiter } from '../middlewares/index.js';

const router = Router();

// Validation schemas
const swipeValidation = [
  body('garmentId').isUUID().withMessage('Valid garment ID is required'),
  body('direction').isIn(['LEFT', 'RIGHT']).withMessage('Direction must be LEFT or RIGHT'),
];

const superLikeValidation = [
  body('garmentId').isUUID().withMessage('Valid garment ID is required'),
  body('message').optional().isString().isLength({ max: 200 }),
];

const historyValidation = [
  query('direction').optional().isIn(['LEFT', 'RIGHT']),
];

// All routes require authentication
router.use(authenticate);

// Swipe routes
router.post(
  '/',
  swipeRateLimiter,
  validate(swipeValidation),
  swipeController.swipe.bind(swipeController)
);

router.post(
  '/super-like',
  validate(superLikeValidation),
  swipeController.superLike.bind(swipeController)
);

router.post('/undo', swipeController.undo.bind(swipeController));

router.get(
  '/history',
  validate(historyValidation),
  swipeController.getHistory.bind(swipeController)
);

router.get('/super-likes/received', swipeController.getSuperLikesReceived.bind(swipeController));

router.get('/super-likes/sent', swipeController.getSuperLikesSent.bind(swipeController));

router.get('/super-likes/remaining', swipeController.getSuperLikesRemaining.bind(swipeController));

export default router;
