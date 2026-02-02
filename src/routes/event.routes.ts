import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { eventController } from '../controllers/event.controller.js';
import { authenticate, validate } from '../middlewares/index.js';

const router = Router();

// Validation schemas
const createEventValidation = [
  body('title').isString().isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('description').isString().isLength({ min: 10, max: 2000 }).withMessage('Description must be 10-2000 characters'),
  body('type')
    .isIn(['SPEED_SWAPPING', 'THEMED_SWAP', 'LOCAL_MEETUP', 'VIRTUAL_SWAP'])
    .withMessage('Invalid event type'),
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('endTime').isISO8601().withMessage('Valid end time is required'),
  body('isVirtual').optional().isBoolean(),
  body('address').optional().isString().isLength({ max: 500 }),
  body('latitude').optional().isFloat({ min: -90, max: 90 }),
  body('longitude').optional().isFloat({ min: -180, max: 180 }),
  body('meetingUrl').optional().isURL(),
  body('maxParticipants').optional().isInt({ min: 2, max: 1000 }),
  body('imageUrl').optional().isURL(),
];

const nearbyValidation = [
  query('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  query('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
  query('radius').optional().isInt({ min: 1, max: 500 }),
];

const eventIdValidation = [
  param('id').isUUID().withMessage('Valid event ID is required'),
];

// Public routes
router.get('/upcoming', eventController.getUpcoming.bind(eventController));

router.get(
  '/nearby',
  validate(nearbyValidation),
  eventController.getNearby.bind(eventController)
);

router.get(
  '/:id',
  validate(eventIdValidation),
  eventController.getById.bind(eventController)
);

// Protected routes
router.post(
  '/',
  authenticate,
  validate(createEventValidation),
  eventController.create.bind(eventController)
);

router.get('/my-events', authenticate, eventController.getMyEvents.bind(eventController));

router.post(
  '/:id/register',
  authenticate,
  validate(eventIdValidation),
  eventController.register.bind(eventController)
);

router.delete(
  '/:id/register',
  authenticate,
  validate(eventIdValidation),
  eventController.unregister.bind(eventController)
);

export default router;
