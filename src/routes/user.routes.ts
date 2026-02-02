import { Router } from 'express';
import { body, query } from 'express-validator';
import { userController } from '../controllers/user.controller.js';
import { authenticate, validate } from '../middlewares/index.js';

const router = Router();

// Validation schemas
const updateUserValidation = [
  body('firstName').optional().isLength({ max: 50 }),
  body('lastName').optional().isLength({ max: 50 }),
  body('bio').optional().isLength({ max: 500 }),
  body('phone').optional().isMobilePhone('any'),
];

const updateProfileValidation = [
  body('preferredStyles').optional().isArray(),
  body('preferredSizes').optional().isArray(),
  body('preferredBrands').optional().isArray(),
  body('preferredColors').optional().isArray(),
  body('topSize').optional().isString(),
  body('bottomSize').optional().isString(),
  body('shoeSize').optional().isString(),
  body('city').optional().isString(),
  body('country').optional().isString(),
  body('maxDistance').optional().isInt({ min: 1, max: 500 }),
];

const updateLocationValidation = [
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
];

const searchValidation = [
  query('q').isString().isLength({ min: 1 }).withMessage('Search query is required'),
];

// Routes
router.get('/search', validate(searchValidation), userController.search.bind(userController));

router.get('/profile', authenticate, userController.getProfile.bind(userController));

router.put(
  '/profile',
  authenticate,
  validate(updateProfileValidation),
  userController.updateProfile.bind(userController)
);

router.put(
  '/location',
  authenticate,
  validate(updateLocationValidation),
  userController.updateLocation.bind(userController)
);

router.put(
  '/',
  authenticate,
  validate(updateUserValidation),
  userController.update.bind(userController)
);

router.delete('/deactivate', authenticate, userController.deactivate.bind(userController));

router.get('/username/:username', userController.getByUsername.bind(userController));

router.get('/:id', userController.getById.bind(userController));

router.get('/:id/garments', userController.getGarments.bind(userController));

export default router;
