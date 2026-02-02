import { Router } from 'express';
import { body } from 'express-validator';
import { matchController } from '../controllers/match.controller.js';
import { authenticate, validate } from '../middlewares/index.js';

const router = Router();

// Validation schemas
const updateStatusValidation = [
  body('status')
    .isIn(['ACCEPTED', 'NEGOTIATING', 'COMPLETED', 'CANCELLED'])
    .withMessage('Invalid status'),
];

const proposeGarmentValidation = [
  body('garmentId').isUUID().withMessage('Valid garment ID is required'),
];

// All routes require authentication
router.use(authenticate);

// Routes
router.get('/stats', matchController.getStats.bind(matchController));

router.get('/', matchController.getAll.bind(matchController));

router.get('/:id', matchController.getById.bind(matchController));

router.patch(
  '/:id/status',
  validate(updateStatusValidation),
  matchController.updateStatus.bind(matchController)
);

router.post(
  '/:id/propose',
  validate(proposeGarmentValidation),
  matchController.proposeGarment.bind(matchController)
);

export default router;
