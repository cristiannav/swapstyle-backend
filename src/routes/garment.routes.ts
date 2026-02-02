import { Router } from 'express';
import { body, query } from 'express-validator';
import { garmentController } from '../controllers/garment.controller.js';
import { authenticate, validate, uploadMultiple, uploadRateLimiter } from '../middlewares/index.js';

const router = Router();

// Validation schemas
const createGarmentValidation = [
  body('title').isString().isLength({ min: 3, max: 100 }).withMessage('Title must be 3-100 characters'),
  body('description').optional().isString().isLength({ max: 1000 }),
  body('category')
    .isIn(['TOPS', 'BOTTOMS', 'DRESSES', 'OUTERWEAR', 'SHOES', 'ACCESSORIES', 'BAGS', 'JEWELRY', 'SPORTSWEAR', 'SWIMWEAR', 'OTHER'])
    .withMessage('Invalid category'),
  body('subcategory').optional().isString(),
  body('brand').optional().isString().isLength({ max: 100 }),
  body('size').isString().notEmpty().withMessage('Size is required'),
  body('color').isString().notEmpty().withMessage('Color is required'),
  body('condition')
    .isIn(['NEW_WITH_TAGS', 'LIKE_NEW', 'GOOD', 'FAIR', 'WORN'])
    .withMessage('Invalid condition'),
  body('originalPrice').optional().isFloat({ min: 0 }),
  body('tags').optional().isArray(),
];

const updateGarmentValidation = [
  body('title').optional().isString().isLength({ min: 3, max: 100 }),
  body('description').optional().isString().isLength({ max: 1000 }),
  body('category')
    .optional()
    .isIn(['TOPS', 'BOTTOMS', 'DRESSES', 'OUTERWEAR', 'SHOES', 'ACCESSORIES', 'BAGS', 'JEWELRY', 'SPORTSWEAR', 'SWIMWEAR', 'OTHER']),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE', 'RESERVED']),
  body('size').optional().isString(),
  body('color').optional().isString(),
  body('condition')
    .optional()
    .isIn(['NEW_WITH_TAGS', 'LIKE_NEW', 'GOOD', 'FAIR', 'WORN']),
  body('originalPrice').optional().isFloat({ min: 0 }),
  body('tags').optional().isArray(),
];

const searchValidation = [
  query('category').optional().isString(),
  query('size').optional().isString(),
  query('color').optional().isString(),
  query('condition').optional().isString(),
  query('brand').optional().isString(),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sortBy').optional().isIn(['createdAt', 'likeCount', 'viewCount', 'estimatedValue']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

// Routes
router.get('/search', validate(searchValidation), garmentController.search.bind(garmentController));

router.get('/feed', authenticate, garmentController.getDiscoveryFeed.bind(garmentController));

router.get('/:id/similar', garmentController.getSimilar.bind(garmentController));

router.get('/:id', garmentController.getById.bind(garmentController));

router.post(
  '/',
  authenticate,
  validate(createGarmentValidation),
  garmentController.create.bind(garmentController)
);

router.put(
  '/:id',
  authenticate,
  validate(updateGarmentValidation),
  garmentController.update.bind(garmentController)
);

router.delete('/:id', authenticate, garmentController.delete.bind(garmentController));

router.post(
  '/:id/images',
  authenticate,
  uploadRateLimiter,
  uploadMultiple,
  garmentController.addImages.bind(garmentController)
);

router.delete(
  '/:id/images/:imageId',
  authenticate,
  garmentController.removeImage.bind(garmentController)
);

export default router;
