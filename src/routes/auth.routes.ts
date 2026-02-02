import { Router } from 'express';
import { body } from 'express-validator';
import { authController } from '../controllers/auth.controller.js';
import { authenticate, validate, authRateLimiter } from '../middlewares/index.js';

const router = Router();

// Validation schemas
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('firstName').optional().isLength({ max: 50 }),
  body('lastName').optional().isLength({ max: 50 }),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
];

// Routes
router.post(
  '/register',
  authRateLimiter,
  validate(registerValidation),
  authController.register.bind(authController)
);

router.post(
  '/login',
  authRateLimiter,
  validate(loginValidation),
  authController.login.bind(authController)
);

router.post('/refresh', authController.refreshToken.bind(authController));

router.post('/logout', authController.logout.bind(authController));

router.post(
  '/logout-all',
  authenticate,
  authController.logoutAll.bind(authController)
);

router.post(
  '/change-password',
  authenticate,
  validate(changePasswordValidation),
  authController.changePassword.bind(authController)
);

router.get('/me', authenticate, authController.me.bind(authController));

export default router;
